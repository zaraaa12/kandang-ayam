import LivestockClient from "@/components/LivestockClient"
import { getLivestockData } from "@/lib/livestock-db"
import { getFinanceLivestockData } from "@/lib/livestock-finance-data"

export const dynamic = "force-dynamic"

export default async function LivestockPage() {
  const { batches, vaccinations } = await getLivestockData()
  
  // Get dynamic egg stock data from finance transactions
  const financeData = await getFinanceLivestockData(batches, vaccinations)

  return (
    <LivestockClient 
      initialBatches={financeData.batches} 
      initialVaccinations={financeData.vaccinations}
      initialStokTelurBulanan={financeData.stokTelurBulanan}
      initialBiayaPembesaran={financeData.biayaPembesaran}
      initialFlockSummary={financeData.flockSummary}
    />
  )
}
