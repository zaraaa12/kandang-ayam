import { Pool } from "pg"
import Database from "better-sqlite3"
import { config } from "dotenv"
import { resolve } from "path"
import { forceSqliteMode, getDbMode, getDbPool, getSqliteDb, initSqliteDatabase } from "./db"
import { inventoryItems, type InventoryItem } from "@/data/inventory"

config({ path: resolve(process.cwd(), ".env.local"), quiet: true })

function quotePgIdentifier(value: string) {
  return `"${value.replace(/"/g, '""')}"`
}

async function ensureInventoryTable(pool: Pool) {
  await pool.query(`
    create table if not exists inventory_items (
      id text primary key,
      nama text not null,
      kategori text not null check (kategori in ('Konstruksi', 'Utilitas', 'SDM')),
      stok integer not null check (stok >= 0),
      satuan text not null,
      kapasitas integer not null check (kapasitas > 0),
      harga_satuan integer not null check (harga_satuan >= 0),
      terakhir_restock date not null,
      keterangan text not null default '',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `)

  const { rows } = await pool.query<{ conname: string }>(`
    select conname
    from pg_constraint
    where conrelid = 'inventory_items'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%kategori%'
  `)

  for (const row of rows) {
    await pool.query(`alter table inventory_items drop constraint if exists ${quotePgIdentifier(row.conname)}`)
  }

  await pool.query("delete from inventory_items where kategori not in ('Konstruksi', 'Utilitas', 'SDM')")

  await pool.query(`
    alter table inventory_items
    add constraint inventory_items_kategori_check
    check (kategori in ('Konstruksi', 'Utilitas', 'SDM'))
  `)
}

async function syncInventoryDataset(pool: Pool) {
  const client = await pool.connect()
  try {
    await client.query("begin")
    await client.query("delete from inventory_items")
    for (const item of inventoryItems) {
      await client.query(
        `insert into inventory_items (id, nama, kategori, stok, satuan, kapasitas, harga_satuan, terakhir_restock, keterangan)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [item.id, item.nama, item.kategori, item.stok, item.satuan, item.kapasitas, item.hargaSatuan, item.terakhirRestok, item.keterangan ?? ""],
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

function ensureSqliteInventoryTable(db: Database.Database) {
  const existing = db.prepare("select sql from sqlite_master where type = 'table' and name = 'inventory_items'").get() as { sql: string } | undefined

  if (existing && !existing.sql.includes("'Konstruksi'")) {
    db.exec("DROP TABLE inventory_items")
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS inventory_items (
      id TEXT PRIMARY KEY,
      nama TEXT NOT NULL,
      kategori TEXT NOT NULL CHECK (kategori IN ('Konstruksi', 'Utilitas', 'SDM')),
      stok INTEGER NOT NULL CHECK (stok >= 0),
      satuan TEXT NOT NULL,
      kapasitas INTEGER NOT NULL CHECK (kapasitas > 0),
      harga_satuan INTEGER NOT NULL CHECK (harga_satuan >= 0),
      terakhir_restock TEXT NOT NULL,
      keterangan TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)
}

function syncSqliteInventoryDataset(db: Database.Database) {
  const insert = db.prepare(
    `insert into inventory_items (id, nama, kategori, stok, satuan, kapasitas, harga_satuan, terakhir_restock, keterangan)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
  const transaction = db.transaction((items: InventoryItem[]) => {
    db.prepare("delete from inventory_items").run()
    for (const item of items) {
      insert.run(item.id, item.nama, item.kategori, item.stok, item.satuan, item.kapasitas, item.hargaSatuan, item.terakhirRestok, item.keterangan ?? "")
    }
  })
  transaction(inventoryItems)
}

function prepareSqliteInventoryDatabase() {
  initSqliteDatabase()
  const db = getSqliteDb()
  ensureSqliteInventoryTable(db)
  syncSqliteInventoryDataset(db)
  return db
}

function mapRow(row: {
  id: string
  nama: string
  kategori: InventoryItem["kategori"]
  stok: number
  satuan: string
  kapasitas: number
  harga_satuan: number
  terakhir_restock: string
  keterangan: string
}): InventoryItem {
  return {
    id: row.id,
    nama: row.nama,
    kategori: row.kategori,
    stok: Number(row.stok),
    satuan: row.satuan,
    kapasitas: Number(row.kapasitas),
    hargaSatuan: Number(row.harga_satuan),
    terakhirRestok: row.terakhir_restock,
    keterangan: row.keterangan,
  }
}

async function prepareInventoryDatabase() {
  const pool = getDbPool()
  await ensureInventoryTable(pool)
  await syncInventoryDataset(pool)
  return pool
}

export async function getInventoryItems(): Promise<InventoryItem[]> {
  if (getDbMode() === "sqlite") {
    const db = prepareSqliteInventoryDatabase()
    const rows = db.prepare(`
      select
        id,
        nama,
        kategori,
        stok,
        satuan,
        kapasitas,
        harga_satuan,
        terakhir_restock,
        keterangan
      from inventory_items
      order by id asc
    `).all() as Array<{
      id: string
      nama: string
      kategori: InventoryItem["kategori"]
      stok: number
      satuan: string
      kapasitas: number
      harga_satuan: number
      terakhir_restock: string
      keterangan: string
    }>

    return rows.map(mapRow)
  }

  try {
    const pool = await prepareInventoryDatabase()
    const { rows } = await pool.query(`
      select
        id,
        nama,
        kategori,
        stok,
        satuan,
        kapasitas,
        harga_satuan,
        terakhir_restock::text as terakhir_restock,
        keterangan
      from inventory_items
      order by id asc
    `)
    return rows.map(mapRow)
  } catch (error) {
    forceSqliteMode()
    console.warn("PostgreSQL unavailable for inventory, falling back to SQLite:", error)
    const db = prepareSqliteInventoryDatabase()
    const rows = db.prepare(`
      select
        id,
        nama,
        kategori,
        stok,
        satuan,
        kapasitas,
        harga_satuan,
        terakhir_restock,
        keterangan
      from inventory_items
      order by id asc
    `).all() as Array<{
      id: string
      nama: string
      kategori: InventoryItem["kategori"]
      stok: number
      satuan: string
      kapasitas: number
      harga_satuan: number
      terakhir_restock: string
      keterangan: string
    }>

    return rows.map(mapRow)
  }
}

export async function upsertInventoryItem(item: InventoryItem) {
  if (getDbMode() === "sqlite") {
    const db = prepareSqliteInventoryDatabase()
    db.prepare(
      `insert into inventory_items (id, nama, kategori, stok, satuan, kapasitas, harga_satuan, terakhir_restock, keterangan)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?)
       on conflict(id) do update set
         nama = excluded.nama,
         kategori = excluded.kategori,
         stok = excluded.stok,
         satuan = excluded.satuan,
         kapasitas = excluded.kapasitas,
         harga_satuan = excluded.harga_satuan,
         terakhir_restock = excluded.terakhir_restock,
         keterangan = excluded.keterangan,
         updated_at = datetime('now')`
    ).run(item.id, item.nama, item.kategori, item.stok, item.satuan, item.kapasitas, item.hargaSatuan, item.terakhirRestok, item.keterangan ?? "")

    const row = db.prepare(`
      select id, nama, kategori, stok, satuan, kapasitas, harga_satuan, terakhir_restock, keterangan
      from inventory_items
      where id = ?
    `).get(item.id) as {
      id: string
      nama: string
      kategori: InventoryItem["kategori"]
      stok: number
      satuan: string
      kapasitas: number
      harga_satuan: number
      terakhir_restock: string
      keterangan: string
    }

    return mapRow(row)
  }

  try {
    const pool = await prepareInventoryDatabase()
    const { rows } = await pool.query(
    `insert into inventory_items (id, nama, kategori, stok, satuan, kapasitas, harga_satuan, terakhir_restock, keterangan)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     on conflict (id) do update set
       nama = excluded.nama,
       kategori = excluded.kategori,
       stok = excluded.stok,
       satuan = excluded.satuan,
       kapasitas = excluded.kapasitas,
       harga_satuan = excluded.harga_satuan,
       terakhir_restock = excluded.terakhir_restock,
       keterangan = excluded.keterangan,
       updated_at = now()
     returning id, nama, kategori, stok, satuan, kapasitas, harga_satuan, terakhir_restock::text as terakhir_restock, keterangan`,
    [item.id, item.nama, item.kategori, item.stok, item.satuan, item.kapasitas, item.hargaSatuan, item.terakhirRestok, item.keterangan ?? ""],
  )

  return mapRow(rows[0])
  } catch (error) {
    forceSqliteMode()
    console.warn("PostgreSQL unavailable for inventory upsert, falling back to SQLite:", error)
    const db = prepareSqliteInventoryDatabase()
    db.prepare(
      `insert into inventory_items (id, nama, kategori, stok, satuan, kapasitas, harga_satuan, terakhir_restock, keterangan)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?)
       on conflict(id) do update set
         nama = excluded.nama,
         kategori = excluded.kategori,
         stok = excluded.stok,
         satuan = excluded.satuan,
         kapasitas = excluded.kapasitas,
         harga_satuan = excluded.harga_satuan,
         terakhir_restock = excluded.terakhir_restock,
         keterangan = excluded.keterangan,
         updated_at = datetime('now')`
    ).run(item.id, item.nama, item.kategori, item.stok, item.satuan, item.kapasitas, item.hargaSatuan, item.terakhirRestok, item.keterangan ?? "")

    const row = db.prepare(`
      select id, nama, kategori, stok, satuan, kapasitas, harga_satuan, terakhir_restock, keterangan
      from inventory_items
      where id = ?
    `).get(item.id) as {
      id: string
      nama: string
      kategori: InventoryItem["kategori"]
      stok: number
      satuan: string
      kapasitas: number
      harga_satuan: number
      terakhir_restock: string
      keterangan: string
    }

    return mapRow(row)
  }
}

export async function deleteInventoryItem(id: string) {
  if (getDbMode() === "sqlite") {
    const db = prepareSqliteInventoryDatabase()
    const result = db.prepare("delete from inventory_items where id = ?").run(id)
    if (result.changes === 0) {
      throw new Error("Item tidak ditemukan.")
    }
    return
  }

  try {
    const pool = await prepareInventoryDatabase()
    await pool.query("delete from inventory_items where id = $1", [id])
  } catch (error) {
    forceSqliteMode()
    console.warn("PostgreSQL unavailable for inventory delete, falling back to SQLite:", error)
    const db = prepareSqliteInventoryDatabase()
    const result = db.prepare("delete from inventory_items where id = ?").run(id)
    if (result.changes === 0) {
      throw new Error("Item tidak ditemukan.")
    }
  }
}
