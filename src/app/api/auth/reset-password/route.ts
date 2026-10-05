import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { resetPasswordSchema, parse } from '@/lib/validation';
import { rateLimit, clientIp, tooMany } from '@/lib/rate-limit';

/**
 * FORGOT PASSWORD — STEP 2 of 2
 * Verifies the emailed 6-digit code and sets the new password.
 *
 * Security properties:
 * - Code is bcrypt-hashed at rest, single-use, 10-minute expiry
 * - Row locks out after 5 wrong attempts (anti brute-force per code)
 * - Rate limited: 8 attempts / 15 min / IP
 * - Generic errors — never reveal which factor (email / code) was wrong
 * - All other outstanding codes for the account are burned after success
 */
export async function POST(req: NextRequest) {
  const rl = rateLimit(`reset:${clientIp(req)}`, 8, 15 * 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter, 'Too many attempts. Please wait a few minutes and try again.');

  try {
    const parsed = parse(resetPasswordSchema, await req.json());
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const { email, otp, password } = parsed.data;

    const genericError = { error: 'Invalid or expired code. Request a new one and try again.' };

    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      await bcrypt.compare('timing-equalizer', '$2b$12$kETvLQQCCFpLiLm7faTPC.6qrAkAXp9nlu2gW7.7qTDiLUSqrS0l6');
      return NextResponse.json(genericError, { status: 400 });
    }

    const record = await db.passwordResetOTP.findFirst({
      where: { userId: user.id, used: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });

    if (!record || record.attempts >= 5) {
      if (record) await db.passwordResetOTP.update({ where: { id: record.id }, data: { used: true } });
      return NextResponse.json(genericError, { status: 400 });
    }

    const valid = await bcrypt.compare(otp, record.otpHash);
    if (!valid) {
      await db.passwordResetOTP.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
      return NextResponse.json(genericError, { status: 400 });
    }

    // code accepted — burn it, burn all other outstanding codes, set the new password
    await db.passwordResetOTP.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true },
    });
    await db.user.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(password, 12) },
    });

    return NextResponse.json({
      message: 'Password updated. Sign in with your new password — welcome back!',
    });
  } catch (err) {
    console.error('Reset password error:', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
