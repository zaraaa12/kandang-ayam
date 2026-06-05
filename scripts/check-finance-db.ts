import { config } from "dotenv"
config({ path: new URL('../.env.local', import.meta.url) })

import { getFinanceTransactions } from "../lib/finance-db"

async function main() {
  try {
    const rows = await getFinanceTransactions()
    console.log('finance_transactions count:', rows.length)
    console.log('first 10 rows:')
    console.log(rows.slice(0, 10))
  } catch (err) {
    console.error('error querying finance transactions:', err)
    process.exit(1)
  }
}

main()
