import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { createSession } from '@/lib/auth';
import { signinSchema, parse } from '@/lib/validation';
import { rateLimit, clientIp, tooMany } from '@/lib/rate-limit';

// valid-format hash used only to equalize response timing for unknown emails
const DUMMY_HASH = '$2b$12$kETvLQQCCFpLiLm7faTPC.6qrAkAXp9nlu2gW7.7qTDiLUSqrS0l6';

export async function POST(req: NextRequest) {
  // brute-force protection: 10 attempts / 5 min / IP
  const rl = rateLimit(`signin:${clientIp(req)}`, 10, 5 * 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter, 'Too many sign-in attempts. Wait a few minutes and try again.');

  try {
    const body = await req.json();
    const parsed = parse(signinSchema, body);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const { email, password } = parsed.data;

    const user = await db.user.findUnique({ where: { email } });
    // generic error — never reveal whether the account exists
    const genericError = { error: 'Invalid email or password. Try again.' };
    if (!user) {
      // burn comparable bcrypt time to resist timing-based user enumeration
      await bcrypt.compare(password, DUMMY_HASH);
      return NextResponse.json(genericError, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(genericError, { status: 401 });
    }

    await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await createSession({ userId: user.id, email: user.email });

    return NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, phone: user.phone, createdAt: user.createdAt, lastLoginAt: user.lastLoginAt },
      message: 'Welcome back, ' + user.name + '!',
    });
  } catch (err) {
    console.error('Signin error:', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
