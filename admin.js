const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const error = document.getElementById("loginError");
    error.textContent = "";
    try {
      const response = await fetch("/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ password: document.getElementById("password").value })
      });
      if (response.ok) {
        window.location.assign("/admin/dashboard");
      } else {
        const body = await response.json().catch(() => ({}));
        error.textContent = body.error || "Unable to sign in.";
      }
    } catch {
      error.textContent = "Unable to reach the server. Please try again.";
    }
  });
}

const applicationsBody = document.getElementById("applicationsBody");
if (applicationsBody) {
  let applications = [];
  const searchInput = document.getElementById("applicationSearch");
  const sortInput = document.getElementById("applicationSort");

  async function loadApplications() {
    const params = new URLSearchParams({ search: searchInput.value, sort: sortInput.value });
    const response = await fetch(`/api/admin/applications?${params}`);
    if (response.status === 401) {
      window.location.href = "/admin/login.html";
      return;
    }
    applications = await response.json();
    renderApplications();
  }

  function renderApplications() {
    applicationsBody.replaceChildren();
    document.getElementById("emptyState").hidden = applications.length > 0;
    applications.forEach((application) => {
      const row = document.createElement("tr");
      const date = new Date(application.submitted_at).toLocaleString();
      row.innerHTML = `<td><strong>${escapeHtml(application.full_name)}</strong><br><small>${escapeHtml(application.nickname || "No nickname")}</small></td><td>${escapeHtml(application.application_id)}</td><td>${escapeHtml(application.result_title)}</td><td>${escapeHtml(date)}</td><td><span class="status-pill">${escapeHtml(application.status)}</span></td><td><button class="view-button" type="button" data-id="${escapeHtml(application.application_id)}">View</button><button class="delete-button" type="button" data-delete="${escapeHtml(application.application_id)}">Delete</button></td>`;
      applicationsBody.appendChild(row);
    });
  }

  applicationsBody.addEventListener("click", async (event) => {
    const viewButton = event.target.closest("[data-id]");
    if (viewButton) openApplication(viewButton.dataset.id);
    const deleteButton = event.target.closest("[data-delete]");
    if (deleteButton && window.confirm(`Delete application ${deleteButton.dataset.delete}? This cannot be undone.`)) {
      const response = await fetch(`/api/admin/applications/${encodeURIComponent(deleteButton.dataset.delete)}`, { method: "DELETE" });
      if (response.ok) loadApplications();
    }
  });

  async function openApplication(id) {
    const response = await fetch(`/api/admin/applications/${encodeURIComponent(id)}`);
    if (!response.ok) return;
    const application = await response.json();
    const questions = application.interview_questions;
    const answers = application.interview_answers;
    const interview = questions.map((question, index) => `<li><strong>${escapeHtml(question)}</strong><br>${escapeHtml(answers[index] || "No answer")}</li>`).join("");
    document.getElementById("applicationDetail").innerHTML = `
      <p class="admin-kicker">Application ${escapeHtml(application.application_id)}</p>
      <h1>${escapeHtml(application.full_name)}</h1>
      <div class="detail-grid">
        <div class="detail-block"><span>Nickname</span><strong>${escapeHtml(application.nickname || "Not specified")}</strong></div>
        <div class="detail-block"><span>Submitted</span><strong>${escapeHtml(new Date(application.submitted_at).toLocaleString())}</strong></div>
        <div class="detail-block"><span>Smile credentials</span><strong>${escapeHtml(application.smile_rating)}</strong></div>
        <div class="detail-block"><span>Ideal assignment</span><strong>${escapeHtml(application.first_assignment || "Not selected")}</strong></div>
        <div class="detail-block full"><span>Why do you deserve this position?</span><strong>${escapeHtml(application.why_deserve)}</strong></div>
        <div class="detail-block full"><span>What makes you special?</span><strong>${escapeHtml(application.what_makes_special)}</strong></div>
        <div class="detail-block full"><span>What would you do on a boring day together?</span><strong>${escapeHtml(application.boring_day_plan)}</strong></div>
        <div class="detail-block full"><span>Interview</span><ol>${interview}</ol></div>
        <div class="detail-block full"><span>Generated result</span><strong>${escapeHtml(application.result_title)}</strong><br>${escapeHtml(application.result_message)}</div>
      </div>`;
    document.getElementById("applicationDialog").showModal();
    loadApplications();
  }

  function escapeHtml(value) {
    const element = document.createElement("div");
    element.textContent = String(value ?? "");
    return element.innerHTML;
  }

  searchInput.addEventListener("input", () => loadApplications());
  sortInput.addEventListener("change", () => loadApplications());
  document.getElementById("logoutButton").addEventListener("click", async () => {
    await fetch("/admin/logout", { method: "POST", credentials: "same-origin" });
    window.location.href = "/admin/login.html";
  });
  fetch("/api/admin/stats").then((response) => response.ok ? response.json() : null).then((stats) => {
    if (!stats) return window.location.href = "/admin/login.html";
    document.getElementById("totalCount").textContent = stats.total;
    document.getElementById("latestDate").textContent = stats.latestSubmission ? new Date(stats.latestSubmission).toLocaleString() : "—";
  });
  loadApplications();
}
