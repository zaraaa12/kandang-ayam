import { Pool } from "pg"
import Database from "better-sqlite3"
import { forceSqliteMode, getDbMode, getDbPool, getSqliteDb, initSqliteDatabase } from "./db"
import { getExpenseSheetTransactions } from "./expense-sheet"
import { getIncomeSheetTransactions } from "./income-sheet"

export type FinanceTxType = "income" | "expense" | "investor_income" | "warist"

export type FinanceTransaction = {
  id: string
  no: string
  type: FinanceTxType
  date: string
  category: string
  buyer: string
  stock?: number
  vol: number
  sisa?: number
  harga?: number
  jumlah: number
  notes: string
}

export type FinanceTransactionInput = Omit<FinanceTransaction, "id" | "no">

const SEED_TRANSACTIONS: FinanceTransaction[] = [
  { id:"w1", no:"TX-WARIST", type:"warist", date:"2025-12-01", category:"Penjualan Warist", buyer:"Warist", vol:42, jumlah:1_600_000, notes:"Penjualan 42 ekor ayam afkir. Dana terpisah - tidak masuk kas utama." },
  { id:"a1", no:"TX-210", type:"income", date:"2026-01-16", category:"Penjualan Telur", buyer:"Pembeli Lokal",  vol:11,  jumlah:286_000,   notes:"" },
  { id:"a2", no:"TX-209", type:"income", date:"2026-01-15", category:"Penjualan Telur", buyer:"Pasar Mandiri", vol:35,  jumlah:910_000,   notes:"" },
  { id:"a3", no:"TX-208", type:"income", date:"2026-01-14", category:"Penjualan Telur", buyer:"AgroMart",      vol:38,  jumlah:988_000,   notes:"" },
  { id:"a4", no:"TX-207", type:"income", date:"2026-01-13", category:"Penjualan Telur", buyer:"Pembeli Lokal", vol:3,   jumlah:78_000,    notes:"" },
  { id:"a5", no:"TX-206", type:"income", date:"2026-01-12", category:"Penjualan Telur", buyer:"Distributor A", vol:29,  jumlah:754_000,   notes:"" },
  { id:"a6", no:"TX-205", type:"income", date:"2026-01-11", category:"Penjualan Telur", buyer:"FreshEgg Co.",  vol:43,  jumlah:1_118_000, notes:"" },
  { id:"b1", no:"EX-001", type:"expense", date:"2026-01-10", category:"Pakan Ayam",    buyer:"Supplier Pakan", vol:0, jumlah:3_650_000, notes:"21 karung @50kg" },
  { id:"b2", no:"EX-002", type:"expense", date:"2026-01-05", category:"Gaji Karyawan", buyer:"Warist",        vol:0, jumlah:3_000_000, notes:"Gaji Jan 2026" },
]

function txNo(type: FinanceTxType, id: string) {
  const prefix = type === "income" ? "TX" : type === "expense" ? "EX" : type === "investor_income" ? "INV" : "WAR"
  return `${prefix}-${id.slice(-6).toUpperCase()}`
}

function normalizeFinanceTxType(type: string, category: string): FinanceTxType {
  if (type === "expense") return "expense"
  if (type === "investor_income") return "investor_income"
  if (type === "warist") return "warist"
  if (type === "income") return "income"
  if (type === "sale") {
    return category === "Penjualan Warist" ? "warist" : "income"
  }
  return category === "Penjualan Warist" ? "warist" : "expense"
}

function mapRow(row: {
  id: string
  no: string
  type: string
  date: string
  category: string
  buyer: string
  stock?: string | number
  vol: string | number
  sisa?: string | number
  harga?: string | number
  jumlah: number
  notes: string
}): FinanceTransaction {
  return {
    id: row.id,
    no: row.no,
    type: normalizeFinanceTxType(row.type, row.category),
    date: row.date,
    category: row.category,
    buyer: row.buyer,
    stock: row.stock == null ? undefined : Number(row.stock),
    vol: Number(row.vol),
    sisa: row.sisa == null ? undefined : Number(row.sisa),
    harga: row.harga == null ? undefined : Number(row.harga),
    jumlah: Number(row.jumlah),
    notes: row.notes,
  }
}

function eggSaleKey(tx: FinanceTransaction) {
  return [
    tx.date,
    tx.category.toLowerCase(),
    Number(tx.vol).toFixed(2),
    Math.round(Number(tx.jumlah) || 0),
  ].join("|")
}

function sheetTxKey(tx: FinanceTransaction) {
  return [
    tx.type,
    tx.date,
    tx.category.toLowerCase(),
    Number(tx.vol).toFixed(2),
    Math.round(Number(tx.jumlah) || 0),
    String(tx.buyer || "").toLowerCase(),
  ].join("|")
}

async function mergeSheetTransactions(records: FinanceTransaction[]) {
  const sheetTransactions = getExpenseSheetTransactions()
    .filter(tx => tx.jumlah > 0)
    .map(tx => mapRow(tx))
  const sheetExpenses = (await getIncomeSheetTransactions())
    .filter(tx => tx.jumlah > 0)
    .map(tx => mapRow(tx))

  if (sheetTransactions.length === 0 && sheetExpenses.length === 0) {
    return records
  }

  const sheetKeys = new Set(sheetTransactions.map(eggSaleKey))
  const expenseKeys = new Set(sheetExpenses.map(sheetTxKey))
  const merged = records.filter(tx => {
    if (tx.id.startsWith("sheet-egg-sale-")) return false
    if (tx.id.startsWith("sheet-income-")) return false
    if (tx.type === "income" && tx.no.startsWith("EX-SHEET-")) return false
    if (tx.type === "expense" && tx.no.startsWith("EX-SHEET-")) return false
    if (tx.type === "expense") return !expenseKeys.has(sheetTxKey(tx))
    if (tx.type !== "income" || tx.category !== "Penjualan Telur") return true
    return !sheetKeys.has(eggSaleKey(tx))
  })

  return [...merged, ...sheetTransactions, ...sheetExpenses].sort((a, b) => {
    const byDate = b.date.localeCompare(a.date)
    if (byDate !== 0) return byDate
    return b.no.localeCompare(a.no)
  })
}

function shouldFallbackToSqlite(error: unknown) {
  if (!process.env.DATABASE_URL) {
    return true
  }

  if (!error || typeof error !== "object") {
    return false
  }

  const err = error as { code?: string; message?: string }
  const code = String(err.code ?? "")
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

  if (networkErrors.some(token => code.toLowerCase().includes(token) || message.includes(token))) {
    return true
  }

  return message.includes("timeout") || message.includes("connection refused") || message.includes("could not connect")
}

async function ensureFinanceTable(pool: Pool) {
  await pool.query(`
    create table if not exists finance_transactions (
      id text primary key,
      no text not null unique,
      type text not null check (type in ('income', 'expense', 'investor_income', 'warist')),
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

  await pool.query(`
    alter table finance_transactions
    drop constraint if exists finance_transactions_type_check
  `)

  await pool.query(`
    alter table finance_transactions
    add constraint finance_transactions_type_check check (type in ('income', 'expense', 'investor_income', 'warist'))
  `)
}

async function seedFinanceIfEmpty(pool: Pool) {
  const { rows } = await pool.query<{ count: string }>("select count(*) from finance_transactions")
  if (Number(rows[0]?.count ?? 0) > 0) return

  const client = await pool.connect()
  try {
    await client.query("begin")
    for (const tx of SEED_TRANSACTIONS) {
      await client.query(
        `insert into finance_transactions (id, no, type, tx_date, category, buyer, vol, jumlah, notes)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [tx.id, tx.no, tx.type, tx.date, tx.category, tx.buyer, tx.vol, tx.jumlah, tx.notes],
      )
    }
    await client.query("commit")
  } catch (error) {
    await client.query("rollback")
    throw error
  } finally {
    client.release()
  }
}

function ensureSqliteFinanceTable(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS finance_transactions (
      id TEXT PRIMARY KEY,
      no TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'investor_income', 'warist')),
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

function seedSqliteFinanceIfEmpty(db: Database.Database) {
  const countRow = db.prepare("select count(*) as count from finance_transactions").get() as { count: number }
  if (Number(countRow?.count ?? 0) > 0) return

  const insert = db.prepare(
    `insert into finance_transactions (id, no, type, tx_date, category, buyer, vol, jumlah, notes)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )

  const transaction = db.transaction((records: FinanceTransaction[]) => {
    for (const record of records) {
      insert.run(record.id, record.no, record.type, record.date, record.category, record.buyer, record.vol, record.jumlah, record.notes)
    }
  })

  transaction(SEED_TRANSACTIONS)
}

function prepareSqliteFinanceDatabase() {
  initSqliteDatabase()
  const db = getSqliteDb()
  ensureSqliteFinanceTable(db)
  seedSqliteFinanceIfEmpty(db)
  return db
}


async function getSqliteFinanceRecords() {
  const db = prepareSqliteFinanceDatabase()
  const rows = db.prepare(`
    select id, no, type, tx_date as date, category, buyer, vol, jumlah, notes
    from finance_transactions
    where type != 'investor_income'
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
  return mergeSheetTransactions(rows.map(mapRow))
}

export async function getFinanceTransactions(): Promise<FinanceTransaction[]> {
  if (getDbMode() === "sqlite") {
    return getSqliteFinanceRecords()
  }

  try {
    const pool = getDbPool()
    await ensureFinanceTable(pool)
    await seedFinanceIfEmpty(pool)

    const { rows } = await pool.query(`
      select
        id,
        no,
        type,
        tx_date::text as date,
        category,
        buyer,
        vol::text as vol,
        jumlah,
        notes
      from finance_transactions
      where type != 'investor_income'
      order by tx_date desc, created_at desc
    `)

    return mergeSheetTransactions(rows.map(mapRow))
  } catch (error) {
    forceSqliteMode()
    console.warn("PostgreSQL unavailable for finance, falling back to SQLite:", error)
    return getSqliteFinanceRecords()
  }
}

export async function createFinanceTransaction(input: FinanceTransactionInput) {
  const id = crypto.randomUUID()
  const no = input.category === "Penjualan Warist"
    ? `TX-WARIST-${Date.now().toString().slice(-6)}`
    : txNo(input.type, id)

  if (getDbMode() === "sqlite") {
    const db = prepareSqliteFinanceDatabase()
    db.prepare(
      `insert into finance_transactions (id, no, type, tx_date, category, buyer, vol, jumlah, notes)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, no, input.type, input.date, input.category, input.buyer, input.vol, input.jumlah, input.notes)
    return { id, no, type: input.type, date: input.date, category: input.category, buyer: input.buyer, vol: input.vol, jumlah: input.jumlah, notes: input.notes }
  }

  try {
    const pool = getDbPool()
    const { rows } = await pool.query(
      `insert into finance_transactions (id, no, type, tx_date, category, buyer, vol, jumlah, notes)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       returning id, no, type, tx_date::text as date, category, buyer, vol::text as vol, jumlah, notes`,
      [id, no, input.type, input.date, input.category, input.buyer, input.vol, input.jumlah, input.notes],
    )
    return mapRow(rows[0])
  } catch (error) {
    if (!shouldFallbackToSqlite(error)) {
      throw error
    }

    forceSqliteMode()
    console.warn("PostgreSQL unavailable for finance create, falling back to SQLite:", error)
    const db = prepareSqliteFinanceDatabase()
    db.prepare(
      `insert into finance_transactions (id, no, type, tx_date, category, buyer, vol, jumlah, notes)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, no, input.type, input.date, input.category, input.buyer, input.vol, input.jumlah, input.notes)
    return { id, no, type: input.type, date: input.date, category: input.category, buyer: input.buyer, vol: input.vol, jumlah: input.jumlah, notes: input.notes }
  }
}

export async function updateFinanceTransaction(id: string, input: FinanceTransactionInput) {
  if (getDbMode() === "sqlite") {
    const db = prepareSqliteFinanceDatabase()
    const result = db.prepare(
      `update finance_transactions
       set type = ?,
           tx_date = ?,
           category = ?,
           buyer = ?,
           vol = ?,
           jumlah = ?,
           notes = ?,
           updated_at = datetime('now')
       where id = ?`
    ).run(input.type, input.date, input.category, input.buyer, input.vol, input.jumlah, input.notes, id)

    if (result.changes === 0) {
      throw new Error("Transaksi finance tidak ditemukan.")
    }

    const row = db.prepare(`
      select id, no, type, tx_date as date, category, buyer, vol, jumlah, notes
      from finance_transactions
      where id = ?
    `).get(id) as {
      id: string
      no: string
      type: FinanceTxType
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
    const { rows } = await pool.query(
      `update finance_transactions
       set type = $2,
           tx_date = $3,
           category = $4,
           buyer = $5,
           vol = $6,
           jumlah = $7,
           notes = $8,
           updated_at = now()
       where id = $1
       returning id, no, type, tx_date::text as date, category, buyer, vol::text as vol, jumlah, notes`,
      [id, input.type, input.date, input.category, input.buyer, input.vol, input.jumlah, input.notes],
    )

    if (!rows[0]) {
      throw new Error("Transaksi finance tidak ditemukan.")
    }

    return mapRow(rows[0])
  } catch (error) {
    if (!shouldFallbackToSqlite(error)) {
      throw error
    }

    forceSqliteMode()
    console.warn("PostgreSQL unavailable for finance update, falling back to SQLite:", error)
    const db = prepareSqliteFinanceDatabase()
    const result = db.prepare(
      `update finance_transactions
       set type = ?,
           tx_date = ?,
           category = ?,
           buyer = ?,
           vol = ?,
           jumlah = ?,
           notes = ?,
           updated_at = datetime('now')
       where id = ?`
    ).run(input.type, input.date, input.category, input.buyer, input.vol, input.jumlah, input.notes, id)

    if (result.changes === 0) {
      throw new Error("Transaksi finance tidak ditemukan.")
    }

    const row = db.prepare(`
      select id, no, type, tx_date as date, category, buyer, vol, jumlah, notes
      from finance_transactions
      where id = ?
    `).get(id) as {
      id: string
      no: string
      type: FinanceTxType
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

export async function deleteFinanceTransaction(id: string) {
  if (getDbMode() === "sqlite") {
    const db = prepareSqliteFinanceDatabase()
    const result = db.prepare(`delete from finance_transactions where id = ?`).run(id)
    if (result.changes === 0) {
      throw new Error("Transaksi finance tidak ditemukan.")
    }
    return
  }

  try {
    const pool = getDbPool()
    const result = await pool.query("delete from finance_transactions where id = $1", [id])
    if (result.rowCount === 0) {
      throw new Error("Transaksi finance tidak ditemukan.")
    }
  } catch (error) {
    if (!shouldFallbackToSqlite(error)) {
      throw error
    }

    forceSqliteMode()
    console.warn("PostgreSQL unavailable for finance delete, falling back to SQLite:", error)
    const db = prepareSqliteFinanceDatabase()
    const result = db.prepare(`delete from finance_transactions where id = ?`).run(id)
    if (result.changes === 0) {
      throw new Error("Transaksi finance tidak ditemukan.")
    }
  }
}
