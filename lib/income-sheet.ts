import fs from "fs"
import path from "path"
import { read, utils } from "xlsx"
import type { FinanceTransaction } from "./finance-db"

const INCOME_XLSX_PATH = path.join(process.cwd(), "income.xlsx")

export async function getIncomeSheetTransactions(): Promise<FinanceTransaction[]> {
  try {
    if (!fs.existsSync(INCOME_XLSX_PATH)) {
      return []
    }

    const fileBuffer = fs.readFileSync(INCOME_XLSX_PATH)
    const workbook = read(fileBuffer, { type: "buffer", cellDates: true })
    const sheetName = workbook.SheetNames[0]
    if (!sheetName) return []

    const sheet = workbook.Sheets[sheetName]
    const rows = utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: null,
      raw: false,
      blankrows: false,
    })

    function parseNumber(value: unknown): number {
      if (value == null) return 0
      if (typeof value === "number") return value
      if (typeof value === "string") {
        const normalized = value.replace(/[^0-9,.-]/g, "").replace(/,/g, "")
        const n = Number(normalized)
        return Number.isFinite(n) ? n : 0
      }
      return 0
    }

    function parseDate(value: unknown): string | null {
      const formatDate = (date: Date) => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, "0")
        const day = String(date.getDate()).padStart(2, "0")
        return `${year}-${month}-${day}`
      }

      if (value == null) return null
      if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : formatDate(value)
      }
      if (typeof value !== "string") return null

      const normalized = value.trim()
      const slashMatch = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
      if (slashMatch) {
        let [, day, month, year] = slashMatch
        if (year.length === 2) {
          const twoDigit = Number(year)
          year = twoDigit < 50 ? `20${year}` : `19${year}`
        }
        const dateObj = new Date(Number(year), Number(month) - 1, Number(day))
        if (!Number.isNaN(dateObj.getTime()) && dateObj.getFullYear() === Number(year) && dateObj.getMonth() === Number(month) - 1 && dateObj.getDate() === Number(day)) {
          return formatDate(dateObj)
        }
      }

      const dateObj = new Date(normalized)
      return !Number.isNaN(dateObj.getTime()) ? formatDate(dateObj) : null
    }

    return rows
      .map((row, index) => {
        const item = String(row["NAMA BARANG"] ?? row["Nama Barang"] ?? row["ITEM"] ?? "").trim()
        const satuan = String(row["SATUAN"] ?? row["Satuan"] ?? "").trim()
        const qty = parseNumber(row["QTY"] ?? row["Qty"] ?? row["qty"])
        const harga = parseNumber(row["HARGA"] ?? row["Harga"] ?? row["harga"])
        const subtotal = parseNumber(row["SUBTOTAL"] ?? row["Subtotal"] ?? row["subtotal"])
        const date = parseDate(row["Tanggal"] ?? row["TANGGAL"] ?? row["Date"] ?? row["date"])

        if (!date) return null
        if (!item && qty <= 0 && subtotal <= 0) return null

        const displayName = item ? `${item}${satuan ? ` (${satuan})` : ""}` : "Pengeluaran Excel"

        return {
          id: `sheet-income-${index + 1}`,
          no: `EX-SHEET-${String(index + 1).padStart(3, "0")}`,
          type: "expense" as const,
          date,
          category: displayName,
          buyer: "",
          vol: Number.isFinite(qty) ? qty : 0,
          harga: Number.isFinite(harga) ? harga : 0,
          jumlah: Number.isFinite(subtotal) ? subtotal : 0,
          notes: "income.xlsx",
        }
      })
      .filter((tx): tx is any => tx !== null) as FinanceTransaction[]
  } catch (error) {
    console.warn("Unable to load income.xlsx for finance expense table:", error)
    return []
  }
}

