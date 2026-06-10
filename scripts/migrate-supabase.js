/**
 * Script to migrate Supabase database for livestock-finance integration
 * This script will:
 * 1. Drop the old livestock_vaccinations table
 * 2. Create the new livestock_egg_stock table (optional)
 * 
 * Usage: node scripts/migrate-supabase.js
 * 
 * Make sure DATABASE_URL is set in your .env.local file
 */

const { Client } = require('pg')
const path = require('path')
const fs = require('fs')

async function migrate() {
  const databaseUrl = process.env.DATABASE_URL
  
  if (!databaseUrl) {
    console.error('❌ Error: DATABASE_URL not found in .env.local')
    console.error('Please add your Supabase connection string to .env.local')
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

    // Read and execute migration SQL
    const migrationSql = fs.readFileSync(
      path.join(process.cwd(), 'database', 'MIGRATE_LIVESTOCK_TO_FINANCE.sql'),
      'utf8'
    )

    console.log('🚀 Running migration...')
    
    // Split by semicolons and execute each statement
    const statements = migrationSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await client.query(statement)
          // Log non-comment statements
          const cleanStmt = statement.replace(/--.*$/gm, '').trim()
          if (cleanStmt && !cleanStmt.startsWith('/*')) {
            console.log('   ✓', cleanStmt.substring(0, 60) + (cleanStmt.length > 60 ? '...' : ''))
          }
        } catch (err) {
          // Ignore errors for DROP TABLE IF EXISTS when table doesn't exist
          if (err.code !== '42P01') {
            throw err
          }
        }
      }
    }

    console.log('✅ Migration completed successfully!')
    console.log('')
    console.log('📝 Summary:')
    console.log('   • livestock_vaccinations table has been dropped')
    console.log('   • livestock_egg_stock table has been created (optional)')
    console.log('')
    console.log('💡 Next steps:')
    console.log('   1. Vaccinations are now derived from finance_expense table')
    console.log('   2. Add expenses with "vaksin" category to create vaccination records')
    console.log('   3. Egg stock data comes from expense.xlsx')

  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

// Run migration
migrate()