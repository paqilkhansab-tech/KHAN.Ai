'use client';

import { useMemo, useState } from 'react';

const RISKS = [
  { key: 'safe', label: 'Safe', rate: 8, split: ['30% Bitcoin & large crypto', '70% index funds / blue chips'], alloc: [['Bitcoin / ETH', 30, '#F7931A'], ['Index funds', 40, '#3FE0D0'], ['Blue-chip stocks', 30, '#C9A24B']] },
  { key: 'balanced', label: 'Balanced', rate: 14, split: ['50% crypto (BTC-heavy)', '50% growth stocks'], alloc: [['Bitcoin', 30, '#F7931A'], ['Altcoins (ETH/SOL)', 20, '#9945FF'], ['Growth stocks', 35, '#3FE0D0'], ['Cash / stablecoins', 15, '#8891A6']] },
  { key: 'degen', label: 'Aggressive', rate: 24, split: ['70% crypto with altcoin exposure', '30% high-beta stocks'], alloc: [['Bitcoin', 25, '#F7931A'], ['Altcoins & memes', 45, '#9945FF'], ['High-beta stocks', 30, '#3FE0D0']] },
];

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

  return (
    <section id="planner" className="mx-auto w-full max-w-[1180px] px-6 py-16">
      <div className="mb-8 max-w-[62ch]">
        <p className="font-mono-khan mb-3 text-[13px] text-[var(--khan-cyan)]">WEALTH PLANNER</p>
        <h2 className="font-display-khan mb-3 text-[30px] font-semibold leading-tight">
          See your future. <span style={{ color: 'var(--khan-gold)' }}>Then build it.</span>
        </h2>
        <p className="text-[15px] text-[var(--khan-muted)]">
          Set a monthly SIP, pick your risk DNA and KHAN projects the growth — with a smart allocation across crypto and stocks.
        </p>
      </div>

      <div className="khan-card overflow-hidden">
        <div className="grid gap-0 md:grid-cols-[360px_1fr]">
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
          </div>

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

            <div className="mb-4">
              <div className="mb-3 text-[13px] font-semibold">KHAN&apos;s smart allocation for you</div>
              <div className="mb-4 space-y-3">
                {active.alloc.map(([label, pct, color]) => (
                  <div key={label as string}>
                    <div className="mb-1 flex justify-between text-[13px]">
                      <span>{label}</span>
                      <span className="font-mono-khan" style={{ color: color as string }}>{pct}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded bg-[var(--khan-surface-2)]">
                      <div className="h-full rounded" style={{ width: `${pct}%`, background: color as string }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="khan-card-2 rounded-xl border-l-4 p-4 text-[13px] leading-relaxed text-[var(--khan-muted)]" style={{ borderLeftColor: 'var(--khan-gold)' }}>
              <b className="text-[var(--khan-text)]">KHAN&apos;s note:</b> projection assumes ~{active.rate}% average annual return with monthly
              compounding ({active.split.join(' · ')}). Markets swing — use DCA, never invest money you need next month, and rebalance twice a year.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
