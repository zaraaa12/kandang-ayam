/**
 * Script to sync vaccination data from Finance expenses to livestock_vaccinations table
 * This script will:
 * 1. Recreate the livestock_vaccinations table if it doesn't exist
 * 2. Extract vaccination data from finance_expense table
 * 3. Insert/update vaccination records in livestock_vaccinations table
 * 
 * Usage: node scripts/sync-vaccinations-to-supabase.js
 */

const { Client } = require('pg')
require('dotenv').config({ path: '.env.local' })

async function syncVaccinations() {
  const databaseUrl = process.env.DATABASE_URL
  
  if (!databaseUrl) {
    console.error('❌ Error: DATABASE_URL not found in .env.local')
    process.exit(1)
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false
    }
  })

  try {
    console.log('🔌 Connecting to Supabase...')
    await client.connect()
    console.log('✅ Connected to Supabase')

    // Step 1: Drop and recreate livestock_vaccinations table
    console.log('📋 Recreating livestock_vaccinations table...')
    await client.query('DROP TABLE IF EXISTS livestock_vaccinations CASCADE')
    await client.query(`
      CREATE TABLE livestock_vaccinations (
        no INTEGER PRIMARY KEY,
        tanggal DATE NOT NULL,
        nama TEXT NOT NULL,
        qty INTEGER NOT NULL CHECK (qty > 0),
        satuan TEXT NOT NULL,
        harga INTEGER NOT NULL DEFAULT 0 CHECK (harga >= 0),
        subtotal INTEGER NOT NULL CHECK (subtotal >= 0),
        batch TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)
    console.log('✅ Table created')

    // Step 2: Clear existing data
    console.log('🗑️  Clearing existing vaccination data...')
    await client.query('TRUNCATE TABLE livestock_vaccinations RESTART IDENTITY')

    // Step 3: Get vaccine expenses from finance_expense table
    console.log('💉 Extracting vaccination data from finance_expense...')
    const { rows: expenses } = await client.query(`
      SELECT 
        id, no, tx_date, category, buyer, vol, harga, jumlah, notes
      FROM finance_expense 
      WHERE LOWER(category) LIKE '%vaksin%' 
         OR LOWER(category) LIKE '%vitamin%'
         OR LOWER(category) LIKE '%obat%'
         OR LOWER(category) LIKE '%trimezyn%'
         OR LOWER(category) LIKE '%neobro%'
      ORDER BY tx_date ASC, no ASC
    `)

    console.log(`📊 Found ${expenses.length} vaccine-related expenses`)

    // Step 4: Get batches for batch assignment
    const { rows: batches } = await client.query(`
      SELECT id, masuk FROM livestock_batches ORDER BY masuk ASC
    `)

    // Helper function to find batch for a date
    function findBatchForDate(dateStr) {
      if (batches.length === 0) return '—'
      
      // Find batches that entered on or before this date
      const enteredBatches = batches.filter(b => b.masuk <= dateStr)
      
      if (enteredBatches.length > 0) {
        return enteredBatches.map(b => b.id).join(', ')
      }
      
      // If no batch entered before this date, use the first batch
      return batches[0].id
    }

    // Helper function to clean vaccine name
    function cleanVaccineName(category) {
      // Remove text in parentheses at the end
      return category.replace(/\s*\([^)]*\)\s*$/, '').trim()
    }

    // Helper function to get unit from category
    function getUnit(category) {
      const match = category.match(/\(([^)]+)\)\s*$/)
      return match?.[1]?.trim() || 'unit'
    }

    // Step 5: Insert vaccination records
    console.log('💾 Inserting vaccination records...')
    
    for (let i = 0; i < expenses.length; i++) {
      const expense = expenses[i]
      const no = i + 1
      const tanggal = expense.tx_date
      const nama = cleanVaccineName(expense.category) || expense.category
      const qty = Math.max(1, Math.round(Number(expense.vol) || 1))
      const satuan = getUnit(expense.category)
      const harga = Math.round(Number(expense.harga) || (expense.vol > 0 ? expense.jumlah / expense.vol : 0))
      const subtotal = Math.round(Number(expense.jumlah) || 0)
      const batch = findBatchForDate(tanggal)

      await client.query(`
        INSERT INTO livestock_vaccinations (no, tanggal, nama, qty, satuan, harga, subtotal, batch)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [no, tanggal, nama, qty, satuan, harga, subtotal, batch])

      console.log(`   ✓ ${no}. ${nama} - ${tanggal} (${qty} ${satuan})`)
    }

    // Step 6: Verify the data
    const { count } = await client.query('SELECT COUNT(*) FROM livestock_vaccinations').then(r => r.rows[0])
    console.log(`\n✅ Sync completed! Total records: ${count}`)

  } catch (error) {
    console.error('❌ Sync failed:', error.message)
    console.error(error)
    process.exit(1)
  } finally {
    await client.end()
  }
}

syncVaccinations()