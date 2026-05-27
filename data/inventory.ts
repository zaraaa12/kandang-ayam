// ─── Types ────────────────────────────────────────────────────────────────────

export type KategoriItem = "Feed" | "Medical" | "Parts" | "Cleaning" | "Utility"

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
  { id:"F-001", nama:"Pakan Ayam Layer B11S",         kategori:"Feed",     stok:21, satuan:"karung", kapasitas:40, hargaSatuan:365_000, terakhirRestok:"2025-09-15", keterangan:"1 karung = 50 kg · stok ±3 minggu" },
  { id:"F-002", nama:"Pakan Ayam 524A",               kategori:"Feed",     stok:30, satuan:"karung", kapasitas:40, hargaSatuan:365_000, terakhirRestok:"2025-10-02", keterangan:"1 karung = 50 kg · digunakan setelah layer penuh" },
  { id:"F-003", nama:"Dedak / Campuran Pakan",        kategori:"Feed",     stok:5,  satuan:"karung", kapasitas:20, hargaSatuan:120_000, terakhirRestok:"2025-10-10", keterangan:"Suplemen campuran pakan utama" },
  { id:"M-001", nama:"Vaksin ND Lasota",              kategori:"Medical",  stok:6,  satuan:"botol",  kapasitas:20, hargaSatuan:14_500,  terakhirRestok:"2025-09-18", keterangan:"Vaksinasi rutin · simpan di lemari es" },
  { id:"M-002", nama:"Vaksin MLS 1000 DS",            kategori:"Medical",  stok:1,  satuan:"vial",   kapasitas:5,  hargaSatuan:95_000,  terakhirRestok:"2025-08-22", keterangan:"Newcastle + IB · stok kritis" },
  { id:"M-003", nama:"Vitachick Vitamin 5gr",         kategori:"Medical",  stok:80, satuan:"bungkus",kapasitas:160,hargaSatuan:1_250,   terakhirRestok:"2025-10-01", keterangan:"Vitamin harian air minum" },
  { id:"M-004", nama:"Egg Stimulant (Obat+Vit)",     kategori:"Medical",  stok:4,  satuan:"bungkus",kapasitas:10, hargaSatuan:21_000,  terakhirRestok:"2025-09-20", keterangan:"100gr · stimulasi produksi telur" },
  { id:"M-005", nama:"Neobro & Mineral",              kategori:"Medical",  stok:6,  satuan:"bungkus",kapasitas:12, hargaSatuan:37_000,  terakhirRestok:"2025-10-05", keterangan:"250gr · vitamin penggemuk & mineral" },
  { id:"M-006", nama:"Vetagumbosept",                 kategori:"Medical",  stok:3,  satuan:"bungkus",kapasitas:10, hargaSatuan:21_000,  terakhirRestok:"2025-09-10", keterangan:"100gr · obat gumboro + vitamin" },
  { id:"C-001", nama:"Peralatan Kebersihan",          kategori:"Cleaning", stok:2,  satuan:"set",    kapasitas:4,  hargaSatuan:250_000, terakhirRestok:"2025-10-28", keterangan:"Wipol, Rinso, cairan pengusir lalat" },
  { id:"C-002", nama:"Kapur Sirih Kandang",           kategori:"Cleaning", stok:8,  satuan:"kg",     kapasitas:20, hargaSatuan:5_000,   terakhirRestok:"2025-10-15", keterangan:"Disinfeksi lantai kandang rutin" },
  { id:"U-001", nama:"Token Listrik PLN",             kategori:"Utility",  stok:1,  satuan:"token",  kapasitas:3,  hargaSatuan:203_000, terakhirRestok:"2025-11-01", keterangan:"Top-up rata-rata Rp200rb–600rb/bln" },
  { id:"P-001", nama:"Lampu Kandang / Penghangat",    kategori:"Parts",    stok:3,  satuan:"pcs",    kapasitas:10, hargaSatuan:25_000,  terakhirRestok:"2025-10-20", keterangan:"Lampu penghangat DOC & lampu putus" },
  { id:"P-002", nama:"Timbangan Digital",             kategori:"Parts",    stok:1,  satuan:"unit",   kapasitas:2,  hargaSatuan:150_000, terakhirRestok:"2025-08-13", keterangan:"Timbangan telur & pakan harian" },
  { id:"P-003", nama:"Kipas Angin Kandang",           kategori:"Parts",    stok:2,  satuan:"unit",   kapasitas:4,  hargaSatuan:180_000, terakhirRestok:"2025-08-13", keterangan:"Sirkulasi udara kandang layer" },
]

export function getInventoryStats() {
  const totalItems     = inventoryItems.length
  const lowStock       = inventoryItems.filter(i => i.stok / i.kapasitas < 0.30).length
  const criticalStock  = inventoryItems.filter(i => i.stok / i.kapasitas < 0.15).length
  const totalNilai     = inventoryItems.reduce((a, b) => a + b.stok * b.hargaSatuan, 0)
  const feedKg         = inventoryItems.filter(i => i.kategori === "Feed").reduce((a, b) => a + b.stok * 50, 0)
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

export const KATEGORI_LIST = ["All", "Feed", "Medical", "Cleaning", "Parts", "Utility"] as const
export type KategoriFilter = typeof KATEGORI_LIST[number]