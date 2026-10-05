'use client';

import { useEffect, useState } from 'react';
import { useAuth } from './AuthProvider';

export interface CryptoAsset {
  id: string;
  symbol: string;
  name: string;
  image: string;
  price: number;
  change24h: number;
  marketCap: number;
  volume24h: number;
  rank: number;
  about: string;
  tags: string[];
}

/* ------------------------------------------------------------------ */
/* SHARED MARKET FEED STORE — performance fix                          */
/* Ticker, CryptoSection and StockSection used to each run their own   */
/* fetch + interval (2x network churn). Every consumer now shares one  */
/* TTL-cached request per feed: the first caller triggers the fetch,   */
/* everyone else reuses the in-flight/cached result.                   */
/* ------------------------------------------------------------------ */
function createFeed<T>(url: string, ttlMs: number) {
  let data: T | null = null;
  let ts = 0;
  let inflight: Promise<T | null> | null = null;

  async function load(): Promise<T | null> {
    if (data && Date.now() - ts < ttlMs) return data; // fresh cache
    if (inflight) return inflight; // dedupe concurrent callers
    inflight = (async () => {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        const json = await res.json();
        data = json as T;
        ts = Date.now();
        return data;
      } catch {
        return data; // keep old data on failure
      } finally {
        inflight = null;
      }
    })();
    return inflight;
  }

  return function useFeed(): T | null {
    const [state, setState] = useState<T | null>(data);
    useEffect(() => {
      let alive = true;
      load().then(d => {
        if (alive && d) setState(d);
      });
      const t = setInterval(() => {
        load().then(d => {
          if (alive && d) setState(d);
        });
      }, ttlMs);
      return () => {
        alive = false;
        clearInterval(t);
      };
    }, []);
    return state;
  };
}

const useCryptoStore = createFeed<{ assets: CryptoAsset[]; source: 'live' | 'fallback' }>(
  '/api/market/crypto',
  90_000
);

export function useCryptoFeed() {
  const data = useCryptoStore();
  return { assets: data?.assets ?? [], source: data?.source ?? ('fallback' as const) };
}

/** Full quote shape served by /api/market/stocks (superset of the ticker chip). */
interface FullStockItem extends StockFeedItem {
  sector: string;
  volume: string;
  about: string;
  spark: number[];
  open: number;
  dayHigh: number;
  dayLow: number;
}
interface StockFeedResponse {
  stocks: FullStockItem[];
  indices: IndexFeedItem[];
  sessions: { us: 'open' | 'closed'; india: 'open' | 'closed'; utc: string };
  note: string;
}
interface IndexFeedItem {
  symbol: string;
  name: string;
  price: number;
  changePct: number;
  spark: number[];
  [k: string]: unknown;
}
const useStockStore = createFeed<StockFeedResponse>('/api/market/stocks', 60_000);

export function useStockFeed() {
  const data = useStockStore();
  return data?.stocks ?? [];
}

/** Full stock response (stocks + indices + sessions) — used by StockSection. */
export function useStockDetail() {
  const data = useStockStore();
  return {
    stocks: data?.stocks ?? [],
    indices: (data?.indices ?? []) as IndexFeedItem[],
    sessions: data?.sessions ?? null,
    note: data?.note ?? '',
  };
}

export interface StockFeedItem {
  symbol: string;
  name: string;
  price: number;
  changePct: number;
  currency: 'USD' | 'INR';
  market: 'US' | 'IN';
}

export function fmtStockPrice(n: number, currency: 'USD' | 'INR'): string {
  const v = n >= 1000
    ? n.toLocaleString(currency === 'INR' ? 'en-IN' : 'en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 })
    : n.toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
  return currency === 'INR' ? '₹' + v : '$' + v;
}

const COLORS = ['#F7931A', '#627EEA', '#26A17B', '#F3BA2F', '#9945FF', '#23292F', '#00A4E4', '#0033AD', '#C2A633', '#2A5ADA', '#E84142', '#FFA409', '#E6007A', '#8247E5', '#345D9D', '#FF007A', '#EC1E24', '#000000', '#2E3148', '#40AF49'];

export function CoinBadge({ symbol, size = 34 }: { symbol: string; size?: number }) {
  const idx = symbol ? symbol.charCodeAt(0) % COLORS.length : 0;
  const color = COLORS[idx] || '#F7931A';
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full font-bold"
      style={{
        width: size,
        height: size,
        background: `${color}22`,
        border: `1px solid ${color}55`,
        color,
        fontSize: Math.max(10, size * 0.34),
      }}
      aria-hidden
    >
      {symbol ? symbol.slice(0, 2).toUpperCase() : '?'}
    </span>
  );
}

export function fmtPrice(n: number): string {
  if (n >= 1000) return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (n >= 1) return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (n >= 0.01) return '$' + n.toFixed(4);
  return '$' + n.toFixed(8);
}

export function fmtBig(n: number): string {
  if (n >= 1e12) return '$' + (n / 1e12).toFixed(2) + 'T';
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  return '$' + Math.round(n).toLocaleString();
}

export function ChangeTag({ value, className = '' }: { value: number; className?: string }) {
  const up = value >= 0;
  return (
    <span
      className={`font-mono-khan rounded-md px-2 py-0.5 text-xs font-bold ${className}`}
      style={{ color: up ? 'var(--khan-up)' : 'var(--khan-down)', background: up ? 'rgba(63,191,127,.1)' : 'rgba(229,88,107,.1)' }}
    >
      {up ? '▲ +' : '▼ '}
      {value.toFixed(2)}%
    </span>
  );
}

export default function Ticker() {
  const { assets, source } = useCryptoFeed();
  const stocks = useStockFeed();
  const { user } = useAuth();

  if (!assets.length && !stocks.length) {
    return (
      <div className="flex h-[58px] items-center border-b border-[var(--khan-line)] bg-[var(--khan-surface)] px-6 font-mono-khan text-sm text-[var(--khan-muted)]">
        <span className="khan-live-dot mr-3" /> Connecting to live market feed…
      </div>
    );
  }

  type Chip =
    | { kind: 'crypto'; id: string; symbol: string; name: string; price: number; change: number }
    | { kind: 'stock'; id: string; symbol: string; name: string; price: number; change: number; currency: 'USD' | 'INR'; market: 'US' | 'IN' };
  const all: Chip[] = [
    ...assets.map(a => ({ kind: 'crypto' as const, id: a.id, symbol: a.symbol, name: a.name, price: a.price, change: a.change24h })),
    ...stocks.map(s => ({ kind: 'stock' as const, id: s.symbol, symbol: s.symbol, name: s.name, price: s.price, change: s.changePct, currency: s.currency, market: s.market })),
  ];
  const chips = [...all, ...all]; // duplicate for seamless loop

  return (
    <div className="relative z-40 flex h-[58px] items-center border-b border-[var(--khan-line)] bg-gradient-to-b from-[var(--khan-surface)] to-[#0d1729] shadow-[0_6px_18px_-10px_rgba(0,0,0,0.6)]" title={source === 'live' ? 'Live crypto from CoinGecko · equities are reference feed' : 'Reference feed — live source temporarily unreachable'}>
      <div className="flex h-full shrink-0 items-center gap-2 border-r border-[var(--khan-line)] px-4 font-mono-khan text-[11px] tracking-wider text-[var(--khan-cyan)]">
        <span className="khan-live-dot" />
        LIVE MARKETS
      </div>
      <div className="khan-scroll h-full flex-1 overflow-hidden" style={{ perspective: '340px' }}>
        <div className="khan-ticker-row h-full" style={{ transform: 'rotateX(10deg)' }}>
          {chips.map((c, i) => (
            <a
              key={`${c.kind}-${c.id}-${i}`}
              href={c.kind === 'crypto' ? '#crypto' : '#stocks'}
              className="flex h-full items-center gap-2.5 border-r border-[var(--khan-line)] px-6 font-mono-khan text-[14.5px] whitespace-nowrap text-[var(--khan-text)] transition-colors hover:bg-white/5"
              style={{ textShadow: '0 2px 4px rgba(0,0,0,.5)' }}
            >
              {c.kind === 'crypto' ? (
                <CoinBadge symbol={c.symbol} size={22} />
              ) : (
                <span
                  className="flex shrink-0 items-center justify-center rounded-md font-bold"
                  style={{
                    width: 22, height: 22,
                    background: c.market === 'IN' ? 'rgba(201,162,75,.14)' : 'rgba(63,224,208,.12)',
                    border: c.market === 'IN' ? '1px solid rgba(201,162,75,.45)' : '1px solid rgba(63,224,208,.4)',
                    color: c.market === 'IN' ? '#C9A24B' : '#3FE0D0',
                    fontSize: 8.5,
                  }}
                  aria-hidden
                >
                  {c.market}
                </span>
              )}
              <b>{c.symbol.toUpperCase()}</b>
              <span className="text-[var(--khan-muted)]">
                {c.kind === 'crypto' ? fmtPrice(c.price) : fmtStockPrice(c.price, c.currency)}
              </span>
              <ChangeTag value={c.change} />
            </a>
          ))}
        </div>
      </div>
      {user && (
        <div className="hidden h-full shrink-0 items-center border-l border-[var(--khan-line)] px-4 font-mono-khan text-[11px] text-[var(--khan-gold)] md:flex">
          ★ {user.name.split(' ')[0].toUpperCase()}
        </div>
      )}
    </div>
  );
}
