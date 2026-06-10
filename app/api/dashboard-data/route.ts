import { NextResponse } from "next/server"
import { getFinanceTransactions } from "@/lib/finance-db"
import { getLivestockData } from "@/lib/livestock-db"
import { getInventoryItems } from "@/lib/inventory-db"
import { getProduksiRecords } from "@/lib/produksi-db"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    // Fetch all data in parallel from databases
    const [financeTransactions, livestockData, inventoryItems, produksiRecords] = await Promise.all([
      getFinanceTransactions(),
      getLivestockData(),
      getInventoryItems(),
      getProduksiRecords(),
    ])

    // Calculate finance summary from actual transactions
    const incomeTransactions = financeTransactions.filter(tx => tx.type === "income" || tx.type === "warist")
    const expenseTransactions = financeTransactions.filter(tx => tx.type === "expense")
    
    const totalIncome = incomeTransactions.reduce((sum, tx) => sum + tx.jumlah, 0)
    const totalExpense = expenseTransactions.reduce((sum, tx) => sum + tx.jumlah, 0)
    const totalInvestasi = 482_233_800 // This is static as it's historical capital
    
    // Calculate monthly cashflow
    const monthlyCashflow = new Map<string, { income: number; expense: number }>()
    
    for (const tx of financeTransactions) {
      const month = tx.date.substring(0, 7) // YYYY-MM
      if (!monthlyCashflow.has(month)) {
        monthlyCashflow.set(month, { income: 0, expense: 0 })
      }
      if (tx.type === "income" || tx.type === "warist") {
        monthlyCashflow.get(month)!.income += tx.jumlah
      } else if (tx.type === "expense") {
        monthlyCashflow.get(month)!.expense += tx.jumlah
      }
    }
    
    const cashflowData = Array.from(monthlyCashflow.entries())
      .map(([month, data]) => ({
        bulan: month,
        income: data.income,
        expense: data.expense,
        profit: data.income - data.expense,
      }))
      .sort((a, b) => a.bulan.localeCompare(b.bulan))

    // Calculate livestock summary
    const { batches } = livestockData
    const totalAyamMasuk = batches.reduce((sum, b) => sum + b.jumlah, 0)
    const activeBatches = batches.filter(b => b.status === "active")
    const totalAyamAktif = activeBatches.reduce((sum, b) => b.jumlah, 0)
    
    // Calculate inventory stats
    const totalItems = inventoryItems.length
    const totalNilai = inventoryItems.reduce((sum, item) => sum + (item.stok * item.hargaSatuan), 0)
    const lowStockItems = inventoryItems.filter(item => item.stok < item.kapasitas * 0.2)
    const criticalStockItems = inventoryItems.filter(item => item.stok < item.kapasitas * 0.1)

    // Get production data summary
    const latestProduksi = produksiRecords[produksiRecords.length - 1]
    const latestHdp = latestProduksi?.hdp ?? 0
    const peakHdp = Math.max(...produksiRecords.map(r => r.hdp), 0)
    
    // Calculate monthly average HDP
    const monthlyHdp = new Map<string, { total: number; count: number }>()
    for (const record of produksiRecords) {
      const month = record.month
      if (!monthlyHdp.has(month)) {
        monthlyHdp.set(month, { total: 0, count: 0 })
      }
      monthlyHdp.get(month)!.total += record.hdp
      monthlyHdp.get(month)!.count += 1
    }
    
    const hdpMonthlyAvg = Array.from(monthlyHdp.entries())
      .map(([bulan, data]) => ({
        bulan,
        avgHdp: +(data.total / data.count).toFixed(1),
      }))
      .sort((a, b) => a.bulan.localeCompare(b.bulan))

    // Calculate ROI
    const pendapatanTelur = incomeTransactions
      .filter(tx => tx.category === "Penjualan Telur")
      .reduce((sum, tx) => sum + tx.jumlah, 0)
    const penjualanAyam = incomeTransactions
      .filter(tx => tx.category === "Penjualan Warist" || tx.type === "warist")
      .reduce((sum, tx) => sum + tx.jumlah, 0)
    const roiPercent = totalInvestasi > 0 ? ((pendapatanTelur + penjualanAyam) / totalInvestasi) * 100 : 0

    const responseData = {
      success: true,
      finance: {
        summary: {
          totalInvestasi,
          totalIncome,
          totalExpense,
          pendapatanTelur,
          penjualanAyam,
          saldo: totalIncome - totalExpense,
          roiPercent: +roiPercent.toFixed(1),
        },
        monthlyCashflow,
        recentTransactions: financeTransactions.slice(0, 10),
      },
      livestock: {
        batches,
        summary: {
          totalAyamMasuk,
          totalAyamAktif,
          activeBatches: activeBatches.length,
          totalBatches: batches.length,
        },
      },
      inventory: {
        items: inventoryItems,
        summary: {
          totalItems,
          totalNilai,
          lowStock: lowStockItems.length,
          criticalStock: criticalStockItems.length,
        },
      },
      produksi: {
        records: produksiRecords,
        summary: {
          latestHdp,
          peakHdp,
          latestRecord: latestProduksi,
        },
        monthlyHdp: hdpMonthlyAvg,
      },
    }

    return NextResponse.json(responseData)
  } catch (error) {
    console.error("Error fetching dashboard data:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to fetch dashboard data",
        data: null // Return null data on error, dashboard will use fallback
      }, 
      { status: 500 }
    )
  }
}