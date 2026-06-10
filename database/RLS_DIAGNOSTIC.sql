-- Diagnostic Script: Verifikasi Tabel di Supabase
-- Jalankan script ini di Supabase SQL Editor SEBELUM menjalankan RLS_SETUP.sql

-- ============================================================================
-- Cek: Apakah semua tabel sudah dibuat?
-- ============================================================================

SELECT 
  table_name,
  CASE 
    WHEN table_name = 'users' THEN 'Users'
    WHEN table_name = 'inventory_items' THEN 'Inventory'
    WHEN table_name = 'livestock_batches' THEN 'Livestock Batches'
    WHEN table_name = 'livestock_vaccinations' THEN 'Livestock Vaccinations'
    WHEN table_name = 'produksi_records' THEN 'Produksi Records'
    WHEN table_name = 'finance_income' THEN 'Finance Income'
    WHEN table_name = 'finance_expense' THEN 'Finance Expense'
    WHEN table_name = 'finance_warist' THEN 'Finance Warist'
    ELSE 'Other'
  END as description,
  'EXISTS' as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'users',
    'inventory_items',
    'livestock_batches',
    'livestock_vaccinations',
    'produksi_records',
    'finance_income',
    'finance_expense',
    'finance_warist'
  )
ORDER BY table_name;

-- ============================================================================
-- Expected output: 8 rows (semua tabel harus ada)
-- Jika ada yang hilang, jalankan schema.sql terlebih dahulu untuk membuat tabel
-- ============================================================================

-- ============================================================================
-- Cek: RLS status sebelum setup
-- ============================================================================

SELECT 
  tablename,
  rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'users',
    'inventory_items',
    'livestock_batches',
    'livestock_vaccinations',
    'produksi_records',
    'finance_income',
    'finance_expense',
    'finance_warist'
  )
ORDER BY tablename;

-- ============================================================================
-- Expected output: Semua harus FALSE (RLS belum di-enable)
-- Setelah menjalankan RLS_SETUP.sql, jalankan query ini lagi - semuanya jadi TRUE
-- ============================================================================

-- ============================================================================
-- Cek: Sudah ada policy berapa?
-- ============================================================================

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual as condition,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'users',
    'inventory_items',
    'livestock_batches',
    'livestock_vaccinations',
    'produksi_records',
    'finance_income',
    'finance_expense',
    'finance_warist'
  )
ORDER BY tablename, policyname;

-- ============================================================================
-- Expected output (sebelum setup): 0 rows
-- Expected output (sesudah setup): 8 rows (satu policy per tabel)
-- ============================================================================
