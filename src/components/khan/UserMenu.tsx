'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, User, Star, MessageSquare, CalendarDays, ChevronDown, Phone, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from './AuthProvider';

export default function UserMenu({ onEditProfile }: { onEditProfile: () => void }) {
  const { user, watchlist, chatCount, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const router = useRouter();

  if (!user) return null;

  const handleSignOut = async () => {
    await signOut();
    setOpen(false);
    toast.success('Logged out — see you soon!');
    router.refresh();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="khan-btn-ghost flex items-center gap-2 px-4 py-2 text-[14px]"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold" style={{ background: 'linear-gradient(135deg,#C9A24B,#3FE0D0)', color: '#0A0F1C' }}>
          {user.name[0].toUpperCase()}
        </span>
        <span className="hidden max-w-[110px] truncate sm:inline">{user.name.split(' ')[0]}</span>
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[90]" onClick={() => setOpen(false)} />
          <div className="khan-card absolute right-0 top-[calc(100%+10px)] z-[95] w-[320px] p-5 shadow-2xl" role="menu">
            <div className="mb-4 flex items-center gap-3 border-b border-[var(--khan-line)] pb-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-full text-[16px] font-bold" style={{ background: 'linear-gradient(135deg,#C9A24B,#3FE0D0)', color: '#0A0F1C' }}>
                {user.name[0].toUpperCase()}
              </span>
              <div className="min-w-0">
                <div className="truncate text-[15px] font-semibold">{user.name}</div>
                <div className="truncate font-mono-khan text-[11.5px] text-[var(--khan-muted)]">{user.email}</div>
              </div>
            </div>

            <div className="mb-4 space-y-2 text-[12.5px]">
              {user.phone && (
                <div className="flex items-center gap-2 text-[var(--khan-muted)]">
                  <Phone size={13} /> {user.phone}
                </div>
              )}
              <div className="flex items-center gap-2 text-[var(--khan-muted)]">
                <CalendarDays size={13} /> Member since {new Date(user.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
              <div className="flex items-center gap-2 text-[var(--khan-muted)]">
                <Star size={13} style={{ color: 'var(--khan-gold)' }} /> {watchlist.length} coins in watchlist
              </div>
              <div className="flex items-center gap-2 text-[var(--khan-muted)]">
                <MessageSquare size={13} /> {chatCount} AI exchanges saved
              </div>
            </div>

            <button
              onClick={() => { setOpen(false); onEditProfile(); }}
              className="khan-btn-ghost mb-2 flex w-full items-center justify-center gap-2 py-2.5 text-[13.5px] font-semibold"
            >
              <User size={14} /> Edit profile
            </button>
            <button
              onClick={handleSignOut}
              className="flex w-full items-center justify-center gap-2 rounded-[10px] border py-2.5 text-[13.5px] font-semibold transition-colors"
              style={{ borderColor: 'rgba(229,88,107,.4)', color: 'var(--khan-down)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(229,88,107,.08)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <LogOut size={14} /> Log out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
