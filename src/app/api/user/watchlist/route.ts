import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  const items = await db.watchlistItem.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } });
  return NextResponse.json({ watchlist: items });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Sign in to save coins to your watchlist.' }, { status: 401 });
  try {
    const { symbol, name, kind } = await req.json();
    if (!symbol || !name) return NextResponse.json({ error: 'Missing coin info.' }, { status: 400 });
    const item = await db.watchlistItem.upsert({
      where: { userId_symbol: { userId: user.id, symbol } },
      update: {},
      create: { userId: user.id, symbol, name, kind: kind || 'crypto' },
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
  const symbol = req.nextUrl.searchParams.get('symbol');
  if (!symbol) return NextResponse.json({ error: 'Missing symbol.' }, { status: 400 });
  await db.watchlistItem.deleteMany({ where: { userId: user.id, symbol } });
  return NextResponse.json({ message: 'Removed from watchlist.' });
}
