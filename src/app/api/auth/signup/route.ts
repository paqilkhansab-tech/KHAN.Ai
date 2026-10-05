import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { createSession } from '@/lib/auth';
import { signupSchema, parse } from '@/lib/validation';
import { rateLimit, clientIp, tooMany } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  // abuse protection: 8 signups / hour / IP
  const rl = rateLimit(`signup:${clientIp(req)}`, 8, 60 * 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter, 'Too many accounts created from this network. Try again later.');

  try {
    const parsed = parse(signupSchema, await req.json());
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const { name, email, password, phone } = parsed.data;

    // Check if user already exists
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists. Please sign in.' }, { status: 409 });
    }

    // Hash password securely and create user — stored permanently in database
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await db.user.create({
      data: {
        name,
        email,
        phone: phone || null,
        passwordHash,
        lastLoginAt: new Date(),
      },
    });

    await createSession({ userId: user.id, email: user.email });

    return NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, phone: user.phone, createdAt: user.createdAt },
      message: 'Account created successfully.',
    });
  } catch (err) {
    console.error('Signup error:', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
