"use server"

import { revalidatePath } from "next/cache"
import {
  createFinanceTransaction,
  deleteFinanceTransaction,
  updateFinanceTransaction,
  type FinanceTransactionInput,
  type FinanceTxType,
} from "@/lib/finance-db"
import {
  createInvestmentTransaction,
  deleteInvestmentTransaction,
  updateInvestmentTransaction,
} from "@/lib/investment-db"

function toFinanceInput(form: {
  type: FinanceTxType
  date: string
  category: string
  buyer: string
  vol: number
  jumlah: number
  notes: string
}): FinanceTransactionInput {
  const validTypes: FinanceTxType[] = ["income", "expense", "investor_income", "warist"]
  if (!validTypes.includes(form.type)) {
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
    ? form.type === "investor_income"
      ? await updateInvestmentTransaction(id, input)
      : await updateFinanceTransaction(id, input)
    : form.type === "investor_income"
      ? await createInvestmentTransaction(input)
      : await createFinanceTransaction(input)

  revalidatePath("/finance")
  revalidatePath("/dashboard")

  return transaction
}

export async function deleteFinanceTransactionAction(id: string) {
  if (!id) {
    throw new Error("ID transaksi tidak valid.")
  }

  try {
    await deleteFinanceTransaction(id)
  } catch (error) {
    if (error instanceof Error && error.message === "Transaksi finance tidak ditemukan.") {
      await deleteInvestmentTransaction(id)
    } else {
      throw error
    }
  }

  revalidatePath("/finance")
  revalidatePath("/dashboard")
}
