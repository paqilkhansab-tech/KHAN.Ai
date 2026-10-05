import nodemailer from 'nodemailer';

/**
 * KHAN SUPPORT MAILER
 * Sends every support-ticket submission straight to the owner's inbox.
 *
 * Activation (add to .env):
 *   GMAIL_USER=paqilkhansab@gmail.com        (the sender = your address)
 *   GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx   (Google Account → Security → 2-Step Verification → App passwords)
 *
 * Until configured, tickets still save to the database — email just skips gracefully.
 */

const SUPPORT_INBOX = 'paqilkhansab@gmail.com'; // where tickets are delivered
const FROM_FALLBACK = 'KHAN AI <no-reply@khanai.world>';

function getTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user, pass },
  });
}

export function mailerConfigured(): boolean {
  return !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

export async function sendSupportEmail(ticket: {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  memberEmail?: string | null;
}): Promise<boolean> {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn('[mailer] GMAIL_USER / GMAIL_APP_PASSWORD not set — ticket kept in DB only.');
    return false;
  }
  const from = process.env.GMAIL_USER ? `KHAN Support <${process.env.GMAIL_USER}>` : FROM_FALLBACK;
  const html = `
  <div style="font-family:Segoe UI,Arial,sans-serif;background:#0A0F1C;padding:28px;border-radius:14px;color:#e8ecf4;max-width:620px">
    <h2 style="color:#C9A24B;margin:0 0 4px">🎫 New KHAN Support Ticket</h2>
    <p style="color:#3FE0D0;margin:0 0 18px;font-size:13px">Ticket ID: ${ticket.id}</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:6px 0;color:#8b93a7;width:110px">Name</td><td style="padding:6px 0">${ticket.name}</td></tr>
      <tr><td style="padding:6px 0;color:#8b93a7">Email</td><td style="padding:6px 0"><a href="mailto:${ticket.email}" style="color:#3FE0D0">${ticket.email}</a></td></tr>
      <tr><td style="padding:6px 0;color:#8b93a7">Subject</td><td style="padding:6px 0">${ticket.subject}</td></tr>
      <tr><td style="padding:6px 0;color:#8b93a7">Member</td><td style="padding:6px 0">${ticket.memberEmail ? `Yes — account ${ticket.memberEmail}` : 'Guest (not signed in)'}</td></tr>
    </table>
    <div style="margin-top:16px;padding:14px;background:#121828;border-left:3px solid #C9A24B;border-radius:8px;white-space:pre-wrap;font-size:14px;line-height:1.55">${ticket.message.replace(/</g, '&lt;')}</div>
    <p style="margin-top:18px;font-size:11.5px;color:#8b93a7">Sent automatically by the KHAN AI support system — reply directly to this email to reach the customer.</p>
  </div>`;
  const text = `New KHAN Support Ticket\nID: ${ticket.id}\nFrom: ${ticket.name} <${ticket.email}>\nSubject: ${ticket.subject}\nMember: ${ticket.memberEmail || 'Guest'}\n\n${ticket.message}`;

  try {
    await transporter.sendMail({
      from,
      to: SUPPORT_INBOX,
      replyTo: ticket.email, // reply goes straight to the customer
      subject: `🎫 KHAN Ticket #${ticket.id.slice(-6).toUpperCase()} — ${ticket.subject}`,
      text,
      html,
    });
    return true;
  } catch (err) {
    console.error('[mailer] send failed:', err);
    return false;
  }
}
