import { Pool } from "pg"
import Database from "better-sqlite3"
import { forceSqliteMode, getDbMode, getDbPool, getSqliteDb, initSqliteDatabase } from "./db"
import { batches as seedBatches, type Batch, type VaksinasiRecord } from "@/data/livestock"

export type LivestockBatchInput = Omit<Batch, "id">

async function ensureLivestockTables(pool: Pool) {
  await pool.query(`
    create table if not exists livestock_batches (
      id text primary key,
      masuk date not null,
      jumlah integer not null check (jumlah > 0),
      tahun integer not null default 0 check (tahun >= 0),
      bulan integer not null default 0 check (bulan >= 0),
      hari integer not null default 0 check (hari >= 0),
      status text not null check (status in ('active', 'partial', 'closed')),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `)
}

async function seedLivestockIfEmpty(pool: Pool) {
  const batchCount = await pool.query<{ count: string }>("select count(*) from livestock_batches")
  if (Number(batchCount.rows[0]?.count ?? 0) === 0) {
    const client = await pool.connect()
    try {
      await client.query("begin")
      for (const batch of seedBatches) {
        await client.query(
          `insert into livestock_batches (id, masuk, jumlah, tahun, bulan, hari, status)
           values ($1, $2, $3, $4, $5, $6, $7)`,
          [batch.id, batch.masuk, batch.jumlah, batch.tahun, batch.bulan, batch.hari, batch.status],
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
  // Note: Vaccinations are now derived from finance_expense table
  // No longer seeded from static data
}

function ensureSqliteLivestockTables(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS livestock_batches (
      id TEXT PRIMARY KEY,
      masuk TEXT NOT NULL,
      jumlah INTEGER NOT NULL CHECK (jumlah > 0),
      tahun INTEGER NOT NULL DEFAULT 0 CHECK (tahun >= 0),
      bulan INTEGER NOT NULL DEFAULT 0 CHECK (bulan >= 0),
      hari INTEGER NOT NULL DEFAULT 0 CHECK (hari >= 0),
      status TEXT NOT NULL CHECK (status IN ('active', 'partial', 'closed')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)
  // Note: livestock_vaccinations table is no longer needed
  // Vaccinations are now derived from finance_expense
}

function seedSqliteLivestockIfEmpty(db: Database.Database) {
  const batchCount = db.prepare("select count(*) as count from livestock_batches").get() as { count: number }
  if (Number(batchCount.count ?? 0) === 0) {
    const insert = db.prepare(
      `insert into livestock_batches (id, masuk, jumlah, tahun, bulan, hari, status)
       values (?, ?, ?, ?, ?, ?, ?)`
    )
    const transaction = db.transaction((batches: Batch[]) => {
      for (const batch of batches) {
        insert.run(batch.id, batch.masuk, batch.jumlah, batch.tahun, batch.bulan, batch.hari, batch.status)
      }
    })
    transaction(seedBatches)
  }
  // Note: Vaccinations are now derived from finance_expense
}

function prepareSqliteLivestockDatabase() {
  initSqliteDatabase()
  const db = getSqliteDb()
  ensureSqliteLivestockTables(db)
  seedSqliteLivestockIfEmpty(db)
  return db
}

function mapBatch(row: {
  id: string
  masuk: string
  jumlah: number
  tahun: number
  bulan: number
  hari: number
  status: Batch["status"]
}): Batch {
  return {
    id: row.id,
    masuk: row.masuk,
    jumlah: Number(row.jumlah),
    tahun: Number(row.tahun),
    bulan: Number(row.bulan),
    hari: Number(row.hari),
    status: row.status,
  }
}

function mapVaccination(row: {
  no: number
  tanggal: string
  nama: string
  qty: number
  satuan: string
  harga: number
  subtotal: number
  batch: string
}): VaksinasiRecord {
  return {
    no: Number(row.no),
    tanggal: row.tanggal,
    nama: row.nama,
    qty: Number(row.qty),
    satuan: row.satuan,
    harga: Number(row.harga),
    subtotal: Number(row.subtotal),
    batch: row.batch,
  }
}

function getSqliteLivestockData() {
  const db = prepareSqliteLivestockDatabase()

  const batches = db.prepare(`
    select id, masuk, jumlah, tahun, bulan, hari, status
    from livestock_batches
    order by masuk asc, id asc
  `).all() as Array<{
    id: string
    masuk: string
    jumlah: number
    tahun: number
    bulan: number
    hari: number
    status: Batch["status"]
  }>

  const vaccinations = db.prepare(`
    select no, tanggal, nama, qty, satuan, harga, subtotal, batch
    from livestock_vaccinations
    order by no asc
  `).all() as Array<{
    no: number
    tanggal: string
    nama: string
    qty: number
    satuan: string
    harga: number
    subtotal: number
    batch: string
  }>

  return {
    batches: batches.map(mapBatch),
    vaccinations: vaccinations.map(mapVaccination),
  }
}

async function prepareLivestockDatabase() {
  const pool = getDbPool()
  await ensureLivestockTables(pool)
  await seedLivestockIfEmpty(pool)
  return pool
}

export async function getLivestockData() {
  if (getDbMode() === "sqlite") {
    return getSqliteLivestockData()
  }

  try {
    const pool = getDbPool()
    await ensureLivestockTables(pool)
    await seedLivestockIfEmpty(pool)

    const [batchResult, vaccinationResult] = await Promise.all([
      pool.query(`
        select id, masuk::text as masuk, jumlah, tahun, bulan, hari, status
        from livestock_batches
        order by masuk asc, id asc
      `),
      pool.query(`
        select no, tanggal::text as tanggal, nama, qty, satuan, harga, subtotal, batch
        from livestock_vaccinations
        order by no asc
      `),
    ])

    return {
      batches: batchResult.rows.map(mapBatch),
      vaccinations: vaccinationResult.rows.map(mapVaccination),
    }
  } catch (error) {
    console.error("PostgreSQL unavailable for livestock, falling back to SQLite:", error)
    return getSqliteLivestockData()
  }
}

export async function createLivestockBatch(input: LivestockBatchInput) {
  if (getDbMode() === "sqlite") {
    const db = prepareSqliteLivestockDatabase()
    const maxRow = db.prepare(`select max(cast(substr(id, 5) as integer)) as max_no from livestock_batches`).get() as { max_no?: number | null }
    const nextNo = Number(maxRow.max_no ?? 0) + 1
    const id = `BTH-${String(nextNo).padStart(3, "0")}`

    db.prepare(
      `insert into livestock_batches (id, masuk, jumlah, tahun, bulan, hari, status)
       values (?, ?, ?, ?, ?, ?, ?)`
    ).run(id, input.masuk, input.jumlah, input.tahun, input.bulan, input.hari, input.status)

    return {
      id,
      masuk: input.masuk,
      jumlah: input.jumlah,
      tahun: input.tahun,
      bulan: input.bulan,
      hari: input.hari,
      status: input.status,
    }
  }

  try {
    const pool = await prepareLivestockDatabase()
    const { rows: maxRows } = await pool.query<{ max_no: string | null }>(`
      select max(nullif(regexp_replace(id, '\\D', '', 'g'), '')::integer) as max_no
      from livestock_batches
    `)
    const nextNo = Number(maxRows[0]?.max_no ?? 0) + 1
    const id = `BTH-${String(nextNo).padStart(3, "0")}`

    const { rows } = await pool.query(
      `insert into livestock_batches (id, masuk, jumlah, tahun, bulan, hari, status)
       values ($1, $2, $3, $4, $5, $6, $7)
       returning id, masuk::text as masuk, jumlah, tahun, bulan, hari, status`,
      [id, input.masuk, input.jumlah, input.tahun, input.bulan, input.hari, input.status],
    )

    return mapBatch(rows[0])
  } catch (error) {
    forceSqliteMode()
    console.warn("PostgreSQL unavailable for livestock create batch, falling back to SQLite:", error)
    const db = prepareSqliteLivestockDatabase()
    const maxRow = db.prepare(`select max(cast(substr(id, 5) as integer)) as max_no from livestock_batches`).get() as { max_no?: number | null }
    const nextNo = Number(maxRow.max_no ?? 0) + 1
    const id = `BTH-${String(nextNo).padStart(3, "0")}`

    db.prepare(
      `insert into livestock_batches (id, masuk, jumlah, tahun, bulan, hari, status)
       values (?, ?, ?, ?, ?, ?, ?)`
    ).run(id, input.masuk, input.jumlah, input.tahun, input.bulan, input.hari, input.status)

    return {
      id,
      masuk: input.masuk,
      jumlah: input.jumlah,
      tahun: input.tahun,
      bulan: input.bulan,
      hari: input.hari,
      status: input.status,
    }
  }
}

export async function updateLivestockBatch(id: string, input: LivestockBatchInput) {
  if (getDbMode() === "sqlite") {
    const db = prepareSqliteLivestockDatabase()
    const result = db.prepare(
      `update livestock_batches
       set masuk = ?,
           jumlah = ?,
           tahun = ?,
           bulan = ?,
           hari = ?,
           status = ?,
           updated_at = datetime('now')
       where id = ?`
    ).run(input.masuk, input.jumlah, input.tahun, input.bulan, input.hari, input.status, id)

    if (result.changes === 0) {
      throw new Error("Batch tidak ditemukan.")
    }

    return {
      id,
      masuk: input.masuk,
      jumlah: input.jumlah,
      tahun: input.tahun,
      bulan: input.bulan,
      hari: input.hari,
      status: input.status,
    }
  }

  try {
    const pool = await prepareLivestockDatabase()
    const { rows } = await pool.query(
    `update livestock_batches
     set masuk = $2,
         jumlah = $3,
         tahun = $4,
         bulan = $5,
         hari = $6,
         status = $7,
         updated_at = now()
     where id = $1
     returning id, masuk::text as masuk, jumlah, tahun, bulan, hari, status`,
    [id, input.masuk, input.jumlah, input.tahun, input.bulan, input.hari, input.status],
  )

  if (!rows[0]) {
    throw new Error("Batch tidak ditemukan.")
  }

  return mapBatch(rows[0])
  } catch (error) {
    forceSqliteMode()
    console.warn("PostgreSQL unavailable for livestock update batch, falling back to SQLite:", error)
    const db = prepareSqliteLivestockDatabase()
    const result = db.prepare(
      `update livestock_batches
       set masuk = ?,
           jumlah = ?,
           tahun = ?,
           bulan = ?,
           hari = ?,
           status = ?,
           updated_at = datetime('now')
       where id = ?`
    ).run(input.masuk, input.jumlah, input.tahun, input.bulan, input.hari, input.status, id)

    if (result.changes === 0) {
      throw new Error("Batch tidak ditemukan.")
    }

    return {
      id,
      masuk: input.masuk,
      jumlah: input.jumlah,
      tahun: input.tahun,
      bulan: input.bulan,
      hari: input.hari,
      status: input.status,
    }
  }
}

export async function deleteLivestockBatch(id: string) {
  if (getDbMode() === "sqlite") {
    const db = prepareSqliteLivestockDatabase()
    const result = db.prepare(`delete from livestock_batches where id = ?`).run(id)
    if (result.changes === 0) {
      throw new Error("Batch tidak ditemukan.")
    }
    return
  }

  try {
    const pool = await prepareLivestockDatabase()
    await pool.query("delete from livestock_batches where id = $1", [id])
  } catch (error) {
    forceSqliteMode()
    console.warn("PostgreSQL unavailable for livestock delete batch, falling back to SQLite:", error)
    const db = prepareSqliteLivestockDatabase()
    const result = db.prepare(`delete from livestock_batches where id = ?`).run(id)
    if (result.changes === 0) {
      throw new Error("Batch tidak ditemukan.")
    }
  }
}

// Note: Vaccination CRUD functions have been removed.
// Vaccinations are now derived from finance_expense table.
// To add/edit/delete vaccinations, use the Finance page (Pengeluaran tab)
// with categories containing "vaksin" (e.g., "Vaksin ND Lasota", "Vaksin & Vitamin").
// The vaccination records will automatically appear in the Livestock page.
