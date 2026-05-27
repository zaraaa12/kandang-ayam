"use client"

import { logout } from "@/lib/auth"
import { useState, useEffect, useCallback, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { BarChart, Bar, Line, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts"
import { deleteFinanceTransactionAction, saveFinanceTransactionAction } from "@/app/finance/actions"
import { financeSummary, penjualanBulanan, biayaOperasional, dataBulananKeuangan, detailOpsPerBulan, rupiah } from "@/data/finance"

// ─── useMounted — prevents SSR↔client hydration mismatch ────────────────────
function useMounted() {
  const [mounted, setMounted] = useState(false)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), [])
  return mounted
}

// ─── Types ───────────────────────────────────────────────────────────────────
type TxType = "sale" | "expense"
type ModalMode = "add" | "edit" | null

interface Tx {
  id: string
  no: string
  type: TxType
  date: string
  category: string
  buyer: string
  vol: number
  jumlah: number
  notes: string
}

// ─── Constants ────────────────────────────────────────────────────────────────
const NAV = [
  { label: "Dashboard",  icon: "dashboard",   href: "/dashboard" },
  { label: "Production", icon: "egg",          href: "/produksi" },
  { label: "Finance",    icon: "payments",     href: "/finance" },
  { label: "Livestock",  icon: "pets",         href: "/livestock" },
  { label: "Inventory",  icon: "inventory_2",  href: "/inventory" },
]
const SALE_CATS = ["Penjualan Telur","Penjualan Warist","Penjualan Ayam Afkir","Penjualan Pupuk","Pendapatan Lainnya"]
const EXP_CATS  = ["Pakan Ayam","Vaksin & Vitamin","Listrik & Air","Peralatan Kebersihan","Makan & Rokok","Gaji Karyawan","Pemeliharaan Kandang","Lain-lain"]

const today = () => new Date().toISOString().split("T")[0]

// ─── Seed data ────────────────────────────────────────────────────────────────
const SEED: Tx[] = [
  // ★ Penjualan Warist — dana terpisah, 42 ekor ayam afkir
  { id:"w1", no:"TX-WARIST", type:"sale", date:"2025-12-01", category:"Penjualan Warist", buyer:"Warist", vol:42, jumlah:1_600_000, notes:"Penjualan 42 ekor ayam afkir. Dana terpisah — tidak masuk kas utama." },
  { id:"a1", no:"TX-210", type:"sale", date:"2026-01-16", category:"Penjualan Telur", buyer:"Pembeli Lokal",  vol:11,  jumlah:286_000,   notes:"" },
  { id:"a2", no:"TX-209", type:"sale", date:"2026-01-15", category:"Penjualan Telur", buyer:"Pasar Mandiri", vol:35,  jumlah:910_000,   notes:"" },
  { id:"a3", no:"TX-208", type:"sale", date:"2026-01-14", category:"Penjualan Telur", buyer:"AgroMart",      vol:38,  jumlah:988_000,   notes:"" },
  { id:"a4", no:"TX-207", type:"sale", date:"2026-01-13", category:"Penjualan Telur", buyer:"Pembeli Lokal", vol:3,   jumlah:78_000,    notes:"" },
  { id:"a5", no:"TX-206", type:"sale", date:"2026-01-12", category:"Penjualan Telur", buyer:"Distributor A", vol:29,  jumlah:754_000,   notes:"" },
  { id:"a6", no:"TX-205", type:"sale", date:"2026-01-11", category:"Penjualan Telur", buyer:"FreshEgg Co.",  vol:43,  jumlah:1_118_000, notes:"" },
  { id:"b1", no:"EX-001", type:"expense", date:"2026-01-10", category:"Pakan Ayam",    buyer:"Supplier Pakan", vol:0, jumlah:3_650_000, notes:"21 karung @50kg" },
  { id:"b2", no:"EX-002", type:"expense", date:"2026-01-05", category:"Gaji Karyawan", buyer:"Warist",        vol:0, jumlah:3_000_000, notes:"Gaji Jan 2026" },
]

const seedMainSale = SEED
  .filter(t => t.type === "sale" && t.category !== "Penjualan Warist")
  .reduce((sum, t) => sum + t.jumlah, 0)
const seedExpense = SEED
  .filter(t => t.type === "expense")
  .reduce((sum, t) => sum + t.jumlah, 0)
const seedWarist = SEED
  .filter(t => t.category === "Penjualan Warist")
  .reduce((sum, t) => sum + t.jumlah, 0)

// ─── Input style ──────────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width:"100%", background:"#0e0e0e", border:"1px solid #3c4a42",
  borderRadius:8, padding:"12px 14px", color:"#e5e2e1",
  fontSize:14, outline:"none", fontFamily:"inherit", transition:"border-color 0.15s",
}
const labelStyle: React.CSSProperties = {
  fontSize:11, fontWeight:700, color:"#bbcabf",
  textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:8,
}

// ─── Gauge ────────────────────────────────────────────────────────────────────
function Gauge({ pct }: { pct: number }) {
  const r = 88, circ = 2 * Math.PI * r, fill = Math.min(pct / 100, 1) * circ
  return (
    <div style={{ position:"relative", width:192, height:192 }}>
      <svg width={192} height={192} style={{ transform:"rotate(-90deg)" }}>
        <circle cx={96} cy={96} r={r} fill="transparent" stroke="#353534" strokeWidth={12}/>
        <circle cx={96} cy={96} r={r} fill="transparent" stroke="#4edea3" strokeWidth={12}
          strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
          style={{ filter:"drop-shadow(0 0 8px rgba(78,222,163,0.45))", transition:"stroke-dasharray 0.8s ease" }}/>
      </svg>
      <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
        <span style={{ fontSize:28, fontWeight:700, color:"#e5e2e1", lineHeight:1 }}>{Math.round(pct)}%</span>
        <span style={{ fontSize:11, fontWeight:700, color:"#bbcabf", textTransform:"uppercase", letterSpacing:"0.05em", marginTop:4 }}>Target</span>
      </div>
    </div>
  )
}

// ─── Chart tooltip ────────────────────────────────────────────────────────────
interface DarkTipProps {
  active?: boolean
  payload?: Array<{ name?: string; value?: number; fill?: string }>
  label?: string
}

function DarkTip({ active, payload, label }: DarkTipProps) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:"#201f1f", border:"1px solid #3c4a42", borderRadius:8, padding:"10px 14px", fontSize:12 }}>
      <p style={{ color:"#bbcabf", marginBottom:6, fontWeight:600 }}>{label}</p>
      {payload.map((p: { name?: string; value?: number; fill?: string }, i: number) => (
        <div key={i} style={{ display:"flex", gap:8, alignItems:"center" }}>
          <div style={{ width:8, height:8, borderRadius:2, background:p.fill||"#4edea3" }}/>
          <span style={{ color:"#e5e2e1" }}>{p.name}: {rupiah(p.value ?? 0, true)}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Delete Confirm Dialog ────────────────────────────────────────────────────
function DeleteDialog({ tx, onConfirm, onCancel }: { tx: Tx; onConfirm:()=>void; onCancel:()=>void }) {
  return (
    <div style={{ position:"fixed", inset:0, zIndex:120, background:"rgba(0,0,0,0.8)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:"#2a2a2a", border:"1px solid #3c4a42", borderRadius:12, width:"100%", maxWidth:400, overflow:"hidden" }}>
        <div style={{ padding:"20px 24px", borderBottom:"1px solid #3c4a42", display:"flex", alignItems:"center", gap:12 }}>
          <span className="material-symbols-outlined" style={{ color:"#ffb4ab", fontSize:22 }}>warning</span>
          <h3 style={{ margin:0, fontSize:18, fontWeight:600, color:"#e5e2e1" }}>Hapus Transaksi</h3>
        </div>
        <div style={{ padding:"20px 24px" }}>
          <p style={{ color:"#bbcabf", fontSize:14, lineHeight:1.6, margin:0 }}>
            Apakah kamu yakin ingin menghapus transaksi <strong style={{ color:"#e5e2e1" }}>{tx.no}</strong> ({tx.buyer || tx.category}) senilai <strong style={{ color:"#ffb4ab" }}>{rupiah(tx.jumlah)}</strong>?
            <br/><span style={{ fontSize:12, color:"#86948a", marginTop:4, display:"block" }}>Tindakan ini tidak bisa dibatalkan.</span>
          </p>
        </div>
        <div style={{ padding:"16px 24px", borderTop:"1px solid #3c4a42", display:"flex", justifyContent:"flex-end", gap:12 }}>
          <button onClick={onCancel} style={{ padding:"10px 20px", background:"transparent", border:"1px solid #3c4a42", borderRadius:8, color:"#bbcabf", cursor:"pointer", fontSize:13, fontWeight:700 }}>
            Batal
          </button>
          <button onClick={onConfirm} style={{ padding:"10px 20px", background:"#93000a", border:"none", borderRadius:8, color:"#ffdad6", cursor:"pointer", fontSize:13, fontWeight:700, display:"flex", alignItems:"center", gap:6 }}>
            <span className="material-symbols-outlined" style={{ fontSize:16 }}>delete</span>
            Hapus
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Transaction Modal (Add / Edit) ──────────────────────────────────────────
function TxModal({
  mode, initial, onSave, onClose,
}: {
  mode: "add" | "edit"
  initial: Partial<Tx> & { type: TxType }
  onSave: (data: Omit<Tx,"id"|"no">) => void
  onClose: () => void
}) {
  const [form, setForm] = useState<Omit<Tx,"id"|"no">>({
    type:     initial.type     ?? "sale",
    date:     initial.date     ?? today(),
    category: initial.category ?? SALE_CATS[0],
    buyer:    initial.buyer    ?? "",
    vol:      initial.vol      ?? 0,
    jumlah:   initial.jumlah   ?? 0,
    notes:    initial.notes    ?? "",
  })

  const cats = form.type === "sale" ? SALE_CATS : EXP_CATS

  function setType(t: TxType) {
    setForm(f => ({ ...f, type: t, category: t === "sale" ? SALE_CATS[0] : EXP_CATS[0] }))
  }
  function set(k: keyof typeof form, v: string | number | boolean) {
    setForm(f => ({ ...f, [k]: v }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.jumlah) return
    onSave(form)
  }

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onClose])

  const isSale = form.type === "sale"

  return (
    <div
      style={{ position:"fixed", inset:0, zIndex:100, background:"rgba(0,0,0,0.82)", backdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background:"#2a2a2a", width:"100%", maxWidth:560, border:"1px solid #3c4a42", boxShadow:"0 24px 64px rgba(0,0,0,0.6)", borderRadius:8, overflow:"hidden", display:"flex", flexDirection:"column", maxHeight:"calc(100vh - 48px)" }}>

        {/* Header */}
        <header style={{ height:64, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 24px", borderBottom:"1px solid #3c4a42", background:"#353534", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <span className="material-symbols-outlined" style={{ color:"#4edea3", fontSize:22 }}>account_balance_wallet</span>
            <h2 style={{ margin:0, fontSize:22, fontWeight:600, color:"#e5e2e1", letterSpacing:"-0.01em" }}>
              {mode === "add" ? "Record New Transaction" : "Edit Transaction"}
            </h2>
          </div>
          <button onClick={onClose} style={{ background:"transparent", border:"none", color:"#bbcabf", cursor:"pointer", padding:8, borderRadius:"50%", lineHeight:0, transition:"all 0.15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#3a3939"; (e.currentTarget as HTMLButtonElement).style.color = "#e5e2e1" }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "#bbcabf" }}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ overflowY:"auto", flex:1 }}>
          <div style={{ padding:24, display:"flex", flexDirection:"column", gap:24 }}>

            {/* Sale / Expense toggle */}
            <div style={{ display:"flex", padding:4, background:"#0e0e0e", borderRadius:8, border:"1px solid #3c4a42" }}>
              {(["sale","expense"] as TxType[]).map(t => (
                <button
                  key={t} type="button" onClick={() => setType(t)}
                  style={{
                    flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                    padding:"10px 16px", borderRadius:6, border:"none", cursor:"pointer",
                    background: form.type === t ? "#10b981" : "transparent",
                    color: form.type === t ? "#00422b" : "#bbcabf",
                    fontWeight: form.type === t ? 700 : 400,
                    fontSize:11, letterSpacing:"0.05em", textTransform:"uppercase",
                    transition:"all 0.15s",
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize:18 }}>
                    {t === "sale" ? "trending_up" : "trending_down"}
                  </span>
                  {t === "sale" ? "Sale" : "Expense"}
                </button>
              ))}
            </div>

            {/* Date + Category */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
              <div>
                <label style={labelStyle}>Transaction Date</label>
                <input type="date" value={form.date} onChange={e => set("date", e.target.value)}
                  required style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = "#4edea3")}
                  onBlur={e => (e.target.style.borderColor = "#3c4a42")}
                />
              </div>
              <div style={{ position:"relative" }}>
                <label style={labelStyle}>Category</label>
                <div style={{ position:"relative" }}>
                  <select value={form.category} onChange={e => set("category", e.target.value)}
                    style={{ ...inputStyle, appearance:"none", paddingRight:40, cursor:"pointer" }}
                    onFocus={e => (e.target.style.borderColor = "#4edea3")}
                    onBlur={e => (e.target.style.borderColor = "#3c4a42")}
                  >
                    {cats.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <span className="material-symbols-outlined" style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", color:"#bbcabf", fontSize:20, pointerEvents:"none" }}>
                    expand_more
                  </span>
                </div>
              </div>
            </div>

            {/* Amount */}
            <div>
              <label style={labelStyle}>Amount (Rp)</label>
              <div style={{ position:"relative" }}>
                <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", color:"#bbcabf", fontSize:13, fontWeight:500 }}>Rp</span>
                <input
                  type="number" min={0} step={1000}
                  value={form.jumlah || ""}
                  onChange={e => set("jumlah", +e.target.value)}
                  required placeholder="0"
                  style={{ ...inputStyle, paddingLeft:40, textAlign:"right", fontVariantNumeric:"tabular-nums" }}
                  onFocus={e => (e.target.style.borderColor = "#4edea3")}
                  onBlur={e => (e.target.style.borderColor = "#3c4a42")}
                />
              </div>
              {form.jumlah > 0 && (
                <p style={{ fontSize:12, color:"#4edea3", marginTop:6 }}>
                  {rupiah(form.jumlah)}
                </p>
              )}
            </div>

            {/* Volume — only for sale */}
            {isSale && (
              <div>
                <label style={labelStyle}>Volume (kg)</label>
                <div style={{ position:"relative" }}>
                  <input
                    type="number" min={0} step={0.5}
                    value={form.vol || ""}
                    onChange={e => set("vol", +e.target.value)}
                    placeholder="0.0"
                    style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = "#4edea3")}
                    onBlur={e => (e.target.style.borderColor = "#3c4a42")}
                  />
                  <span style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)", color:"#bbcabf", fontSize:12 }}>kg</span>
                </div>
                {form.vol > 0 && form.jumlah > 0 && (
                  <p style={{ fontSize:12, color:"#bbcabf", marginTop:6 }}>
                    Harga/kg: {rupiah(Math.round(form.jumlah / form.vol), true)}
                  </p>
                )}
              </div>
            )}

            {/* Buyer / Vendor */}
            <div>
              <label style={labelStyle}>{isSale ? "Buyer Name" : "Vendor / Supplier"}</label>
              <div style={{ position:"relative" }}>
                <input
                  type="text"
                  value={form.buyer}
                  onChange={e => set("buyer", e.target.value)}
                  placeholder={isSale ? "Enter buyer name..." : "Enter vendor name..."}
                  style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = "#4edea3")}
                  onBlur={e => (e.target.style.borderColor = "#3c4a42")}
                />
                <span className="material-symbols-outlined" style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)", color:"#86948a", fontSize:20 }}>
                  person
                </span>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label style={labelStyle}>Notes</label>
              <textarea
                value={form.notes}
                onChange={e => set("notes", e.target.value)}
                placeholder="Add transaction details or batch references..."
                rows={3}
                style={{ ...inputStyle, resize:"none", lineHeight:1.6 }}
                onFocus={e => (e.target.style.borderColor = "#4edea3")}
                onBlur={e => (e.target.style.borderColor = "#3c4a42")}
              />
            </div>

            {/* Info box */}
            <div style={{ padding:16, background:"rgba(78,222,163,0.05)", border:"1px solid rgba(78,222,163,0.2)", borderRadius:8, display:"flex", alignItems:"flex-start", gap:12 }}>
              <span className="material-symbols-outlined" style={{ color:"#4edea3", fontSize:20, marginTop:1 }}>info</span>
              <p style={{ margin:0, fontSize:14, color:"#bbcabf", lineHeight:1.6 }}>
                Transaksi ini akan dicatat dalam{" "}
                <strong style={{ color:"#4edea3" }}>
                  {form.type === "sale" ? "Log Penjualan" : "Log Pengeluaran"}
                </strong>{" "}
                dan memperbarui ringkasan keuangan Kandang P-882.
              </p>
            </div>
          </div>

          {/* Footer */}
          <footer style={{ padding:"16px 24px", borderTop:"1px solid #3c4a42", background:"#353534", display:"flex", alignItems:"center", justifyContent:"flex-end", gap:12, flexShrink:0 }}>
            <button type="button" onClick={onClose}
              style={{ padding:"10px 24px", background:"transparent", border:"1px solid transparent", borderRadius:8, color:"#bbcabf", cursor:"pointer", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", transition:"all 0.15s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#3c4a42"; (e.currentTarget as HTMLButtonElement).style.color = "#e5e2e1" }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "#bbcabf" }}
            >
              Cancel
            </button>
            <button type="submit"
              style={{ padding:"10px 32px", background:"#4edea3", border:"none", borderRadius:8, color:"#003824", cursor:"pointer", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", display:"flex", alignItems:"center", gap:8, boxShadow:"0 4px 16px rgba(78,222,163,0.25)", transition:"filter 0.15s, transform 0.1s" }}
              onMouseEnter={e => (e.currentTarget.style.filter = "brightness(1.1)")}
              onMouseLeave={e => (e.currentTarget.style.filter = "brightness(1)")}
            >
              <span className="material-symbols-outlined" style={{ fontSize:18 }}>save</span>
              Save Transaction
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}

// ─── Warist Modal ────────────────────────────────────────────────────────────

interface WaristTx {
  id?: string
  no?: string
  date?: string
  buyer?: string
  vol?: number
  jumlah?: number
  notes?: string
}

function WaristModal({ mode, initial, onSave, onClose }: {
  mode: "add" | "edit"
  initial: WaristTx
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSave: (data: any) => void
  onClose: () => void
}) {
  const [form, setForm] = useState({
    type:   "sale" as const,
    date:   initial.date   ?? today(),
    buyer:  initial.buyer  ?? "Warist",
    vol:    initial.vol    ?? 0,
    jumlah: initial.jumlah ?? 0,
    notes:  initial.notes  ?? "",
  })
  const set = (k: keyof typeof form, v: string | number) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h)
  }, [onClose])

  const hargaPerEkor = form.vol > 0 && form.jumlah > 0
    ? Math.round(form.jumlah / form.vol).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")
    : null

  return (
    <div
      style={{ position:"fixed", inset:0, zIndex:100, background:"rgba(0,0,0,0.84)", backdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background:"#2a2a2a", width:"100%", maxWidth:520, border:"1px solid #3c4a42", borderRadius:8, overflow:"hidden", display:"flex", flexDirection:"column", maxHeight:"calc(100vh - 48px)", boxShadow:"0 24px 64px rgba(0,0,0,0.6)" }}>

        {/* Header */}
        <header style={{ height:64, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 24px", borderBottom:"1px solid #3c4a42", background:"#353534", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <span className="material-symbols-outlined" style={{ color:"#ffb95f", fontSize:22 }}>star</span>
            <div>
              <h2 style={{ margin:0, fontSize:18, fontWeight:600, color:"#e5e2e1", lineHeight:1 }}>
                {mode === "add" ? "Tambah Dana Terpisah" : `Edit ${initial.no ?? "TX-WARIST"}`}
              </h2>
              <p style={{ margin:"3px 0 0", fontSize:11, color:"#86948a" }}>Penjualan Warist · dana tidak masuk kas utama</p>
            </div>
          </div>
          <button onClick={onClose}
            style={{ background:"transparent", border:"none", color:"#bbcabf", cursor:"pointer", padding:8, borderRadius:"50%", lineHeight:0 }}
            onMouseEnter={e => (e.currentTarget.style.background = "#3a3939")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>

        {/* Body */}
        <form
          onSubmit={e => { e.preventDefault(); onSave(form) }}
          style={{ overflowY:"auto", flex:1, display:"flex", flexDirection:"column" }}
        >
          <div style={{ padding:24, display:"flex", flexDirection:"column", gap:20 }}>

            {/* Toggle indicator — visual only */}
            <div style={{ display:"flex", padding:4, background:"#0e0e0e", borderRadius:8, border:"1px solid rgba(255,185,95,0.25)" }}>
              <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:8, padding:"10px 16px", borderRadius:6, background:"rgba(255,185,95,0.12)", color:"#ffb95f", fontWeight:700, fontSize:11, letterSpacing:"0.05em", textTransform:"uppercase" }}>
                <span className="material-symbols-outlined" style={{ fontSize:18 }}>star</span>
                {mode === "add" ? "Dana Terpisah Baru" : "Edit Dana Terpisah"}
              </div>
            </div>

            {/* Tanggal + Nama penjual */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
              <div>
                <label style={labelStyle}>Tanggal Transaksi</label>
                <input type="date" value={form.date} onChange={e => set("date", e.target.value)}
                  required style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = "#ffb95f")}
                  onBlur={e => (e.target.style.borderColor = "#3c4a42")}
                />
              </div>
              <div>
                <label style={labelStyle}>Nama Penjual / Pemilik Dana</label>
                <div style={{ position:"relative" }}>
                  <input type="text" value={form.buyer} onChange={e => set("buyer", e.target.value)}
                    placeholder="Warist" style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = "#ffb95f")}
                    onBlur={e => (e.target.style.borderColor = "#3c4a42")}
                  />
                  <span className="material-symbols-outlined" style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", color:"#86948a", fontSize:18 }}>person</span>
                </div>
              </div>
            </div>

            {/* Jumlah ekor */}
            <div>
              <label style={labelStyle}>Jumlah Ayam Terjual (ekor)</label>
              <div style={{ position:"relative" }}>
                <input type="number" min={1} value={form.vol || ""} onChange={e => set("vol", +e.target.value)}
                  placeholder="0" required style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = "#ffb95f")}
                  onBlur={e => (e.target.style.borderColor = "#3c4a42")}
                />
                <span style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)", fontSize:12, color:"#86948a" }}>ekor</span>
              </div>
            </div>

            {/* Total nilai */}
            <div>
              <label style={labelStyle}>Total Nilai (Rp)</label>
              <div style={{ position:"relative" }}>
                <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", color:"#86948a", fontSize:13, fontWeight:500 }}>Rp</span>
                <input type="number" min={0} step={1000} value={form.jumlah || ""} onChange={e => set("jumlah", +e.target.value)}
                  placeholder="0" required
                  style={{ ...inputStyle, paddingLeft:40, textAlign:"right", fontVariantNumeric:"tabular-nums" }}
                  onFocus={e => (e.target.style.borderColor = "#ffb95f")}
                  onBlur={e => (e.target.style.borderColor = "#3c4a42")}
                />
              </div>
              {/* Live preview */}
              {form.jumlah > 0 && (
                <div style={{ display:"flex", justifyContent:"space-between", marginTop:8, fontSize:12 }}>
                  <span style={{ color:"#ffb95f", fontWeight:600 }}>{rupiah(form.jumlah)}</span>
                  {hargaPerEkor && (
                    <span style={{ color:"#86948a" }}>≈ Rp{hargaPerEkor}/ekor</span>
                  )}
                </div>
              )}
            </div>

            {/* Catatan */}
            <div>
              <label style={labelStyle}>Catatan</label>
              <textarea value={form.notes} onChange={e => set("notes", e.target.value)}
                placeholder="Keterangan penjualan, kondisi ayam, keperluan dana, dsb..."
                rows={3} style={{ ...inputStyle, resize:"none", lineHeight:1.6 }}
                onFocus={e => (e.target.style.borderColor = "#ffb95f")}
                onBlur={e => (e.target.style.borderColor = "#3c4a42")}
              />
            </div>

            {/* Info box — dana terpisah */}
            <div style={{ padding:14, background:"rgba(255,185,95,0.06)", border:"1px solid rgba(255,185,95,0.22)", borderRadius:8, display:"flex", gap:10, alignItems:"flex-start" }}>
              <span className="material-symbols-outlined" style={{ color:"#ffb95f", fontSize:18, marginTop:2 }}>info</span>
              <p style={{ margin:0, fontSize:13, color:"#bbcabf", lineHeight:1.6 }}>
                Transaksi ini dicatat sebagai <strong style={{ color:"#ffb95f" }}>dana terpisah (Penjualan Warist)</strong> —
                tidak masuk kas utama kandang, namun tetap tercatat di log keuangan untuk transparansi.
              </p>
            </div>
          </div>

          {/* Footer */}
          <footer style={{ padding:"16px 24px", borderTop:"1px solid #3c4a42", background:"#353534", display:"flex", justifyContent:"flex-end", gap:12, flexShrink:0 }}>
            <button type="button" onClick={onClose}
              style={{ padding:"10px 24px", background:"transparent", border:"1px solid transparent", borderRadius:8, color:"#bbcabf", cursor:"pointer", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em" }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#3c4a42"; (e.currentTarget as HTMLButtonElement).style.color = "#e5e2e1" }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "#bbcabf" }}
            >
              Cancel
            </button>
            <button type="submit"
              style={{ padding:"10px 28px", background:"#ffb95f", border:"none", borderRadius:8, color:"#2a1700", cursor:"pointer", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", display:"flex", alignItems:"center", gap:8, boxShadow:"0 4px 16px rgba(255,185,95,0.25)" }}
              onMouseEnter={e => (e.currentTarget.style.filter = "brightness(1.1)")}
              onMouseLeave={e => (e.currentTarget.style.filter = "brightness(1)")}
            >
              <span className="material-symbols-outlined" style={{ fontSize:18 }}>save</span>
              {mode === "add" ? "Simpan Dana Terpisah" : "Update"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}

// ─── Warist Delete Dialog ─────────────────────────────────────────────────────

function WaristDeleteDialog({ tx, onConfirm, onCancel }: { tx: Tx; onConfirm: () => void; onCancel: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel() }
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h)
  }, [onCancel])

  return (
    <div style={{ position:"fixed", inset:0, zIndex:130, background:"rgba(0,0,0,0.82)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:"#2a2a2a", border:"1px solid rgba(255,185,95,0.3)", borderRadius:12, width:"100%", maxWidth:420, overflow:"hidden" }}>
        <div style={{ padding:"20px 24px", borderBottom:"1px solid #3c4a42", display:"flex", alignItems:"center", gap:12 }}>
          <span className="material-symbols-outlined" style={{ color:"#ffb4ab", fontSize:22 }}>warning</span>
          <h3 style={{ margin:0, fontSize:18, fontWeight:600, color:"#e5e2e1" }}>Hapus Dana Terpisah</h3>
        </div>
        <div style={{ padding:"20px 24px" }}>
          <p style={{ color:"#bbcabf", fontSize:14, lineHeight:1.6, margin:0 }}>
            Hapus transaksi <strong style={{ color:"#ffb95f" }}>{tx.no}</strong>{" "}
            ({tx.buyer}, {tx.vol} ekor) senilai{" "}
            <strong style={{ color:"#ffb95f" }}>{rupiah(tx.jumlah)}</strong>?
          </p>
          <div style={{ marginTop:12, padding:"10px 14px", background:"rgba(255,185,95,0.07)", borderRadius:8, border:"1px solid rgba(255,185,95,0.2)", fontSize:12, color:"#86948a" }}>
            ⚠ Dana terpisah ini tidak akan muncul lagi di log Penjualan Warist setelah dihapus.
          </div>
        </div>
        <div style={{ padding:"16px 24px", borderTop:"1px solid #3c4a42", display:"flex", justifyContent:"flex-end", gap:12 }}>
          <button onClick={onCancel} style={{ padding:"10px 20px", background:"transparent", border:"1px solid #3c4a42", borderRadius:8, color:"#bbcabf", cursor:"pointer", fontSize:13, fontWeight:700 }}>
            Batal
          </button>
          <button onClick={onConfirm} style={{ padding:"10px 20px", background:"#93000a", border:"none", borderRadius:8, color:"#ffdad6", cursor:"pointer", fontSize:13, fontWeight:700, display:"flex", alignItems:"center", gap:6 }}>
            <span className="material-symbols-outlined" style={{ fontSize:16 }}>delete</span>Hapus
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Toast component ──────────────────────────────────────────────────────────
function Toast({ msg, type, onClose }: { msg: string; type: "alert" | "success" | "warning"; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t) }, [onClose])
  const bgColor = type === "alert" ? "rgba(255,180,171,0.12)" : type === "success" ? "rgba(78,222,163,0.12)" : "rgba(255,185,95,0.12)"
  const borderColor = type === "alert" ? "#ffb4ab" : type === "success" ? "#4edea3" : "#ffb95f"
  const icon = type === "alert" ? "warning" : type === "success" ? "check_circle" : "info"
  const iconColor = type === "alert" ? "#ffb4ab" : type === "success" ? "#4edea3" : "#ffb95f"
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 200,
      background: bgColor, border: `1px solid ${borderColor}`,
      borderRadius: 10, padding: "14px 20px",
      display: "flex", alignItems: "center", gap: 12, minWidth: 300,
      backdropFilter: "blur(8px)", boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
    }}>
      <span className="material-symbols-outlined" style={{ color: iconColor, fontSize: 20 }}>
        {icon}
      </span>
      <span style={{ fontSize: 14, color: "#e5e2e1", flex: 1 }}>{msg}</span>
      <button onClick={onClose} style={{ background: "transparent", border: "none", color: borderColor, cursor: "pointer", fontSize: 18, padding: 0, lineHeight: 0 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
      </button>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function FinanceClient({ initialTransactions }: { initialTransactions: Tx[] }) {
  const router = useRouter()
  const mounted = useMounted()
  const [txList, setTxList] = useState<Tx[]>(initialTransactions)
  const [, startTransition] = useTransition()
  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [defaultType, setDefaultType] = useState<TxType>("sale")
  const [editTx, setEditTx] = useState<Tx | null>(null)
  const [deleteTx, setDeleteTx] = useState<Tx | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: "alert" | "success" | "warning" } | null>(null)
  const [activeNav, setActiveNav] = useState("Finance")
  const [periodeIdx, setPeriodeIdx] = useState(biayaOperasional.length - 1)
  const [txTab, setTxTab] = useState<"all"|"sale"|"expense"|"warist">("all")

  // ── Warist (dana terpisah) state ───────────────────────────────────────────
  const [waristModal, setWaristModal] = useState<"add"|"edit"|null>(null)
  const [editWarist, setEditWarist]   = useState<Tx|null>(null)
  const [deleteWarist, setDeleteWarist] = useState<Tx|null>(null)

  // Dynamic transaction-based alerts
  const sales        = txList.filter(t => t.type === "sale" && t.category !== "Penjualan Warist")
  const expenses     = txList.filter(t => t.type === "expense")
  const waristTxList = txList.filter(t => t.category === "Penjualan Warist")
  const liveMainSale = sales.reduce((a,b) => a + b.jumlah, 0)
  const liveExpense  = expenses.reduce((a,b) => a + b.jumlah, 0)
  const liveWarist   = waristTxList.reduce((a,b) => a + b.jumlah, 0)
  const mainSaleDelta = liveMainSale - seedMainSale
  const expenseDelta  = liveExpense - seedExpense
  const waristDelta   = liveWarist - seedWarist
  const totalSale    = financeSummary.pendapatanTelur + mainSaleDelta
  const totalExpense = financeSummary.totalKeluar + expenseDelta
  const totalWarist  = financeSummary.penjualanWarist + waristDelta
  const kasUtama = financeSummary.sisaSaldo + mainSaleDelta - expenseDelta
  const combinedBalance = financeSummary.sisaSaldoTotal + mainSaleDelta - expenseDelta + waristDelta
  const balanceStatus = combinedBalance > 0 ? "Plus" : combinedBalance < 0 ? "Minus" : "Netral"
  const balanceColor = combinedBalance > 0 ? "#4edea3" : combinedBalance < 0 ? "#ffb4ab" : "#ffb95f"
  const balanceBg = combinedBalance > 0 ? "rgba(78,222,163,0.08)" : combinedBalance < 0 ? "rgba(255,180,171,0.08)" : "rgba(255,185,95,0.08)"
  const balanceBorder = combinedBalance > 0 ? "rgba(78,222,163,0.35)" : combinedBalance < 0 ? "rgba(255,180,171,0.35)" : "rgba(255,185,95,0.35)"
  const balanceIcon = combinedBalance > 0 ? "check_circle" : combinedBalance < 0 ? "report_problem" : "info"
  const lastMonthTotal = penjualanBulanan[penjualanBulanan.length - 1]?.total ?? 0
  const gaugePct = Math.min((lastMonthTotal / 25_000_000) * 100, 100)
  const periode  = biayaOperasional[periodeIdx]
  const totalOps = biayaOperasional.reduce((a,b) => a + b.total, 0)

  const generateFinanceAlert = useCallback(() => {
    if (combinedBalance < 0) {
      return {
        title: "Saldo gabungan negatif",
        desc: `Kas utama ${rupiah(kasUtama)}, warist ${rupiah(totalWarist)}`,
        type: "error" as const,
        priority: 1,
      }
    }

    if (combinedBalance === 0) {
      return {
        title: "Saldo gabungan netral",
        desc: `Kas utama ${rupiah(kasUtama)}, warist ${rupiah(totalWarist)}`,
        type: "warning" as const,
        priority: 2,
      }
    }

    return {
      title: "Saldo gabungan positif",
      desc: `Kas utama ${rupiah(kasUtama)}, warist ${rupiah(totalWarist)}`,
      type: "success" as const,
      priority: 3,
    }
  }, [combinedBalance, kasUtama, totalWarist])

  // Auto-show financial alert when transaction data changes
  useEffect(() => {
    const alert = generateFinanceAlert()
    const icon = alert.type === "error" ? "⚠️" : alert.type === "warning" ? "⚡" : "✓"
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToast({
      msg: `${icon} Saldo Total: ${rupiah(combinedBalance)}`,
      type: alert.type === "error" ? "alert" : (alert.type as "success" | "warning"),
    })
  }, [generateFinanceAlert, combinedBalance])


  const showToast = useCallback((msg: string, type: "success"|"error" = "success") => {
    // Transaction action toast (kept for CRUD feedback)
    setToast({ msg, type: type === "success" ? "success" : "alert" })
  }, [])

  // ── CRUD handlers ──────────────────────────────────────────────────────────

  function openAdd(type: TxType = "sale") {
    setDefaultType(type); setEditTx(null); setModalMode("add")
  }
  function openEdit(tx: Tx) {
    setEditTx(tx); setModalMode("edit")
  }
  function closeModal() {
    setModalMode(null); setEditTx(null)
  }

  function handleSave(data: Omit<Tx,"id"|"no">) {
    const id = modalMode === "edit" ? editTx?.id ?? null : null
    startTransition(async () => {
      try {
        const savedTx = await saveFinanceTransactionAction(id, data)
        if (modalMode === "add") {
          setTxList(prev => [savedTx, ...prev])
          showToast(`Transaksi ${savedTx.no} berhasil disimpan.`)
        } else if (modalMode === "edit" && editTx) {
          setTxList(prev => prev.map(t => t.id === editTx.id ? savedTx : t))
          showToast(`Transaksi ${savedTx.no} berhasil diperbarui.`)
        }
        closeModal()
        router.refresh()
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Gagal menyimpan transaksi.", "error")
      }
    })
  }

  function handleDelete() {
    if (!deleteTx) return
    const tx = deleteTx
    startTransition(async () => {
      try {
        await deleteFinanceTransactionAction(tx.id)
        setTxList(prev => prev.filter(t => t.id !== tx.id))
        showToast(`Transaksi ${tx.no} dihapus.`, "error")
        setDeleteTx(null)
        router.refresh()
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Gagal menghapus transaksi.", "error")
      }
    })
  }

  // ── Warist CRUD ────────────────────────────────────────────────────────────
  function openAddWarist() { setEditWarist(null); setWaristModal("add") }
  function openEditWarist(tx: Tx) { setEditWarist(tx); setWaristModal("edit") }

  function handleSaveWarist(data: Omit<Tx,"id"|"no">) {
    const enriched = { ...data, category:"Penjualan Warist" }
    const id = waristModal === "edit" ? editWarist?.id ?? null : null
    startTransition(async () => {
      try {
        const savedTx = await saveFinanceTransactionAction(id, enriched)
        if (waristModal === "add") {
          setTxList(prev => [savedTx, ...prev])
          showToast(`${savedTx.no} berhasil disimpan.`)
        } else if (editWarist) {
          setTxList(prev => prev.map(t => t.id===editWarist.id ? savedTx : t))
          showToast(`${savedTx.no} berhasil diperbarui.`)
        }
        setWaristModal(null); setEditWarist(null)
        router.refresh()
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Gagal menyimpan dana terpisah.", "error")
      }
    })
  }

  function handleDeleteWarist() {
    if (!deleteWarist) return
    const tx = deleteWarist
    startTransition(async () => {
      try {
        await deleteFinanceTransactionAction(tx.id)
        setTxList(prev => prev.filter(t => t.id !== tx.id))
        showToast(`${tx.no} dihapus.`, "error")
        setDeleteWarist(null)
        router.refresh()
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Gagal menghapus dana terpisah.", "error")
      }
    })
  }

  const filteredTx = txList.filter(t => {
    const matchesTab = txTab === "all"
      ? true
      : txTab === "warist"
      ? t.category === "Penjualan Warist"
      : t.type === txTab && t.category !== "Penjualan Warist"

    return matchesTab
  })

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap');
        .material-symbols-outlined { font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24; vertical-align:middle; display:inline-block; line-height:1; }
        .industrial-card { background:#121212; border:1px solid #2e2e2e; border-radius:12px; }
        .nav-link { display:flex; align-items:center; gap:12px; padding:10px 12px; border-radius:8px; text-decoration:none; transition:background 0.15s, color 0.15s; color:#bbcabf; font-size:15px; }
        .nav-link:hover { background:#353534; color:#e5e2e1; }
        .nav-link.active { background:#10b981; color:#00422b; font-weight:600; }
        .tx-row { border-bottom:1px solid #3c4a42; transition:background 0.12s; }
        .tx-row:hover { background:rgba(42,42,42,0.6); }
        .tx-row:last-child { border-bottom:none; }
        .exp-bar { height:8px; background:#353534; border-radius:4px; overflow:hidden; }
        .exp-fill { height:100%; border-radius:4px; transition:width 0.6s ease; }
        * { box-sizing:border-box; }
        ::-webkit-scrollbar { width:5px; height:5px; }
        ::-webkit-scrollbar-track { background:#121212; }
        ::-webkit-scrollbar-thumb { background:#3c4a42; border-radius:3px; }
        input[type=checkbox] { accent-color:#4edea3; }
        select option { background:#1c1b1b; color:#e5e2e1; }
        input[type=date]::-webkit-calendar-picker-indicator { filter:invert(0.6); }
      `}</style>

      <div style={{ display:"flex", minHeight:"100vh", background:"#050505", color:"#e5e2e1", fontFamily:"'Inter',sans-serif" }}>

        {/* ── Sidebar ── */}
        <aside style={{ width:256, flexShrink:0, background:"#201f1f", borderRight:"1px solid #3c4a42", display:"flex", flexDirection:"column", padding:"24px 0", position:"sticky", top:0, height:"100vh", zIndex:50 }}>
          <div style={{ padding:"0 24px", marginBottom:32 }}>
            <h1 style={{ fontSize:22, fontWeight:700, color:"#4edea3", margin:0, letterSpacing:"-0.01em" }}>Farm Command</h1>
            <p style={{ fontSize:11, fontWeight:700, color:"#bbcabf", margin:"4px 0 0", textTransform:"uppercase", letterSpacing:"0.05em" }}>Facility ID: P-882</p>
          </div>
          <nav style={{ flex:1, padding:"0 16px", display:"flex", flexDirection:"column", gap:2 }}>
            {NAV.map(({ label, icon, href }) => (
              <Link key={label} href={href} className={`nav-link${activeNav===label?" active":""}`} onClick={() => setActiveNav(label)}>
                <span className="material-symbols-outlined" style={{ fontSize:20 }}>{icon}</span>
                {label}
              </Link>
            ))}
          </nav>
          <div style={{ padding:"20px 16px 0", borderTop:"1px solid #3c4a42", display:"flex", flexDirection:"column", gap:4 }}>
            {[{ label:"Logs", icon:"history" },{ label:"Logout", icon:"logout" }].map(({ label, icon }) => (
              <a key={label} href="#" className="nav-link" onClick={e => {
                e.preventDefault()
                if (label === "Logout") logout()
              }}>
                <span className="material-symbols-outlined" style={{ fontSize:20 }}>{icon}</span>{label}
              </a>
            ))}
          </div>
        </aside>

        {/* ── Main ── */}
        <main style={{ flex:1 }}>

          {/* TopBar */}
          <header style={{ height:64, background:"#131313", borderBottom:"1px solid #3c4a42", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 24px", position:"sticky", top:0, zIndex:40 }}>
            <div style={{ display:"flex", alignItems:"center", gap:24 }}>
              <span style={{ fontSize:22, fontWeight:600, color:"#4edea3", letterSpacing:"-0.01em" }}>PoultryPro Analytics</span>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ display:"flex", alignItems:"center", borderLeft:"1px solid #3c4a42", paddingLeft:16 }}>
                {["notifications","settings","help"].map(ic => (
                  <button key={ic} style={{ padding:8, background:"transparent", border:"none", color:"#bbcabf", cursor:"pointer", borderRadius:"50%", lineHeight:0 }}>
                    <span className="material-symbols-outlined">{ic}</span>
                  </button>
                ))}
              </div>
              <div style={{ width:32, height:32, borderRadius:"50%", background:"linear-gradient(135deg,#10b981,#4edea3)", display:"flex", alignItems:"center", justifyContent:"center", color:"#003824", fontWeight:700, fontSize:12 }}>KA</div>
            </div>
          </header>

          <div style={{ padding:24, maxWidth:1600, margin:"0 auto" }}>

            {/* Page header */}
            <div style={{ marginBottom:32, display:"flex", alignItems:"flex-end", justifyContent:"space-between", flexWrap:"wrap", gap:16 }}>
              <div>
                <h2 style={{ fontSize:40, fontWeight:700, color:"#e5e2e1", margin:0, letterSpacing:"-0.02em", lineHeight:1.1 }}>Finance &amp; Sales Hub</h2>
                <p style={{ color:"#bbcabf", marginTop:8, maxWidth:600, fontSize:14, lineHeight:1.6 }}>
                  Monitoring pendapatan, transaksi penjualan telur, dan pengeluaran operasional Kandang P-882.
                </p>
              </div>
              <div style={{ display:"flex", gap:12 }}>
                <button onClick={() => openAdd("sale")} style={{ background:"#4edea3", color:"#003824", padding:"12px 24px", fontWeight:600, borderRadius:8, border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:8, fontSize:14 }}>
                  <span className="material-symbols-outlined" style={{ fontSize:20 }}>add_shopping_cart</span>
                  New Sale
                </button>
                <button onClick={() => openAdd("expense")} style={{ background:"#2a2a2a", color:"#e5e2e1", padding:"12px 24px", fontWeight:600, borderRadius:8, border:"1px solid #2e2e2e", cursor:"pointer", display:"flex", alignItems:"center", gap:8, fontSize:14, transition:"border-color 0.15s" }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = "#4edea3")}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "#2e2e2e")}
                >
                  <span className="material-symbols-outlined" style={{ fontSize:20 }}>receipt_long</span>
                  Record Expense
                </button>
              </div>
            </div>

            {/* 12-col Grid */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(12,1fr)", gap:16 }}>

              {/* ── LEFT col-7 ── */}
              <section style={{ gridColumn:"span 7", display:"flex", flexDirection:"column", gap:16 }}>

                {/* Sales Overview */}
                <div className="industrial-card" style={{ padding:24, position:"relative", overflow:"hidden" }}>
                  <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:"linear-gradient(to right, rgba(78,222,163,0.25), transparent)" }}/>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }}>
                    <h3 style={{ fontSize:18, fontWeight:600, color:"#e5e2e1", display:"flex", alignItems:"center", gap:8, margin:0 }}>
                      <span className="material-symbols-outlined" style={{ color:"#4edea3" }}>trending_up</span>
                      Sales Overview
                    </h3>
                    <span style={{ fontSize:11, fontWeight:700, color:"#bbcabf", textTransform:"uppercase", letterSpacing:"0.05em" }}>
                      Target: {rupiah(25_000_000, true)}/bln
                    </span>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:32, alignItems:"center" }}>
                    <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
                      <Gauge pct={gaugePct}/>
                      <div style={{ marginTop:16, textAlign:"center" }}>
                        <div style={{ fontSize:20, fontWeight:700, color:"#4edea3" }}>
                          {mounted ? rupiah(totalSale) : "—"}
                        </div>
                        <div style={{ fontSize:13, color:"#bbcabf", marginTop:2 }}>Total Pendapatan (live)</div>
                      </div>
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                      {[
                        { label:"Total Penjualan (Kas Utama)", val: mounted ? rupiah(totalSale)                       : "—", border:"#4edea3" },
                        { label:"Total Pengeluaran Ops",       val: mounted ? rupiah(totalExpense)                    : "—", border:"#ffb95f" },
                        { label:"Saldo Kas Utama",             val: mounted ? rupiah(kasUtama)                        : "—", border: mounted && kasUtama >= 0 ? "#4edea3":"#ffb4ab" },
                        { label:"Saldo Gabungan",              val: mounted ? rupiah(combinedBalance)                 : "—", border: mounted && combinedBalance >= 0 ? "#4edea3":"#ffb4ab" },
                      ].map((item,i) => (
                        <div key={i} style={{ background:"#1c1b1b", padding:16, borderRadius:6, borderLeft:`4px solid ${item.border}` }}>
                          <div style={{ fontSize:11, fontWeight:700, color:"#bbcabf", textTransform:"uppercase", letterSpacing:"0.04em" }}>{item.label}</div>
                          <div style={{ fontSize:16, fontWeight:600, color:item.border, marginTop:4 }}>{item.val}</div>
                        </div>
                      ))}
                      {/* Penjualan Warist — dana terpisah */}
                      <div style={{ background:"rgba(255,185,95,0.07)", padding:14, borderRadius:6, borderLeft:"4px solid #ffb95f", border:"1px solid rgba(255,185,95,0.25)" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
                          <span className="material-symbols-outlined" style={{ fontSize:14, color:"#ffb95f" }}>star</span>
                          <div style={{ fontSize:11, fontWeight:700, color:"#ffb95f", textTransform:"uppercase", letterSpacing:"0.04em" }}>Penjualan Warist</div>
                        </div>
                        <div style={{ fontSize:16, fontWeight:700, color:"#ffb95f" }}>
                          {mounted ? rupiah(totalWarist) : "—"}
                        </div>
                        <div style={{ fontSize:11, color:"#86948a", marginTop:4 }}>
                          {mounted ? `${waristTxList.reduce((a,b) => a + b.vol, 0)} ekor ayam afkir · dana terpisah` : "ekor ayam afkir · dana terpisah"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bar chart */}
                <div className="industrial-card" style={{ padding:24 }}>
                  <h3 style={{ fontSize:16, fontWeight:600, color:"#e5e2e1", margin:"0 0 20px" }}>Pendapatan per Bulan</h3>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={penjualanBulanan} margin={{ top:4, right:0, left:-15, bottom:0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2e2e2e" vertical={false}/>
                      <XAxis dataKey="bulan" tick={{ fontSize:10, fill:"#bbcabf" }} tickLine={false} axisLine={false}/>
                      <YAxis tick={{ fontSize:10, fill:"#bbcabf" }} tickLine={false} axisLine={false} tickFormatter={v => rupiah(v,true)}/>
                      <Tooltip content={<DarkTip/>} cursor={{ fill:"rgba(78,222,163,0.05)" }}/>
                      <Bar dataKey="total" name="Pendapatan" radius={[4,4,0,0]}>
                        {penjualanBulanan.map((d,i) => (
                          <Cell key={i} fill={d.total>=20_000_000?"#4edea3":d.total>=10_000_000?"#89ceff":"#ffb95f"} fillOpacity={0.85}/>
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* ── Transactions Table with CRUD ── */}
                <div className="industrial-card" style={{ overflow:"hidden" }}>
                  {/* Table toolbar */}
                  <div style={{ padding:"0 24px", borderBottom:"1px solid #3c4a42", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <div style={{ display:"flex" }}>
                      {([
                        ["all","Semua"],
                        ["sale","Penjualan"],
                        ["expense","Pengeluaran"],
                        ["warist","Dana Terpisah"],
                      ] as const).map(([val,lbl]) => (
                        <button key={val} onClick={() => setTxTab(val)} style={{
                          padding:"14px 16px", background:"transparent", border:"none",
                          borderBottom:`2px solid ${txTab===val ? (val==="warist"?"#ffb95f":"#4edea3") : "transparent"}`,
                          color: txTab===val ? (val==="warist"?"#ffb95f":"#4edea3") : "#bbcabf",
                          fontWeight: txTab===val ? 700 : 400, cursor:"pointer", fontSize:13, transition:"all 0.15s",
                          display:"flex", alignItems:"center", gap:6,
                        }}>
                          {val==="warist" && <span className="material-symbols-outlined" style={{ fontSize:14 }}>star</span>}
                          {lbl}
                          {val==="warist" && waristTxList.length > 0 && (
                            <span style={{ fontSize:10, fontWeight:700, padding:"1px 6px", borderRadius:20, background:"rgba(255,185,95,0.15)", color:"#ffb95f" }}>
                              {waristTxList.length}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                    <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                      {txTab === "warist" && (
                        <button onClick={openAddWarist} style={{ background:"rgba(255,185,95,0.15)", color:"#ffb95f", padding:"6px 12px", fontSize:11, fontWeight:700, borderRadius:6, border:"1px solid rgba(255,185,95,0.35)", cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
                          <span className="material-symbols-outlined" style={{ fontSize:16 }}>add</span>Dana Terpisah
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={{ overflowX:"auto" }}>
                    <table style={{ width:"100%", borderCollapse:"collapse", textAlign:"left" }}>
                      <thead style={{ background:"#1E1E1E" }}>
                        <tr>
                          <th style={{ padding:"12px 24px", width:40 }}><input type="checkbox"/></th>
                          {["No. TX","Tipe","Pembeli / Vendor","Volume","Jumlah (Rp)","Aksi"].map((h,i) => (
                            <th key={h} style={{ padding:"12px 24px", fontSize:11, fontWeight:700, color:"#bbcabf", textTransform:"uppercase", letterSpacing:"0.05em", textAlign: i>=3 && i<=4 ? "right" : i===5 ? "center" : "left" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTx.length === 0 && (
                          <tr><td colSpan={7} style={{ padding:"32px 24px", textAlign:"center", color:"#bbcabf", fontSize:14 }}>
            Belum ada transaksi. Klik {"\"Sale\""} atau {"\"Expense\""} untuk menambah.
                          </td></tr>
                        )}
                        {filteredTx.map((tx) => {
                          const isWarist = tx.category === "Penjualan Warist"
                          const badgeBg    = isWarist ? "rgba(255,185,95,0.18)"  : tx.type==="sale" ? "rgba(78,222,163,0.12)"  : "rgba(255,185,95,0.12)"
                          const badgeColor = isWarist ? "#ffb95f"                 : tx.type==="sale" ? "#4edea3"                 : "#ffb95f"
                          const badgeLabel = isWarist ? "WARIST"                  : tx.type==="sale" ? "JUAL"                    : "KELUAR"
                          return (
                          <tr key={tx.id} className="tx-row" style={{ background: isWarist ? "rgba(255,185,95,0.03)" : "transparent" }}>
                            <td style={{ padding:"13px 24px" }}><input type="checkbox"/></td>
                            <td style={{ padding:"13px 24px", fontSize:13, fontWeight:500, fontVariantNumeric:"tabular-nums" }}>
                              <span style={{ color: isWarist ? "#ffb95f" : "#bbcabf" }}>{tx.no}</span>
                              {isWarist && (
                                <span className="material-symbols-outlined" style={{ fontSize:14, color:"#ffb95f", marginLeft:6, verticalAlign:"middle" }} title="Dana terpisah">star</span>
                              )}
                            </td>
                            <td style={{ padding:"13px 24px" }}>
                              <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                                <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20, background:badgeBg, color:badgeColor, flexShrink:0 }}>
                                  {badgeLabel}
                                </span>
                                <span style={{ color: isWarist ? "#ffb95f" : "#e5e2e1" }}>
                                  {tx.buyer || tx.category}
                                </span>
                                {isWarist && (
                                  <span style={{ fontSize:10, color:"#86948a", fontStyle:"italic" }}>· dana terpisah</span>
                                )}
                              </div>
                              {isWarist && tx.notes && (
                                <div style={{ fontSize:11, color:"#86948a", marginTop:3, paddingLeft:4 }}>{tx.notes}</div>
                              )}
                            </td>
                            <td style={{ padding:"13px 24px", textAlign:"right", fontSize:13 }}>
                              {isWarist ? `${tx.vol} ekor` : tx.vol > 0 ? `${tx.vol} kg` : "—"}
                            </td>
                            <td style={{ padding:"13px 24px", textAlign:"right", fontSize:13, fontWeight:600, color: isWarist ? "#ffb95f" : "#e5e2e1" }}>
                              {Math.round(tx.jumlah).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
                            </td>
                            <td style={{ padding:"13px 24px", textAlign:"center" }}>
                              <div style={{ display:"flex", justifyContent:"center", gap:12 }}>
                                <button
                                  onClick={() => isWarist ? openEditWarist(tx) : openEdit(tx)}
                                  style={{ background:"transparent", border:"none", color:"#bbcabf", cursor:"pointer", lineHeight:0, transition:"color 0.15s" }}
                                  onMouseEnter={e => (e.currentTarget.style.color = isWarist ? "#ffb95f" : "#4edea3")}
                                  onMouseLeave={e => (e.currentTarget.style.color = "#bbcabf")}
                                  title="Edit">
                                  <span className="material-symbols-outlined" style={{ fontSize:20 }}>edit</span>
                                </button>
                                <button
                                  onClick={() => isWarist ? setDeleteWarist(tx) : setDeleteTx(tx)}
                                  style={{ background:"transparent", border:"none", color:"#bbcabf", cursor:"pointer", lineHeight:0, transition:"color 0.15s" }}
                                  onMouseEnter={e => (e.currentTarget.style.color = "#ffb4ab")}
                                  onMouseLeave={e => (e.currentTarget.style.color = "#bbcabf")}
                                  title="Hapus">
                                  <span className="material-symbols-outlined" style={{ fontSize:20 }}>delete</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary footer */}
                  <div style={{ padding:"12px 24px", background:"#1c1b1b", borderTop:"1px solid #3c4a42", display:"flex", justifyContent:"space-between", fontSize:12 }}>
                    <span style={{ color:"#bbcabf" }}>{filteredTx.length} transaksi ditampilkan</span>
                    <span style={{ color:"#4edea3", fontWeight:700 }}>
                      Total: {mounted ? rupiah(filteredTx.reduce((a,b) => a+b.jumlah, 0)) : "—"}
                    </span>
                  </div>
                </div>
              </section>

              {/* ── RIGHT col-5 ── */}
              <section style={{ gridColumn:"span 5" }}>
                <div className="industrial-card" style={{ padding:24 }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:32 }}>
                    <h3 style={{ fontSize:18, fontWeight:600, color:"#e5e2e1", display:"flex", alignItems:"center", gap:8, margin:0 }}>
                      <span className="material-symbols-outlined" style={{ color:"#ffb95f" }}>account_balance_wallet</span>
                      Operational Expenses
                    </h3>
                    <div style={{ display:"flex", alignItems:"center", gap:6, background:"#353534", borderRadius:6, padding:"4px 10px" }}>
                      <button onClick={() => setPeriodeIdx(Math.max(0, periodeIdx-1))} style={{ background:"transparent", border:"none", color:"#bbcabf", cursor:"pointer", lineHeight:0 }}>
                        <span className="material-symbols-outlined" style={{ fontSize:16 }}>chevron_left</span>
                      </button>
                      <span style={{ fontSize:11, fontWeight:700, color:"#e5e2e1", letterSpacing:"0.04em", textTransform:"uppercase", minWidth:64, textAlign:"center" }}>
                        {periode.bulan}
                      </span>
                      <button onClick={() => setPeriodeIdx(Math.min(biayaOperasional.length-1, periodeIdx+1))} style={{ background:"transparent", border:"none", color:"#bbcabf", cursor:"pointer", lineHeight:0 }}>
                        <span className="material-symbols-outlined" style={{ fontSize:16 }}>chevron_right</span>
                      </button>
                    </div>
                  </div>

                  <div style={{ display:"flex", flexDirection:"column", gap:22 }}>
                    {periode.items.map((item,i) => {
                      const pct = Math.round((item.jumlah / item.budget) * 100)
                      const over = pct >= 94
                      const bar  = over ? "#ffb95f" : "#4edea3"
                      return (
                        <div key={i} style={{ display:"flex", flexDirection:"column", gap:8 }}>
                          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
                            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                              <div style={{ background:"#1c1b1b", padding:8, borderRadius:6, lineHeight:0 }}>
                                <span className="material-symbols-outlined" style={{ color:"#bbcabf", fontSize:20 }}>{item.icon}</span>
                              </div>
                              <div>
                                <div style={{ fontSize:14, fontWeight:600, color:"#e5e2e1" }}>{item.nama}</div>
                                <div style={{ fontSize:11, fontWeight:700, color:"#bbcabf", marginTop:2 }}>
                                  Spent: {rupiah(item.jumlah,true)} / {rupiah(item.budget,true)}
                                </div>
                              </div>
                            </div>
                            <div style={{ fontSize:13, fontWeight:600, color: over?"#ffb95f":"#bbcabf" }}>{pct}%</div>
                          </div>
                          <div className="exp-bar">
                            <div className="exp-fill" style={{ width:`${Math.min(pct,100)}%`, background:bar, boxShadow:over?"0 0 6px rgba(255,185,95,0.4)":"none" }}/>
                          </div>
                          {over && (
                            <p style={{ fontSize:10, color:"#ffb95f", display:"flex", alignItems:"center", gap:4, margin:0 }}>
                              <span className="material-symbols-outlined" style={{ fontSize:12 }}>warning</span>
                              Critical: Budget threshold reached
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  <div style={{ marginTop:24, padding:16, background:"#1c1b1b", borderRadius:8, border:"1px solid #3c4a42", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div>
                      <div style={{ fontSize:11, fontWeight:700, color:"#bbcabf", textTransform:"uppercase", letterSpacing:"0.04em" }}>Total {periode.bulan}</div>
                      <div style={{ fontSize:11, color:"#86948a", marginTop:2 }}>Akumulasi: {rupiah(totalOps,true)}</div>
                    </div>
                    <span style={{ fontSize:18, fontWeight:700, color:"#ffb95f" }}>{rupiah(periode.total,true)}</span>
                  </div>

                  {/* Add expense shortcut */}
                  <button onClick={() => openAdd("expense")} style={{
                    marginTop:16, width:"100%", padding:14, background:"transparent",
                    border:"1px dashed #3c4a42", borderRadius:8, color:"#bbcabf", cursor:"pointer",
                    fontSize:13, display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                    transition:"all 0.15s",
                  }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor="#4edea3"; (e.currentTarget as HTMLButtonElement).style.color="#4edea3" }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor="#3c4a42"; (e.currentTarget as HTMLButtonElement).style.color="#bbcabf" }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize:18 }}>add_circle</span>
                    Tambah Pengeluaran Baru
                  </button>

                  {/* Decorative */}
                  <div style={{ marginTop:16, borderRadius:8, border:"1px solid #3c4a42", padding:20, display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center", position:"relative", overflow:"hidden" }}>
                    <div style={{ position:"absolute", inset:0, opacity:0.07, background:"radial-gradient(circle at 50% 50%, #4edea3 0%, transparent 70%)", pointerEvents:"none" }}/>
                    <span className="material-symbols-outlined" style={{ fontSize:36, color:"#4edea3", marginBottom:8 }}>monitoring</span>
                    <span style={{ fontSize:11, fontWeight:700, color:"#4edea3", textTransform:"uppercase", letterSpacing:"0.05em" }}>Live Operations</span>
                    <span style={{ fontSize:13, color:"#bbcabf", marginTop:4 }}>Kandang P-882 · Aktif</span>
                  </div>
                </div>
              </section>
            </div>

            {/* ── Monthly Financial Chart Section ── */}
            <div style={{ marginTop:24, display:"flex", flexDirection:"column", gap:16 }}>

              {/* Header */}
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div>
                  <h3 style={{ fontSize:22, fontWeight:700, color:"#e5e2e1", margin:0, letterSpacing:"-0.01em" }}>Penjualan & Pengeluaran per Bulan</h3>
                  <p style={{ fontSize:13, color:"#bbcabf", marginTop:4 }}>Data aktual dari sheet HITUNGAN · Feb 2025 – Mei 2026</p>
                </div>
                <div style={{ display:"flex", gap:16, fontSize:12 }}>
                  {[["#4edea3","Penjualan"],["#ff8a80","Pengeluaran"],["#89ceff","Selisih (net)"]].map(([c,l])=>(
                    <div key={l as string} style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <div style={{ width:10, height:10, borderRadius:2, background:c as string }}/>
                      <span style={{ color:"#bbcabf" }}>{l}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Grouped Bar Chart: penjualan vs pengeluaran */}
              <div style={{ background:"#121212", border:"1px solid #2e2e2e", borderRadius:12, padding:24, position:"relative", overflow:"hidden" }}>
                <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:"linear-gradient(to right, rgba(78,222,163,0.2), rgba(255,138,128,0.15), transparent)" }}/>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
                  <div>
                    <h4 style={{ fontSize:16, fontWeight:600, color:"#e5e2e1", margin:0 }}>
                      <span className="material-symbols-outlined" style={{ color:"#4edea3", fontSize:18, marginRight:8 }}>bar_chart</span>
                      Perbandingan Bulanan
                    </h4>
                    <p style={{ fontSize:12, color:"#bbcabf", marginTop:4 }}>
                      Breakeven tercapai mulai <strong style={{ color:"#4edea3" }}>Oktober 2025</strong> — pertama kali pendapatan melampaui operasional
                    </p>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4 }}>
                    <span style={{ fontSize:11, fontWeight:700, color:"#bbcabf", textTransform:"uppercase" }}>Total Pendapatan</span>
                    <span style={{ fontSize:18, fontWeight:700, color:"#4edea3" }}>{rupiah(dataBulananKeuangan.reduce((a,b)=>a+b.penjualan,0), true)}</span>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart data={dataBulananKeuangan} margin={{ top:4, right:8, left:-8, bottom:0 }} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2e2e2e" vertical={false}/>
                    <XAxis dataKey="bulan" tick={{ fontSize:10, fill:"#bbcabf" }} tickLine={false} axisLine={false}/>
                    <YAxis tick={{ fontSize:10, fill:"#bbcabf" }} tickLine={false} axisLine={false} tickFormatter={v=>rupiah(v,true)} width={72}/>
                    <Tooltip
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      content={({ active, payload, label }: any) => {
                        if (!active || !payload?.length) return null
                        const d = dataBulananKeuangan.find(x=>x.bulan===label)
                        return (
                          <div style={{ background:"#201f1f", border:"1px solid #3c4a42", borderRadius:8, padding:"10px 14px", fontSize:12, minWidth:190 }}>
                            <p style={{ color:"#bbcabf", marginBottom:8, fontWeight:700 }}>{label}</p>
                            {[
                              { label:"Penjualan",    val:d?.penjualan??0,    color:"#4edea3" },
                              { label:"Pengeluaran",  val:d?.pengeluaran??0,  color:"#ff8a80" },
                              { label:"Selisih",      val:d?.selisih??0,      color:(d?.selisih??0)>=0?"#4edea3":"#ffb4ab" },
                            ].map(item=>(
                              <div key={item.label} style={{ display:"flex", justifyContent:"space-between", gap:16, marginBottom:4 }}>
                                <span style={{ color:"#86948a" }}>{item.label}</span>
                                <span style={{ color:item.color, fontWeight:700 }}>{rupiah(item.val,true)}</span>
                              </div>
                            ))}
                          </div>
                        )
                      }}
                    />
                    <Bar dataKey="penjualan" name="Penjualan" radius={[3,3,0,0]} maxBarSize={28}>
                      {dataBulananKeuangan.map((_,i)=>(
                        <Cell key={i} fill="#4edea3" fillOpacity={0.85}/>
                      ))}
                    </Bar>
                    <Bar dataKey="pengeluaran" name="Pengeluaran" radius={[3,3,0,0]} maxBarSize={28}>
                      {dataBulananKeuangan.map((_,i)=>(
                        <Cell key={i} fill="#ff8a80" fillOpacity={0.75}/>
                      ))}
                    </Bar>
                    <Line type="monotone" dataKey="selisih" name="Selisih" stroke="#89ceff" strokeWidth={2} dot={{ r:3, fill:"#89ceff", strokeWidth:0 }} activeDot={{ r:5 }}/>
                    <ReferenceLine y={0} stroke="#3c4a42" strokeDasharray="4 3" strokeWidth={1.5}/>
                  </ComposedChart>
                </ResponsiveContainer>

                {/* KPI summary row */}
                <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginTop:20, paddingTop:16, borderTop:"1px solid #2e2e2e" }}>
                  {[
                    { label:"Bulan Untung",  val:`${dataBulananKeuangan.filter(d=>d.selisih>0).length} bulan`, color:"#4edea3", icon:"trending_up" },
                    { label:"Bulan Rugi",    val:`${dataBulananKeuangan.filter(d=>d.selisih<=0).length} bulan`, color:"#ff8a80", icon:"trending_down" },
                    { label:"Pengeluaran Tertinggi", val:rupiah(Math.max(...dataBulananKeuangan.map(d=>d.pengeluaran)),true), color:"#ffb95f", icon:"arrow_upward" },
                    { label:"Pendapatan Tertinggi",  val:rupiah(Math.max(...dataBulananKeuangan.map(d=>d.penjualan)),true),   color:"#4edea3", icon:"star" },
                  ].map((k,i)=>(
                    <div key={i} style={{ background:"#1c1b1b", borderRadius:8, padding:"12px 14px", borderLeft:`3px solid ${k.color}` }}>
                      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
                        <span className="material-symbols-outlined" style={{ fontSize:14, color:k.color }}>{k.icon}</span>
                        <span style={{ fontSize:11, fontWeight:700, color:"#bbcabf", textTransform:"uppercase", letterSpacing:"0.04em" }}>{k.label}</span>
                      </div>
                      <div style={{ fontSize:18, fontWeight:700, color:k.color }}>{k.val}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stacked Bar: breakdown pengeluaran per kategori */}
              <div style={{ background:"#121212", border:"1px solid #2e2e2e", borderRadius:12, padding:24 }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
                  <div>
                    <h4 style={{ fontSize:16, fontWeight:600, color:"#e5e2e1", margin:0 }}>
                      <span className="material-symbols-outlined" style={{ color:"#ffb95f", fontSize:18, marginRight:8 }}>stacked_bar_chart</span>
                      Breakdown Pengeluaran per Kategori
                    </h4>
                    <p style={{ fontSize:12, color:"#bbcabf", marginTop:4 }}>Komposisi biaya operasional setiap bulan</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={detailOpsPerBulan} margin={{ top:4, right:8, left:-8, bottom:0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2e2e2e" vertical={false}/>
                    <XAxis dataKey="bulan" tick={{ fontSize:10, fill:"#bbcabf" }} tickLine={false} axisLine={false}/>
                    <YAxis tick={{ fontSize:10, fill:"#bbcabf" }} tickLine={false} axisLine={false} tickFormatter={v=>rupiah(v,true)} width={72}/>
                    <Tooltip
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      content={({ active, payload, label }: any) => {
                        if (!active || !payload?.length) return null
                        const d = detailOpsPerBulan.find(x=>x.bulan===label)
                        const cats = [
                          ["Pakan",          d?.pakan??0,         "#ffb95f"],
                          ["Vaksin/Vit",      d?.vaksinVitamin??0, "#89ceff"],
                          ["Listrik",         d?.listrik??0,       "#a78bfa"],
                          ["Makan/Rokok",     d?.makanRokok??0,    "#4edea3"],
                          ["Gaji",            d?.gaji??0,          "#f472b6"],
                          ["Kebersihan",      d?.kebersihan??0,    "#34d399"],
                          ["Lainnya",         d?.lainnya??0,       "#94a3b8"],
                        ] as [string,number,string][]
                        return (
                          <div style={{ background:"#201f1f", border:"1px solid #3c4a42", borderRadius:8, padding:"10px 14px", fontSize:12, minWidth:200 }}>
                            <p style={{ color:"#bbcabf", marginBottom:8, fontWeight:700 }}>{label}</p>
                            {cats.filter(([,v])=>v>0).map(([l,v,c])=>(
                              <div key={l} style={{ display:"flex", justifyContent:"space-between", gap:12, marginBottom:3 }}>
                                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                                  <div style={{ width:8, height:8, borderRadius:2, background:c }}/>
                                  <span style={{ color:"#86948a" }}>{l}</span>
                                </div>
                                <span style={{ color:"#e5e2e1", fontWeight:600 }}>{rupiah(v,true)}</span>
                              </div>
                            ))}
                            <div style={{ display:"flex", justifyContent:"space-between", marginTop:8, paddingTop:6, borderTop:"1px solid #3c4a42" }}>
                              <span style={{ color:"#bbcabf", fontWeight:700 }}>Total</span>
                              <span style={{ color:"#ffb95f", fontWeight:700 }}>{rupiah(d?.total??0,true)}</span>
                            </div>
                          </div>
                        )
                      }}
                    />
                    <Bar dataKey="pakan"        name="Pakan"       stackId="a" fill="#ffb95f" fillOpacity={0.85}/>
                    <Bar dataKey="vaksinVitamin" name="Vaksin/Vit"  stackId="a" fill="#89ceff" fillOpacity={0.85}/>
                    <Bar dataKey="listrik"       name="Listrik"     stackId="a" fill="#a78bfa" fillOpacity={0.85}/>
                    <Bar dataKey="makanRokok"    name="Makan/Rokok" stackId="a" fill="#4edea3" fillOpacity={0.85}/>
                    <Bar dataKey="gaji"          name="Gaji"        stackId="a" fill="#f472b6" fillOpacity={0.85}/>
                    <Bar dataKey="kebersihan"    name="Kebersihan"  stackId="a" fill="#34d399" fillOpacity={0.85}/>
                    <Bar dataKey="lainnya"       name="Lainnya"     stackId="a" fill="#94a3b8" fillOpacity={0.85} radius={[3,3,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
                <div style={{ display:"flex", flexWrap:"wrap", gap:"8px 16px", marginTop:14, paddingTop:12, borderTop:"1px solid #2e2e2e" }}>
                  {[["#ffb95f","Pakan"],["#89ceff","Vaksin/Vit"],["#a78bfa","Listrik"],["#4edea3","Makan/Rokok"],["#f472b6","Gaji"],["#34d399","Kebersihan"],["#94a3b8","Lainnya"]].map(([c,l])=>(
                    <div key={l} style={{ display:"flex", alignItems:"center", gap:6, fontSize:11, color:"#bbcabf" }}>
                      <div style={{ width:10, height:10, borderRadius:2, background:c }}/>
                      {l}
                    </div>
                  ))}
                </div>
              </div>

            </div>

                        {/* Status banner */}
            <div style={{ marginTop:24, marginBottom:48, background:balanceBg, border:`1px solid ${balanceBorder}`, borderRadius:12, padding:16, display:"flex", alignItems:"center", justifyContent:"space-between", gap:16 }}>
              <div style={{ display:"flex", alignItems:"center", gap:16 }}>
                <span className="material-symbols-outlined" style={{ color:balanceColor, fontSize:24, animation:combinedBalance < 0 ? "pulse 2s infinite" : "none" }}>{balanceIcon}</span>
                <span style={{ fontWeight:800, color:balanceColor, fontSize:22 }}>
                  Saldo Total: {mounted ? rupiah(combinedBalance) : "..."}
                </span>
              </div>
              <span style={{ color:balanceColor, fontWeight:800, fontSize:11, textTransform:"uppercase", whiteSpace:"nowrap" }}>
                {balanceStatus}
              </span>
            </div>
          </div>
        </main>
      </div>

      {/* ── Modals ── */}
      {modalMode && (
        <TxModal
          mode={modalMode}
          initial={editTx ?? { type: defaultType }}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}
      {deleteTx && (
        <DeleteDialog
          tx={deleteTx}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTx(null)}
        />
      )}

      {/* ── Warist Modals ── */}
      {waristModal && (
        <WaristModal
          mode={waristModal}
          initial={editWarist ?? {}}
          onSave={handleSaveWarist}
          onClose={() => { setWaristModal(null); setEditWarist(null) }}
        />
      )}
      {deleteWarist && (
        <WaristDeleteDialog
          tx={deleteWarist}
          onConfirm={handleDeleteWarist}
          onCancel={() => setDeleteWarist(null)}
        />
      )}

      {toast && (
        <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)}/>
      )}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </>
  )
}
