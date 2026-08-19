import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUsername, getDisplayName } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const username = await getCurrentUsername();
  if (!username) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const { id } = await params;
  const db = getDb();
  const member = db.prepare(
    `SELECT trip_members.is_admin, trips.availability_locked
     FROM trip_members INNER JOIN trips ON trips.id = trip_members.trip_id
     WHERE trip_members.trip_id = ? AND trip_members.username = ?`
  ).get(Number(id), username) as { is_admin: number; availability_locked: number } | undefined;
  if (!member) return NextResponse.json({ error: 'Trip not found' }, { status: 404 });

  const dates = db.prepare(
    'SELECT date FROM availability WHERE trip_id = ? AND username = ? AND available = 1 ORDER BY date'
  ).all(Number(id), username) as { date: string }[];
  const trip = db.prepare('SELECT duration_days FROM trips WHERE id = ?').get(Number(id)) as { duration_days: number };
  const plan = db.prepare('SELECT start_date FROM trip_plans WHERE trip_id = ?').get(Number(id)) as { start_date: string } | undefined;
  const tripMembers = db.prepare(
    'SELECT username FROM trip_members WHERE trip_id = ? ORDER BY username'
  ).all(Number(id)) as { username: string }[];
  const allAvailability = db.prepare(
    'SELECT username, date FROM availability WHERE trip_id = ? AND available = 1'
  ).all(Number(id)) as { username: string; date: string }[];
  const datesByMember = new Map<string, Set<string>>();
  for (const entry of allAvailability) {
    if (!datesByMember.has(entry.username)) datesByMember.set(entry.username, new Set());
    datesByMember.get(entry.username)?.add(entry.date);
  }
  const lockedDates = plan ? Array.from({ length: trip.duration_days }, (_, offset) => {
    const date = new Date(`${plan.start_date}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + offset);
    return date.toISOString().slice(0, 10);
  }) : null;
  const members = tripMembers.map(({ username: memberUsername }) => {
    const memberDates = datesByMember.get(memberUsername) ?? new Set<string>();
    return {
      username: memberUsername,
      name: getDisplayName(memberUsername as Parameters<typeof getDisplayName>[0]),
      hasProvided: memberDates.size > 0,
      available: lockedDates ? lockedDates.every((date) => memberDates.has(date)) : null,
    };
  });
  const totalMembers = members.length;
  const membersWithAvailability = members.filter((entry) => entry.hasProvided).length;

  return NextResponse.json({
    dates: dates.map((entry) => entry.date),
    stats: { provided: membersWithAvailability, total: totalMembers },
    members,
  });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const username = await getCurrentUsername();
  if (!username) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const { id } = await params;
  const tripId = Number(id);
  const db = getDb();
  const member = db.prepare(
    `SELECT trips.availability_locked
     FROM trip_members INNER JOIN trips ON trips.id = trip_members.trip_id
     WHERE trip_members.trip_id = ? AND trip_members.username = ?`
  ).get(tripId, username) as { availability_locked: number } | undefined;
  if (!member) return NextResponse.json({ error: 'Trip not found' }, { status: 404 });

  const body = await request.json();
  if (!Array.isArray(body.dates) || body.dates.some((date: unknown) => typeof date !== 'string')) {
    return NextResponse.json({ error: 'Dates must be an array of strings' }, { status: 400 });
  }
  if (member.availability_locked) {
    return NextResponse.json({ error: 'Availability is locked for this trip' }, { status: 423 });
  }

  const saveAvailability = db.transaction((dates: string[]) => {
    db.prepare('DELETE FROM availability WHERE trip_id = ? AND username = ?').run(tripId, username);
    const insert = db.prepare(
      'INSERT INTO availability (trip_id, username, date, available) VALUES (?, ?, ?, 1)'
    );
    for (const date of dates) insert.run(tripId, username, date);
  });
  saveAvailability(body.dates);
  return NextResponse.json({ dates: body.dates });
}

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const username = await getCurrentUsername();
  if (!username) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const { id } = await params;
  const tripId = Number(id);
  const db = getDb();
  const member = db.prepare(
    'SELECT is_admin FROM trip_members WHERE trip_id = ? AND username = ?'
  ).get(tripId, username) as { is_admin: number } | undefined;
  if (!member) return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
  if (!member.is_admin) return NextResponse.json({ error: 'Only the trip admin can lock availability selection' }, { status: 403 });

  const body = await _request.json().catch(() => ({}));
  const locked = body.locked !== false;
  db.prepare('UPDATE trips SET availability_locked = ? WHERE id = ?').run(locked ? 1 : 0, tripId);
  return NextResponse.json({ locked });
}
