"use server"

import { revalidatePath } from "next/cache"
import {
  createLivestockBatch,
  createLivestockVaccination,
  deleteLivestockBatch,
  deleteLivestockVaccination,
  updateLivestockBatch,
  updateLivestockVaccination,
  type LivestockBatchInput,
  type LivestockVaccinationInput,
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

function toVaccinationInput(form: {
  tanggal: string
  nama: string
  qty: number
  satuan: string
  harga?: number
  subtotal: number
  batch: string
}): LivestockVaccinationInput {
  if (!form.tanggal || Number.isNaN(Date.parse(form.tanggal))) {
    throw new Error("Tanggal vaksinasi tidak valid.")
  }

  if (!form.nama.trim()) {
    throw new Error("Nama vaksin wajib diisi.")
  }

  if (!Number.isInteger(form.qty) || form.qty < 1) {
    throw new Error("Qty vaksin harus berupa bilangan bulat minimal 1.")
  }

  if (!form.satuan.trim()) {
    throw new Error("Satuan vaksin wajib diisi.")
  }

  const harga = Number(form.harga ?? 0)
  const subtotal = Number(form.subtotal)
  if (!Number.isFinite(harga) || harga < 0 || !Number.isFinite(subtotal) || subtotal < 0) {
    throw new Error("Harga atau subtotal vaksin tidak valid.")
  }

  if (!form.batch.trim() || form.batch === "—") {
    throw new Error("Pilih minimal satu batch.")
  }

  return {
    tanggal: form.tanggal,
    nama: form.nama.trim(),
    qty: Number(form.qty),
    satuan: form.satuan.trim(),
    harga: Math.round(harga),
    subtotal: Math.round(subtotal),
    batch: form.batch.trim(),
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

export async function saveLivestockVaccinationAction(
  no: number | null,
  form: {
    tanggal: string
    nama: string
    qty: number
    satuan: string
    harga?: number
    subtotal: number
    batch: string
  },
) {
  const input = toVaccinationInput(form)
  const vaccination = no
    ? await updateLivestockVaccination(no, input)
    : await createLivestockVaccination(input)

  revalidatePath("/livestock")

  return vaccination
}

export async function deleteLivestockVaccinationAction(no: number) {
  if (!Number.isInteger(no) || no < 1) {
    throw new Error("Nomor record vaksinasi tidak valid.")
  }

  await deleteLivestockVaccination(no)
  revalidatePath("/livestock")
}
