'use client';

import { useMemo, useState } from 'react';
import { Star, X, ChevronDown, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from './AuthProvider';
import { useCryptoFeed, CoinBadge, ChangeTag, fmtPrice, fmtBig, CryptoAsset } from './Ticker';
import { CryptoBuyLinks } from './BuyLinks';

export default function CryptoSection({ onAskKhan }: { onAskKhan: (q: string) => void }) {
  const { assets, source } = useCryptoFeed();
  const { user, watchlist, saveToWatchlist, removeFromWatchlist } = useAuth();
  const [expanded, setExpanded] = useState<string | null>('bitcoin');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'gainers' | 'losers' | 'watch'>('all');

  const filtered = useMemo(() => {
    let list = assets;
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(a => a.name.toLowerCase().includes(q) || a.symbol.includes(q));
    }
    if (filter === 'gainers') list = [...list].filter(a => a.change24h > 0).sort((a, b) => b.change24h - a.change24h);
    if (filter === 'losers') list = [...list].filter(a => a.change24h < 0).sort((a, b) => a.change24h - b.change24h);
    if (filter === 'watch') list = list.filter(a => watchlist.some(w => w.symbol === a.symbol));
    return list;
  }, [assets, query, filter, watchlist]);

  const btc = assets.find(a => a.id === 'bitcoin');

  const toggleWatch = async (a: CryptoAsset) => {
    if (!user) {
      toast.error('Create a free account to save coins to your watchlist.');
      return;
    }
    const saved = watchlist.some(w => w.symbol === a.symbol);
    if (saved) {
      await removeFromWatchlist(a.symbol);
      toast.success(`${a.name} removed from watchlist.`);
    } else {
      const ok = await saveToWatchlist(a.symbol, a.name, 'crypto');
      if (ok) toast.success(`★ ${a.name} saved to your watchlist.`);
      else toast.error('Could not save — try again.');
    }
  };

  return (
    <section id="crypto" className="mx-auto w-full max-w-[1180px] px-6 py-16">
      <div className="mb-8 max-w-[62ch]">
        <p className="font-mono-khan mb-3 text-[13px] text-[var(--khan-cyan)]">THE CRYPTO UNIVERSE</p>
        <h2 className="font-display-khan mb-3 text-[30px] font-semibold leading-tight">
          All about <span style={{ color: 'var(--khan-gold)' }}>Bitcoin</span> & every major crypto
        </h2>
        <p className="text-[15px] text-[var(--khan-muted)]">
          Live prices, market caps and KHAN&apos;s deep-dive profiles of the top 20 digital assets.
          Tap any coin for its full story, save it to your personal watchlist, or send it straight to KHAN AI for analysis.
          {source === 'fallback' && ' (Showing reference feed — live source reconnecting.)'}
        </p>
      </div>

      {btc && <BtcSpotlight btc={btc} onAskKhan={onAskKhan} />}

      {/* controls */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="khan-card-2 flex min-w-[220px] flex-1 items-center gap-2 rounded-[10px] px-3">
          <Search size={16} className="text-[var(--khan-muted)]" />
          <input
            className="w-full bg-transparent py-2.5 text-sm text-[var(--khan-text)] outline-none placeholder:text-[var(--khan-muted)]"
            placeholder="Search Bitcoin, Ethereum, Solana…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            aria-label="Search cryptocurrencies"
          />
          {query && (
            <button onClick={() => setQuery('')} aria-label="Clear search">
              <X size={15} className="text-[var(--khan-muted)] hover:text-white" />
            </button>
          )}
        </div>
        {(['all', 'gainers', 'losers', 'watch'] as const).map(f => (
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
            {f === 'watch' ? `★ watchlist${user ? ` (${watchlist.length})` : ''}` : f}
          </button>
        ))}
      </div>

      {/* grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map(a => {
          const open = expanded === a.id;
          const watched = watchlist.some(w => w.symbol === a.symbol);
          return (
            <article key={a.id} className="khan-card p-5 transition-colors hover:border-[#33436a]">
              <div className="mb-3 flex items-start justify-between gap-2">
                <button className="flex items-center gap-3 text-left" onClick={() => setExpanded(open ? null : a.id)}>
                  <CoinBadge symbol={a.symbol} />
                  <div>
                    <div className="text-[15px] font-semibold">{a.name}</div>
                    <div className="font-mono-khan text-[11px] text-[var(--khan-muted)]">
                      #{a.rank} · {a.symbol.toUpperCase()}
                    </div>
                  </div>
                </button>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleWatch(a)}
                    aria-label={watched ? 'Remove from watchlist' : 'Add to watchlist'}
                    className="rounded-md p-1.5 transition-colors hover:bg-white/10"
                    style={{ color: watched ? 'var(--khan-gold)' : 'var(--khan-muted)' }}
                  >
                    <Star size={16} fill={watched ? 'currentColor' : 'none'} />
                  </button>
                  <ChangeTag value={a.change24h} />
                </div>
              </div>

              <div className="font-mono-khan mb-1 text-[22px]">{fmtPrice(a.price)}</div>
              <div className="font-mono-khan mb-3 flex gap-4 text-[11.5px] text-[var(--khan-muted)]">
                <span>MCap {fmtBig(a.marketCap)}</span>
                <span>Vol {fmtBig(a.volume24h)}</span>
              </div>

              {open && a.about && (
                <div className="mb-3 border-t border-[var(--khan-line)] pt-3">
                  <p className="mb-3 text-[13px] leading-relaxed text-[var(--khan-muted)]">{a.about}</p>
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {a.tags.map(t => (
                      <span key={t} className="font-mono-khan rounded-full border border-[var(--khan-line)] px-2.5 py-1 text-[10.5px] text-[var(--khan-cyan)]">
                        {t}
                      </span>
                    ))}
                  </div>
                  <div className="mb-3">
                    <CryptoBuyLinks symbol={a.symbol} name={a.name} />
                  </div>
                  <button
                    onClick={() => onAskKhan(`Give me a full trading analysis of ${a.name} (${a.symbol.toUpperCase()}) right now: current read, key support & resistance, momentum, bull vs bear case and your verdict with confidence.`)}
                    className="khan-btn-cyan w-full py-2.5 text-sm"
                  >
                    Ask KHAN AI to analyze {a.symbol.toUpperCase()} →
                  </button>
                </div>
              )}

              <button
                onClick={() => setExpanded(open ? null : a.id)}
                className="font-mono-khan flex items-center gap-1 text-[12px] text-[var(--khan-muted)] transition-colors hover:text-[var(--khan-cyan)]"
              >
                {open ? 'Hide details' : 'Buy / about this coin ↓'}
                <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
              </button>
            </article>
          );
        })}
      </div>

      {!filtered.length && (
        <div className="khan-card p-10 text-center text-[var(--khan-muted)]">
          {filter === 'watch' && !user
            ? 'Sign in and tap the ★ on any coin to build your personal watchlist — it stays saved to your account.'
            : 'No coins match. Try another search.'}
        </div>
      )}
    </section>
  );
}

function BtcSpotlight({ btc, onAskKhan }: { btc: CryptoAsset; onAskKhan: (q: string) => void }) {
  return (
    <div className="khan-card mb-8 overflow-hidden">
      <div className="grid gap-0 md:grid-cols-[1.2fr_1fr]">
        <div className="p-7">
          <div className="mb-2 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full text-[22px] font-bold" style={{ background: 'rgba(247,147,26,.15)', border: '1px solid rgba(247,147,26,.4)', color: '#F7931A' }}>
              ₿
            </span>
            <div>
              <div className="font-display-khan text-[20px] font-semibold">Bitcoin <span className="font-mono-khan text-[12px] text-[var(--khan-muted)]">BTC · #1</span></div>
              <div className="font-mono-khan text-[12px] text-[var(--khan-cyan)]">DIGITAL GOLD · STORE OF VALUE</div>
            </div>
          </div>
          <p className="mt-4 text-[14px] leading-relaxed text-[var(--khan-muted)]">
            Bitcoin is the original cryptocurrency — a fixed-supply (21M), decentralized digital currency secured by the
            most powerful computing network on Earth. Institutions hold it through spot ETFs, nations mine it, and its
            4-year halving cycle shapes the entire crypto market. Everything else in crypto is measured against it.
          </p>
          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="khan-card-2 rounded-xl p-3">
              <div className="font-mono-khan text-[10px] text-[var(--khan-muted)]">PRICE</div>
              <div className="font-mono-khan text-[16px] font-bold">{fmtPrice(btc.price)}</div>
            </div>
            <div className="khan-card-2 rounded-xl p-3">
              <div className="font-mono-khan text-[10px] text-[var(--khan-muted)]">24H</div>
              <ChangeTag value={btc.change24h} />
            </div>
            <div className="khan-card-2 rounded-xl p-3">
              <div className="font-mono-khan text-[10px] text-[var(--khan-muted)]">MARKET CAP</div>
              <div className="font-mono-khan text-[16px] font-bold">{fmtBig(btc.marketCap)}</div>
            </div>
          </div>
        </div>
        <div className="flex flex-col justify-center gap-3 border-t border-[var(--khan-line)] p-7 md:border-l md:border-t-0">
          <button
            onClick={() => onAskKhan('Is Bitcoin a good buy right now? Give me the full analysis: trend, key levels, RSI momentum, bull vs bear case and your verdict with confidence %.')}
            className="khan-btn-gold w-full py-3 text-[15px]"
          >
            KHAN, analyze Bitcoin now →
          </button>
          <a
            href="https://www.binance.com/en/trade/BTC_USDT"
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="khan-btn-cyan flex w-full items-center justify-center gap-2 py-3 text-[15px]"
          >
            Buy Bitcoin on Binance ↗
          </a>
          <a
            href="https://coindcx.com/trading/BTCUSDT"
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="khan-btn-ghost flex w-full items-center justify-center gap-2 py-3 text-[15px] font-semibold"
          >
            Buy BTC with ₹ on CoinDCX ↗
          </a>
          <p className="text-center font-mono-khan text-[11px] text-[var(--khan-muted)]">
            Opens third-party exchange · KYC required · invest safely
          </p>
        </div>
      </div>
    </div>
  );
}
