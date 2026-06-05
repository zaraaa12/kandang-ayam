"use server"

import { revalidatePath } from "next/cache"
import { deleteInventoryItem, upsertInventoryItem } from "@/lib/inventory-db"
import type { InventoryItem, KategoriItem } from "@/data/inventory"

const KATEGORI = new Set(["Konstruksi", "Utilitas", "SDM"])

function toInventoryItem(item: InventoryItem): InventoryItem {
  if (!item.id.trim()) {
    throw new Error("ID item wajib diisi.")
  }

  if (!item.nama.trim()) {
    throw new Error("Nama item wajib diisi.")
  }

  if (!KATEGORI.has(item.kategori)) {
    throw new Error("Kategori inventory tidak valid.")
  }

  if (!Number.isInteger(item.stok) || item.stok < 0) {
    throw new Error("Stok harus berupa bilangan bulat 0 atau lebih.")
  }

  if (!item.satuan.trim()) {
    throw new Error("Satuan wajib diisi.")
  }

  if (!Number.isInteger(item.kapasitas) || item.kapasitas < 1) {
    throw new Error("Kapasitas harus berupa bilangan bulat minimal 1.")
  }

  if (!Number.isFinite(item.hargaSatuan) || item.hargaSatuan < 0) {
    throw new Error("Harga satuan harus berupa angka 0 atau lebih.")
  }

  if (!item.terakhirRestok || Number.isNaN(Date.parse(item.terakhirRestok))) {
    throw new Error("Tanggal restok tidak valid.")
  }

  return {
    id: item.id.trim(),
    nama: item.nama.trim(),
    kategori: item.kategori as KategoriItem,
    stok: Number(item.stok),
    satuan: item.satuan.trim(),
    kapasitas: Number(item.kapasitas),
    hargaSatuan: Math.round(Number(item.hargaSatuan)),
    terakhirRestok: item.terakhirRestok,
    keterangan: item.keterangan?.trim() ?? "",
  }
}

export async function saveInventoryItemAction(item: InventoryItem) {
  const savedItem = await upsertInventoryItem(toInventoryItem(item))

  revalidatePath("/inventory")
  revalidatePath("/dashboard")

  return savedItem
}

export async function deleteInventoryItemAction(id: string) {
  if (!id.trim()) {
    throw new Error("ID item tidak valid.")
  }

  await deleteInventoryItem(id)
  revalidatePath("/inventory")
  revalidatePath("/dashboard")
}
