// Training plan view: renders data/plan.json (via /api/plan), tracks
// checkpoint progress, and offers a JSON editor for the whole plan.
(() => {
  const $ = (id) => document.getElementById(id);
  const dashboardView = $("dashboard-view");
  const planView = $("plan-view");
  const navDashboard = $("nav-dashboard");
  const navTrainingPlan = $("nav-training-plan");
  const editorPanel = $("plan-editor-panel");
  const editorOverlay = $("plan-editor-overlay");
  const planJson = $("plan-json");
  const planJsonError = $("plan-json-error");
  const planStatus = $("plan-status");

  let plan = null;
  let loaded = false;

  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  function esc(text) {
    return String(text ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function fmtDate(iso) {
    if (!iso) return "";
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  }

  function setStatus(text, isError = false) {
    planStatus.textContent = text;
    planStatus.style.color = isError ? "#f87171" : "";
  }

  // ---------- view switching ----------
  function showView(name) {
    const isPlan = name === "plan";
    dashboardView.hidden = isPlan;
    planView.hidden = !isPlan;
    navDashboard.classList.toggle("active", !isPlan);
    navTrainingPlan.classList.toggle("active", isPlan);
    try {
      localStorage.setItem("fasto-view", name);
    } catch (e) {
      /* ignore */
    }
    if (isPlan && !loaded) loadPlan();
    if (typeof closeSidebar === "function") closeSidebar();
  }

  navDashboard.addEventListener("click", (e) => {
    e.preventDefault();
    showView("dashboard");
  });
  navTrainingPlan.addEventListener("click", (e) => {
    e.preventDefault();
    showView("plan");
  });

  // ---------- data ----------
  async function loadPlan() {
    try {
      const res = await fetch("/api/plan");
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      plan = json;
      loaded = true;
      render();
      setStatus("");
    } catch (error) {
      setStatus(`Could not load plan: ${error.message}`, true);
    }
  }

  async function savePlan(next) {
    const res = await fetch("/api/plan", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    const json = await res.json();
    if (!res.ok || json.error) throw new Error(json.error || `HTTP ${res.status}`);
    plan = json.plan;
    render();
  }

  // ---------- rendering ----------
  function render() {
    if (!plan) return;
    $("plan-title").textContent = plan.title || "Training Plan";
    const p = plan.period || {};
    $("plan-period").textContent = p.startDate && p.endDate ? `${fmtDate(p.startDate)} – ${fmtDate(p.endDate)}` : "";

    renderToday();
    renderWarmup();
    renderDays();
    renderNutrition();
    renderRules();
    renderCheckpoints();
  }

  function renderToday() {
    const today = DAY_NAMES[new Date().getDay()];
    const schedule = Array.isArray(plan.schedule) ? plan.schedule : [];
    const entry = schedule.find((s) => s.day === today);
    $("plan-today-session").textContent = entry ? entry.session : "--";
    $("plan-schedule").innerHTML = schedule
      .map(
        (s) =>
          `<div class="plan-schedule-day${s.day === today ? " today" : ""}"><span class="plan-schedule-name">${esc(s.day)}</span><span>${esc(s.session)}</span></div>`
      )
      .join("");
  }

  function renderWarmup() {
    const w = plan.warmup || {};
    $("plan-warmup-duration").textContent = w.duration || "";
    $("plan-warmup-list").innerHTML = (w.items || []).map((i) => `<li>${esc(i)}</li>`).join("");
    $("plan-warmup").hidden = !(w.items && w.items.length);
  }

  function renderDays() {
    const today = DAY_NAMES[new Date().getDay()];
    const todaySession = (plan.schedule || []).find((s) => s.day === today)?.session;
    $("plan-days").innerHTML = (plan.days || [])
      .map((d) => {
        const isToday = todaySession && d.name === todaySession;
        const rows = (d.exercises || [])
          .map(
            (x) =>
              `<tr><td>${esc(x.name)}</td><td class="plan-num">${esc(x.sets)}</td><td class="plan-num plan-rest">${esc(x.rest)}</td></tr>`
          )
          .join("");
        return `<div class="card plan-day${isToday ? " today" : ""}">
          <div class="plan-card-head"><h2>${esc(d.name)}</h2><span class="plan-duration">${esc(d.duration || "")}</span></div>
          <table class="plan-table"><thead><tr><th>Exercise</th><th>Sets × reps</th><th>Rest</th></tr></thead><tbody>${rows}</tbody></table>
        </div>`;
      })
      .join("");
  }

  function renderNutrition() {
    const n = plan.nutrition || {};
    const metrics = [];
    if (n.kcal) metrics.push(["Intake", `${n.kcal.min}–${n.kcal.max}`, "kcal / day"]);
    if (n.proteinG) metrics.push(["Protein", `${n.proteinG.min}–${n.proteinG.max}`, "g / day"]);
    if (n.weeklyLossKg) metrics.push(["Target loss", `${n.weeklyLossKg}`, "kg / week"]);
    $("plan-nutrition-metrics").innerHTML = metrics
      .map(
        ([label, value, unit]) =>
          `<div class="metric-item"><p class="metric-label">${esc(label)}</p><p class="metric-value" data-date="${esc(unit)}">${esc(value)}</p></div>`
      )
      .join("");
    $("plan-nutrition-rules").innerHTML = (n.rules || []).map((r) => `<li>${esc(r)}</li>`).join("");
  }

  function renderRules() {
    $("plan-rules-list").innerHTML = (plan.rules || []).map((r) => `<li>${esc(r)}</li>`).join("");
    $("plan-rules").hidden = !(plan.rules && plan.rules.length);
  }

  function renderCheckpoints() {
    const todayIso = new Date().toISOString().slice(0, 10);
    const cps = Array.isArray(plan.checkpoints) ? plan.checkpoints : [];
    const next = cps.find((c) => c.date >= todayIso);
    $("plan-checkpoints").innerHTML = cps
      .map((c, ci) => {
        const items = c.items || [];
        const done = items.filter((i) => i.done).length;
        const state =
          items.length && done === items.length ? "hit" : done > 0 ? "partial" : c === next ? "next" : "";
        const pill =
          state === "hit"
            ? '<span class="plan-pill good">All targets hit</span>'
            : state === "partial"
              ? `<span class="plan-pill warn">${done} of ${items.length}</span>`
              : c === next
                ? '<span class="plan-pill accent">Next</span>'
                : "";
        const list = items
          .map(
            (i, ii) =>
              `<li><label><input type="checkbox" data-cp="${ci}" data-item="${ii}" ${i.done ? "checked" : ""}> <span>${esc(i.text)}</span></label></li>`
          )
          .join("");
        return `<div class="card plan-checkpoint ${state}">
          <div class="plan-card-head">
            <div><p class="metric-label">${esc(c.name)}${c.week ? ` · week ${esc(c.week)}` : ""}</p><h2>${fmtDate(c.date)}</h2></div>
            ${pill}
          </div>
          <ul class="plan-checklist">${list}</ul>
          ${c.note ? `<p class="plan-note">${esc(c.note)}</p>` : ""}
        </div>`;
      })
      .join("");
  }

  // Checkpoint ticks persist straight to the plan file.
  $("plan-checkpoints").addEventListener("change", async (e) => {
    const box = e.target;
    if (!(box instanceof HTMLInputElement) || box.type !== "checkbox") return;
    const ci = Number(box.dataset.cp);
    const ii = Number(box.dataset.item);
    const next = structuredClone(plan);
    next.checkpoints[ci].items[ii].done = box.checked;
    try {
      await savePlan(next);
      setStatus("Saved");
      setTimeout(() => setStatus(""), 1500);
    } catch (error) {
      box.checked = !box.checked;
      setStatus(`Could not save: ${error.message}`, true);
    }
  });

  // ---------- JSON editor ----------
  function openEditor() {
    planJson.value = JSON.stringify(plan, null, 2);
    planJsonError.textContent = "";
    editorPanel.classList.add("open");
    editorOverlay.style.display = "block";
  }
  function closeEditor() {
    editorPanel.classList.remove("open");
    editorOverlay.style.display = "none";
  }

  $("edit-plan").addEventListener("click", () => plan && openEditor());
  $("close-plan-editor").addEventListener("click", closeEditor);
  $("cancel-plan-editor").addEventListener("click", closeEditor);
  editorOverlay.addEventListener("click", closeEditor);

  $("save-plan").addEventListener("click", async () => {
    let parsed;
    try {
      parsed = JSON.parse(planJson.value);
    } catch (error) {
      planJsonError.textContent = `Invalid JSON: ${error.message}`;
      return;
    }
    try {
      await savePlan(parsed);
      closeEditor();
      setStatus("Plan saved");
      setTimeout(() => setStatus(""), 1500);
    } catch (error) {
      planJsonError.textContent = error.message;
    }
  });

  // ---------- boot ----------
  let initial = "dashboard";
  try {
    initial = localStorage.getItem("fasto-view") === "plan" ? "plan" : "dashboard";
  } catch (e) {
    /* ignore */
  }
  showView(initial);
})();
