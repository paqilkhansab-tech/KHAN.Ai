/**
 * KHAN RATE LIMITER — in-memory sliding window (per IP + route bucket).
 * Protects auth (brute force), AI endpoints (cost abuse) and support (spam).
 * For single-instance deployment (SQLite architecture). Zero external deps.
 */

type Bucket = { hits: number[]; };

const store = new Map<string, Bucket>();
let lastSweep = Date.now();

function sweep(now: number, windowMs: number) {
  // periodic sweep to keep memory bounded (every ~2 min)
  if (now - lastSweep < 120_000) return;
  lastSweep = now;
  for (const [key, bucket] of store) {
    bucket.hits = bucket.hits.filter(t => now - t < windowMs);
    if (bucket.hits.length === 0) store.delete(key);
  }
}

export interface RateResult {
  ok: boolean;
  retryAfter: number; // seconds
  remaining: number;
}

/**
 * Consume one hit from the bucket.
 * @param key    unique key, e.g. `signin:1.2.3.4`
 * @param limit  max requests inside window
 * @param windowMs  window length in ms
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateResult {
  const now = Date.now();
  sweep(now, windowMs);

  const bucket = store.get(key) ?? { hits: [] };
  bucket.hits = bucket.hits.filter(t => now - t < windowMs);

  if (bucket.hits.length >= limit) {
    const oldest = bucket.hits[0];
    const retryAfter = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000));
    store.set(key, bucket);
    return { ok: false, retryAfter, remaining: 0 };
  }

  bucket.hits.push(now);
  store.set(key, bucket);
  return { ok: true, retryAfter: 0, remaining: limit - bucket.hits.length };
}

/** Best-effort client IP behind proxies / localhost. */
export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim().slice(0, 45);
  return req.headers.get('x-real-ip')?.slice(0, 45) || 'local';
}

/** Standard 429 JSON response with Retry-After. */
export function tooMany(retryAfter: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 429,
    headers: { 'Content-Type': 'application/json', 'Retry-After': String(retryAfter) },
  });
}
