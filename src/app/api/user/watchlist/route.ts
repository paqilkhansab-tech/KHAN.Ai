import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { watchlistSchema, parse } from '@/lib/validation';
import { rateLimit, clientIp, tooMany } from '@/lib/rate-limit';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  // ownership enforced: only THIS user's rows are ever readable
  const items = await db.watchlistItem.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } });
  return NextResponse.json({ watchlist: items });
}

export async function POST(req: NextRequest) {
  const rl = rateLimit(`watchlist:${clientIp(req)}`, 30, 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter, 'Slow down a little — try again in a moment.');

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in to save coins to your watchlist.' }, { status: 401 });
  try {
    const parsed = parse(watchlistSchema, await req.json());
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const { symbol, name, kind } = parsed.data;

    const item = await db.watchlistItem.upsert({
      where: { userId_symbol: { userId: user.id, symbol } },
      update: {},
      create: { userId: user.id, symbol, name, kind },
    });
    return NextResponse.json({ item, message: `${name} saved to your watchlist.` });
  } catch (err) {
    console.error('Watchlist error:', err);
    return NextResponse.json({ error: 'Could not save. Try again.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  const symbol = req.nextUrl.searchParams.get('symbol')?.slice(0, 16);
  if (!symbol) return NextResponse.json({ error: 'Missing symbol.' }, { status: 400 });
  // deleteMany scoped to the session user — cannot delete others' rows
  await db.watchlistItem.deleteMany({ where: { userId: user.id, symbol } });
  return NextResponse.json({ message: 'Removed from watchlist.' });
}
