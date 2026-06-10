import path from "path"
import * as dotenv from "dotenv"
dotenv.config({ path: path.join(process.cwd(), ".env.local") })

async function main() {
  const { Pool } = await import("pg")
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 5,
    connectionTimeoutMillis: 15000,
  })

  console.log("=== SUPABASE vs LOCAL DATA COMPARISON ===\n")

  // ── Supabase counts ──────────────────────────────────────────────
  console.log("📊 SUPABASE (PostgreSQL):")
  try {
    const [income, expense, warist, investasi, batch, vax, inventory, produksi] = await Promise.all([
      pool.query("SELECT count(*)::int, COALESCE(SUM(jumlah),0)::int as total FROM finance_income"),
      pool.query("SELECT count(*)::int, COALESCE(SUM(jumlah),0)::int as total FROM finance_expense"),
      pool.query("SELECT count(*)::int FROM finance_warist"),
      pool.query("SELECT count(*)::int, COALESCE(SUM(jumlah),0)::int as total FROM investment_transactions"),
      pool.query("SELECT count(*)::int FROM livestock_batches"),
      pool.query("SELECT count(*)::int FROM livestock_vaccinations"),
      pool.query("SELECT count(*)::int FROM inventory_items"),
      pool.query("SELECT count(*)::int FROM produksi_records"),
    ])
    
    console.log(`  finance_income:   ${income.rows[0].count} rows — Rp ${Number(income.rows[0].total).toLocaleString("id-ID")}`)
    console.log(`  finance_expense:  ${expense.rows[0].count} rows — Rp ${Number(expense.rows[0].total).toLocaleString("id-ID")}`)
    console.log(`  finance_warist:   ${warist.rows[0].count} rows`)
    console.log(`  investment_transactions: ${investasi.rows[0].count} rows — Rp ${Number(investasi.rows[0].total).toLocaleString("id-ID")}`)
    console.log(`  livestock_batches: ${batch.rows[0].count} rows`)
    console.log(`  livestock_vaccinations: ${vax.rows[0].count} rows`)
    console.log(`  inventory_items:  ${inventory.rows[0].count} rows`)
    console.log(`  produksi_records: ${produksi.rows[0].count} rows`)
  } catch (e) {
    console.error("  Supabase query error:", (e as Error).message)
  }

  // ── SQLite counts ────────────────────────────────────────────────
  console.log("\n📦 SQLITE (local):")
  const Database = (await import("better-sqlite3")).default
  const dbPath = path.join(process.cwd(), "data", "kandang-ayam.db")
  try {
    const db = new Database(dbPath, { readonly: true })
    
    // Check what tables exist
    const tables = (db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as {name:string}[])
      .map(t => t.name)
    console.log(`  Tables: ${tables.join(", ")}`)
    
    for (const table of ["finance_income", "finance_expense", "finance_warist", "investment_transactions", "livestock_batches", "livestock_vaccinations", "inventory_items", "produksi_records"]) {
      if (tables.includes(table)) {
        try {
          const row = db.prepare(`SELECT count(*) as cnt FROM ${table}`).get() as { cnt: number }
          console.log(`  ${table}: ${row.cnt} rows`)
        } catch {
          console.log(`  ${table}: error reading`)
        }
      } else {
        console.log(`  ${table}: TABLE NOT FOUND`)
      }
    }
    db.close()
  } catch (e) {
    console.error("  SQLite error:", (e as Error).message)
  }

  // ── UI data (from API functions) ─────────────────────────────────
  console.log("\n🖥️  UI DATA (via get* functions — what the user sees):")
  try {
    const { getFinanceTransactions } = await import("../lib/finance-db")
    const { getLivestockData } = await import("../lib/livestock-db")
    const { getInventoryItems } = await import("../lib/inventory-db")
    const { getProduksiRecords } = await import("../lib/produksi-db")
    const { getInvestmentTransactions } = await import("../lib/investment-db")

    const txs = await getFinanceTransactions()
    const incomeTxs = txs.filter(t => t.type === "income")
    const expenseTxs = txs.filter(t => t.type === "expense")
    const waristTxs = txs.filter(t => t.type === "warist")
    
    const invTxs = await getInvestmentTransactions()
    
    console.log(`  Finance transactions: ${txs.length} total`)
    console.log(`    income:   ${incomeTxs.length} — Rp ${incomeTxs.reduce((s,t) => s + t.jumlah, 0).toLocaleString("id-ID")}`)
    console.log(`    expense:  ${expenseTxs.length} — Rp ${expenseTxs.reduce((s,t) => s + t.jumlah, 0).toLocaleString("id-ID")}`)
    console.log(`    warist:   ${waristTxs.length}`)
    console.log(`  Investment: ${invTxs.length} rows — Rp ${invTxs.reduce((s,t) => s + t.jumlah, 0).toLocaleString("id-ID")}`)
    
    // Livestock
    const livestock = await getLivestockData()
    console.log(`  Livestock batches: ${livestock.batches.length}`)
    console.log(`  Livestock vaccinations: ${livestock.vaccinations.length}`)
    
    // Inventory
    const items = await getInventoryItems()
    console.log(`  Inventory items: ${items.length}`)
    
    // Produksi
    const produksi = await getProduksiRecords()
    console.log(`  Produksi records: ${produksi.length}`)
  } catch (e) {
    console.error("  UI data error:", (e as Error).message)
  }

  // ── Check inventory sync issue ───────────────────────────────────
  console.log("\n⚠️  INVENTORY SYNC CHECK:")
  try {
    const supabaseInv = await pool.query("SELECT id, nama, stok, harga_satuan FROM inventory_items ORDER BY id")
    const { inventoryItems: staticItems } = await import("../data/inventory")
    
    console.log(`  Static data/inventory.ts: ${staticItems.length} items`)
    console.log(`  Supabase inventory_items: ${supabaseInv.rows.length} items`)
    
    let mismatches = 0
    for (const staticItem of staticItems) {
      const dbRow = supabaseInv.rows.find((r: any) => r.id === staticItem.id)
      if (!dbRow) {
        console.log(`  ❌ ${staticItem.id} (${staticItem.nama}) — MISSING in Supabase`)
        mismatches++
      } else if (Number(dbRow.stok) !== staticItem.stok || Number(dbRow.harga_satuan) !== staticItem.hargaSatuan) {
        console.log(`  ⚠️  ${staticItem.id} (${staticItem.nama}) — stok: static=${staticItem.stok} vs db=${dbRow.stok}, harga: static=${staticItem.hargaSatuan} vs db=${dbRow.harga_satuan}`)
        mismatches++
      }
    }
    if (mismatches === 0) console.log("  ✅ All inventory items match between static and Supabase")
  } catch (e) {
    console.error("  Inventory check error:", (e as Error).message)
  }

  // ── Check livestock_vaccinations on Supabase ─────────────────────
  console.log("\n💉 VACCINATION SYNC CHECK:")
  try {
    const vaxRows = await pool.query("SELECT count(*)::int as cnt FROM livestock_vaccinations")
    console.log(`  Supabase livestock_vaccinations: ${vaxRows.rows[0].cnt} rows`)
    
    // Compare with what the UI derives from finance
    const { getFinanceLivestockData } = await import("../lib/livestock-finance-data")
    const { getLivestockData: getLD } = await import("../lib/livestock-db")
    const livestock = await getLD()
    const derived = await getFinanceLivestockData(livestock.batches, livestock.vaccinations)
    console.log(`  Derived vaccinations (from finance_expense): ${derived.vaccinations.length}`)
    
    if (Number(vaxRows.rows[0].cnt) !== derived.vaccinations.length) {
      console.log(`  ⚠️  MISMATCH: Supabase has ${vaxRows.rows[0].cnt} but UI derives ${derived.vaccinations.length} from finance`)
    } else {
      console.log("  ✅ Vaccination counts match")
    }
  } catch (e) {
    console.error("  Vaccination check error:", (e as Error).message)
  }

  await pool.end()
  console.log("\n=== DONE ===")
}

main().catch(console.error)
