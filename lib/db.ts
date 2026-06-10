import { Pool } from "pg"
import Database from "better-sqlite3"
import fs from "fs"
import path from "path"

/**
 * Centralized database connection utility
 * 
 * Supports both PostgreSQL (Supabase) for production and SQLite for local development.
 * Automatically falls back to SQLite if PostgreSQL connection fails.
 */

// SQLite database path
const SQLITE_DB_PATH = path.join(process.cwd(), 'data', 'kandang-ayam.db')

// Global state for singleton pattern
const globalForDb = globalThis as typeof globalThis & {
  pgPool?: Pool
  sqliteDb?: Database.Database
  dbMode?: 'postgres' | 'sqlite'
  _sqliteFallbackUntil?: number
}

export type DbMode = 'postgres' | 'sqlite'

/**
 * Get the current database mode.
 * If DATABASE_URL is set, prefers postgres. 
 * Temporary sqlite fallback auto-resets after 30s to retry Supabase.
 */
export function getDbMode(): DbMode {
  // If explicitly set to sqlite via env, always use sqlite
  if (process.env.DB_MODE === 'sqlite') {
    globalForDb.dbMode = 'sqlite'
    return 'sqlite'
  }

  // If no DATABASE_URL, always sqlite
  if (!process.env.DATABASE_URL) {
    globalForDb.dbMode = 'sqlite'
    return 'sqlite'
  }

  // Check if temporary sqlite fallback has expired (30s auto-retry)
  if (globalForDb.dbMode === 'sqlite' && globalForDb._sqliteFallbackUntil) {
    if (Date.now() >= globalForDb._sqliteFallbackUntil) {
      // Reset — try postgres again
      globalForDb.dbMode = 'postgres'
      globalForDb._sqliteFallbackUntil = undefined
      console.log('🔄 SQLite fallback expired, retrying Supabase/PostgreSQL...')
      return 'postgres'
    }
    return 'sqlite'
  }

  // Explicit postgres env or default
  if (globalForDb.dbMode === 'postgres' || process.env.DB_MODE === 'postgres' || !globalForDb.dbMode) {
    globalForDb.dbMode = 'postgres'
    return 'postgres'
  }

  return globalForDb.dbMode
}

/**
 * Get or create the PostgreSQL connection pool
 */
function getPostgresPool(): Pool {
  if (!globalForDb.pgPool) {
    const connectionString = process.env.DATABASE_URL
    
    if (!connectionString) {
      throw new Error(
        "DATABASE_URL environment variable is not configured.\n" +
        "Please set it in .env.local with your Supabase PostgreSQL connection string.\n" +
        "Format: postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-ID].supabase.co:5432/postgres"
      )
    }

    globalForDb.pgPool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false
      },
      // Connection pool settings
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    })

    // Graceful shutdown handler
    process.on('beforeExit', async () => {
      await globalForDb.pgPool?.end()
    })
  }

  return globalForDb.pgPool
}

/**
 * Get or create the SQLite database connection
 */
function createSqliteDb(): Database.Database {
  if (!globalForDb.sqliteDb) {
    // Ensure data directory exists
    const dataDir = path.dirname(SQLITE_DB_PATH)
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }
    
    globalForDb.sqliteDb = new Database(SQLITE_DB_PATH)
    globalForDb.sqliteDb.pragma('journal_mode = WAL')
    
    console.log('📦 Using SQLite database at:', SQLITE_DB_PATH)
  }
  
  return globalForDb.sqliteDb
}

/**
 * Get the PostgreSQL connection pool
 */
export function getDbPool(): Pool {
  return getPostgresPool()
}

/**
 * Get the SQLite database instance
 */
export function getSqliteDb(): Database.Database {
  return createSqliteDb()
}

/**
 * Test the PostgreSQL database connection
 */
export async function testDbConnection(): Promise<boolean> {
  try {
    const pool = getPostgresPool()
    const client = await pool.connect()
    await client.query('SELECT NOW()')
    client.release()
    return true
  } catch (error) {
    console.error('PostgreSQL connection failed:', error)
    return false
  }
}

/**
 * Initialize PostgreSQL database tables
 */
export async function initDatabase(): Promise<void> {
  const pool = getPostgresPool()
  
  const schemaSQL = `
    create table if not exists produksi_records (
      id text primary key,
      record_date date not null,
      month text not null,
      act integer not null check (act >= 0),
      vol numeric(10, 2) not null check (vol >= 0),
      ayam integer not null check (ayam > 0),
      hdp numeric(6, 2) not null check (hdp >= 0),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table if not exists finance_transactions (
      id text primary key,
      no text not null unique,
      type text not null check (type in ('sale', 'expense')),
      tx_date date not null,
      category text not null,
      buyer text not null default '',
      vol numeric(10, 2) not null default 0 check (vol >= 0),
      jumlah integer not null check (jumlah >= 0),
      notes text not null default '',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table if not exists livestock_batches (
      id text primary key,
      masuk date not null,
      jumlah integer not null check (jumlah > 0),
      tahun integer not null default 0 check (tahun >= 0),
      bulan integer not null default 0 check (bulan >= 0),
      hari integer not null default 0 check (hari >= 0),
      status text not null check (status in ('active', 'partial', 'closed')),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table if not exists livestock_vaccinations (
      no integer primary key,
      tanggal date not null,
      nama text not null,
      qty integer not null check (qty > 0),
      satuan text not null,
      harga integer not null default 0 check (harga >= 0),
      subtotal integer not null check (subtotal >= 0),
      batch text not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table if not exists inventory_items (
      id text primary key,
      nama text not null,
      kategori text not null check (kategori in ('Feed', 'Medical', 'Parts', 'Cleaning', 'Utility')),
      stok integer not null check (stok >= 0),
      satuan text not null,
      kapasitas integer not null check (kapasitas > 0),
      harga_satuan integer not null check (harga_satuan >= 0),
      terakhir_restock date not null,
      keterangan text not null default '',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table if not exists users (
      id serial primary key,
      username text not null unique,
      password text not null,
      name text not null,
      role text not null check (role in ('Admin', 'Karyawan', 'Farm Manager')),
      is_active boolean not null default true,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    INSERT INTO users (username, password, name, role, is_active) 
    VALUES 
      ('admin', 'kandang2025', 'Admin Kandang', 'Admin', true),
      ('warist', 'warist123', 'Warist', 'Karyawan', true),
      ('manager', 'manager2025', 'Farm Manager', 'Farm Manager', true)
    ON CONFLICT (username) DO NOTHING;
  `

  try {
    await pool.query(schemaSQL)
    console.log('✅ Database tables initialized successfully')
  } catch (error) {
    console.error('❌ Failed to initialize database tables:', error)
    throw error
  }
}

/**
 * Initialize SQLite database tables
 */
export function initSqliteDatabase(): void {
  const db = getSqliteDb()
  
  const schemaSQL = `
    CREATE TABLE IF NOT EXISTS produksi_records (
      id TEXT PRIMARY KEY,
      record_date TEXT NOT NULL,
      month TEXT NOT NULL,
      act INTEGER NOT NULL CHECK (act >= 0),
      vol REAL NOT NULL CHECK (vol >= 0),
      ayam INTEGER NOT NULL CHECK (ayam > 0),
      hdp REAL NOT NULL CHECK (hdp >= 0),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS finance_transactions (
      id TEXT PRIMARY KEY,
      no TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL CHECK (type IN ('sale', 'expense')),
      tx_date TEXT NOT NULL,
      category TEXT NOT NULL,
      buyer TEXT NOT NULL DEFAULT '',
      vol REAL NOT NULL DEFAULT 0 CHECK (vol >= 0),
      jumlah INTEGER NOT NULL CHECK (jumlah >= 0),
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS livestock_batches (
      id TEXT PRIMARY KEY,
      masuk TEXT NOT NULL,
      jumlah INTEGER NOT NULL CHECK (jumlah > 0),
      tahun INTEGER NOT NULL DEFAULT 0 CHECK (tahun >= 0),
      bulan INTEGER NOT NULL DEFAULT 0 CHECK (bulan >= 0),
      hari INTEGER NOT NULL DEFAULT 0 CHECK (hari >= 0),
      status TEXT NOT NULL CHECK (status IN ('active', 'partial', 'closed')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS livestock_vaccinations (
      no INTEGER PRIMARY KEY AUTOINCREMENT,
      tanggal TEXT NOT NULL,
      nama TEXT NOT NULL,
      qty INTEGER NOT NULL CHECK (qty > 0),
      satuan TEXT NOT NULL,
      harga INTEGER NOT NULL DEFAULT 0 CHECK (harga >= 0),
      subtotal INTEGER NOT NULL CHECK (subtotal >= 0),
      batch TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS inventory_items (
      id TEXT PRIMARY KEY,
      nama TEXT NOT NULL,
      kategori TEXT NOT NULL CHECK (kategori IN ('Feed', 'Medical', 'Parts', 'Cleaning', 'Utility')),
      stok INTEGER NOT NULL CHECK (stok >= 0),
      satuan TEXT NOT NULL,
      kapasitas INTEGER NOT NULL CHECK (kapasitas > 0),
      harga_satuan INTEGER NOT NULL CHECK (harga_satuan >= 0),
      terakhir_restock TEXT NOT NULL,
      keterangan TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('Admin', 'Karyawan', 'Farm Manager')),
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    INSERT OR IGNORE INTO users (username, password, name, role, is_active) 
    VALUES 
      ('admin', 'kandang2025', 'Admin Kandang', 'Admin', 1),
      ('warist', 'warist123', 'Warist', 'Karyawan', 1),
      ('manager', 'manager2025', 'Farm Manager', 'Farm Manager', 1);
  `
  
  try {
    db.exec(schemaSQL)
    console.log('✅ SQLite database tables initialized successfully')
  } catch (error) {
    console.error('❌ Failed to initialize SQLite database tables:', error)
    throw error
  }
}

/**
 * Close the PostgreSQL connection pool
 */
export async function closeDbPool(): Promise<void> {
  if (globalForDb.pgPool) {
    await globalForDb.pgPool.end()
    globalForDb.pgPool = undefined
  }
}

/**
 * Temporarily fall back to SQLite for 30 seconds.
 * After 30s, getDbMode() will auto-retry Supabase/PostgreSQL.
 */
export function forceSqliteMode(): void {
  globalForDb.dbMode = "sqlite"
  globalForDb._sqliteFallbackUntil = Date.now() + 30_000
}

/**
 * Close the SQLite database connection
 */
export function closeSqliteDb(): void {
  if (globalForDb.sqliteDb) {
    globalForDb.sqliteDb.close()
    globalForDb.sqliteDb = undefined
  }
}

/**
 * Close all database connections
 */
export async function closeAllDbConnections(): Promise<void> {
  await closeDbPool()
  closeSqliteDb()
  globalForDb.dbMode = undefined
}
