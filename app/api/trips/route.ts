import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUsername, isDemoUsername } from '@/lib/auth';
import { getDb } from '@/lib/db';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  const username = await getCurrentUsername();
  if (!username) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const body = await request.json();
  const { description, durationDays, agentDateFinder, agentAccommodation, agentFoodShop, agentItinerary, memberUsernames } = body;

  if (!description || !Number.isInteger(durationDays) || durationDays < 1 || durationDays > 30) {
    return NextResponse.json({ error: 'Description and a trip length from 1 to 30 days are required' }, { status: 400 });
  }

  const db = getDb();
  const inviteToken = crypto.randomBytes(18).toString('base64url');
  const stmt = db.prepare(
    `INSERT INTO trips (description, agent_date_finder, agent_accommodation, agent_food_shop, agent_itinerary, duration_days, invite_token)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  const result = stmt.run(
    description,
    agentDateFinder ? 1 : 0,
    agentAccommodation ? 1 : 0,
    agentFoodShop ? 1 : 0,
    agentItinerary ? 1 : 0,
    durationDays,
    inviteToken
  );

  db.prepare('INSERT INTO trip_members (trip_id, username, is_admin) VALUES (?, ?, 1)')
    .run(result.lastInsertRowid, username);
  if (Array.isArray(memberUsernames)) {
    const insertMember = db.prepare(
      'INSERT OR IGNORE INTO trip_members (trip_id, username, is_admin) VALUES (?, ?, 0)'
    );
    for (const member of new Set(memberUsernames)) {
      if (typeof member === 'string' && isDemoUsername(member) && member !== username) {
        insertMember.run(result.lastInsertRowid, member);
      }
    }
  }

  return NextResponse.json({ id: result.lastInsertRowid, inviteToken });
}

export async function GET(request: NextRequest) {
  const username = await getCurrentUsername();
  if (!username) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  const db = getDb();
  if (id) {
    const trip = db.prepare(
      `SELECT trips.*, trip_members.is_admin
       FROM trips
       INNER JOIN trip_members ON trip_members.trip_id = trips.id
       WHERE trips.id = ? AND trip_members.username = ?`
    ).get(Number(id), username);
    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }
    return NextResponse.json(trip);
  }

  const trips = db.prepare(
    `SELECT trips.*, trip_members.is_admin
     FROM trips
     INNER JOIN trip_members ON trip_members.trip_id = trips.id
     WHERE trip_members.username = ?
     ORDER BY trips.created_at DESC`
  ).all(username);
  return NextResponse.json(trips);
}
