/**
 * Clear all finance_income and finance_expense data from SQLite and Supabase,
 * then verify income.xlsx and expense.xlsx parsing works correctly.
 */
import Database from "better-sqlite3"
import path from "path"
import { Pool } from "pg"
import * as dotenv from "dotenv"

dotenv.config({ path: path.join(process.cwd(), ".env.local") })

const SQLITE_DB_PATH = path.join(process.cwd(), "data", "kandang-ayam.db")

async function clearTable(tableName: string) {
  console.log(`\n--- Clearing ${tableName} ---`)

  // SQLite
  const db = new Database(SQLITE_DB_PATH)
  db.pragma("journal_mode = WAL")
  const exists = db.prepare(`select name from sqlite_master where type = 'table' and name = '${tableName}'`).get()
  if (exists) {
    const before = (db.prepare(`select count(*) as cnt from ${tableName}`).get() as any).cnt
    db.exec(`DELETE FROM ${tableName}`)
    const after = (db.prepare(`select count(*) as cnt from ${tableName}`).get() as any).cnt
    console.log(`  SQLite:   ${before} -> ${after}`)
  } else {
    console.log(`  SQLite:   table not found, skipping`)
  }
  db.close()

  // Supabase
  if (process.env.DATABASE_URL) {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 5,
      connectionTimeoutMillis: 15000,
    })
    try {
      const existsResult = await pool.query(`select to_regclass('public.${tableName}') as exists`)
      if (existsResult.rows[0]?.exists) {
        const before = await pool.query(`SELECT count(*) FROM ${tableName}`)
        await pool.query(`DELETE FROM ${tableName}`)
        const after = await pool.query(`SELECT count(*) FROM ${tableName}`)
        console.log(`  Supabase: ${before.rows[0].count} -> ${after.rows[0].count}`)
      } else {
        console.log(`  Supabase: table not found, skipping`)
      }
    } catch (error) {
      console.error(`  Supabase error:`, (error as Error).message)
    } finally {
      await pool.end()
    }
  }
}

async function verifyParsers() {
  console.log("\n--- Verifying xlsx parsers ---")

  const { getIncomeSheetTransactions } = await import("../lib/expense-sheet")
  const { getExpenseSheetTransactions } = await import("../lib/income-sheet")

  const income = await getIncomeSheetTransactions()
  console.log(`  income.xlsx:  ${income.length} transactions, total Rp ${income.reduce((s: number, t: any) => s + t.jumlah, 0).toLocaleString("id-ID")}, vol ${income.reduce((s: number, t: any) => s + t.vol, 0).toFixed(1)} kg`)

  const expense = getExpenseSheetTransactions()
  console.log(`  expense.xlsx: ${expense.length} transactions, total Rp ${expense.reduce((s: number, t: any) => s + t.jumlah, 0).toLocaleString("id-ID")}`)
}

async function main() {
  console.log("=== CLEAR FINANCE DATA ===")
  await clearTable("finance_income")
  await clearTable("finance_expense")
  await verifyParsers()
  console.log("\n=== DONE ===")
}

main().catch(console.error)
