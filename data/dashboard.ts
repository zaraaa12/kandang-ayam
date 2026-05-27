export const rekapKeuangan = {
  totalInvestasi: 482_233_800,
  danaMasuk: 482_014_800,
  pendapatanTelur: 187_564_000,
  penjualanAyam: 1_600_000,
  sisaSaldo: -219_000,
}

export const pengeluaranKonstruksi = [
  { label: "Ayam DOC & Pembesaran", jumlah: 277_233_500 },
  { label: "Kandang & Nipple",      jumlah: 44_736_800 },
  { label: "Atap Baja Ringan",      jumlah: 31_450_000 },
  { label: "Gajian Karyawan",       jumlah: 36_000_000 },
  { label: "Tembok Kandang",        jumlah: 24_827_000 },
  { label: "Bangunan Pakan",        jumlah: 18_503_000 },
  { label: "Sumur Air Bersih",      jumlah: 17_588_000 },
  { label: "Tangga & Lainnya",      jumlah: 11_281_000 },
  { label: "Instalasi Listrik",     jumlah: 8_011_500 },
  { label: "Kamar Mandi & Teras",   jumlah: 6_903_000 },
  { label: "Pemasangan CCTV",       jumlah: 5_700_000 },
]

export const operasionalBulanan = [
  { bulan: "Feb",     total: 9_575_000,  pakan: 5_475_000,  listrik: 600_000,  gaji: 1_500_000, lain: 2_000_000 },
  { bulan: "Mar",     total: 13_260_000, pakan: 7_665_000,  listrik: 600_000,  gaji: 1_500_000, lain: 3_495_000 },
  { bulan: "Apr",     total: 14_063_000, pakan: 7_665_000,  listrik: 503_000,  gaji: 1_500_000, lain: 4_395_000 },
  { bulan: "Mei-Jun", total: 15_115_000, pakan: 10_220_000, listrik: 600_000,  gaji: 1_500_000, lain: 2_795_000 },
  { bulan: "Jun-Jul", total: 15_045_000, pakan: 10_950_000, listrik: 600_000,  gaji: 1_500_000, lain: 1_995_000 },
  { bulan: "Jul-Ags", total: 15_139_000, pakan: 10_950_000, listrik: 600_000,  gaji: 1_500_000, lain: 2_089_000 },
  { bulan: "Sep",     total: 16_789_000, pakan: 12_600_000, listrik: 600_000,  gaji: 1_500_000, lain: 2_089_000 },
]

export const penjualanBulanan = [
  { bulan: "Jun",  total: 750_000,    kg: 30 },
  { bulan: "Jul",  total: 6_290_000,  kg: 251.6 },
  { bulan: "Ags",  total: 13_850_000, kg: 554 },
  { bulan: "Sep",  total: 11_124_000, kg: 444.96 },
  { bulan: "Okt",  total: 52_000_000, kg: 2080 },
  { bulan: "Nov",  total: 51_500_000, kg: 2060 },
  { bulan: "Des",  total: 52_050_000, kg: 2082 },
]

export const cashFlowBulanan = [
  { bulan: "Feb", masuk: 0,          keluar: 9_575_000 },
  { bulan: "Mar", masuk: 0,          keluar: 13_260_000 },
  { bulan: "Apr", masuk: 0,          keluar: 14_063_000 },
  { bulan: "Mei", masuk: 750_000,    keluar: 15_115_000 },
  { bulan: "Jun", masuk: 750_000,    keluar: 15_045_000 },
  { bulan: "Jul", masuk: 6_290_000,  keluar: 15_139_000 },
  { bulan: "Ags", masuk: 13_850_000, keluar: 15_139_000 },
  { bulan: "Sep", masuk: 11_124_000, keluar: 16_789_000 },
  { bulan: "Okt", masuk: 52_000_000, keluar: 15_000_000 },
  { bulan: "Nov", masuk: 51_500_000, keluar: 15_000_000 },
  { bulan: "Des", masuk: 52_050_000, keluar: 15_000_000 },
]

export const dataAyam = {
  totalDibeli: 1300,
  mati: 480,
  dijual: 42,
  aktif: 764,
  persentaseKematian: 36.9,
  batch: [
    { tanggal: "18 Des 2024", jumlah: 161 },
    { tanggal: "26 Des 2024", jumlah: 220 },
    { tanggal: "1 Feb 2025",  jumlah: 171 },
    { tanggal: "10 Feb 2025", jumlah: 149 },
    { tanggal: "16 Feb 2025", jumlah: 105 },
  ],
}

export const gajianHistory = [
  { bulan: "Feb 2025", tanggal: "16 Feb", jumlah: 3_000_000 },
  { bulan: "Mar 2025", tanggal: "6 Mar",  jumlah: 3_000_000 },
  { bulan: "Apr 2025", tanggal: "12 Apr", jumlah: 3_000_000 },
  { bulan: "Mei 2025", tanggal: "8 Mei",  jumlah: 3_000_000 },
  { bulan: "Jun 2025", tanggal: "6 Jun",  jumlah: 3_000_000 },
  { bulan: "Jul 2025", tanggal: "7 Jul",  jumlah: 3_000_000 },
  { bulan: "Ags 2025", tanggal: "13 Ags", jumlah: 3_000_000 },
  { bulan: "Sep 2025", tanggal: "3 Sep",  jumlah: 3_000_000 },
  { bulan: "Okt 2025", tanggal: "3 Okt",  jumlah: 3_000_000 },
  { bulan: "Nov 2025", tanggal: "1 Nov",  jumlah: 3_000_000 },
  { bulan: "Des 2025", tanggal: "4 Des",  jumlah: 3_000_000 },
  { bulan: "Jan 2026", tanggal: "19 Jan", jumlah: 3_000_000 },
]

export const hdpRingkasan = [
  { bulan: "Jul", hdp: 17.7 },
  { bulan: "Ags", hdp: 37.4 },
  { bulan: "Sep", hdp: 36.0 },
  { bulan: "Okt", hdp: 49.9 },
  { bulan: "Nov", hdp: 51.5 },
  { bulan: "Des", hdp: 51.4 },
]

export function rupiah(n: number, short = false): string {
  if (short) {
    if (n >= 1_000_000_000) return `Rp${(n / 1_000_000_000).toFixed(1)} M`
    if (n >= 1_000_000) return `Rp${(n / 1_000_000).toFixed(0)} jt`
    if (n >= 1_000) return `Rp${(n / 1_000).toFixed(0)} rb`
  }
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n)
}

// ─── Alert System (Dynamic & Auto-generated) ────────────────────────────────

export interface AlertItem {
  color: string
  pulse: boolean
  title: string
  desc: string
  time: string
  type: "error" | "warning" | "success"
}

export interface ProduksiItem {
  hdp: number
  tanggal?: string
}

export interface BatchItem {
  id: string | number
  masuk: string | Date
}

export function generateAlerts(
  latestHdp: number,
  dataProduksi: ProduksiItem[],
  batches: BatchItem[]
): AlertItem[] {
  const alerts: AlertItem[] = []
  const now = new Date()

  // ─── Alert 1: Break-even ROI ──────────────────────────────────────────────
  const roi = (rekapKeuangan.pendapatanTelur / rekapKeuangan.totalInvestasi) * 100
  const roiProgress = roi.toFixed(1)
  const bulanTersisa = Math.ceil((100 - roi) / (roi / 9)) // estimasi berdasarkan 9 bulan terakhir
  alerts.push({
    color: "#ffb4ab",
    pulse: true,
    title: "Break-even Belum Tercapai",
    desc: `Pendapatan Rp${rupiah(rekapKeuangan.pendapatanTelur, true)} vs investasi Rp${rupiah(rekapKeuangan.totalInvestasi, true)}. ROI ${roiProgress}% — butuh ±${bulanTersisa} bulan lagi.`,
    time: "Update terakhir",
    type: "error",
  })

  // ─── Alert 2: Saldo Negatif ───────────────────────────────────────────────
  if (rekapKeuangan.sisaSaldo < 0) {
    alerts.push({
      color: "#ffb4ab",
      pulse: true,
      title: "Saldo Negatif",
      desc: `Saldo saat ini ${rupiah(rekapKeuangan.sisaSaldo)}. Perlu injeksi modal atau pembayaran hutang.`,
      time: "Just now",
      type: "error",
    })
  }

  // ─── Alert 3: HDP Performance ──────────────────────────────────────────────
  if (dataProduksi && dataProduksi.length > 0) {
    const last7Days = dataProduksi.slice(-7).map((d: ProduksiItem) => d.hdp)
    const avg7Days = last7Days.reduce((a: number, b: number) => a + b, 0) / last7Days.length
    
    if (avg7Days >= 50) {
      alerts.push({
        color: "#4edea3",
        pulse: false,
        title: "Target HDP Tercapai",
        desc: `HDP stabil di ${avg7Days.toFixed(1)}% dalam 7 hari terakhir. Performa excellent — pertahankan pola pakan saat ini.`,
        time: "4 jam lalu",
        type: "success",
      })
    } else if (avg7Days >= 35) {
      alerts.push({
        color: "#ffb95f",
        pulse: false,
        title: "HDP Menurun",
        desc: `HDP turun ke ${avg7Days.toFixed(1)}% dalam 7 hari terakhir. Cek pakan, air, dan kondisi kandang.`,
        time: "2 jam lalu",
        type: "warning",
      })
    } else {
      alerts.push({
        color: "#ffb4ab",
        pulse: true,
        title: "HDP Kritis",
        desc: `HDP hanya ${avg7Days.toFixed(1)}% — Di bawah standar produksi. Segera periksa kesehatan ternak.`,
        time: "Just now",
        type: "error",
      })
    }
  }

  // ─── Alert 4: Vaksinasi Batch ─────────────────────────────────────────────
  if (batches && batches.length > 0) {
    const batchesToVaccinate = batches.filter((b: BatchItem) => {
      const masukDate = new Date(b.masuk)
      const usia = Math.floor((now.getTime() - masukDate.getTime()) / (1000 * 60 * 60 * 24))
      // Vaksin booster biasanya di hari 21-28
      return usia >= 20 && usia <= 35
    })

    if (batchesToVaccinate.length > 0) {
      const batchIds = batchesToVaccinate.map((b: BatchItem) => b.id).join(", ")
      alerts.push({
        color: "#ffb95f",
        pulse: false,
        title: "Jadwal Vaksinasi Mendekati",
        desc: `Batch ${batchIds} sudah siap untuk vaksinasi booster. Stok vaksin perlu dicek.`,
        time: "Sistem",
        type: "warning",
      })
    }
  }

  // ─── Alert 5: Kematian Tinggi ──────────────────────────────────────────────
  if (dataAyam.persentaseKematian > 15) {
    alerts.push({
      color: "#ffb4ab",
      pulse: true,
      title: "Mortalitas Sangat Tinggi",
      desc: `Tingkat kematian ${dataAyam.persentaseKematian.toFixed(1)}% dari ${dataAyam.totalDibeli} ekor. Jauh di atas rata-rata 5-8%.`,
      time: "Update terakhir",
      type: "error",
    })
  } else if (dataAyam.persentaseKematian > 10) {
    alerts.push({
      color: "#ffb95f",
      pulse: false,
      title: "Mortalitas Tinggi",
      desc: `Tingkat kematian ${dataAyam.persentaseKematian.toFixed(1)}% — Perlu evaluasi manajemen kesehatan.`,
      time: "1 hari lalu",
      type: "warning",
    })
  }

  return alerts
}
