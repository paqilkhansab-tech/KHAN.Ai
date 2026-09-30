'use client';

import { useEffect, useRef, useState } from 'react';
import Markdown from 'react-markdown';
import { Send, Sparkles, Trash2, Bot, User as UserIcon } from 'lucide-react';
import { useAuth } from './AuthProvider';

interface Turn {
  role: 'user' | 'assistant';
  content: string;
}

const CHIPS = [
  'Analyze Bitcoin (BTC) right now — trend, levels, verdict',
  'ETH vs SOL: which is the stronger buy today?',
  'Top 3 cryptos for long-term investing & why',
  'NVDA stock analysis: fundamentals + technicals',
  'Nifty 50 trading plan for this week',
  'How should a beginner split ₹10,000/month between crypto and stocks?',
];

export default function KhanChat({
  pendingQuestion,
  onPendingConsumed,
}: {
  pendingQuestion?: string | null;
  onPendingConsumed?: () => void;
}) {
  const { user, chatCount, refresh } = useAuth();
  const [turns, setTurns] = useState<Turn[]>([
    {
      role: 'assistant',
      content:
        "**I am KHAN AI** — your market intelligence engine. I analyze **Bitcoin & every crypto**, **US & Indian stocks**, and **trading setups** live: key levels, momentum, risk, verdicts with confidence.\n\nAsk me anything — or tap a starter below. Prices in my head update live from the market feed.",
    },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const askedRef = useRef(false);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns, busy]);

  const ask = async (q: string) => {
    const question = q.trim();
    if (!question || busy) return;
    setBusy(true);
    setInput('');
    setTurns(t => [...t, { role: 'user', content: question }, { role: 'assistant', content: '' }]);
    try {
      const history = turns.filter(t => t.content).slice(-8);
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...history, { role: 'user', content: question }] }),
      });
      const data = await res.json();
      setTurns(t => {
        const copy = [...t];
        copy[copy.length - 1] = {
          role: 'assistant',
          content: data.reply || data.error || 'Something went wrong — ask again.',
        };
        return copy;
      });
    } catch {
      setTurns(t => {
        const copy = [...t];
        copy[copy.length - 1] = { role: 'assistant', content: 'Network hiccup — I could not reach my brain. Ask again.' };
        return copy;
      });
    } finally {
      setBusy(false);
      if (user) refresh(); // keep saved-history counter in sync
    }
  };

  // When a coin card sends a question from elsewhere on the page
  useEffect(() => {
    if (pendingQuestion && !askedRef.current) {
      askedRef.current = true;
      ask(pendingQuestion).finally(() => onPendingConsumed?.());
    }
  }, [pendingQuestion]);

  return (
    <section id="khan-ai" className="mx-auto w-full max-w-[1180px] px-6 py-16">
      <div className="mb-8 max-w-[62ch]">
        <p className="font-mono-khan mb-3 text-[13px] text-[var(--khan-cyan)]">KHAN AI · MARKET INTELLIGENCE ENGINE</p>
        <h2 className="font-display-khan mb-3 text-[30px] font-semibold leading-tight">
          One AI. <span style={{ color: 'var(--khan-gold)' }}>Every market.</span> Real analysis.
        </h2>
        <p className="text-[15px] text-[var(--khan-muted)]">
          KHAN reads live prices, maps support & resistance, weighs bull vs bear cases and gives you a verdict with
          confidence — crypto, stocks and trading plans, in plain language. {user ? `Your ${chatCount} saved exchanges stay in your account history.` : 'Sign in and every analysis is saved to your account history.'}
        </p>
      </div>

      <div className="khan-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--khan-line)] px-5 py-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: 'linear-gradient(135deg,#C9A24B,#3FE0D0)' }}>
              <Bot size={17} color="#0A0F1C" />
            </span>
            <div>
              <div className="text-[14px] font-bold">KHAN AI</div>
              <div className="font-mono-khan text-[10.5px] text-[var(--khan-up)]">● ONLINE — crypto · stocks · trading</div>
            </div>
          </div>
          {user && (
            <div className="font-mono-khan flex items-center gap-2 text-[11px] text-[var(--khan-muted)]">
              <UserIcon size={13} /> {user.name.split(' ')[0]} · history saved
              {chatCount > 0 && (
                <button
                  className="ml-1 rounded p-1 hover:bg-white/10 hover:text-[var(--khan-down)]"
                  title="Note: history is preserved on our servers"
                  aria-label="Chat history stored"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          )}
        </div>

        <div ref={scrollRef} className="khan-scroll max-h-[430px] min-h-[300px] overflow-y-auto px-5 py-5">
          {turns.map((t, i) => (
            <div key={i} className={`mb-4 flex gap-3 ${t.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                style={
                  t.role === 'assistant'
                    ? { background: 'linear-gradient(135deg,#C9A24B,#3FE0D0)', color: '#0A0F1C' }
                    : { background: 'var(--khan-surface-2)', border: '1px solid var(--khan-line)', color: 'var(--khan-cyan)' }
                }
              >
                {t.role === 'assistant' ? 'K' : user ? user.name[0].toUpperCase() : 'U'}
              </span>
              <div
                className={`khan-md max-w-[85%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed ${
                  t.role === 'user'
                    ? 'rounded-tr-sm'
                    : 'rounded-tl-sm border border-[var(--khan-line)]'
                }`}
                style={t.role === 'user' ? { background: 'var(--khan-surface-2)' } : { background: 'var(--khan-surface)' }}
              >
                {t.content ? (
                  <Markdown>{t.content}</Markdown>
                ) : (
                  <span className="font-mono-khan flex items-center gap-2 text-[13px] text-[var(--khan-muted)]">
                    <Sparkles size={14} className="animate-pulse text-[var(--khan-cyan)]" />
                    KHAN is analyzing the markets…
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-[var(--khan-line)] px-5 py-4">
          <div className="khan-scroll mb-3 flex gap-2 overflow-x-auto pb-1">
            {CHIPS.map(c => (
              <button
                key={c}
                onClick={() => ask(c)}
                disabled={busy}
                className="shrink-0 rounded-full border border-[var(--khan-line)] px-3.5 py-1.5 text-[12px] text-[var(--khan-cyan)] transition-colors hover:border-[var(--khan-cyan)] disabled:opacity-40"
              >
                {c}
              </button>
            ))}
          </div>
          <form
            className="flex gap-2"
            onSubmit={e => {
              e.preventDefault();
              ask(input);
            }}
          >
            <input
              ref={inputRef}
              className="khan-input flex-1"
              placeholder="Ask KHAN anything — “Should I buy Bitcoin now?”, “TSLA analysis”, “best 3 coins today”…"
              value={input}
              onChange={e => setInput(e.target.value)}
              aria-label="Ask Khan AI"
            />
            <button type="submit" disabled={busy || !input.trim()} className="khan-btn-cyan flex items-center gap-2 px-5 disabled:opacity-40" aria-label="Send">
              <Send size={16} /> {busy ? 'Thinking' : 'Ask'}
            </button>
          </form>
          <p className="font-mono-khan mt-2.5 text-center text-[10.5px] text-[var(--khan-muted)]">
            Education & analysis only — not investment advice. KHAN always includes risk levels with trade ideas.
          </p>
        </div>
      </div>
    </section>
  );
}
