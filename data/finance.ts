// ─── Summary ─────────────────────────────────────────────────────────────────

export const financeSummary = {
  totalInvestasi:   482_233_800,
  danaMasuk:        482_014_800,
  uangKKJoe:        272_080_800,
  danaMasukInternal: 209_934_000,
  totalKeluar:      482_233_800,
  pendapatanTelur:  107_224_000,   // dari transaksi aktual (kas utama)
  penjualanWarist:  1_600_000,     // 42 ekor ayam afkir — dana terpisah
  penjualanAyam:    1_600_000,     // sama dengan penjualanWarist
  sisaSaldo:        -219_000,      // kas utama (tanpa warist)
  sisaSaldoTotal:   1_381_000,     // termasuk dana warist
  targetBulanan:    25_000_000,
}

// ─── Penjualan per bulan (aktual dari STOK DAN PENJUALAN) ────────────────────

export const penjualanBulanan = [
  { bulan: "Jan-25", vol: 30.0,   total: 780_000,    harga: 26_000, transaksi: 1 },
  { bulan: "Jun-25", vol: 29.0,   total: 725_000,    harga: 25_000, transaksi: 17 },
  { bulan: "Jul-25", vol: 251.6,  total: 6_290_000,  harga: 25_000, transaksi: 30 },
  { bulan: "Ags-25", vol: 554.0,  total: 13_850_000, harga: 25_000, transaksi: 26 },
  { bulan: "Sep-25", vol: 512.0,  total: 12_825_000, harga: 25_000, transaksi: 22 },
  { bulan: "Okt-25", vol: 810.0,  total: 20_250_000, harga: 25_000, transaksi: 25 },
  { bulan: "Nov-25", vol: 819.0,  total: 20_475_000, harga: 25_000, transaksi: 18 },
  { bulan: "Des-25", vol: 796.0,  total: 20_278_000, harga: 26_000, transaksi: 24 },
  { bulan: "Jan-26", vol: 451.0,  total: 11_726_000, harga: 26_000, transaksi: 13 },
]

// ─── Transaksi terbaru (8 terakhir dari data) ─────────────────────────────────

export const transaksiTerbaru = [
  { no: "TX-210", date: "16 Jan 2026", vol: 11.0,  total: 286_000,   buyer: "Pembeli Lokal" },
  { no: "TX-209", date: "15 Jan 2026", vol: 35.0,  total: 910_000,   buyer: "Pasar Mandiri" },
  { no: "TX-208", date: "14 Jan 2026", vol: 38.0,  total: 988_000,   buyer: "AgroMart" },
  { no: "TX-207", date: "13 Jan 2026", vol: 3.0,   total: 78_000,    buyer: "Pembeli Lokal" },
  { no: "TX-206", date: "12 Jan 2026", vol: 29.0,  total: 754_000,   buyer: "Distributor A" },
  { no: "TX-205", date: "11 Jan 2026", vol: 43.0,  total: 1_118_000, buyer: "FreshEgg Co." },
  { no: "TX-204", date: "10 Jan 2026", vol: 6.0,   total: 156_000,   buyer: "Pembeli Lokal" },
  { no: "TX-203", date: "09 Jan 2026", vol: 27.0,  total: 702_000,   buyer: "Pasar Mandiri" },
]

// ─── Biaya operasional (per periode, dari OPERATIONAL COST) ──────────────────

export const biayaOperasional = [
  {
    bulan: "Feb-25",
    items: [
      { nama: "Pakan Ayam",          icon: "inventory",     jumlah: 5_475_000, budget: 8_000_000 },
      { nama: "Vaksin & Vitamin",     icon: "vaccines",      jumlah: 100_000,   budget: 500_000 },
      { nama: "Listrik & Air",        icon: "bolt",          jumlah: 600_000,   budget: 800_000 },
      { nama: "Kebersihan",           icon: "cleaning_services", jumlah: 250_000, budget: 300_000 },
      { nama: "Makan & Rokok",        icon: "restaurant",    jumlah: 1_500_000, budget: 1_800_000 },
      { nama: "Gaji Karyawan",        icon: "groups",        jumlah: 1_500_000, budget: 1_500_000 },
    ],
    total: 9_575_000,
  },
  {
    bulan: "Mar-25",
    items: [
      { nama: "Pakan Ayam",          icon: "inventory",     jumlah: 7_665_000, budget: 8_000_000 },
      { nama: "Vaksin & Vitamin",     icon: "vaccines",      jumlah: 203_000,   budget: 500_000 },
      { nama: "Listrik & Air",        icon: "bolt",          jumlah: 600_000,   budget: 800_000 },
      { nama: "Kebersihan",           icon: "cleaning_services", jumlah: 250_000, budget: 300_000 },
      { nama: "Makan & Rokok",        icon: "restaurant",    jumlah: 1_392_000, budget: 1_800_000 },
      { nama: "Gaji Karyawan",        icon: "groups",        jumlah: 1_500_000, budget: 1_500_000 },
    ],
    total: 11_760_000,
  },
  {
    bulan: "Apr-25",
    items: [
      { nama: "Pakan Ayam",          icon: "inventory",     jumlah: 7_665_000, budget: 8_000_000 },
      { nama: "Vaksin & Vitamin",     icon: "vaccines",      jumlah: 893_000,   budget: 500_000 },
      { nama: "Listrik & Air",        icon: "bolt",          jumlah: 503_000,   budget: 800_000 },
      { nama: "Kebersihan",           icon: "cleaning_services", jumlah: 250_000, budget: 300_000 },
      { nama: "Makan & Rokok",        icon: "restaurant",    jumlah: 1_392_000, budget: 1_800_000 },
      { nama: "Gaji Karyawan",        icon: "groups",        jumlah: 1_500_000, budget: 1_500_000 },
    ],
    total: 12_563_000,
  },
  {
    bulan: "Mei-Jun",
    items: [
      { nama: "Pakan Ayam",          icon: "inventory",     jumlah: 10_220_000, budget: 11_000_000 },
      { nama: "Vaksin & Vitamin",     icon: "vaccines",      jumlah: 203_000,    budget: 500_000 },
      { nama: "Listrik & Air",        icon: "bolt",          jumlah: 600_000,    budget: 800_000 },
      { nama: "Kebersihan",           icon: "cleaning_services", jumlah: 250_000, budget: 300_000 },
      { nama: "Makan & Rokok",        icon: "restaurant",    jumlah: 1_392_000,  budget: 1_800_000 },
      { nama: "Gaji Karyawan",        icon: "groups",        jumlah: 1_500_000,  budget: 1_500_000 },
    ],
    total: 15_115_000,
  },
  {
    bulan: "Jun-Jul",
    items: [
      { nama: "Pakan Ayam",          icon: "inventory",     jumlah: 10_950_000, budget: 11_000_000 },
      { nama: "Vaksin & Vitamin",     icon: "vaccines",      jumlah: 203_000,    budget: 500_000 },
      { nama: "Listrik & Air",        icon: "bolt",          jumlah: 600_000,    budget: 800_000 },
      { nama: "Kebersihan",           icon: "cleaning_services", jumlah: 250_000, budget: 300_000 },
      { nama: "Makan & Rokok",        icon: "restaurant",    jumlah: 1_392_000,  budget: 1_800_000 },
      { nama: "Gaji Karyawan",        icon: "groups",        jumlah: 1_500_000,  budget: 1_500_000 },
    ],
    total: 15_045_000,
  },
  {
    bulan: "Sep-25",
    items: [
      { nama: "Pakan Ayam",          icon: "inventory",     jumlah: 12_000_000, budget: 13_000_000 },
      { nama: "Vaksin & Vitamin",     icon: "vaccines",      jumlah: 687_000,    budget: 500_000 },
      { nama: "Listrik & Air",        icon: "bolt",          jumlah: 600_000,    budget: 800_000 },
      { nama: "Kebersihan",           icon: "cleaning_services", jumlah: 250_000, budget: 300_000 },
      { nama: "Makan & Rokok",        icon: "restaurant",    jumlah: 1_752_000,  budget: 1_800_000 },
      { nama: "Gaji Karyawan",        icon: "groups",        jumlah: 1_500_000,  budget: 1_500_000 },
    ],
    total: 16_789_000,
  },
]

// Bulan aktif terbaru
export const biayaAktif = biayaOperasional[biayaOperasional.length - 1]

// ─── Data bulanan lengkap: penjualan vs pengeluaran (dari HITUNGAN) ──────────

export interface BulanKeuangan {
  bulan: string
  periode: string
  penjualan: number
  pengeluaran: number
  selisih: number
}

export const dataBulananKeuangan: BulanKeuangan[] = [
  { bulan:"Feb 25",  periode:"2025-02", penjualan:0,          pengeluaran:8_781_000,  selisih:-8_781_000  },
  { bulan:"Mar 25",  periode:"2025-03", penjualan:0,          pengeluaran:13_087_000, selisih:-13_087_000 },
  { bulan:"Apr 25",  periode:"2025-04", penjualan:0,          pengeluaran:12_956_000, selisih:-12_956_000 },
  { bulan:"Mei 25",  periode:"2025-05", penjualan:25_000,     pengeluaran:15_813_000, selisih:-15_788_000 },
  { bulan:"Jun 25",  periode:"2025-06", penjualan:725_000,    pengeluaran:16_511_000, selisih:-15_786_000 },
  { bulan:"Jul 25",  periode:"2025-07", penjualan:6_290_000,  pengeluaran:26_993_000, selisih:-20_703_000 },
  { bulan:"Ags 25",  periode:"2025-08", penjualan:13_850_000, pengeluaran:26_993_000, selisih:-13_143_000 },
  { bulan:"Sep 25",  periode:"2025-09", penjualan:12_825_000, pengeluaran:17_467_000, selisih:-4_642_000  },
  { bulan:"Okt 25",  periode:"2025-10", penjualan:20_250_000, pengeluaran:18_977_000, selisih:1_273_000   },
  { bulan:"Nov 25",  periode:"2025-11", penjualan:20_475_000, pengeluaran:19_432_000, selisih:1_043_000   },
  { bulan:"Des 25",  periode:"2025-12", penjualan:20_278_000, pengeluaran:19_486_000, selisih:792_000     },
  { bulan:"Jan 26",  periode:"2026-01", penjualan:11_726_000, pengeluaran:20_371_000, selisih:-8_645_000  },
  { bulan:"Feb 26",  periode:"2026-02", penjualan:0,          pengeluaran:22_058_000, selisih:-22_058_000 },
  { bulan:"Mar 26",  periode:"2026-03", penjualan:0,          pengeluaran:20_272_000, selisih:-20_272_000 },
  { bulan:"Apr 26",  periode:"2026-04", penjualan:0,          pengeluaran:20_637_000, selisih:-20_637_000 },
  { bulan:"Mei 26",  periode:"2026-05", penjualan:0,          pengeluaran:9_112_000,  selisih:-9_112_000  },
]

export interface DetailBulanOps {
  bulan: string
  periode: string
  pakan: number
  vaksinVitamin: number
  listrik: number
  makanRokok: number
  gaji: number
  kebersihan: number
  lainnya: number
  total: number
}

export const detailOpsPerBulan: DetailBulanOps[] = [
  { bulan:"Feb 25",  periode:"2025-02", pakan:4_015_000,  vaksinVitamin:345_000, listrik:306_000,  makanRokok:420_000,  gaji:1_300_000, kebersihan:0,       lainnya:2_395_000, total:8_781_000  },
  { bulan:"Mar 25",  periode:"2025-03", pakan:5_075_000,  vaksinVitamin:208_000, listrik:406_000,  makanRokok:882_000,  gaji:0,         kebersihan:250_000, lainnya:6_266_000, total:13_087_000 },
  { bulan:"Apr 25",  periode:"2025-04", pakan:7_640_000,  vaksinVitamin:803_000, listrik:503_000,  makanRokok:490_000,  gaji:0,         kebersihan:250_000, lainnya:3_270_000, total:12_956_000 },
  { bulan:"Mei 25",  periode:"2025-05", pakan:9_585_000,  vaksinVitamin:460_000, listrik:303_000,  makanRokok:297_000,  gaji:0,         kebersihan:0,       lainnya:5_168_000, total:15_813_000 },
  { bulan:"Jun 25",  periode:"2025-06", pakan:7_200_000,  vaksinVitamin:0,       listrik:603_000,  makanRokok:330_000,  gaji:700_000,   kebersihan:0,       lainnya:7_678_000, total:16_511_000 },
  { bulan:"Jul-Ags", periode:"2025-07", pakan:13_520_000, vaksinVitamin:0,       listrik:611_000,  makanRokok:432_000,  gaji:1_600_000, kebersihan:0,       lainnya:10_830_000,total:26_993_000 },
  { bulan:"Sep 25",  periode:"2025-09", pakan:10_815_000, vaksinVitamin:912_000, listrik:409_000,  makanRokok:412_000,  gaji:900_000,   kebersihan:200_000, lainnya:3_819_000, total:17_467_000 },
  { bulan:"Okt 25",  periode:"2025-10", pakan:12_960_000, vaksinVitamin:203_000, listrik:406_000,  makanRokok:1_260_000,gaji:1_000_000, kebersihan:300_000, lainnya:2_848_000, total:18_977_000 },
  { bulan:"Nov 25",  periode:"2025-11", pakan:12_240_000, vaksinVitamin:977_000, listrik:609_000,  makanRokok:277_000,  gaji:1_050_000, kebersihan:300_000, lainnya:3_979_000, total:19_432_000 },
  { bulan:"Des 25",  periode:"2025-12", pakan:12_750_000, vaksinVitamin:250_000, listrik:509_000,  makanRokok:303_000,  gaji:1_100_000, kebersihan:0,       lainnya:4_574_000, total:19_486_000 },
  { bulan:"Jan 26",  periode:"2026-01", pakan:13_125_000, vaksinVitamin:0,       listrik:709_000,  makanRokok:302_000,  gaji:800_000,   kebersihan:300_000, lainnya:5_135_000, total:20_371_000 },
  { bulan:"Feb 26",  periode:"2026-02", pakan:13_125_000, vaksinVitamin:40_000,  listrik:815_000,  makanRokok:302_000,  gaji:3_000_000, kebersihan:0,       lainnya:4_776_000, total:22_058_000 },
  { bulan:"Mar 26",  periode:"2026-03", pakan:15_000_000, vaksinVitamin:0,       listrik:206_000,  makanRokok:302_000,  gaji:3_000_000, kebersihan:300_000, lainnya:1_464_000, total:20_272_000 },
  { bulan:"Apr 26",  periode:"2026-04", pakan:13_125_000, vaksinVitamin:20_000,  listrik:606_000,  makanRokok:277_000,  gaji:3_000_000, kebersihan:300_000, lainnya:3_309_000, total:20_637_000 },
  { bulan:"Mei 26",  periode:"2026-05", pakan:5_625_000,  vaksinVitamin:40_000,  listrik:203_000,  makanRokok:152_000,  gaji:1_000_000, kebersihan:0,       lainnya:2_092_000, total:9_112_000  },
]

// ─── Gajian Warist ────────────────────────────────────────────────────────────

export const gajianData = [
  { no: 1,  nama: "Warist", tanggal: "16 Feb 2025", jumlah: 3_000_000, status: "Lunas" },
  { no: 2,  nama: "Warist", tanggal: "06 Mar 2025", jumlah: 3_000_000, status: "Lunas" },
  { no: 3,  nama: "Warist", tanggal: "12 Apr 2025", jumlah: 3_000_000, status: "Lunas" },
  { no: 4,  nama: "Warist", tanggal: "08 Mei 2025", jumlah: 3_000_000, status: "Lunas" },
  { no: 5,  nama: "Warist", tanggal: "06 Jun 2025", jumlah: 3_000_000, status: "Lunas" },
  { no: 6,  nama: "Warist", tanggal: "07 Jul 2025", jumlah: 3_000_000, status: "Lunas" },
  { no: 7,  nama: "Warist", tanggal: "13 Ags 2025", jumlah: 3_000_000, status: "Lunas" },
  { no: 8,  nama: "Warist", tanggal: "03 Sep 2025", jumlah: 3_000_000, status: "Lunas" },
  { no: 9,  nama: "Warist", tanggal: "03 Okt 2025", jumlah: 3_000_000, status: "Lunas" },
  { no: 10, nama: "Warist", tanggal: "01 Nov 2025", jumlah: 3_000_000, status: "Lunas" },
  { no: 11, nama: "Warist", tanggal: "04 Des 2025", jumlah: 3_000_000, status: "Lunas" },
  { no: 12, nama: "Warist", tanggal: "19 Jan 2026", jumlah: 3_000_000, status: "Lunas" },
]

// ─── Helper ───────────────────────────────────────────────────────────────────

export function rupiah(n: number, short = false): string {
  if (short) {
    if (Math.abs(n) >= 1_000_000_000) return `Rp${(n / 1_000_000_000).toFixed(1)} M`
    if (Math.abs(n) >= 1_000_000)     return `Rp${(n / 1_000_000).toFixed(0)} jt`
    if (Math.abs(n) >= 1_000)         return `Rp${(n / 1_000).toFixed(0)} rb`
    return `Rp${n.toLocaleString("id-ID")}`
  }
  return new Intl.NumberFormat("id-ID", {
    style: "currency", currency: "IDR", maximumFractionDigits: 0,
  }).format(n)
}

// ─── Alert System for Finance (Dynamic & Auto-generated) ──────────────────

export interface FinanceAlert {
  color: string
  pulse: boolean
  title: string
  desc: string
  time: string
  type: "error" | "warning" | "success"
}

type FinanceSummary = typeof financeSummary
type DataBulananKeuangan = typeof dataBulananKeuangan

export function generateAlertsFinance(
  financeSummary: FinanceSummary,
  dataBulananKeuangan: DataBulananKeuangan
): FinanceAlert[] {
  const alerts: FinanceAlert[] = []

  // ─── Alert 1: Saldo Negatif / Kas Rendah ──────────────────────────────────
  const targetBulanan = 25_000_000
  if (financeSummary.sisaSaldo < 0) {
    alerts.push({
      color: "#ffb4ab",
      pulse: true,
      title: "Saldo Negatif",
      desc: `Kas utama ${rupiah(financeSummary.sisaSaldo, true)} — perlu injeksi modal segera atau kurangi pengeluaran.`,
      time: "Update terakhir",
      type: "error",
    })
  } else if (financeSummary.sisaSaldo < 10_000_000) {
    alerts.push({
      color: "#ffb95f",
      pulse: false,
      title: "Kas Rendah",
      desc: `Saldo kas hanya ${rupiah(financeSummary.sisaSaldo, true)} — monitor pengeluaran lebih ketat.`,
      time: "Update terakhir",
      type: "warning",
    })
  }

  // ─── Alert 2: Target Penjualan ────────────────────────────────────────────
  const latestMonth = dataBulananKeuangan[dataBulananKeuangan.length - 1]
  const combinedLastMonthSales = latestMonth ? latestMonth.penjualan + financeSummary.penjualanWarist : financeSummary.penjualanWarist
  const totalSalesAll = financeSummary.pendapatanTelur + financeSummary.penjualanWarist

  if (latestMonth) {
    const targetAchieved = (combinedLastMonthSales / targetBulanan) * 100
    if (combinedLastMonthSales === 0) {
      alerts.push({
        color: "#ffb4ab",
        pulse: true,
        title: "Penjualan Nol",
        desc: `Bulan ${latestMonth.bulan} belum ada penjualan. Segera tingkatkan marketing atau cek stok.`,
        time: "Sistem",
        type: "error",
      })
    } else if (targetAchieved < 50) {
      alerts.push({
        color: "#ffb95f",
        pulse: false,
        title: "Target Penjualan Tidak Tercapai",
        desc: `Penjualan ${rupiah(combinedLastMonthSales, true)} baru ${Math.round(targetAchieved)}% dari target ${rupiah(targetBulanan, true)}. Termasuk dana terpisah ${rupiah(financeSummary.penjualanWarist, true)}.`,
        time: "1 jam lalu",
        type: "warning",
      })
    } else if (targetAchieved >= 100) {
      alerts.push({
        color: "#4edea3",
        pulse: false,
        title: "Target Penjualan Tercapai",
        desc: `Penjualan ${rupiah(combinedLastMonthSales, true)} — ${Math.round(targetAchieved)}% dari target, sudah termasuk dana terpisah. Excellent!`,
        time: "2 jam lalu",
        type: "success",
      })
    }
  }

  if (totalSalesAll > 0) {
    alerts.push({
      color: totalSalesAll >= targetBulanan ? "#4edea3" : "#ffb95f",
      pulse: false,
      title: "Total Penjualan Termasuk Warist",
      desc: `Semua penjualan sekarang ${rupiah(totalSalesAll, true)} termasuk dana terpisah ${rupiah(financeSummary.penjualanWarist, true)}.`,
      time: "Data terkini",
      type: totalSalesAll >= targetBulanan ? "success" : "warning",
    })
  }

  // ─── Alert 3: Kerugian Besar ──────────────────────────────────────────────
  const largeDeficits = dataBulananKeuangan.filter(m => m.selisih < -20_000_000)
  if (largeDeficits.length > 0) {
    const lastDeficit = largeDeficits[largeDeficits.length - 1]
    alerts.push({
      color: "#ffb4ab",
      pulse: true,
      title: "Kerugian Besar Terdeteksi",
      desc: `Bulan ${lastDeficit.bulan} mengalami kerugian ${rupiah(lastDeficit.selisih, true)}. Analisis pengeluaran vs pendapatan.`,
      time: "Update terakhir",
      type: "error",
    })
  }

  // ─── Alert 4: Trend Penjualan ─────────────────────────────────────────────
  if (dataBulananKeuangan.length >= 3) {
    const recent3Months = dataBulananKeuangan.slice(-3)
    const avgRecent = recent3Months.reduce((a, m) => a + m.penjualan, 0) / 3
    const before3Months = dataBulananKeuangan.slice(-6, -3)
    const avgBefore = before3Months.reduce((a, m) => a + m.penjualan, 0) / 3

    if (avgRecent > avgBefore && avgRecent > targetBulanan) {
      alerts.push({
        color: "#4edea3",
        pulse: false,
        title: "Penjualan Meningkat",
        desc: `Rata-rata penjualan 3 bulan terakhir ${rupiah(avgRecent, true)} — naik dibanding periode sebelumnya.`,
        time: "4 jam lalu",
        type: "success",
      })
    } else if (avgRecent < avgBefore * 0.8) {
      alerts.push({
        color: "#ffb95f",
        pulse: false,
        title: "Penjualan Menurun",
        desc: `Rata-rata penjualan turun ${Math.round(((avgBefore - avgRecent) / avgBefore) * 100)}% dari periode sebelumnya.`,
        time: "Sistem",
        type: "warning",
      })
    }
  }

  // ─── Alert 5: Pengeluaran Tinggi ───────────────────────────────────────────
  if (latestMonth && latestMonth.pengeluaran > 25_000_000) {
    alerts.push({
      color: "#ffb95f",
      pulse: false,
      title: "Pengeluaran Tinggi",
      desc: `Pengeluaran bulan ${latestMonth.bulan} mencapai ${rupiah(latestMonth.pengeluaran, true)} — monitor ketat.`,
      time: "3 jam lalu",
      type: "warning",
    })
  }

  return alerts
}
