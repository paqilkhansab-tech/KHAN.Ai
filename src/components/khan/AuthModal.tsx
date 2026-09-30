'use client';

import { useState } from 'react';
import { X, Eye, EyeOff, Lock, Mail, User, Phone, ShieldCheck, Database, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from './AuthProvider';

export default function AuthModal({
  open,
  onClose,
  initialMode = 'signin',
}: {
  open: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup';
}) {
  const { refresh } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const switchMode = (m: 'signin' | 'signup') => {
    setMode(m);
    setError('');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const endpoint = mode === 'signup' ? '/api/auth/signup' : '/api/auth/signin';
      const payload = mode === 'signup' ? form : { email: form.email, password: form.password };
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Something went wrong.');
        return;
      }
      await refresh();
      toast.success(data.message || 'Welcome to KHAN!');
      onClose();
    } catch {
      setError('Network error — is the server awake? Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(5,8,15,0.78)] p-5 backdrop-blur-sm"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={mode === 'signup' ? 'Create your KHAN account' : 'Sign in to KHAN'}
    >
      <div className="khan-card relative w-full max-w-[420px] p-8 shadow-2xl">
        <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 p-1 text-[var(--khan-muted)] hover:text-white">
          <X size={20} />
        </button>

        <div className="mb-1.5 font-mono-khan text-[11px] tracking-[2px] text-[var(--khan-cyan)]">KHAN SECURE ACCESS</div>
        <h3 className="font-display-khan mb-1 text-[24px] font-semibold">
          {mode === 'signup' ? 'Create your account' : 'Welcome back'}
        </h3>
        <p className="mb-6 text-[13px] text-[var(--khan-muted)]">
          {mode === 'signup'
            ? '20 seconds. Your data is stored on real KHAN servers — permanently, on any device.'
            : 'Sign in to reach your watchlist, saved analyses and personal profile.'}
        </p>

        <form onSubmit={submit}>
          {mode === 'signup' && (
            <>
              <div className="relative mb-3">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--khan-muted)]" />
                <input
                  className="khan-input pl-10"
                  placeholder="Full name"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  autoComplete="name"
                  required
                  minLength={2}
                />
              </div>
              <div className="relative mb-3">
                <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--khan-muted)]" />
                <input
                  className="khan-input pl-10"
                  placeholder="Mobile (optional)"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  autoComplete="tel"
                  type="tel"
                />
              </div>
            </>
          )}
          <div className="relative mb-3">
            <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--khan-muted)]" />
            <input
              className="khan-input pl-10"
              placeholder="Email address"
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              autoComplete="email"
              required
            />
          </div>
          <div className="relative mb-4">
            <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--khan-muted)]" />
            <input
              className="khan-input px-10"
              placeholder={mode === 'signup' ? 'Create password (min 6 chars)' : 'Password'}
              type={showPw ? 'text' : 'password'}
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              required
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowPw(s => !s)}
              aria-label={showPw ? 'Hide password' : 'Show password'}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--khan-muted)] hover:text-white"
            >
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-[rgba(229,88,107,.4)] bg-[rgba(229,88,107,.08)] px-3.5 py-2.5 text-[13px]" style={{ color: 'var(--khan-down)' }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={busy} className="khan-btn-gold w-full py-3 text-[15px] disabled:opacity-50">
            {busy ? 'Securing your session…' : mode === 'signup' ? 'Create account — it\u2019s free' : 'Sign in securely'}
          </button>
        </form>

        <p className="mt-4 text-center text-[13px] text-[var(--khan-muted)]">
          {mode === 'signup' ? 'Already a member?' : 'New to KHAN?'}{' '}
          <button onClick={() => switchMode(mode === 'signup' ? 'signin' : 'signup')} className="font-semibold text-[var(--khan-cyan)] hover:underline">
            {mode === 'signup' ? 'Sign in' : 'Create a free account'}
          </button>
        </p>

        <div className="mt-5 grid grid-cols-3 gap-2 border-t border-[var(--khan-line)] pt-4">
          {[
            { icon: <Lock size={13} />, label: 'bcrypt hashed' },
            { icon: <Database size={13} />, label: 'stored in DB' },
            { icon: <ShieldCheck size={13} />, label: 'JWT session' },
          ].map(t => (
            <div key={t.label} className="flex flex-col items-center gap-1 text-center">
              <span className="text-[var(--khan-cyan)]">{t.icon}</span>
              <span className="font-mono-khan text-[9.5px] uppercase tracking-wide text-[var(--khan-muted)]">{t.label}</span>
            </div>
          ))}
        </div>
        <div className="font-mono-khan mt-3 flex items-center justify-center gap-1.5 text-[10px] text-[var(--khan-muted)]">
          <CheckCircle2 size={11} className="text-[var(--khan-up)]" />
          REAL authentication — passwords are never stored in plain text
        </div>
      </div>
    </div>
  );
}
