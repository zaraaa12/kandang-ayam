import fs from 'fs'
import { initSqliteDatabase, getSqliteDb } from '@/lib/db'

const dbPath = 'data/kandang-ayam.db'

// Delete the database first
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath)
  try { fs.unlinkSync(dbPath + '-shm') } catch {}
  try { fs.unlinkSync(dbPath + '-wal') } catch {}
  console.log('Deleted old database')
}

// Initialize the database
initSqliteDatabase()

// Query the schema
const db = getSqliteDb()
const schema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='finance_transactions'").get() as { sql: string } | undefined
console.log('Finance transactions table schema:')
console.log(schema?.sql || 'NOT FOUND')

// Also show what the INSERT is failing on
try {
  db.prepare(`INSERT INTO finance_transactions (id, no, type, tx_date, category, buyer, vol, jumlah, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run('test-id', 'TEST-001', 'income', '2026-06-02', 'Dana Investasi', '', 0, 5000000, '')
  console.log('✅ Insert successful!')
} catch (error) {
  console.error('❌ Insert failed:', error instanceof Error ? error.message : error)
}
