import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * KHAN deployment health check — SECRET-FREE for the public, full detail for
 * the allowlisted admin.
 *
 * Public response (no account data, no infrastructure info):
 *   { ok, database, code?, problem? }   — problem strings are generic
 *                                         guidance, never env/URL specifics.
 * Admin response (email listed in ADMIN_EMAILS) additionally receives the
 * masked DATABASE_URL and the user count for real debugging.
 *
 * Password inside DATABASE_URL is always masked, even for admins.
 */
const ERROR_MEANINGS: Record<string, string> = {
  P1001: "Database server unreachable — the DATABASE_URL host is wrong or the database was deleted. Re-copy the connection string from your database dashboard.",
  P1002: "Database hostname does not resolve — check for typos in the DATABASE_URL.",
  P2021: "Database tables are missing — set the Vercel Build Command to: prisma generate && prisma db push --skip-generate && next build — then redeploy.",
  P2022: "A column is missing (schema drift) — redeploy with prisma db push in the Build Command.",
  P1012: "DATABASE_URL is invalid for PostgreSQL (e.g. it still points to a file: URL). Paste the postgresql:// connection string.",
};

function adminAllowlist(): string[] {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function GET() {
  const url = process.env.DATABASE_URL || '';
  const me = await getCurrentUser();
  const isAdmin = Boolean(me && adminAllowlist().includes(me.email.toLowerCase()));

  if (!url) {
    return NextResponse.json(
      {
        ok: false,
        database: 'NOT_CONFIGURED',
        problem: 'DATABASE_URL environment variable is not set.',
        ...(isAdmin && { fix: 'Hosting platform → Settings → Environment Variables → add DATABASE_URL → Redeploy.' }),
      },
      { status: 500 }
    );
  }

  const maskedUrl = url.replace(/(\/\/[^:/@]+:)[^@]+@/, '$1***@');

  try {
    await db.$queryRaw`SELECT 1`;
    // user count only for the admin — never expose tenant numbers publicly
    const users = isAdmin ? await db.user.count() : undefined;
    return NextResponse.json({
      ok: true,
      database: 'CONNECTED',
      ...(isAdmin && { url: maskedUrl, users, message: 'Database is fully working. If signup still fails, check the deployment logs.' }),
    });
  } catch (e) {
    const code = (e as { code?: string })?.code || 'UNKNOWN';
    const raw = (e as Error)?.message?.slice(0, 220) || 'unknown error';
    return NextResponse.json(
      {
        ok: false,
        database: 'ERROR',
        code,
        // public: only the generic, pre-written meaning — never the raw error
        // (raw Prisma messages can embed connection/hostname details)
        problem: ERROR_MEANINGS[code] || 'Database error — check the deployment logs for details.',
        ...(isAdmin && { url: maskedUrl, detail: raw }),
      },
      { status: 500 }
    );
  }
}
