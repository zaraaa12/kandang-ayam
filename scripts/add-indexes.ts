/**
 * Script to add performance optimization indexes
 * Run with: npx ts-node scripts/add-indexes.ts
 */

import { Pool } from "pg"
import Database from "better-sqlite3"
import path from "path"
import fs from "fs"

const SQLITE_DB_PATH = path.join(process.cwd(), 'data', 'kandang-ayam.db')

// PostgreSQL indexes
const PG_INDEXES = `
-- Indexes for finance_income table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_finance_income_date ON finance_income(tx_date DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_finance_income_type ON finance_income(type);

-- Indexes for finance_expense table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_finance_expense_date ON finance_expense(tx_date DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_finance_expense_type ON finance_expense(type);

-- Indexes for finance_warist table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_finance_warist_date ON finance_warist(tx_date DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_finance_warist_type ON finance_warist(type);

-- Indexes for investment_transactions table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_investment_transactions_date ON investment_transactions(tx_date DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_investment_transactions_type ON investment_transactions(type);

-- Indexes for inventory_items table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_items_kategori ON inventory_items(kategori);
`

// SQLite indexes
const SQLITE_INDEXES = `
-- Indexes for finance_income table
CREATE INDEX IF NOT EXISTS idx_finance_income_date ON finance_income(tx_date DESC);
CREATE INDEX IF NOT EXISTS idx_finance_income_type ON finance_income(type);

-- Indexes for finance_expense table
CREATE INDEX IF NOT EXISTS idx_finance_expense_date ON finance_expense(tx_date DESC);
CREATE INDEX IF NOT EXISTS idx_finance_expense_type ON finance_expense(type);

-- Indexes for finance_warist table
CREATE INDEX IF NOT EXISTS idx_finance_warist_date ON finance_warist(tx_date DESC);
CREATE INDEX IF NOT EXISTS idx_finance_warist_type ON finance_warist(type);

-- Indexes for investment_transactions table
CREATE INDEX IF NOT EXISTS idx_investment_transactions_date ON investment_transactions(tx_date DESC);
CREATE INDEX IF NOT EXISTS idx_investment_transactions_type ON investment_transactions(type);

-- Indexes for inventory_items table
CREATE INDEX IF NOT EXISTS idx_inventory_items_kategori ON inventory_items(kategori);
`

async function addPostgresIndexes() {
  if (!process.env.DATABASE_URL) {
    console.log('❌ DATABASE_URL not configured')
    return
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  })

  try {
    console.log('🔧 Adding PostgreSQL indexes...')
    
    const statements = PG_INDEXES
      .split('\n')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--'))

    for (const stmt of statements) {
      try {
        await pool.query(stmt)
        console.log(`✅ ${stmt.substring(0, 60)}...`)
      } catch (error: any) {
        // CONCURRENTLY may fail if index already exists
        if (error.code === '42P07') {
          console.log(`ℹ️  Index already exists: ${stmt.substring(0, 50)}...`)
        } else {
          console.error(`❌ Failed: ${stmt.substring(0, 50)}...`, error.message)
        }
      }
    }

    console.log('✅ PostgreSQL indexes added successfully')
  } finally {
    await pool.end()
  }
}

function addSqliteIndexes() {
  if (!fs.existsSync(SQLITE_DB_PATH)) {
    console.log('❌ SQLite database not found at:', SQLITE_DB_PATH)
    return
  }

  console.log('🔧 Adding SQLite indexes...')
  
  const db = new Database(SQLITE_DB_PATH)

  try {
    const statements = SQLITE_INDEXES
      .split('\n')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--'))

    for (const stmt of statements) {
      try {
        db.exec(stmt)
        console.log(`✅ ${stmt.substring(0, 60)}...`)
      } catch (error: any) {
        console.error(`❌ Failed: ${stmt.substring(0, 50)}...`, error.message)
      }
    }

    console.log('✅ SQLite indexes added successfully')
  } finally {
    db.close()
  }
}

async function main() {
  console.log('🚀 Starting index optimization...\n')

  // Try PostgreSQL first
  await addPostgresIndexes()
  
  console.log()
  
  // Then SQLite
  addSqliteIndexes()

  console.log('\n✨ Index optimization complete!')
}

main().catch(console.error)