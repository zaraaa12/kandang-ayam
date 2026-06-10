import path from "path"
import * as dotenv from "dotenv"
dotenv.config({ path: path.join(process.cwd(), ".env.local") })

async function main() {
  const { getFinanceTransactions } = await import("../lib/finance-db")
  const txs = await getFinanceTransactions()
  const incomeList = txs.filter(t => t.type === "income")

  const byMonth = new Map<string, { bulan: string; periode: string; total: number }>()
  incomeList.forEach(tx => {
    const d = new Date(tx.date)
    if (isNaN(d.getTime())) return
    const year = d.getFullYear()
    const month = d.getMonth() + 1
    const periode = `${year}-${String(month).padStart(2, "0")}`
    const bulan = `${d.toLocaleString("id-ID", { month: "short" })} ${String(year).slice(-2)}`
    const cur = byMonth.get(periode)
    if (cur) cur.total += tx.jumlah
    else byMonth.set(periode, { bulan, periode, total: tx.jumlah })
  })

  const sorted = [...byMonth.values()].sort((a, b) => a.periode.localeCompare(b.periode))
  console.log("Month-by-month income sales vs target (Rp 25.000.000):\n")
  sorted.forEach(m => {
    const pct = Math.round((m.total / 25_000_000) * 100)
    const bar = "█".repeat(Math.min(Math.round(pct / 5), 20))
    console.log(`${m.periode} ${m.bulan.padEnd(8)} Rp${m.total.toLocaleString("id-ID").padStart(15)} ${String(pct).padStart(4)}% ${bar}`)
  })

  const last = sorted[sorted.length - 1]
  if (last) {
    const pct = Math.min(Math.round((last.total / 25_000_000) * 100), 100)
    console.log(`\nGauge shows: ${last.bulan} → Rp${last.total.toLocaleString("id-ID")} (${pct}% of target)`)
  }
}

main().catch(console.error)
