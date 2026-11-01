const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const express = require("express");
const session = require("express-session");
const helmet = require("helmet");
const Database = require("better-sqlite3");
const rateLimit = require("express-rate-limit");

const app = express();
const port = Number(process.env.PORT || 3000);
const adminPassword = process.env.ADMIN_PASSWORD;
const sessionSecret = process.env.SESSION_SECRET;

if (!adminPassword || !sessionSecret) {
  console.error("ADMIN_PASSWORD and SESSION_SECRET must be configured.");
  process.exit(1);
}

const dataDirectory = path.join(__dirname, "data");
fs.mkdirSync(dataDirectory, { recursive: true });
const db = new Database(path.join(dataDirectory, "applications.db"));
db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    nickname TEXT NOT NULL DEFAULT '',
    why_deserve TEXT NOT NULL,
    what_makes_special TEXT NOT NULL,
    smile_rating TEXT NOT NULL,
    boring_day_plan TEXT NOT NULL,
    first_assignment TEXT NOT NULL DEFAULT '',
    interview_questions TEXT NOT NULL,
    interview_answers TEXT NOT NULL,
    result_title TEXT NOT NULL,
    result_tags TEXT NOT NULL,
    result_message TEXT NOT NULL,
    submitted_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Submitted',
    viewed_at TEXT
  )
`);
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    sid TEXT PRIMARY KEY,
    sess TEXT NOT NULL,
    expires_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS sessions_expires_idx ON sessions(expires_at);
`);

class SQLiteStore extends session.Store {
  constructor(database) {
    super();
    this.database = database;
    this.getStatement = database.prepare("SELECT sess FROM sessions WHERE sid = ? AND expires_at > ?");
    this.setStatement = database.prepare(`
      INSERT INTO sessions (sid, sess, expires_at) VALUES (?, ?, ?)
      ON CONFLICT(sid) DO UPDATE SET sess = excluded.sess, expires_at = excluded.expires_at
    `);
    this.destroyStatement = database.prepare("DELETE FROM sessions WHERE sid = ?");
    this.touchStatement = database.prepare("UPDATE sessions SET expires_at = ? WHERE sid = ?");
    this.cleanupStatement = database.prepare("DELETE FROM sessions WHERE expires_at <= ?");
  }

  get(sid, callback) {
    try {
      const row = this.getStatement.get(sid, Date.now());
      callback(null, row ? JSON.parse(row.sess) : null);
    } catch (error) {
      callback(error);
    }
  }

  set(sid, sessionData, callback) {
    try {
      const expiresAt = sessionData.cookie?.expires
        ? new Date(sessionData.cookie.expires).getTime()
        : Date.now() + 8 * 60 * 60 * 1000;
      this.setStatement.run(sid, JSON.stringify(sessionData), expiresAt);
      callback?.(null);
    } catch (error) {
      callback?.(error);
    }
  }

  destroy(sid, callback) {
    try {
      this.destroyStatement.run(sid);
      callback?.(null);
    } catch (error) {
      callback?.(error);
    }
  }

  touch(sid, sessionData, callback) {
    try {
      const expiresAt = sessionData.cookie?.expires
        ? new Date(sessionData.cookie.expires).getTime()
        : Date.now() + 8 * 60 * 60 * 1000;
      this.touchStatement.run(expiresAt, sid);
      callback?.(null);
    } catch (error) {
      callback?.(error);
    }
  }

  cleanup() {
    this.cleanupStatement.run(Date.now());
  }
}

const sessionStore = new SQLiteStore(db);
setInterval(() => sessionStore.cleanup(), 60 * 60 * 1000).unref();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "100kb" }));
app.disable("x-powered-by");
if (process.env.TRUST_PROXY === "1") app.set("trust proxy", 1);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please wait and try again." }
});

app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  name: "love_admin_session",
  cookie: {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 8 * 60 * 60 * 1000,
    path: "/"
  }
}));

function requireAdmin(req, res, next) {
  if (req.session?.adminAuthenticated) return next();
  res.status(401).json({ error: "Authentication required." });
}

function requireAdminPage(req, res, next) {
  if (req.session?.adminAuthenticated) return next();
  res.redirect("/admin/login.html");
}

app.get("/admin", (req, res) => res.redirect("/admin/login.html"));
app.get("/admin/login.html", (req, res) => res.sendFile(path.join(__dirname, "admin-login.html")));
app.get("/admin/dashboard.html", requireAdminPage, (req, res) => res.sendFile(path.join(__dirname, "admin-dashboard.html")));
app.get("/admin/dashboard", requireAdminPage, (req, res) => res.sendFile(path.join(__dirname, "admin-dashboard.html")));

app.use((req, res, next) => {
  if (req.path === "/admin-dashboard.html") return res.redirect("/admin/dashboard");
  const protectedPath = [
    "/server.js",
    "/package.json",
    "/package-lock.json",
    "/.gitignore",
    "/.env",
    "/data/",
    "/node_modules/"
  ].some((entry) => req.path === entry || req.path.startsWith(entry));
  if (protectedPath || req.path.startsWith("/.")) return res.status(404).sendFile(path.join(__dirname, "404.html"));
  next();
});

function cleanText(value, maximumLength) {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
  if (!cleaned || cleaned.length > maximumLength) return null;
  return cleaned;
}

function validateApplication(body) {
  if (!body || typeof body !== "object") return null;
  const applicationId = cleanText(body.applicationId, 64);
  const fullName = cleanText(body.fullName, 100);
  const nickname = typeof body.nickname === "string" ? cleanText(body.nickname, 100) || "" : "";
  const whyDeserve = cleanText(body.whyDeserve, 2000);
  const whatMakesSpecial = cleanText(body.whatMakesSpecial, 2000);
  const boringDayPlan = cleanText(body.boringDayPlan, 2000);
  const smileRating = cleanText(body.smileRating, 80);
  const firstAssignment = typeof body.firstAssignment === "string" ? cleanText(body.firstAssignment, 120) || "" : "";
  const smileOptions = ["Quite good", "Very good", "Expert", "Professionally irresistible"];
  if (!/^LA-[A-Z0-9-]{4,60}$/i.test(applicationId || "") ||
      !fullName || nickname === null || !whyDeserve || !whatMakesSpecial || !boringDayPlan ||
      !smileOptions.includes(smileRating)) return null;
  if (!Array.isArray(body.interviewQuestions) || !Array.isArray(body.interviewAnswers) ||
      body.interviewQuestions.length !== 5 || body.interviewAnswers.length !== 5) return null;
  const questions = body.interviewQuestions.map((value) => cleanText(value, 300));
  const answers = body.interviewAnswers.map((value) => cleanText(value, 300));
  if (questions.some((value) => !value) || answers.some((value) => !value)) return null;
  if (!body.result || typeof body.result !== "object") return null;
  const title = cleanText(body.result.title, 150);
  const message = cleanText(body.result.message, 1000);
  if (!title || !message || !Array.isArray(body.result.tags) || body.result.tags.length === 0 || body.result.tags.length > 5) return null;
  const tags = body.result.tags.map((value) => cleanText(value, 100));
  if (tags.some((value) => !value) || new Set(tags).size !== tags.length) return null;
  return { applicationId, fullName, nickname, whyDeserve, whatMakesSpecial, boringDayPlan, smileRating, firstAssignment, questions, answers, title, message, tags };
}

app.post("/api/applications", (req, res) => {
  const application = validateApplication(req.body);
  if (!application) return res.status(400).json({ error: "The application contains invalid or missing fields." });
  try {
    db.prepare(`
      INSERT INTO applications (
        application_id, full_name, nickname, why_deserve, what_makes_special,
        smile_rating, boring_day_plan, first_assignment, interview_questions,
        interview_answers, result_title, result_tags, result_message, submitted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      application.applicationId,
      application.fullName,
      application.nickname,
      application.whyDeserve,
      application.whatMakesSpecial,
      application.smileRating,
      application.boringDayPlan,
      application.firstAssignment,
      JSON.stringify(application.questions),
      JSON.stringify(application.answers),
      application.title,
      JSON.stringify(application.tags),
      application.message,
      new Date().toISOString()
    );
    res.status(201).json({ saved: true, applicationId: application.applicationId });
  } catch (error) {
    if (String(error.message).includes("UNIQUE")) {
      return res.status(409).json({ error: "This application has already been submitted." });
    }
    console.error("Application save failed:", error);
    res.status(500).json({ error: "The application could not be saved." });
  }
});

app.post("/admin/login", loginLimiter, (req, res) => {
  const supplied = String(req.body.password || "");
  const suppliedHash = crypto.createHash("sha256").update(supplied).digest();
  const expectedHash = crypto.createHash("sha256").update(adminPassword).digest();
  if (!crypto.timingSafeEqual(suppliedHash, expectedHash)) {
    return res.status(401).json({ error: "Incorrect password." });
  }
  req.session.regenerate((error) => {
    if (error) return res.status(500).json({ error: "Login could not be completed." });
    req.session.adminAuthenticated = true;
    req.session.save((saveError) => {
      if (saveError) return res.status(500).json({ error: "Login could not be completed." });
      res.json({ authenticated: true });
    });
  });
});

app.post("/admin/logout", (req, res) => {
  req.session.destroy((error) => {
    if (error) return res.status(500).json({ error: "Logout could not be completed." });
    res.clearCookie("love_admin_session", {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/"
    });
    res.json({ authenticated: false });
  });
});

app.get("/api/admin/session", requireAdmin, (req, res) => res.json({ authenticated: true }));

function deserializeApplication(row) {
  return {
    ...row,
    interview_questions: JSON.parse(row.interview_questions),
    interview_answers: JSON.parse(row.interview_answers),
    result_tags: JSON.parse(row.result_tags)
  };
}

app.get("/api/admin/applications", requireAdmin, (req, res) => {
  const search = String(req.query.search || "").trim().toLowerCase();
  let order = "submitted_at DESC";
  if (req.query.sort === "oldest") order = "submitted_at ASC";
  if (req.query.sort === "name") order = "full_name COLLATE NOCASE ASC";
  const rows = db.prepare(`SELECT * FROM applications ORDER BY ${order}`).all();
  const filtered = search ? rows.filter((row) => [row.full_name, row.nickname, row.application_id].some((value) =>
    String(value || "").toLowerCase().includes(search)
  )) : rows;
  res.json(filtered.map(deserializeApplication));
});

app.get("/api/admin/applications/:id", requireAdmin, (req, res) => {
  const row = db.prepare("SELECT * FROM applications WHERE application_id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Application not found." });
  db.prepare("UPDATE applications SET status = 'Viewed', viewed_at = COALESCE(viewed_at, ?) WHERE application_id = ?")
    .run(new Date().toISOString(), req.params.id);
  res.json(deserializeApplication(db.prepare("SELECT * FROM applications WHERE application_id = ?").get(req.params.id)));
});

app.get("/api/admin/export", requireAdmin, (req, res) => {
  const rows = db.prepare("SELECT * FROM applications ORDER BY submitted_at DESC").all().map(deserializeApplication);
  const fields = ["application_id", "full_name", "nickname", "why_deserve", "what_makes_special", "smile_rating", "boring_day_plan", "first_assignment", "interview_questions", "interview_answers", "result_title", "result_tags", "result_message", "submitted_at", "status"];
  const csvCell = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const csv = [fields.join(","), ...rows.map((row) => fields.map((field) => csvCell(Array.isArray(row[field]) ? JSON.stringify(row[field]) : row[field])).join(","))].join("\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=love-applications.csv");
  res.send(csv);
});

app.delete("/api/admin/applications/:id", requireAdmin, (req, res) => {
  const result = db.prepare("DELETE FROM applications WHERE application_id = ?").run(req.params.id);
  if (!result.changes) return res.status(404).json({ error: "Application not found." });
  res.json({ deleted: true });
});

app.get("/api/admin/stats", requireAdmin, (req, res) => {
  const total = db.prepare("SELECT COUNT(*) AS count FROM applications").get().count;
  const latest = db.prepare("SELECT submitted_at FROM applications ORDER BY submitted_at DESC LIMIT 1").get();
  res.json({ total, latestSubmission: latest?.submitted_at || null });
});

app.use(express.static(__dirname, { extensions: ["html"], index: "index.html" }));
app.use((req, res) => res.status(404).sendFile(path.join(__dirname, "404.html")));
app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    return res.status(400).json({ error: "The request body is invalid." });
  }
  if (error.type === "entity.too.large") {
    return res.status(413).json({ error: "The application is too large." });
  }
  console.error("Unhandled server error:", error.name || "Error");
  res.status(500).json({ error: "An unexpected server error occurred." });
});

app.listen(port, () => console.log(`The Love Application is running at http://localhost:${port}`));
