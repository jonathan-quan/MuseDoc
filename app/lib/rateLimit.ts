// Lightweight in-memory fixed-window rate limiter.
//
// This complements the daily AI *spend* cap (app/lib/usage.ts): the spend cap
// stops a user spending more than their daily credit, but does nothing about a
// burst of rapid requests (or abuse of the unauthenticated auth endpoints). This
// caps request *rate* per key (per user or per IP).
//
// ⚠️ State lives in process memory, so in a multi-instance / serverless
// deployment each instance keeps its own counters and the effective limit is
// (limit × instances). For a hard global limit, back this with Redis/Upstash.
// As a first line of defense against bursts and accidental loops, per-instance
// is a meaningful improvement over nothing.

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Opportunistic sweep so the map can't grow without bound from one-off keys.
function sweep(now: number) {
  if (buckets.size < 5000) return;
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) buckets.delete(key);
  }
}

export type RateLimitResult = {
  ok: boolean;
  /** Seconds until the window resets (for a Retry-After header). */
  retryAfter: number;
};

/**
 * Record one hit against `key` and report whether it's within `limit` hits per
 * `windowMs`. The first hit in a window starts the clock; the window does not
 * slide.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }

  if (bucket.count >= limit) {
    return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { ok: true, retryAfter: 0 };
}

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for). */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

/** Standard 429 response with a Retry-After header. */
export function tooManyRequests(retryAfter: number, message: string): Response {
  return Response.json(
    { error: message },
    { status: 429, headers: { "Retry-After": String(Math.max(1, retryAfter)) } }
  );
}

// Test-only: reset internal state between unit-test cases.
export function __resetRateLimitForTests() {
  buckets.clear();
}
