"use client"

import { logout } from "@/lib/auth"
import { useState, useEffect, useCallback, useTransition, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { BarChart, Bar, Line, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts"
import { deleteFinanceTransactionAction, saveFinanceTransactionAction } from "@/app/finance/actions"
import { rupiah } from "@/data/finance"
import { deriveDynamicStokTelurBulanan } from "@/lib/livestock-utils"
import type { StokTelurBulan } from "@/lib/livestock-utils"

// ─── useMounted — prevents SSR↔client hydration mismatch ────────────────────
function useMounted() {
  const [mounted, setMounted] = useState(false)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), [])
  return mounted
}

// ─── Types ───────────────────────────────────────────────────────────────────
type TxType = "income" | "expense" | "investor_income" | "warist"
type ModalMode = "add" | "edit" | null
type TabType = "income" | "expense" | "investor_income" | "warist"

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
  stock?: number
  sisa?: number
  harga?: number
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
const INCOME_CATS = ["Penjualan Telur","Penjualan Ayam Afkir","Penjualan Pupuk","Hasil Lainnya","Dana Investasi"]
const INVESTOR_CATS = ["Dana Investasi","Dana Investasi Modal","Dana Operasional","Dana Darurat","Dana Lainnya"]
const WARIST_CATS = ["Penjualan Warist"]

const today = () => new Date().toISOString().split("T")[0]

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
          <button type="button" onClick={onCancel} style={{ padding:"10px 20px", background:"transparent", border:"1px solid #3c4a42", borderRadius:8, color:"#bbcabf", cursor:"pointer", fontSize:13, fontWeight:700 }}>
            Batal
          </button>
          <button type="button" onClick={onConfirm} style={{ padding:"10px 20px", background:"#93000a", border:"none", borderRadius:8, color:"#ffdad6", cursor:"pointer", fontSize:13, fontWeight:700, display:"flex", alignItems:"center", gap:6 }}>
            <span className="material-symbols-outlined" style={{ fontSize:16 }}>delete</span>
            Hapus
          </button>
        </div>
      </div>
    </div>
  )
}

function parseRupiahValue(value: string | number) {
  if (typeof value === "number") return Number.isFinite(value) ? Math.round(value) : 0
  const cleaned = String(value).replace(/[^0-9-]/g, "")
  return cleaned.length > 0 ? Math.round(Number(cleaned)) : 0
}

function TxModal({
  mode, initial, onSave, onClose,
}: {
  mode: "add" | "edit"
  initial: Partial<Tx> & { type: TxType }
  onSave: (data: Omit<Tx,"id"|"no">) => void
  onClose: () => void
}) {
  const [form, setForm] = useState<Omit<Tx,"id"|"no"> & { jumlahInput: string; hargaInput: string }>({
    type:       initial.type     ?? "expense",
    date:       initial.date     ?? today(),
    category:   initial.category ?? "",
    buyer:      initial.buyer    ?? "",
    vol:        initial.vol      ?? 0,
    stock:      initial.stock    ?? undefined,
    sisa:       initial.sisa     ?? undefined,
    jumlah:     initial.jumlah   ?? 0,
    jumlahInput: initial.jumlah ? rupiah(initial.jumlah) : "",
    hargaInput:  initial.vol && initial.jumlah ? rupiah(Math.round(initial.jumlah / initial.vol)) : "",
    notes:      initial.notes    ?? "",
  })

  useEffect(() => {
    if (form.category === "") {
      let cats: string[] = []
      switch (form.type) {
        case "income": cats = INCOME_CATS; break
        case "investor_income": cats = INVESTOR_CATS; break
        case "warist": cats = WARIST_CATS; break
        case "expense": cats = EXP_CATS; break
      }
      if (cats.length > 0) setForm(f => ({ ...f, category: cats[0] }))
    }
  }, [form.type, form.category])

  const cats = (() => {
    switch (form.type) {
      case "income": return INCOME_CATS
      case "investor_income": return INVESTOR_CATS
      case "warist": return WARIST_CATS
      case "expense": return EXP_CATS
    }
  })()

  const set = (k: keyof typeof form, v: string | number | boolean) => {
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

  const typeLabels: Record<TxType, string> = {
    income: "Pemasukan",
    expense: "Pengeluaran",
    investor_income: "Pemasukan Investor",
    warist: "Dana Terpisah (Warist)"
  }

  const typeIcons: Record<TxType, string> = {
    income: "trending_up",
    expense: "trending_down",
    investor_income: "account_balance",
    warist: "star"
  }

  const typeColors: Record<TxType, { bg: string; text: string; highlight: string }> = {
    income: { bg: "#4edea3", text: "#003824", highlight: "#4edea3" },
    expense: { bg: "#ffb95f", text: "#2a1700", highlight: "#ffb95f" },
    investor_income: { bg: "#7c3aed", text: "#f3e8ff", highlight: "#a78bfa" },
    warist: { bg: "#fbbf24", text: "#451a03", highlight: "#fbbf24" }
  }

  const colors = typeColors[form.type]
  const hargaPerUnit = form.vol > 0 ? Math.round(form.jumlah / form.vol) : 0
  const subtotal = form.jumlah
  const showVolume = form.type !== "investor_income"

  return (
    <div
      style={{ position:"fixed", inset:0, zIndex:100, background:"rgba(0,0,0,0.82)", backdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background:"#2a2a2a", width:"100%", maxWidth:560, border:`1px solid ${colors.highlight}33`, boxShadow:"0 24px 64px rgba(0,0,0,0.6)", borderRadius:8, overflow:"hidden", display:"flex", flexDirection:"column", maxHeight:"calc(100vh - 48px)" }}>

        {/* Header */}
        <header style={{ height:64, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 24px", borderBottom:`1px solid ${colors.highlight}33`, background:"#353534", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <span className="material-symbols-outlined" style={{ color:colors.highlight, fontSize:22 }}>{typeIcons[form.type]}</span>
            <h2 style={{ margin:0, fontSize:22, fontWeight:600, color:"#e5e2e1", letterSpacing:"-0.01em" }}>
              {mode === "add" ? `Tambah ${typeLabels[form.type]}` : `Edit ${typeLabels[form.type]}`}
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

            {/* Type indicator */}
            <div style={{ display:"flex", padding:4, background:"#0e0e0e", borderRadius:8, border:`1px solid ${colors.highlight}33` }}>
              <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:8, padding:"10px 16px", borderRadius:6, background:colors.bg, color:colors.text, fontWeight:700, fontSize:11, letterSpacing:"0.05em", textTransform:"uppercase" }}>
                <span className="material-symbols-outlined" style={{ fontSize:18 }}>{typeIcons[form.type]}</span>
                {typeLabels[form.type]}
              </div>
            </div>

            {/* Tanggal + Kategori */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
              <div>
                <label style={labelStyle}>Tanggal</label>
                <input type="date" value={form.date} onChange={e => set("date", e.target.value)}
                  required style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = colors.highlight)}
                  onBlur={e => (e.target.style.borderColor = "#3c4a42")}
                />
              </div>
              <div style={{ position:"relative" }}>
                <label style={labelStyle}>Kategori</label>
                <div style={{ position:"relative" }}>
                  <select value={form.category} onChange={e => {
                      const value = e.target.value
                      if (form.type === "income" && value === "Dana Investasi") {
                        set("type", "investor_income")
                      }
                      set("category", value)
                    }}
                    style={{ ...inputStyle, appearance:"none", paddingRight:40, cursor:"pointer" }}
                    onFocus={e => (e.target.style.borderColor = colors.highlight)}
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

            {/* Item / Sumber */}
            <div>
              <label style={labelStyle}>{form.type === "investor_income" ? "Sumber Dana / Investor" : "Item / Nama"}</label>
              <div style={{ position:"relative" }}>
                <input
                  type="text"
                  value={form.buyer}
                  onChange={e => set("buyer", e.target.value)}
                  placeholder={form.type === "investor_income" ? "Contoh: PT Agri, Investor Lokal..." : "Contoh: Pakan Ayam, Vaksin..."}
                  style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = colors.highlight)}
                  onBlur={e => (e.target.style.borderColor = "#3c4a42")}
                />
                <span className="material-symbols-outlined" style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)", color:"#86948a", fontSize:20 }}>
                  {form.type === "investor_income" ? "business" : "inventory_2"}
                </span>
              </div>
            </div>

            {/* Qty — hanya untuk income, expense, warist */}
            {showVolume && (
              <div>
                <label style={labelStyle}>Kuantitas (Terjual)</label>
                <input
                  type="number" min={0} step="any"
                  value={form.vol || ""}
                  onChange={e => set("vol", +e.target.value)}
                  placeholder="0"
                  required
                  style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = colors.highlight)}
                  onBlur={e => (e.target.style.borderColor = "#3c4a42")}
                />
              </div>
            )}

            {/* Stok Telur & Sisa Telur — khusus income */}
            {form.type === "income" && (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                <div>
                  <label style={labelStyle}>Stok Telur (kg/butir)</label>
                  <input
                    type="number" step="any"
                    value={form.stock ?? ""}
                    onChange={e => set("stock", e.target.value === "" ? (undefined as unknown as number) : +e.target.value)}
                    placeholder="Stok awal (bisa minus)"
                    style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = colors.highlight)}
                    onBlur={e => (e.target.style.borderColor = "#3c4a42")}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Sisa Telur (kg/butir)</label>
                  <input
                    type="number" step="any"
                    value={form.sisa ?? ""}
                    onChange={e => set("sisa", e.target.value === "" ? (undefined as unknown as number) : +e.target.value)}
                    placeholder="Sisa (bisa minus)"
                    style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = colors.highlight)}
                    onBlur={e => (e.target.style.borderColor = "#3c4a42")}
                  />
                </div>
              </div>
            )}

            {/* Harga per Unit — hanya untuk income, expense, warist */}
            {showVolume && (
              <div>
                <label style={labelStyle}>Harga per Unit (Rp)</label>
                <div style={{ position:"relative" }}>
                  <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", color:"#bbcabf", fontSize:13, fontWeight:500 }}>Rp</span>
                  <input
                    type="text"
                    value={form.hargaInput}
                    onChange={e => {
                      const value = e.target.value
                      const newHarga = parseRupiahValue(value)
                      set("hargaInput", value)
                      set("jumlah", Math.round(form.vol * newHarga))
                    }}
                    placeholder="Rp0"
                    required
                    style={{ ...inputStyle, paddingLeft:40, textAlign:"right", fontVariantNumeric:"tabular-nums" }}
                    onFocus={e => (e.target.style.borderColor = colors.highlight)}
                    onBlur={e => (e.target.style.borderColor = "#3c4a42")}
                  />
                </div>
              </div>
            )}

            {/* Jumlah — untuk investor_income atau jika tidak ada qty */}
            {!showVolume && (
              <div>
                <label style={labelStyle}>Jumlah Dana (Rp)</label>
                <div style={{ position:"relative" }}>
                  <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", color:"#bbcabf", fontSize:13, fontWeight:500 }}>Rp</span>
                  <input
                    type="text"
                    value={form.jumlahInput}
                    onChange={e => {
                      const value = e.target.value
                      set("jumlahInput", value)
                      set("jumlah", parseRupiahValue(value))
                    }}
                    placeholder="Rp0"
                    required
                    style={{ ...inputStyle, paddingLeft:40, textAlign:"right", fontVariantNumeric:"tabular-nums" }}
                    onFocus={e => (e.target.style.borderColor = colors.highlight)}
                    onBlur={e => (e.currentTarget.style.borderColor = "#3c4a42")}
                  />
                </div>
              </div>
            )}

            {/* Subtotal Preview */}
            <div style={{ padding:16, background:`${colors.highlight}12`, border:`1px solid ${colors.highlight}25`, borderRadius:8 }}>
              <p style={{ margin:"0 0 8px", fontSize:11, fontWeight:700, color:"#bbcabf", textTransform:"uppercase", letterSpacing:"0.05em" }}>Total</p>
              <p style={{ margin:0, fontSize:24, fontWeight:700, color:colors.highlight, fontVariantNumeric:"tabular-nums" }}>
                {subtotal > 0 ? `Rp${subtotal.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}` : "Rp0"}
              </p>
              {showVolume && (
                <p style={{ margin:"8px 0 0", fontSize:12, color:"#86948a" }}>
                  {form.vol} × Rp{hargaPerUnit.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
                </p>
              )}
            </div>

            {/* Notes */}
            <div>
              <label style={labelStyle}>Catatan (Opsional)</label>
              <textarea
                value={form.notes}
                onChange={e => set("notes", e.target.value)}
                placeholder="Keterangan tambahan..."
                rows={3}
                style={{ ...inputStyle, resize:"none", lineHeight:1.6 }}
                onFocus={e => (e.target.style.borderColor = colors.highlight)}
                onBlur={e => (e.target.style.borderColor = "#3c4a42")}
              />
            </div>

            {/* Info box */}
            <div style={{ padding:16, background:`${colors.highlight}08`, border:`1px solid ${colors.highlight}20`, borderRadius:8, display:"flex", alignItems:"flex-start", gap:12 }}>
              <span className="material-symbols-outlined" style={{ color:colors.highlight, fontSize:20, marginTop:1 }}>info</span>
              <p style={{ margin:0, fontSize:14, color:"#bbcabf", lineHeight:1.6 }}>
                {form.type === "income" && `Pemasukan dari penjualan akan dicatat dalam Log Pemasukan dan memperbaharui saldo kas.`}
                {form.type === "expense" && `Pengeluaran akan dicatat dalam Log Pengeluaran dan mengurangi saldo kas.`}
                {form.type === "investor_income" && `Dana investor akan dicatat terpisah dan mempengaruhi total modal/investasi.`}
                {form.type === "warist" && `Dana warist (Penjualan Warist) tidak masuk kas utama namun tetap tercatat untuk transparansi.`}
              </p>
            </div>
          </div>

          {/* Footer */}
          <footer style={{ padding:"16px 24px", borderTop:`1px solid ${colors.highlight}33`, background:"#353534", display:"flex", alignItems:"center", justifyContent:"flex-end", gap:12, flexShrink:0 }}>
            <button type="button" onClick={onClose}
              style={{ padding:"10px 24px", background:"transparent", border:"1px solid transparent", borderRadius:8, color:"#bbcabf", cursor:"pointer", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", transition:"all 0.15s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#3c4a42"; (e.currentTarget as HTMLButtonElement).style.color = "#e5e2e1" }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "#bbcabf" }}
            >
              Batal
            </button>
            <button type="submit"
              style={{ padding:"10px 32px", background:colors.bg, border:"none", borderRadius:8, color:colors.text, cursor:"pointer", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", display:"flex", alignItems:"center", gap:8, boxShadow:`0 4px 16px ${colors.highlight}40`, transition:"filter 0.15s, transform 0.1s" }}
              onMouseEnter={e => (e.currentTarget.style.filter = "brightness(1.1)")}
              onMouseLeave={e => (e.currentTarget.style.filter = "brightness(1)")}
            >
              <span className="material-symbols-outlined" style={{ fontSize:18 }}>save</span>
              Simpan
            </button>
          </footer>
        </form>
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

type OpsCategoryKey = "pakan" | "vaksinVitamin" | "listrik" | "makanRokok" | "gaji" | "kebersihan" | "lainnya"

function categorizeExpenseItem(category: string): OpsCategoryKey {
  const c = category.toLowerCase()
  if (/pakan|feed|karung/.test(c)) return "pakan"
  if (/vaksin|vitamin|vitachick|neobro|obat|trimezyn|egg stimulan|mineral ayam|betadine|vetagumbosept|vita stress|em 4|flu ayam|cacing/.test(c)) return "vaksinVitamin"
  if (/listrik|token|lampu|air|kipas|exhaust|kabel|blower|penghangat|emergency|penghangat|paralon|selang|fitting/.test(c)) return "listrik"
  if (/bersih|wipol|sapu|serokan|kebersihan|roundup|racun lalat|pengusir|sikat/.test(c)) return "kebersihan"
  if (/rokok|makan pekerja|kopi|biaya makan/.test(c)) return "makanRokok"
  if (/gaji|gajian|thr|kasbon/.test(c)) return "gaji"
  return "lainnya"
}

const OPS_CATEGORY_META: Record<OpsCategoryKey, { nama: string; icon: string }> = {
  pakan:         { nama: "Pakan Ayam",       icon: "inventory" },
  vaksinVitamin: { nama: "Vaksin & Vitamin", icon: "vaccines" },
  listrik:       { nama: "Listrik & Air",    icon: "bolt" },
  kebersihan:    { nama: "Kebersihan",       icon: "cleaning_services" },
  makanRokok:    { nama: "Makan & Rokok",    icon: "restaurant" },
  gaji:          { nama: "Gaji Karyawan",    icon: "groups" },
  lainnya:       { nama: "Lainnya",          icon: "more_horiz" },
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function FinanceClient({
  initialTransactions,
  initialInventoryTotal,
}: {
  initialTransactions: Tx[]
  initialInventoryTotal: number
}) {
  const router = useRouter()
  const mounted = useMounted()
  const [txList, setTxList] = useState<Tx[]>(initialTransactions)
  const [, startTransition] = useTransition()
  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [defaultType, setDefaultType] = useState<TxType>("expense")
  const [editTx, setEditTx] = useState<Tx | null>(null)
  const [deleteTx, setDeleteTx] = useState<Tx | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: "alert" | "success" | "warning" } | null>(null)
  const [activeNav, setActiveNav] = useState("Finance")
  const [periodeIdx, setPeriodeIdx] = useState(0) // will be set after dynamicBiayaOperasional is computed
  const [txTab, setTxTab] = useState<TabType>("income")

  // Dynamic transaction-based calculations
  const incomeList = txList.filter(t => t.type === "income")
  const expenseList = txList.filter(t => t.type === "expense")
  const investorList = txList.filter(t => t.type === "investor_income")
  const waristList = txList.filter(t => t.type === "warist")

  const liveIncome = incomeList.reduce((a,b) => a + b.jumlah, 0)
  const liveExpense = expenseList.reduce((a,b) => a + b.jumlah, 0)
  const liveInvestor = investorList.reduce((a,b) => a + b.jumlah, 0)
  const liveWarist = waristList.reduce((a,b) => a + b.jumlah, 0)

  const totalIncome = liveIncome
  const totalExpense = liveExpense
  const totalInvestor = liveInvestor
  const totalWarist = liveWarist

  // Provide dynamic stok data source for income table. By default use static data from livestock; can be mapped to external sheet later.
  const dynamicStokTelurBulanan: StokTelurBulan[] = deriveDynamicStokTelurBulanan()

  // Compute Penjualan Telur from actual transactions (includes DB + sheet imports)
  const penjualanTelurValue = txList
    .filter(t => t.type === "income" && String(t.category).toLowerCase().includes("penjualan telur"))
    .reduce((sum, t) => sum + (Number(t.jumlah) || 0), 0)

  const dynamicPenjualanBulanan = useMemo(() => {
    const byMonth = new Map<string, { bulan: string; periode: string; total: number }>()

    incomeList.forEach(tx => {
      const date = new Date(tx.date)
      if (Number.isNaN(date.getTime())) return

      const year = date.getFullYear()
      const month = date.getMonth() + 1


      const periode = `${year}-${String(month).padStart(2, "0")}`
      const bulan = `${date.toLocaleString("id-ID", { month: "short" })} ${String(year).slice(-2)}`
      const current = byMonth.get(periode)

      byMonth.set(periode, {
        bulan,
        periode,
        total: (current?.total ?? 0) + tx.jumlah,
      })
    })

    return Array.from(byMonth.values()).sort((a, b) => a.periode.localeCompare(b.periode))
  }, [incomeList])

  const dynamicMonthlyFinanceData = useMemo(() => {
    const byMonth = new Map<string, {
      bulan: string
      periode: string
      penjualan: number
      pengeluaran: number
    }>()

    const addMonth = (dateStr: string, amount: number, field: "penjualan" | "pengeluaran") => {
      const date = new Date(dateStr)
      if (Number.isNaN(date.getTime())) return

      const year = date.getFullYear()
      const month = date.getMonth() + 1
      const periode = `${year}-${String(month).padStart(2, "0")}`
      const bulan = `${date.toLocaleString("id-ID", { month: "short" })} ${String(year).slice(-2)}`
      const current = byMonth.get(periode) ?? { bulan, periode, penjualan: 0, pengeluaran: 0 }
      current[field] += amount
      byMonth.set(periode, current)
    }

    expenseList.forEach(tx => addMonth(tx.date, tx.jumlah, "pengeluaran"))
    incomeList.forEach(tx => addMonth(tx.date, tx.jumlah, "penjualan"))

    const months = Array.from(byMonth.values())
      .map(item => ({
        ...item,
        selisih: item.penjualan - item.pengeluaran,
      }))
      .sort((a, b) => a.periode.localeCompare(b.periode))

    return months
  }, [incomeList, expenseList])

  const dynamicDetailOpsPerBulan = useMemo(() => {
    const byMonth = new Map<string, {
      bulan: string
      periode: string
      pakan: number
      vaksinVitamin: number
      listrik: number
      makanRokok: number
      gaji: number
      kebersihan: number
      lainnya: number
      total: number
    }>()

    const ensureMonth = (dateStr: string) => {
      const date = new Date(dateStr)
      if (Number.isNaN(date.getTime())) return null
      const year = date.getFullYear()
      const month = date.getMonth() + 1
      const periode = `${year}-${String(month).padStart(2, "0")}`
      const bulan = `${date.toLocaleString("id-ID", { month: "short" })} ${String(year).slice(-2)}`
      const existing = byMonth.get(periode)
      if (existing) return existing
      const next = {
        bulan,
        periode,
        pakan: 0,
        vaksinVitamin: 0,
        listrik: 0,
        makanRokok: 0,
        gaji: 0,
        kebersihan: 0,
        lainnya: 0,
        total: 0,
      }
      byMonth.set(periode, next)
      return next
    }

    expenseList.forEach(tx => {
      const monthData = ensureMonth(tx.date)
      if (!monthData) return
      const field = categorizeExpenseItem(tx.category)
      monthData[field] += tx.jumlah
      monthData.total += tx.jumlah
    })

    const months = Array.from(byMonth.values()).sort((a, b) => a.periode.localeCompare(b.periode))
    return months
  }, [expenseList])

  // ─── Dynamic Operational Expenses widget (from actual expense transactions) ──
  const dynamicBiayaOperasional = useMemo(() => {
    // Budget targets from the latest static period (used as spending targets)
    const BUDGETS: Record<OpsCategoryKey, number> = {
      pakan: 13_000_000, vaksinVitamin: 500_000, listrik: 800_000,
      kebersihan: 300_000, makanRokok: 1_800_000, gaji: 1_500_000, lainnya: 5_000_000,
    }
    const keys: OpsCategoryKey[] = ["pakan","vaksinVitamin","listrik","kebersihan","makanRokok","gaji","lainnya"]
    return dynamicDetailOpsPerBulan.map(month => ({
      bulan: month.bulan,
      items: keys
        .filter(k => month[k] > 0)
        .map(k => ({
          nama: OPS_CATEGORY_META[k].nama,
          icon: OPS_CATEGORY_META[k].icon,
          jumlah: month[k],
          budget: BUDGETS[k],
        })),
      total: month.total,
    }))
  }, [dynamicDetailOpsPerBulan])

  const totalPemasukanKasUtama = totalIncome + totalInvestor
  const totalPemasukan = totalPemasukanKasUtama + totalWarist
  const totalInventory = initialInventoryTotal
  const totalExpenseOps = totalExpense + totalInventory
  const kasUtama = totalPemasukanKasUtama - totalExpenseOps
  const kasWarist = totalWarist
  const totalMasuk = totalPemasukan
  const totalKeluar = totalExpenseOps
  const combinedBalance = totalMasuk - totalKeluar
  
  const balanceStatus = combinedBalance > 0 ? "Plus" : combinedBalance < 0 ? "Minus" : "Netral"
  const balanceColor = combinedBalance > 0 ? "#4edea3" : combinedBalance < 0 ? "#ffb4ab" : "#ffb95f"
  const balanceBg = combinedBalance > 0 ? "rgba(78,222,163,0.08)" : combinedBalance < 0 ? "rgba(255,180,171,0.08)" : "rgba(255,185,95,0.08)"
  const balanceBorder = combinedBalance > 0 ? "rgba(78,222,163,0.35)" : combinedBalance < 0 ? "rgba(255,180,171,0.35)" : "rgba(255,185,95,0.35)"
  const balanceIcon = combinedBalance > 0 ? "check_circle" : combinedBalance < 0 ? "report_problem" : "info"
  
  const lastMonthTotal = dynamicPenjualanBulanan[dynamicPenjualanBulanan.length - 1]?.total ?? 0
  // Use last complete month for target achievement (skip current partial month)
  const now = new Date()
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  const completedMonths = dynamicPenjualanBulanan.filter(m => {
    const d = new Date(m.periode + "-01")
    return d.getFullYear() < now.getFullYear() || d.getMonth() + 1 < now.getMonth() + 1
  })
  const targetMonth = completedMonths.length > 0
    ? completedMonths[completedMonths.length - 1]
    : dynamicPenjualanBulanan[dynamicPenjualanBulanan.length - 1]
  const targetMonthTotal = targetMonth?.total ?? 0
  const targetMonthLabel = targetMonth?.bulan ?? "—"
  const gaugePct = Math.min((targetMonthTotal / 25_000_000) * 100, 100)
  // Use dynamic biaya operasional data (from actual expense transactions)
  const effectivePeriodeIdx = dynamicBiayaOperasional.length > 0
    ? Math.min(periodeIdx >= 0 ? periodeIdx : 0, dynamicBiayaOperasional.length - 1)
    : 0
  // Auto-set to last period on first render
  const [periodeIdxInitialized, setPeriodeIdxInitialized] = useState(false)
  useEffect(() => {
    if (!periodeIdxInitialized && dynamicBiayaOperasional.length > 0) {
      setPeriodeIdx(dynamicBiayaOperasional.length - 1)
      setPeriodeIdxInitialized(true)
    }
  }, [dynamicBiayaOperasional.length, periodeIdxInitialized])

  const periode = dynamicBiayaOperasional[effectivePeriodeIdx] ?? { bulan: "—", items: [], total: 0 }
  const operationalExpenseCurrent = periode.total
  const totalOps = dynamicBiayaOperasional.reduce((a,b) => a + b.total, 0)

  const generateFinanceAlert = useCallback(() => {
    if (combinedBalance < 0) {
      return {
        title: "⚠️ Saldo negatif",
        desc: `Total pemasukan: ${rupiah(totalPemasukan, true)} — Biaya operasional ${periode.bulan}: ${rupiah(operationalExpenseCurrent, true)}`,
        type: "error" as const,
        priority: 1,
      }
    }

    if (combinedBalance === 0) {
      return {
        title: "⚡ Saldo seimbang",
        desc: `Saldo total = total pemasukan (termasuk dana terpisah) - biaya operasional periode ${periode.bulan}`,
        type: "warning" as const,
        priority: 2,
      }
    }

    if (kasUtama > 0) {
      return {
        title: "✓ Saldo sehat",
        desc: `Kas utama mencukupi biaya operasional ${periode.bulan}: ${rupiah(operationalExpenseCurrent, true)}`,
        type: "success" as const,
        priority: 3,
      }
    }

    return {
      title: "⚡ Kas utama negatif",
      desc: `Saldo total positif berkat dana terpisah, tetapi kas utama belum menutupi biaya operasional ${periode.bulan}`,
      type: "warning" as const,
      priority: 2,
    }
  }, [combinedBalance, kasUtama, kasWarist, operationalExpenseCurrent, totalPemasukan, periode.bulan])

  // Auto-show financial alert when transaction data changes
  useEffect(() => {
    const alert = generateFinanceAlert()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToast({
      msg: `${alert.title} · Total: ${rupiah(combinedBalance)}`,
      type: alert.type === "error" ? "alert" : (alert.type as "success" | "warning"),
    })
  }, [generateFinanceAlert, combinedBalance])

  const showToast = useCallback((msg: string, type: "success"|"error" = "success") => {
    setToast({ msg, type: type === "success" ? "success" : "alert" })
  }, [])

  // ── CRUD handlers ──────────────────────────────────────────────────────────

  function openAdd(type: TxType = "expense") {
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
          showToast(`${savedTx.no} berhasil disimpan.`)
        } else if (modalMode === "edit" && editTx) {
          setTxList(prev => prev.map(t => t.id === editTx.id ? savedTx : t))
          showToast(`${savedTx.no} berhasil diperbarui.`)
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
        showToast(`${tx.no} dihapus.`, "error")
        setDeleteTx(null)
        router.refresh()
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Gagal menghapus transaksi.", "error")
      }
    })
  }

  const filteredTx = txList.filter(t => t.type === txTab)

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
                <button onClick={() => openAdd("income")} style={{ background:"#4edea3", color:"#003824", padding:"12px 24px", fontWeight:600, borderRadius:8, border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:8, fontSize:14 }}>
                  <span className="material-symbols-outlined" style={{ fontSize:20 }}>trending_up</span>
                  Tambah Pemasukan
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
                        <div style={{ fontSize:20, fontWeight:700, color: gaugePct >= 100 ? "#4edea3" : gaugePct >= 50 ? "#ffb95f" : "#ffb4ab" }}>
                          {mounted ? rupiah(targetMonthTotal) : "—"}
                        </div>
                        <div style={{ fontSize:13, color:"#bbcabf", marginTop:2 }}>Penjualan {targetMonthLabel}</div>
                        <div style={{ fontSize:11, color:"#86948a", marginTop:2 }}>Target: {rupiah(25_000_000, true)}/bln</div>
                      </div>
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                      {[
                        { label:"Total Pemasukan (Kas Utama)", val: mounted ? rupiah(totalPemasukanKasUtama) : "—", border:"#4edea3" },
                        { label:"Total Pengeluaran Ops",       val: mounted ? rupiah(totalExpenseOps)                 : "—", border:"#ffb95f" },
                        { label:"Pengeluaran Transaksi",        val: mounted ? rupiah(totalExpense)                    : "—", border:"#ff8a80" },
                        { label:"Total Inventory",              val: mounted ? rupiah(totalInventory)                  : "—", border:"#89ceff" },
                        { label:"Penjualan Telur",              val: mounted ? rupiah(penjualanTelurValue)             : "—", border:"#4edea3" },
                        { label:"Investasi",                    val: mounted ? rupiah(totalInvestor)                  : "—", border:"#a78bfa" },
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
                          {mounted ? `${waristList.reduce((a: number, b: Tx) => a + b.vol, 0)} ekor ayam afkir · dana terpisah` : "ekor ayam afkir · dana terpisah"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bar chart */}
                <div className="industrial-card" style={{ padding:24 }}>
                  <h3 style={{ fontSize:16, fontWeight:600, color:"#e5e2e1", margin:"0 0 20px" }}>Pendapatan per Bulan</h3>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={dynamicPenjualanBulanan} margin={{ top:4, right:0, left:-15, bottom:0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2e2e2e" vertical={false}/>
                      <XAxis dataKey="bulan" tick={{ fontSize:10, fill:"#bbcabf" }} tickLine={false} axisLine={false}/>
                      <YAxis tick={{ fontSize:10, fill:"#bbcabf" }} tickLine={false} axisLine={false} tickFormatter={v => rupiah(v,true)}/>
                      <Tooltip content={<DarkTip/>} cursor={{ fill:"rgba(78,222,163,0.05)" }}/>
                      <Bar dataKey="total" name="Pendapatan" radius={[4,4,0,0]}>
                        {dynamicPenjualanBulanan.map((d,i) => (
                          <Cell key={i} fill={d.total>=20_000_000?"#4edea3":d.total>=10_000_000?"#89ceff":"#ffb95f"} fillOpacity={0.85}/>
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* ── Transactions Table with CRUD ── */}
                <div className="industrial-card" style={{ overflow:"hidden" }}>
                  {/* Table toolbar */}
                  <div style={{ padding:"0 16px", borderBottom:"1px solid #3c4a42", display:"flex", alignItems:"center", justifyContent:"space-between", overflowX:"auto" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:2 }}>
                      {([
                        ["income", "Pemasukan", "trending_up", "#4edea3"],
                        ["expense", "Pengeluaran", "trending_down", "#ffb95f"],
                        ["investor_income", "Investasi", "account_balance", "#a78bfa"],
                        ["warist", "Dana Terpisah", "star", "#fbbf24"],
                      ] as const).map(([val, lbl, icon, color]) => (
                        <button key={val} onClick={() => setTxTab(val)} style={{
                          padding:"12px 14px", background:"transparent", border:"none",
                          borderBottom:`2px solid ${txTab===val ? color : "transparent"}`,
                          color: txTab===val ? color : "#bbcabf",
                          fontWeight: txTab===val ? 600 : 400, cursor:"pointer", fontSize:12, transition:"all 0.15s",
                          display:"flex", alignItems:"center", gap:6, whiteSpace:"nowrap",
                        }}>
                          <span className="material-symbols-outlined" style={{ fontSize:16, color }}>{icon}</span>
                          {lbl}
                          {(() => {
                            const count = txList.filter(t => t.type === val).length
                            return count > 0 ? (
                              <span style={{ fontSize:10, fontWeight:700, padding:"2px 6px", borderRadius:12, background:`${color}20`, color }}>
                                {count}
                              </span>
                            ) : null
                          })()}
                        </button>
                      ))}
                    </div>
                    <div style={{ display:"flex", gap:8, alignItems:"center", flexShrink:0 }}>
                      <button 
                        onClick={() => openAdd(txTab)} 
                        style={{ background:`${txTab === "income" ? "#4edea3" : txTab === "expense" ? "#ffb95f" : txTab === "investor_income" ? "#a78bfa" : "#fbbf24"}15`, color: txTab === "income" ? "#4edea3" : txTab === "expense" ? "#ffb95f" : txTab === "investor_income" ? "#a78bfa" : "#fbbf24", padding:"6px 12px", fontSize:11, fontWeight:700, borderRadius:6, border:`1px solid ${txTab === "income" ? "#4edea3" : txTab === "expense" ? "#ffb95f" : txTab === "investor_income" ? "#a78bfa" : "#fbbf24"}35`, cursor:"pointer", display:"flex", alignItems:"center", gap:6, transition:"all 0.15s", whiteSpace:"nowrap" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.8" }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "1" }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize:16 }}>add</span>
                        {txTab === "income" ? "Tambah Pemasukan" : txTab === "expense" ? "Tambah Pengeluaran" : txTab === "investor_income" ? "Tambah Investasi" : "Tambah Dana"}
                      </button>
                    </div>
                  </div>

                  <div style={{ overflowX:"auto" }}>
                      <table style={{ width:"100%", borderCollapse:"collapse", textAlign:"left" }}>
                      <thead style={{ background:"#1E1E1E" }}>
                        <tr>
                          <th style={{ padding:"12px 24px", width:40 }}><input type="checkbox"/></th>
                          {
                            (txTab === "income"
                              ? ["Tanggal", "Item", "Qty", "Harga (Rp)", "Subtotal (Rp)", "Stok Telur (kg)", "Telur Terjual (kg)", "Sisa Telur (kg)", "Aksi"]
                              : ["Tanggal", "Item", "Qty", "Harga (Rp)", "Subtotal (Rp)", "Aksi"]
                            ).map((h,i,headers) => {
                              const isLast = i === headers.length - 1
                              const textAlign = isLast ? "center" : i === 0 || i === 1 ? "left" : "right"
                              return (
                                <th key={h} style={{ padding:"12px 24px", fontSize:11, fontWeight:700, color:"#bbcabf", textTransform:"uppercase", letterSpacing:"0.05em", textAlign }}>{h}</th>
                              )
                            })
                          }
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTx.length === 0 && (
                          <tr><td colSpan={txTab === "income" ? 10 : 7} style={{ padding:"32px 24px", textAlign:"center", color:"#bbcabf", fontSize:14 }}>
                            {txTab === "income" && "Belum ada data pemasukan. Klik tombol \"Tambah Pemasukan\" untuk menambahkan."}
                            {txTab === "expense" && "Belum ada data pengeluaran. Klik tombol \"Tambah Pengeluaran\" untuk menambahkan."}
                            {txTab === "investor_income" && "Belum ada data investasi. Klik tombol \"Tambah Investasi\" untuk menambahkan."}
                            {txTab === "warist" && "Belum ada data dana terpisah. Klik tombol \"Tambah Dana\" untuk menambahkan."}
                          </td></tr>
                        )}
                        {filteredTx.map((tx, index) => {
                          const qty = tx.vol || 0
                          const harga = tx.harga ?? (qty > 0 ? Math.round(tx.jumlah / qty) : tx.jumlah)
                          const subtotal = tx.jumlah
                          return (
                          <tr key={`${tx.type}-${tx.id}-${index}`} className="tx-row">
                            <td style={{ padding:"13px 24px" }}><input type="checkbox"/></td>
                            <td style={{ padding:"13px 24px", fontSize:13, color:"#bbcabf" }}>{tx.date}</td>
                            <td style={{ padding:"13px 24px", fontSize:13, color:"#e5e2e1" }}>{tx.buyer || tx.category}</td>
                            <td style={{ padding:"13px 24px", textAlign:"right", fontSize:13, color:"#bbcabf" }}>{qty || "-"}</td>
                            <td style={{ padding:"13px 24px", textAlign:"right", fontSize:13, color:"#bbcabf", fontVariantNumeric:"tabular-nums" }}>
                              {harga.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
                            </td>
                            <td style={{ padding:"13px 24px", textAlign:"right", fontSize:13, fontWeight:600, color:"#4edea3", fontVariantNumeric:"tabular-nums" }}>
                              {subtotal.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
                            </td>
                            {/* Stock columns only apply to egg sales from expense.xlsx. */}
                            {txTab === "income" && (() => {
                              const d = new Date(tx.date)
                              const year = d.getFullYear()
                              const month = String(d.getMonth() + 1).padStart(2, "0")
                              const periode = `${year}-${month}`
                              const stokEntry = dynamicStokTelurBulanan.find((s: StokTelurBulan) => s.periode === periode)
                              const stockValue = tx.stock ?? stokEntry?.stokKg
                              const terjualValue = tx.vol || stokEntry?.terjualKg
                              const sisaValue = tx.sisa ?? stokEntry?.sisaKg
                              return (
                                <>
                                  <td style={{ padding:"13px 24px", textAlign:"right", fontSize:13, color:"#4edea3" }}>{stockValue != null ? stockValue.toFixed(1) : "-"}</td>
                                  <td style={{ padding:"13px 24px", textAlign:"right", fontSize:13, color:"#89ceff" }}>{terjualValue != null ? terjualValue.toFixed(1) : "-"}</td>
                                  <td style={{ padding:"13px 24px", textAlign:"right", fontSize:13, color:"#ffb95f" }}>{sisaValue != null ? sisaValue.toFixed(1) : "-"}</td>
                                </>
                              )
                            })()}
                            <td style={{ padding:"13px 24px", textAlign:"center" }}>
                              <div style={{ display:"flex", justifyContent:"center", gap:12 }}>
                                <button type="button"
                                  onClick={() => openEdit(tx)}
                                  style={{ background:"transparent", border:"none", color:"#bbcabf", cursor:"pointer", lineHeight:0, transition:"color 0.15s" }}
                                  onMouseEnter={e => (e.currentTarget.style.color = "#4edea3")}
                                  onMouseLeave={e => (e.currentTarget.style.color = "#bbcabf")}
                                  title="Edit">
                                  <span className="material-symbols-outlined" style={{ fontSize:20 }}>edit</span>
                                </button>
                                <button type="button"
                                  onClick={() => setDeleteTx(tx)}
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
                    <span style={{ color:"#bbcabf" }}>{filteredTx.length} {txTab === "income" ? "pemasukan" : txTab === "expense" ? "pengeluaran" : txTab === "investor_income" ? "investasi" : "dana terpisah"} ditampilkan</span>
                    <span style={{ color: txTab === "income" ? "#4edea3" : txTab === "expense" ? "#ffb95f" : txTab === "investor_income" ? "#a78bfa" : "#fbbf24", fontWeight:700 }}>
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
                      <button onClick={() => setPeriodeIdx(Math.min(dynamicBiayaOperasional.length-1, periodeIdx+1))} style={{ background:"transparent", border:"none", color:"#bbcabf", cursor:"pointer", lineHeight:0 }}>
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
                  <p style={{ fontSize:13, color:"#bbcabf", marginTop:4 }}>Data aktual live dari transaksi · Otomatis mengikuti data terbaru</p>
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
                    <span style={{ fontSize:18, fontWeight:700, color:"#4edea3" }}>{rupiah(dynamicMonthlyFinanceData.reduce((a,b)=>a+b.penjualan,0), true)}</span>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart data={dynamicMonthlyFinanceData} margin={{ top:4, right:8, left:-8, bottom:0 }} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2e2e2e" vertical={false}/>
                    <XAxis dataKey="bulan" tick={{ fontSize:10, fill:"#bbcabf" }} tickLine={false} axisLine={false}/>
                    <YAxis tick={{ fontSize:10, fill:"#bbcabf" }} tickLine={false} axisLine={false} tickFormatter={v=>rupiah(v,true)} width={72}/>
                    <Tooltip
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      content={({ active, payload, label }: any) => {
                        if (!active || !payload?.length) return null
                        const d = dynamicMonthlyFinanceData.find(x=>x.bulan===label)
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
                      {dynamicMonthlyFinanceData.map((_,i)=>(
                        <Cell key={i} fill="#4edea3" fillOpacity={0.85}/>
                      ))}
                    </Bar>
                    <Bar dataKey="pengeluaran" name="Pengeluaran" radius={[3,3,0,0]} maxBarSize={28}>
                      {dynamicMonthlyFinanceData.map((_,i)=>(
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
                    { label:"Bulan Untung",  val:`${dynamicMonthlyFinanceData.filter(d=>d.selisih>0).length} bulan`, color:"#4edea3", icon:"trending_up" },
                    { label:"Bulan Rugi",    val:`${dynamicMonthlyFinanceData.filter(d=>d.selisih<=0).length} bulan`, color:"#ff8a80", icon:"trending_down" },
                    { label:"Pengeluaran Tertinggi", val:rupiah(Math.max(...dynamicMonthlyFinanceData.map(d=>d.pengeluaran)),true), color:"#ffb95f", icon:"arrow_upward" },
                    { label:"Pendapatan Tertinggi",  val:rupiah(Math.max(...dynamicMonthlyFinanceData.map(d=>d.penjualan)),true),   color:"#4edea3", icon:"star" },
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
                  <BarChart data={dynamicDetailOpsPerBulan} margin={{ top:4, right:8, left:-8, bottom:0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2e2e2e" vertical={false}/>
                    <XAxis dataKey="bulan" tick={{ fontSize:10, fill:"#bbcabf" }} tickLine={false} axisLine={false}/>
                    <YAxis tick={{ fontSize:10, fill:"#bbcabf" }} tickLine={false} axisLine={false} tickFormatter={v=>rupiah(v,true)} width={72}/>
                    <Tooltip
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      content={({ active, payload, label }: any) => {
                        if (!active || !payload?.length) return null
                        const d = dynamicDetailOpsPerBulan.find(x=>x.bulan===label)
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

      {toast && (
        <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)}/>
      )}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </>
  )
}
