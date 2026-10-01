import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { createSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Please enter your email and password.' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await db.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      return NextResponse.json({ error: 'No account found with this email. Create one — it takes 20 seconds.' }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: 'Wrong password. Try again.' }, { status: 401 });
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
