import * as crypto from "crypto"
import { Pool } from "pg"
import Database from "better-sqlite3"
import { forceSqliteMode, getDbMode, getDbPool, getSqliteDb, initSqliteDatabase } from "./db"

export type InvestmentTransaction = {
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

export type InvestmentTransactionInput = Omit<InvestmentTransaction, "id" | "no" | "type">

const SEED_INVESTMENTS: InvestmentTransaction[] = [
  { id:"inv1", no:"INV-001", type:"investor_income", date:"2024-11-23", category:"Dana Investasi", buyer:"Investor", vol:0, jumlah:25_000_000, notes:"" },
  { id:"inv2", no:"INV-002", type:"investor_income", date:"2024-12-02", category:"Dana Investasi", buyer:"Investor", vol:0, jumlah:17_000_000, notes:"" },
  { id:"inv3", no:"INV-003", type:"investor_income", date:"2024-12-12", category:"Dana Investasi", buyer:"Investor", vol:0, jumlah:25_000_000, notes:"" },
  { id:"inv4", no:"INV-004", type:"investor_income", date:"2024-12-22", category:"Dana Investasi", buyer:"Investor", vol:0, jumlah:25_000_000, notes:"" },
  { id:"inv5", no:"INV-005", type:"investor_income", date:"2024-12-28", category:"Dana Investasi", buyer:"Investor", vol:0, jumlah:23_500_000, notes:"" },
  { id:"inv6", no:"INV-006", type:"investor_income", date:"2025-01-06", category:"Dana Investasi", buyer:"Investor", vol:0, jumlah:25_000_000, notes:"" },
  { id:"inv7", no:"INV-007", type:"investor_income", date:"2025-01-19", category:"Dana Investasi", buyer:"Investor", vol:0, jumlah:10_000_000, notes:"" },
  { id:"inv8", no:"INV-008", type:"investor_income", date:"2025-02-02", category:"Dana Investasi", buyer:"Investor", vol:0, jumlah:9_000_000, notes:"" },
  { id:"inv9", no:"INV-009", type:"investor_income", date:"2025-02-05", category:"Dana Investasi", buyer:"Investor", vol:0, jumlah:5_700_000, notes:"" },
  { id:"inv10", no:"INV-010", type:"investor_income", date:"2025-02-08", category:"Dana Investasi", buyer:"Investor", vol:0, jumlah:10_500_000, notes:"" },
  { id:"inv11", no:"INV-011", type:"investor_income", date:"2025-02-16", category:"Dana Investasi", buyer:"Investor", vol:0, jumlah:5_000_000, notes:"" },
  { id:"inv12", no:"INV-012", type:"investor_income", date:"2025-02-24", category:"Dana Investasi", buyer:"Investor", vol:0, jumlah:8_500_000, notes:"" },
  { id:"inv13", no:"INV-013", type:"investor_income", date:"2025-03-06", category:"Dana Investasi", buyer:"Investor", vol:0, jumlah:3_000_000, notes:"" },
  { id:"inv14", no:"INV-014", type:"investor_income", date:"2025-03-19", category:"Dana Investasi", buyer:"Investor", vol:0, jumlah:12_000_000, notes:"" },
  { id:"inv15", no:"INV-015", type:"investor_income", date:"2025-04-12", category:"Dana Investasi", buyer:"Investor", vol:0, jumlah:3_000_000, notes:"" },
  { id:"inv16", no:"INV-016", type:"investor_income", date:"2025-04-20", category:"Dana Investasi", buyer:"Investor", vol:0, jumlah:13_000_000, notes:"" },
  { id:"inv17", no:"INV-017", type:"investor_income", date:"2025-05-08", category:"Dana Investasi", buyer:"Investor", vol:0, jumlah:4_000_000, notes:"" },
  { id:"inv18", no:"INV-018", type:"investor_income", date:"2025-05-25", category:"Dana Investasi", buyer:"Investor", vol:0, jumlah:14_315_000, notes:"" },
  { id:"inv19", no:"INV-019", type:"investor_income", date:"2025-05-06", category:"Dana Investasi", buyer:"Investor", vol:0, jumlah:3_000_000, notes:"" },
  { id:"inv20", no:"INV-020", type:"investor_income", date:"2025-06-22", category:"Dana Investasi", buyer:"Investor", vol:0, jumlah:16_500_000, notes:"" },
  { id:"inv21", no:"INV-021", type:"investor_income", date:"2025-07-07", category:"Dana Investasi", buyer:"Investor", vol:0, jumlah:3_000_000, notes:"" },
  { id:"inv22", no:"INV-022", type:"investor_income", date:"2025-07-27", category:"Dana Investasi", buyer:"Investor", vol:0, jumlah:6_065_800, notes:"" },
  { id:"inv23", no:"INV-023", type:"investor_income", date:"2025-07-31", category:"Dana Investasi", buyer:"Investor", vol:0, jumlah:5_000_000, notes:"" },
  { id:"inv24", no:"INV-024", type:"investor_income", date:"2025-08-09", category:"Dana Investasi", buyer:"Investor", vol:0, jumlah:5_000_000, notes:"" },
  { id:"inv25", no:"INV-025", type:"investor_income", date:"2025-08-13", category:"Dana Investasi", buyer:"Investor", vol:0, jumlah:3_000_000, notes:"" },
  { id:"inv26", no:"INV-026", type:"investor_income", date:"2025-09-03", category:"Dana Investasi", buyer:"Investor", vol:0, jumlah:3_000_000, notes:"" },
  { id:"inv27", no:"INV-027", type:"investor_income", date:"2025-09-26", category:"Dana Investasi", buyer:"Investor", vol:0, jumlah:2_370_000, notes:"" },
  { id:"inv28", no:"INV-028", type:"investor_income", date:"2025-10-03", category:"Dana Investasi", buyer:"Investor", vol:0, jumlah:3_000_000, notes:"" },
  { id:"inv29", no:"INV-029", type:"investor_income", date:"2025-11-02", category:"Dana Investasi", buyer:"Investor", vol:0, jumlah:3_000_000, notes:"" },
  { id:"inv30", no:"INV-030", type:"investor_income", date:"2025-10-04", category:"Dana Investasi", buyer:"Investor", vol:0, jumlah:3_000_000, notes:"" },
]

function txNo(id: string) {
  return `INV-${id.slice(-6).toUpperCase()}`
}

function mapRow(row: {
  id: string
  no: string
  type: string
  date: string
  category: string
  buyer: string
  vol: string | number
  jumlah: number
  notes: string
}): InvestmentTransaction {
  return {
    id: row.id,
    no: row.no,
    type: "investor_income",
    date: row.date,
    category: row.category,
    buyer: row.buyer,
    vol: Number(row.vol),
    jumlah: Number(row.jumlah),
    notes: row.notes,
  }
}

function shouldFallbackToSqlite(error: unknown) {
  if (!process.env.DATABASE_URL) return true
  if (!error || typeof error !== "object") return false

  const err = error as { code?: string; message?: string }
  const code = String(err.code ?? "").toLowerCase()
  const message = String(err.message ?? "").toLowerCase()
  const networkErrors = [
    "enotfound",
    "econrefused",
    "econnreset",
    "ehostunreach",
    "enetunreach",
    "etimedout",
    "08001",
    "08006",
    "57p01",
    "57p03",
    "53300",
    "58030",
  ]

  return networkErrors.some(token => code.includes(token) || message.includes(token)) || message.includes("timeout") || message.includes("connection refused") || message.includes("could not connect")
}

async function ensureInvestmentTable(pool: Pool) {
  await pool.query(`
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
}

async function seedInvestmentIfEmpty(pool: Pool) {
  const { rows } = await pool.query<{ count: string }>("select count(*) from investment_transactions")
  if (Number(rows[0]?.count ?? 0) > 0) return

  for (const tx of SEED_INVESTMENTS) {
    await pool.query(
      `insert into investment_transactions (id, no, type, tx_date, category, buyer, vol, jumlah, notes)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       on conflict (id) do nothing`,
      [tx.id, tx.no, tx.type, tx.date, tx.category, tx.buyer, tx.vol, tx.jumlah, tx.notes],
    )
  }
}


function ensureSqliteInvestmentTable(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS investment_transactions (
      id TEXT PRIMARY KEY,
      no TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL CHECK (type = 'investor_income'),
      tx_date TEXT NOT NULL,
      category TEXT NOT NULL,
      buyer TEXT NOT NULL DEFAULT '',
      vol REAL NOT NULL DEFAULT 0 CHECK (vol >= 0),
      jumlah INTEGER NOT NULL CHECK (jumlah >= 0),
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)
}

function seedSqliteInvestmentIfEmpty(db: Database.Database) {
  const countRow = db.prepare("select count(*) as count from investment_transactions").get() as { count: number }
  if (countRow.count > 0) return

  const insert = db.prepare(
    `insert into investment_transactions (id, no, type, tx_date, category, buyer, vol, jumlah, notes)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
  const transaction = db.transaction((records: InvestmentTransaction[]) => {
    for (const tx of records) {
      insert.run(tx.id, tx.no, tx.type, tx.date, tx.category, tx.buyer, tx.vol, tx.jumlah, tx.notes)
    }
  })
  transaction(SEED_INVESTMENTS)
}

function prepareSqliteInvestmentDatabase() {
  initSqliteDatabase()
  const db = getSqliteDb()
  ensureSqliteInvestmentTable(db)
  seedSqliteInvestmentIfEmpty(db)
  return db
}

function getSqliteInvestmentRecords() {
  const db = prepareSqliteInvestmentDatabase()
  const rows = db.prepare(`
    select id, no, type, tx_date as date, category, buyer, vol, jumlah, notes
    from investment_transactions
    order by tx_date desc, created_at desc
  `).all() as Array<{
    id: string
    no: string
    type: string
    date: string
    category: string
    buyer: string
    vol: number
    jumlah: number
    notes: string
  }>

  return rows.map(mapRow)
}

export async function getInvestmentTransactions(): Promise<InvestmentTransaction[]> {
  if (getDbMode() === "sqlite") {
    return getSqliteInvestmentRecords()
  }

  try {
    const pool = getDbPool()
    await ensureInvestmentTable(pool)
    await seedInvestmentIfEmpty(pool)

    const { rows } = await pool.query(`
      select id, no, type, tx_date::text as date, category, buyer, vol::text as vol, jumlah, notes
      from investment_transactions
      order by tx_date desc, created_at desc
    `)

    return rows.map(mapRow)
  } catch (error) {
    forceSqliteMode()
    console.warn("PostgreSQL unavailable for investment, falling back to SQLite:", error)
    return getSqliteInvestmentRecords()
  }
}

export async function createInvestmentTransaction(input: InvestmentTransactionInput) {
  const id = crypto.randomUUID()
  const no = txNo(id)
  const record = { ...input, id, no, type: "investor_income" as const }

  if (getDbMode() === "sqlite") {
    const db = prepareSqliteInvestmentDatabase()
    db.prepare(
      `insert into investment_transactions (id, no, type, tx_date, category, buyer, vol, jumlah, notes)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(record.id, record.no, record.type, record.date, record.category, record.buyer, record.vol, record.jumlah, record.notes)
    return record
  }

  try {
    const pool = getDbPool()
    await ensureInvestmentTable(pool)
    const { rows } = await pool.query(
      `insert into investment_transactions (id, no, type, tx_date, category, buyer, vol, jumlah, notes)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       returning id, no, type, tx_date::text as date, category, buyer, vol::text as vol, jumlah, notes`,
      [record.id, record.no, record.type, record.date, record.category, record.buyer, record.vol, record.jumlah, record.notes],
    )
    return mapRow(rows[0])
  } catch (error) {
    if (!shouldFallbackToSqlite(error)) {
      throw error
    }
    forceSqliteMode()
    console.warn("PostgreSQL unavailable for investment create, falling back to SQLite:", error)
    const db = prepareSqliteInvestmentDatabase()
    db.prepare(
      `insert into investment_transactions (id, no, type, tx_date, category, buyer, vol, jumlah, notes)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(record.id, record.no, record.type, record.date, record.category, record.buyer, record.vol, record.jumlah, record.notes)
    return record
  }
}

export async function updateInvestmentTransaction(id: string, input: InvestmentTransactionInput) {
  if (getDbMode() === "sqlite") {
    const db = prepareSqliteInvestmentDatabase()
    const result = db.prepare(
      `update investment_transactions
       set tx_date = ?,
           category = ?,
           buyer = ?,
           vol = ?,
           jumlah = ?,
           notes = ?,
           updated_at = datetime('now')
       where id = ?`
    ).run(input.date, input.category, input.buyer, input.vol, input.jumlah, input.notes, id)

    if (result.changes === 0) {
      throw new Error("Transaksi investasi tidak ditemukan.")
    }

    const row = db.prepare(`
      select id, no, type, tx_date as date, category, buyer, vol, jumlah, notes
      from investment_transactions
      where id = ?
    `).get(id) as {
      id: string
      no: string
      type: string
      date: string
      category: string
      buyer: string
      vol: number
      jumlah: number
      notes: string
    }
    return mapRow(row)
  }

  try {
    const pool = getDbPool()
    await ensureInvestmentTable(pool)
    const { rows } = await pool.query(
      `update investment_transactions
       set tx_date = $2,
           category = $3,
           buyer = $4,
           vol = $5,
           jumlah = $6,
           notes = $7,
           updated_at = now()
       where id = $1
       returning id, no, type, tx_date::text as date, category, buyer, vol::text as vol, jumlah, notes`,
      [id, input.date, input.category, input.buyer, input.vol, input.jumlah, input.notes],
    )

    if (!rows[0]) {
      throw new Error("Transaksi investasi tidak ditemukan.")
    }

    return mapRow(rows[0])
  } catch (error) {
    if (!shouldFallbackToSqlite(error)) {
      throw error
    }
    forceSqliteMode()
    console.warn("PostgreSQL unavailable for investment update, falling back to SQLite:", error)
    const db = prepareSqliteInvestmentDatabase()
    const result = db.prepare(
      `update investment_transactions
       set tx_date = ?,
           category = ?,
           buyer = ?,
           vol = ?,
           jumlah = ?,
           notes = ?,
           updated_at = datetime('now')
       where id = ?`
    ).run(input.date, input.category, input.buyer, input.vol, input.jumlah, input.notes, id)

    if (result.changes === 0) {
      throw new Error("Transaksi investasi tidak ditemukan.")
    }

    const row = db.prepare(`
      select id, no, type, tx_date as date, category, buyer, vol, jumlah, notes
      from investment_transactions
      where id = ?
    `).get(id) as {
      id: string
      no: string
      type: string
      date: string
      category: string
      buyer: string
      vol: number
      jumlah: number
      notes: string
    }
    return mapRow(row)
  }
}

export async function deleteInvestmentTransaction(id: string) {
  if (getDbMode() === "sqlite") {
    const db = prepareSqliteInvestmentDatabase()
    const result = db.prepare(`delete from investment_transactions where id = ?`).run(id)
    if (result.changes === 0) {
      throw new Error("Transaksi investasi tidak ditemukan.")
    }
    return
  }

  try {
    const pool = getDbPool()
    await ensureInvestmentTable(pool)
    const result = await pool.query("delete from investment_transactions where id = $1", [id])
    if (result.rowCount === 0) {
      throw new Error("Transaksi investasi tidak ditemukan.")
    }
  } catch (error) {
    if (!shouldFallbackToSqlite(error)) {
      throw error
    }
    forceSqliteMode()
    console.warn("PostgreSQL unavailable for investment delete, falling back to SQLite:", error)
    const db = prepareSqliteInvestmentDatabase()
    const result = db.prepare(`delete from investment_transactions where id = ?`).run(id)
    if (result.changes === 0) {
      throw new Error("Transaksi investasi tidak ditemukan.")
    }
  }
}
