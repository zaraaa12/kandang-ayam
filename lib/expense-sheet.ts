import * as fs from "fs"
import * as path from "path"
import * as xlsx from "xlsx"

export type SheetFinanceTx = {
  id: string
  no: string
  type: "income"
  date: string
  category: string
  buyer: string
  stock: number
  vol: number
  sisa: number
  harga: number
  jumlah: number
  notes: string
}

const parseNumber = (value: unknown): number => {
  if (value == null) return 0
  if (typeof value === "number") return value
  const s = String(value).replace(/[^0-9,.-]/g, "").replace(/,/g, "")
  const n = Number(s)
  return Number.isFinite(n) ? n : 0
}

const parseDate = (value: unknown): string | null => {
  if (!value) return null
  if (value instanceof Date && !isNaN(value.getTime())) {
    const y = value.getFullYear()
    const m = String(value.getMonth() + 1).padStart(2, "0")
    const d = String(value.getDate()).padStart(2, "0")
    return `${y}-${m}-${d}`
  }
  const s = String(value).trim()
  // expect format dd/mm/yyyy or yyyy-mm-dd
  const parts = s.split(/[-\/]/)
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      // yyyy-mm-dd
      return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`
    }
    // assume dd/mm/yyyy
    const dd = parts[0].padStart(2, "0")
    const mm = parts[1].padStart(2, "0")
    const yyyy = parts[2].length === 2
      ? `${Number(parts[2]) < 50 ? "20" : "19"}${parts[2]}`
      : parts[2]
    return `${yyyy}-${mm}-${dd}`
  }
  // fallback: try Date parse
  const d = new Date(s)
  if (!isNaN(d.getTime())) return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
  return null
}

const getCellValue = (row: Record<string, unknown>, keys: string[]) => {
  for (const k of keys) {
    if (k in row && row[k] != null) return row[k]
  }
  return null
}

export function getExpenseSheetTransactions(): SheetFinanceTx[] {
  try {
    const file = path.join(process.cwd(), "expense.xlsx")
    if (!fs.existsSync(file)) return []
    const buf = fs.readFileSync(file)
    const wb = xlsx.read(buf, { type: "buffer", cellDates: true })
    const sheet = wb.Sheets[wb.SheetNames[0]]
    const rows = xlsx.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null, raw: false, blankrows: false })

    const result: SheetFinanceTx[] = []
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const no = String(getCellValue(row, ["NO", "No", "No.", "NO.", "No"] ) || "").trim()
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

      const tx: SheetFinanceTx = {
        id: `sheet-egg-sale-${String(i + 1).padStart(3, "0")}`,
        no: `TX-SHEET-${String(i + 1).padStart(3, "0")}`,
        type: "income",
        date: date,
        category: "Penjualan Telur",
        buyer: String(getCellValue(row, ["BUYER", "Pembeli"]) || ""),
        stock,
        vol,
        sisa,
        harga: hargaSatuan || (vol > 0 ? Math.round(jumlah / vol) : 0),
        jumlah,
        notes: String(getCellValue(row, ["NOTES", "KETERANGAN", "Notes"]) || "expense.xlsx"),
      }

      result.push(tx)
    }

    return result
  } catch (error) {
    // on error, return empty array so seed won't fail
    console.warn("expense-sheet parse error:", error)
    return []
  }
}
