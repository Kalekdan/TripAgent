import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { description, agentDateFinder, agentAccommodation, agentFoodShop, agentItinerary } = body;

  if (!description) {
    return NextResponse.json({ error: 'Description is required' }, { status: 400 });
  }

  const db = getDb();
  const stmt = db.prepare(
    `INSERT INTO trips (description, agent_date_finder, agent_accommodation, agent_food_shop, agent_itinerary)
     VALUES (?, ?, ?, ?, ?)`
  );
  const result = stmt.run(
    description,
    agentDateFinder ? 1 : 0,
    agentAccommodation ? 1 : 0,
    agentFoodShop ? 1 : 0,
    agentItinerary ? 1 : 0
  );

  return NextResponse.json({ id: result.lastInsertRowid });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  const db = getDb();
  if (id) {
    const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(Number(id));
    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }
    return NextResponse.json(trip);
  }

  const trips = db.prepare('SELECT * FROM trips ORDER BY created_at DESC').all();
  return NextResponse.json(trips);
}
