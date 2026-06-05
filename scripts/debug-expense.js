const { read, utils } = require('xlsx');
const fs = require('fs');
const path = require('path');
const filePath = path.join(process.cwd(), 'expense.xlsx');
const buf = fs.readFileSync(filePath);
const wb = read(buf, { type: 'buffer', cellDates: true });
const sheetName = wb.SheetNames[0];
const sheet = wb.Sheets[sheetName];
const rows = utils.sheet_to_json(sheet, { defval: null, raw: false, blankrows: false });
console.log('sheet', sheetName, 'rows', rows.length);
const parse = (v) => {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  const n = Number(String(v).replace(/[^0-9-]/g, ''));
  return Number.isFinite(n) ? n : 0;
};
let total = 0;
let totalRows = 0;
let totalNonzero = 0;
let terjualTotal = 0;
let terjualRows = 0;
const sample = [];
const COL_TOTAL = 'TOTAL';
const COL_TERJUAL = 'TERJUAL(KG)';
for (let i = 0; i < rows.length; i++) {
  const r = rows[i];
  const t = parse(r[COL_TOTAL]);
  total += t;
  if (r[COL_TOTAL] != null) totalRows++;
  if (t !== 0) totalNonzero++;
  const terjual = parse(r[COL_TERJUAL]);
  terjualTotal += terjual;
  if (terjual !== 0) terjualRows++;
  if (i < 30) sample.push({ i, NO: r['NO'], TANGGAL: r['TANGGAL'], TERJUAL: r[COL_TERJUAL], TOTAL: r[COL_TOTAL] });
}
console.log({ total, totalRows, totalNonzero, terjualTotal, terjualRows });
const totals = rows
  .map((r, i) => ({ i, t: parse(r[COL_TOTAL]), d: r['TANGGAL'], no: r['NO'] }))
  .sort((a, b) => b.t - a.t)
  .slice(0, 20);
console.log('top totals', totals);
console.log('sample', sample);
