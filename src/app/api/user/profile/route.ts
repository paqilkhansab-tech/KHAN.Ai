import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { profileSchema, parse } from '@/lib/validation';
import { rateLimit, clientIp, tooMany } from '@/lib/rate-limit';

export async function PATCH(req: NextRequest) {
  const rl = rateLimit(`profile:${clientIp(req)}`, 15, 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter, 'Too many updates. Try again in a minute.');

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 });

  try {
    const parsed = parse(profileSchema, await req.json());
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const { name, phone } = parsed.data;

    const data: { name?: string; phone?: string | null } = {};
    if (name !== undefined) data.name = name;
    if (phone !== undefined) data.phone = phone || null;

    const updated = await db.user.update({
      where: { id: user.id }, // scoped to session owner only
      data,
      select: { id: true, name: true, email: true, phone: true },
    });
    return NextResponse.json({ user: updated, message: 'Profile updated.' });
  } catch (err) {
    console.error('Profile update error:', err);
    return NextResponse.json({ error: 'Update failed. Try again.' }, { status: 500 });
  }
}
