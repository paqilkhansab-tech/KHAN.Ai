import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

/**
 * KHAN EDGE MIDDLEWARE — access control
 *
 * ADMIN ROUTE GUARD (fail-closed):
 * - Every /admin/* request is verified against the session JWT.
 * - Only emails listed in the ADMIN_EMAILS environment variable (comma-separated)
 *   are allowed. Everyone else gets a plain 404 — the admin surface is never
 *   even revealed to exist.
 * - No ADMIN_EMAILS configured => admin area is completely locked (default deny).
 *
 * NOTE: Prisma is not edge-runtime compatible, so the JWT is verified here
 * directly with jose (the same secret/algorithm used by src/lib/auth.ts).
 */

function adminAllowlist(): string[] {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/admin')) {
    const token = req.cookies.get('khan_session')?.value;
    let email = '';

    if (token) {
      try {
        const secret = new TextEncoder().encode(
          process.env.AUTH_SECRET || 'khan-dev-only-secret-do-not-use-in-production-0123456789'
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
  matcher: ['/admin/:path*'],
};
