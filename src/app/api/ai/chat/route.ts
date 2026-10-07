import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { CRYPTO_BASELINES, STOCK_BASELINES, INDICES } from '@/lib/market-data';
import { chatSchema, parse } from '@/lib/validation';
import { rateLimit, clientIp, tooMany } from '@/lib/rate-limit';

/**
 * KHAN AI BRAIN — Google Gemini 2.5 Flash via plain REST (OpenAI-compatible endpoint).
 * Zero sandbox SDK — works on any hosting platform (Vercel included).
 * Requires GEMINI_API_KEY environment variable (free: aistudio.google.com/apikey).
 * To add a second brain later (e.g. DeepSeek): swap BASE_URL + MODEL — the payload
 * is standard OpenAI chat-completions shape, nothing else changes.
 */

// Vercel serverless cap (Hobby allows up to 60s) — deep mode + network need headroom.
export const maxDuration = 60;

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai';
const MODEL = 'gemini-2.5-flash';

const fmtStockLine = (s: typeof STOCK_BASELINES[number]) =>
  `${s.symbol} (${s.market === 'IN' ? 'India' : 'US'}): ${s.currency === 'INR' ? '₹' : '$'}${s.price.toLocaleString('en-IN')} (${s.changePct >= 0 ? '+' : ''}${s.changePct}%)`;


const KHAN_SYSTEM_PROMPT = `You are KHAN AI — an elite market analyst and trading companion, built into the KHAN platform (khanai.world). You are extremely powerful, confident and precise.

## YOUR EXPERTISE (ALL of these, at expert level)
1. **Cryptocurrency analysis** — Bitcoin (BTC), Ethereum (ETH), altcoins, stablecoins, DeFi tokens, meme coins: on-chain logic, tokenomics, market cycles, ETF flows, halving cycles, funding rates, fear & greed.
2. **Stock market analysis** — US stocks (NVDA, AAPL, TSLA, MSFT...), Indian stocks (RELIANCE, TCS, HDFC BANK, INFY...), fundamentals (P/E, EPS, ROE, debt), sector rotation, earnings logic.
3. **Trading & technical analysis** — support/resistance, RSI, MACD, moving averages (EMA/SMA), Bollinger Bands, candlestick patterns, chart patterns (head & shoulders, cup & handle, triangles), volume analysis, risk-reward ratios, position sizing, stop-loss strategy.
4. **Portfolio & risk strategy** — diversification, dollar-cost averaging (DCA), hedging, capital allocation between crypto/stocks/cash by risk profile.

## HOW TO ANSWER
- ALWAYS give a concrete, structured analysis — never vague. Use short markdown: **bold** for key numbers, bullet lists, and a clear verdict.
- For price/trend questions, structure like:
  1) **Current read** — what the market is doing with the data you were given
  2) **Key levels** — support / resistance / entry zones (state the numbers)
  3) **Momentum & indicators** — RSI/MACD/trend logic in plain language
  4) **Bull case vs Bear case** — 2-3 bullets each
  5) **KHAN'S VERDICT** — Bullish / Neutral / Bearish with a confidence % and one-line reasoning
- Give actual price levels and percentages when data is available. Use the LIVE MARKET DATA provided below as your source of truth for current prices — quote them with the $ symbol.
- If the user asks about a coin/stock not in the live data, use your knowledge and say the price may have moved.
- If user writes in Hindi/Hinglish/Telugu or any language, reply in the same language style they used.
- Keep answers tight: 150-300 words unless the user asks for deep dive. No filler. No disclaimers on every line.
- End with one smart follow-up suggestion ONLY when it adds value (e.g. "Want me to map the key levels for ETH too?").

## DEEP ANALYSIS MODE (active when DEEP_MODE = ON)
- You reason in steps internally: macro context → market structure → confluence → scenarios → verdict.
- Weigh macro drivers for crypto (Fed policy & rate path, DXY, global liquidity, ETF flows, halving cycle) and for stocks (rates, sector rotation, earnings momentum, valuations vs history).
- Present a **scenario table**: Base / Bull / Bear case, each with a rough probability and what confirms or invalidates it.
- Cross-check confluence: does price action agree with momentum, volume and the higher timeframe? Say where they diverge.
- Allow up to ~450 words, still structured and punchy — never rambling.

## HARD RULES
- You educate and analyze — you NEVER promise returns and never say "guaranteed profit".
- You are not a licensed financial advisor; if asked, remind in ONE short line max, only when giving a buy/sell style verdict.
- Never invent exact live prices not in your data — say "approximately" and use the data given.
- Risk management first: when giving trade ideas, always include invalidation/stop-loss level.

## LIVE MARKET DATA (source of truth, updated feed)`;

/** Friendly message for a missing key — says EXACTLY what to do. */
const KEY_MISSING_MESSAGE =
  'KHAN AI brain is not connected yet. Site owner: add GEMINI_API_KEY in Vercel → Settings → Environment Variables (get a free key at aistudio.google.com/apikey), then redeploy.';

type ChatMsg = { role: 'user' | 'assistant'; content: string };

/** One chat-completions call to the Gemini OpenAI-compatible endpoint. */
async function callBrain(
  apiKey: string,
  system: string,
  messages: ChatMsg[],
  reasoningEffort?: 'low' | 'medium' | 'high' | 'none'
): Promise<string> {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'system', content: system }, ...messages],
      // Fast mode skips internal reasoning (near-instant); deep mode lets
      // Gemini think dynamically (omitting the field = dynamic thinking).
      ...(reasoningEffort ? { reasoning_effort: reasoningEffort } : {}),
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    const err = new Error(`Gemini ${res.status}: ${detail.slice(0, 300)}`);
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content || '';
}

export async function POST(req: NextRequest) {
  // AI cost protection: 20 questions / 5 min / IP
  const rl = rateLimit(`aichat:${clientIp(req)}`, 20, 5 * 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter, 'KHAN needs a breather — you have used your AI quota for now. Try again in a few minutes.');

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('KHAN AI: GEMINI_API_KEY is not set in this environment.');
    return NextResponse.json({ error: KEY_MISSING_MESSAGE }, { status: 503 });
  }

  try {
    const body = await req.json();
    const parsed = parse(chatSchema, body);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const messages = parsed.data.messages;
    const deep = parsed.data.deep;
    if (!messages.length || !messages[messages.length - 1]?.content?.trim()) {
      return NextResponse.json({ error: 'Ask me anything about crypto, stocks or trading.' }, { status: 400 });
    }

    const user = await getCurrentUser();

    // Build live market snapshot to inject into system context
    const cryptoLine = CRYPTO_BASELINES.slice(0, 12)
      .map(c => `${c.name} (${c.symbol.toUpperCase()}): $${c.price.toLocaleString()} (${c.change24h >= 0 ? '+' : ''}${c.change24h}% 24h)`)
      .join(' | ');
    const stockLine = STOCK_BASELINES.map(fmtStockLine).join(' | ');
    const indexLine = INDICES.map(i => `${i.name}: ${i.price.toLocaleString()} (${i.changePct >= 0 ? '+' : ''}${i.changePct}%)`).join(' | ');
    const fullSystem = `${KHAN_SYSTEM_PROMPT}\n[DEEP_MODE] ${deep ? 'ON — full multi-scenario macro-aware analysis' : 'OFF — fast mode'}\n[CRYPTO] ${cryptoLine}\n[STOCKS] ${stockLine}\n[INDICES] ${indexLine}\n[TIME] ${new Date().toUTCString()}`;

    let replyText: string;
    try {
      if (deep) {
        // Deep mode: dynamic thinking (no reasoning_effort) — highest quality.
        try {
          replyText = await callBrain(apiKey, fullSystem, messages);
        } catch {
          // fallback: deep failed → retry in fast mode
          replyText = await callBrain(apiKey, fullSystem, messages, 'none');
        }
      } else {
        // Fast mode: skip thinking; if the endpoint rejects reasoning_effort, retry plain.
        try {
          replyText = await callBrain(apiKey, fullSystem, messages, 'none');
        } catch {
          replyText = await callBrain(apiKey, fullSystem, messages);
        }
      }
    } catch (brainErr) {
      console.error('Gemini brain error:', brainErr);
      return NextResponse.json(
        { error: 'KHAN AI is thinking too hard. Give me a moment and ask again.' },
        { status: 502 }
      );
    }

    const reply = replyText.trim() || 'I could not generate a response. Please ask again.';
    const askedQuestion = messages[messages.length - 1].content.trim();

    // Save conversation to database when logged in (real user info storage)
    if (user) {
      try {
        await db.chatMessage.createMany({
          data: [
            { userId: user.id, role: 'user', content: askedQuestion },
            { userId: user.id, role: 'assistant', content: reply },
          ],
        });
      } catch (e) {
        console.error('Chat persist error:', e);
      }
    }

    return NextResponse.json({ reply, saved: !!user });
  } catch (err) {
    console.error('KHAN AI error:', err);
    return NextResponse.json(
      { error: 'KHAN AI is thinking too hard. Give me a moment and ask again.' },
      { status: 500 }
    );
  }
}
