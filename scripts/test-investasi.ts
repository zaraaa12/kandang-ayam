import { createInvestmentTransaction } from "@/lib/investment-db"

async function test() {
  try {
    console.log("Testing Dana Investasi transaction creation...")
    
    const testData = {
      date: "2026-06-02",
      category: "Dana Investasi Modal",
      buyer: "Investor Test",
      vol: 0,
      jumlah: 5_000_000,
      notes: "Test investasi masuk ke tabel investasi",
    }
    
    console.log("Input data:", testData)
    
    const result = await createInvestmentTransaction(testData)
    
    console.log("✅ Success! Created transaction:", result)
  } catch (error) {
    console.error("❌ Error:", error)
    if (error instanceof Error) {
      console.error("Message:", error.message)
      console.error("Stack:", error.stack)
    }
  }
}

test()
