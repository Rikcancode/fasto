import "dotenv/config";
import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildAuthUrl,
  exchangeCodeForToken,
  fetchMeasurements,
} from "./withings.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 80;
const GOALS_PATH = path.join(__dirname, "..", "data", "goals.json");

app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

async function readGoals() {
  const raw = await fs.readFile(GOALS_PATH, "utf-8");
  return JSON.parse(raw);
}

app.get("/api/withings/auth-url", (req, res) => {
  try {
    const url = buildAuthUrl();
    res.json({ url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/withings/callback", async (req, res) => {
  const { code } = req.query;
  if (!code) {
    res.status(400).send("Missing code query param.");
    return;
  }

  try {
    await exchangeCodeForToken(code);
    res.send("Withings connected. You can close this tab.");
  } catch (error) {
    res.status(500).send(`Auth failed: ${error.message}`);
  }
});

app.get("/api/goals", async (req, res) => {
  try {
    const goals = await readGoals();
    res.json(goals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/measurements", async (req, res) => {
  try {
    const measurements = await fetchMeasurements();
    res.json(measurements);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/goals", async (req, res) => {
  try {
    const goals = req.body;
    // Validate structure
    if (!goals.weeklyGoals || !Array.isArray(goals.weeklyGoals)) {
      res.status(400).json({ error: "Invalid goals structure" });
      return;
    }
    if (!goals.ultimateGoal) {
      res.status(400).json({ error: "Missing ultimateGoal" });
      return;
    }
    await fs.writeFile(GOALS_PATH, JSON.stringify(goals, null, 2), "utf-8");
    res.json({ success: true, goals });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/dashboard", async (req, res) => {
  try {
    const [goals, measurements] = await Promise.all([
      readGoals(),
      fetchMeasurements(),
    ]);
    res.json({
      measurements,
      weeklyGoals: goals.weeklyGoals,
      ultimateGoal: goals.ultimateGoal,
      goalPeriod: goals.goalPeriod || null,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const HOST = process.env.HOST || "0.0.0.0";
app.listen(PORT, HOST, () => {
  console.log(`Withings dashboard running on http://${HOST}:${PORT}`);
});
