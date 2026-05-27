import ProduksiCrudClient from "@/components/ProduksiCrudClient"
import { getProduksiRecords } from "@/lib/produksi-db"

export const dynamic = "force-dynamic"

export default async function ProduksiPage() {
  const records = await getProduksiRecords()

  return <ProduksiCrudClient initialRecords={records} />
}
