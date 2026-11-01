const $ = (id) => document.querySelector(`[id="${id}"]`);
const screens = [...document.querySelectorAll(".screen")];
const form = $("applicationForm");
const interviewQuestions = [
  {
    kicker: "Commitment assessment",
    question: "Your favourite person has had a difficult day. You...",
    options: [
      ["Bring snacks and listen", "Excellent taste. Listening is very romantic."],
      ["Organise an emergency dance break", "Officially authorised ridiculousness."],
      ["Tell a terrible joke on purpose", "A brave long-term strategy."],
      ["Do all of the above, in sequence", "Suspiciously perfect answer."]
    ]
  },
  {
    kicker: "Emergency protocol",
    question: "Someone steals the last dessert. Your response?",
    options: [
      ["Share what's left of mine", "Generous, but emotionally risky."],
      ["Begin a dramatic pursuit", "The courthouse will understand."],
      ["Replace it with something better", "Problem-solving, with crumbs."],
      ["Ask if they're okay first", "Alarmingly considerate."]
    ]
  },
  {
    kicker: "Shared time evaluation",
    question: "Which plan sounds most promising on a rainy afternoon?",
    options: [
      ["Blanket fort and films", "Strong aesthetic credentials."],
      ["Cook something ambitious", "Chef energy detected."],
      ["Reorganise the entire bookshelf", "Productivity disguised as romance."],
      ["Stay, talk, and improvise", "The favourite-person instinct is showing."]
    ]
  },
  {
    kicker: "Adventure standards",
    question: "What is your ideal spontaneous adventure?",
    options: [
      ["A scenic drive with no destination", "Excellent soundtrack required."],
      ["A café you have never visited", "Exploring, with pastries."],
      ["A walk after sunset", "Quietly cinematic."],
      ["Anything, as long as we go together", "The interview team is blushing."]
    ]
  },
  {
    kicker: "Final compatibility check",
    question: "How should you handle a terrible song playing?",
    options: [
      ["Turn it into a duet", "Natural star quality."],
      ["Invent dramatic choreography", "The neighbours will understand."],
      ["Request a romantic slow dance", "Smoothness levels: concerning."],
      ["Declare it our new anthem", "A shared bond has been forged."]
    ]
  }
];

let currentQuestion = 0;
let answers = [];

function showScreen(id) {
  screens.forEach((screen) => {
    const active = screen.id === id;
    screen.hidden = !active;
    screen.classList.toggle("active", active);
    if (active) screen.scrollTop = 0;
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

$("startButton").addEventListener("click", () => showScreen("application"));

document.querySelectorAll("[data-back]").forEach((button) => {
  button.addEventListener("click", () => showScreen(button.dataset.back));
});

function setError(field, message) {
  field.classList.toggle("invalid", Boolean(message));
  const error = document.getElementById(`${field.id}Error`);
  if (error) error.textContent = message;
  field.setAttribute("aria-invalid", Boolean(message));
}

function clearError(field) {
  setError(field, "");
}

["fullName", "deserve", "special", "boringDay"].forEach((id) => {
  const field = document.getElementById(id);
  field.addEventListener("input", () => {
    if (field.value.trim()) clearError(field);
  });
});

document.querySelectorAll('input[name="smile"]').forEach((input) => {
  input.addEventListener("change", () => document.getElementById("smileError").textContent = "");
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  let valid = true;
  [
    ["fullName", "Please tell us your full name."],
    ["deserve", "The position deserves a little evidence."],
    ["special", "Tell us what makes you extraordinary."],
    ["boringDay", "Please share your excellent boring-day plan."]
  ].forEach(([id, message]) => {
    const field = document.getElementById(id);
    if (!field.value.trim()) {
      setError(field, message);
      valid = false;
    } else {
      clearError(field);
    }
  });

  if (!form.elements.smile.value) {
    document.getElementById("smileError").textContent = "Please choose your smile-making credentials.";
    valid = false;
  } else {
    document.getElementById("smileError").textContent = "";
  }

  if (!valid) {
    form.querySelector(".invalid, input[name='smile']")?.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  currentQuestion = 0;
  answers = [];
  renderQuestion();
  showScreen("interview");
});

function renderQuestion() {
  const item = interviewQuestions[currentQuestion];
  document.getElementById("questionKicker").textContent = item.kicker;
  document.getElementById("interviewQuestion").textContent = item.question;
  document.getElementById("questionCount").textContent = `${String(currentQuestion + 1).padStart(2, "0")} / 05`;
  document.getElementById("interviewProgress").style.width = `${((currentQuestion + 1) / interviewQuestions.length) * 100}%`;
  document.getElementById("reaction").textContent = "";

  const answerList = document.getElementById("answerList");
  answerList.replaceChildren();
  item.options.forEach(([label, reaction], index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "answer-button";
    button.innerHTML = `<span>Option ${String.fromCharCode(65 + index)}</span>${label}`;
    button.addEventListener("click", () => selectAnswer(button, label, reaction));
    answerList.appendChild(button);
  });
}

function selectAnswer(button, answer, reaction) {
  const buttons = [...document.querySelectorAll(".answer-button")];
  buttons.forEach((item) => item.disabled = true);
  button.classList.add("selected");
  button.disabled = false;
  document.getElementById("reaction").textContent = reaction;
  answers[currentQuestion] = answer;

  window.setTimeout(() => {
    currentQuestion += 1;
    if (currentQuestion < interviewQuestions.length) {
      renderQuestion();
    } else {
      startReview();
    }
  }, 900);
}

const reviewSteps = [
  "Checking your romantic credentials",
  "Comparing you with the minimum standard",
  "Verifying suspicious levels of charm",
  "Sending paperwork to the hearts department"
];

function startReview() {
  showScreen("review");
  const fullName = document.getElementById("fullName").value.trim();
  const nickname = document.getElementById("nickname").value.trim();
  const smile = form.elements.smile.value;
  const assignment = form.elements.assignment.value || "Undecided — delightful surprise preferred";
  document.getElementById("reviewReference").textContent = `LA-${String(Date.now()).slice(-4)}`;
  document.getElementById("reviewName").textContent = fullName;
  document.getElementById("reviewNickname").textContent = nickname || "Not specified";
  document.getElementById("reviewSmile").textContent = smile;
  document.getElementById("reviewAssignment").textContent = assignment;
  document.getElementById("reviewDeserve").textContent = document.getElementById("deserve").value.trim();
  document.getElementById("reviewSpecial").textContent = document.getElementById("special").value.trim();
  document.getElementById("reviewBoring").textContent = document.getElementById("boringDay").value.trim();
  const list = document.getElementById("reviewInterview");
  list.replaceChildren();
  answers.forEach((answer) => {
    const item = document.createElement("li");
    item.textContent = answer;
    list.appendChild(item);
  });
}

document.getElementById("submitApplication").addEventListener("click", () => {
  submitApplication();
});

async function submitApplication() {
  const card = document.querySelector(".review-card");
  card.classList.add("is-processing");
  const status = document.createElement("div");
  status.className = "processing-status";
  status.setAttribute("role", "status");
  status.textContent = "Consulting the hearts department…";
  card.appendChild(status);
  document.getElementById("submitApplication").disabled = true;

  const result = generateApplicationResult();
  const payload = {
    applicationId: document.getElementById("reviewReference").textContent,
    fullName: document.getElementById("fullName").value.trim(),
    nickname: document.getElementById("nickname").value.trim(),
    whyDeserve: document.getElementById("deserve").value.trim(),
    whatMakesSpecial: document.getElementById("special").value.trim(),
    smileRating: form.elements.smile.value,
    boringDayPlan: document.getElementById("boringDay").value.trim(),
    firstAssignment: form.elements.assignment.value,
    interviewAnswers: [...answers],
    interviewQuestions: interviewQuestions.map((question) => question.question),
    result
  };

  try {
    const response = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || "The application could not be saved.");
    card.classList.remove("is-processing");
    status.remove();
    document.getElementById("submitApplication").disabled = false;
    showResult(result);
  } catch (error) {
    card.classList.remove("is-processing");
    status.textContent = error.message || "Submission failed. Please check your connection and try again.";
    status.classList.add("submission-error");
    document.getElementById("submitApplication").disabled = false;
  }
}

let generatedResult = null;

function generateApplicationResult() {
  const results = [
    { title: "Application approved.", tags: ["Strong candidate", "Suspiciously adorable"], message: "The hearts department agrees: your combination of charm, care, and excellent timing is difficult to resist." },
    { title: "Position provisionally yours.", tags: ["Requires further investigation", "Highly promising"], message: "Your application has passed every serious test and most of the unserious ones. Romance remains delightedly under review." },
    { title: "Suspiciously perfect match.", tags: ["Favourite-person energy", "References unnecessary"], message: "The committee may need longer to process these results. Fortunately, enthusiasm has already reached record levels." }
  ];
  generatedResult = generatedResult || results[Math.floor(Math.random() * results.length)];
  return generatedResult;
}

function showResult(result) {
  const fullName = document.getElementById("fullName").value.trim();
  const nickname = document.getElementById("nickname").value.trim();
  const displayName = nickname || fullName.split(/\s+/)[0];

  document.getElementById("result-title").textContent = result.title;
  document.getElementById("resultName").textContent = `${fullName}${displayName.toLowerCase() !== fullName.toLowerCase() ? ` — known affectionately as ${displayName}` : ""}`;
  document.getElementById("resultMessage").textContent = result.message;

  const tags = document.getElementById("resultTags");
  tags.replaceChildren();
  result.tags.forEach((tag) => {
    const span = document.createElement("span");
    span.textContent = tag;
    tags.appendChild(span);
  });
  showScreen("result");
}

function resetApplication() {
  form.reset();
  generatedResult = null;
  document.querySelectorAll(".field-error").forEach((error) => error.textContent = "");
  document.querySelectorAll(".invalid").forEach((field) => {
    field.classList.remove("invalid");
    field.setAttribute("aria-invalid", "false");
  });
  document.getElementById("shareStatus").textContent = "";
  showScreen("landing");
}

document.getElementById("restartButton").addEventListener("click", () => {
  const dialog = document.getElementById("restartDialog");
  if (typeof dialog.showModal === "function") dialog.showModal();
  else if (window.confirm("Restart this application and clear your answers?")) resetApplication();
});

document.getElementById("confirmRestart").addEventListener("click", resetApplication);

function resultText() {
  const title = document.getElementById("result-title").textContent;
  const name = document.getElementById("resultName").textContent;
  const message = document.getElementById("resultMessage").textContent;
  return `${title}\n${name}\n${message}\n— The Love Application`;
}

document.getElementById("copyButton").addEventListener("click", async () => {
  const status = document.getElementById("shareStatus");
  try {
    if (!navigator.clipboard) throw new Error("Clipboard unavailable");
    await navigator.clipboard.writeText(resultText());
    status.textContent = "Result copied to your clipboard.";
  } catch {
    const temporary = document.createElement("textarea");
    temporary.value = resultText();
    temporary.setAttribute("readonly", "");
    temporary.style.position = "fixed";
    temporary.style.opacity = "0";
    document.body.appendChild(temporary);
    temporary.select();
    const copied = document.execCommand("copy");
    temporary.remove();
    status.textContent = copied ? "Result copied to your clipboard." : "Select and copy the result text manually.";
  }
});

document.getElementById("shareButton").addEventListener("click", async () => {
  const title = document.getElementById("result-title").textContent;
  const name = document.getElementById("resultName").textContent;
  const text = resultText();
  const status = document.getElementById("shareStatus");

  try {
    if (navigator.share) {
      await navigator.share({ title: "The Love Application", text });
      status.textContent = "Result shared.";
    } else {
      await navigator.clipboard.writeText(text);
      status.textContent = "Result copied to clipboard.";
    }
  } catch (error) {
    if (error.name === "AbortError") return;
    try {
      await navigator.clipboard.writeText(text);
      status.textContent = "Result copied to clipboard.";
    } catch {
      status.textContent = "Sharing is not available in this browser.";
    }
  }
});

document.getElementById("downloadButton").addEventListener("click", () => {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 675;
  const context = canvas.getContext("2d");
  const gradient = context.createLinearGradient(0, 0, 1200, 675);
  gradient.addColorStop(0, "#ffeaf0");
  gradient.addColorStop(0.55, "#efa0bc");
  gradient.addColorStop(1, "#c94f78");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#5d2b33";
  context.textAlign = "center";
  context.font = "600 42px Georgia";
  context.fillText("THE LOVE APPLICATION", 600, 95);
  context.font = "italic 34px Georgia";
  context.fillStyle = "#fff";
  context.fillText(document.getElementById("result-title").textContent, 600, 200);
  context.font = "28px Georgia";
  context.fillText(document.getElementById("resultName").textContent, 600, 270);
  context.font = "22px Georgia";
  const message = document.getElementById("resultMessage").textContent;
  const words = message.split(" ");
  let line = "";
  let y = 350;
  words.forEach((word) => {
    const test = `${line}${word} `;
    if (context.measureText(test).width > 900) {
      context.fillText(line.trim(), 600, y);
      line = `${word} `;
      y += 34;
    } else line = test;
  });
  context.fillText(line.trim(), 600, y);
  context.fillStyle = "#ffeaf0";
  context.font = "40px Georgia";
  context.fillText("♥", 600, 570);

  const link = document.createElement("a");
  link.download = "love-application-result.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
  document.getElementById("shareStatus").textContent = "Your result image has been downloaded.";
});
