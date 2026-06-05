import * as path from "path"
import { Pool } from "pg"
import { readFileSync } from "fs"
import { read, utils, SSF } from "xlsx"
import dotenv from "dotenv"

dotenv.config({ path: ".env.local", quiet: true })

type InvestmentRow = {
  id: string
  no: string
  type: "investor_income"
  date: string
  category: string
  buyer: string
  vol: number
  jumlah: number
  notes: string
}

const workbookPath = path.resolve(process.cwd(), "..", "invest.xlsx")
const monthMap: Record<string, string> = {
  ags: "08",
  agu: "08",
  aug: "08",
  okt: "10",
  "ok t": "10",
  oct: "10",
}

function formatDate(year: number, month: number | string, day: number | string) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

function parseDate(value: unknown) {
  if (typeof value === "number") {
    const parsed = SSF.parse_date_code(value)
    if (!parsed) throw new Error(`Tanggal Excel tidak valid: ${value}`)
    return formatDate(parsed.y, parsed.m, parsed.d)
  }

  const normalized = String(value ?? "").toLowerCase().replace(/\s+/g, " ").trim()
  const match = normalized.match(/^(\d{1,2})\s+(.+?)\s+(\d{4})$/)
  if (!match) throw new Error(`Tanggal tidak dikenali: ${String(value)}`)

  const key = match[2].replace(/\s+/g, " ")
  const month = monthMap[key] ?? monthMap[key.replace(/\s+/g, "")]
  if (!month) throw new Error(`Bulan tidak dikenali: ${String(value)}`)

  return formatDate(Number(match[3]), month, match[1])
}

function getInvestmentRows(): InvestmentRow[] {
  const workbook = read(readFileSync(workbookPath), { type: "buffer", cellDates: false })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) throw new Error("Sheet invest.xlsx tidak ditemukan.")

  const rows = utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
    header: 1,
    defval: null,
    raw: true,
    blankrows: false,
  }).slice(1)

  return rows
    .filter(row => row[0] && typeof row[1] === "number")
    .map((row, index) => ({
      id: `inv${index + 1}`,
      no: `INV-${String(index + 1).padStart(3, "0")}`,
      type: "investor_income",
      date: parseDate(row[0]),
      category: "Dana Investasi",
      buyer: "Investor",
      vol: 0,
      jumlah: Math.round(Number(row[1])),
      notes: "",
    }))
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL tidak ditemukan di .env.local.")
  }

  const investments = getInvestmentRows()
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15_000,
  })

  const client = await pool.connect()
  try {
    await client.query("begin")
    await client.query(`
      create table if not exists investment_transactions (
        id text primary key,
        no text not null unique,
        type text not null check (type = 'investor_income'),
        tx_date date not null,
        category text not null,
        buyer text not null default '',
        vol numeric(10, 2) not null default 0 check (vol >= 0),
        jumlah integer not null check (jumlah >= 0),
        notes text not null default '',
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )
    `)
    await client.query("delete from investment_transactions")

    for (const tx of investments) {
      await client.query(
        `insert into investment_transactions (id, no, type, tx_date, category, buyer, vol, jumlah, notes)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [tx.id, tx.no, tx.type, tx.date, tx.category, tx.buyer, tx.vol, tx.jumlah, tx.notes],
      )
    }

    await client.query("commit")

    const { rows } = await client.query(`
      select count(*)::int as count,
             coalesce(sum(jumlah), 0)::int as total,
             min(tx_date)::text as min_date,
             max(tx_date)::text as max_date
      from investment_transactions
    `)
    console.log(JSON.stringify(rows[0]))
  } catch (error) {
    await client.query("rollback")
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
