import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUsername, getDisplayName } from '@/lib/auth';
import { getDb } from '@/lib/db';

function getTrip(token: string) {
  return getDb().prepare(
    'SELECT id, description, duration_days FROM trips WHERE invite_token = ?'
  ).get(token) as { id: number; description: string; duration_days: number } | undefined;
}

export async function GET(request: NextRequest) {
  const token = new URL(request.url).searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'Invite link is invalid' }, { status: 400 });

  const trip = getTrip(token);
  if (!trip) return NextResponse.json({ error: 'Invite link is invalid or expired' }, { status: 404 });

  const username = await getCurrentUsername();
  const alreadyMember = username
    ? Boolean(getDb().prepare('SELECT 1 FROM trip_members WHERE trip_id = ? AND username = ?').get(trip.id, username))
    : false;
  return NextResponse.json({ ...trip, alreadyMember, username: username ? getDisplayName(username) : null });
}

export async function POST(request: NextRequest) {
  const username = await getCurrentUsername();
  if (!username) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const { token } = await request.json();
  const trip = typeof token === 'string' ? getTrip(token) : undefined;
  if (!trip) return NextResponse.json({ error: 'Invite link is invalid or expired' }, { status: 404 });

  getDb().prepare(
    'INSERT OR IGNORE INTO trip_members (trip_id, username, is_admin) VALUES (?, ?, 0)'
  ).run(trip.id, username);
  return NextResponse.json({ tripId: trip.id });
}