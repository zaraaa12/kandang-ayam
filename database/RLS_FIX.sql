-- ============================================================================
-- CLEANUP: Drop semua existing policies (yang tidak konsisten)
-- ============================================================================

-- Drop policies dari produksi_records
DROP POLICY IF EXISTS "Full CRUD produksi" ON public.produksi_records;

-- Drop policies dari tabel finance baru
DROP POLICY IF EXISTS "Allow authenticated access on finance_income" ON public.finance_income;
DROP POLICY IF EXISTS "Allow authenticated access on finance_expense" ON public.finance_expense;
DROP POLICY IF EXISTS "Allow authenticated access on finance_warist" ON public.finance_warist;

-- Drop dari policies lain (jika ada)
DROP POLICY IF EXISTS "Allow authenticated access on users" ON public.users;
DROP POLICY IF EXISTS "Allow authenticated access on inventory_items" ON public.inventory_items;
DROP POLICY IF EXISTS "Allow authenticated access on livestock_batches" ON public.livestock_batches;
DROP POLICY IF EXISTS "Allow authenticated access on livestock_vaccinations" ON public.livestock_vaccinations;
DROP POLICY IF EXISTS "Allow authenticated access on produksi_records" ON public.produksi_records;

-- Drop policies yang akan dibuat ulang
DROP POLICY IF EXISTS "Users - Full access for authenticated" ON public.users;
DROP POLICY IF EXISTS "Inventory Items - Full access for authenticated" ON public.inventory_items;
DROP POLICY IF EXISTS "Livestock Batches - Full access for authenticated" ON public.livestock_batches;
DROP POLICY IF EXISTS "Livestock Vaccinations - Full access for authenticated" ON public.livestock_vaccinations;
DROP POLICY IF EXISTS "Produksi Records - Full access for authenticated" ON public.produksi_records;
DROP POLICY IF EXISTS "Finance Income - Full access for authenticated" ON public.finance_income;
DROP POLICY IF EXISTS "Finance Expense - Full access for authenticated" ON public.finance_expense;
DROP POLICY IF EXISTS "Finance Warist - Full access for authenticated" ON public.finance_warist;

-- ============================================================================
-- CREATE POLICIES: Izinkan authenticated user full access (SELECT/INSERT/UPDATE/DELETE)
-- ============================================================================

-- Users table
CREATE POLICY "Users - Full access for authenticated"
  ON public.users
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Inventory Items table
CREATE POLICY "Inventory Items - Full access for authenticated"
  ON public.inventory_items
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Livestock Batches table
CREATE POLICY "Livestock Batches - Full access for authenticated"
  ON public.livestock_batches
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Livestock Vaccinations table
CREATE POLICY "Livestock Vaccinations - Full access for authenticated"
  ON public.livestock_vaccinations
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Produksi Records table
CREATE POLICY "Produksi Records - Full access for authenticated"
  ON public.produksi_records
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Finance Income table
CREATE POLICY "Finance Income - Full access for authenticated"
  ON public.finance_income
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Finance Expense table
CREATE POLICY "Finance Expense - Full access for authenticated"
  ON public.finance_expense
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Finance Warist table
CREATE POLICY "Finance Warist - Full access for authenticated"
  ON public.finance_warist
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Verify: Pastikan semua policies sudah tercipta
-- ============================================================================

SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  CASE 
    WHEN qual = 'true' THEN 'No USING condition (allows all)'
    ELSE qual
  END as using_condition
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

-- Expected: 8 rows (satu policy per tabel, semua dengan roles = {authenticated})
