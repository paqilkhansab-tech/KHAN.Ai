import { NextResponse } from 'next/server';
import { STOCK_BASELINES, INDICES, StockAsset } from '@/lib/market-data';

export interface StockQuote extends StockAsset {
  spark: number[];
  open: number;
  dayHigh: number;
  dayLow: number;
}

export interface StockResponse {
  stocks: StockQuote[];
  indices: (typeof INDICES)[number] & { spark: number[] }[];
  source: 'simulated';
  note: string;
  sessions: { us: 'open' | 'closed'; india: 'open' | 'closed'; utc: string };
}

// Deterministic intraday drift so numbers move smoothly between polls but stay realistic.
function drift(base: number, seed: number, minutes: number) {
  const wave = Math.sin((seed * 7919 + minutes) / 41) * 0.0035 + Math.sin((seed * 104729 + minutes) / 13) * 0.002;
  return base * (1 + wave);
}

// Deterministic 32-point intraday path ending at the current price.
function sparkline(seed: number, end: number, changePct: number): number[] {
  const start = end / (1 + changePct / 100);
  let s = seed * 2654435761 % 233280;
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  const pts: number[] = [];
  for (let i = 0; i < 32; i++) {
    const t = i / 31;
    const base = start + (end - start) * t;
    const noise = (rnd() - 0.5) * end * 0.005;
    pts.push(+(base + noise).toFixed(end < 10 ? 5 : 2));
  }
  pts[31] = +end.toFixed(end < 10 ? 5 : 2);
  return pts;
}

// Approximate market sessions (UTC). US cash: 13:30-20:00 UTC; NSE/BSE: 03:45-10:00 UTC; Mon-Fri.
function sessionState(offsetMin: number, lenMin: number) {
  const now = new Date();
  const day = now.getUTCDay();
  const mins = now.getUTCHours() * 60 + now.getUTCMinutes();
  if (day === 0 || day === 6) return 'closed' as const;
  return mins >= offsetMin && mins < offsetMin + lenMin ? ('open' as const) : ('closed' as const);
}

export async function GET() {
  const minutes = Math.floor(Date.now() / 60000);
  const stocks: StockQuote[] = STOCK_BASELINES.map((s, i) => {
    const price = +drift(s.price, i + 1, minutes).toFixed(s.price < 10 ? 4 : 2);
    const changePct = +(s.changePct + (drift(0, i + 3, minutes) * 100)).toFixed(2);
    const open = +(price / (1 + changePct / 100)).toFixed(2);
    const spark = sparkline(i + 11, price, changePct);
    return {
      ...s,
      price,
      changePct,
      spark,
      open,
      dayHigh: +Math.max(...spark).toFixed(2),
      dayLow: +Math.min(...spark).toFixed(2),
    };
  });
  const indices = INDICES.map((ix, i) => {
    const price = +drift(ix.price, i + 50, minutes).toFixed(2);
    const changePct = +(ix.changePct + (drift(0, i + 8, minutes) * 100)).toFixed(2);
    return { ...ix, price, changePct, spark: sparkline(i + 61, price, changePct) };
  });
  const body: StockResponse = {
    stocks,
    indices,
    source: 'simulated',
    note: 'Equity quotes are simulation-grade reference feeds for education. Connect a licensed broker/exchange data API for live trading.',
    sessions: {
      us: sessionState(13 * 60 + 30, 390),
      india: sessionState(3 * 60 + 45, 375),
      utc: new Date().toUTCString(),
    },
  };
  return NextResponse.json(body);
}
