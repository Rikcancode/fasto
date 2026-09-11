import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const PLANS_PATH = path.join(__dirname, "..", "data", "plans.json");

export const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

// Starter template. Shown until the user edits the plans in the app.
export const DEFAULT_PLANS = {
  exercisePlan: {
    notes:
      "Starter template: 3 strength days, 2 cardio days, 1 active recovery day. Add load when you reach the top of a rep range. Aim for 8,000+ steps every day.",
    days: [
      {
        day: "Monday",
        focus: "Lower body strength",
        exercises: [
          { name: "Goblet squat", sets: 3, reps: "10-12", notes: "" },
          { name: "Romanian deadlift", sets: 3, reps: "10", notes: "Dumbbells or barbell" },
          { name: "Walking lunges", sets: 3, reps: "10 per leg", notes: "" },
          { name: "Plank", sets: 3, reps: "40 s", notes: "" },
        ],
      },
      {
        day: "Tuesday",
        focus: "Zone 2 cardio",
        exercises: [
          { name: "Brisk walk, cycle or swim", sets: 1, reps: "40 min", notes: "Conversational pace" },
        ],
      },
      {
        day: "Wednesday",
        focus: "Upper body strength",
        exercises: [
          { name: "Push-ups or dumbbell bench press", sets: 3, reps: "8-12", notes: "" },
          { name: "One-arm dumbbell row", sets: 3, reps: "10 per side", notes: "" },
          { name: "Overhead press", sets: 3, reps: "8-10", notes: "" },
          { name: "Dead bug", sets: 3, reps: "10 per side", notes: "" },
        ],
      },
      {
        day: "Thursday",
        focus: "Active recovery",
        exercises: [
          { name: "Easy walk", sets: 1, reps: "30-45 min", notes: "" },
          { name: "Mobility routine", sets: 1, reps: "10 min", notes: "Hips, shoulders, thoracic spine" },
        ],
      },
      {
        day: "Friday",
        focus: "Full body strength",
        exercises: [
          { name: "Deadlift or trap bar deadlift", sets: 3, reps: "6-8", notes: "" },
          { name: "Incline dumbbell press", sets: 3, reps: "10", notes: "" },
          { name: "Lat pulldown or pull-ups", sets: 3, reps: "8-10", notes: "" },
          { name: "Farmer's carry", sets: 3, reps: "30 m", notes: "Heavy" },
        ],
      },
      {
        day: "Saturday",
        focus: "Cardio intervals",
        exercises: [
          { name: "Warm-up", sets: 1, reps: "5 min", notes: "" },
          { name: "Intervals", sets: 8, reps: "1 min hard / 2 min easy", notes: "Bike, rower or run" },
          { name: "Cool-down", sets: 1, reps: "5 min", notes: "" },
        ],
      },
      {
        day: "Sunday",
        focus: "Rest",
        exercises: [],
      },
    ],
  },
  dietPlan: {
    caloriesKcal: 1900,
    proteinG: 160,
    carbsG: 170,
    fatG: 60,
    notes:
      "Starter template for a moderate deficit with high protein. Adjust portions if the 7-day average stops moving for two weeks.",
    meals: [
      {
        name: "Breakfast",
        time: "07:30",
        items: ["250 g Greek yogurt (0-2% fat)", "30 g oats", "Handful of berries", "Coffee or tea, no sugar"],
      },
      {
        name: "Lunch",
        time: "12:30",
        items: ["150 g chicken, fish or lean beef", "150 g cooked rice or potatoes", "Large salad with 1 tbsp olive oil"],
      },
      {
        name: "Snack",
        time: "16:00",
        items: ["1 apple", "30 g nuts or a protein shake"],
      },
      {
        name: "Dinner",
        time: "19:30",
        items: ["150 g lean protein", "Plenty of vegetables", "100 g cooked pasta or 2 slices wholegrain bread"],
      },
    ],
    guidelines: [
      "Protein at every meal",
      "At least 2 L of water per day",
      "Alcohol: max 2 drinks per week",
      "Weigh in every morning after the bathroom, before breakfast",
      "One planned free meal per week, no free days",
    ],
  },
};

function asString(value, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function asNumber(value, fallback = 0) {
  const n = typeof value === "string" ? parseFloat(value) : value;
  return typeof n === "number" && Number.isFinite(n) ? n : fallback;
}

function asStringList(value) {
  if (!Array.isArray(value)) return [];
  return value.map((v) => asString(v)).filter((v) => v.length > 0);
}

// Coerce a client payload into a well-formed plans object. Throws on
// structural problems so the route can answer 400.
export function normalizePlans(input) {
  if (!input || typeof input !== "object") {
    throw new Error("Invalid plans payload");
  }
  const { exercisePlan, dietPlan } = input;
  if (!exercisePlan || !Array.isArray(exercisePlan.days)) {
    throw new Error("exercisePlan.days must be an array");
  }
  if (!dietPlan || !Array.isArray(dietPlan.meals)) {
    throw new Error("dietPlan.meals must be an array");
  }

  const days = exercisePlan.days.map((d) => {
    const day = asString(d?.day);
    if (!WEEKDAYS.includes(day)) {
      throw new Error(`Unknown day: ${day || "(empty)"}`);
    }
    const exercises = Array.isArray(d.exercises) ? d.exercises : [];
    return {
      day,
      focus: asString(d.focus),
      exercises: exercises
        .map((e) => ({
          name: asString(e?.name),
          sets: Math.max(0, Math.round(asNumber(e?.sets, 0))),
          reps: asString(e?.reps),
          notes: asString(e?.notes),
        }))
        .filter((e) => e.name.length > 0),
    };
  });
  days.sort((a, b) => WEEKDAYS.indexOf(a.day) - WEEKDAYS.indexOf(b.day));

  const meals = dietPlan.meals
    .map((m) => ({
      name: asString(m?.name),
      time: asString(m?.time),
      items: asStringList(m?.items),
    }))
    .filter((m) => m.name.length > 0);

  return {
    exercisePlan: {
      notes: asString(exercisePlan.notes),
      days,
    },
    dietPlan: {
      caloriesKcal: Math.max(0, Math.round(asNumber(dietPlan.caloriesKcal, 0))),
      proteinG: Math.max(0, Math.round(asNumber(dietPlan.proteinG, 0))),
      carbsG: Math.max(0, Math.round(asNumber(dietPlan.carbsG, 0))),
      fatG: Math.max(0, Math.round(asNumber(dietPlan.fatG, 0))),
      notes: asString(dietPlan.notes),
      meals,
      guidelines: asStringList(dietPlan.guidelines),
    },
  };
}

// The data folder is a mounted volume in production, so plans.json may not
// exist yet. Fall back to the starter template in that case.
export async function readPlans() {
  try {
    const raw = await fs.readFile(PLANS_PATH, "utf-8");
    return normalizePlans(JSON.parse(raw));
  } catch (error) {
    if (error.code === "ENOENT") {
      return structuredClone(DEFAULT_PLANS);
    }
    throw error;
  }
}

export async function writePlans(plans) {
  const normalized = normalizePlans(plans);
  await fs.writeFile(PLANS_PATH, JSON.stringify(normalized, null, 2), "utf-8");
  return normalized;
}
