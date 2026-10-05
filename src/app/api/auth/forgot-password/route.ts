import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { randomInt } from 'crypto';
import { db } from '@/lib/db';
import { sendOTPEmail, mailerConfigured } from '@/lib/mailer';
import { forgotPasswordSchema, parse } from '@/lib/validation';
import { rateLimit, clientIp, tooMany } from '@/lib/rate-limit';

/**
 * FORGOT PASSWORD — STEP 1 of 2
 * Generates a 6-digit one-time code, stores its bcrypt hash (10 min expiry,
 * single use, max 5 wrong attempts) and emails it to the account owner.
 *
 * Security properties:
 * - Always the same generic response — never reveals whether the email exists
 * - Rate limited: 3 requests / 15 min / IP  and  3 / 15 min / email account
 * - Any previous unused codes for the account are invalidated
 * - Requires SMTP configured (the code must reach the customer's inbox);
 *   returns 503 "email unavailable" otherwise — still no account disclosure
 */
export async function POST(req: NextRequest) {
  const ipRl = rateLimit(`forgot:${clientIp(req)}`, 3, 15 * 60_000);
  if (!ipRl.ok) return tooMany(ipRl.retryAfter, 'Too many reset requests. Please wait a few minutes.');

  try {
    const parsed = parse(forgotPasswordSchema, await req.json());
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const { email } = parsed.data;

    const GENERIC_OK = {
      message: 'If that email has a KHAN account, a 6-digit reset code is on its way. Check your inbox and spam folder.',
    };

    if (!mailerConfigured()) {
      console.error('[forgot-password] SMTP not configured — cannot deliver OTP.');
      return NextResponse.json(
        { error: 'Email service is temporarily unavailable. Please try again shortly or contact support.' },
        { status: 503 }
      );
    }

    // email-account-level throttle (needs the user; unknown emails skip it,
    // so probing stays slow + generic)
    const user = await db.user.findUnique({ where: { email } });

    if (!user) {
      // burn comparable bcrypt time to resist timing-based enumeration
      await bcrypt.compare('timing-equalizer', '$2b$12$kETvLQQCCFpLiLm7faTPC.6qrAkAXp9nlu2gW7.7qTDiLUSqrS0l6');
      return NextResponse.json(GENERIC_OK);
    }

    const mailRl = rateLimit(`forgot-mail:${user.id}`, 3, 15 * 60_000);
    if (!mailRl.ok) return NextResponse.json(GENERIC_OK); // same generic answer

    // 6-digit cryptographically random code
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');

    // invalidate previous unused codes, then store the new hashed one
    await db.passwordResetOTP.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true },
    });
    await db.passwordResetOTP.create({
      data: {
        userId: user.id,
        email,
        otpHash: await bcrypt.hash(code, 10), // short-lived single-use code; passwords use cost 12
        expiresAt: new Date(Date.now() + 10 * 60_000),
      },
    });

    const sent = await sendOTPEmail(email, user.name, code);
    if (!sent) {
      console.error('[forgot-password] OTP email send failed for a reset request.');
      return NextResponse.json(
        { error: 'Email service is temporarily unavailable. Please try again shortly or contact support.' },
        { status: 503 }
      );
    }

    return NextResponse.json(GENERIC_OK);
  } catch (err) {
    console.error('Forgot password error:', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
