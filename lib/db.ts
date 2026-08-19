import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
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
  created_at: string;
}
