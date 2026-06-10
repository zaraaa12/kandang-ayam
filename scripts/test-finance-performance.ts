/**
 * Test script to measure finance page performance
 * Run with: npx ts-node scripts/test-finance-performance.ts
 */

import { getFinanceTransactions } from "../lib/finance-db"
import { getInvestmentTransactions } from "../lib/investment-db"
import { getInventoryItems } from "../lib/inventory-db"

async function measureTime<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now()
  const result = await fn()
  const end = performance.now()
  const duration = end - start
  console.log(`⏱️  ${name}: ${duration.toFixed(2)}ms`)
  return result
}

async function testFinancePerformance() {
  console.log('🧪 Testing Finance Page Performance...\n')
  
  const totalStart = performance.now()
  
  // Test individual data fetching
  const financeTransactions = await measureTime('getFinanceTransactions()', getFinanceTransactions)
  console.log(`   📊 Transactions count: ${financeTransactions.length}\n`)
  
  const investmentTransactions = await measureTime('getInvestmentTransactions()', getInvestmentTransactions)
  console.log(`   📊 Investment count: ${investmentTransactions.length}\n`)
  
  const inventoryItems = await measureTime('getInventoryItems()', getInventoryItems)
  console.log(`   📊 Inventory items count: ${inventoryItems.length}\n`)
  
  // Test combined operation (like the page does)
  const combinedStart = performance.now()
  const [finance, investment, inventory] = await Promise.all([
    getFinanceTransactions(),
    getInvestmentTransactions(),
    getInventoryItems(),
  ])
  
  const transactions = [...finance, ...investment].sort((a, b) => {
    const byDate = b.date.localeCompare(a.date)
    if (byDate !== 0) return byDate
    return b.no.localeCompare(a.no)
  })
  
  const inventoryTotal = inventory.reduce((sum, item) => sum + item.stok * item.hargaSatuan, 0)
  const combinedEnd = performance.now()
  
  console.log(`⏱️  Combined (parallel fetch + processing): ${(combinedEnd - combinedStart).toFixed(2)}ms`)
  console.log(`   📊 Total transactions: ${transactions.length}`)
  console.log(`   💰 Inventory total: Rp ${inventoryTotal.toLocaleString('id-ID')}\n`)
  
  const totalEnd = performance.now()
  const totalDuration = totalEnd - totalStart
  
  console.log('📈 Summary:')
  console.log(`   Total test time: ${totalDuration.toFixed(2)}ms`)
  console.log(`   Target: < 30,000ms (30 seconds)`)
  
  if (totalDuration < 30000) {
    console.log('   ✅ PASS - Render time is under 30 seconds!')
  } else {
    console.log('   ❌ FAIL - Render time exceeds 30 seconds')
  }
}

testFinancePerformance().catch(console.error)