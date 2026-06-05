// ─── Types ────────────────────────────────────────────────────────────────────

export type KategoriItem = "Konstruksi" | "Utilitas" | "SDM"

export interface InventoryItem {
  id: string
  nama: string
  kategori: KategoriItem
  stok: number
  satuan: string
  kapasitas: number
  hargaSatuan: number
  terakhirRestok: string
  keterangan?: string
}

export const inventoryItems: InventoryItem[] = [
  { id:"I-001", nama:"BIAYA PEMBUATAN TEMBOK KANDANG", kategori:"Konstruksi", stok:1, satuan:"unit", kapasitas:1, hargaSatuan:24_827_000, terakhirRestok:"2024-11-23", keterangan:"Sheet REKAP TOTAL" },
  { id:"I-002", nama:"BIAYA PEMBUATAN ATAP BAJA RINGAN", kategori:"Konstruksi", stok:1, satuan:"unit", kapasitas:1, hargaSatuan:31_450_000, terakhirRestok:"2024-12-02", keterangan:"Sheet REKAP TOTAL" },
  { id:"I-003", nama:"BIAYA PEMBUATAN TANGGA DAN LAINNYA", kategori:"Konstruksi", stok:1, satuan:"unit", kapasitas:1, hargaSatuan:11_281_000, terakhirRestok:"2024-12-12", keterangan:"Sheet REKAP TOTAL" },
  { id:"I-004", nama:"BIAYA PEMBUATAN AIR BERSIH (SUMUR)", kategori:"Utilitas", stok:1, satuan:"unit", kapasitas:1, hargaSatuan:17_588_000, terakhirRestok:"2024-12-28", keterangan:"Sheet REKAP TOTAL" },
  { id:"I-005", nama:"BIAYA INSTALASI KELISTRIKAN", kategori:"Utilitas", stok:1, satuan:"unit", kapasitas:1, hargaSatuan:8_011_500, terakhirRestok:"2025-01-06", keterangan:"Sheet REKAP TOTAL" },
  { id:"I-006", nama:"BIAYA PEMBELIAN KANDANG DAN NIPPLE", kategori:"Konstruksi", stok:1, satuan:"unit", kapasitas:1, hargaSatuan:44_736_800, terakhirRestok:"2025-01-19", keterangan:"Sheet REKAP TOTAL" },
  { id:"I-007", nama:"PEMBUATAN BANGUNAN TEMPAT PAKAN", kategori:"Konstruksi", stok:1, satuan:"unit", kapasitas:1, hargaSatuan:18_503_000, terakhirRestok:"2025-02-02", keterangan:"Sheet REKAP TOTAL" },
  { id:"I-008", nama:"PEMBUATAN KAMAR MANDI DAN TERAS, KOLAM", kategori:"Konstruksi", stok:1, satuan:"unit", kapasitas:1, hargaSatuan:6_903_000, terakhirRestok:"2025-02-05", keterangan:"Sheet REKAP TOTAL" },
  { id:"I-009", nama:"PEMASANGAN CCTV", kategori:"Utilitas", stok:1, satuan:"unit", kapasitas:1, hargaSatuan:5_700_000, terakhirRestok:"2025-02-08", keterangan:"Sheet REKAP TOTAL" },
  { id:"I-010", nama:"GAJIAN", kategori:"SDM", stok:1, satuan:"unit", kapasitas:1, hargaSatuan:36_000_000, terakhirRestok:"2025-02-16", keterangan:"Sheet REKAP TOTAL" },
]

export function getInventoryStats() {
  const totalItems     = inventoryItems.length
  const lowStock       = inventoryItems.filter(i => i.stok / i.kapasitas < 0.30).length
  const criticalStock  = inventoryItems.filter(i => i.stok / i.kapasitas < 0.15).length
  const totalNilai     = inventoryItems.reduce((a, b) => a + b.stok * b.hargaSatuan, 0)
  const feedKg         = 0
  return { totalItems, lowStock, criticalStock, totalNilai, feedKg }
}

export function getStokPersen(item: InventoryItem): number {
  return Math.min(Math.round((item.stok / item.kapasitas) * 100), 100)
}

export function getStokStatus(item: InventoryItem): "critical" | "low" | "ok" {
  const pct = item.stok / item.kapasitas
  if (pct < 0.15) return "critical"
  if (pct < 0.30) return "low"
  return "ok"
}

export function fmtDateInv(iso: string): string {
  const d = new Date(iso)
  const months = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Ags","Sep","Okt","Nov","Des"]
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
}

function _fmt(n: number): string {
  return Math.abs(Math.round(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")
}
export function rupiahInv(n: number, short = false): string {
  if (short) {
    const abs = Math.abs(n)
    if (abs >= 1_000_000) return `Rp${(abs / 1_000_000).toFixed(0)} jt`
    if (abs >= 1_000)     return `Rp${(abs / 1_000).toFixed(0)} rb`
    return `Rp${_fmt(abs)}`
  }
  return `Rp ${_fmt(n)}`
}

export const KATEGORI_LIST = ["All", "Konstruksi", "Utilitas", "SDM"] as const
export type KategoriFilter = typeof KATEGORI_LIST[number]
