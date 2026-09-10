import { timingSafeEqual } from "node:crypto";

/**
 * HTTP Basic Auth for the whole app (UI + API).
 *
 * Configure with FASTO_PASSWORD (required to enable) and FASTO_USER
 * (defaults to "fasto"). When FASTO_PASSWORD is unset the app stays open
 * and logs a warning on startup, so existing installs keep working.
 *
 * Exempt paths: the Withings OAuth callback (the browser is redirected
 * there by Withings) and /healthz (Docker health checks).
 */

const EXEMPT_PATHS = new Set(["/api/withings/callback", "/healthz"]);
const REALM = "Fasto";

// Failed-attempt throttle: after MAX_FAILURES wrong passwords from one IP
// inside WINDOW_MS, reject with 429 until the window has passed.
const MAX_FAILURES = 10;
const WINDOW_MS = 15 * 60 * 1000;
const failures = new Map(); // ip -> { count, first }

function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) {
    // Still do a comparison so timing doesn't reveal the length.
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

function clientIp(req) {
  return req.ip || req.socket?.remoteAddress || "unknown";
}

function isThrottled(ip) {
  const entry = failures.get(ip);
  if (!entry) return false;
  if (Date.now() - entry.first > WINDOW_MS) {
    failures.delete(ip);
    return false;
  }
  return entry.count >= MAX_FAILURES;
}

function recordFailure(ip) {
  const now = Date.now();
  const entry = failures.get(ip);
  if (!entry || now - entry.first > WINDOW_MS) {
    failures.set(ip, { count: 1, first: now });
  } else {
    entry.count += 1;
  }
}

function parseBasic(header) {
  if (!header || !header.startsWith("Basic ")) return null;
  const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
  const idx = decoded.indexOf(":");
  if (idx === -1) return null;
  return { user: decoded.slice(0, idx), pass: decoded.slice(idx + 1) };
}

function challenge(res, status = 401, message = "Authentication required") {
  res.set("WWW-Authenticate", `Basic realm="${REALM}", charset="UTF-8"`);
  res.status(status).json({ error: message });
}

export function authConfig() {
  const password = process.env.FASTO_PASSWORD;
  const user = process.env.FASTO_USER || "fasto";
  return { enabled: Boolean(password), user, password };
}

export function basicAuth() {
  const { enabled, user, password } = authConfig();

  if (!enabled) {
    console.warn(
      "WARNING: FASTO_PASSWORD is not set - the dashboard and API are open to anyone who can reach this port."
    );
    return (req, res, next) => next();
  }

  return (req, res, next) => {
    if (EXEMPT_PATHS.has(req.path)) return next();

    const ip = clientIp(req);
    if (isThrottled(ip)) {
      res.set("Retry-After", String(Math.ceil(WINDOW_MS / 1000)));
      res.status(429).json({ error: "Too many failed login attempts. Try again later." });
      return;
    }

    const creds = parseBasic(req.headers.authorization);
    if (!creds) return challenge(res);

    const userOk = safeEqual(creds.user, user);
    const passOk = safeEqual(creds.pass, password);
    if (!(userOk && passOk)) {
      recordFailure(ip);
      console.warn(`Failed login from ${ip}`);
      return challenge(res, 401, "Invalid credentials");
    }

    failures.delete(ip);
    next();
  };
}
