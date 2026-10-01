import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { sendSupportEmail, mailerConfigured } from '@/lib/mailer';

export async function POST(req: NextRequest) {
  try {
    const { name, email, subject, message } = await req.json();
    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return NextResponse.json({ error: 'Please fill your name, email and message.' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'That email address does not look valid.' }, { status: 400 });
    }
    const user = await getCurrentUser();
    const ticket = await db.supportTicket.create({
      data: {
        name: name.trim(),
        email: email.trim(),
        subject: subject?.trim() || 'General question',
        message: message.trim(),
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
