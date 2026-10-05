import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { sendSupportEmail, mailerConfigured } from '@/lib/mailer';
import { supportSchema, parse } from '@/lib/validation';
import { rateLimit, clientIp, tooMany } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  // spam protection: 5 tickets / 10 min / IP
  const rl = rateLimit(`support:${clientIp(req)}`, 5, 10 * 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter, 'Too many messages sent. Please wait a few minutes.');

  try {
    const parsed = parse(supportSchema, await req.json());
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const { name, email, subject, message } = parsed.data;

    const user = await getCurrentUser();
    const ticket = await db.supportTicket.create({
      data: {
        name,
        email,
        subject: subject || 'General question',
        message,
        userId: user?.id || null,
      },
    });

    // Deliver the ticket straight to the owner's inbox (paqilkhansab@gmail.com)
    const emailed = await sendSupportEmail({
      id: ticket.id,
      name: ticket.name,
      email: ticket.email,
      subject: ticket.subject,
      message: ticket.message,
      memberEmail: user?.email || null,
    });

    return NextResponse.json({
      ticketId: ticket.id,
      emailed,
      emailConfigured: mailerConfigured(),
      message: 'Message received! Our team replies within 24 hours — usually much faster.',
    });
  } catch (err) {
    console.error('Support error:', err);
    return NextResponse.json({ error: 'Could not send. Please email us directly.' }, { status: 500 });
  }
}
