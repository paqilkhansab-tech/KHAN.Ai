import { NextRequest, NextResponse } from 'next/server';
import { ttsSchema, parse } from '@/lib/validation';
import { rateLimit, clientIp, tooMany } from '@/lib/rate-limit';

/**
 * KHAN AI VOICE ENGINE — Google Gemini native TTS via plain REST.
 * Zero sandbox SDK — works on any hosting platform (Vercel included).
 * - Strips markdown / emojis / symbols that TTS reads poorly
 * - Converts currency symbols to spoken words ($64,000 -> "64,000 dollars")
 * - Splits long answers at sentence boundaries (per-request input cap)
 * - Gemini returns raw PCM; we wrap it in a WAV header
 * - Concatenates chunk WAVs into one seamless audio response
 * Requires GEMINI_API_KEY environment variable (free: aistudio.google.com/apikey).
 */

// Vercel serverless cap (Hobby allows up to 60s) — multi-chunk voice needs headroom.
export const maxDuration = 60;

const TTS_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent';
const VOICE = 'CHARON'; // deep, informative Gemini prebuilt voice — premium KHAN analyst persona
const MAX_INPUT_CHARS = 6000; // safety cap (~6 chunks)
const CHUNK_SIZE = 950;
const FALLBACK_SAMPLE_RATE = 24000; // Gemini TTS default PCM rate

const KEY_MISSING_MESSAGE =
  'Voice engine is not connected yet. Site owner: add GEMINI_API_KEY in Vercel → Settings → Environment Variables (get a free key at aistudio.google.com/apikey), then redeploy.';

/** Convert markdown answer into clean, natural speech text */
function cleanForSpeech(md: string): string {
  let t = md;
  t = t.replace(/```[\s\S]*?```/g, ' code block omitted. '); // code fences
  t = t.replace(/`([^`]+)`/g, '$1'); // inline code
  t = t.replace(/!\[[^\]]*\]\([^)]*\)/g, ''); // images
  t = t.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1'); // links -> text
  t = t.replace(/^\s{0,3}#{1,6}\s+/gm, ''); // heading marks
  t = t.replace(/\*\*([^*]+)\*\*/g, '$1'); // bold
  t = t.replace(/\*([^*]+)\*/g, '$1'); // italic
  t = t.replace(/^\s{0,3}[-*+]\s+/gm, ''); // list bullets
  t = t.replace(/^\s{0,3}>\s?/gm, ''); // blockquotes
  t = t.replace(/\|/g, ' '); // table pipes
  // currency: "$64,000" -> "64,000 dollars", "₹1,520" -> "1,520 rupees"
  t = t.replace(/\$\s?([0-9][0-9,]*(?:\.[0-9]+)?)/g, '$1 dollars');
  t = t.replace(/₹\s?([0-9][0-9,]*(?:\.[0-9]+)?)/g, '$1 rupees');
  t = t.replace(/\$\s?/g, ' dollars ');
  t = t.replace(/₹\s?/g, ' rupees ');
  t = t.replace(/→|=>/g, ' to ');
  t = t.replace(/([\u{1F300}-\u{1FAFF}]|[\u{2600}-\u{27BF}]|[\u{FE00}-\u{FE0F}]|[\u{2190}-\u{21FF}]|[\u{2B00}-\u{2BFF}])/gu, ' '); // emoji/arrows/symbols
  t = t.replace(/\s*([.!?])\s*/g, '$1 '); // normalize sentence spacing
  t = t.replace(/\s+/g, ' ').trim();
  return t;
}

/** Split speech text into <=CHUNK_SIZE sentence-boundary chunks */
function splitChunks(text: string, maxLen = CHUNK_SIZE): string[] {
  if (text.length <= maxLen) return [text];
  const sentences = text.match(/[^.!?]+[.!?]+["')\]]?\s*/g) || [text];
  const chunks: string[] = [];
  let cur = '';
  for (const s of sentences) {
    if ((cur + s).length <= maxLen) {
      cur += s;
    } else {
      if (cur.trim()) chunks.push(cur.trim());
      if (s.length > maxLen) {
        chunks.push(s.trim()); // overlong single sentence: let API soft-split it
        cur = '';
      } else {
        cur = s;
      }
    }
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks.slice(0, 6); // hard cap 6 chunks (keeps total time well inside maxDuration)
}

/** One Gemini TTS call -> decoded PCM buffer + sample rate */
async function speakChunk(apiKey: string, text: string): Promise<{ pcm: Buffer; sampleRate: number }> {
  const res = await fetch(TTS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: VOICE },
          },
        },
      },
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    const err = new Error(`Gemini TTS ${res.status}: ${detail.slice(0, 300)}`);
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }

  const data = (await res.json()) as {
    candidates?: {
      content?: {
        parts?: { inlineData?: { mimeType?: string; data?: string } }[];
      };
    }[];
  };

  const inline = data.candidates?.[0]?.content?.parts?.[0]?.inlineData;
  if (!inline?.data) throw new Error('Gemini TTS returned no audio payload.');

  const pcm = Buffer.from(inline.data, 'base64');
  // mimeType looks like "audio/L16;codec=pcm;rate=24000"
  const rateMatch = inline.mimeType?.match(/rate=(\d+)/);
  const sampleRate = rateMatch ? parseInt(rateMatch[1], 10) : FALLBACK_SAMPLE_RATE;
  return { pcm, sampleRate };
}

/** Wrap raw 16-bit mono PCM in a minimal 44-byte WAV header */
function pcmToWav(pcm: Buffer, sampleRate: number, channels = 1, bits = 16): Buffer {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE((sampleRate * channels * bits) / 8, 28);
  header.writeUInt16LE((channels * bits) / 8, 32);
  header.writeUInt16LE(bits, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

/** Extract PCM payload + format info from a WAV buffer (walks RIFF chunks) */
function extractWav(buf: Buffer): { sampleRate: number; channels: number; bits: number; pcm: Buffer } {
  let offset = 12; // skip RIFF header + 'WAVE'
  let pcm = buf.subarray(44); // fallback: assume standard 44-byte header
  while (offset + 8 <= buf.length) {
    const id = buf.toString('ascii', offset, offset + 4);
    const size = buf.readUInt32LE(offset + 4);
    if (id === 'data') {
      pcm = buf.subarray(offset + 8, Math.min(offset + 8 + size, buf.length));
      break;
    }
    offset += 8 + size + (size % 2); // chunks are word-aligned
  }
  return { sampleRate: buf.readUInt32LE(24), channels: buf.readUInt16LE(22), bits: buf.readUInt16LE(34), pcm };
}

/** Merge multiple same-format WAV buffers into one clean WAV (with 140ms pause between) */
function mergeWav(buffers: Buffer[]): Buffer {
  const parts = buffers.map(extractWav);
  const first = parts[0];
  const silence = Buffer.alloc(Math.ceil(first.sampleRate * first.channels * (first.bits / 8) * 0.14));
  const pcmParts: Buffer[] = [];
  parts.forEach((p, i) => {
    if (i > 0) pcmParts.push(silence);
    pcmParts.push(p.pcm);
  });
  const totalPcm = Buffer.concat(pcmParts);
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + totalPcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(first.channels, 22);
  header.writeUInt32LE(first.sampleRate, 24);
  header.writeUInt32LE((first.sampleRate * first.channels * first.bits) / 8, 28);
  header.writeUInt16LE((first.channels * first.bits) / 8, 32);
  header.writeUInt16LE(first.bits, 34);
  header.write('data', 36);
  header.writeUInt32LE(totalPcm.length, 40);
  return Buffer.concat([header, totalPcm]);
}

export async function POST(req: NextRequest) {
  // voice generation is expensive: 15 requests / 5 min / IP
  const rl = rateLimit(`tts:${clientIp(req)}`, 15, 5 * 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter, 'Voice quota reached — try again in a few minutes.');

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('KHAN TTS: GEMINI_API_KEY is not set in this environment.');
    return NextResponse.json({ error: KEY_MISSING_MESSAGE }, { status: 503 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const parsed = parse(ttsSchema, body);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const speech = cleanForSpeech(parsed.data.text);
    if (!speech) {
      return NextResponse.json({ error: 'Nothing speakable found.' }, { status: 400 });
    }
    const chunks = splitChunks(speech);

    const buffers: Buffer[] = [];
    for (const chunk of chunks) {
      const { pcm, sampleRate } = await speakChunk(apiKey, chunk);
      buffers.push(pcmToWav(pcm, sampleRate)); // normalize every chunk to WAV so merging works
    }

    const audio = buffers.length === 1 ? buffers[0] : mergeWav(buffers);
    return new NextResponse(new Uint8Array(audio), {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': String(audio.length),
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('KHAN TTS error:', err);
    return NextResponse.json({ error: 'Voice engine unavailable — try again.' }, { status: 500 });
  }
}
