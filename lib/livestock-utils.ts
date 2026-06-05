import { stokTelurBulanan, pertumbuhanMingguan } from "@/data/livestock"
import type { StokTelurBulan } from "@/data/livestock"

export type { StokTelurBulan }
export type PertumbuhanMingguanRecord = typeof pertumbuhanMingguan[number]

export function deriveDynamicStokTelurBulanan(
  baseData: StokTelurBulan[] = stokTelurBulanan,
  factor = 1
): StokTelurBulan[] {
  try {
    return baseData.map(d => ({
      ...d,
      stokKg: +(Number(d.stokKg || 0) * factor).toFixed(1),
      terjualKg: +(Number(d.terjualKg || 0) * factor).toFixed(1),
      sisaKg: +(Number(d.sisaKg || 0) * factor).toFixed(1),
      sisaButir: Math.round((d.sisaButir || 0) * factor),
      transaksi: Math.max(0, Math.round((d.transaksi || 0) * factor)),
    }))
  } catch (error) {
    return baseData
  }
}

export function deriveDynamicPertumbuhanMingguan(
  baseData: PertumbuhanMingguanRecord[] = pertumbuhanMingguan,
  factor = 1
): PertumbuhanMingguanRecord[] {
  try {
    return baseData.map(d => ({
      ...d,
      mortalitas: Math.round((Number(d.mortalitas || 0) * factor) * 10) / 10,
    }))
  } catch (error) {
    return baseData
  }
}
