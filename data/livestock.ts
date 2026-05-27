// ─── Batch data (dari USIA AYAM) ─────────────────────────────────────────────

export interface Batch {
  id: string
  masuk: string       // tanggal masuk
  jumlah: number      // jumlah masuk
  tahun: number
  bulan: number
  hari: number
  status: "active" | "partial" | "closed"
}

export const batches: Batch[] = [
  { id:"BTH-001", masuk:"2024-12-18", jumlah:161, tahun:1, bulan:4, hari:24, status:"active" },
  { id:"BTH-002", masuk:"2024-12-26", jumlah:220, tahun:1, bulan:4, hari:16, status:"active" },
  { id:"BTH-003", masuk:"2025-02-01", jumlah:171, tahun:1, bulan:3, hari:11, status:"active" },
  { id:"BTH-004", masuk:"2025-02-10", jumlah:149, tahun:1, bulan:3, hari:2,  status:"active" },
  { id:"BTH-005", masuk:"2025-02-16", jumlah:105, tahun:1, bulan:2, hari:26, status:"active" },
]

export const flockSummary = {
  totalDibeli:     1300,
  mati:            480,
  dijual:          42,         // dijual karena tidak produksi
  aktif:           764,
  persentaseMati:  36.9,
  persentaseAktif: 58.8,
}

// Calculate flock summary from actual batch data
export function calculateFlockSummary(batchList: Batch[]): typeof flockSummary {
  const totalDibeli = batchList.reduce((sum, b) => sum + b.jumlah, 0)
  
  // Estimate mortality based on status
  // active batches: assume ~5% mortality (healthy)
  // partial batches: assume ~15% mortality
  // closed batches: assume ~25% mortality (completed cycle)
  let mati = 0
  let dijual = 0
  
  for (const batch of batchList) {
    if (batch.status === "active") {
      mati += Math.round(batch.jumlah * 0.05)
    } else if (batch.status === "partial") {
      mati += Math.round(batch.jumlah * 0.12)
      dijual += Math.round(batch.jumlah * 0.03)
    } else {
      // closed - assume sold/afkir
      mati += Math.round(batch.jumlah * 0.15)
      dijual += Math.round(batch.jumlah * 0.70)
    }
  }
  
  const aktif = totalDibeli - mati - dijual
  const persentaseMati = totalDibeli > 0 ? Math.round((mati / totalDibeli) * 1000) / 10 : 0
  const persentaseAktif = totalDibeli > 0 ? Math.round((aktif / totalDibeli) * 1000) / 10 : 0
  
  return {
    totalDibeli,
    mati,
    dijual,
    aktif,
    persentaseMati,
    persentaseAktif,
  }
}

// ─── Pengadaan DOC (dari PEMBESARAN AYAM DOC, hanya ayam) ────────────────────

export interface PengadaanAyam {
  no: number
  tanggal: string
  nama: string
  satuan: string
  qty: number
  harga: number
  subtotal: number
}

export const pengadaanAyam: PengadaanAyam[] = [
  { no:1,  tanggal:"2024-12-18", nama:"Ayam DOC",        satuan:"ekor", qty:200, harga:7500,  subtotal:1_500_000 },
  { no:2,  tanggal:"2024-12-26", nama:"Ayam DOC 400 ekor",satuan:"ekor", qty:400, harga:7200,  subtotal:2_880_000 },
  { no:3,  tanggal:"2025-02-01", nama:"Ayam DOC 200 ekor",satuan:"ekor", qty:200, harga:7750,  subtotal:1_550_000 },
  { no:4,  tanggal:"2025-02-10", nama:"Ayam DOC 300 ekor",satuan:"ekor", qty:300, harga:7500,  subtotal:2_250_000 },
  { no:5,  tanggal:"2025-02-16", nama:"Ayam DOC 200 ekor",satuan:"ekor", qty:200, harga:7750,  subtotal:1_550_000 },
]

// ─── Vaksinasi dari data pembesaran ──────────────────────────────────────────

export interface VaksinasiRecord {
  no: number
  tanggal: string
  nama: string
  qty: number
  satuan: string
  harga?: number
  subtotal: number
  batch: string
}

export const vaksinasi: VaksinasiRecord[] = [
  { no:1,  tanggal:"2024-12-18", nama:"Vaksin ND Lasota",    qty:5,  satuan:"botol", subtotal:73_000,  batch:"BTH-001" },
  { no:2,  tanggal:"2025-01-10", nama:"Vaksin ND Lasota",    qty:6,  satuan:"pcs",   subtotal:87_000,  batch:"BTH-001,BTH-002" },
  { no:3,  tanggal:"2025-01-11", nama:"Vaksin MLS 50 DS",    qty:2,  satuan:"pcs",   subtotal:28_000,  batch:"BTH-001,BTH-002" },
  { no:4,  tanggal:"2025-02-22", nama:"Vaksin ND Lasota",    qty:8,  satuan:"pcs",   subtotal:116_000, batch:"BTH-003,BTH-004" },
  { no:5,  tanggal:"2025-02-26", nama:"Vaksin MLS 1000 DS",  qty:1,  satuan:"vl",    subtotal:95_000,  batch:"BTH-003,BTH-004,BTH-005" },
]

// ─── Perkembangan berat / pertumbuhan (estimasi dari pola DOC) ───────────────

export const pertumbuhanMingguan = [
  { minggu:"Mgg 1",  beratGram:50,   mortalitas:2.1 },
  { minggu:"Mgg 2",  beratGram:120,  mortalitas:1.8 },
  { minggu:"Mgg 3",  beratGram:280,  mortalitas:3.2 },
  { minggu:"Mgg 4",  beratGram:520,  mortalitas:4.1 },
  { minggu:"Mgg 6",  beratGram:900,  mortalitas:5.3 },
  { minggu:"Mgg 8",  beratGram:1200, mortalitas:6.2 },
  { minggu:"Mgg 12", beratGram:1500, mortalitas:8.4 },
  { minggu:"Mgg 16", beratGram:1650, mortalitas:10.1 },
  { minggu:"Mgg 20", beratGram:1700, mortalitas:12.0 },
  { minggu:"Mgg 24", beratGram:1720, mortalitas:14.5 },
]

// ─── Biaya pembesaran DOC (kategori) ─────────────────────────────────────────

export const biayaPembesaran = [
  { kategori:"Pembelian DOC",     jumlah:9_730_000,  warna:"#4edea3" },
  { kategori:"Pakan DOC",         jumlah:12_015_000, warna:"#ffb95f" },
  { kategori:"Vaksin & Vitamin",  jumlah:754_000,    warna:"#89ceff" },
  { kategori:"Listrik & Token",   jumlah:1_730_000,  warna:"#f472b6" },
  { kategori:"Peralatan",         jumlah:2_389_000,  warna:"#a78bfa" },
  { kategori:"Lain-lain",         jumlah:1_216_000,  warna:"#fb923c" },
]

// ─── Alerts ───────────────────────────────────────────────────────────────────

export const livestockAlerts = [
  {
    color:"#ffb4ab", pulse:true,
    title:"Mortalitas Tinggi",
    desc:"Total kematian 480 ekor (36.9%) dari 1.300 ekor dibeli. Di atas rata-rata industri 5-8%.",
    time:"Update terakhir",
  },
  {
    color:"#ffb95f", pulse:false,
    title:"Jadwal Vaksin Mendekati",
    desc:"BTH-003 s/d BTH-005 jadwal booster ND-IB bulan depan. Stok vaksin perlu dicek.",
    time:"1 hari lalu",
  },
  {
    color:"#4edea3", pulse:false,
    title:"HDP Stabil",
    desc:"764 ayam aktif produksi stabil di 51%+ sejak Oktober. Batch BTH-001 & BTH-002 terbaik.",
    time:"4 jam lalu",
  },
]

export interface LivestockAlert {
  color: string
  pulse: boolean
  title: string
  desc: string
  time: string
}

// Helper to format relative time
function getRelativeTime(): string {
  return "baru saja"
}

// Helper to check if vaccination is due soon
function checkUpcomingVaccinations(batchList: Batch[], vakList: VaksinasiRecord[]): { due: boolean; batches: string[]; days: number } {
  const activeBatches = batchList.filter(b => b.status === "active" || b.status === "partial")
  const now = new Date()
  const upcomingBatches: string[] = []
  
  // Check last vaccination for each batch and see if booster is due (typically every 30-45 days)
  for (const batch of activeBatches) {
    const batchVaks = vakList
      .filter(v => v.batch.includes(batch.id))
      .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime())
    
    if (batchVaks.length > 0) {
      const lastVak = batchVaks[0]
      const daysSinceLastVak = Math.floor((now.getTime() - new Date(lastVak.tanggal).getTime()) / (1000 * 60 * 60 * 24))
      if (daysSinceLastVak > 30) {
        upcomingBatches.push(batch.id)
      }
    } else {
      // No vaccination record for this batch
      const batchAge = (now.getTime() - new Date(batch.masuk).getTime()) / (1000 * 60 * 60 * 24)
      if (batchAge > 14) {
        upcomingBatches.push(batch.id)
      }
    }
  }
  
  return {
    due: upcomingBatches.length > 0,
    batches: upcomingBatches,
    days: upcomingBatches.length > 0 ? 1 : 7
  }
}

export function generateLivestockAlerts(
  flock: typeof flockSummary,
  batchList: typeof batches,
  vakList: typeof vaksinasi,
  stokTelurList: typeof stokTelurBulanan,
  biayaPembesaranList: typeof biayaPembesaran
): LivestockAlert[] {
  const alerts: LivestockAlert[] = []
  const now = new Date()

  // 1. Mortality alerts - Critical
  if (flock.persentaseMati >= 30) {
    alerts.push({
      color: "#ffb4ab",
      pulse: true,
      title: "⚠️ Mortalitas Sangat Tinggi",
      desc: `Kematian ${flock.mati} ekor (${flock.persentaseMati}%) — SEGERA cek kesehatan batch dan lakukan control penyakit.`,
      time: getRelativeTime(),
    })
  } else if (flock.persentaseMati >= 18) {
    alerts.push({
      color: "#ffb95f",
      pulse: false,
      title: "Mortalitas di Atas Normal",
      desc: `Kematian ${flock.mati} ekor (${flock.persentaseMati}%) — potensi risiko kesehatan, tingkatkan monitoring.`,
      time: getRelativeTime(),
    })
  } else if (flock.persentaseMati >= 10) {
    alerts.push({
      color: "#ffb95f",
      pulse: false,
      title: "Mortalitas Perlu Diwaspadai",
      desc: `Kematian ${flock.mati} ekor (${flock.persentaseMati}%) — pantau tren harian dan kondisi kandang.`,
      time: getRelativeTime(),
    })
  }

  // 2. Batch status alerts
  const partialBatches = batchList.filter(b => b.status === "partial")
  if (partialBatches.length > 0) {
    const batchIds = partialBatches.map(b => b.id).join(", ")
    alerts.push({
      color: "#ffb95f",
      pulse: false,
      title: "Batch Perlu Tindak Lanjut",
      desc: `${partialBatches.length} batch dengan status partial (${batchIds}) — evaluasi kondisi pakan, air, dan kesehatan.`,
      time: getRelativeTime(),
    })
  }

  // 3. Closed batches without follow-up
  const closedBatches = batchList.filter(b => b.status === "closed")
  if (closedBatches.length > 0) {
    alerts.push({
      color: "#89ceff",
      pulse: false,
      title: "Batch Selesai",
      desc: `${closedBatches.length} batch sudah closed — lakukan evaluasi performa dan persiapan batch berikutnya.`,
      time: getRelativeTime(),
    })
  }

  // 4. Vaccination schedule alerts
  const vaxCheck = checkUpcomingVaccinations(batchList, vakList)
  if (vaxCheck.due) {
    alerts.push({
      color: "#ffb4ab",
      pulse: true,
      title: "Jadwal Vaksinasi Terlewat",
      desc: `Batch ${vaxCheck.batches.join(", ")} perlu vaksinasi booster — sudah >30 hari dari vaksinasi terakhir.`,
      time: getRelativeTime(),
    })
  } else if (vakList.length > 0 && vakList.length < batchList.length * 2) {
    alerts.push({
      color: "#ffb95f",
      pulse: false,
      title: "Jadwal Vaksinasi Mendekati",
      desc: `Tercatat ${vakList.length} vaksinasi untuk ${batchList.length} batch — pastikan jadwal vaksinasi rutin terpenuhi.`,
      time: getRelativeTime(),
    })
  }

  // 5. Egg stock alerts
  const lastEggMonth = stokTelurList[stokTelurList.length - 1]
  if (lastEggMonth) {
    if (lastEggMonth.sisaKg < 15) {
      alerts.push({
        color: "#ffb4ab",
        pulse: true,
        title: "Stok Telur Kritis",
        desc: `Sisa stok hanya ${lastEggMonth.sisaKg} kg (${lastEggMonth.sisaButir} butir) — segera atur distribusi atau produksi.`,
        time: getRelativeTime(),
      })
    } else if (lastEggMonth.sisaKg < 50) {
      alerts.push({
        color: "#ffb95f",
        pulse: false,
        title: "Stok Telur Menipis",
        desc: `Sisa stok ${lastEggMonth.sisaKg} kg (${lastEggMonth.sisaButir} butir) — pertimbangkan penjadwalan penjualan.`,
        time: getRelativeTime(),
      })
    }
  }

  // 6. Vaccine cost analysis
  const vaccineCost = biayaPembesaranList
    .filter(item => item.kategori.includes("Vaksin") || item.kategori.includes("Vitamin"))
    .reduce((sum, item) => sum + item.jumlah, 0)
  
  if (vaccineCost > 1_000_000) {
    alerts.push({
      color: "#4edea3",
      pulse: false,
      title: "Biaya Vaksinasi Tinggi",
      desc: `Total biaya vaksin & vitamin: ${rupiah(vaccineCost, true)} — evaluasi efisiensi program kesehatan.`,
      time: getRelativeTime(),
    })
  } else if (vaccineCost > 0) {
    alerts.push({
      color: "#4edea3",
      pulse: false,
      title: "Program Vaksinasi Aktif",
      desc: `Biaya vaksinasi saat ini: ${rupiah(vaccineCost, true)} — kesehatan flock terpantau.`,
      time: getRelativeTime(),
    })
  }

  // 7. Population health summary
  if (flock.aktif > 0 && flock.persentaseMati < 10) {
    const healthyPercentage = Math.round((flock.aktif / flock.totalDibeli) * 100)
    alerts.push({
      color: "#4edea3",
      pulse: false,
      title: "Populasi Sehat",
      desc: `${flock.aktif} ekor aktif (${healthyPercentage}% dari total) — kondisi flock optimal.`,
      time: getRelativeTime(),
    })
  }

  // 8. New batch alert
  const recentBatches = batchList.filter(b => {
    const batchDate = new Date(b.masuk)
    const daysDiff = Math.floor((now.getTime() - batchDate.getTime()) / (1000 * 60 * 60 * 24))
    return daysDiff <= 7
  })
  if (recentBatches.length > 0) {
    alerts.push({
      color: "#89ceff",
      pulse: false,
      title: "Batch Baru",
      desc: `${recentBatches.length} batch masuk dalam 7 hari terakhir — tingkatkan monitoring masa adaptasi.`,
      time: getRelativeTime(),
    })
  }

  // 9. Default stable alert
  if (alerts.length === 0) {
    alerts.push({
      color: "#4edea3",
      pulse: false,
      title: "Semua Indikator Normal",
      desc: "Tidak ada masalah yang terdeteksi. Semua parameter livestock dalam batas aman.",
      time: getRelativeTime(),
    })
  }

  // Sort alerts by priority (red > yellow > blue > green)
  const priorityOrder = { "#ffb4ab": 0, "#ffb95f": 1, "#89ceff": 2, "#4edea3": 3 }
  alerts.sort((a, b) => (priorityOrder[a.color as keyof typeof priorityOrder] ?? 4) - (priorityOrder[b.color as keyof typeof priorityOrder] ?? 4))

  return alerts
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function _fmt(n: number): string {
  return Math.abs(Math.round(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")
}

export function rupiah(n: number, short = false): string {
  if (short) {
    if (Math.abs(n) >= 1_000_000_000) return `Rp${(n/1e9).toFixed(1)} M`
    if (Math.abs(n) >= 1_000_000)     return `Rp${(n/1e6).toFixed(0)} jt`
    if (Math.abs(n) >= 1_000)         return `Rp${(n/1e3).toFixed(0)} rb`
    return `Rp${_fmt(n)}`
  }
  return `${n < 0 ? "-" : ""}Rp ${_fmt(n)}`
}

export function ageLabel(tahun:number, bulan:number, hari:number): string {
  const parts = []
  if (tahun > 0) parts.push(`${tahun} thn`)
  if (bulan > 0) parts.push(`${bulan} bln`)
  if (hari  > 0) parts.push(`${hari} hr`)
  return parts.join(" ") || "< 1 hr"
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID",{ day:"numeric", month:"short", year:"numeric" })
}

// ─── Stok telur per bulan (dari STOK DAN PENJUALAN) ─────────────────────────

export interface StokTelurBulan {
  bulan: string
  periode: string
  stokKg: number
  terjualKg: number
  sisaKg: number
  sisaButir: number       // estimasi: 1 kg ≈ 16 butir
  transaksi: number
}

export const stokTelurBulanan: StokTelurBulan[] = [
  { bulan:"Jun '25",  periode:"2025-06", stokKg:29,    terjualKg:29,    sisaKg:0,    sisaButir:0,    transaksi:17 },
  { bulan:"Jul '25",  periode:"2025-07", stokKg:256.6, terjualKg:251.6, sisaKg:5,    sisaButir:80,   transaksi:30 },
  { bulan:"Ags '25",  periode:"2025-08", stokKg:557,   terjualKg:554,   sisaKg:5,    sisaButir:80,   transaksi:31 },
  { bulan:"Sep '25",  periode:"2025-09", stokKg:530,   terjualKg:512,   sisaKg:4,    sisaButir:64,   transaksi:30 },
  { bulan:"Okt '25",  periode:"2025-10", stokKg:811,   terjualKg:810,   sisaKg:28,   sisaButir:448,  transaksi:31 },
  { bulan:"Nov '25",  periode:"2025-11", stokKg:824,   terjualKg:819,   sisaKg:29,   sisaButir:464,  transaksi:30 },
  { bulan:"Des '25",  periode:"2025-12", stokKg:846,   terjualKg:796,   sisaKg:50,   sisaButir:800,  transaksi:31 },
  { bulan:"Jan '26",  periode:"2026-01", stokKg:690,   terjualKg:451,   sisaKg:239,  sisaButir:3824, transaksi:25 },
]
