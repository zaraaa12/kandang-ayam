import { getFinanceTransactions, type FinanceTransaction } from "@/lib/finance-db"
import {
  biayaPembesaran as fallbackBiayaPembesaran,
  pengadaanAyam as fallbackPengadaanAyam,
  stokTelurBulanan as fallbackStokTelurBulanan,
  calculateFlockSummary,
  type Batch,
  type PengadaanAyam,
  type StokTelurBulan,
  type VaksinasiRecord,
} from "@/data/livestock"

type BiayaPembesaranItem = typeof fallbackBiayaPembesaran[number]

type FlockSummary = ReturnType<typeof calculateFlockSummary>

export type FinanceLivestockData = {
  batches: Batch[]
  vaccinations: VaksinasiRecord[]
  pengadaanAyam: PengadaanAyam[]
  biayaPembesaran: BiayaPembesaranItem[]
  stokTelurBulanan: StokTelurBulan[]
  flockSummary: FlockSummary
}

const BIAYA_COLORS = {
  doc: "#4edea3",
  pakan: "#ffb95f",
  vaksin: "#89ceff",
  listrik: "#f472b6",
  peralatan: "#a78bfa",
  lainnya: "#fb923c",
}

function cleanItemName(category: string) {
  return category.replace(/\s*\([^)]*\)\s*$/g, "").trim()
}

function getSatuan(category: string) {
  const match = category.match(/\(([^)]+)\)\s*$/)
  return match?.[1]?.trim() || "unit"
}

function titleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

function derivePengadaanAyam(expenses: FinanceTransaction[]): PengadaanAyam[] {
  const records = expenses
    .filter(tx => /ayam\s+doc/i.test(tx.category))
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((tx, index) => ({
      no: index + 1,
      tanggal: tx.date,
      nama: cleanItemName(tx.category) || "Ayam DOC",
      satuan: getSatuan(tx.category) || "ekor",
      qty: Math.round(Number(tx.vol) || 0),
      harga: Math.round(Number(tx.harga) || (tx.vol > 0 ? tx.jumlah / tx.vol : 0)),
      subtotal: Math.round(Number(tx.jumlah) || 0),
    }))

  return records.length > 0 ? records : fallbackPengadaanAyam
}

function ageFromDate(date: string) {
  const start = new Date(date)
  const now = new Date()
  if (Number.isNaN(start.getTime()) || start > now) {
    return { tahun: 0, bulan: 0, hari: 0 }
  }

  let tahun = now.getFullYear() - start.getFullYear()
  let bulan = now.getMonth() - start.getMonth()
  let hari = now.getDate() - start.getDate()

  if (hari < 0) {
    bulan -= 1
    const previousMonth = new Date(now.getFullYear(), now.getMonth(), 0)
    hari += previousMonth.getDate()
  }

  if (bulan < 0) {
    tahun -= 1
    bulan += 12
  }

  return { tahun, bulan, hari }
}

function deriveBatches(pengadaan: PengadaanAyam[], existingBatches: Batch[]): Batch[] {
  const existingById = new Map(existingBatches.map(batch => [batch.id, batch]))

  return pengadaan.map((item, index) => {
    const id = `BTH-${String(index + 1).padStart(3, "0")}`
    const existing = existingById.get(id)
    const age = ageFromDate(item.tanggal)

    return {
      id,
      masuk: item.tanggal,
      jumlah: item.qty,
      tahun: age.tahun,
      bulan: age.bulan,
      hari: age.hari,
      status: existing?.status ?? "active",
    }
  })
}

function batchIdsForDate(date: string, batches: Batch[]) {
  const sameDay = batches.filter(batch => batch.masuk === date).map(batch => batch.id)
  if (sameDay.length > 0) return sameDay.join(",")

  const entered = batches
    .filter(batch => batch.masuk <= date)
    .map(batch => batch.id)

  return (entered.length > 0 ? entered : batches.map(batch => batch.id)).join(",")
}

function deriveVaccinations(expenses: FinanceTransaction[], batches: Batch[], existingVaccinations: VaksinasiRecord[]) {
  const records = expenses
    .filter(tx => /vaksin|vitamin|obat|trimezyn|neobro/i.test(tx.category))
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((tx, index) => ({
      no: index + 1,
      tanggal: tx.date,
      nama: titleCase(cleanItemName(tx.category) || tx.category),
      qty: Math.max(1, Math.round(Number(tx.vol) || 0)),
      satuan: getSatuan(tx.category),
      harga: Math.round(Number(tx.harga) || (tx.vol > 0 ? tx.jumlah / tx.vol : 0)),
      subtotal: Math.round(Number(tx.jumlah) || 0),
      batch: batchIdsForDate(tx.date, batches),
    }))

  return records.length > 0 ? records : existingVaccinations
}

function biayaKey(category: string) {
  const value = category.toLowerCase()
  if (value.includes("ayam doc")) return "doc"
  if (value.includes("pakan")) return "pakan"
  if (/(vaksin|vitamin|obat|trimezyn|neobro)/i.test(value)) return "vaksin"
  if (/(listrik|token|air)/i.test(value)) return "listrik"
  if (/(blower|lampu|tempat|box|terpal|termostat|triplek|fitting|kandang|tray|ember|selang|alat|peralatan)/i.test(value)) return "peralatan"
  return "lainnya"
}

function deriveBiayaPembesaran(expenses: FinanceTransaction[]): BiayaPembesaranItem[] {
  const totals = new Map<string, number>()

  for (const tx of expenses) {
    const key = biayaKey(tx.category)
    totals.set(key, (totals.get(key) ?? 0) + Math.round(Number(tx.jumlah) || 0))
  }

  const records: BiayaPembesaranItem[] = [
    { kategori: "Pembelian DOC", jumlah: totals.get("doc") ?? 0, warna: BIAYA_COLORS.doc },
    { kategori: "Pakan DOC", jumlah: totals.get("pakan") ?? 0, warna: BIAYA_COLORS.pakan },
    { kategori: "Vaksin & Vitamin", jumlah: totals.get("vaksin") ?? 0, warna: BIAYA_COLORS.vaksin },
    { kategori: "Listrik & Token", jumlah: totals.get("listrik") ?? 0, warna: BIAYA_COLORS.listrik },
    { kategori: "Peralatan", jumlah: totals.get("peralatan") ?? 0, warna: BIAYA_COLORS.peralatan },
    { kategori: "Lain-lain", jumlah: totals.get("lainnya") ?? 0, warna: BIAYA_COLORS.lainnya },
  ]

  return records.some(item => item.jumlah > 0) ? records : fallbackBiayaPembesaran
}

function monthLabel(period: string) {
  const [year, month] = period.split("-").map(Number)
  const date = new Date(year, month - 1, 1)
  const label = date.toLocaleString("id-ID", { month: "short" }).replace(".", "")
  return `${label} '${String(year).slice(-2)}`
}

function deriveStokTelurBulanan(eggSales: FinanceTransaction[]): StokTelurBulan[] {
  const byMonth = new Map<string, StokTelurBulan & { lastDate: string }>()

  for (const tx of eggSales) {
    const date = new Date(tx.date)
    if (Number.isNaN(date.getTime())) continue

    const periode = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
    const current = byMonth.get(periode) ?? {
      bulan: monthLabel(periode),
      periode,
      stokKg: 0,
      terjualKg: 0,
      sisaKg: 0,
      sisaButir: 0,
      transaksi: 0,
      lastDate: "",
    }

    current.stokKg += Number(tx.stock) || 0
    current.terjualKg += Number(tx.vol) || 0
    current.transaksi += 1

    if (!current.lastDate || tx.date >= current.lastDate) {
      current.sisaKg = Number(tx.sisa) || 0
      current.sisaButir = Math.round(current.sisaKg * 16)
      current.lastDate = tx.date
    }

    byMonth.set(periode, current)
  }

  const records = Array.from(byMonth.values())
    .sort((a, b) => a.periode.localeCompare(b.periode))
    .map(({ lastDate: _lastDate, ...item }) => ({
      ...item,
      stokKg: Number(item.stokKg.toFixed(1)),
      terjualKg: Number(item.terjualKg.toFixed(1)),
      sisaKg: Number(item.sisaKg.toFixed(1)),
    }))

  return records.length > 0 ? records : fallbackStokTelurBulanan
}

export async function getFinanceLivestockData(
  existingBatches: Batch[],
  existingVaccinations: VaksinasiRecord[],
): Promise<FinanceLivestockData> {
  // Get all finance transactions (includes income with egg sales, expenses with vaccines, etc.)
  const allTransactions = await getFinanceTransactions()
  
  // Filter for expense transactions (pengeluaran) - this includes vaccines, pakan, etc.
  const expenses = allTransactions.filter(tx => tx.type === "expense")

  // Filter for income transactions with egg sales data (from income.xlsx / finance_income table)
  // These contain stock (STOCK TELUR), vol (TERJUAL), and sisa (SISA TELUR) fields
  const eggSales = allTransactions.filter(tx => tx.type === "income")

  const pengadaanAyam = derivePengadaanAyam(expenses)
  const batches = deriveBatches(pengadaanAyam, existingBatches)
  const vaccinations = deriveVaccinations(expenses, batches, existingVaccinations)

  // Derive flock population from finance: warist transactions = actual ayam afkir/cull sales
  const waristTransactions = allTransactions.filter(tx => tx.type === "warist")
  const totalDijual = waristTransactions.length > 0
    ? waristTransactions.reduce((sum, tx) => sum + Math.round(Number(tx.vol) || 0), 0)
    : undefined  // fallback to batch-status estimation

  return {
    batches,
    vaccinations,
    pengadaanAyam,
    biayaPembesaran: deriveBiayaPembesaran(expenses),
    stokTelurBulanan: deriveStokTelurBulanan(eggSales),
    flockSummary: calculateFlockSummary(batches, totalDijual),
  }
}
