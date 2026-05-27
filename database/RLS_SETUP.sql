-- Enable RLS pada semua tabel dan buat policy untuk semua authenticated user
-- Jalankan script ini di Supabase SQL Editor

-- ============================================================================
-- 1. ENABLE RLS pada semua tabel
-- ============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.livestock_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.livestock_vaccinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produksi_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_transactions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. DROP EXISTING POLICIES (jika ada dari run sebelumnya)
-- ============================================================================

DROP POLICY IF EXISTS "Allow authenticated access on users" ON public.users;
DROP POLICY IF EXISTS "Allow authenticated access on inventory_items" ON public.inventory_items;
DROP POLICY IF EXISTS "Allow authenticated access on livestock_batches" ON public.livestock_batches;
DROP POLICY IF EXISTS "Allow authenticated access on livestock_vaccinations" ON public.livestock_vaccinations;
DROP POLICY IF EXISTS "Allow authenticated access on produksi_records" ON public.produksi_records;
DROP POLICY IF EXISTS "Allow authenticated access on finance_transactions" ON public.finance_transactions;

-- ============================================================================
-- 3. CREATE POLICIES - Izinkan semua authenticated user untuk SELECT/INSERT/UPDATE/DELETE
-- ============================================================================

-- Policy untuk users table
CREATE POLICY "Allow authenticated access on users"
  ON public.users
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Policy untuk inventory_items table
CREATE POLICY "Allow authenticated access on inventory_items"
  ON public.inventory_items
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Policy untuk livestock_batches table
CREATE POLICY "Allow authenticated access on livestock_batches"
  ON public.livestock_batches
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Policy untuk livestock_vaccinations table
CREATE POLICY "Allow authenticated access on livestock_vaccinations"
  ON public.livestock_vaccinations
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Policy untuk produksi_records table
CREATE POLICY "Allow authenticated access on produksi_records"
  ON public.produksi_records
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Policy untuk finance_transactions table
CREATE POLICY "Allow authenticated access on finance_transactions"
  ON public.finance_transactions
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================================================
-- NOTES:
-- - Policies di atas membolehkan semua authenticated user melakukan operasi apapun
--   (SELECT, INSERT, UPDATE, DELETE) pada semua tabel.
-- - Tabel-tabel: users, inventory_items, livestock_batches, livestock_vaccinations,
--   produksi_records, finance_transactions.
-- - Pastikan Anda sudah membuat user di Supabase auth sebelum melakukan operasi.
-- - Untuk aplikasi server-side yang menggunakan service_role, RLS tidak berlaku.
-- ============================================================================

-- ============================================================================
-- DIAGNOSTIC: Jalankan script ini untuk memverifikasi tabel sudah ada
-- ============================================================================

-- Cek apakah semua tabel ada di public schema
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'users',
    'inventory_items',
    'livestock_batches',
    'livestock_vaccinations',
    'produksi_records',
    'finance_transactions'
  )
ORDER BY table_name;
