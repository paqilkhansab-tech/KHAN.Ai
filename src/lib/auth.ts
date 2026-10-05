import { SignJWT, jwtVerify } from 'jose';
import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';

/**
 * KHAN session secret — MUST come from environment (AUTH_SECRET).
 * - production with AUTH_SECRET set: uses it (recommended, sessions survive restarts)
 * - production without it: generates an ephemeral cryptographically-random secret
 *   (fail-secure: tokens can never be forged; sessions reset on restart) + loud warning
 * - development: stable local fallback for DX
 */
function loadSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (secret && secret.length >= 32) return new TextEncoder().encode(secret);
  if (process.env.NODE_ENV === 'production') {
    console.warn(
      '[KHAN SECURITY] AUTH_SECRET is not set — using an ephemeral random secret. ' +
      'Sessions will not survive restarts. Set a 64+ char random value in your environment: ' +
      'openssl rand -base64 48'
    );
    return new TextEncoder().encode(randomBytes(48).toString('base64url'));
  }
  // dev-only fallback (never used in production builds)
  return new TextEncoder().encode('khan-dev-only-secret-do-not-use-in-production-0123456789');
}

const SECRET = loadSecret();
const COOKIE_NAME = 'khan_session';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export interface SessionPayload {
  userId: string;
  email: string;
}

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(SECRET);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: MAX_AGE,
    path: '/',
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, SECRET);
    return { userId: payload.userId as string, email: payload.email as string };
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      createdAt: true,
      lastLoginAt: true,
      lastSeenAt: true,
    },
  });
  return user;
}
