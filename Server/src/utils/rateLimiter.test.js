import assert from "node:assert/strict";
import test from "node:test";

const createTestRateLimiter = ({ name = "test", windowMs, max, message }) => {
  const buckets = new Map();
  return {
    middleware: (req, res, next) => {
      const now = Date.now();
      const identity = req.ip || "unknown";
      const cleanPath = (req.baseUrl + req.path).replace(/^\/api\b/, "").replace(/\/+$/, "") || "/";
      const key = `${name}:${identity}:${req.method}:${cleanPath}`;
      const current = buckets.get(key);

      if (!current || current.resetAt <= now) {
        buckets.set(key, { count: 1, resetAt: now + windowMs });
        return next();
      }

      current.count += 1;

      if (current.count > max) {
        const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
        res.status = 429;
        res.retryAfter = retryAfterSeconds;
        res.body = { success: false, message };
        return;
      }

      return next();
    },
    buckets,
  };
};

test("rate limiters with distinct names do not collide or double count", () => {
  const general = createTestRateLimiter({ name: "general", windowMs: 60000, max: 100, message: "General" });
  const sensitive = createTestRateLimiter({ name: "sensitive", windowMs: 60000, max: 3, message: "Sensitive" });

  const req = { ip: "127.0.0.1", method: "POST", baseUrl: "/api/pan", path: "/verify" };

  for (let i = 1; i <= 3; i++) {
    const res = {};
    general.middleware(req, res, () => {});
    sensitive.middleware(req, res, () => {});
    assert.equal(res.status, undefined, `Request ${i} should be allowed`);
  }

  // 4th request exceeds max: 3 on sensitive limiter
  const resBlocked = {};
  general.middleware(req, resBlocked, () => {});
  sensitive.middleware(req, resBlocked, () => {});

  assert.equal(resBlocked.status, 429);
  assert.equal(resBlocked.body?.success, false);
  assert.equal(resBlocked.body?.message, "Sensitive");
});

test("per-application PAN verification attempt tracking blocks after 3 attempts", () => {
  const panAttempts = new Map();
  const MAX_ATTEMPTS = 3;
  const WINDOW_MS = 60000;

  const verifyPanAttempt = (appId) => {
    const now = Date.now();
    const key = `app:${appId}`;
    const entry = panAttempts.get(key);

    if (entry && entry.resetAt > now && entry.count >= MAX_ATTEMPTS) {
      return { allowed: false, status: 429 };
    }

    if (!entry || entry.resetAt <= now) {
      panAttempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    } else {
      entry.count += 1;
    }

    return { allowed: true, count: panAttempts.get(key).count };
  };

  assert.equal(verifyPanAttempt("APP-123").allowed, true);
  assert.equal(verifyPanAttempt("APP-123").allowed, true);
  assert.equal(verifyPanAttempt("APP-123").allowed, true);
  // 4th attempt should be blocked
  const fourth = verifyPanAttempt("APP-123");
  assert.equal(fourth.allowed, false);
  assert.equal(fourth.status, 429);

  // Different application ID has its own separate quota
  assert.equal(verifyPanAttempt("APP-456").allowed, true);
});
