'use client';

import { ExternalLink, ShoppingBag } from 'lucide-react';

/**
 * "Where to buy" links — deep links to popular, regulated on/off-ramp platforms.
 * KHAN never handles money; buttons open third-party brokers/exchanges in a new tab.
 */

const BTN: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  padding: '10px 12px',
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 600,
  border: '1px solid var(--khan-line)',
  color: 'var(--khan-text)',
  background: 'rgba(255,255,255,.03)',
  transition: 'border-color .15s, background .15s',
};

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
      {children}
    </div>
  );
}

export function Disclaimer() {
  return (
    <p className="font-mono-khan text-[10.5px] leading-relaxed text-[var(--khan-muted)]">
      ⓘ KHAN doesn&apos;t hold your money — Buy buttons open third-party brokers/exchanges in a new tab.
      Compare fees, complete KYC and never invest more than you can afford to lose.
    </p>
  );
}

export function CryptoBuyLinks({ symbol, name }: { symbol: string; name: string }) {
  const s = symbol.toUpperCase();
  const links = [
    { label: `Buy on Binance`, sub: `${s}/USDT`, href: `https://www.binance.com/en/trade/${s}_USDT` },
    { label: `Buy on CoinDCX`, sub: `${s}/INR · India`, href: `https://coindcx.com/trading/${s}USDT` },
    { label: 'Buy on Coinbase', sub: 'Global · beginner-friendly', href: `https://www.coinbase.com/signup` },
  ];
  return (
    <div>
      <div className="font-mono-khan mb-2 flex items-center gap-1.5 text-[11px] tracking-wider text-[var(--khan-gold)]">
        <ShoppingBag size={12} /> WHERE TO BUY {name.toUpperCase()}
      </div>
      <Row>
        {links.map(l => (
          <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer nofollow" className="hover:border-[var(--khan-cyan)]" style={BTN}>
            <span className="flex flex-col items-start leading-tight">
              <span>{l.label}</span>
              <span className="font-mono-khan text-[9.5px] font-normal text-[var(--khan-muted)]">{l.sub}</span>
            </span>
            <ExternalLink size={12} className="ml-auto shrink-0 text-[var(--khan-muted)]" />
          </a>
        ))}
      </Row>
      <Disclaimer />
    </div>
  );
}

export function StockBuyLinks({ symbol, name, market }: { symbol: string; name: string; market: 'US' | 'IN' }) {
  const links =
    market === 'IN'
      ? [
          { label: `Buy ${symbol} on Groww`, sub: 'India · NSE/BSE', href: `https://groww.in/search?q=${encodeURIComponent(name)}` },
          { label: 'Open Zerodha account', sub: 'India · largest broker', href: 'https://zerodha.com/open-account' },
          { label: 'Buy on Upstox', sub: 'India · ₹0 delivery', href: 'https://upstox.com/open-demat-account' },
        ]
      : [
          { label: `Buy ${symbol} on Robinhood`, sub: 'US · commission-free', href: `https://robinhood.com/stocks/${symbol}` },
          { label: 'Interactive Brokers', sub: 'Global · 150 markets', href: 'https://www.interactivebrokers.com' },
          { label: 'INDmoney (US stocks)', sub: 'India · invest in US', href: 'https://www.indmoney.com' },
        ];
  return (
    <div>
      <div className="font-mono-khan mb-2 flex items-center gap-1.5 text-[11px] tracking-wider text-[var(--khan-gold)]">
        <ShoppingBag size={12} /> WHERE TO BUY {symbol}
      </div>
      <Row>
        {links.map(l => (
          <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer nofollow" className="hover:border-[var(--khan-cyan)]" style={BTN}>
            <span className="flex flex-col items-start leading-tight">
              <span>{l.label}</span>
              <span className="font-mono-khan text-[9.5px] font-normal text-[var(--khan-muted)]">{l.sub}</span>
            </span>
            <ExternalLink size={12} className="ml-auto shrink-0 text-[var(--khan-muted)]" />
          </a>
        ))}
      </Row>
      <Disclaimer />
    </div>
  );
}
