'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * KHAN ADMIN — USER METRICS DASHBOARD (/admin)
 *
 * Reachable ONLY by emails listed in ADMIN_EMAILS (middleware 404s everyone
 * else before this page even renders, and the API re-checks on its own).
 *
 * Shows: registered totals, active users (now / daily / weekly / monthly),
 * engagement depth, recent signups and the most recently active accounts.
 */

interface Metrics {
  generatedAt: string;
  totals: {
    users: number;
    newUsers1d: number;
    newUsers7d: number;
    newUsers30d: number;
    everLoggedIn: number;
    neverLoggedIn: number;
  };
  activity: { activeNow: number; active1d: number; active7d: number; active30d: number };
  engagement: {
    withWatchlist: number;
    withChats: number;
    totalChatMessages: number;
    totalWatchlistItems: number;
  };
  recentSignups: Array<{
    email: string;
    name: string;
    createdAt: string;
    lastLoginAt: string | null;
    lastSeenAt: string | null;
    watchlistCount: number;
    chatCount: number;
  }>;
  mostActive: Array<{
    email: string;
    name: string;
    lastSeenAt: string | null;
    lastLoginAt: string | null;
    watchlistCount: number;
    chatCount: number;
  }>;
}

const CARD =
  'rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur transition hover:border-[#f5c451]/40';
const LABEL = 'text-[11px] uppercase tracking-[0.18em] text-white/40';
const NUM = 'mt-2 font-mono text-4xl font-bold text-white';

function fmt(n: number | null | undefined, dash = '—') {
  return n === null || n === undefined ? dash : n.toLocaleString('en-IN');
}

function when(iso: string | null) {
  if (!iso) return 'never';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 90) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}

export default function AdminMetricsPage() {
  const [data, setData] = useState<Metrics | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/metrics', { cache: 'no-store' });
      if (!res.ok) {
        setError(res.status === 404 ? 'Not authorized.' : 'Failed to load metrics.');
        setData(null);
      } else {
        setData(await res.json());
        setError('');
      }
    } catch {
      setError('Network error.');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000); // auto-refresh every minute
    return () => clearInterval(t);
  }, [load]);

  const t = data?.totals;
  const a = data?.activity;
  const e = data?.engagement;

  return (
    <main className="min-h-screen bg-[#0a0e1a] px-6 py-10 text-white md:px-12">
      <div className="mx-auto max-w-5xl">
        <header className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#f5c451]">
              KHAN · Admin
            </p>
            <h1 className="mt-1 text-3xl font-bold md:text-4xl">User Metrics</h1>
            <p className="mt-2 text-sm text-white/50">
              {data
                ? `Live snapshot · generated ${new Date(data.generatedAt).toLocaleTimeString()} · auto-refreshes every 60 s`
                : 'Loading live snapshot…'}
            </p>
          </div>
          <button
            onClick={load}
            disabled={busy}
            className="rounded-xl bg-[#f5c451] px-5 py-2.5 text-sm font-semibold text-black transition hover:brightness-110 disabled:opacity-50"
          >
            {busy ? 'Refreshing…' : 'Refresh now'}
          </button>
        </header>

        {error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-300">
            {error} This area only opens for ADMIN_EMAILS accounts.
          </div>
        )}

        {data && (
          <>
            <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className={CARD}>
                <p className={LABEL}>Registered users</p>
                <p className={NUM}>{fmt(t?.users)}</p>
                <p className="mt-2 text-xs text-white/40">all-time accounts</p>
              </div>
              <div className={CARD}>
                <p className={LABEL}>New today</p>
                <p className={NUM}>{fmt(t?.newUsers1d)}</p>
                <p className="mt-2 text-xs text-white/40">+{fmt(t?.newUsers7d)} this week · +{fmt(t?.newUsers30d)} this month</p>
              </div>
              <div className={CARD}>
                <p className={LABEL}>Active right now</p>
                <p className={NUM}>{fmt(a?.activeNow)}</p>
                <p className="mt-2 text-xs text-white/40">seen in last 15 min</p>
              </div>
              <div className={CARD}>
                <p className={LABEL}>Active today</p>
                <p className={NUM}>{fmt(a?.active1d)}</p>
                <p className="mt-2 text-xs text-white/40">logged in / loaded a page in 24 h</p>
              </div>
              <div className={CARD}>
                <p className={LABEL}>Weekly active</p>
                <p className={NUM}>{fmt(a?.active7d)}</p>
                <p className="mt-2 text-xs text-white/40">WAU — last 7 days</p>
              </div>
              <div className={CARD}>
                <p className={LABEL}>Monthly active</p>
                <p className={NUM}>{fmt(a?.active30d)}</p>
                <p className="mt-2 text-xs text-white/40">MAU — last 30 days</p>
              </div>
              <div className={CARD}>
                <p className={LABEL}>Ever logged in</p>
                <p className={NUM}>{fmt(t?.everLoggedIn)}</p>
                <p className="mt-2 text-xs text-white/40">{fmt(t?.neverLoggedIn)} never signed in</p>
              </div>
              <div className={CARD}>
                <p className={LABEL}>Used AI chat</p>
                <p className={NUM}>{fmt(e?.withChats)}</p>
                <p className="mt-2 text-xs text-white/40">{fmt(e?.totalChatMessages)} messages total · {fmt(e?.withWatchlist)} with watchlist</p>
              </div>
            </section>

            <section className="mt-10 grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                <h2 className="mb-4 text-lg font-semibold">Most recently active</h2>
                <ul className="space-y-3">
                  {data.mostActive.length === 0 && (
                    <li className="text-sm text-white/40">No heartbeat data yet.</li>
                  )}
                  {data.mostActive.map((u) => (
                    <li key={u.email} className="flex items-center justify-between gap-3 border-b border-white/5 pb-3 last:border-0">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{u.name}</p>
                        <p className="truncate text-xs text-white/40">{u.email}</p>
                      </div>
                      <div className="text-right text-xs">
                        <p className="text-emerald-400">{when(u.lastSeenAt)}</p>
                        <p className="text-white/40">login {when(u.lastLoginAt)} · ★{u.watchlistCount} · 💬{u.chatCount}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                <h2 className="mb-4 text-lg font-semibold">Recent signups</h2>
                <ul className="space-y-3">
                  {data.recentSignups.map((u) => (
                    <li key={u.email} className="flex items-center justify-between gap-3 border-b border-white/5 pb-3 last:border-0">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{u.name}</p>
                        <p className="truncate text-xs text-white/40">{u.email}</p>
                      </div>
                      <div className="text-right text-xs">
                        <p className="text-[#f5c451]">{new Date(u.createdAt).toLocaleDateString()}</p>
                        <p className="text-white/40">login {when(u.lastLoginAt)} · ★{u.watchlistCount} · 💬{u.chatCount}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <p className="mt-10 text-xs leading-relaxed text-white/30">
              Definitions — Registered: accounts in the database. Active: unique users with a
              sign-in or page heartbeat inside the window (heartbeat refreshes at most once per
              5 minutes). Engagement: users with at least one watchlist item or AI chat message.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
