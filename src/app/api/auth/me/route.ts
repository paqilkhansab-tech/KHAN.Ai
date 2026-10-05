import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

// refresh the activity heartbeat at most once per 5 minutes per user —
// /me fires on every page load, this keeps DB writes ~12/user/hour max
const SEEN_THROTTLE_MS = 5 * 60_000;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null }, { status: 200 });

  // heartbeat: mark the user as "seen now" (throttled)
  const stale =
    !user.lastSeenAt || Date.now() - user.lastSeenAt.getTime() > SEEN_THROTTLE_MS;
  if (stale) {
    db.user
      .update({ where: { id: user.id }, data: { lastSeenAt: new Date() } })
      .catch((e) => console.error('[me] heartbeat update failed:', e));
  }

  const watchlist = await db.watchlistItem.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  });

  const chatCount = await db.chatMessage.count({ where: { userId: user.id } });

  return NextResponse.json({ user, watchlist, chatCount });
}
