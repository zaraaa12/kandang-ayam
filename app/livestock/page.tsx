import LivestockClient from "@/components/LivestockClient"
import { getLivestockData } from "@/lib/livestock-db"

export const dynamic = "force-dynamic"

export default async function LivestockPage() {
  const { batches, vaccinations } = await getLivestockData()

  return <LivestockClient initialBatches={batches} initialVaccinations={vaccinations} />
}
