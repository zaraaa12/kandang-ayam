import * as fs from "fs"
import * as path from "path"
import * as xlsx from "xlsx"

export type SheetFinanceTx = {
  id: string
  no: string
  type: "expense"

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
  // Indonesian format: dot = thousands sep, comma = decimal sep
  let s = String(value).replace(/Rp/i, "").trim()
  s = s.replace(/\./g, "").replace(/,/g, ".")
  s = s.replace(/[^0-9.\-]/g, "")
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
      const no = String(getCellValue(row, ["NO", "No", "No.", "NO.", "No"]) || "").trim()
      const tanggal = getCellValue(row, ["Tanggal", "TANGGAL", "tanggal"]) || null
      const namaBarang = getCellValue(row, ["NAMA BARANG", "Nama Barang", "nama barang"]) || null
      const satuan = getCellValue(row, ["SATUAN", "Satuan", "satuan"]) || null
      const qty = getCellValue(row, ["QTY", "Qty", "qty"]) || null
      const harga = getCellValue(row, ["HARGA", "Harga", "harga"]) || null
      const subtotal = getCellValue(row, ["SUBTOTAL", "Subtotal", "subtotal"]) || null

      const date = parseDate(tanggal)
      if (!no || !date) continue

      const vol = parseNumber(qty)
      const hargaSatuan = parseNumber(harga)
      const jumlah = parseNumber(subtotal)

      if (vol <= 0 && jumlah <= 0) continue

      const itemName = String(namaBarang || "").trim()
      const unit = String(satuan || "").trim()
      const category = itemName || "Pengeluaran"

      const tx: SheetFinanceTx = {
        id: `sheet-expense-${String(i + 1).padStart(3, "0")}`,
        no: `EX-SHEET-${String(i + 1).padStart(3, "0")}`,
        type: "expense" as const,
        date,
        category,
        buyer: unit,
        stock: 0,
        vol,
        sisa: 0,
        harga: hargaSatuan || (vol > 0 ? Math.round(jumlah / vol) : 0),
        jumlah,
        notes: "expense.xlsx",
      }

      result.push(tx)
    }

    return result
  } catch (error) {
    console.warn("expense-sheet parse error:", error)
    return []
  }
}
