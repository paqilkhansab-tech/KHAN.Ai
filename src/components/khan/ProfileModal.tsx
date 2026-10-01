'use client';

import { useEffect, useState } from 'react';
import { X, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from './AuthProvider';

export default function ProfileModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, refresh } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setPhone(user.phone || '');
    }
  }, [user, open]);

  if (!open || !user) return null;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone }),
      });
      const data = await res.json();
      if (res.ok) {
        await refresh();
        toast.success(data.message);
        onClose();
      } else {
        toast.error(data.error || 'Update failed.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(5,8,15,0.78)] p-5 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div className="khan-card relative w-full max-w-[400px] p-8 shadow-2xl">
        <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 p-1 text-[var(--khan-muted)] hover:text-white">
          <X size={20} />
        </button>
        <h3 className="font-display-khan mb-1 text-[22px] font-semibold">Your profile</h3>
        <p className="mb-6 font-mono-khan text-[12px] text-[var(--khan-muted)]">Stored securely on KHAN servers</p>
        <form onSubmit={save}>
          <label className="mb-1.5 block text-[12.5px] text-[var(--khan-muted)]" htmlFor="pf-name">Full name</label>
          <input id="pf-name" className="khan-input mb-4" value={name} onChange={e => setName(e.target.value)} required minLength={2} />
          <label className="mb-1.5 block text-[12.5px] text-[var(--khan-muted)]" htmlFor="pf-phone">Mobile</label>
          <input id="pf-phone" className="khan-input mb-4" value={phone} onChange={e => setPhone(e.target.value)} type="tel" placeholder="Your number" />
          <label className="mb-1.5 block text-[12.5px] text-[var(--khan-muted)]" htmlFor="pf-email">Email (login — cannot change)</label>
          <input id="pf-email" className="khan-input mb-6 opacity-60" value={user.email} disabled />
          <button type="submit" disabled={busy} className="khan-btn-gold flex w-full items-center justify-center gap-2 py-3 disabled:opacity-50">
            <Check size={16} /> {busy ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
