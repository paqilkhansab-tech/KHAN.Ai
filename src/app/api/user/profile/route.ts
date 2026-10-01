import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 });

  try {
    const { name, phone } = await req.json();
    const data: { name?: string; phone?: string | null } = {};
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length < 2) {
        return NextResponse.json({ error: 'Name must be at least 2 characters.' }, { status: 400 });
      }
      data.name = name.trim();
    }
    if (phone !== undefined) data.phone = phone.trim() || null;

    const updated = await db.user.update({
      where: { id: user.id },
      data,
      select: { id: true, name: true, email: true, phone: true },
    });
    return NextResponse.json({ user: updated, message: 'Profile updated.' });
  } catch (err) {
    console.error('Profile update error:', err);
    return NextResponse.json({ error: 'Update failed. Try again.' }, { status: 500 });
  }
}
