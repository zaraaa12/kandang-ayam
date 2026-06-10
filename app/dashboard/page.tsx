import DashboardClient from "@/components/DashboardClient"
import { getFinanceTransactions } from "@/lib/finance-db"
import { getLivestockData } from "@/lib/livestock-db"
import { getFinanceLivestockData } from "@/lib/livestock-finance-data"
import { getInventoryItems } from "@/lib/inventory-db"
import { getProduksiRecords } from "@/lib/produksi-db"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  // Fetch all data in parallel from databases
  const [financeTransactions, livestockRaw, inventoryItems, produksiRecords] = await Promise.all([
    getFinanceTransactions(),
    getLivestockData(),
    getInventoryItems(),
    getProduksiRecords(),
  ])

  // ── Finance summary ─────────────────────────────────────────────────────────
  const incomeTxs   = financeTransactions.filter(tx => tx.type === "income" || tx.type === "warist")
  const expenseTxs  = financeTransactions.filter(tx => tx.type === "expense")
  const totalIncome  = incomeTxs.reduce((sum, tx) => sum + tx.jumlah, 0)
  const totalExpense = expenseTxs.reduce((sum, tx) => sum + tx.jumlah, 0)

  const pendapatanTelur = incomeTxs
    .filter(tx => /telur/i.test(tx.category))
    .reduce((sum, tx) => sum + tx.jumlah, 0)
  const penjualanAyam = incomeTxs
    .filter(tx => tx.type === "warist" || /warist|ayam\s+afkir/i.test(tx.category))
    .reduce((sum, tx) => sum + tx.jumlah, 0)

  // Latest egg sale from finance_income (Penjualan Telur transactions)
  const eggSaleTxs = financeTransactions
    .filter(tx => tx.type === "income" && /telur/i.test(tx.category))
    .sort((a, b) => b.date.localeCompare(a.date))
  const latestEggSale = eggSaleTxs[0] ? {
    volKg: Number(eggSaleTxs[0].vol) || 0,
    stockKg: Number(eggSaleTxs[0].stock) || 0,
    jumlah: eggSaleTxs[0].jumlah,
    date: eggSaleTxs[0].date,
  } : null

  const totalInvestasi = 482_233_800 // historical capital (static)
  const saldo = totalIncome - totalExpense
  const roiPercent = totalInvestasi > 0 ? ((pendapatanTelur + penjualanAyam) / totalInvestasi) * 100 : 0

  // ── Monthly cashflow (from finance transactions) ─────────────────────────────
  const monthlyMap = new Map<string, { income: number; expense: number }>()
  for (const tx of financeTransactions) {
    const month = tx.date.substring(0, 7) // YYYY-MM
    if (!monthlyMap.has(month)) monthlyMap.set(month, { income: 0, expense: 0 })
    if (tx.type === "income" || tx.type === "warist") {
      monthlyMap.get(month)!.income += tx.jumlah
    } else if (tx.type === "expense") {
      monthlyMap.get(month)!.expense += tx.jumlah
    }
  }

  const monthlyCashflow = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, data]) => {
      const [year, month] = period.split("-").map(Number)
      const label = new Date(year, month - 1, 1).toLocaleDateString("id-ID", { month: "short" }).replace(".", "")
      return { label, income: data.income, expense: data.expense }
    })

  // ── Livestock (derived from finance data — read-only) ────────────────────────
  const financeLivestock = await getFinanceLivestockData(livestockRaw.batches, livestockRaw.vaccinations)
  const flockSummary    = financeLivestock.flockSummary
  const biayaPembesaran = financeLivestock.biayaPembesaran

  // ── Inventory stats ──────────────────────────────────────────────────────────
  const totalNilai  = inventoryItems.reduce((sum, item) => sum + item.stok * item.hargaSatuan, 0)
  const lowStock    = inventoryItems.filter(item => item.stok < item.kapasitas * 0.2).length
  const criticalStock = inventoryItems.filter(item => item.stok < item.kapasitas * 0.1).length

  // Top investasi items (construction/infrastructure from inventory)
  const investasiItems = [...inventoryItems]
    .sort((a, b) => b.hargaSatuan * b.stok - a.hargaSatuan * a.stok)
    .slice(0, 8)
    .map(item => ({
      label: item.nama.replace(/^BIAYA\s+/, "").replace(/PEMBUATAN\s+/i, "").slice(0, 30),
      jumlah: item.stok * item.hargaSatuan,
    }))

  return (
    <DashboardClient
      produksiData={produksiRecords}
      financeSummary={{
        totalIncome,
        totalExpense,
        pendapatanTelur,
        penjualanAyam,
        saldo,
        roiPercent: +roiPercent.toFixed(1),
        totalInvestasi,
      }}
      latestEggSale={latestEggSale}
      monthlyCashflow={monthlyCashflow}
      flockSummary={flockSummary}
      biayaPembesaran={biayaPembesaran}
      inventoryStats={{
        totalItems: inventoryItems.length,
        totalNilai,
        lowStock,
        criticalStock,
        items: inventoryItems,
      }}
      investasiItems={investasiItems}
    />
  )
}
