import fs from "fs"
import path from "path"
import { read, utils } from "xlsx"
import type { FinanceTransaction } from "./finance-db"

const INCOME_XLSX_PATH = path.join(process.cwd(), "income.xlsx")

const parseNumber = (value: unknown): number => {
  if (value == null) return 0
  if (typeof value === "number") return value
  if (typeof value === "string") {
    // Indonesian format: dot = thousands sep, comma = decimal sep
    // e.g. "Rp25.000" = 25000, "Rp1.500.000" = 1500000
    let s = value.replace(/Rp/i, "").trim()
    // Remove dots (thousands separators) then replace comma with dot (decimal)
    s = s.replace(/\./g, "").replace(/,/g, ".")
    // Remove any remaining non-numeric chars except dot and minus
    s = s.replace(/[^0-9.\-]/g, "")
    const n = Number(s)
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

const parseDate = (value: unknown): string | null => {
  if (value == null) return null
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : formatDate(value)
  }
  const s = String(value).trim()
  if (!s) return null

  // dd/mm/yyyy or dd/mm/yy
  const slashMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (slashMatch) {
    let [, day, month, year] = slashMatch
    if (year.length === 2) {
      year = Number(year) < 50 ? `20${year}` : `19${year}`
    }
    const dateObj = new Date(Number(year), Number(month) - 1, Number(day))
    if (!Number.isNaN(dateObj.getTime()) && dateObj.getFullYear() === Number(year) && dateObj.getMonth() === Number(month) - 1 && dateObj.getDate() === Number(day)) {
      return formatDate(dateObj)
    }
  }

  // yyyy-mm-dd
  const dashMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (dashMatch) {
    const [, y, m, d] = dashMatch
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`
  }

  const dateObj = new Date(s)
  return !Number.isNaN(dateObj.getTime()) ? formatDate(dateObj) : null
}

function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

const getCellValue = (row: Record<string, unknown>, keys: string[]) => {
  for (const k of keys) {
    if (k in row && row[k] != null) return row[k]
  }
  return null
}

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

    const result: FinanceTransaction[] = []
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const no = String(getCellValue(row, ["NO", "No", "No.", "NO."]) || "").trim()
      const tanggal = getCellValue(row, ["TANGGAL", "Tanggal", "tanggal"]) || null
      const stockTelur = getCellValue(row, ["STOCK TELUR(KG)", "STOCK TELUR", "Stock Telur", "STOK TELUR"]) || null
      const terjual = getCellValue(row, ["TERJUAL(KG)", "TERJUAL", "Terjual"]) || null
      const sisaTelur = getCellValue(row, ["SISA TELUR", "SISA TELUR(KG)", "Sisa Telur"]) || null
      const harga = getCellValue(row, ["HARGA", "Harga"]) || null
      const total = getCellValue(row, ["TOTAL", "Total"]) || null

      const date = parseDate(tanggal)
      if (!no || !date) continue

      const stock = parseNumber(stockTelur)
      const vol = parseNumber(terjual)
      const sisa = parseNumber(sisaTelur)
      const hargaSatuan = parseNumber(harga)
      const jumlah = parseNumber(total)

      if (vol <= 0 && jumlah <= 0) continue
      // Skip summary/total rows
      if (String(getCellValue(row, ["HARGA", "Harga"]) || "").toUpperCase() === "TOTAL") continue

      const tx: FinanceTransaction = {
        id: `sheet-income-${String(i + 1).padStart(3, "0")}`,
        no: `TX-SHEET-${String(i + 1).padStart(3, "0")}`,
        type: "income" as const,
        date,
        category: "Penjualan Telur",
        buyer: String(getCellValue(row, ["BUYER", "Pembeli", "buyer"]) || ""),
        stock,
        vol,
        sisa,
        harga: hargaSatuan || (vol > 0 ? Math.round(jumlah / vol) : 0),
        jumlah,
        notes: "income.xlsx",
      }

      result.push(tx)
    }

    return result
  } catch (error) {
    console.warn("Unable to load income.xlsx for finance income table:", error)
    return []
  }
}

