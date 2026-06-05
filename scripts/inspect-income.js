const fs = require('fs')
const path = require('path')
const xlsx = require('xlsx')

const filePath = path.join(process.cwd(), 'income.xlsx')
const buf = fs.readFileSync(filePath)
const wb = xlsx.read(buf, { type: 'buffer', cellDates: true })
console.log('sheets', wb.SheetNames)
const sheet = wb.Sheets[wb.SheetNames[0]]
const rows = xlsx.utils.sheet_to_json(sheet, { defval: null, raw: false, blankrows: false })
console.log('first 5 rows', rows.slice(0, 5))
console.log('keys', Object.keys(rows[0] || {}))
console.log('total rows', rows.length)
