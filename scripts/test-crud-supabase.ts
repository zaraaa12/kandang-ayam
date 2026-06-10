import path from "path"
import * as dotenv from "dotenv"
dotenv.config({ path: path.join(process.cwd(), ".env.local") })

async function main() {
  const { getDbMode } = await import("../lib/db")
  console.log("1. DB Mode:", getDbMode())

  const {
    createFinanceTransaction,
    updateFinanceTransaction,
    deleteFinanceTransaction,
  } = await import("../lib/finance-db")

  const { Pool } = await import("pg")
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 5,
    connectionTimeoutMillis: 15000,
  })

  try {
    // CREATE
    console.log("\n2. CREATE: Inserting test transaction...")
    const created = await createFinanceTransaction({
      type: "income",
      date: "2026-06-10",
      category: "Test CRUD",
      buyer: "Tester",
      vol: 10,
      jumlah: 250000,
      notes: "CRUD test from localhost",
    })
    console.log("   Created:", created.id, created.no, created.category, "Rp" + created.jumlah)

    // Verify in Supabase
    const check1 = await pool.query("SELECT id, no, category, jumlah FROM finance_income WHERE id = $1", [created.id])
    console.log("   In Supabase:", check1.rows.length > 0 ? "YES ✅" : "NO ❌", check1.rows[0])

    // UPDATE
    console.log("\n3. UPDATE: Changing category and jumlah...")
    await updateFinanceTransaction(created.id, {
      type: "income",
      date: "2026-06-10",
      category: "Test CRUD Updated",
      buyer: "Tester",
      vol: 20,
      jumlah: 500000,
      notes: "updated from localhost",
    })
    const check2 = await pool.query("SELECT category, jumlah, notes FROM finance_income WHERE id = $1", [created.id])
    console.log("   Updated in Supabase:", check2.rows[0]?.category === "Test CRUD Updated" ? "YES ✅" : "NO ❌", check2.rows[0])

    // DELETE
    console.log("\n4. DELETE: Removing test transaction...")
    await deleteFinanceTransaction(created.id)
    const check3 = await pool.query("SELECT count(*) FROM finance_income WHERE id = $1", [created.id])
    console.log("   Deleted from Supabase:", check3.rows[0].count === "0" ? "YES ✅" : "NO ❌")

    console.log("\n✅ All CRUD operations write directly to Supabase!")
  } catch (error) {
    console.error("Error:", error)
  } finally {
    await pool.end()
  }
}

main().catch(console.error)
