"use server"

import { revalidatePath } from "next/cache"
import {
  createLivestockBatch,
  deleteLivestockBatch,
  updateLivestockBatch,
  type LivestockBatchInput,
} from "@/lib/livestock-db"
import type { Batch } from "@/data/livestock"

function toBatchInput(form: {
  masuk: string
  jumlah: number
  tahun: number
  bulan: number
  hari: number
  status: Batch["status"]
}): LivestockBatchInput {
  if (!form.masuk || Number.isNaN(Date.parse(form.masuk))) {
    throw new Error("Tanggal masuk batch tidak valid.")
  }

  if (!Number.isInteger(form.jumlah) || form.jumlah < 1) {
    throw new Error("Jumlah ayam harus berupa bilangan bulat minimal 1.")
  }

  if (![form.tahun, form.bulan, form.hari].every(value => Number.isInteger(value) && value >= 0)) {
    throw new Error("Usia batch tidak valid.")
  }

  if (!["active", "partial", "closed"].includes(form.status)) {
    throw new Error("Status batch tidak valid.")
  }

  return {
    masuk: form.masuk,
    jumlah: Number(form.jumlah),
    tahun: Number(form.tahun),
    bulan: Number(form.bulan),
    hari: Number(form.hari),
    status: form.status,
  }
}

export async function saveLivestockBatchAction(
  id: string | null,
  form: { masuk: string; jumlah: number; tahun: number; bulan: number; hari: number; status: Batch["status"] },
) {
  const input = toBatchInput(form)
  const batch = id
    ? await updateLivestockBatch(id, input)
    : await createLivestockBatch(input)

  revalidatePath("/livestock")
  revalidatePath("/dashboard")

  return batch
}

export async function deleteLivestockBatchAction(id: string) {
  if (!id) {
    throw new Error("ID batch tidak valid.")
  }

  await deleteLivestockBatch(id)
  revalidatePath("/livestock")
  revalidatePath("/dashboard")
}

// Note: Vaccination actions have been removed.
// Vaccinations are now derived from finance_expense table.
// To add/edit/delete vaccinations, use the Finance page (Pengeluaran tab)
// with categories containing "vaksin" (e.g., "Vaksin ND Lasota", "Vaksin & Vitamin").