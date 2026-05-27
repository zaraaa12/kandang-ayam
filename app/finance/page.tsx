import FinanceClient from "@/components/FinanceClient"
import { getFinanceTransactions } from "@/lib/finance-db"

export const dynamic = "force-dynamic"

export default async function FinancePage() {
  const transactions = await getFinanceTransactions()

  return <FinanceClient initialTransactions={transactions} />
}
