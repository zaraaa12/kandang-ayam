"use server"

import { revalidatePath } from "next/cache"
import {
  createFinanceTransaction,
  deleteFinanceTransaction,
  updateFinanceTransaction,
  type FinanceTransactionInput,
  type FinanceTxType,
} from "@/lib/finance-db"

function toFinanceInput(form: {
  type: FinanceTxType
  date: string
  category: string
  buyer: string
  vol: number
  jumlah: number
  notes: string
}): FinanceTransactionInput {
  if (form.type !== "sale" && form.type !== "expense") {
    throw new Error("Tipe transaksi tidak valid.")
  }

  if (!form.date || Number.isNaN(Date.parse(form.date))) {
    throw new Error("Tanggal transaksi tidak valid.")
  }

  if (!form.category.trim()) {
    throw new Error("Kategori wajib diisi.")
  }

  if (!Number.isFinite(form.vol) || form.vol < 0) {
    throw new Error("Volume harus berupa angka 0 atau lebih.")
  }

  if (!Number.isFinite(form.jumlah) || form.jumlah < 0) {
    throw new Error("Jumlah transaksi harus berupa angka 0 atau lebih.")
  }

  return {
    type: form.type,
    date: form.date,
    category: form.category.trim(),
    buyer: form.buyer.trim(),
    vol: Number(form.vol),
    jumlah: Math.round(Number(form.jumlah)),
    notes: form.notes.trim(),
  }
}

export async function saveFinanceTransactionAction(
  id: string | null,
  form: {
    type: FinanceTxType
    date: string
    category: string
    buyer: string
    vol: number
    jumlah: number
    notes: string
  },
) {
  const input = toFinanceInput(form)
  const transaction = id
    ? await updateFinanceTransaction(id, input)
    : await createFinanceTransaction(input)

  revalidatePath("/finance")
  revalidatePath("/dashboard")

  return transaction
}

export async function deleteFinanceTransactionAction(id: string) {
  if (!id) {
    throw new Error("ID transaksi tidak valid.")
  }

  await deleteFinanceTransaction(id)
  revalidatePath("/finance")
  revalidatePath("/dashboard")
}
