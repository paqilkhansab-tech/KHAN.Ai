'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Activity, Search, Star, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from './AuthProvider';
import { useStockFeed, fmtStockPrice, ChangeTag } from './Ticker';
import { StockBuyLinks } from './BuyLinks';

interface StockAsset {
  symbol: string; name: string; sector: string; price: number; changePct: number; volume: string;
  currency: 'USD' | 'INR'; market: 'US' | 'IN'; about: string;
  spark: number[]; open: number; dayHigh: number; dayLow: number;
}
interface IndexAsset {
  symbol: string; name: string; price: number; changePct: number; spark: number[];
}

/* ---------- sparkline ---------- */
function Spark({ points, up }: { points: number[]; up: boolean }) {
  if (!points?.length) return null;
  const w = 96, h = 30;
  const min = Math.min(...points), max = Math.max(...points);
  const range = max - min || 1;
  const step = w / (points.length - 1);
  const d = points.map((p, i) => `${(i * step).toFixed(1)},${(h - ((p - min) / range) * (h - 4) - 2).toFixed(1)}`);
  const color = up ? 'var(--khan-up)' : 'var(--khan-down)';
  const gid = `sg-${up ? 'u' : 'd'}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0" aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${d.join(' ')} ${w},${h}`} fill={`url(#${gid})`} />
      <polyline points={d.join(' ')} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/* ---------- market session chip ---------- */
function SessionChip({ label, state }: { label: string; state: 'open' | 'closed' }) {
  return (
    <span
      className="font-mono-khan flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px]"
      style={{
        borderColor: state === 'open' ? 'rgba(63,191,127,.4)' : 'var(--khan-line)',
        color: state === 'open' ? 'var(--khan-up)' : 'var(--khan-muted)',
        background: state === 'open' ? 'rgba(63,191,127,.08)' : 'transparent',
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: state === 'open' ? 'var(--khan-up)' : 'var(--khan-muted)' }} />
      {label} {state === 'open' ? 'OPEN' : 'CLOSED'}
    </span>
  );
}

export default function StockSection({ onAskKhan }: { onAskKhan: (q: string) => void }) {
  const { user, watchlist, saveToWatchlist, removeFromWatchlist } = useAuth();
  const [stocks, setStocks] = useState<StockAsset[]>([]);
  const [indices, setIndices] = useState<IndexAsset[]>([]);
  const [sessions, setSessions] = useState<{ us: 'open' | 'closed'; india: 'open' | 'closed' } | null>(null);
  const [note, setNote] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'us' | 'india' | 'gainers' | 'losers' | 'watch'>('all');

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch('/api/market/stocks', { cache: 'no-store' });
        const data = await res.json();
        if (!alive) return;
        setStocks(data.stocks || []);
        setIndices(data.indices || []);
        setSessions(data.sessions || null);
        setNote(data.note || '');
      } catch { /* keep */ }
    };
    load();
    const t = setInterval(load, 30_000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  const watchStocks = useMemo(() => watchlist.filter(w => w.kind === 'stock'), [watchlist]);

  const filtered = useMemo(() => {
    let list = stocks;
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(a => a.name.toLowerCase().includes(q) || a.symbol.toLowerCase().includes(q) || a.sector.toLowerCase().includes(q));
    }
    if (filter === 'us') list = list.filter(a => a.market === 'US');
    if (filter === 'india') list = list.filter(a => a.market === 'IN');
    if (filter === 'gainers') list = [...list].filter(a => a.changePct > 0).sort((a, b) => b.changePct - a.changePct);
    if (filter === 'losers') list = [...list].filter(a => a.changePct < 0).sort((a, b) => a.changePct - b.changePct);
    if (filter === 'watch') list = list.filter(a => watchlist.some(w => w.symbol === a.symbol));
    return list;
  }, [stocks, query, filter, watchlist]);

  const topGainer = useMemo(() => stocks.length ? [...stocks].sort((a, b) => b.changePct - a.changePct)[0] : null, [stocks]);
  const topLoser = useMemo(() => stocks.length ? [...stocks].sort((a, b) => a.changePct - b.changePct)[0] : null, [stocks]);

  const toggleWatch = async (s: StockAsset) => {
    if (!user) {
      toast.error('Create a free account to save stocks to your watchlist.');
      return;
    }
    const saved = watchlist.some(w => w.symbol === s.symbol);
    if (saved) {
      await removeFromWatchlist(s.symbol);
      toast.success(`${s.name} removed from watchlist.`);
    } else {
      const ok = await saveToWatchlist(s.symbol, s.name, 'stock');
      if (ok) toast.success(`★ ${s.name} saved to your watchlist.`);
      else toast.error('Could not save — try again.');
    }
  };

  const chg = (v: number) => ({ color: v >= 0 ? 'var(--khan-up)' : 'var(--khan-down)' });

  return (
    <section id="stocks" className="mx-auto w-full max-w-[1180px] px-6 py-16">
      <div className="mb-8 max-w-[62ch]">
        <p className="font-mono-khan mb-3 text-[13px] text-[var(--khan-cyan)]">STOCK MARKET DESK — US &amp; INDIA</p>
        <h2 className="font-display-khan mb-3 text-[30px] font-semibold leading-tight">
          Apple, NVIDIA, Tesla, Reliance, TCS… <span style={{ color: 'var(--khan-gold)' }}>stocks decoded by KHAN</span>
        </h2>
        <p className="text-[15px] text-[var(--khan-muted)]">
          26 mega-caps across Wall Street and Dalal Street — live intraday charts, day ranges, watchlist stars and
          KHAN AI ready to break down any ticker into fundamentals, technicals and a trading plan.
        </p>
      </div>

      {/* sessions + top movers */}
      <div className="khan-card mb-6 flex flex-wrap items-center gap-x-8 gap-y-4 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <SessionChip label="🇺🇸 US" state={sessions?.us ?? 'closed'} />
          <SessionChip label="🇮🇳 INDIA" state={sessions?.india ?? 'closed'} />
        </div>
        {topGainer && (
          <div className="flex items-center gap-2.5 text-[13px]">
            <span className="font-mono-khan text-[10.5px] tracking-wider text-[var(--khan-muted)]">TOP GAINER</span>
            <b>{topGainer.symbol}</b>
            <span className="font-mono-khan" style={chg(topGainer.changePct)}>
              {fmtStockPrice(topGainer.price, topGainer.currency)} · +{topGainer.changePct.toFixed(2)}%
            </span>
          </div>
        )}
        {topLoser && (
          <div className="flex items-center gap-2.5 text-[13px]">
            <span className="font-mono-khan text-[10.5px] tracking-wider text-[var(--khan-muted)]">TOP LOSER</span>
            <b>{topLoser.symbol}</b>
            <span className="font-mono-khan" style={chg(topLoser.changePct)}>
              {fmtStockPrice(topLoser.price, topLoser.currency)} · {topLoser.changePct.toFixed(2)}%
            </span>
          </div>
        )}
      </div>

      {/* indices strip */}
      <div className="khan-scroll mb-6 flex gap-3 overflow-x-auto pb-1">
        {indices.map(ix => (
          <div key={ix.symbol} className="khan-card flex min-w-[210px] flex-1 flex-col gap-1 p-4">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold">{ix.name}</span>
              <Activity size={14} style={chg(ix.changePct)} />
            </div>
            <div className="flex items-end justify-between gap-2">
              <div>
                <div className="font-mono-khan text-[19px]">{ix.price.toLocaleString('en-IN')}</div>
                <div className="font-mono-khan text-[12px] font-bold" style={chg(ix.changePct)}>
                  {ix.changePct >= 0 ? '▲ +' : '▼ '}{ix.changePct.toFixed(2)}% today
                </div>
              </div>
              <Spark points={ix.spark} up={ix.changePct >= 0} />
            </div>
          </div>
        ))}
      </div>

      {/* controls */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="khan-card-2 flex min-w-[220px] flex-1 items-center gap-2 rounded-[10px] px-3">
          <Search size={16} className="text-[var(--khan-muted)]" />
          <input
            className="w-full bg-transparent py-2.5 text-sm text-[var(--khan-text)] outline-none placeholder:text-[var(--khan-muted)]"
            placeholder="Search NVIDIA, Reliance, banks, EV…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            aria-label="Search stocks"
          />
          {query && (
            <button onClick={() => setQuery('')} aria-label="Clear search">
              <X size={15} className="text-[var(--khan-muted)] hover:text-white" />
            </button>
          )}
        </div>
        {(['all', 'us', 'india', 'gainers', 'losers', 'watch'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="rounded-lg border px-4 py-2 text-[13px] font-semibold capitalize transition-colors"
            style={{
              borderColor: filter === f ? 'var(--khan-cyan)' : 'var(--khan-line)',
              color: filter === f ? 'var(--khan-cyan)' : 'var(--khan-muted)',
              background: filter === f ? 'rgba(63,224,208,.08)' : 'transparent',
            }}
          >
            {f === 'watch' ? `★ watchlist${user ? ` (${watchStocks.length})` : ''}` : f === 'us' ? '🇺🇸 US' : f === 'india' ? '🇮🇳 India' : f}
          </button>
        ))}
      </div>

      {/* grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map(s => {
          const open = expanded === s.symbol;
          const watched = watchlist.some(w => w.symbol === s.symbol);
          return (
            <article key={s.symbol} className="khan-card p-5 transition-colors hover:border-[#33436a]">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <div className="text-[15px] font-semibold">{s.name}</div>
                  <div className="font-mono-khan text-[11px] text-[var(--khan-muted)]">
                    <span style={{ color: s.market === 'IN' ? '#C9A24B' : '#3FE0D0' }}>{s.market}</span> · {s.symbol} · {s.sector}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleWatch(s)}
                    aria-label={watched ? 'Remove from watchlist' : 'Add to watchlist'}
                    className="rounded-md p-1.5 transition-colors hover:bg-white/10"
                    style={{ color: watched ? 'var(--khan-gold)' : 'var(--khan-muted)' }}
                  >
                    <Star size={16} fill={watched ? 'currentColor' : 'none'} />
                  </button>
                  <ChangeTag value={s.changePct} />
                </div>
              </div>
              <div className="mb-2 flex items-end justify-between gap-2">
                <div>
                  <div className="font-mono-khan text-[22px]">
                    {fmtStockPrice(s.price, s.currency)}
                  </div>
                  <div className="font-mono-khan mt-0.5 text-[11px] text-[var(--khan-muted)]">
                    Vol {s.volume} · O {fmtStockPrice(s.open, s.currency)}
                  </div>
                </div>
                <Spark points={s.spark} up={s.changePct >= 0} />
              </div>
              {open && (
                <div className="mb-3 border-t border-[var(--khan-line)] pt-3">
                  <p className="mb-3 text-[13px] leading-relaxed text-[var(--khan-muted)]">{s.about}</p>
                  <div className="font-mono-khan mb-3 grid grid-cols-3 gap-2 text-[11px]">
                    <div className="khan-card-2 rounded-lg p-2">
                      <div className="text-[9.5px] text-[var(--khan-muted)]">OPEN</div>
                      <div>{fmtStockPrice(s.open, s.currency)}</div>
                    </div>
                    <div className="khan-card-2 rounded-lg p-2">
                      <div className="text-[9.5px] text-[var(--khan-muted)]">DAY HIGH</div>
                      <div style={chg(s.changePct >= 0)}>{fmtStockPrice(s.dayHigh, s.currency)}</div>
                    </div>
                    <div className="khan-card-2 rounded-lg p-2">
                      <div className="text-[9.5px] text-[var(--khan-muted)]">DAY LOW</div>
                      <div style={chg(s.changePct < 0)}>{fmtStockPrice(s.dayLow, s.currency)}</div>
                    </div>
                  </div>
                  <div className="mb-3">
                    <StockBuyLinks symbol={s.symbol} name={s.name} market={s.market} />
                  </div>
                  <button
                    onClick={() => onAskKhan(`Full trading analysis of ${s.name} (${s.symbol}): technical picture, key levels, fundamentals, bull vs bear case and a verdict with confidence.`)}
                    className="khan-btn-cyan w-full py-2.5 text-sm"
                  >
                    Ask KHAN AI to analyze {s.symbol} →
                  </button>
                </div>
              )}
              <button onClick={() => setExpanded(open ? null : s.symbol)} className="font-mono-khan flex items-center gap-1 text-[12px] text-[var(--khan-muted)] hover:text-[var(--khan-cyan)]">
                {open ? 'Hide' : 'Buy / details ↓'} <ArrowUpRight size={13} className={open ? 'rotate-90' : ''} />
              </button>
            </article>
          );
        })}
      </div>

      {!filtered.length && (
        <div className="khan-card p-10 text-center text-[var(--khan-muted)]">
          {filter === 'watch' && !user
            ? 'Sign in and tap the ★ on any stock to build your personal watchlist — it stays saved to your account.'
            : 'No stocks match. Try another search.'}
        </div>
      )}

      {note && (
        <p className="font-mono-khan mt-5 text-[11px] leading-relaxed text-[var(--khan-muted)]">
          ⓘ {note}
        </p>
      )}
    </section>
  );
}
