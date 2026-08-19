import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'trips.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    db = new Database(DB_PATH);
    db.exec(`
      CREATE TABLE IF NOT EXISTS trips (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        description TEXT NOT NULL,
        agent_date_finder INTEGER NOT NULL DEFAULT 0,
        agent_accommodation INTEGER NOT NULL DEFAULT 0,
        agent_food_shop INTEGER NOT NULL DEFAULT 0,
        agent_itinerary INTEGER NOT NULL DEFAULT 0,
        duration_days INTEGER NOT NULL DEFAULT 3,
        availability_locked INTEGER NOT NULL DEFAULT 0,
        invite_token TEXT UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS trip_members (
        trip_id INTEGER NOT NULL,
        username TEXT NOT NULL,
        is_admin INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (trip_id, username),
        FOREIGN KEY (trip_id) REFERENCES trips(id)
      );

      CREATE TABLE IF NOT EXISTS availability (
        trip_id INTEGER NOT NULL,
        username TEXT NOT NULL,
        date TEXT NOT NULL,
        available INTEGER NOT NULL DEFAULT 1,
        PRIMARY KEY (trip_id, username, date),
        FOREIGN KEY (trip_id) REFERENCES trips(id)
      );

      CREATE TABLE IF NOT EXISTS trip_plans (
        trip_id INTEGER PRIMARY KEY,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        locked_by TEXT NOT NULL,
        locked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (trip_id) REFERENCES trips(id)
      );

      INSERT OR IGNORE INTO trip_members (trip_id, username, is_admin)
      SELECT id, 'alice', 1 FROM trips;
    `);
    const tripColumns = db.prepare('PRAGMA table_info(trips)').all() as { name: string }[];
    if (!tripColumns.some((column) => column.name === 'duration_days')) {
      db.exec('ALTER TABLE trips ADD COLUMN duration_days INTEGER NOT NULL DEFAULT 3');
    }
    if (!tripColumns.some((column) => column.name === 'availability_locked')) {
      db.exec('ALTER TABLE trips ADD COLUMN availability_locked INTEGER NOT NULL DEFAULT 0');
    }
    if (!tripColumns.some((column) => column.name === 'invite_token')) {
      db.exec('ALTER TABLE trips ADD COLUMN invite_token TEXT');
    }
    const tripsWithoutInvite = db.prepare('SELECT id FROM trips WHERE invite_token IS NULL').all() as { id: number }[];
    const addInviteToken = db.prepare('UPDATE trips SET invite_token = ? WHERE id = ?');
    for (const trip of tripsWithoutInvite) {
      addInviteToken.run(crypto.randomBytes(18).toString('base64url'), trip.id);
    }
  }
  return db;
}

export interface Trip {
  id: number;
  description: string;
  agent_date_finder: number;
  agent_accommodation: number;
  agent_food_shop: number;
  agent_itinerary: number;
  duration_days: number;
  availability_locked: number;
  invite_token: string;
  created_at: string;
}
