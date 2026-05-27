# Sistem Kandang Ayam — Halaman Produksi Telur

Halaman **Produksi Telur** untuk sistem manajemen kandang ayam petelur.
Data real dari Excel `PENGELUARAN_KANDANG_AYAM_DAN_PEMBESARAN.xlsx` (167 hari, Jul–Des 2025).

---

## Struktur File

```
kandang/
├── app/
│   └── produksi/
│       └── page.tsx        ← Halaman utama (ini)
├── data/
│   └── produksi.ts         ← Data HDP + helper functions
└── README.md
```

---

## Setup dari Nol

### 1. Buat project Next.js
```bash
npx create-next-app@latest kandang-ayam \
  --typescript --tailwind --app --src-dir=false \
  --import-alias="@/*"

cd kandang-ayam
```

### 2. Install dependencies
```bash
npm install recharts
npm install -D @types/recharts
```

### 3. Salin file
```
Salin  data/produksi.ts     →  src/data/produksi.ts  (atau data/ di root)
Salin  app/produksi/page.tsx →  src/app/produksi/page.tsx
```

> Sesuaikan path import `@/data/produksi` di `page.tsx` jika perlu.

### 4. Jalankan
```bash
npm run dev
```

Buka: **http://localhost:3000/produksi**

---

## Fitur Halaman

| Fitur | Keterangan |
|-------|-----------|
| **Filter bulan** | Semua / Juli–Desember, klik toggle langsung |
| **KPI Cards** | Rata-rata HDP, HDP tertinggi, volume total, jumlah ayam |
| **Chart Area** | Tren HDP harian + garis target 50% + garis rata-rata |
| **Chart Batang** | Mode alternatif, warna per status (hijau/kuning/merah) |
| **Tooltip** | Klik/hover → tanggal, HDP, butir telur, volume, status |
| **Rekap Bulanan** | 6 kartu ringkasan, klik untuk filter chart |
| **Tabel Harian** | Progress bar HDP inline, badge status, urutan terbaru di atas |

---

## Warna Status HDP

| Range | Status | Warna |
|-------|--------|-------|
| ≥ 50% | Baik | Hijau |
| 35–49% | Sedang | Kuning |
| < 35% | Rendah | Merah |

---

## Cara Tambah Data Baru

Edit `data/produksi.ts`, tambahkan objek ke array `dataProduksi`:

```ts
{ "date": "2026-01-01", "month": "Januari", "act": 450, "vol": 28.1, "hdp": 55.0, "ayam": 817 },
```

Dan tambahkan `"Januari"` ke array `BULAN_ORDER`.

---

## 🗄️ Database Setup

Aplikasi ini menggunakan **Supabase PostgreSQL** sebagai database. Untuk setup database:

1. Baca panduan lengkap di [`database/SETUP.md`](database/SETUP.md)
2. Konfigurasi `.env.local` dengan kredensial Supabase Anda
3. Jalankan `npm run init-db` untuk inisialisasi
4. Mulai aplikasi dengan `npm run dev`

### Fitur Database yang Tersedia:
- ✅ **produksi_records** — Data produksi telur harian
- ✅ **finance_transactions** — Transaksi keuangan
- ✅ **livestock_batches** — Batch kandang ayam
- ✅ **livestock_vaccinations** — Riwayat vaksinasi
- ✅ **inventory_items** — Item inventory

---

## Pengembangan Selanjutnya

- [x] **Supabase** — simpan data ke database, sinkron multi-device
- [ ] **Input harian** — form tambah data langsung dari browser
- [ ] **Export PDF** — laporan bulanan
- [ ] **Notifikasi** — alert jika HDP < 40%
- [ ] **Prediksi** — proyeksi produksi minggu depan
