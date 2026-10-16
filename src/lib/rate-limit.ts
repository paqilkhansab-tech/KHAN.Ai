import { db } from '@/lib/db';

/**
 * KHAN RATE LIMITER — two layers, serverless-safe.
 *
 * L1 (memory): in-memory sliding window, per instance. Zero latency; catches
 * floods that land on the same lambda instance. Resets on cold starts, so it
 * is only an approximation on serverless.
 *
 * L2 (database): fixed-window counter stored in the RateLimit table. This is
 * the source of truth — it survives cold starts and is SHARED across every
 * serverless instance, so brute-force attempts add up correctly no matter
 * which instance handles the request. One tiny upsert per request (indexed).
 *
 * If the database is briefly unreachable, L2 is skipped and L1 still applies
 * (availability over precision — auth routes need the DB anyway).
 */

type Bucket = { hits: number[]; };

const store = new Map<string, Bucket>();
let lastSweep = Date.now();

function sweepMemory(now: number, windowMs: number) {
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

function memoryLimit(key: string, limit: number, windowMs: number): RateResult {
  const now = Date.now();
  sweepMemory(now, windowMs);

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

/** L2 — fixed-window counter in Postgres, shared by all serverless instances. */
async function dbLimit(key: string, limit: number, windowMs: number): Promise<RateResult | null> {
  const now = Date.now();
  const winStart = new Date(Math.floor(now / windowMs) * windowMs);
  const winEnd = new Date(Math.floor(now / windowMs) * windowMs + windowMs);

  try {
    // opportunistic cleanup of long-expired rows (cheap, indexed, sampled)
    if (now - lastSweep > 120_000) {
      lastSweep = now; // shared with memory sweep — one sweep pass covers both
      db.rateLimit.deleteMany({ where: { expiresAt: { lt: new Date(now - 60_000) } } })
        .catch(() => undefined); // fire-and-forget; never blocks the request
    }

    // fresh window for this key? create it atomically (count = 1)
    const created = await db.rateLimit
      .create({ data: { key, count: 1, windowStart: winStart, expiresAt: winEnd } })
      .catch(() => null);
    if (created) return { ok: limit >= 1, retryAfter: 0, remaining: Math.max(0, limit - 1) };

    // row exists — reset it if it belongs to a previous window (race-safe:
    // only rows with an older windowStart are touched)
    await db.rateLimit.updateMany({
      where: { key, windowStart: { lt: winStart } },
      data: { count: 0, windowStart: winStart, expiresAt: winEnd },
    });

    // atomic increment inside the CURRENT window
    const bumped = await db.rateLimit.update({
      where: { key },
      data: { count: { increment: 1 } },
      select: { count: true, expiresAt: true },
    });

    if (bumped.count > limit) {
      const retryAfter = Math.max(1, Math.ceil((bumped.expiresAt.getTime() - now) / 1000));
      return { ok: false, retryAfter, remaining: 0 };
    }
    return { ok: true, retryAfter: 0, remaining: Math.max(0, limit - bumped.count) };
  } catch {
    return null; // DB unavailable — caller falls back to the memory layer
  }
}

/**
 * Consume one hit from the bucket. ASYNC — always await it.
 * @param key    unique key, e.g. `signin:1.2.3.4`
 * @param limit  max requests inside window
 * @param windowMs  window length in ms
 */
export async function rateLimit(key: string, limit: number, windowMs: number): Promise<RateResult> {
  const memory = memoryLimit(key, limit, windowMs);
  const shared = await dbLimit(key, limit, windowMs);

  // deny if EITHER layer says deny; otherwise report the tighter budget
  if (!memory.ok) return memory;
  if (shared) return shared;
  return memory;
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
