'use client';

import { useState } from 'react';
import { Phone, Mail, Clock, ShieldCheck, Send, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from './AuthProvider';

export const SUPPORT_PHONE = '9494490006';
export const SUPPORT_EMAIL = 'paqilkhansab@gmail.com';

export default function CustomerCare() {
  const { user } = useAuth();
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '', subject: 'General question', message: '' });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch('/api/support/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        setSent(true);
        setForm(f => ({ ...f, message: '' }));
      } else {
        toast.error(data.error || 'Could not send.');
      }
    } catch {
      toast.error('Network error — please email us directly.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section id="support" className="mx-auto w-full max-w-[1180px] px-6 py-16">
      <div className="mb-8 max-w-[62ch]">
        <p className="font-mono-khan mb-3 text-[13px] text-[var(--khan-cyan)]">CUSTOMER CARE · 24×7</p>
        <h2 className="font-display-khan mb-3 text-[30px] font-semibold leading-tight">
          Real humans. <span style={{ color: 'var(--khan-gold)' }}>Real support.</span>
        </h2>
        <p className="text-[15px] text-[var(--khan-muted)]">
          Questions about your account, deposits, crypto or trading? Call or write directly — every message reaches the KHAN core team.
        </p>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <a href={`tel:+91${SUPPORT_PHONE}`} className="khan-card group flex items-center gap-4 p-6 transition-colors hover:border-[var(--khan-gold)]">
          <span className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl p-3.5" style={{ background: 'rgba(201,162,75,.12)', border: '1px solid rgba(201,162,75,.4)' }}>
            <Phone size={22} style={{ color: 'var(--khan-gold)' }} />
          </span>
          <div>
            <div className="font-mono-khan text-[11px] tracking-wider text-[var(--khan-muted)]">CALL US DIRECTLY</div>
            <div className="font-display-khan text-[22px] font-semibold group-hover:text-[var(--khan-gold)]">{SUPPORT_PHONE}</div>
            <div className="text-[12px] text-[var(--khan-muted)]">Tap to call · Hindi / English / Telugu</div>
          </div>
        </a>

        <a href={`mailto:${SUPPORT_EMAIL}`} className="khan-card group flex items-center gap-4 p-6 transition-colors hover:border-[var(--khan-cyan)]">
          <span className="flex items-center justify-center rounded-2xl p-3.5" style={{ background: 'rgba(63,224,208,.1)', border: '1px solid rgba(63,224,208,.4)' }}>
            <Mail size={22} style={{ color: 'var(--khan-cyan)' }} />
          </span>
          <div className="min-w-0">
            <div className="font-mono-khan text-[11px] tracking-wider text-[var(--khan-muted)]">EMAIL SUPPORT</div>
            <div className="truncate text-[16px] font-semibold group-hover:text-[var(--khan-cyan)]" style={{ wordBreak: 'break-all' }}>{SUPPORT_EMAIL}</div>
            <div className="text-[12px] text-[var(--khan-muted)]">Replies within 24 hours</div>
          </div>
        </a>

        <div className="khan-card flex items-center gap-4 p-6">
          <span className="flex items-center justify-center rounded-2xl p-3.5" style={{ background: 'rgba(63,191,127,.1)', border: '1px solid rgba(63,191,127,.4)' }}>
            <Clock size={22} style={{ color: 'var(--khan-up)' }} />
          </span>
          <div>
            <div className="font-mono-khan text-[11px] tracking-wider text-[var(--khan-muted)]">AVAILABILITY</div>
            <div className="text-[16px] font-semibold">24 × 7 · all days</div>
            <div className="text-[12px] text-[var(--khan-muted)]">Avg response &lt; 2 hours</div>
          </div>
        </div>
      </div>

      <div className="khan-card overflow-hidden">
        <div className="grid gap-0 md:grid-cols-[1fr_380px]">
          <form onSubmit={submit} className="p-7">
            <div className="mb-5 flex items-center gap-2.5">
              <MessageCircle size={18} style={{ color: 'var(--khan-cyan)' }} />
              <h3 className="font-display-khan text-[19px] font-semibold">Send us a message</h3>
            </div>
            <div className="mb-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[12.5px] text-[var(--khan-muted)]" htmlFor="cc-name">Your name</label>
                <input id="cc-name" className="khan-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" required />
              </div>
              <div>
                <label className="mb-1.5 block text-[12.5px] text-[var(--khan-muted)]" htmlFor="cc-email">Your email</label>
                <input id="cc-email" type="email" className="khan-input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="you@example.com" required />
              </div>
            </div>
            <div className="mb-4">
              <label className="mb-1.5 block text-[12.5px] text-[var(--khan-muted)]" htmlFor="cc-subject">Subject</label>
              <select id="cc-subject" className="khan-input" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}>
                <option>General question</option>
                <option>Account & login help</option>
                <option>Crypto / trading question</option>
                <option>Report a problem</option>
                <option>Business & partnership</option>
              </select>
            </div>
            <div className="mb-5">
              <label className="mb-1.5 block text-[12.5px] text-[var(--khan-muted)]" htmlFor="cc-msg">Message</label>
              <textarea id="cc-msg" className="khan-input min-h-[110px] resize-y" value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="Tell us what you need help with…" required />
            </div>
            <button type="submit" disabled={busy} className="khan-btn-gold flex items-center gap-2 px-6 py-3 disabled:opacity-50">
              <Send size={16} /> {busy ? 'Sending…' : sent ? 'Sent ✓ — send another' : 'Send message'}
            </button>
          </form>

          <div className="flex flex-col justify-center gap-4 border-t border-[var(--khan-line)] p-7 md:border-l md:border-t-0">
            <div className="flex items-start gap-3">
              <ShieldCheck size={20} style={{ color: 'var(--khan-up)' }} className="mt-0.5 shrink-0" />
              <p className="text-[13.5px] leading-relaxed text-[var(--khan-muted)]">
                Every message is stored securely on KHAN servers with a ticket ID, so nothing gets lost — even if you write from a different device later.
              </p>
            </div>
            <div className="khan-card-2 rounded-xl p-4">
              <div className="font-mono-khan mb-1.5 text-[10.5px] tracking-wider text-[var(--khan-muted)]">PRIORITY SUPPORT FOR MEMBERS</div>
              <p className="text-[13px] leading-relaxed text-[var(--khan-text)]">
                Signed-in users get priority queue + their account context attached automatically — faster resolution, no repetition.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
