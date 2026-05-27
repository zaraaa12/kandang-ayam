"use server"

import { revalidatePath } from "next/cache"
import {
  createProduksiRecord,
  deleteProduksiRecord,
  updateProduksiRecord,
  type ProduksiInput,
} from "@/lib/produksi-db"

function toProduksiInput(form: {
  date: string
  act: string
  vol: string
  ayam: string
}): ProduksiInput {
  const input = {
    date: form.date,
    act: Number(form.act),
    vol: Number(form.vol),
    ayam: Number(form.ayam),
  }

  if (!input.date || Number.isNaN(Date.parse(input.date))) {
    throw new Error("Tanggal produksi tidak valid.")
  }

  if (!Number.isFinite(input.act) || input.act < 0) {
    throw new Error("Jumlah telur harus berupa angka 0 atau lebih.")
  }

  if (!Number.isFinite(input.vol) || input.vol < 0) {
    throw new Error("Volume harus berupa angka 0 atau lebih.")
  }

  if (!Number.isInteger(input.ayam) || input.ayam < 1) {
    throw new Error("Jumlah ayam harus berupa bilangan bulat minimal 1.")
  }

  return input
}

export async function saveProduksiAction(
  id: string | null,
  form: { date: string; act: string; vol: string; ayam: string },
) {
  const input = toProduksiInput(form)
  const record = id
    ? await updateProduksiRecord(id, input)
    : await createProduksiRecord(input)

  revalidatePath("/produksi")
  revalidatePath("/dashboard")

  return record
}

export async function deleteProduksiAction(id: string) {
  if (!id) {
    throw new Error("ID record produksi tidak valid.")
  }

  await deleteProduksiRecord(id)
  revalidatePath("/produksi")
  revalidatePath("/dashboard")
}
