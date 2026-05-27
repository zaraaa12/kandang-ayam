import { Pool } from "pg"
import Database from "better-sqlite3"
import { forceSqliteMode, getDbMode, getDbPool, getSqliteDb, initSqliteDatabase } from "./db"
import { batches as seedBatches, vaksinasi as seedVaccinations, type Batch, type VaksinasiRecord } from "@/data/livestock"

export type LivestockBatchInput = Omit<Batch, "id">
export type LivestockVaccinationInput = Omit<VaksinasiRecord, "no">

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

  await pool.query(`
    create table if not exists livestock_vaccinations (
      no integer primary key,
      tanggal date not null,
      nama text not null,
      qty integer not null check (qty > 0),
      satuan text not null,
      harga integer not null default 0 check (harga >= 0),
      subtotal integer not null check (subtotal >= 0),
      batch text not null,
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

  const vaccinationCount = await pool.query<{ count: string }>("select count(*) from livestock_vaccinations")
  if (Number(vaccinationCount.rows[0]?.count ?? 0) === 0) {
    const client = await pool.connect()
    try {
      await client.query("begin")
      for (const item of seedVaccinations) {
        const harga = item.harga ?? Math.round(item.subtotal / item.qty)
        await client.query(
          `insert into livestock_vaccinations (no, tanggal, nama, qty, satuan, harga, subtotal, batch)
           values ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [item.no, item.tanggal, item.nama, item.qty, item.satuan, harga, item.subtotal, item.batch],
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

    CREATE TABLE IF NOT EXISTS livestock_vaccinations (
      no INTEGER PRIMARY KEY,
      tanggal TEXT NOT NULL,
      nama TEXT NOT NULL,
      qty INTEGER NOT NULL CHECK (qty > 0),
      satuan TEXT NOT NULL,
      harga INTEGER NOT NULL DEFAULT 0 CHECK (harga >= 0),
      subtotal INTEGER NOT NULL CHECK (subtotal >= 0),
      batch TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)
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

  const vaccinationCount = db.prepare("select count(*) as count from livestock_vaccinations").get() as { count: number }
  if (Number(vaccinationCount.count ?? 0) === 0) {
    const insert = db.prepare(
      `insert into livestock_vaccinations (no, tanggal, nama, qty, satuan, harga, subtotal, batch)
       values (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    const transaction = db.transaction((records: VaksinasiRecord[]) => {
      for (const item of records) {
        const harga = item.harga ?? Math.round(item.subtotal / item.qty)
        insert.run(item.no, item.tanggal, item.nama, item.qty, item.satuan, harga, item.subtotal, item.batch)
      }
    })
    transaction(seedVaccinations)
  }
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

export async function createLivestockVaccination(input: LivestockVaccinationInput) {
  if (getDbMode() === "sqlite") {
    const db = prepareSqliteLivestockDatabase()
    const maxRow = db.prepare("select max(no) as max_no from livestock_vaccinations").get() as { max_no?: number | null }
    const no = Number(maxRow.max_no ?? 0) + 1

    db.prepare(
      `insert into livestock_vaccinations (no, tanggal, nama, qty, satuan, harga, subtotal, batch)
       values (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(no, input.tanggal, input.nama, input.qty, input.satuan, input.harga ?? 0, input.subtotal, input.batch)

    return {
      no,
      tanggal: input.tanggal,
      nama: input.nama,
      qty: input.qty,
      satuan: input.satuan,
      harga: input.harga ?? 0,
      subtotal: input.subtotal,
      batch: input.batch,
    }
  }

  const pool = await prepareLivestockDatabase()
  const { rows: maxRows } = await pool.query<{ max_no: string | null }>("select max(no) as max_no from livestock_vaccinations")
  const no = Number(maxRows[0]?.max_no ?? 0) + 1

  const { rows } = await pool.query(
    `insert into livestock_vaccinations (no, tanggal, nama, qty, satuan, harga, subtotal, batch)
     values ($1, $2, $3, $4, $5, $6, $7, $8)
     returning no, tanggal::text as tanggal, nama, qty, satuan, harga, subtotal, batch`,
    [no, input.tanggal, input.nama, input.qty, input.satuan, input.harga ?? 0, input.subtotal, input.batch],
  )

  return mapVaccination(rows[0])
}

export async function updateLivestockVaccination(no: number, input: LivestockVaccinationInput) {
  if (getDbMode() === "sqlite") {
    const db = prepareSqliteLivestockDatabase()
    const result = db.prepare(
      `update livestock_vaccinations
       set tanggal = ?,
           nama = ?,
           qty = ?,
           satuan = ?,
           harga = ?,
           subtotal = ?,
           batch = ?,
           updated_at = datetime('now')
       where no = ?`
    ).run(input.tanggal, input.nama, input.qty, input.satuan, input.harga ?? 0, input.subtotal, input.batch, no)

    if (result.changes === 0) {
      throw new Error("Record vaksinasi tidak ditemukan.")
    }

    return {
      no,
      tanggal: input.tanggal,
      nama: input.nama,
      qty: input.qty,
      satuan: input.satuan,
      harga: input.harga ?? 0,
      subtotal: input.subtotal,
      batch: input.batch,
    }
  }

  const pool = await prepareLivestockDatabase()
  const { rows } = await pool.query(
    `update livestock_vaccinations
     set tanggal = $2,
         nama = $3,
         qty = $4,
         satuan = $5,
         harga = $6,
         subtotal = $7,
         batch = $8,
         updated_at = now()
     where no = $1
     returning no, tanggal::text as tanggal, nama, qty, satuan, harga, subtotal, batch`,
    [no, input.tanggal, input.nama, input.qty, input.satuan, input.harga ?? 0, input.subtotal, input.batch],
  )

  if (!rows[0]) {
    throw new Error("Record vaksinasi tidak ditemukan.")
  }

  return mapVaccination(rows[0])
}

export async function deleteLivestockVaccination(no: number) {
  if (getDbMode() === "sqlite") {
    const db = prepareSqliteLivestockDatabase()
    const result = db.prepare(`delete from livestock_vaccinations where no = ?`).run(no)
    if (result.changes === 0) {
      throw new Error("Record vaksinasi tidak ditemukan.")
    }
    return
  }

  const pool = await prepareLivestockDatabase()
  await pool.query("delete from livestock_vaccinations where no = $1", [no])
}
