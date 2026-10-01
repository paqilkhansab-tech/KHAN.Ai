'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { toast } from 'sonner';
import { AuthProvider, useAuth } from '@/components/khan/AuthProvider';
import Ticker from '@/components/khan/Ticker';
import CryptoSection from '@/components/khan/CryptoSection';
import KhanChat from '@/components/khan/KhanChat';
import StockSection from '@/components/khan/StockSection';
import Planner from '@/components/khan/Planner';
import CustomerCare, { SUPPORT_PHONE, SUPPORT_EMAIL } from '@/components/khan/CustomerCare';
import AuthModal from '@/components/khan/AuthModal';
import UserMenu from '@/components/khan/UserMenu';
import ProfileModal from '@/components/khan/ProfileModal';

const Hero3D = dynamic(() => import('@/components/khan/Hero3D'), {
  ssr: false,
  loading: () => (
    <div className="flex aspect-square w-full max-w-[460px] items-center justify-center mx-auto">
      <div className="h-40 w-40 animate-pulse rounded-full border border-[var(--khan-line)] bg-[radial-gradient(circle,rgba(201,162,75,.2),transparent_70%)]" />
    </div>
  ),
});

const NAV = [
  { id: 'crypto', label: 'Crypto' },
  { id: 'stocks', label: 'Stocks' },
  { id: 'khan-ai', label: 'Khan AI' },
  { id: 'planner', label: 'Planner' },
  { id: 'support', label: 'Support' },
];

function Site() {
  const { user, loading } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');
  const [profileOpen, setProfileOpen] = useState(false);
  const [pendingQ, setPendingQ] = useState<string | null>(null);

  const openAuth = (mode: 'signin' | 'signup') => {
    setAuthMode(mode);
    setAuthOpen(true);
  };

  const askKhan = (q: string) => {
    setPendingQ(q);
    document.getElementById('khan-ai')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="khan-root min-h-screen">
      {/* NAV */}
      <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-[var(--khan-line)] bg-[rgba(10,15,28,0.82)] px-5 py-3 backdrop-blur-md md:px-6" style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
        <a href="#top" className="font-display-khan flex items-center gap-2.5 text-[20px] font-semibold">
          <Image src="/logo.png" alt="KHAN AI logo" width={32} height={32} className="rounded-lg" priority />
          KHAN
          <span className="khan-live-dot ml-0.5" />
        </a>
        <div className="hidden items-center gap-1 md:flex">
          {NAV.map(n => (
            <a key={n.id} href={`#${n.id}`} className="rounded-lg px-3.5 py-2 text-[14px] text-[var(--khan-muted)] transition-colors hover:bg-white/5 hover:text-[var(--khan-text)]">
              {n.label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-2.5">
          <a href={`tel:+91${SUPPORT_PHONE}`} className="font-mono-khan hidden items-center gap-1.5 text-[12.5px] text-[var(--khan-muted)] transition-colors hover:text-[var(--khan-cyan)] lg:flex">
            ☎ {SUPPORT_PHONE}
          </a>
          {loading ? (
            <div className="h-9 w-24 animate-pulse rounded-[10px] bg-[var(--khan-surface-2)]" />
          ) : user ? (
            <UserMenu onEditProfile={() => setProfileOpen(true)} />
          ) : (
            <>
              <button onClick={() => openAuth('signin')} className="khan-btn-ghost px-4 py-2 text-[14px] font-semibold">Log in</button>
              <button onClick={() => openAuth('signup')} className="khan-btn-gold px-4 py-2 text-[14px]">Sign up free</button>
            </>
          )}
        </div>
      </nav>

      <Ticker />

      {/* HERO */}
      <header id="top" className="mx-auto grid w-full max-w-[1180px] items-center gap-10 px-6 pb-10 pt-14 md:grid-cols-[1.1fr_1fr] md:pt-20">
        <div>
          <p className="font-mono-khan mb-4 text-[13px] text-[var(--khan-cyan)]">
            {user ? `WELCOME BACK · ${user.name.toUpperCase()}` : 'AI MARKET COMPANION — NOW LIVE WORLDWIDE'}
          </p>
          <h1 className="font-display-khan mb-5 text-[clamp(34px,5vw,54px)] font-semibold leading-[1.06]">
            The AI that <span style={{ color: 'var(--khan-gold)' }}>reads the markets</span> — so you don&apos;t have to guess.
          </h1>
          <p className="mb-8 max-w-[46ch] text-[17px] text-[var(--khan-muted)]">
            KHAN AI analyzes Bitcoin & every major crypto, US & Indian stocks, and trading setups in real time —
            live prices, key levels, bull-vs-bear cases and a verdict with confidence. Create your free account: your
            watchlist, profile and AI history are stored on real servers, forever.
          </p>
          <div className="flex flex-wrap gap-3.5">
            <a href="#khan-ai" className="khan-btn-gold px-7 py-3.5 text-[15px]">Meet KHAN AI ↓</a>
            {!user && (
              <button onClick={() => openAuth('signup')} className="khan-btn-ghost px-7 py-3.5 text-[15px] font-semibold">
                Create free account
              </button>
            )}
            <a href="#support" className="khan-btn-ghost flex items-center gap-2 px-7 py-3.5 text-[15px] font-semibold">
              ☎ Talk to us
            </a>
          </div>
          <div className="font-mono-khan mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[11.5px] text-[var(--khan-muted)]">
            <span>✓ REAL accounts on real servers</span>
            <span>✓ bcrypt-hashed passwords</span>
            <span>✓ Live crypto + stocks feed</span>
            <span>✓ 24×7 human support</span>
          </div>
        </div>
        <div className="orb-shell">
          <Hero3D />
          <p className="font-mono-khan mt-2 text-center text-[12px] text-[var(--khan-cyan)]">
            LIVE 3D · BITCOIN & THE CRYPTO SYSTEM — move your mouse to steer
          </p>
        </div>
      </header>

      {/* TRUST STRIP */}
      <div className="mx-auto w-full max-w-[1180px] px-6 pb-4">
        <div className="khan-card grid grid-cols-2 divide-x divide-[var(--khan-line)] md:grid-cols-4 [&>*:nth-child(-n+2)]:border-b md:[&>*:nth-child(-n+2)]:border-b-0 [&>*]:border-[var(--khan-line)]">
          {[
            { n: '20+', l: 'Cryptocurrencies tracked live' },
            { n: '26+', l: 'Stocks & 6 indices covered' },
            { n: '24×7', l: 'Customer care: ' + SUPPORT_PHONE },
            { n: '100%', l: 'Real login & data storage' },
          ].map(s => (
            <div key={s.l} className="p-5 text-center">
              <div className="font-display-khan text-[24px] font-semibold" style={{ color: 'var(--khan-gold)' }}>{s.n}</div>
              <div className="mt-1 text-[12px] text-[var(--khan-muted)]">{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTIONS */}
      <CryptoSection onAskKhan={askKhan} />
      <StockSection onAskKhan={askKhan} />
      <KhanChat pendingQuestion={pendingQ} onPendingConsumed={() => setPendingQ(null)} />
      <Planner />
      <CustomerCare />

      {/* FOOTER */}
      <footer className="mt-auto border-t border-[var(--khan-line)] bg-[var(--khan-surface)] pb-[max(20px,env(safe-area-inset-bottom))]">
        <div className="mx-auto grid w-full max-w-[1180px] gap-8 px-6 py-12 md:grid-cols-3">
          <div>
            <div className="font-display-khan mb-3 flex items-center gap-2 text-[18px] font-semibold">
              <Image src="/logo.png" alt="KHAN AI logo" width={28} height={28} className="rounded-lg" />
              KHAN
            </div>
            <p className="max-w-[34ch] text-[13px] leading-relaxed text-[var(--khan-muted)]">
              The AI market companion for Bitcoin, crypto, stocks and trading — built to make market intelligence accessible to everyone.
            </p>
          </div>
          <div>
            <div className="font-mono-khan mb-3 text-[11px] tracking-[2px] text-[var(--khan-cyan)]">EXPLORE</div>
            <div className="grid grid-cols-2 gap-2 text-[13.5px]">
              {NAV.map(n => (
                <a key={n.id} href={`#${n.id}`} className="text-[var(--khan-muted)] hover:text-[var(--khan-cyan)]">{n.label}</a>
              ))}
            </div>
          </div>
          <div>
            <div className="font-mono-khan mb-3 text-[11px] tracking-[2px] text-[var(--khan-cyan)]">CUSTOMER CARE</div>
            <div className="space-y-2 text-[13.5px] text-[var(--khan-muted)]">
              <a href={`tel:+91${SUPPORT_PHONE}`} className="block hover:text-[var(--khan-gold)]">☎ {SUPPORT_PHONE}</a>
              <a href={`mailto:${SUPPORT_EMAIL}`} className="block break-all hover:text-[var(--khan-cyan)]">✉ {SUPPORT_EMAIL}</a>
              <p>Available 24 × 7 · Hindi / English / Telugu</p>
            </div>
          </div>
        </div>
        <div className="border-t border-[var(--khan-line)] px-6 py-5 text-center font-mono-khan text-[11px] leading-relaxed text-[var(--khan-muted)]">
          © {new Date().getFullYear()} KHAN · All rights reserved · Made for the world
          <br />
          Education & analysis only — not investment advice. Crypto is volatile; never invest more than you can afford to lose.
        </div>
      </footer>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} initialMode={authMode} />
      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
}

export default function Page() {
  return (
    <AuthProvider>
      <Site />
    </AuthProvider>
  );
}
