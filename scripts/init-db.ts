/**
 * Database Initialization Script
 * 
 * This script initializes all database tables for the kandang-ayam application.
 * Run this script once to set up the database schema and seed initial data.
 * 
 * Usage:
 *   npx tsx scripts/init-db.ts
 * 
 * Or with npm (after adding a script to package.json):
 *   npm run init-db
 */

// Load environment variables from .env.local
import { config } from "dotenv"
import { resolve } from "path"

// Load .env.local
config({ path: resolve(process.cwd(), ".env.local") })

import { initDatabase, testDbConnection, closeDbPool } from "../lib/db"

async function main() {
  console.log("🚀 Starting database initialization...")
  
  // Test connection first
  console.log("📡 Testing database connection...")
  const connected = await testDbConnection()
  
  if (!connected) {
    console.error("❌ Failed to connect to database!")
    console.error("Please check your DATABASE_URL in .env.local")
    console.error("Format: postgresql://postgres:[PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres")
    process.exit(1)
  }
  
  console.log("✅ Database connection successful!")
  
  // Initialize tables
  console.log("📋 Initializing database tables...")
  try {
    await initDatabase()
    console.log("✅ Database tables created successfully!")
    console.log("   - produksi_records")
    console.log("   - finance_income")
    console.log("   - finance_expense")
    console.log("   - finance_warist")
    console.log("   - livestock_batches")
    console.log("   - livestock_vaccinations")
    console.log("   - inventory_items")
    console.log("   - users (authentication)")
    console.log("")
    console.log("👤 Default users created:")
    console.log("   - admin / kandang2025 (Admin)")
    console.log("   - warist / warist123 (Karyawan)")
    console.log("   - manager / manager2025 (Farm Manager)")
  } catch (error) {
    console.error("❌ Failed to initialize database tables:", error)
    process.exit(1)
  }
  
  console.log("🎉 Database initialization complete!")
  console.log("")
  console.log("Next steps:")
  console.log("1. Start the development server: npm run dev")
  console.log("2. The application will automatically seed initial data on first run")
  
  // Clean up
  await closeDbPool()
  process.exit(0)
}

// Handle errors
main().catch((error) => {
  console.error("❌ Unexpected error:", error)
  closeDbPool().finally(() => process.exit(1))
})
