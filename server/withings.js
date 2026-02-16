import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TOKEN_PATH = path.join(__dirname, "..", "data", "withings_token.json");
const CACHE_TTL_MS = 5 * 60 * 1000;

let measurementCache = {
  fetchedAt: 0,
  data: null,
};

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env var: ${name}`);
  }
  return value;
}

async function readTokenFile() {
  try {
    const raw = await fs.readFile(TOKEN_PATH, "utf-8");
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function writeTokenFile(token) {
  await fs.mkdir(path.dirname(TOKEN_PATH), { recursive: true });
  await fs.writeFile(TOKEN_PATH, JSON.stringify(token, null, 2), "utf-8");
}

function buildAuthUrl() {
  const clientId = requireEnv("WITHINGS_CLIENT_ID");
  const redirectUri = requireEnv("WITHINGS_REDIRECT_URI");
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "user.metrics",
    state: "withings-dashboard",
  });
  return `https://account.withings.com/oauth2_user/authorize2?${params.toString()}`;
}

async function exchangeCodeForToken(code) {
  const payload = new URLSearchParams({
    action: "requesttoken",
    grant_type: "authorization_code",
    client_id: requireEnv("WITHINGS_CLIENT_ID"),
    client_secret: requireEnv("WITHINGS_CLIENT_SECRET"),
    redirect_uri: requireEnv("WITHINGS_REDIRECT_URI"),
    code,
  });

  const response = await fetch("https://wbsapi.withings.net/v2/oauth2", {
    method: "POST",
    body: payload,
  });

  const json = await response.json();
  if (json.status !== 0) {
    throw new Error(`Withings token error: ${JSON.stringify(json)}`);
  }

  const token = {
    ...json.body,
    expires_at: Date.now() + json.body.expires_in * 1000,
  };
  await writeTokenFile(token);
  return token;
}

async function refreshToken(refreshTokenValue) {
  const payload = new URLSearchParams({
    action: "requesttoken",
    grant_type: "refresh_token",
    client_id: requireEnv("WITHINGS_CLIENT_ID"),
    client_secret: requireEnv("WITHINGS_CLIENT_SECRET"),
    refresh_token: refreshTokenValue,
  });

  const response = await fetch("https://wbsapi.withings.net/v2/oauth2", {
    method: "POST",
    body: payload,
  });

  const json = await response.json();
  if (json.status !== 0) {
    throw new Error(`Withings refresh error: ${JSON.stringify(json)}`);
  }

  const token = {
    ...json.body,
    expires_at: Date.now() + json.body.expires_in * 1000,
  };
  await writeTokenFile(token);
  return token;
}

async function getAccessToken() {
  const token = await readTokenFile();
  if (!token) {
    throw new Error("No Withings token. Authorize first.");
  }

  if (token.expires_at && Date.now() < token.expires_at - 30_000) {
    return token.access_token;
  }

  const refreshed = await refreshToken(token.refresh_token);
  return refreshed.access_token;
}

function normalizeValue(value, unit) {
  return value * Math.pow(10, unit);
}

function normalizeFatPercent(value) {
  if (value <= 1) {
    return value * 100;
  }
  return value;
}

async function fetchMeasureSeries(accessToken, meastype) {
  const params = new URLSearchParams({
    action: "getmeas",
    access_token: accessToken,
    meastype: String(meastype),
    category: "1",
  });

  const response = await fetch(`https://wbsapi.withings.net/measure?${params.toString()}`);
  const json = await response.json();
  if (json.status !== 0) {
    throw new Error(`Withings measure error: ${JSON.stringify(json)}`);
  }

  return json.body.measuregrps || [];
}

function groupSeries(measureGroups, type) {
  const points = [];
  for (const group of measureGroups) {
    if (!group.measures) continue;
    for (const measure of group.measures) {
      if (measure.type !== type) continue;
      const raw = normalizeValue(measure.value, measure.unit);
      const value = type === 6 ? normalizeFatPercent(raw) : raw;
      const date = new Date(group.date * 1000).toISOString().slice(0, 10);
      points.push({ date, value });
    }
  }
  return points.sort((a, b) => a.date.localeCompare(b.date));
}

async function fetchMeasurements() {
  if (measurementCache.data && Date.now() - measurementCache.fetchedAt < CACHE_TTL_MS) {
    return measurementCache.data;
  }

  const accessToken = await getAccessToken();
  const [weightGroups, fatGroups] = await Promise.all([
    fetchMeasureSeries(accessToken, 1),
    fetchMeasureSeries(accessToken, 6),
  ]);

  const data = {
    weight: groupSeries(weightGroups, 1),
    bodyFat: groupSeries(fatGroups, 6),
    fetchedAt: new Date().toISOString(),
  };

  measurementCache = { fetchedAt: Date.now(), data };
  return data;
}

async function fetchUserInfo() {
  try {
    const accessToken = await getAccessToken();
    // Try getuserslist endpoint (more commonly available)
    const params = new URLSearchParams({
      action: "getuserslist",
      access_token: accessToken,
    });

    const response = await fetch(`https://wbsapi.withings.net/user?${params.toString()}`);
    const json = await response.json();
    
    if (json.status !== 0) {
      // If getuserslist fails, try getdeviceinfo which might have user info
      // Or return null to gracefully handle missing user info
      console.warn("Withings user info not available:", json);
      return null;
    }

    return json.body.users?.[0] || null;
  } catch (error) {
    // Gracefully handle errors - user info is optional
    console.warn("Failed to fetch user info:", error);
    return null;
  }
}

export {
  buildAuthUrl,
  exchangeCodeForToken,
  fetchMeasurements,
  fetchUserInfo,
};
