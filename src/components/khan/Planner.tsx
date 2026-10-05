'use client';

import { useMemo, useState } from 'react';
import { ExternalLink, ShoppingBag } from 'lucide-react';

/**
 * WEALTH PLANNER — "See your future. Then build it."
 * Recommends a 4-asset-class plan (Bitcoin / Altcoins ETH·SOL / Growth stocks /
 * Cash & stablecoins) with the monthly amount per class and DIRECT buy links
 * to regulated on/off-ramp platforms. KHAN never handles money — every Buy
 * button opens the broker/exchange in a new tab.
 */

type BuyLink = { label: string; href: string };

interface AssetClass {
  key: string;
  label: string;
  color: string;
  note: string;
  links: BuyLink[];
}

const BTC: AssetClass = {
  key: 'btc',
  label: 'Bitcoin (BTC)',
  color: '#F7931A',
  note: 'The core hold — deepest liquidity, ETF-backed demand',
  links: [
    { label: 'Binance', href: 'https://www.binance.com/en/trade/BTC_USDT' },
    { label: 'Robinhood', href: 'https://robinhood.com/crypto/BTC' },
    { label: 'CoinDCX · ₹', href: 'https://coindcx.com/trading/BTCUSDT' },
  ],
};

const ALTS: AssetClass = {
  key: 'alts',
  label: 'Altcoins (ETH / SOL)',
  color: '#9945FF',
  note: 'Ethereum & Solana — the two strongest smart-contract networks',
  links: [
    { label: 'ETH · Binance', href: 'https://www.binance.com/en/trade/ETH_USDT' },
    { label: 'SOL · Binance', href: 'https://www.binance.com/en/trade/SOL_USDT' },
    { label: 'ETH · Robinhood', href: 'https://robinhood.com/crypto/ETH' },
  ],
};

const STOCKS: AssetClass = {
  key: 'stocks',
  label: 'Growth stocks',
  color: '#3FE0D0',
  note: 'NVDA · AAPL · MSFT · TSLA — compounding machines with earnings power',
  links: [
    { label: 'NVDA · Robinhood', href: 'https://robinhood.com/stocks/NVDA' },
    { label: 'TSLA · Robinhood', href: 'https://robinhood.com/stocks/TSLA' },
    { label: 'India · Groww', href: 'https://groww.in/search?q=top%20growth%20stocks' },
  ],
};

const CASH: AssetClass = {
  key: 'cash',
  label: 'Cash / stablecoins',
  color: '#8891A6',
  note: 'USDT / USDC — dry powder for dips, earns while you wait',
  links: [
    { label: 'USDC · Binance', href: 'https://www.binance.com/en/trade/USDC_USDT' },
    { label: 'USDC · Coinbase', href: 'https://www.coinbase.com/how-to-buy/usdc' },
    { label: 'USDT · ZebPay ₹', href: 'https://www.zebpay.com/' },
  ],
};

const RISKS: { key: string; label: string; rate: number; blurb: string; alloc: Array<[string, number]> }[] = [
  {
    key: 'safe',
    label: 'Safe',
    rate: 8,
    blurb: 'Heavy cash cushion, small crypto satellite',
    alloc: [['btc', 25], ['alts', 10], ['stocks', 25], ['cash', 40]],
  },
  {
    key: 'balanced',
    label: 'Balanced',
    rate: 14,
    blurb: 'The classic 50/50 — crypto engine, stock ballast',
    alloc: [['btc', 30], ['alts', 20], ['stocks', 35], ['cash', 15]],
  },
  {
    key: 'degen',
    label: 'Aggressive',
    rate: 24,
    blurb: 'Max crypto exposure, altcoin-heavy, thin cash',
    alloc: [['btc', 30], ['alts', 40], ['stocks', 25], ['cash', 5]],
  },
];

const CLASSES: Record<string, AssetClass> = { btc: BTC, alts: ALTS, stocks: STOCKS, cash: CASH };

function futureValue(monthly: number, years: number, annualRate: number) {
  const r = annualRate / 100 / 12;
  const n = years * 12;
  if (r === 0) return monthly * n;
  return monthly * ((Math.pow(1 + r, n) - 1) / r);
}

export default function Planner() {
  const [amount, setAmount] = useState(10000);
  const [years, setYears] = useState(10);
  const [risk, setRisk] = useState('balanced');

  const active = RISKS.find(r => r.key === risk)!;
  const result = useMemo(() => {
    const invested = amount * 12 * years;
    const value = futureValue(amount, years, active.rate);
    return { invested, value, gain: value - invested, mult: invested ? value / invested : 0 };
  }, [amount, years, active]);

  const rows = useMemo(
    () =>
      active.alloc
        .map(([key, pct]) => ({ asset: CLASSES[key], pct }))
        .sort((a, b) => b.pct - a.pct),
    [active]
  );

  return (
    <section id="planner" className="mx-auto w-full max-w-[1180px] px-6 py-16">
      <div className="mb-8 max-w-[62ch]">
        <p className="font-mono-khan mb-3 text-[13px] text-[var(--khan-cyan)]">WEALTH PLANNER</p>
        <h2 className="font-display-khan mb-3 text-[30px] font-semibold leading-tight">
          See your future. <span style={{ color: 'var(--khan-gold)' }}>Then build it.</span>
        </h2>
        <p className="text-[15px] text-[var(--khan-muted)]">
          Set a monthly SIP, pick your risk DNA and KHAN projects the growth — then build the plan
          directly: Bitcoin, altcoins (ETH/SOL), growth stocks and cash & stablecoins, each with a
          one-tap Buy link.
        </p>
      </div>

      <div className="khan-card overflow-hidden">
        <div className="grid gap-0 md:grid-cols-[360px_1fr]">
          {/* controls */}
          <div className="border-b border-[var(--khan-line)] p-7 md:border-b-0 md:border-r">
            <label className="mb-2 block text-[13px] text-[var(--khan-muted)]">Monthly investment (₹ / $ / any)</label>
            <div className="khan-card-2 mb-6 flex items-center rounded-[10px] px-4">
              <span className="font-mono-khan text-[var(--khan-muted)]">₹</span>
              <input
                type="number"
                min={100}
                className="font-mono-khan w-full bg-transparent px-2 py-3 text-[20px] text-[var(--khan-text)] outline-none"
                value={amount}
                onChange={e => setAmount(Math.max(100, +e.target.value || 0))}
                aria-label="Monthly investment amount"
              />
            </div>

            <label className="mb-2 block text-[13px] text-[var(--khan-muted)]">Time horizon: <b className="text-[var(--khan-text)]">{years} years</b></label>
            <input
              type="range" min={1} max={30} value={years}
              onChange={e => setYears(+e.target.value)}
              className="mb-6 w-full accent-[var(--khan-cyan)]"
              aria-label="Years"
            />

            <label className="mb-2 block text-[13px] text-[var(--khan-muted)]">Risk DNA</label>
            <div className="flex gap-2">
              {RISKS.map(r => (
                <button
                  key={r.key}
                  onClick={() => setRisk(r.key)}
                  className="flex-1 rounded-lg border py-2.5 text-[13px] font-semibold transition-colors"
                  style={{
                    borderColor: risk === r.key ? 'var(--khan-cyan)' : 'var(--khan-line)',
                    color: risk === r.key ? 'var(--khan-cyan)' : 'var(--khan-muted)',
                    background: risk === r.key ? 'rgba(63,224,208,.08)' : 'transparent',
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <p className="font-mono-khan mt-3 text-[11px] leading-relaxed text-[var(--khan-muted)]">
              {active.blurb} · assumes ~{active.rate}% avg annual return
            </p>
          </div>

          {/* projection + plan */}
          <div className="p-7">
            <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="khan-card-2 rounded-xl p-4">
                <div className="font-mono-khan text-[10px] tracking-wider text-[var(--khan-muted)]">YOU INVEST</div>
                <div className="font-mono-khan text-[20px] font-bold">₹{result.invested.toLocaleString('en-IN')}</div>
              </div>
              <div className="khan-card-2 rounded-xl p-4" style={{ borderColor: 'rgba(201,162,75,.45)' }}>
                <div className="font-mono-khan text-[10px] tracking-wider text-[var(--khan-muted)]">PROJECTED VALUE</div>
                <div className="font-mono-khan text-[20px] font-bold" style={{ color: 'var(--khan-gold)' }}>
                  ₹{Math.round(result.value).toLocaleString('en-IN')}
                </div>
              </div>
              <div className="khan-card-2 rounded-xl p-4">
                <div className="font-mono-khan text-[10px] tracking-wider text-[var(--khan-muted)]">GROWTH</div>
                <div className="font-mono-khan text-[20px] font-bold" style={{ color: 'var(--khan-up)' }}>
                  +₹{Math.round(result.gain).toLocaleString('en-IN')}
                </div>
                <div className="font-mono-khan text-[11px] text-[var(--khan-muted)]">{result.mult.toFixed(1)}× your money</div>
              </div>
            </div>

            <div className="mb-3 flex items-center justify-between">
              <div className="text-[13px] font-semibold">KHAN&apos;s recommended plan — build it now</div>
              <div className="font-mono-khan hidden items-center gap-1 text-[10.5px] text-[var(--khan-gold)] sm:flex">
                <ShoppingBag size={11} /> TAP A LINK TO BUY
              </div>
            </div>

            <div className="space-y-4">
              {rows.map(({ asset, pct }) => {
                const monthly = Math.round((amount * pct) / 100);
                return (
                  <div key={asset.key} className="khan-card-2 rounded-xl p-4">
                    <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <span className="text-[14px] font-semibold">
                        <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: asset.color }} />
                        {asset.label}
                      </span>
                      <span className="font-mono-khan text-[13px]">
                        <b style={{ color: asset.color }}>{pct}%</b>
                        <span className="text-[var(--khan-muted)]"> · ₹{monthly.toLocaleString('en-IN')}/mo</span>
                      </span>
                    </div>
                    <div className="mb-2 h-2 overflow-hidden rounded bg-[rgba(255,255,255,.05)]">
                      <div className="h-full rounded" style={{ width: `${pct}%`, background: asset.color }} />
                    </div>
                    <div className="font-mono-khan mb-2.5 text-[11px] text-[var(--khan-muted)]">{asset.note}</div>
                    <div className="flex flex-wrap gap-2">
                      {asset.links.map(l => (
                        <a
                          key={l.label}
                          href={l.href}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="font-mono-khan flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11.5px] font-semibold transition-colors hover:border-[var(--khan-gold)]"
                          style={{ borderColor: 'var(--khan-line)', color: 'var(--khan-gold)', background: 'rgba(201,162,75,.06)' }}
                        >
                          Buy {l.label} <ExternalLink size={10} />
                        </a>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="font-mono-khan mt-4 text-[10.5px] leading-relaxed text-[var(--khan-muted)]">
              ⓘ KHAN doesn&apos;t hold your money — Buy buttons open third-party brokers/exchanges in a new tab.
              Compare fees, complete KYC, use DCA, never invest money you need next month, and rebalance twice a year.
            </p>

            <div className="khan-card-2 mt-4 rounded-xl border-l-4 p-4 text-[13px] leading-relaxed text-[var(--khan-muted)]" style={{ borderLeftColor: 'var(--khan-gold)' }}>
              <b className="text-[var(--khan-text)]">KHAN&apos;s note:</b> projection assumes ~{active.rate}% average annual return with monthly
              compounding. Markets swing — the plan above is your building order: fill each slice monthly via DCA and let the
              percentages pull you back on track at every rebalance.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
