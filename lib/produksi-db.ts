import { Pool, type PoolClient } from "pg"
import type Database from "better-sqlite3"
import { forceSqliteMode, getDbMode, getDbPool, getSqliteDb, initSqliteDatabase } from "./db"
import { dataProduksi, type DataProduksi } from "@/data/produksi"

export type ProduksiRecord = DataProduksi & { id: string }
export type ProduksiInput = {
  date: string
  act: number
  vol: number
  ayam: number
}

function monthName(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("id-ID", { month: "long" })
}

function calculateHdp(act: number, ayam: number) {
  return ayam > 0 ? Math.round((act / ayam) * 1000) / 10 : 0
}

async function ensureProduksiTable(client: Pool | PoolClient) {
  await client.query(`
    create table if not exists produksi_records (
      id text primary key,
      record_date date not null,
      month text not null,
      act integer not null check (act >= 0),
      vol numeric(10, 2) not null check (vol >= 0),
      ayam integer not null check (ayam > 0),
      hdp numeric(6, 2) not null check (hdp >= 0),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `)
}

async function seedProduksiIfEmpty(pool: Pool) {
  const { rows } = await pool.query<{ count: string }>("select count(*) from produksi_records")
  if (Number(rows[0]?.count ?? 0) > 0) return

  const client = await pool.connect()
  try {
    await client.query("begin")
    for (const item of dataProduksi) {
      const id = `${item.date}-${Math.random().toString(36).slice(2, 8)}`
      await client.query(
        `insert into produksi_records (id, record_date, month, act, vol, ayam, hdp)
         values ($1, $2, $3, $4, $5, $6, $7)`,
        [id, item.date, item.month, item.act, item.vol, item.ayam, item.hdp],
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

function ensureSqliteProduksiTable(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS produksi_records (
      id TEXT PRIMARY KEY,
      record_date TEXT NOT NULL,
      month TEXT NOT NULL,
      act INTEGER NOT NULL CHECK (act >= 0),
      vol REAL NOT NULL CHECK (vol >= 0),
      ayam INTEGER NOT NULL CHECK (ayam > 0),
      hdp REAL NOT NULL CHECK (hdp >= 0),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)
}

function seedSqliteProduksiIfEmpty(db: Database.Database) {
  const countRow = db.prepare("select count(*) as count from produksi_records").get() as { count: number }
  if (Number(countRow?.count ?? 0) > 0) return

  const insert = db.prepare(
    `insert into produksi_records (id, record_date, month, act, vol, ayam, hdp)
     values (?, ?, ?, ?, ?, ?, ?)`
  )

  const insertTransaction = db.transaction((records: ProduksiRecord[]) => {
    for (const record of records) {
      insert.run(record.id, record.date, record.month, record.act, record.vol, record.ayam, record.hdp)
    }
  })

  insertTransaction(
    dataProduksi.map((item) => ({
      id: `${item.date}-${Math.random().toString(36).slice(2, 8)}`,
      date: item.date,
      month: item.month,
      act: item.act,
      vol: item.vol,
      ayam: item.ayam,
      hdp: item.hdp,
    }))
  )
}

function prepareSqliteProduksiDatabase() {
  initSqliteDatabase()
  const db = getSqliteDb()
  ensureSqliteProduksiTable(db)
  seedSqliteProduksiIfEmpty(db)
  return db
}

function mapRow(row: {
  id: string
  date: string
  month: string
  act: number
  vol: string | number
  ayam: number
  hdp: string | number
}): ProduksiRecord {
  return {
    id: row.id,
    date: row.date,
    month: row.month,
    act: Number(row.act),
    vol: Number(row.vol),
    ayam: Number(row.ayam),
    hdp: Number(row.hdp),
  }
}

function getSqliteRecords() {
  const db = prepareSqliteProduksiDatabase()
  const rows = db.prepare(`
    select id, record_date as date, month, act, vol, ayam, hdp
    from produksi_records
    order by record_date asc, created_at asc
  `).all() as Array<{
    id: string
    date: string
    month: string
    act: number
    vol: number
    ayam: number
    hdp: number
  }>
  return rows.map(mapRow)
}

export async function getProduksiRecords(): Promise<ProduksiRecord[]> {
  if (getDbMode() === "sqlite") {
    return getSqliteRecords()
  }

  try {
    const pool = getDbPool()
    await ensureProduksiTable(pool)
    await seedProduksiIfEmpty(pool)

    const { rows } = await pool.query(`
      select
        id,
        record_date::text as date,
        month,
        act,
        vol::text as vol,
        ayam,
        hdp::text as hdp
      from produksi_records
      order by record_date asc, created_at asc
    `)

    return rows.map(mapRow)
  } catch (error) {
      forceSqliteMode()
      console.warn("PostgreSQL unavailable for produksi, falling back to SQLite:", error)
    return getSqliteRecords()
  }
}

export async function createProduksiRecord(input: ProduksiInput) {
  const id = crypto.randomUUID()
  const month = monthName(input.date)
  const hdp = calculateHdp(input.act, input.ayam)

  if (getDbMode() === "sqlite") {
    const db = prepareSqliteProduksiDatabase()
    db.prepare(
      `insert into produksi_records (id, record_date, month, act, vol, ayam, hdp)
       values (?, ?, ?, ?, ?, ?, ?)`
    ).run(id, input.date, month, input.act, input.vol, input.ayam, hdp)

    return { id, date: input.date, month, act: input.act, vol: input.vol, ayam: input.ayam, hdp }
  }

  try {
    const pool = getDbPool()
    const { rows } = await pool.query(
      `insert into produksi_records (id, record_date, month, act, vol, ayam, hdp)
       values ($1, $2, $3, $4, $5, $6, $7)
       returning id, record_date::text as date, month, act, vol::text as vol, ayam, hdp::text as hdp`,
      [id, input.date, month, input.act, input.vol, input.ayam, hdp],
    )

    return mapRow(rows[0])
  } catch (error) {
      forceSqliteMode()
      console.warn("PostgreSQL unavailable for produksi create, falling back to SQLite:", error)
    const db = prepareSqliteProduksiDatabase()
    db.prepare(
      `insert into produksi_records (id, record_date, month, act, vol, ayam, hdp)
       values (?, ?, ?, ?, ?, ?, ?)`
    ).run(id, input.date, month, input.act, input.vol, input.ayam, hdp)

    return { id, date: input.date, month, act: input.act, vol: input.vol, ayam: input.ayam, hdp }
  }
}

export async function updateProduksiRecord(id: string, input: ProduksiInput) {
  const month = monthName(input.date)
  const hdp = calculateHdp(input.act, input.ayam)

  if (getDbMode() === "sqlite") {
    const db = prepareSqliteProduksiDatabase()
    const result = db.prepare(
      `update produksi_records
       set record_date = ?,
           month = ?,
           act = ?,
           vol = ?,
           ayam = ?,
           hdp = ?,
           updated_at = datetime('now')
       where id = ?`
    ).run(input.date, month, input.act, input.vol, input.ayam, hdp, id)

    if (result.changes === 0) {
      throw new Error("Record produksi tidak ditemukan.")
    }

    return { id, date: input.date, month, act: input.act, vol: input.vol, ayam: input.ayam, hdp }
  }

  try {
    const pool = getDbPool()
    const { rows } = await pool.query(
      `update produksi_records
       set record_date = $2,
           month = $3,
           act = $4,
           vol = $5,
           ayam = $6,
           hdp = $7,
           updated_at = now()
       where id = $1
       returning id, record_date::text as date, month, act, vol::text as vol, ayam, hdp::text as hdp`,
      [id, input.date, month, input.act, input.vol, input.ayam, hdp],
    )

    if (!rows[0]) {
      throw new Error("Record produksi tidak ditemukan.")
    }

    return mapRow(rows[0])
  } catch (error) {
      forceSqliteMode()
      console.warn("PostgreSQL unavailable for produksi update, falling back to SQLite:", error)
    const db = prepareSqliteProduksiDatabase()
    const result = db.prepare(
      `update produksi_records
       set record_date = ?,
           month = ?,
           act = ?,
           vol = ?,
           ayam = ?,
           hdp = ?,
           updated_at = datetime('now')
       where id = ?`
    ).run(input.date, month, input.act, input.vol, input.ayam, hdp, id)

    if (result.changes === 0) {
      throw new Error("Record produksi tidak ditemukan.")
    }

    return { id, date: input.date, month, act: input.act, vol: input.vol, ayam: input.ayam, hdp }
  }
}

export async function deleteProduksiRecord(id: string) {
  if (getDbMode() === "sqlite") {
    const db = prepareSqliteProduksiDatabase()
    const result = db.prepare(`delete from produksi_records where id = ?`).run(id)
    if (result.changes === 0) {
      throw new Error("Record produksi tidak ditemukan.")
    }
    return
  }

  try {
    const pool = getDbPool()
    const result = await pool.query("delete from produksi_records where id = $1", [id])
    if (result.rowCount === 0) {
      throw new Error("Record produksi tidak ditemukan.")
    }
  } catch (error) {
      forceSqliteMode()
      console.warn("PostgreSQL unavailable for produksi delete, falling back to SQLite:", error)
    const db = prepareSqliteProduksiDatabase()
    const result = db.prepare(`delete from produksi_records where id = ?`).run(id)
    if (result.changes === 0) {
      throw new Error("Record produksi tidak ditemukan.")
    }
  }
}
