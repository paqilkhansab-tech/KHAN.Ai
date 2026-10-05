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

/**
 * HTML-escape every user-supplied value before inserting into the email template.
 * Input is already sanitized at the API layer — this is defense-in-depth against
 * HTML/JS injection inside the owner's mail client.
 */
function esc(v: string): string {
  return v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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

export interface OTPEmailResult {
  delivered: boolean;
  /** FormSubmit relay reached but the owner has not clicked "Activate" yet */
  pendingActivation?: boolean;
  /** human-readable failure reason for server logs */
  reason?: string;
}

/**
 * KHAN OTP DELIVERY — password-reset one-time code.
 *
 * Delivery chain:
 *  1. Gmail SMTP (GMAIL_USER + GMAIL_APP_PASSWORD) — the real-world path that
 *     reaches ANY customer inbox. Primary.
 *  2. FormSubmit owner-bridge — ONLY when the destination IS the owner inbox
 *     (paqilkhansab@gmail.com). Lets the site owner reset their own password
 *     with zero configuration: the very first attempt emails a one-time
 *     "Activate FormSubmit" link to the owner's Gmail — clicking it once
 *     switches on all future deliveries. Never used for customer addresses
 *     (a relay-to-owner service must not carry other people's codes).
 */
export async function sendOTPEmail(to: string, name: string, code: string): Promise<OTPEmailResult> {
  const transporter = getTransporter();
  if (!transporter) {
    if (to.toLowerCase() === SUPPORT_INBOX) {
      console.warn('[mailer] SMTP not configured — owner-inbox FormSubmit bridge for OTP.');
      return sendViaFormSubmit(
        `KHAN password reset code: ${code}`,
        `KHAN Password Reset\n\nHi ${name},\n\nYour one-time reset code: ${code}\n\nExpires in 10 minutes. Use it once. Didn't request it? Ignore this email.`,
        SUPPORT_INBOX
      ).then(r => ({
        delivered: r.ok,
        pendingActivation: r.pendingActivation,
        reason: r.ok ? undefined : r.pendingActivation ? 'FormSubmit pending activation' : 'FormSubmit unreachable',
      }));
    }
    console.warn('[mailer] cannot send OTP — GMAIL_USER / GMAIL_APP_PASSWORD not set and destination is not the owner inbox.');
    return { delivered: false, reason: 'SMTP not configured' };
  }
  const html = `
  <div style="font-family:Segoe UI,Arial,sans-serif;background:#0A0F1C;padding:32px;border-radius:16px;color:#e8ecf4;max-width:520px">
    <h2 style="color:#C9A24B;margin:0 0 4px">KHAN Password Reset</h2>
    <p style="color:#8b93a7;margin:0 0 20px;font-size:14px">Hi ${esc(name)}, use this one-time code to set a new password:</p>
    <div style="text-align:center;margin:0 0 20px">
      <span style="display:inline-block;letter-spacing:12px;font-size:34px;font-weight:800;color:#3FE0D0;background:#121828;border:1px solid #C9A24B;border-radius:12px;padding:16px 26px 16px 38px">${esc(code)}</span>
    </div>
    <p style="color:#8b93a7;margin:0 0 6px;font-size:13px">This code expires in <b style="color:#e8ecf4">10 minutes</b> and can be used once.</p>
    <p style="color:#8b93a7;margin:0;font-size:13px">Didn't request it? Ignore this email — your account stays safe.</p>
    <p style="margin-top:22px;font-size:11px;color:#5d6578">Sent by the KHAN AI security system. Never share this code with anyone.</p>
  </div>`;
  const text = `KHAN Password Reset\n\nHi ${name},\n\nYour one-time reset code: ${code}\n\nExpires in 10 minutes. Use it once. Didn't request it? Ignore this email.`;

  try {
    await transporter.sendMail({
      from: `KHAN Security <${process.env.GMAIL_USER}>`,
      to,
      subject: `KHAN password reset code: ${code}`,
      text,
      html,
    });
    console.log(`[mailer] OTP email delivered via Gmail SMTP to ${to.replace(/(.{2}).*(@.*)/, '$1***$2')}`);
    return { delivered: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[mailer] OTP SMTP send failed:', msg);
    return { delivered: false, reason: `SMTP error: ${msg.slice(0, 140)}` };
  }
}

/**
 * ZERO-CONFIG FALLBACK — FormSubmit relay.
 * Forwards the ticket to the owner's Gmail via formsubmit.co's AJAX endpoint.
 * Requires no credentials. The VERY FIRST submission triggers a one-time
 * "Activate FormSubmit" email to the owner's inbox — clicking Activate once
 * enables all future deliveries. Runs only when Gmail SMTP is not configured.
 */
async function sendViaFormSubmit(
  subject: string,
  text: string,
  replyTo: string
): Promise<{ ok: boolean; pendingActivation?: boolean }> {
  try {
    const res = await fetch(`https://formsubmit.co/ajax/${SUPPORT_INBOX}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        _subject: subject,
        _replyto: replyTo,
        _template: 'box',
        _captcha: 'false',
        message: text,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.error(`[mailer] FormSubmit relay HTTP ${res.status} — blocked or rate-limited on this network.`);
      return { ok: false };
    }
    // Detect the one-time "Activate FormSubmit" gate: the relay answers 200 but
    // withholds delivery until the owner clicks the activation link in their inbox.
    const body = await res.json().catch(() => null as unknown as Record<string, unknown>);
    const msg = typeof body?.message === 'string' ? body.message.toLowerCase() : '';
    if (msg.includes('activation') || msg.includes('activate') || msg.includes('confirm')) {
      console.warn('[mailer] FormSubmit relay is PENDING ACTIVATION — the owner must click the Activate link emailed to ' + SUPPORT_INBOX + '.');
      return { ok: false, pendingActivation: true };
    }
    return { ok: true };
  } catch (err) {
    console.error('[mailer] FormSubmit fallback failed:', err instanceof Error ? err.message : err);
    return { ok: false };
  }
}

export async function sendSupportEmail(ticket: {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  memberEmail?: string | null;
}): Promise<boolean> {
  const subject = `🎫 KHAN Ticket #${ticket.id.slice(-6).toUpperCase()} — ${ticket.subject}`.replace(/[\r\n]+/g, ' '); // header-injection safe

  const transporter = getTransporter();
  if (!transporter) {
    // No SMTP credentials on this deployment — use the zero-config relay.
    console.warn('[mailer] GMAIL_USER / GMAIL_APP_PASSWORD not set — using FormSubmit relay fallback.');
    const fallbackText = `New KHAN Support Ticket\nID: ${ticket.id}\nFrom: ${ticket.name} <${ticket.email}>\nSubject: ${ticket.subject}\nMember: ${ticket.memberEmail || 'Guest'}\n\n${ticket.message}`;
    const relay = await sendViaFormSubmit(subject, fallbackText, ticket.email);
    if (relay.pendingActivation) {
      console.warn('[mailer] Ticket NOT delivered yet — FormSubmit activation pending (check ' + SUPPORT_INBOX + ' for the Activate email).');
    }
    return relay.ok;
  }
  const from = process.env.GMAIL_USER ? `KHAN Support <${process.env.GMAIL_USER}>` : FROM_FALLBACK;
  const html = `
  <div style="font-family:Segoe UI,Arial,sans-serif;background:#0A0F1C;padding:28px;border-radius:14px;color:#e8ecf4;max-width:620px">
    <h2 style="color:#C9A24B;margin:0 0 4px">🎫 New KHAN Support Ticket</h2>
    <p style="color:#3FE0D0;margin:0 0 18px;font-size:13px">Ticket ID: ${ticket.id}</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:6px 0;color:#8b93a7;width:110px">Name</td><td style="padding:6px 0">${esc(ticket.name)}</td></tr>
      <tr><td style="padding:6px 0;color:#8b93a7">Email</td><td style="padding:6px 0"><a href="mailto:${esc(ticket.email)}" style="color:#3FE0D0">${esc(ticket.email)}</a></td></tr>
      <tr><td style="padding:6px 0;color:#8b93a7">Subject</td><td style="padding:6px 0">${esc(ticket.subject)}</td></tr>
      <tr><td style="padding:6px 0;color:#8b93a7">Member</td><td style="padding:6px 0">${ticket.memberEmail ? `Yes — account ${esc(ticket.memberEmail)}` : 'Guest (not signed in)'}</td></tr>
    </table>
    <div style="margin-top:16px;padding:14px;background:#121828;border-left:3px solid #C9A24B;border-radius:8px;white-space:pre-wrap;font-size:14px;line-height:1.55">${esc(ticket.message)}</div>
    <p style="margin-top:18px;font-size:11.5px;color:#8b93a7">Sent automatically by the KHAN AI support system — reply directly to this email to reach the customer.</p>
  </div>`;
  const text = `New KHAN Support Ticket\nID: ${ticket.id}\nFrom: ${ticket.name} <${ticket.email}>\nSubject: ${ticket.subject}\nMember: ${ticket.memberEmail || 'Guest'}\n\n${ticket.message}`;

  try {
    await transporter.sendMail({
      from,
      to: SUPPORT_INBOX,
      replyTo: ticket.email, // reply goes straight to the customer
      subject: `🎫 KHAN Ticket #${ticket.id.slice(-6).toUpperCase()} — ${ticket.subject}`.replace(/[\r\n]+/g, ' '), // header-injection safe
      text,
      html,
    });
    return true;
  } catch (err) {
    console.error('[mailer] send failed:', err);
    return false;
  }
}
