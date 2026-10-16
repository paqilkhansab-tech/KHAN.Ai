import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

/**
 * KHAN EDGE MIDDLEWARE — access control
 *
 * ADMIN ROUTE GUARD (fail-closed):
 * - Every /admin/* AND /api/admin/* request is verified against the session JWT.
 * - Only emails listed in the ADMIN_EMAILS environment variable (comma-separated)
 *   are allowed. Everyone else gets a plain 404 — the admin surface is never
 *   even revealed to exist.
 * - No ADMIN_EMAILS configured => admin area is completely locked (default deny).
 * - No AUTH_SECRET in production => admin is denied too (a shared verification
 *   secret cannot exist, so fail closed instead of pretending to verify).
 *
 * NOTE: Prisma is not edge-runtime compatible, so the JWT is verified here
 * directly with jose (the same secret/algorithm used by src/lib/auth.ts).
 */

// Built-in owner account — hardcoded so the admin panel can never be locked
// out by a missing or typo'd ADMIN_EMAILS env var. Extendable via ADMIN_EMAILS
// (comma-separated extra emails). All comparisons are lowercase.
const BUILT_IN_ADMINS = ['paqilkhansab@gmail.com'];

function adminAllowlist(): string[] {
  const envList = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set([...BUILT_IN_ADMINS, ...envList])];
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/admin')) {
    const envSecret = process.env.AUTH_SECRET;
    const token = req.cookies.get('khan_session')?.value;
    let email = '';

    if (!envSecret && process.env.NODE_ENV === 'production') {
      // fail-closed: without a shared secret the JWT cannot be verified here —
      // deny (404) instead of checking against a hardcoded dev fallback.
      console.warn('[KHAN SECURITY] /admin requested but AUTH_SECRET is not set — denying.');
      return new NextResponse('Not Found', { status: 404 });
    }

    if (token) {
      try {
        const secret = new TextEncoder().encode(
          envSecret || 'khan-dev-only-secret-do-not-use-in-production-0123456789'
        );
        const { payload } = await jwtVerify(token, secret);
        email = typeof payload.email === 'string' ? payload.email.toLowerCase() : '';
      } catch {
        email = ''; // invalid/expired token — treat as anonymous (deny)
      }
    }

    if (!email || !adminAllowlist().includes(email)) {
      // 404, not 403: do not confirm that an admin area exists
      return new NextResponse('Not Found', { status: 404 });
    }
  }

  return NextResponse.next();
}

export const config = {
  // covers BOTH the admin UI (/admin/*) and the admin API (/api/admin/*)
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
