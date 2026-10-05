'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform, useReducedMotion } from 'framer-motion';
import { X, Eye, EyeOff, Lock, Mail, User, Phone, ShieldCheck, Database, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from './AuthProvider';

/**
 * KHAN Secure Access — 3D animated auth modal.
 * FIX: mode now syncs with `initialMode` every time the modal opens
 * (previously "Log in" could open the signup form because useState
 * captured the prop only on first mount).
 */

const EASE = [0.22, 1, 0.36, 1] as const;

/* ---------- spinning 3D coin badge ---------- */
function Coin3D({ reduced }: { reduced: boolean }) {
  const face: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
  };
  return (
    <div style={{ perspective: 600, width: 68, height: 68 }}>
      <motion.div
        aria-hidden
        style={{ transformStyle: 'preserve-3d', width: '100%', height: '100%', position: 'relative' }}
        animate={reduced ? undefined : { rotateY: 360 }}
        transition={{ duration: 6, ease: 'linear', repeat: Infinity }}
      >
        {/* front */}
        <div
          style={{
            ...face,
            transform: 'translateZ(5px)',
            background: 'linear-gradient(135deg,#E7C568,#C9A24B 55%,#8f6f28)',
            boxShadow: '0 6px 22px rgba(201,162,75,.45), inset 0 2px 6px rgba(255,255,255,.5)',
            color: '#0A0F1C',
            fontSize: 26,
            fontWeight: 800,
            fontFamily: 'var(--font-display, inherit)',
            border: '2px solid rgba(255,255,255,.35)',
          }}
        >
          K
        </div>
        {/* back */}
        <div
          style={{
            ...face,
            transform: 'rotateY(180deg) translateZ(5px)',
            background: 'linear-gradient(135deg,#4fe3d2,#2bb8a8 60%,#137a6e)',
            boxShadow: '0 6px 22px rgba(63,224,208,.4), inset 0 2px 6px rgba(255,255,255,.4)',
            color: '#0A0F1C',
            fontSize: 22,
            fontWeight: 800,
            border: '2px solid rgba(255,255,255,.3)',
          }}
        >
          ₹$
        </div>
      </motion.div>
    </div>
  );
}

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
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>(initialMode);
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [otp, setOtp] = useState('');
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [errKey, setErrKey] = useState(0);
  const emailRef = useRef<HTMLInputElement>(null);
  const reduced = useReducedMotion();

  // FIX: sync mode (and clear stale errors) every time the modal opens
  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setForgotStep(1);
      setOtp('');
      setError('');
      setShowPw(false);
      const t = setTimeout(() => emailRef.current?.focus(), 420);
      return () => clearTimeout(t);
    }
  }, [open, initialMode]);

  // Escape key closes
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  /* 3D mouse tilt */
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rX = useSpring(useTransform(my, [-0.5, 0.5], [7, -7]), { stiffness: 140, damping: 18 });
  const rY = useSpring(useTransform(mx, [-0.5, 0.5], [-9, 9]), { stiffness: 140, damping: 18 });
  const onTilt = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reduced) return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };
  const resetTilt = () => { mx.set(0); my.set(0); };

  if (!open) return null;

  const switchMode = (m: 'signin' | 'signup' | 'forgot') => {
    setMode(m);
    setError('');
    if (m === 'forgot') setForgotStep(1);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'forgot') {
        if (forgotStep === 1) {
          // STEP 1 — request the OTP email
          const res = await fetch('/api/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: form.email }),
          });
          const data = await res.json();
          if (!res.ok) {
            setError(data.error || 'Could not send the code. Try again.');
            setErrKey(k => k + 1);
            return;
          }
          toast.success(data.message || 'Reset code sent — check your inbox.');
          setForgotStep(2);
          setError('');
          return;
        }
        // STEP 2 — verify OTP + set new password
        const res = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: form.email, otp, password: form.password }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Invalid or expired code.');
          setErrKey(k => k + 1);
          return;
        }
        toast.success(data.message || 'Password updated — sign in with your new password.');
        setMode('signin');
        setForgotStep(1);
        setOtp('');
        setForm(f => ({ ...f, password: '' }));
        return;
      }

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
        setErrKey(k => k + 1); // retrigger shake
        return;
      }
      await refresh();
      toast.success(data.message || 'Welcome to KHAN!');
      onClose();
    } catch {
      setError('Network error — is the server awake? Try again.');
      setErrKey(k => k + 1);
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(5,8,15,0.78)] p-5"
      style={{ perspective: 1200 }}
      initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
      animate={{ opacity: 1, backdropFilter: 'blur(6px)' }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={mode === 'signup' ? 'Create your KHAN account' : mode === 'forgot' ? 'Reset your KHAN password' : 'Sign in to KHAN'}
    >
      {/* 3D entrance card with mouse tilt */}
      <motion.div
        className="khan-card relative w-full max-w-[420px] rounded-2xl p-8 pt-10 shadow-2xl"
        style={{ rotateX: rX, rotateY: rY, transformStyle: 'preserve-3d' }}
        initial={reduced ? { opacity: 0 } : { opacity: 0, rotateX: -24, y: 70, scale: 0.9 }}
        animate={reduced ? { opacity: 1 } : { opacity: 1, rotateX: 0, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 130, damping: 17 }}
        onMouseMove={onTilt}
        onMouseLeave={resetTilt}
      >
        {/* floating coin badge */}
        <div className="absolute -top-9 left-1/2 -translate-x-1/2" style={{ transform: 'translateZ(46px)' }}>
          <motion.div
            initial={reduced ? undefined : { y: -26, opacity: 0, scale: 0.5 }}
            animate={reduced ? undefined : { y: 0, opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 14, delay: 0.12 }}
          >
            <Coin3D reduced={!!reduced} />
          </motion.div>
        </div>

        <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 p-1 text-[var(--khan-muted)] hover:text-white">
          <X size={20} />
        </button>

        <div className="font-mono-khan mb-1.5 mt-2 text-center text-[11px] tracking-[2px] text-[var(--khan-cyan)]">KHAN SECURE ACCESS</div>
        <h3 className="font-display-khan mb-1 text-center text-[24px] font-semibold">
          {mode === 'signup' ? 'Create your account' : mode === 'forgot' ? 'Reset your password' : 'Welcome back'}
        </h3>
        <p className="mb-6 text-center text-[13px] text-[var(--khan-muted)]">
          {mode === 'signup'
            ? '20 seconds. Your data is stored on real KHAN servers — permanently, on any device.'
            : mode === 'forgot'
              ? forgotStep === 1
                ? 'Enter your account email — we will send you a 6-digit reset code.'
                : `Check ${form.email} for the 6-digit code, then choose a new password.`
              : 'Sign in to reach your watchlist, saved analyses and personal profile.'}
        </p>

        {/* 3D flip on mode switch */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.form
            key={mode}
            onSubmit={submit}
            initial={reduced ? { opacity: 0 } : { opacity: 0, rotateY: 70, x: 40 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, rotateY: 0, x: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, rotateY: -70, x: -40 }}
            transition={{ duration: 0.32, ease: EASE }}
            style={{ transformStyle: 'preserve-3d', transformPerspective: 900 }}
          >
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
            {/* FORGOT — step 2: OTP + new password */}
            {mode === 'forgot' && forgotStep === 2 && (
              <div className="relative mb-3">
                <ShieldCheck size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--khan-cyan)]" />
                <input
                  className="khan-input pl-10 tracking-[8px]"
                  placeholder="6-digit code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                  required
                />
              </div>
            )}
            <div className="relative mb-3">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--khan-muted)]" />
              <input
                ref={emailRef}
                className="khan-input pl-10"
                placeholder="Email address"
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                autoComplete="email"
                required
                disabled={mode === 'forgot' && forgotStep === 2}
              />
            </div>
            {mode !== 'forgot' && (
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
            )}
            {mode === 'forgot' && forgotStep === 2 && (
              <div className="relative mb-4">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--khan-muted)]" />
                <input
                  className="khan-input px-10"
                  placeholder="New password (min 6 chars)"
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  autoComplete="new-password"
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
            )}

            {error && (
              <motion.div
                key={errKey}
                role="alert"
                aria-live="assertive"
                className="mb-4 rounded-lg border border-[rgba(229,88,107,.4)] bg-[rgba(229,88,107,.08)] px-3.5 py-2.5 text-[13px]"
                style={{ color: 'var(--khan-down)' }}
                initial={reduced ? undefined : { x: 0 }}
                animate={reduced ? undefined : { x: [0, -10, 10, -7, 7, -3, 3, 0], rotateZ: [0, -0.7, 0.7, -0.4, 0.4, 0] }}
                transition={{ duration: 0.5 }}
              >
                ⚠ {error}
              </motion.div>
            )}

            <motion.button
              type="submit"
              disabled={busy}
              className="khan-btn-gold w-full py-3 text-[15px] disabled:opacity-50"
              whileHover={reduced || busy ? undefined : { scale: 1.025, boxShadow: '0 8px 28px rgba(201,162,75,.4)' }}
              whileTap={reduced || busy ? undefined : { scale: 0.97 }}
            >
              {busy ? (
                <span className="flex items-center justify-center gap-2">
                  <motion.span
                    className="inline-block h-3.5 w-3.5 rounded-full border-2 border-[#0A0F1C] border-t-transparent"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.7, ease: 'linear', repeat: Infinity }}
                  />
                  {mode === 'forgot' && forgotStep === 1 ? 'Sending your code…' : 'Securing…'}
                </span>
              ) : mode === 'signup' ? (
                'Create account — it\u2019s free'
              ) : mode === 'forgot' ? (
                forgotStep === 1 ? 'Email me the reset code' : 'Set new password'
              ) : (
                'Sign in securely'
              )}
            </motion.button>
          </motion.form>
        </AnimatePresence>

        <p className="mt-4 text-center text-[13px] text-[var(--khan-muted)]">
          {mode === 'forgot' ? (
            <button onClick={() => switchMode('signin')} className="font-semibold text-[var(--khan-cyan)] hover:underline">
              ← Back to sign in
            </button>
          ) : (
            <>
              {mode === 'signup' ? 'Already a member?' : 'New to KHAN?'}{' '}
              <button onClick={() => switchMode(mode === 'signup' ? 'signin' : 'signup')} className="font-semibold text-[var(--khan-cyan)] hover:underline">
                {mode === 'signup' ? 'Sign in' : 'Create a free account'}
              </button>
            </>
          )}
        </p>
        {mode === 'signin' && (
          <p className="mt-1.5 text-center text-[12.5px]">
            <button onClick={() => switchMode('forgot')} className="text-[var(--khan-muted)] transition-colors hover:text-[var(--khan-gold)] hover:underline">
              Forgot password?
            </button>
          </p>
        )}

        <motion.div
          className="mt-5 grid grid-cols-3 gap-2 border-t border-[var(--khan-line)] pt-4"
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.09, delayChildren: 0.3 } } }}
        >
          {[
            { icon: <Lock size={13} />, label: 'bcrypt hashed' },
            { icon: <Database size={13} />, label: 'stored in DB' },
            { icon: <ShieldCheck size={13} />, label: 'JWT session' },
          ].map(t => (
            <motion.div
              key={t.label}
              variants={reduced ? undefined : { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}
              className="flex flex-col items-center gap-1 text-center"
            >
              <span className="text-[var(--khan-cyan)]">{t.icon}</span>
              <span className="font-mono-khan text-[9.5px] uppercase tracking-wide text-[var(--khan-muted)]">{t.label}</span>
            </motion.div>
          ))}
        </motion.div>
        <div className="font-mono-khan mt-3 flex items-center justify-center gap-1.5 text-[10px] text-[var(--khan-muted)]">
          <CheckCircle2 size={11} className="text-[var(--khan-up)]" />
          REAL authentication — passwords are never stored in plain text
        </div>
      </motion.div>
    </motion.div>
  );
}
