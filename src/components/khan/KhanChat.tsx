'use client';

import { useEffect, useRef, useState } from 'react';
import Markdown from 'react-markdown';
import { Send, Sparkles, Bot, User as UserIcon, Volume2, Square, Brain } from 'lucide-react';
import { toast } from 'sonner';
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
        "**I am KHAN AI** — your market intelligence engine, and I speak. Every answer I give can be **heard aloud** — tap the speaker under any reply, or switch on Voice so I narrate automatically.\n\nI analyze **Bitcoin & every crypto**, **US & Indian stocks**, and **trading setups** live — key levels, momentum, risk, verdicts with confidence. Flip on **Deep mode** (brain icon) for full macro-aware, multi-scenario analysis.\n\nAsk me anything — prices in my head update live from the market feed.",
    },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [deep, setDeep] = useState(false);
  const [voiceIdx, setVoiceIdx] = useState<number | null>(null); // loading voice
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null); // playing
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const askedRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const autoSpeakRef = useRef(autoSpeak);
  autoSpeakRef.current = autoSpeak;

  // persisted preferences
  useEffect(() => {
    const a = localStorage.getItem('khan-autospeak');
    if (a !== null) setAutoSpeak(a === '1');
    const d = localStorage.getItem('khan-deep');
    if (d !== null) setDeep(d === '1');
  }, []);

  useEffect(() => {
    localStorage.setItem('khan-autospeak', autoSpeak ? '1' : '0');
  }, [autoSpeak]);

  useEffect(() => {
    localStorage.setItem('khan-deep', deep ? '1' : '0');
  }, [deep]);

  const stopAudio = () => {
    audioRef.current?.pause();
    audioRef.current = null;
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    setSpeakingIdx(null);
  };

  // cleanup on unmount
  useEffect(() => () => stopAudio(), []);

  /** Speak (or stop) the assistant message at index idx */
  const speak = async (idx: number) => {
    const t = turns[idx];
    if (!t?.content) return;
    if (speakingIdx === idx) {
      stopAudio();
      return;
    }
    stopAudio();
    setVoiceIdx(idx);
    try {
      const res = await fetch('/api/ai/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: t.content }),
      });
      if (!res.ok) throw new Error('tts failed');
      const blob = await res.blob();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => setSpeakingIdx(null);
      setSpeakingIdx(idx);
      await audio.play();
    } catch {
      setSpeakingIdx(null);
      toast.error('Voice could not play — tap the speaker again.');
    } finally {
      setVoiceIdx(null);
    }
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns, busy]);

  const ask = async (q: string) => {
    const question = q.trim();
    if (!question || busy) return;
    setBusy(true);
    stopAudio();
    setInput('');
    setTurns(t => [...t, { role: 'user', content: question }, { role: 'assistant', content: '' }]);
    let replyIdx = -1;
    try {
      const history = turns.filter(t => t.content).slice(-8);
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...history, { role: 'user', content: question }],
          deep,
        }),
      });
      const data = await res.json();
      const reply = data.reply || data.error || 'Something went wrong — ask again.';
      setTurns(t => {
        const copy = [...t];
        replyIdx = copy.length - 1;
        copy[replyIdx] = { role: 'assistant', content: reply };
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
      // KHAN speaks the fresh answer when Voice is ON
      if (autoSpeakRef.current && replyIdx > 0) {
        setTimeout(() => speak(replyIdx), 350);
      }
    }
  };

  // When a coin card sends a question from elsewhere on the page
  useEffect(() => {
    if (pendingQuestion && !askedRef.current) {
      askedRef.current = true;
      ask(pendingQuestion).finally(() => onPendingConsumed?.());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingQuestion]);

  const pill = (active: boolean) =>
    `flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono-khan text-[10.5px] uppercase tracking-wide transition-colors ${
      active
        ? 'border-[var(--khan-cyan)] bg-[rgba(63,224,208,.08)] text-[var(--khan-cyan)]'
        : 'border-[var(--khan-line)] text-[var(--khan-muted)] hover:text-white'
    }`;

  return (
    <section id="khan-ai" className="mx-auto w-full max-w-[1180px] px-6 py-16">
      <div className="mb-8 max-w-[62ch]">
        <p className="font-mono-khan mb-3 text-[13px] text-[var(--khan-cyan)]">KHAN AI · MARKET INTELLIGENCE ENGINE · VOICE ENABLED</p>
        <h2 className="font-display-khan mb-3 text-[30px] font-semibold leading-tight">
          One AI. <span style={{ color: 'var(--khan-gold)' }}>Every market.</span> Now speaking.
        </h2>
        <p className="text-[15px] text-[var(--khan-muted)]">
          KHAN reads live prices, maps support &amp; resistance, weighs bull vs bear cases and gives you a verdict with
          confidence — crypto, stocks and trading plans, in plain language. And KHAN talks: every analysis can be played
          aloud in a premium voice, or narrated automatically. {user ? `Your ${chatCount} saved exchanges stay in your account history.` : 'Sign in and every analysis is saved to your account history.'}
        </p>
      </div>

      <div className="khan-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--khan-line)] px-5 py-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: 'linear-gradient(135deg,#C9A24B,#3FE0D0)' }}>
              <Bot size={17} color="#0A0F1C" />
            </span>
            <div>
              <div className="text-[14px] font-bold">KHAN AI</div>
              <div className="font-mono-khan text-[10.5px] text-[var(--khan-up)]">● ONLINE — crypto · stocks · trading · voice</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setAutoSpeak(v => !v)} className={pill(autoSpeak)} title="KHAN narrates every answer aloud" aria-pressed={autoSpeak}>
              <Volume2 size={13} /> Voice {autoSpeak ? 'on' : 'off'}
            </button>
            <button onClick={() => setDeep(v => !v)} className={`${pill(deep)} ${deep ? '!border-[var(--khan-gold)] !bg-[rgba(201,162,75,.08)] !text-[var(--khan-gold)]' : ''}`} title="Deep mode: macro-aware, multi-scenario chain-of-thought analysis" aria-pressed={deep}>
              <Brain size={13} /> Deep {deep ? 'on' : 'off'}
            </button>
            {user && (
              <div className="font-mono-khan ml-1 hidden items-center gap-2 text-[11px] text-[var(--khan-muted)] md:flex">
                <UserIcon size={13} /> {user.name.split(' ')[0]} · saved
              </div>
            )}
          </div>
        </div>

        <div ref={scrollRef} className="khan-scroll max-h-[460px] min-h-[300px] overflow-y-auto px-5 py-5">
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
              <div className="max-w-[85%]">
                <div
                  className={`khan-md rounded-2xl px-4 py-3 text-[14px] leading-relaxed ${
                    t.role === 'user' ? 'rounded-tr-sm' : 'rounded-tl-sm border border-[var(--khan-line)]'
                  }`}
                  style={t.role === 'user' ? { background: 'var(--khan-surface-2)' } : { background: 'var(--khan-surface)' }}
                >
                  {t.content ? (
                    <Markdown>{t.content}</Markdown>
                  ) : (
                    <span className="font-mono-khan flex items-center gap-2 text-[13px] text-[var(--khan-muted)]">
                      <Sparkles size={14} className={`text-[var(--khan-cyan)] ${deep ? 'animate-spin' : 'animate-pulse'}`} />
                      {deep ? 'KHAN is deep-reading the macro picture…' : 'KHAN is analyzing the markets…'}
                    </span>
                  )}
                </div>
                {t.role === 'assistant' && t.content && i > 0 && (
                  <div className="mt-1.5 flex items-center gap-2 px-1">
                    <button
                      onClick={() => speak(i)}
                      disabled={voiceIdx === i}
                      className="font-mono-khan flex items-center gap-1.5 rounded-full border border-[var(--khan-line)] px-2.5 py-1 text-[10px] uppercase tracking-wide text-[var(--khan-muted)] transition-colors hover:border-[var(--khan-cyan)] hover:text-[var(--khan-cyan)] disabled:opacity-50"
                      aria-label={speakingIdx === i ? 'Stop voice' : 'Play voice'}
                    >
                      {voiceIdx === i ? (
                        <>
                          <Sparkles size={11} className="animate-spin text-[var(--khan-cyan)]" /> voicing…
                        </>
                      ) : speakingIdx === i ? (
                        <>
                          <Square size={10} className="text-[var(--khan-cyan)]" /> stop
                        </>
                      ) : (
                        <>
                          <Volume2 size={11} /> listen
                        </>
                      )}
                    </button>
                    {speakingIdx === i && (
                      <span className="font-mono-khan flex items-center gap-1 text-[10px] text-[var(--khan-cyan)]">
                        <span className="animate-pulse">▮▮▮</span> KHAN is speaking
                      </span>
                    )}
                  </div>
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
              placeholder={deep ? 'Deep mode on — ask for the full macro picture…' : 'Ask KHAN anything — “Should I buy Bitcoin now?”, “TSLA analysis”, “best 3 coins today”…'}
              value={input}
              onChange={e => setInput(e.target.value)}
              aria-label="Ask Khan AI"
            />
            <button type="submit" disabled={busy || !input.trim()} className="khan-btn-cyan flex items-center gap-2 px-5 disabled:opacity-40" aria-label="Send">
              <Send size={16} /> {busy ? (deep ? 'Deep thinking' : 'Thinking') : 'Ask'}
            </button>
          </form>
          <p className="font-mono-khan mt-2.5 text-center text-[10.5px] text-[var(--khan-muted)]">
            Education &amp; analysis only — not investment advice. KHAN always includes risk levels with trade ideas.
          </p>
        </div>
      </div>
    </section>
  );
}
