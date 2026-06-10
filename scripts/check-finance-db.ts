import { config } from "dotenv"
config({ path: new URL('../.env.local', import.meta.url) })

import { getFinanceTransactions } from "../lib/finance-db"

async function main() {
  try {
    const rows = await getFinanceTransactions()
    console.log('finance records count:', rows.length)
    console.log('income count:', rows.filter(row => row.type === 'income').length)
    console.log('expense count:', rows.filter(row => row.type === 'expense').length)
    console.log('warist count:', rows.filter(row => row.type === 'warist').length)
    console.log('first 10 rows:')
    console.log(rows.slice(0, 10))
  } catch (err) {
    console.error('error querying finance transactions:', err)
    process.exit(1)
  }
}

main()
