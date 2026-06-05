import FinanceClient from "@/components/FinanceClient"
import { getFinanceTransactions } from "@/lib/finance-db"
import { getInvestmentTransactions } from "@/lib/investment-db"
import { getInventoryItems } from "@/lib/inventory-db"

export const dynamic = "force-dynamic"

export default async function FinancePage() {
  const [financeTransactions, investmentTransactions, inventoryItems] = await Promise.all([
    getFinanceTransactions(),
    getInvestmentTransactions(),
    getInventoryItems(),
  ])

  const transactions = [...financeTransactions, ...investmentTransactions].sort((a, b) => {
    const byDate = b.date.localeCompare(a.date)
    if (byDate !== 0) return byDate
    return b.no.localeCompare(a.no)
  })
  const inventoryTotal = inventoryItems.reduce((sum, item) => sum + item.stok * item.hargaSatuan, 0)

  return <FinanceClient initialTransactions={transactions} initialInventoryTotal={inventoryTotal} />
}
