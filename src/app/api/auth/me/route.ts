import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null }, { status: 200 });

  const watchlist = await db.watchlistItem.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  });

  const chatCount = await db.chatMessage.count({ where: { userId: user.id } });

  return NextResponse.json({ user, watchlist, chatCount });
}
