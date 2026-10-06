import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * KHAN deployment health check — public, minimal, secret-free.
 * Returns exactly WHY the database is not working (missing env var,
 * unreachable host, missing tables, schema drift) or confirms it is OK.
 * Password inside DATABASE_URL is always masked.
 */
const ERROR_MEANINGS: Record<string, string> = {
  P1001: "Database server unreachable — the Neon hostname in DATABASE_URL is wrong or the project was deleted. Copy the connection string again from the Neon dashboard.",
  P1002: "Database hostname does not resolve — check for typos in the Neon URL.",
  P2021: "Database tables are missing — set the Vercel Build Command to: prisma generate && prisma db push --skip-generate && next build — then redeploy.",
  P2022: "A column is missing (schema drift) — redeploy with prisma db push in the Build Command.",
  P1012: "DATABASE_URL is invalid for PostgreSQL (e.g. it still points to a file: URL). Paste the Neon postgresql:// string.",
};

export async function GET() {
  const url = process.env.DATABASE_URL || '';

  if (!url) {
    return NextResponse.json(
      {
        ok: false,
        database: 'NOT_CONFIGURED',
        problem: 'DATABASE_URL environment variable is not set.',
        fix: 'Vercel → Settings → Environment Variables → add DATABASE_URL with the Neon postgresql:// connection string → Redeploy.',
      },
      { status: 500 }
    );
  }

  const maskedUrl = url.replace(/(\/\/[^:/@]+:)[^@]+@/, '$1***@');

  try {
    await db.$queryRaw`SELECT 1`;
    const users = await db.user.count();
    return NextResponse.json({
      ok: true,
      database: 'CONNECTED',
      url: maskedUrl,
      users,
      message: 'Database is fully working. If signup still fails, check the deployment logs.',
    });
  } catch (e) {
    const code = (e as { code?: string })?.code || 'UNKNOWN';
    const raw = (e as Error)?.message?.slice(0, 220) || 'unknown error';
    return NextResponse.json(
      {
        ok: false,
        database: 'ERROR',
        code,
        problem: ERROR_MEANINGS[code] || raw,
        url: maskedUrl,
      },
      { status: 500 }
    );
  }
}
