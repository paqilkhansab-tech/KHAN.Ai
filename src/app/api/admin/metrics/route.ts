import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * ADMIN METRICS — GET /api/admin/metrics
 *
 * Access control (defense in depth):
 * - Edge middleware already 404s every /admin* + /api/admin* request for
 *   non-allowlisted visitors (src/middleware.ts matcher).
 * - This route re-checks the session itself: only emails in ADMIN_EMAILS
 *   (comma-separated env var) get data. Everyone else gets 404.
 *
 * Definitions:
 * - totalUsers        every account ever created
 * - newUsers7d/30d    accounts created in the window
 * - activeNow/1d/7d/30d  users whose last heartbeat (lastSeenAt) OR last
 *                       login (lastLoginAt) falls inside the window.
 *                       lastSeenAt = page-load heartbeat (max 1x/5min);
 *                       lastLoginAt = explicit sign-in event.
 * - engaged*          users with at least one watchlist item / AI chat message
 */
function adminAllowlist(): string[] {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function GET(_req: NextRequest) {
  const me = await getCurrentUser();
  if (!me || !adminAllowlist().includes(me.email.toLowerCase())) {
    // 404, not 403 — same camouflage as the middleware
    return new NextResponse('Not Found', { status: 404 });
  }

  const now = Date.now();
  const since = (days: number) => new Date(now - days * 86_400_000);
  const activity = (days: number) => ({
    OR: [{ lastSeenAt: { gte: since(days) } }, { lastLoginAt: { gte: since(days) } }],
  });

  const [
    totalUsers,
    newUsers1d,
    newUsers7d,
    newUsers30d,
    activeNow,
    active1d,
    active7d,
    active30d,
    everLoggedIn,
    neverLoggedIn,
    engagedWatchlist,
    engagedChat,
    totalChatMessages,
    totalWatchlistItems,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { createdAt: { gte: since(1) } } }),
    db.user.count({ where: { createdAt: { gte: since(7) } } }),
    db.user.count({ where: { createdAt: { gte: since(30) } } }),
    db.user.count({ where: activity(15 / 1440) }), // last ~15 minutes
    db.user.count({ where: activity(1) }),
    db.user.count({ where: activity(7) }),
    db.user.count({ where: activity(30) }),
    db.user.count({ where: { lastLoginAt: { not: null } } }),
    db.user.count({ where: { lastLoginAt: null } }),
    db.user.count({ where: { watchlist: { some: {} } } }),
    db.user.count({ where: { chatMessages: { some: {} } } }),
    db.chatMessage.count(),
    db.watchlistItem.count(),
  ]);

  const recentSignups = await db.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      email: true,
      name: true,
      createdAt: true,
      lastLoginAt: true,
      lastSeenAt: true,
      _count: { select: { watchlist: true, chatMessages: true } },
    },
  });

  const mostActive = await db.user.findMany({
    where: { lastSeenAt: { not: null } },
    orderBy: { lastSeenAt: 'desc' },
    take: 10,
    select: {
      email: true,
      name: true,
      lastSeenAt: true,
      lastLoginAt: true,
      _count: { select: { watchlist: true, chatMessages: true } },
    },
  });

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    totals: {
      users: totalUsers,
      newUsers1d,
      newUsers7d,
      newUsers30d,
      everLoggedIn,
      neverLoggedIn,
    },
    activity: { activeNow, active1d, active7d, active30d },
    engagement: {
      withWatchlist: engagedWatchlist,
      withChats: engagedChat,
      totalChatMessages,
      totalWatchlistItems,
    },
    recentSignups: recentSignups.map((u) => ({
      email: u.email,
      name: u.name,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
      lastSeenAt: u.lastSeenAt,
      watchlistCount: u._count.watchlist,
      chatCount: u._count.chatMessages,
    })),
    mostActive: mostActive.map((u) => ({
      email: u.email,
      name: u.name,
      lastSeenAt: u.lastSeenAt,
      lastLoginAt: u.lastLoginAt,
      watchlistCount: u._count.watchlist,
      chatCount: u._count.chatMessages,
    })),
  });
}
