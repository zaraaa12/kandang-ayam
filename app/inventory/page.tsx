import { InventoryClient } from "@/components/InventoryClient"
import { getInventoryItems } from "@/lib/inventory-db"

export const dynamic = "force-dynamic"

export default async function InventoryPage() {
  const items = await getInventoryItems()

  return <InventoryClient initialItems={items} />
}
