import { Pool } from "pg"
import Database from "better-sqlite3"
import fs from "fs"
import path from "path"
import { forceSqliteMode, getDbMode, getDbPool, getSqliteDb, initSqliteDatabase } from "./db"
import { getExpenseSheetTransactions } from "./income-sheet"
import { getIncomeSheetTransactions } from "./expense-sheet"

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
]

type StoredFinanceTxType = Exclude<FinanceTxType, "investor_income">
type FinanceTable = "finance_income" | "finance_expense" | "finance_warist"

const TABLE_BY_TYPE: Record<StoredFinanceTxType, FinanceTable> = {
  income: "finance_income",
  expense: "finance_expense",
  warist: "finance_warist",
}

function txNo(type: FinanceTxType, id: string) {
  const prefix = type === "income" ? "TX" : type === "expense" ? "EX" : type === "investor_income" ? "INV" : "WAR"
  return `${prefix}-${id.slice(-6).toUpperCase()}`
}

function normalizeFinanceTxType(type: string, category: string): FinanceTxType {
  if (type === "expense") return "expense"
  if (type === "investor_income") return "investor_income"
  if (type === "warist") return "warist"
  if (type === "income") return "income"
  if (type === "sale") return category === "Penjualan Warist" ? "warist" : "income"
  return category === "Penjualan Warist" ? "warist" : "expense"
}

function mapRow(row: {
  id: string
  no: string
  type: string
  date: string
  category: string
  buyer: string
  stock?: string | number | null
  vol: string | number
  sisa?: string | number | null
  harga?: string | number | null
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

function storedType(type: FinanceTxType): StoredFinanceTxType {
  if (type === "investor_income") {
    throw new Error("Transaksi investasi disimpan di tabel investment_transactions.")
  }
  return type
}

function tableForType(type: FinanceTxType): FinanceTable {
  return TABLE_BY_TYPE[storedType(type)]
}

function sortTransactions(records: FinanceTransaction[]) {
  return [...records].sort((a, b) => {
    const byDate = b.date.localeCompare(a.date)
    if (byDate !== 0) return byDate
    return b.no.localeCompare(a.no)
  })
}

function txKey(tx: FinanceTransaction) {
  return [
    tx.type,
    tx.date,
    tx.category.toLowerCase(),
    Number(tx.vol).toFixed(2),
    Math.round(Number(tx.jumlah) || 0),
    String(tx.buyer || "").toLowerCase(),
  ].join("|")
}

async function getSheetTransactions() {
  const sheetIncome = (await getIncomeSheetTransactions())
    .filter((tx: any) => tx.jumlah > 0)
    .map((tx: any) => mapRow(tx))

  const sheetExpenses = getExpenseSheetTransactions()
    .filter((tx: any) => tx.jumlah > 0)
    .map((tx: any) => mapRow(tx))

  return [...sheetIncome, ...sheetExpenses]
}

async function seedSupabaseFromSheetsIfEmpty(pool: Pool) {
  await ensureTypedFinanceTables(pool)

  const { rows } = await pool.query(`
    select
      (select count(*) from finance_income) +
      (select count(*) from finance_expense) +
      (select count(*) from finance_warist) as total
  `)
  const total = Number(rows[0]?.total ?? 0)
  if (total > 0) return // already has data, don't overwrite

  console.log("[finance-db] Supabase tables empty, seeding from xlsx files...")
  const sheetRecords = await getSheetTransactions()
  const allRecords = [...SEED_TRANSACTIONS, ...sheetRecords]

  if (allRecords.length === 0) return

  const client = await pool.connect()
  try {
    await client.query('begin')

    const byTable: Record<FinanceTable, FinanceTransaction[]> = {
      finance_income: [],
      finance_expense: [],
      finance_warist: [],
    }

    for (const tx of allRecords) {
      byTable[tableForType(tx.type)].push(tx)
    }

    for (const [table, txs] of Object.entries(byTable) as Array<[FinanceTable, FinanceTransaction[]]>) {
      if (txs.length === 0) continue

      const values: string[] = []
      const params: any[] = []

      for (const tx of txs) {
        params.push(
          tx.id, tx.no, tx.type, tx.date, tx.category, tx.buyer,
          tx.stock ?? null, tx.vol, tx.sisa ?? null, tx.harga ?? null, tx.jumlah, tx.notes,
        )
        const baseIndex = params.length - 12
        values.push(
          `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6}, $${baseIndex + 7}, $${baseIndex + 8}, $${baseIndex + 9}, $${baseIndex + 10}, $${baseIndex + 11}, $${baseIndex + 12})`
        )
      }

      await client.query(
        `insert into ${table} (id, no, type, tx_date, category, buyer, stock, vol, sisa, harga, jumlah, notes)
         values ${values.join(',')} on conflict (id) do nothing`,
        params,
      )
    }

    await client.query('commit')
    console.log(`[finance-db] Seeded ${allRecords.length} records to Supabase`)
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
}


function mergeDisplayedTransactions(records: FinanceTransaction[], sheetRecords: FinanceTransaction[]) {
  const sheetIds = new Set(sheetRecords.map(tx => tx.id))
  const sheetKeys = new Set(sheetRecords.map(txKey))
  const merged = records.filter(tx => {
    if (sheetIds.has(tx.id)) return false
    if (tx.no.startsWith("TX-SHEET-") || tx.no.startsWith("EX-SHEET-")) return false
    return !sheetKeys.has(txKey(tx))
  })

  return sortTransactions([...merged, ...sheetRecords])
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

async function ensureTypedFinanceTables(pool: Pool) {
  for (const [type, table] of Object.entries(TABLE_BY_TYPE) as Array<[StoredFinanceTxType, FinanceTable]>) {
    await pool.query(`
      create table if not exists ${table} (
        id text primary key,
        no text not null unique,
        type text not null check (type = '${type}'),
        tx_date date not null,
        category text not null,
        buyer text not null default '',
        stock numeric(10, 2),
        vol numeric(10, 2) not null default 0 check (vol >= 0),
        sisa numeric(10, 2),
        harga numeric(10, 2),
        jumlah integer not null check (jumlah >= 0),
        notes text not null default '',
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )
    `)

    await pool.query(`alter table ${table} add column if not exists stock numeric(10, 2)`)
    await pool.query(`alter table ${table} add column if not exists sisa numeric(10, 2)`)
    await pool.query(`alter table ${table} add column if not exists harga numeric(10, 2)`)
    await pool.query(`alter table ${table} alter column harga type numeric(10, 2)`)
  }
}

async function getLegacyFinanceRecords(pool: Pool) {
  const exists = await pool.query<{ exists: boolean }>("select to_regclass('public.finance_transactions') is not null as exists")
  if (!exists.rows[0]?.exists) return []

  const { rows } = await pool.query(`
    select
      id,
      no,
      type,
      tx_date::text as date,
      category,
      buyer,
      null::text as stock,
      vol::text as vol,
      null::text as sisa,
      null::int as harga,
      jumlah,
      notes
    from finance_transactions
    where type != 'investor_income'
  `)

  return rows.map(mapRow)
}

async function dropLegacyFinanceTable(pool: Pool) {
  await pool.query("drop table if exists finance_transactions")
}

async function getStoredFinanceRecords(pool: Pool) {
  const { rows } = await pool.query(`
    select id, no, type, tx_date::text as date, category, buyer, stock::text as stock, vol::text as vol, sisa::text as sisa, harga, jumlah, notes, created_at
    from finance_income
    union all
    select id, no, type, tx_date::text as date, category, buyer, stock::text as stock, vol::text as vol, sisa::text as sisa, harga, jumlah, notes, created_at
    from finance_expense
    union all
    select id, no, type, tx_date::text as date, category, buyer, stock::text as stock, vol::text as vol, sisa::text as sisa, harga, jumlah, notes, created_at
    from finance_warist
    order by date desc, created_at desc
  `)

  return rows.map(mapRow)
}

async function upsertFinanceRecord(pool: Pool, tx: FinanceTransaction) {
  const table = tableForType(tx.type)
  await pool.query(
    `insert into ${table} (id, no, type, tx_date, category, buyer, stock, vol, sisa, harga, jumlah, notes, updated_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, now())
     on conflict (id) do update set
       no = excluded.no,
       type = excluded.type,
       tx_date = excluded.tx_date,
       category = excluded.category,
       buyer = excluded.buyer,
       stock = excluded.stock,
       vol = excluded.vol,
       sisa = excluded.sisa,
       harga = excluded.harga,
       jumlah = excluded.jumlah,
       notes = excluded.notes,
       updated_at = now()`,
    [tx.id, tx.no, tx.type, tx.date, tx.category, tx.buyer, tx.stock ?? null, tx.vol, tx.sisa ?? null, tx.harga ?? null, tx.jumlah, tx.notes],
  )
}

// Track last sync time and file modification times to avoid unnecessary syncs
let lastSyncTime: number = 0
let lastExpenseSheetMtime: number = 0
let lastIncomeSheetMtime: number = 0
const SYNC_INTERVAL = 300000 // Only sync once per 5 minutes

// Cache for sheet transactions to avoid re-parsing
let cachedSheetTransactions: FinanceTransaction[] | null = null
let cachedSheetTime: number = 0
const SHEET_CACHE_INTERVAL = 60000 // Cache sheets for 1 minute

async function getCachedSheetTransactions() {
  const now = Date.now()
  if (cachedSheetTransactions && (now - cachedSheetTime) < SHEET_CACHE_INTERVAL) {
    return cachedSheetTransactions
  }
  
  const expensePath = path.join(process.cwd(), 'expense.xlsx')
  const incomePath = path.join(process.cwd(), 'income.xlsx')
  
  let expenseMtime = 0
  let incomeMtime = 0
  
  try {
    if (fs.existsSync(expensePath)) {
      expenseMtime = fs.statSync(expensePath).mtimeMs
    }
  } catch (e) {}
  
  try {
    if (fs.existsSync(incomePath)) {
      incomeMtime = fs.statSync(incomePath).mtimeMs
    }
  } catch (e) {}
  
  // If files haven't changed, use cache
  if (cachedSheetTransactions && expenseMtime === lastExpenseSheetMtime && incomeMtime === lastIncomeSheetMtime) {
    return cachedSheetTransactions
  }
  
  cachedSheetTransactions = await getSheetTransactions()
  cachedSheetTime = now
  lastExpenseSheetMtime = expenseMtime
  lastIncomeSheetMtime = incomeMtime
  
  return cachedSheetTransactions
}

async function syncDisplayedFinanceRecords(pool: Pool) {
  const now = Date.now()

  console.log("[finance-db] syncDisplayedFinanceRecords start", {
    lastSyncTime,
    now,
    delta: now - lastSyncTime,
  })
  
  // Skip sync if we synced recently (within SYNC_INTERVAL)
  if (now - lastSyncTime < SYNC_INTERVAL) {
    console.log("[finance-db] skip sync (SYNC_INTERVAL) returning stored records")
    return sortTransactions(await getStoredFinanceRecords(pool))
  }

  
  // Check if Excel files have changed using cached mtimes
  const expensePath = path.join(process.cwd(), 'expense.xlsx')
  const incomePath = path.join(process.cwd(), 'income.xlsx')

  console.log("[finance-db] excel mtimes", {
    expensePath,
    incomePath,
    lastExpenseSheetMtime,
    lastIncomeSheetMtime,
    lastSyncTime,
  })

  
  let expenseMtime = 0
  let incomeMtime = 0
  
  try {
    if (fs.existsSync(expensePath)) {
      expenseMtime = fs.statSync(expensePath).mtimeMs
    }
  } catch (e) {}
  
  try {
    if (fs.existsSync(incomePath)) {
      incomeMtime = fs.statSync(incomePath).mtimeMs
    }
  } catch (e) {}
  
  // Skip sync if files haven't changed since last sync
  if (expenseMtime === lastExpenseSheetMtime && incomeMtime === lastIncomeSheetMtime && lastSyncTime > 0) {
    return sortTransactions(await getStoredFinanceRecords(pool))
  }
  
  await ensureTypedFinanceTables(pool)
  const storedRecords = await getStoredFinanceRecords(pool)
  const legacyRecords = await getLegacyFinanceRecords(pool)
  const baseRecords = storedRecords.length > 0 || legacyRecords.length > 0 ? [...storedRecords, ...legacyRecords] : SEED_TRANSACTIONS
  
  // Use cached sheet transactions
  const sheetRecords = await getCachedSheetTransactions()
  const displayedRecords = mergeDisplayedTransactions(baseRecords, sheetRecords)

  // Batch insert for better performance
  if (displayedRecords.length > 0) {
    const client = await pool.connect()
    try {
      await client.query('begin')

      // Clear existing records
      await client.query('DELETE FROM finance_income')
      await client.query('DELETE FROM finance_expense')
      await client.query('DELETE FROM finance_warist')

      // Bulk upsert (much faster than per-row roundtrips)
      const byTable: Record<FinanceTable, FinanceTransaction[]> = {
        finance_income: [],
        finance_expense: [],
        finance_warist: [],
      }

      for (const tx of displayedRecords) {
        byTable[tableForType(tx.type)].push(tx)
      }

      for (const [table, txs] of Object.entries(byTable) as Array<[FinanceTable, FinanceTransaction[]]>) {
        if (txs.length === 0) continue

        // Prepare VALUES list with parameterized placeholders
        // Columns: id, no, type, tx_date, category, buyer, stock, vol, sisa, harga, jumlah, notes, updated_at
        const values: string[] = []
        const params: any[] = []

        for (const tx of txs) {
          params.push(
            tx.id,
            tx.no,
            tx.type,
            tx.date,
            tx.category,
            tx.buyer,
            tx.stock ?? null,
            tx.vol,
            tx.sisa ?? null,
            tx.harga ?? null,
            tx.jumlah,
            tx.notes,
          )

          const baseIndex = params.length - 12 // last 12 pushed
          values.push(
            `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6}, $${baseIndex + 7}, $${baseIndex + 8}, $${baseIndex + 9}, $${baseIndex + 10}, $${baseIndex + 11}, $${baseIndex + 12})`
          )
        }

        await client.query(
          `insert into ${table} (id, no, type, tx_date, category, buyer, stock, vol, sisa, harga, jumlah, notes)
           values ${values.join(',')}
           on conflict (id) do update set
             no = excluded.no,
             type = excluded.type,
             tx_date = excluded.tx_date,
             category = excluded.category,
             buyer = excluded.buyer,
             stock = excluded.stock,
             vol = excluded.vol,
             sisa = excluded.sisa,
             harga = excluded.harga,
             jumlah = excluded.jumlah,
             notes = excluded.notes,
             updated_at = now()`,
          params,
        )
      }

      await client.query('commit')
    } catch (error) {
      await client.query('rollback')
      throw error
    } finally {
      client.release()
    }
  }


  await dropLegacyFinanceTable(pool)
  
  // Update tracking variables
  lastSyncTime = now
  lastExpenseSheetMtime = expenseMtime
  lastIncomeSheetMtime = incomeMtime
  
  return sortTransactions(await getStoredFinanceRecords(pool))
}

function ensureSqliteTypedFinanceTables(db: Database.Database) {
  for (const [type, table] of Object.entries(TABLE_BY_TYPE) as Array<[StoredFinanceTxType, FinanceTable]>) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS ${table} (
        id TEXT PRIMARY KEY,
        no TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL CHECK (type = '${type}'),
        tx_date TEXT NOT NULL,
        category TEXT NOT NULL,
        buyer TEXT NOT NULL DEFAULT '',
        stock REAL,
        vol REAL NOT NULL DEFAULT 0 CHECK (vol >= 0),
        sisa REAL,
        harga REAL,
        jumlah INTEGER NOT NULL CHECK (jumlah >= 0),
        notes TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `)

    const columns = new Set((db.prepare(`pragma table_info(${table})`).all() as Array<{ name: string }>).map(col => col.name))
    if (!columns.has("stock")) db.exec(`ALTER TABLE ${table} ADD COLUMN stock REAL`)
    if (!columns.has("sisa")) db.exec(`ALTER TABLE ${table} ADD COLUMN sisa REAL`)
    if (!columns.has("harga")) db.exec(`ALTER TABLE ${table} ADD COLUMN harga INTEGER`)
  }
}

function getSqliteLegacyFinanceRecords(db: Database.Database) {
  const exists = db.prepare("select name from sqlite_master where type = 'table' and name = 'finance_transactions'").get()
  if (!exists) return []

  const rows = db.prepare(`
    select id, no, type, tx_date as date, category, buyer, null as stock, vol, null as sisa, null as harga, jumlah, notes
    from finance_transactions
    where type != 'investor_income'
  `).all() as Array<{
    id: string
    no: string
    type: string
    date: string
    category: string
    buyer: string
    stock: null
    vol: number
    sisa: null
    harga: null
    jumlah: number
    notes: string
  }>

  return rows.map(mapRow)
}

function dropSqliteLegacyFinanceTable(db: Database.Database) {
  db.exec("DROP TABLE IF EXISTS finance_transactions")
}

function getSqliteStoredFinanceRecords(db: Database.Database) {
  const rows = db.prepare(`
    select id, no, type, tx_date as date, category, buyer, stock, vol, sisa, harga, jumlah, notes, created_at
    from finance_income
    union all
    select id, no, type, tx_date as date, category, buyer, stock, vol, sisa, harga, jumlah, notes, created_at
    from finance_expense
    union all
    select id, no, type, tx_date as date, category, buyer, stock, vol, sisa, harga, jumlah, notes, created_at
    from finance_warist
    order by date desc, created_at desc
  `).all() as Array<{
    id: string
    no: string
    type: string
    date: string
    category: string
    buyer: string
    stock?: number
    vol: number
    sisa?: number
    harga?: number
    jumlah: number
    notes: string
  }>

  return rows.map(mapRow)
}

function upsertSqliteFinanceRecord(db: Database.Database, tx: FinanceTransaction) {
  const table = tableForType(tx.type)
  db.prepare(`
    insert into ${table} (id, no, type, tx_date, category, buyer, stock, vol, sisa, harga, jumlah, notes, updated_at)
    values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    on conflict(id) do update set
      no = excluded.no,
      type = excluded.type,
      tx_date = excluded.tx_date,
      category = excluded.category,
      buyer = excluded.buyer,
      stock = excluded.stock,
      vol = excluded.vol,
      sisa = excluded.sisa,
      harga = excluded.harga,
      jumlah = excluded.jumlah,
      notes = excluded.notes,
      updated_at = datetime('now')
  `).run(tx.id, tx.no, tx.type, tx.date, tx.category, tx.buyer, tx.stock ?? null, tx.vol, tx.sisa ?? null, tx.harga ?? null, tx.jumlah, tx.notes)
}

async function prepareSqliteFinanceDatabase() {
  initSqliteDatabase()
  const db = getSqliteDb()
  ensureSqliteTypedFinanceTables(db)

  const storedRecords = getSqliteStoredFinanceRecords(db)
  const legacyRecords = getSqliteLegacyFinanceRecords(db)
  const baseRecords = storedRecords.length > 0 || legacyRecords.length > 0 ? [...storedRecords, ...legacyRecords] : SEED_TRANSACTIONS
  const displayedRecords = mergeDisplayedTransactions(baseRecords, await getSheetTransactions())
  const transaction = db.transaction((records: FinanceTransaction[]) => {
    for (const tx of records) {
      upsertSqliteFinanceRecord(db, tx)
    }
    dropSqliteLegacyFinanceTable(db)
  })

  transaction(displayedRecords)
  return db
}

async function getSqliteFinanceRecords() {
  const db = await prepareSqliteFinanceDatabase()
  return sortTransactions(getSqliteStoredFinanceRecords(db))
}

/**
 * Mirror Supabase finance records into the local SQLite cache.
 * Called after a successful Supabase read so SQLite stays in sync.
 * Throttled: only runs at most once per 5 minutes.
 */
let lastSqliteMirrorTime = 0
const MIRROR_INTERVAL = 300_000 // 5 minutes

function mirrorSupabaseToSqlite(records: FinanceTransaction[]) {
  const now = Date.now()
  if (now - lastSqliteMirrorTime < MIRROR_INTERVAL) return
  lastSqliteMirrorTime = now

  try {
    const db = getSqliteDb()
    ensureSqliteTypedFinanceTables(db)

    // Count existing SQLite records
    const sqliteCount = getSqliteStoredFinanceRecords(db).length
    if (sqliteCount === records.length) return // already in sync

    console.log(`[finance-db] Mirroring ${records.length} Supabase records to SQLite (was ${sqliteCount})`)
    const transaction = db.transaction((txs: FinanceTransaction[]) => {
      // Clear and repopulate SQLite to match Supabase exactly
      for (const table of Object.values(TABLE_BY_TYPE)) {
        db.prepare(`DELETE FROM ${table}`).run()
      }
      for (const tx of txs) {
        upsertSqliteFinanceRecord(db, tx)
      }
    })
    transaction(records)
  } catch (e) {
    console.warn("[finance-db] SQLite mirror failed (non-critical):", (e as Error).message)
  }
}

export async function getFinanceTransactions(): Promise<FinanceTransaction[]> {
  if (getDbMode() === "sqlite") {
    return getSqliteFinanceRecords()
  }

  try {
    const pool = getDbPool()
    // Seed from xlsx only if tables are completely empty
    await seedSupabaseFromSheetsIfEmpty(pool)
    // Direct read from Supabase — CRUD changes are always reflected
    const records = sortTransactions(await getStoredFinanceRecords(pool))

    // Mirror Supabase records to local SQLite to keep it in sync
    mirrorSupabaseToSqlite(records)

    return records
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
  const record = { ...input, id, no }

  if (getDbMode() === "sqlite") {
    const db = await prepareSqliteFinanceDatabase()
    upsertSqliteFinanceRecord(db, record)
    return record
  }

  try {
    const pool = getDbPool()
    await ensureTypedFinanceTables(pool)
    await upsertFinanceRecord(pool, record)
    return record
  } catch (error) {
    if (!shouldFallbackToSqlite(error)) throw error
    forceSqliteMode()
    console.warn("PostgreSQL unavailable for finance create, falling back to SQLite:", error)
    const db = await prepareSqliteFinanceDatabase()
    upsertSqliteFinanceRecord(db, record)
    return record
  }
}

export async function updateFinanceTransaction(id: string, input: FinanceTransactionInput) {
  if (getDbMode() === "sqlite") {
    const db = await prepareSqliteFinanceDatabase()
    const existing = getSqliteStoredFinanceRecords(db).find(tx => tx.id === id)
    if (!existing) throw new Error("Transaksi finance tidak ditemukan.")

    for (const table of Object.values(TABLE_BY_TYPE)) {
      db.prepare(`delete from ${table} where id = ?`).run(id)
    }

    const record = { ...input, id, no: existing.no }
    upsertSqliteFinanceRecord(db, record)
    return record
  }

  try {
    const pool = getDbPool()
    await ensureTypedFinanceTables(pool)
    const existing = (await getStoredFinanceRecords(pool)).find(tx => tx.id === id)
    if (!existing) throw new Error("Transaksi finance tidak ditemukan.")

    const client = await pool.connect()
    try {
      await client.query("begin")
      for (const table of Object.values(TABLE_BY_TYPE)) {
        await client.query(`delete from ${table} where id = $1`, [id])
      }
      const record = { ...input, id, no: existing.no }
      const table = tableForType(record.type)
      await client.query(
        `insert into ${table} (id, no, type, tx_date, category, buyer, stock, vol, sisa, harga, jumlah, notes, updated_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, now())`,
        [record.id, record.no, record.type, record.date, record.category, record.buyer, record.stock ?? null, record.vol, record.sisa ?? null, record.harga ?? null, record.jumlah, record.notes],
      )
      await client.query("commit")
      return record
    } catch (error) {
      await client.query("rollback")
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    if (!shouldFallbackToSqlite(error)) throw error
    forceSqliteMode()
    console.warn("PostgreSQL unavailable for finance update, falling back to SQLite:", error)
    const db = await prepareSqliteFinanceDatabase()
    const existing = getSqliteStoredFinanceRecords(db).find(tx => tx.id === id)
    if (!existing) throw new Error("Transaksi finance tidak ditemukan.")
    for (const table of Object.values(TABLE_BY_TYPE)) {
      db.prepare(`delete from ${table} where id = ?`).run(id)
    }
    const record = { ...input, id, no: existing.no }
    upsertSqliteFinanceRecord(db, record)
    return record
  }
}

export async function deleteFinanceTransaction(id: string) {
  if (getDbMode() === "sqlite") {
    const db = await prepareSqliteFinanceDatabase()
    const changes = Object.values(TABLE_BY_TYPE).reduce((total, table) => total + db.prepare(`delete from ${table} where id = ?`).run(id).changes, 0)
    if (changes === 0) throw new Error("Transaksi finance tidak ditemukan.")
    return
  }

  try {
    const pool = getDbPool()
    await ensureTypedFinanceTables(pool)
    const client = await pool.connect()
    try {
      await client.query("begin")
      let changes = 0
      for (const table of Object.values(TABLE_BY_TYPE)) {
        const result = await client.query(`delete from ${table} where id = $1`, [id])
        changes += result.rowCount ?? 0
      }
      if (changes === 0) throw new Error("Transaksi finance tidak ditemukan.")
      await client.query("commit")
    } catch (error) {
      await client.query("rollback")
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    if (!shouldFallbackToSqlite(error)) throw error
    forceSqliteMode()
    console.warn("PostgreSQL unavailable for finance delete, falling back to SQLite:", error)
    const db = await prepareSqliteFinanceDatabase()
    const changes = Object.values(TABLE_BY_TYPE).reduce((total, table) => total + db.prepare(`delete from ${table} where id = ?`).run(id).changes, 0)
    if (changes === 0) throw new Error("Transaksi finance tidak ditemukan.")
  }
}
