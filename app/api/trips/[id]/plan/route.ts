import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUsername, getDisplayName } from '@/lib/auth';
import { getDb } from '@/lib/db';

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function formatDate(date: Date) {
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

async function getTripMember(tripId: number, username: string) {
  const db = getDb();
  return db.prepare(
    'SELECT is_admin FROM trip_members WHERE trip_id = ? AND username = ?'
  ).get(tripId, username) as { is_admin: number } | undefined;
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const username = await getCurrentUsername();
  if (!username) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const { id } = await params;
  const tripId = Number(id);
  if (!await getTripMember(tripId, username)) return NextResponse.json({ error: 'Trip not found' }, { status: 404 });

  const plan = getDb().prepare(
    `SELECT start_date, end_date, locked_by, locked_at
     FROM trip_plans WHERE trip_id = ?`
  ).get(tripId) as {
    start_date: string;
    end_date: string;
    locked_by: string;
    locked_at: string;
  } | undefined;
  if (!plan) return NextResponse.json({ plan: null });

  return NextResponse.json({
    plan: {
      ...plan,
      locked_by_name: getDisplayName(plan.locked_by as Parameters<typeof getDisplayName>[0]),
      label: `${dateLabel(new Date(`${plan.start_date}T00:00:00Z`))} - ${dateLabel(new Date(`${plan.end_date}T00:00:00Z`))}`,
    },
  });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const username = await getCurrentUsername();
  if (!username) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const { id } = await params;
  const tripId = Number(id);
  const member = await getTripMember(tripId, username);
  if (!member) return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
  if (!member.is_admin) return NextResponse.json({ error: 'Only the trip admin can lock the trip plan' }, { status: 403 });

  const body = await request.json();
  if (typeof body.start !== 'string' || typeof body.end !== 'string') {
    return NextResponse.json({ error: 'A start and end date are required' }, { status: 400 });
  }

  const trip = getDb().prepare('SELECT duration_days FROM trips WHERE id = ?').get(tripId) as { duration_days: number } | undefined;
  const start = new Date(`${body.start}T00:00:00Z`);
  const end = new Date(`${body.end}T00:00:00Z`);
  if (!trip || Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf())) {
    return NextResponse.json({ error: 'Invalid trip or dates' }, { status: 400 });
  }
  if (formatDate(addDays(start, trip.duration_days - 1)) !== body.end) {
    return NextResponse.json({ error: 'The selected dates do not match the trip length' }, { status: 400 });
  }

  const db = getDb();
  db.prepare(
    `INSERT INTO trip_plans (trip_id, start_date, end_date, locked_by, locked_at)
     VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(trip_id) DO UPDATE SET
       start_date = excluded.start_date,
       end_date = excluded.end_date,
       locked_by = excluded.locked_by,
       locked_at = excluded.locked_at`
  ).run(tripId, body.start, body.end, username);
  db.prepare('UPDATE trips SET availability_locked = 1 WHERE id = ?').run(tripId);

  return NextResponse.json({
    plan: {
      start_date: body.start,
      end_date: body.end,
      locked_by: username,
      locked_by_name: getDisplayName(username),
      label: `${dateLabel(start)} - ${dateLabel(end)}`,
    },
  });
}
