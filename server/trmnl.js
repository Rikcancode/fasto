/**
 * TRMNL e-ink display feed.
 *
 * Fasto lives on the LAN, so TRMNL's cloud can't poll it. Instead we push a
 * compact summary to a TRMNL "Webhook" private plugin (see trmnl/README.md).
 *
 * Configure with TRMNL_WEBHOOK_URL (https://trmnl.com/api/custom_plugins/<uuid>)
 * and optionally TRMNL_PUSH_MINUTES (default 30). TRMNL allows 12 pushes an
 * hour (5 KB payload) on the standard plan, so the interval is clamped to 5
 * minutes, and an unchanged payload is not re-sent. Set TZ (e.g. Europe/Rome)
 * so "today" and the "updated" stamp use local time rather than UTC.
 *
 * The numbers mirror the dashboard cards in public/app.js (7-day average,
 * position vs the plan line, next milestone) so the screen and the web UI agree.
 */

const DAY_MS = 86400000;
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const CHART_DAYS = 60;
// SVG viewBox the Liquid templates draw the chart into.
const CHART_W = 1000;
const CHART_H = 300;

function parseDate(value) {
  return typeof value === "string" ? new Date(value + "T00:00:00Z") : new Date(value);
}

function round(value, decimals = 1) {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  const f = Math.pow(10, decimals);
  return Math.round(value * f) / f;
}

function shortDate(iso) {
  if (!iso) return null;
  return parseDate(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function todayUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

function rollingAverage(series, days = 7) {
  if (!Array.isArray(series) || series.length === 0) return null;
  const end = parseDate(series[series.length - 1].date);
  const start = new Date(end.getTime() - (days - 1) * DAY_MS);
  const values = series
    .filter((p) => parseDate(p.date) >= start && parseDate(p.date) <= end)
    .map((p) => p.value)
    .filter((v) => typeof v === "number" && !Number.isNaN(v));
  if (values.length === 0) return null;
  return { value: values.reduce((a, b) => a + b, 0) / values.length, count: values.length, end };
}

// Milestones + ultimate goal + the period's starting measurement, as sorted
// {t, v} points; the plan line is the linear interpolation between them.
function planPoints(goals, series, field) {
  const points = [];
  for (const g of goals.weeklyGoals || []) {
    if (typeof g[field] === "number") points.push({ t: parseDate(g.weekStart).getTime(), v: g[field] });
  }
  const ultimate = goals.ultimateGoal;
  if (ultimate?.targetDate && typeof ultimate[field] === "number") {
    points.push({ t: parseDate(ultimate.targetDate).getTime(), v: ultimate[field] });
  }
  if (goals.goalPeriod?.startDate && Array.isArray(series)) {
    const startT = parseDate(goals.goalPeriod.startDate).getTime();
    const anchor = series.find((p) => parseDate(p.date).getTime() >= startT);
    if (anchor) points.push({ t: startT, v: anchor.value });
  }
  return points.sort((a, b) => a.t - b.t);
}

function planValueAt(points, t) {
  if (points.length < 2) return null;
  if (t < points[0].t || t > points[points.length - 1].t) return null;
  for (let i = 1; i < points.length; i += 1) {
    if (t <= points[i].t) {
      const a = points[i - 1];
      const b = points[i];
      if (b.t === a.t) return b.v;
      return a.v + ((b.v - a.v) * (t - a.t)) / (b.t - a.t);
    }
  }
  return null;
}

function planDelta(avg, plan, unit) {
  if (avg === null || plan === null) return { text: "--", state: "none" };
  const diff = avg - plan; // negative = below the line = ahead
  const abs = Math.abs(diff);
  if (abs < 0.15) return { text: "On plan", state: "on-track" };
  return diff < 0
    ? { text: `${abs.toFixed(1)} ${unit} ahead`, state: "ahead" }
    : { text: `${abs.toFixed(1)} ${unit} behind`, state: "behind" };
}

function nextMilestone(goals, field) {
  const today = todayUtc();
  const sorted = [...(goals.weeklyGoals || [])].sort((a, b) => a.weekStart.localeCompare(b.weekStart));
  const goal = sorted.find((g) => parseDate(g.weekStart) > today && typeof g[field] === "number");
  if (goal) return { value: goal[field], date: shortDate(goal.weekStart) };
  const u = goals.ultimateGoal;
  if (u?.targetDate && typeof u[field] === "number" && parseDate(u.targetDate) > today) {
    return { value: u[field], date: shortDate(u.targetDate) };
  }
  return null;
}

function metricSummary(series, goals, field, unit) {
  const last = series.length ? series[series.length - 1] : null;
  const avg = rollingAverage(series);
  const points = planPoints(goals, series, field);
  const plan = avg ? planValueAt(points, avg.end.getTime()) : null;
  const delta = planDelta(avg ? avg.value : null, plan, unit);

  const u = goals.ultimateGoal;
  const target = typeof u?.[field] === "number" ? u[field] : null;
  const weeksLeft = u?.targetDate
    ? Math.max(0, Math.ceil((parseDate(u.targetDate) - todayUtc()) / (7 * DAY_MS)))
    : null;

  // Progress from the period's starting measurement to the ultimate goal.
  const start = points.length && goals.goalPeriod?.startDate ? points[0].v : null;
  const current = avg ? avg.value : last?.value ?? null;
  let progressPct = null;
  if (start !== null && target !== null && current !== null && start !== target) {
    progressPct = Math.round(Math.min(100, Math.max(0, ((start - current) / (start - target)) * 100)));
  }

  return {
    unit,
    last: round(last?.value),
    lastDate: shortDate(last?.date),
    avg7: round(avg?.value),
    avgCount: avg?.count ?? 0,
    plan: round(plan),
    delta: delta.text,
    deltaState: delta.state,
    toGo: target !== null && current !== null ? round(Math.max(0, current - target)) : null,
    next: nextMilestone(goals, field),
    target,
    targetDate: shortDate(u?.targetDate),
    weeksLeft,
    start: round(start),
    startDate: start !== null ? shortDate(goals.goalPeriod.startDate) : null,
    progressPct,
  };
}

// Weight over the last CHART_DAYS days plus the plan line, as SVG polyline
// point strings in a CHART_W x CHART_H box (y grows downward).
function buildChart(series, goals, field) {
  if (!series.length) return null;
  const endT = parseDate(series[series.length - 1].date).getTime();
  const startT = endT - (CHART_DAYS - 1) * DAY_MS;
  const recent = series.filter((p) => parseDate(p.date).getTime() >= startT);
  if (recent.length < 2) return null;

  const points = planPoints(goals, series, field);
  const planSamples = [];
  for (let t = startT; t <= endT; t += 3 * DAY_MS) {
    const v = planValueAt(points, t);
    if (v !== null) planSamples.push({ t, v });
  }

  const values = recent.map((p) => p.value).concat(planSamples.map((p) => p.v));
  const pad = 0.4;
  const min = Math.floor((Math.min(...values) - pad) * 2) / 2;
  const max = Math.ceil((Math.max(...values) + pad) * 2) / 2;
  const x = (t) => Math.round(((t - startT) / (endT - startT || 1)) * CHART_W);
  const y = (v) => Math.round(CHART_H - ((v - min) / (max - min || 1)) * CHART_H);
  const line = (pts) => pts.map((p) => `${x(p.t)},${y(p.v)}`).join(" ");

  const last = recent[recent.length - 1];
  return {
    actual: line(recent.map((p) => ({ t: parseDate(p.date).getTime(), v: p.value }))),
    plan: planSamples.length > 1 ? line(planSamples) : "",
    lastX: x(endT),
    lastY: y(last.value),
    min,
    max,
    from: shortDate(recent[0].date),
    to: shortDate(last.date),
  };
}

// The whole plan period, from the start to the goal date: the plan line through
// every milestone, the measurements so far, and where today falls, as SVG
// coordinates in a CHART_W x CHART_H box (y grows downward).
function buildPlanChart(series, goals, field) {
  const startIso = goals.goalPeriod?.startDate;
  const endIso = goals.ultimateGoal?.targetDate;
  if (!startIso || !endIso) return null;
  const startT = parseDate(startIso).getTime();
  const endT = parseDate(endIso).getTime();
  if (endT <= startT) return null;

  const points = planPoints(goals, series, field).filter((p) => p.t >= startT && p.t <= endT);
  if (points.length < 2) return null;
  const actual = series
    .filter((p) => typeof p.value === "number")
    .map((p) => ({ t: parseDate(p.date).getTime(), v: p.value }))
    .filter((p) => p.t >= startT && p.t <= endT);

  const values = points.map((p) => p.v).concat(actual.map((p) => p.v));
  const pad = field === "weightKg" ? 0.5 : 0.8;
  const min = Math.floor(Math.min(...values) - pad);
  const max = Math.ceil(Math.max(...values) + pad);
  const x = (t) => Math.round(((t - startT) / (endT - startT)) * CHART_W);
  const y = (v) => Math.round(CHART_H - ((v - min) / (max - min || 1)) * CHART_H);
  const line = (pts) => pts.map((p) => `${x(p.t)},${y(p.v)}`).join(" ");

  const todayT = Math.min(endT, Math.max(startT, todayUtc().getTime()));
  const last = actual[actual.length - 1];
  const milestones = points.slice(1, -1);
  return {
    plan: line(points),
    actual: actual.length > 1 ? line(actual) : "",
    lastX: last ? x(last.t) : null,
    lastY: last ? y(last.v) : null,
    todayX: x(todayT),
    milestones: milestones.map((p) => ({ x: x(p.t), y: y(p.v), v: round(p.v), d: shortDate(new Date(p.t).toISOString().slice(0, 10)) })),
    goal: round(points[points.length - 1].v),
    goalX: x(endT),
    goalY: y(points[points.length - 1].v),
    min,
    max,
    from: shortDate(startIso),
    to: shortDate(endIso),
  };
}

function trainingToday(plan) {
  if (!plan) return null;
  const now = new Date();
  const today = DAY_NAMES[now.getDay()];
  const entry = (plan.schedule || []).find((s) => s.day === today);
  const todayIso = now.toISOString().slice(0, 10);
  const cp = (plan.checkpoints || []).find((c) => c.date >= todayIso);
  return {
    title: plan.title || null,
    day: today,
    session: entry?.session || null,
    kcal: plan.nutrition?.kcal ? `${plan.nutrition.kcal.min}–${plan.nutrition.kcal.max}` : null,
    protein: plan.nutrition?.proteinG ? `${plan.nutrition.proteinG.min}–${plan.nutrition.proteinG.max}` : null,
    checkpoint: cp
      ? {
          name: cp.name,
          date: shortDate(cp.date),
          daysLeft: Math.round((parseDate(cp.date) - todayUtc()) / DAY_MS),
          items: (cp.items || []).filter((i) => !i.done).slice(0, 4).map((i) => i.text.slice(0, 60)),
        }
      : null,
  };
}

export function buildTrmnlPayload({ measurements, goals, plan, user }) {
  const weight = measurements.weight || [];
  const bodyFat = measurements.bodyFat || [];
  const now = new Date();
  return {
    name: user?.name || null,
    updated: now.toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }),
    weight: metricSummary(weight, goals, "weightKg", "kg"),
    fat: metricSummary(bodyFat, goals, "bodyFatPct", "%"),
    chart: buildChart(weight, goals, "weightKg"),
    planChart: {
      weight: buildPlanChart(weight, goals, "weightKg"),
      fat: buildPlanChart(bodyFat, goals, "bodyFatPct"),
    },
    training: trainingToday(plan),
  };
}

export function trmnlConfig() {
  const url = process.env.TRMNL_WEBHOOK_URL || "";
  const minutes = Math.max(5, Number(process.env.TRMNL_PUSH_MINUTES) || 30);
  return { enabled: Boolean(url), url, minutes };
}

let lastSentKey = null;

// POST the payload to TRMNL. Skips when nothing but the timestamp changed,
// unless `force` is set.
export async function pushToTrmnl(payload, { force = false } = {}) {
  const { enabled, url } = trmnlConfig();
  if (!enabled) throw new Error("TRMNL_WEBHOOK_URL is not set");

  const { updated, ...rest } = payload;
  const key = JSON.stringify(rest);
  if (!force && key === lastSentKey) return { skipped: true };

  const body = JSON.stringify({ merge_variables: payload });
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`TRMNL responded ${response.status}: ${text.slice(0, 200)}`);
  }
  lastSentKey = key;
  return { skipped: false, bytes: Buffer.byteLength(body) };
}

export function startTrmnlPusher(loadPayload) {
  const { enabled, minutes } = trmnlConfig();
  if (!enabled) return;

  const tick = async () => {
    try {
      const result = await pushToTrmnl(await loadPayload());
      if (!result.skipped) console.log(`TRMNL: pushed ${result.bytes} bytes`);
    } catch (error) {
      console.warn("TRMNL push failed:", error.message);
    }
  };
  console.log(`TRMNL: pushing every ${minutes} min`);
  setTimeout(tick, 10 * 1000);
  setInterval(tick, minutes * 60 * 1000);
}
