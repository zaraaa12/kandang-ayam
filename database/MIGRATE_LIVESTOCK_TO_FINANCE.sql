-- ============================================================
-- Migrasi: Hapus tabel livestock_vaccinations lama
-- Vaksinasi sekarang diambil dari finance_expense (kategori mengandung "vaksin")
-- Stock telur sekarang diambil dari expense.xlsx atau finance_income
-- ============================================================

-- 1. Hapus tabel livestock_vaccinations (tidak lagi diperlukan)
-- Data vaksinasi sekarang berasal dari finance_expense dengan kategori "Vaksin & Vitamin"
DROP TABLE IF EXISTS livestock_vaccinations;

-- 2. Buat tabel untuk stock telur bulanan (jika diperlukan penyimpanan terpisah)
-- Tabel ini opsional - data juga bisa diambil langsung dari expense.xlsx
CREATE TABLE IF NOT EXISTS livestock_egg_stock (
  id SERIAL PRIMARY KEY,
  bulan text NOT NULL,
  periode text NOT NULL UNIQUE,  -- format: YYYY-MM
  stok_kg numeric(10, 2) NOT NULL DEFAULT 0,
  terjual_kg numeric(10, 2) NOT NULL DEFAULT 0,
  sisa_kg numeric(10, 2) NOT NULL DEFAULT 0,
  sisa_butir integer NOT NULL DEFAULT 0,
  transaksi integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL default now(),
  updated_at timestamptz NOT NULL default now()
);

-- 3. Index untuk performa
CREATE INDEX IF NOT EXISTS idx_livestock_egg_stock_periode ON livestock_egg_stock(periode);

-- ============================================================
-- Catatan Penting:
-- ============================================================
-- 1. VAKSINASI:
--    - Data vaksinasi sekarang diambil dari finance_expense
--    - Filter: category ILIKE '%vaksin%'
--    - Lihat lib/livestock-finance-data.ts fungsi deriveVaccinations()
--
-- 2. STOCK TELUR:
--    - Data stock telur diambil dari expense.xlsx (getExpenseSheetTransactions)
--    - Kolom: STOCK TELUR (KG), TERJUAL (KG), SISA TELUR
--    - Lihat lib/livestock-finance-data.ts fungsi deriveStokTelurBulanan()
--
-- 3. Untuk sync data dari Excel ke database, jalankan aplikasi
--    dan data akan otomatis di-sync saat halaman dimuat
-- ============================================================