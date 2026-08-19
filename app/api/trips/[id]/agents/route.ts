import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUsername, getDisplayName } from '@/lib/auth';
import { getDb } from '@/lib/db';

interface AvailabilityRow {
  username: string;
  date: string | null;
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function dateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

function dateLabel(date: Date) {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const username = await getCurrentUsername();
  if (!username) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const { id } = await params;
  const db = getDb();
  const member = db.prepare(
    'SELECT is_admin FROM trip_members WHERE trip_id = ? AND username = ?'
  ).get(Number(id), username) as { is_admin: number } | undefined;
  if (!member) return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
  if (!member.is_admin) return NextResponse.json({ error: 'Only the trip admin can trigger agents' }, { status: 403 });

  const trip = db.prepare('SELECT duration_days FROM trips WHERE id = ?').get(Number(id)) as { duration_days: number };
  const durationDays = trip.duration_days;

  const rows = db.prepare(
    `SELECT trip_members.username, availability.date
     FROM trip_members
     LEFT JOIN availability ON availability.trip_id = trip_members.trip_id
       AND availability.username = trip_members.username
       AND availability.available = 1
     WHERE trip_members.trip_id = ?`
  ).all(Number(id)) as AvailabilityRow[];
  const memberDates = new Map<string, Set<string>>();
  for (const row of rows) {
    if (!memberDates.has(row.username)) memberDates.set(row.username, new Set());
    if (row.date) memberDates.get(row.username)?.add(row.date);
  }

  const allDates = [...memberDates.values()].flatMap((dates) => [...dates]).sort();
  if (allDates.length === 0) return NextResponse.json({ status: 'completed', results: [] });

  const firstDate = new Date(`${allDates[0]}T00:00:00Z`);
  const lastDate = new Date(`${allDates[allDates.length - 1]}T00:00:00Z`);
  const results = [];
  for (let start = firstDate; addDays(start, durationDays - 1) <= lastDate; start = addDays(start, 1)) {
    const window = Array.from({ length: durationDays }, (_, offset) => dateString(addDays(start, offset)));
    const membersAvailable = [...memberDates.entries()]
      .filter(([, dates]) => window.every((date) => dates.has(date)))
      .map(([username]) => getDisplayName(username as Parameters<typeof getDisplayName>[0]));
    results.push({
      start: window[0],
      end: window[window.length - 1],
      membersAvailable,
      label: `${dateLabel(start)} - ${dateLabel(addDays(start, durationDays - 1))}`,
      best: false,
    });
  }

  results.sort((left, right) =>
    right.membersAvailable.length - left.membersAvailable.length || left.start.localeCompare(right.start)
  );
  if (results[0]) results[0].best = true;
  return NextResponse.json({ status: 'completed', results });
}
