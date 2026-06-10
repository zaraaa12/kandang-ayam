/**
 * Force-sync finance data to Supabase and verify.
 * This triggers the same logic that runs on /finance page visit.
 */
import path from "path"
import * as dotenv from "dotenv"
dotenv.config({ path: path.join(process.cwd(), ".env.local") })

async function main() {
  console.log("=== FORCE SYNC FINANCE TO SUPABASE ===\n")

  // Import the main entry point
  const { getFinanceTransactions } = await import("../lib/finance-db")

  console.log("Calling getFinanceTransactions() to trigger sync...")
  const txs = await getFinanceTransactions()

  const incomeTxs = txs.filter(t => t.type === "income")
  const expenseTxs = txs.filter(t => t.type === "expense")
  const waristTxs = txs.filter(t => t.type === "warist")
  const investorTxs = txs.filter(t => t.type === "investor_income")

  console.log(`\n✅ Total transactions returned: ${txs.length}`)
  console.log(`   Income (pemasukan):    ${incomeTxs.length} — Rp ${incomeTxs.reduce((s, t) => s + t.jumlah, 0).toLocaleString("id-ID")}`)
  console.log(`   Expense (pengeluaran): ${expenseTxs.length} — Rp ${expenseTxs.reduce((s, t) => s + t.jumlah, 0).toLocaleString("id-ID")}`)
  console.log(`   Warist:                ${waristTxs.length}`)
  console.log(`   Investor:              ${investorTxs.length}`)

  // Verify directly in Supabase
  if (process.env.DATABASE_URL) {
    const { Pool } = await import("pg")
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 5,
      connectionTimeoutMillis: 15000,
    })

    try {
      const incomeCount = await pool.query("SELECT count(*), COALESCE(SUM(jumlah),0) as total FROM finance_income")
      const expenseCount = await pool.query("SELECT count(*), COALESCE(SUM(jumlah),0) as total FROM finance_expense")
      const waristCount = await pool.query("SELECT count(*) FROM finance_warist")

      console.log("\n📊 Supabase verification:")
      console.log(`   finance_income:   ${incomeCount.rows[0].count} rows, total Rp ${Number(incomeCount.rows[0].total).toLocaleString("id-ID")}`)
      console.log(`   finance_expense:  ${expenseCount.rows[0].count} rows, total Rp ${Number(expenseCount.rows[0].total).toLocaleString("id-ID")}`)
      console.log(`   finance_warist:   ${waristCount.rows[0].count} rows`)

      if (Number(incomeCount.rows[0].count) > 0) {
        const sample = await pool.query("SELECT no, tx_date::text, category, vol, jumlah FROM finance_income ORDER BY tx_date DESC LIMIT 5")
        console.log("\n   Sample income rows:")
        sample.rows.forEach((r: any) => console.log(`     ${r.no} | ${r.tx_date} | ${r.category} | vol=${r.vol} | Rp${Number(r.jumlah).toLocaleString("id-ID")}`))
      }

      if (Number(expenseCount.rows[0].count) > 0) {
        const sample = await pool.query("SELECT no, tx_date::text, category, vol, jumlah FROM finance_expense ORDER BY tx_date DESC LIMIT 5")
        console.log("\n   Sample expense rows:")
        sample.rows.forEach((r: any) => console.log(`     ${r.no} | ${r.tx_date} | ${r.category} | vol=${r.vol} | Rp${Number(r.jumlah).toLocaleString("id-ID")}`))
      }
    } catch (e) {
      console.error("Supabase query error:", (e as Error).message)
    } finally {
      await pool.end()
    }
  } else {
    console.log("\n⚠️  DATABASE_URL not set — cannot verify Supabase directly")
  }

  console.log("\n=== DONE ===")
}

main().catch(console.error)
