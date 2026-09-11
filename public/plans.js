// Exercise plan and diet plan: dashboard cards plus slide-in editors.
// Loaded after app.js; only shares the #status element with it.

(() => {
  const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  const planStatusEl = document.getElementById("status");
  const exerciseView = document.getElementById("exercise-plan-view");
  const dietView = document.getElementById("diet-plan-view");
  const plansOverlay = document.getElementById("plans-overlay");
  const exercisePanel = document.getElementById("exercise-panel");
  const dietPanel = document.getElementById("diet-panel");
  const exerciseDaysList = document.getElementById("exercise-days-list");
  const dietMealsList = document.getElementById("diet-meals-list");

  let plans = null;

  function setStatus(text) {
    if (planStatusEl) planStatusEl.textContent = text;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function todayName() {
    // getDay(): 0 = Sunday
    return WEEKDAYS[(new Date().getDay() + 6) % 7];
  }

  function scheme(exercise) {
    const parts = [];
    if (exercise.sets > 1) parts.push(`${exercise.sets} ×`);
    if (exercise.reps) parts.push(exercise.reps);
    return parts.join(" ");
  }

  // ---------- Dashboard cards ----------

  function renderExerciseView(plan) {
    if (!plan || !Array.isArray(plan.days) || plan.days.length === 0) {
      exerciseView.innerHTML = '<p class="plan-empty">No exercise plan yet. Click Edit to add one.</p>';
      return;
    }
    const today = todayName();
    const html = [];
    if (plan.notes) html.push(`<p class="plan-notes">${escapeHtml(plan.notes)}</p>`);
    for (const day of plan.days) {
      const isRest = day.exercises.length === 0;
      const classes = ["plan-day"];
      if (day.day === today) classes.push("today");
      if (isRest) classes.push("rest");
      const focus = day.focus || (isRest ? "Rest" : "");
      const items = day.exercises
        .map((e) => {
          const s = scheme(e);
          return `<li><span>${escapeHtml(e.name)}</span>${s ? `<span class="plan-exercise-scheme">${escapeHtml(s)}</span>` : ""}${e.notes ? `<span class="plan-exercise-notes">${escapeHtml(e.notes)}</span>` : ""}</li>`;
        })
        .join("");
      html.push(`
        <div class="${classes.join(" ")}">
          <div class="plan-day-name">${escapeHtml(day.day)}</div>
          <div>
            ${focus ? `<p class="plan-day-focus">${escapeHtml(focus)}</p>` : ""}
            ${items ? `<ul class="plan-exercises">${items}</ul>` : ""}
          </div>
        </div>`);
    }
    exerciseView.innerHTML = html.join("");
  }

  function renderDietView(plan) {
    if (!plan || (!plan.meals?.length && !plan.caloriesKcal)) {
      dietView.innerHTML = '<p class="plan-empty">No diet plan yet. Click Edit to add one.</p>';
      return;
    }
    const html = [];
    html.push(`
      <div class="macro-strip">
        <div class="macro-item kcal"><p class="macro-value">${plan.caloriesKcal || "--"}</p><p class="macro-label">kcal</p></div>
        <div class="macro-item"><p class="macro-value">${plan.proteinG || "--"}</p><p class="macro-label">Protein g</p></div>
        <div class="macro-item"><p class="macro-value">${plan.carbsG || "--"}</p><p class="macro-label">Carbs g</p></div>
        <div class="macro-item"><p class="macro-value">${plan.fatG || "--"}</p><p class="macro-label">Fat g</p></div>
      </div>`);
    if (plan.notes) html.push(`<p class="plan-notes">${escapeHtml(plan.notes)}</p>`);
    for (const meal of plan.meals || []) {
      const items = meal.items.map((i) => `<li>${escapeHtml(i)}</li>`).join("");
      html.push(`
        <div class="plan-meal">
          <div class="plan-meal-name">${escapeHtml(meal.name)}${meal.time ? `<span class="plan-meal-time">${escapeHtml(meal.time)}</span>` : ""}</div>
          <ul class="plan-meal-items">${items}</ul>
        </div>`);
    }
    if (plan.guidelines?.length) {
      html.push(`<p class="plan-guidelines-title">Guidelines</p>`);
      html.push(`<ul class="plan-guidelines">${plan.guidelines.map((g) => `<li>${escapeHtml(g)}</li>`).join("")}</ul>`);
    }
    dietView.innerHTML = html.join("");
  }

  async function loadPlans() {
    try {
      const response = await fetch("/api/plans");
      const json = await response.json();
      if (json.error) throw new Error(json.error);
      plans = json;
      renderExerciseView(plans.exercisePlan);
      renderDietView(plans.dietPlan);
    } catch (error) {
      console.error("Failed to load plans:", error);
      exerciseView.innerHTML = `<p class="plan-empty">Could not load plan: ${escapeHtml(error.message)}</p>`;
      dietView.innerHTML = `<p class="plan-empty">Could not load plan: ${escapeHtml(error.message)}</p>`;
    }
  }

  async function savePlans(next) {
    const response = await fetch("/api/plans", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(json.error || "Failed to save plans");
    plans = json.plans;
    renderExerciseView(plans.exercisePlan);
    renderDietView(plans.dietPlan);
  }

  // ---------- Panels ----------

  function openPanel(panel) {
    panel.classList.add("open");
    plansOverlay.style.display = "block";
  }

  function closePanels() {
    exercisePanel.classList.remove("open");
    dietPanel.classList.remove("open");
    plansOverlay.style.display = "none";
  }

  plansOverlay.addEventListener("click", closePanels);

  // ---------- Exercise editor ----------

  function dayOptions(selected) {
    return WEEKDAYS.map((d) => `<option value="${d}"${d === selected ? " selected" : ""}>${d}</option>`).join("");
  }

  function exerciseRowHtml(exercise) {
    return `
      <div class="exercise-row">
        <input type="text" data-field="name" placeholder="Exercise" value="${escapeHtml(exercise.name)}" />
        <input type="number" data-field="sets" min="0" placeholder="Sets" value="${exercise.sets ?? ""}" />
        <input type="text" data-field="reps" placeholder="Reps / time" value="${escapeHtml(exercise.reps)}" />
        <input type="text" data-field="notes" placeholder="Notes" value="${escapeHtml(exercise.notes)}" />
        <button type="button" class="button-icon remove-exercise" title="Remove exercise">×</button>
      </div>`;
  }

  function renderExerciseForm(plan) {
    document.getElementById("exercise-notes").value = plan.notes || "";
    exerciseDaysList.innerHTML = "";
    if (plan.days.length === 0) {
      exerciseDaysList.innerHTML = '<p class="plan-empty">No days yet. Click "+ Add Day".</p>';
      return;
    }
    plan.days.forEach((day) => {
      const block = document.createElement("div");
      block.className = "editor-block";
      block.innerHTML = `
        <div class="editor-block-head">
          <div class="form-group">
            <label>Day</label>
            <select class="day-select">${dayOptions(day.day)}</select>
          </div>
          <div class="form-group">
            <label>Focus</label>
            <input type="text" class="day-focus" placeholder="e.g. Lower body strength, Rest" value="${escapeHtml(day.focus)}" />
          </div>
          <button type="button" class="button button-danger remove-day">Remove</button>
        </div>
        <p class="editor-sub-label">Exercises</p>
        <div class="exercise-rows">${day.exercises.map(exerciseRowHtml).join("")}</div>
        <button type="button" class="button button-ghost add-exercise">+ Add exercise</button>`;
      exerciseDaysList.appendChild(block);
    });
  }

  function collectExerciseForm() {
    const days = Array.from(exerciseDaysList.querySelectorAll(".editor-block")).map((block) => ({
      day: block.querySelector(".day-select").value,
      focus: block.querySelector(".day-focus").value,
      exercises: Array.from(block.querySelectorAll(".exercise-row")).map((row) => ({
        name: row.querySelector('[data-field="name"]').value,
        sets: parseInt(row.querySelector('[data-field="sets"]').value, 10) || 0,
        reps: row.querySelector('[data-field="reps"]').value,
        notes: row.querySelector('[data-field="notes"]').value,
      })),
    }));
    return { notes: document.getElementById("exercise-notes").value, days };
  }

  function openExerciseEditor() {
    if (!plans) return;
    renderExerciseForm(structuredClone(plans.exercisePlan));
    openPanel(exercisePanel);
  }

  exerciseDaysList.addEventListener("click", (e) => {
    const target = e.target;
    if (target.classList.contains("add-exercise")) {
      const rows = target.closest(".editor-block").querySelector(".exercise-rows");
      rows.insertAdjacentHTML("beforeend", exerciseRowHtml({ name: "", sets: 3, reps: "", notes: "" }));
      rows.lastElementChild.querySelector('[data-field="name"]').focus();
    } else if (target.classList.contains("remove-exercise")) {
      target.closest(".exercise-row").remove();
    } else if (target.classList.contains("remove-day")) {
      const draft = collectExerciseForm();
      const blocks = Array.from(exerciseDaysList.querySelectorAll(".editor-block"));
      const index = blocks.indexOf(target.closest(".editor-block"));
      draft.days.splice(index, 1);
      renderExerciseForm(draft);
    }
  });

  document.getElementById("add-exercise-day").addEventListener("click", () => {
    const draft = collectExerciseForm();
    const used = new Set(draft.days.map((d) => d.day));
    const nextDay = WEEKDAYS.find((d) => !used.has(d));
    if (!nextDay) {
      alert("All seven days are already in the plan.");
      return;
    }
    draft.days.push({ day: nextDay, focus: "", exercises: [] });
    draft.days.sort((a, b) => WEEKDAYS.indexOf(a.day) - WEEKDAYS.indexOf(b.day));
    renderExerciseForm(draft);
  });

  document.getElementById("save-exercise-plan").addEventListener("click", async () => {
    const exercisePlan = collectExerciseForm();
    const seen = new Set();
    for (const d of exercisePlan.days) {
      if (seen.has(d.day)) {
        alert(`${d.day} appears more than once. Merge or remove the duplicate.`);
        return;
      }
      seen.add(d.day);
    }
    try {
      await savePlans({ ...plans, exercisePlan });
      closePanels();
      setStatus("Exercise plan saved!");
    } catch (error) {
      setStatus(`Error saving exercise plan: ${error.message}`);
      console.error("Failed to save exercise plan:", error);
    }
  });

  document.getElementById("edit-exercise-plan").addEventListener("click", openExerciseEditor);
  document.getElementById("close-exercise-panel").addEventListener("click", closePanels);
  document.getElementById("cancel-exercise-plan").addEventListener("click", closePanels);

  // ---------- Diet editor ----------

  function mealBlockHtml(meal) {
    return `
      <div class="editor-block meal-block">
        <div class="editor-block-head">
          <div class="form-group">
            <label>Meal</label>
            <input type="text" class="meal-name" placeholder="e.g. Breakfast" value="${escapeHtml(meal.name)}" />
          </div>
          <div class="form-group">
            <label>Time</label>
            <input type="time" class="meal-time" value="${escapeHtml(meal.time)}" />
          </div>
          <button type="button" class="button button-danger remove-meal">Remove</button>
        </div>
        <div class="form-group" style="margin-bottom: 0;">
          <label>Items (one per line)</label>
          <textarea class="meal-items" rows="4">${escapeHtml(meal.items.join("\n"))}</textarea>
        </div>
      </div>`;
  }

  function renderDietForm(plan) {
    document.getElementById("diet-calories").value = plan.caloriesKcal || "";
    document.getElementById("diet-protein").value = plan.proteinG || "";
    document.getElementById("diet-carbs").value = plan.carbsG || "";
    document.getElementById("diet-fat").value = plan.fatG || "";
    document.getElementById("diet-notes").value = plan.notes || "";
    document.getElementById("diet-guidelines").value = (plan.guidelines || []).join("\n");
    dietMealsList.innerHTML = plan.meals.length
      ? plan.meals.map(mealBlockHtml).join("")
      : '<p class="plan-empty">No meals yet. Click "+ Add Meal".</p>';
  }

  function splitLines(value) {
    return value.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
  }

  function collectDietForm() {
    return {
      caloriesKcal: parseInt(document.getElementById("diet-calories").value, 10) || 0,
      proteinG: parseInt(document.getElementById("diet-protein").value, 10) || 0,
      carbsG: parseInt(document.getElementById("diet-carbs").value, 10) || 0,
      fatG: parseInt(document.getElementById("diet-fat").value, 10) || 0,
      notes: document.getElementById("diet-notes").value,
      guidelines: splitLines(document.getElementById("diet-guidelines").value),
      meals: Array.from(dietMealsList.querySelectorAll(".meal-block")).map((block) => ({
        name: block.querySelector(".meal-name").value,
        time: block.querySelector(".meal-time").value,
        items: splitLines(block.querySelector(".meal-items").value),
      })),
    };
  }

  function openDietEditor() {
    if (!plans) return;
    renderDietForm(structuredClone(plans.dietPlan));
    openPanel(dietPanel);
  }

  dietMealsList.addEventListener("click", (e) => {
    if (e.target.classList.contains("remove-meal")) {
      e.target.closest(".meal-block").remove();
      if (!dietMealsList.querySelector(".meal-block")) {
        dietMealsList.innerHTML = '<p class="plan-empty">No meals yet. Click "+ Add Meal".</p>';
      }
    }
  });

  document.getElementById("add-diet-meal").addEventListener("click", () => {
    const empty = dietMealsList.querySelector(".plan-empty");
    if (empty) empty.remove();
    dietMealsList.insertAdjacentHTML("beforeend", mealBlockHtml({ name: "", time: "", items: [] }));
    dietMealsList.lastElementChild.querySelector(".meal-name").focus();
  });

  document.getElementById("save-diet-plan").addEventListener("click", async () => {
    const dietPlan = collectDietForm();
    try {
      await savePlans({ ...plans, dietPlan });
      closePanels();
      setStatus("Diet plan saved!");
    } catch (error) {
      setStatus(`Error saving diet plan: ${error.message}`);
      console.error("Failed to save diet plan:", error);
    }
  });

  document.getElementById("edit-diet-plan").addEventListener("click", openDietEditor);
  document.getElementById("close-diet-panel").addEventListener("click", closePanels);
  document.getElementById("cancel-diet-plan").addEventListener("click", closePanels);

  // ---------- Sidebar navigation ----------

  function scrollToCard(id) {
    const card = document.getElementById(id);
    if (!card) return;
    card.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  document.getElementById("nav-exercise-plan").addEventListener("click", (e) => {
    e.preventDefault();
    if (window.innerWidth <= 1024 && typeof closeSidebar === "function") closeSidebar();
    scrollToCard("exercise-plan-card");
  });

  document.getElementById("nav-diet-plan").addEventListener("click", (e) => {
    e.preventDefault();
    if (window.innerWidth <= 1024 && typeof closeSidebar === "function") closeSidebar();
    scrollToCard("diet-plan-card");
  });

  loadPlans();
})();
