"use client"

import { logout } from "@/lib/auth"

import { fmtInt } from "@/lib/fmt"

import { useState, useEffect, useCallback, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts"
import {
  flockSummary as staticFlockSummary, pengadaanAyam,
  pertumbuhanMingguan, biayaPembesaran, stokTelurBulanan,
  rupiah, ageLabel, fmtDate, type Batch, type VaksinasiRecord,
  calculateFlockSummary, generateLivestockAlerts, type LivestockAlert,
} from "@/data/livestock"
import {
  deleteLivestockBatchAction,
  deleteLivestockVaccinationAction,
  saveLivestockBatchAction,
  saveLivestockVaccinationAction,
} from "@/app/livestock/actions"

// ─── Nav ─────────────────────────────────────────────────────────────────────
const NAV = [
  { label:"Dashboard",  icon:"dashboard",   href:"/dashboard" },
  { label:"Production", icon:"egg",          href:"/produksi" },
  { label:"Finance",    icon:"payments",     href:"/finance" },
  { label:"Livestock",  icon:"pets",         href:"/livestock" },
  { label:"Inventory",  icon:"inventory_2", href:"/inventory" },
]

const VAKSIN_NAMES = [
  "Vaksin ND Lasota","Vaksin MLS 50 DS","Vaksin MLS 1000 DS",
  "Vaksin IB H120","Vaksin Gumboro","Vaksin AI H5N1","Vaksin Coryza",
]
const SATUAN_LIST = ["botol","pcs","vl","ampul","sachet","tablet"]

// ─── Shared styles ────────────────────────────────────────────────────────────
const inp: React.CSSProperties = {
  width:"100%", background:"#0e0e0e", border:"1px solid #3c4a42",
  borderRadius:8, padding:"12px 14px", color:"#e5e2e1",
  fontSize:14, outline:"none", fontFamily:"inherit", transition:"border-color 0.15s",
}
const lbl: React.CSSProperties = {
  fontSize:11, fontWeight:700, color:"#bbcabf",
  textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:8,
}
const today = () => new Date().toISOString().split("T")[0]

// ─── Reusable field focus handlers ────────────────────────────────────────────
const onFocus = (e: React.FocusEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) =>
  (e.target.style.borderColor = "#4edea3")
const onBlur = (e: React.FocusEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) =>
  (e.target.style.borderColor = "#3c4a42")

// ─── Population bar ───────────────────────────────────────────────────────────
function PopulationBar({ flockSummary }: { flockSummary: typeof staticFlockSummary }) {
  const { aktif, mati, dijual, totalDibeli } = flockSummary
  const bars = [
    { label:"Aktif",  val:aktif,  w:(aktif/totalDibeli)*100,  color:"#4edea3" },
    { label:"Mati",   val:mati,   w:(mati/totalDibeli)*100,   color:"#ffb4ab" },
    { label:"Dijual", val:dijual, w:(dijual/totalDibeli)*100,  color:"#ffb95f" },
  ]
  return (
    <div>
      <div style={{ display:"flex", height:12, borderRadius:6, overflow:"hidden", gap:2 }}>
        {bars.map(b => <div key={b.label} style={{ width:`${b.w}%`, background:b.color }}/>)}
      </div>
      <div style={{ display:"flex", gap:16, marginTop:8 }}>
        {bars.map(b => (
          <div key={b.label} style={{ display:"flex", alignItems:"center", gap:6, fontSize:12 }}>
            <div style={{ width:8, height:8, borderRadius:2, background:b.color }}/>
            <span style={{ color:"#bbcabf" }}>{b.label}: <strong style={{ color:"#e5e2e1" }}>{b.val}</strong></span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────
interface DarkTipProps {
  active?: boolean
  payload?: Array<{ name?: string; value?: number; stroke?: string; fill?: string }>
  label?: string
}

function DarkTip({ active, payload, label }: DarkTipProps) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:"#201f1f", border:"1px solid #3c4a42", borderRadius:8, padding:"10px 14px", fontSize:12 }}>
      <p style={{ color:"#bbcabf", marginBottom:6, fontWeight:600 }}>{label}</p>
      {payload.map((p: { name?: string; value?: number; stroke?: string; fill?: string }, i: number) => (
        <div key={i} style={{ display:"flex", gap:8, alignItems:"center" }}>
          <div style={{ width:8, height:8, borderRadius:2, background:p.stroke||p.fill||"#4edea3" }}/>
          <span style={{ color:"#e5e2e1" }}>
            {p.name}: {p.value && p.value > 1000 ? rupiah(p.value,true) : `${p.value ?? 0}${p.name==="Berat"?" g":p.name==="Mortalitas"?"%":""}`}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, type, onClose }: { msg:string; type:"success"|"error"; onClose:()=>void }) {
  useEffect(() => { const t = setTimeout(onClose, 2800); return () => clearTimeout(t) }, [onClose])
  return (
    <div style={{
      position:"fixed", bottom:24, right:24, zIndex:200,
      background:type==="success"?"rgba(78,222,163,0.12)":"rgba(255,180,171,0.12)",
      border:`1px solid ${type==="success"?"#4edea3":"#ffb4ab"}`,
      borderRadius:10, padding:"12px 20px", display:"flex", alignItems:"center", gap:10,
      minWidth:280, backdropFilter:"blur(8px)", boxShadow:"0 8px 32px rgba(0,0,0,0.4)",
    }}>
      <span className="material-symbols-outlined" style={{ color:type==="success"?"#4edea3":"#ffb4ab", fontSize:20 }}>
        {type==="success"?"check_circle":"error"}
      </span>
      <span style={{ fontSize:14, color:"#e5e2e1" }}>{msg}</span>
    </div>
  )
}

// ─── Delete Dialog ────────────────────────────────────────────────────────────
function DeleteDialog({ label, desc, onConfirm, onCancel }: {
  label:string; desc:string; onConfirm:()=>void; onCancel:()=>void
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key==="Escape") onCancel() }
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h)
  }, [onCancel])
  return (
    <div style={{ position:"fixed", inset:0, zIndex:130, background:"rgba(0,0,0,0.82)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:"#2a2a2a", border:"1px solid #3c4a42", borderRadius:12, width:"100%", maxWidth:420, overflow:"hidden" }}>
        <div style={{ padding:"20px 24px", borderBottom:"1px solid #3c4a42", display:"flex", alignItems:"center", gap:12 }}>
          <span className="material-symbols-outlined" style={{ color:"#ffb4ab", fontSize:22 }}>warning</span>
          <h3 style={{ margin:0, fontSize:18, fontWeight:600, color:"#e5e2e1" }}>Hapus {label}</h3>
        </div>
        <div style={{ padding:"20px 24px" }}>
          <p style={{ color:"#bbcabf", fontSize:14, lineHeight:1.6, margin:0 }} dangerouslySetInnerHTML={{ __html: desc }}/>
          <p style={{ fontSize:12, color:"#86948a", margin:"8px 0 0" }}>Tindakan ini tidak bisa dibatalkan.</p>
        </div>
        <div style={{ padding:"16px 24px", borderTop:"1px solid #3c4a42", display:"flex", justifyContent:"flex-end", gap:12 }}>
          <button onClick={onCancel} style={{ padding:"10px 20px", background:"transparent", border:"1px solid #3c4a42", borderRadius:8, color:"#bbcabf", cursor:"pointer", fontSize:13, fontWeight:700 }}>Batal</button>
          <button onClick={onConfirm} style={{ padding:"10px 20px", background:"#93000a", border:"none", borderRadius:8, color:"#ffdad6", cursor:"pointer", fontSize:13, fontWeight:700, display:"flex", alignItems:"center", gap:6 }}>
            <span className="material-symbols-outlined" style={{ fontSize:16 }}>delete</span>Hapus
          </button>
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// MODAL 1 — BATCH
// ────────────────────────────────────────────────────────────────────────────
function BatchModal({ mode, initial, onSave, onClose }: {
  mode:"add"|"edit"; initial:Partial<Batch>; // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSave:(d:any)=>void; onClose:()=>void
}) {
  const [form, setForm] = useState({
    masuk:  initial.masuk  ?? today(),
    jumlah: initial.jumlah ?? 0,
    tahun:  initial.tahun  ?? 1,
    bulan:  initial.bulan  ?? 0,
    hari:   initial.hari   ?? 0,
    status: initial.status ?? "active" as "active"|"partial"|"closed",
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key==="Escape") onClose() }
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h)
  }, [onClose])

  return (
    <div style={{ position:"fixed", inset:0, zIndex:120, background:"rgba(0,0,0,0.82)", backdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
      onClick={e => { if (e.target===e.currentTarget) onClose() }}>
      <div style={{ background:"#2a2a2a", width:"100%", maxWidth:520, border:"1px solid #3c4a42", borderRadius:8, overflow:"hidden", display:"flex", flexDirection:"column", maxHeight:"calc(100vh - 48px)" }}>

        {/* Header */}
        <header style={{ height:64, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 24px", borderBottom:"1px solid #3c4a42", background:"#353534", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <span className="material-symbols-outlined" style={{ color:"#4edea3", fontSize:22 }}>pets</span>
            <h2 style={{ margin:0, fontSize:20, fontWeight:600, color:"#e5e2e1" }}>
              {mode==="add" ? "Add New Batch" : `Edit ${initial.id}`}
            </h2>
          </div>
          <button onClick={onClose} style={{ background:"transparent", border:"none", color:"#bbcabf", cursor:"pointer", padding:8, borderRadius:"50%", lineHeight:0 }}
            onMouseEnter={e=>(e.currentTarget.style.background="#3a3939")} onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>

        {/* Body */}
        <form onSubmit={e => { e.preventDefault(); onSave(form) }} style={{ overflowY:"auto", flex:1, display:"flex", flexDirection:"column", gap:0 }}>
          <div style={{ padding:24, display:"flex", flexDirection:"column", gap:20 }}>

            {/* Toggle tipe (visual only untuk konsistensi dengan referensi) */}
            <div style={{ display:"flex", padding:4, background:"#0e0e0e", borderRadius:8, border:"1px solid #3c4a42" }}>
              <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:8, padding:"10px 16px", borderRadius:6, background:"#10b981", color:"#00422b", fontWeight:700, fontSize:11, letterSpacing:"0.05em", textTransform:"uppercase" }}>
                <span className="material-symbols-outlined" style={{ fontSize:18 }}>add_circle</span>
                {mode==="add" ? "New Batch" : "Edit Batch"}
              </div>
            </div>

            {/* Tanggal + Jumlah */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
              <div>
                <label style={lbl}>Tanggal Masuk</label>
                <input type="date" value={form.masuk} onChange={e=>set("masuk",e.target.value)} required style={inp} onFocus={onFocus} onBlur={onBlur}/>
              </div>
              <div>
                <label style={lbl}>Jumlah Ayam (ekor)</label>
                <div style={{ position:"relative" }}>
                  <input type="number" min={1} value={form.jumlah||""} onChange={e=>set("jumlah",+e.target.value)} required placeholder="0" style={inp} onFocus={onFocus} onBlur={onBlur}/>
                  <span style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)", fontSize:12, color:"#86948a" }}>ekor</span>
                </div>
              </div>
            </div>

            {/* Usia */}
            <div>
              <label style={lbl}>Usia Ayam Saat Ini</label>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
                {([["tahun","Tahun"],["bulan","Bulan"],["hari","Hari"]] as [string,string][]).map(([k,l]) => (
                  <div key={k}>
                    <div style={{ fontSize:11, color:"#86948a", marginBottom:6, fontWeight:600 }}>{l}</div>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    <input type="number" min={0} value={(form as any)[k]||""} onChange={e=>set(k,+e.target.value)} placeholder="0" style={inp} onFocus={onFocus} onBlur={onBlur}/>
                  </div>
                ))}
              </div>
              {(form.tahun > 0 || form.bulan > 0 || form.hari > 0) && (
                <p style={{ fontSize:12, color:"#4edea3", marginTop:8 }}>
                  → {ageLabel(form.tahun, form.bulan, form.hari)}
                </p>
              )}
            </div>

            {/* Status */}
            <div>
              <label style={lbl}>Status Batch</label>
              <div style={{ display:"flex", gap:8 }}>
                {(["active","partial","closed"] as const).map(s => (
                  <button key={s} type="button" onClick={() => set("status",s)} style={{
                    flex:1, padding:"11px 8px", borderRadius:8, border:"1px solid",
                    cursor:"pointer", fontSize:12, fontWeight:700, transition:"all 0.15s",
                    borderColor: form.status===s ? (s==="active"?"#4edea3":s==="partial"?"#ffb95f":"#86948a") : "#3c4a42",
                    background:  form.status===s ? (s==="active"?"rgba(78,222,163,0.1)":s==="partial"?"rgba(255,185,95,0.1)":"rgba(134,148,138,0.1)") : "transparent",
                    color:       form.status===s ? (s==="active"?"#4edea3":s==="partial"?"#ffb95f":"#86948a") : "#bbcabf",
                  }}>
                    <div style={{ fontSize:16, marginBottom:2 }}>
                      {s==="active"?"✓":s==="partial"?"~":"✗"}
                    </div>
                    {s==="active"?"Active":s==="partial"?"Partial":"Closed"}
                  </button>
                ))}
              </div>
            </div>

            {/* Catatan */}
            <div>
              <label style={lbl}>Catatan (opsional)</label>
              <textarea placeholder="Kondisi ayam, asal DOC, catatan khusus..." rows={3}
                style={{ ...inp, resize:"none", lineHeight:1.6 }} onFocus={onFocus} onBlur={onBlur}/>
            </div>

            {/* Info box */}
            <div style={{ padding:14, background:"rgba(78,222,163,0.05)", border:"1px solid rgba(78,222,163,0.18)", borderRadius:8, display:"flex", gap:10, alignItems:"flex-start" }}>
              <span className="material-symbols-outlined" style={{ color:"#4edea3", fontSize:18, marginTop:2 }}>info</span>
              <p style={{ margin:0, fontSize:13, color:"#bbcabf", lineHeight:1.6 }}>
                {mode==="add"
                  ? <>Batch baru akan tercatat di <strong style={{ color:"#4edea3" }}>Livestock Register</strong> dan memperbarui summary populasi Kandang P-882.</>
                  : <>Perubahan akan langsung diperbarui di <strong style={{ color:"#4edea3" }}>Livestock Register</strong> dan semua laporan terkait.</>
                }
              </p>
            </div>
          </div>

          {/* Footer */}
          <footer style={{ padding:"16px 24px", borderTop:"1px solid #3c4a42", background:"#353534", display:"flex", justifyContent:"flex-end", gap:12, flexShrink:0 }}>
            <button type="button" onClick={onClose}
              style={{ padding:"10px 24px", background:"transparent", border:"1px solid transparent", borderRadius:8, color:"#bbcabf", cursor:"pointer", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em" }}
              onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.borderColor="#3c4a42";(e.currentTarget as HTMLButtonElement).style.color="#e5e2e1"}}
              onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.borderColor="transparent";(e.currentTarget as HTMLButtonElement).style.color="#bbcabf"}}>
              Cancel
            </button>
            <button type="submit"
              style={{ padding:"10px 28px", background:"#4edea3", border:"none", borderRadius:8, color:"#003824", cursor:"pointer", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", display:"flex", alignItems:"center", gap:8, boxShadow:"0 4px 16px rgba(78,222,163,0.22)" }}
              onMouseEnter={e=>(e.currentTarget.style.filter="brightness(1.1)")} onMouseLeave={e=>(e.currentTarget.style.filter="brightness(1)")}>
              <span className="material-symbols-outlined" style={{ fontSize:18 }}>save</span>
              {mode==="add" ? "Save Batch" : "Update Batch"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// MODAL 2 — VACCINATION
// ────────────────────────────────────────────────────────────────────────────
function VaksinasiModal({ mode, initial, batchIds, onSave, onClose }: {
  mode:"add"|"edit"
  initial:Partial<VaksinasiRecord>
  batchIds:string[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSave:(d:any)=>void
  onClose:()=>void
}) {
  const [form, setForm] = useState({
    tanggal:       initial.tanggal    ?? new Date().toISOString().split("T")[0],
    nama:          initial.nama       ?? VAKSIN_NAMES[0],
    customNama:    "",
    qty:           initial.qty        ?? 0,
    satuan:        initial.satuan     ?? "botol",
    harga:         initial.harga      ?? 0,
    selectedBatch: initial.batch ? initial.batch.split(",").map((s:string)=>s.trim()) : [] as string[],
    catatan:       "",
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  const subtotal = form.qty * form.harga

  function toggleBatch(id: string) {
    setForm(f => ({
      ...f,
      selectedBatch: f.selectedBatch.includes(id)
        ? f.selectedBatch.filter(b => b !== id)
        : [...f.selectedBatch, id],
    }))
  }

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key==="Escape") onClose() }
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h)
  }, [onClose])

  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    if (!form.qty) return
    onSave({
      tanggal: form.tanggal,
      nama:    form.nama === "__custom__" ? form.customNama : form.nama,
      qty:     form.qty,
      satuan:  form.satuan,
      harga:   form.harga,
      subtotal,
      batch:   form.selectedBatch.length ? form.selectedBatch.join(", ") : "—",
    })
  }

  return (
    <div style={{ position:"fixed", inset:0, zIndex:120, background:"rgba(0,0,0,0.82)", backdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
      onClick={e => { if (e.target===e.currentTarget) onClose() }}>
      <div style={{ background:"#2a2a2a", width:"100%", maxWidth:560, border:"1px solid #3c4a42", borderRadius:8, overflow:"hidden", display:"flex", flexDirection:"column", maxHeight:"calc(100vh - 48px)" }}>

        {/* Header */}
        <header style={{ height:64, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 24px", borderBottom:"1px solid #3c4a42", background:"#353534", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <span className="material-symbols-outlined" style={{ color:"#89ceff", fontSize:22 }}>vaccines</span>
            <h2 style={{ margin:0, fontSize:20, fontWeight:600, color:"#e5e2e1" }}>
              {mode==="add" ? "Add Vaccination Record" : "Edit Vaccination Record"}
            </h2>
          </div>
          <button onClick={onClose} style={{ background:"transparent", border:"none", color:"#bbcabf", cursor:"pointer", padding:8, borderRadius:"50%", lineHeight:0 }}
            onMouseEnter={e=>(e.currentTarget.style.background="#3a3939")} onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ overflowY:"auto", flex:1, display:"flex", flexDirection:"column" }}>
          <div style={{ padding:24, display:"flex", flexDirection:"column", gap:20 }}>

            {/* Toggle visual */}
            <div style={{ display:"flex", padding:4, background:"#0e0e0e", borderRadius:8, border:"1px solid #3c4a42" }}>
              <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:8, padding:"10px 16px", borderRadius:6, background:"rgba(137,206,255,0.12)", color:"#89ceff", fontWeight:700, fontSize:11, letterSpacing:"0.05em", textTransform:"uppercase", border:"1px solid rgba(137,206,255,0.25)" }}>
                <span className="material-symbols-outlined" style={{ fontSize:18 }}>vaccines</span>
                {mode==="add" ? "New Vaccination" : "Edit Record"}
              </div>
            </div>

            {/* Tanggal + Nama vaksin */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
              <div>
                <label style={lbl}>Tanggal Vaksinasi</label>
                <input type="date" value={form.tanggal} onChange={e=>set("tanggal",e.target.value)} required style={inp} onFocus={onFocus} onBlur={onBlur}/>
              </div>
              <div>
                <label style={lbl}>Nama Vaksin</label>
                <div style={{ position:"relative" }}>
                  <select value={form.nama} onChange={e=>set("nama",e.target.value)}
                    style={{ ...inp, appearance:"none", paddingRight:40, cursor:"pointer" }} onFocus={onFocus} onBlur={onBlur}>
                    {VAKSIN_NAMES.map(n => <option key={n} value={n}>{n}</option>)}
                    <option value="__custom__">— Lainnya (ketik manual) —</option>
                  </select>
                  <span className="material-symbols-outlined" style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", color:"#bbcabf", fontSize:18, pointerEvents:"none" }}>expand_more</span>
                </div>
              </div>
            </div>

            {/* Custom vaksin name */}
            {form.nama === "__custom__" && (
              <div>
                <label style={lbl}>Nama Vaksin (manual)</label>
                <input type="text" placeholder="Masukkan nama vaksin..." style={inp} onFocus={onFocus} onBlur={onBlur}
                  onChange={e => set("nama", e.target.value || "__custom__")}/>
              </div>
            )}

            {/* Qty + Satuan + Harga */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
              <div>
                <label style={lbl}>Qty</label>
                <input type="number" min={1} value={form.qty||""} onChange={e=>set("qty",+e.target.value)} required placeholder="0" style={inp} onFocus={onFocus} onBlur={onBlur}/>
              </div>
              <div>
                <label style={lbl}>Satuan</label>
                <div style={{ position:"relative" }}>
                  <select value={form.satuan} onChange={e=>set("satuan",e.target.value)}
                    style={{ ...inp, appearance:"none", paddingRight:32, cursor:"pointer" }} onFocus={onFocus} onBlur={onBlur}>
                    {SATUAN_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <span className="material-symbols-outlined" style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", color:"#bbcabf", fontSize:16, pointerEvents:"none" }}>expand_more</span>
                </div>
              </div>
              <div>
                <label style={lbl}>Harga / unit (Rp)</label>
                <input type="number" min={0} step={500} value={form.harga||""} onChange={e=>set("harga",+e.target.value)} placeholder="0" style={inp} onFocus={onFocus} onBlur={onBlur}/>
              </div>
            </div>

            {/* Subtotal preview */}
            {subtotal > 0 && (
              <div style={{ padding:"10px 14px", background:"rgba(78,222,163,0.07)", borderRadius:8, border:"1px solid rgba(78,222,163,0.18)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ fontSize:13, color:"#bbcabf" }}>Subtotal ({form.qty} × {rupiah(form.harga)})</span>
                <span style={{ fontSize:16, fontWeight:700, color:"#4edea3" }}>{rupiah(subtotal)}</span>
              </div>
            )}

            {/* Batch selection */}
            <div>
              <label style={lbl}>Batch yang Divaksinasi *</label>
              <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                {batchIds.map(id => {
                  const selected = form.selectedBatch.includes(id)
                  return (
                    <button key={id} type="button" onClick={() => toggleBatch(id)} style={{
                      padding:"8px 14px", borderRadius:8, border:"1px solid",
                      cursor:"pointer", fontSize:12, fontWeight:700, transition:"all 0.15s",
                      borderColor: selected ? "#4edea3" : "#3c4a42",
                      background:  selected ? "rgba(78,222,163,0.12)" : "transparent",
                      color:       selected ? "#4edea3" : "#bbcabf",
                      display:"flex", alignItems:"center", gap:6,
                    }}>
                      <span className="material-symbols-outlined" style={{ fontSize:14 }}>
                        {selected ? "check_box" : "check_box_outline_blank"}
                      </span>
                      {id}
                    </button>
                  )
                })}
              </div>
              {form.selectedBatch.length === 0 && (
                <p style={{ fontSize:12, color: submitted ? "#ffb4ab" : "#86948a", marginTop:6, display:"flex", alignItems:"center", gap:4 }}>
                  <span className="material-symbols-outlined" style={{ fontSize:14 }}>{submitted ? "error" : "info"}</span>
                  {submitted ? "Pilih minimal satu batch sebelum menyimpan." : "Pilih batch yang akan divaksinasi."}
                </p>
              )}
              {form.selectedBatch.length > 0 && (
                <p style={{ fontSize:12, color:"#4edea3", marginTop:6 }}>
                  {form.selectedBatch.length} batch dipilih: {form.selectedBatch.join(", ")}
                </p>
              )}
            </div>

            {/* Catatan */}
            <div>
              <label style={lbl}>Catatan (opsional)</label>
              <textarea value={form.catatan} onChange={e=>set("catatan",e.target.value)}
                placeholder="Kondisi ayam saat vaksinasi, metode pemberian, reaksi yang diamati..." rows={3}
                style={{ ...inp, resize:"none", lineHeight:1.6 }} onFocus={onFocus} onBlur={onBlur}/>
            </div>

            {/* Info box */}
            <div style={{ padding:14, background:"rgba(137,206,255,0.05)", border:"1px solid rgba(137,206,255,0.18)", borderRadius:8, display:"flex", gap:10, alignItems:"flex-start" }}>
              <span className="material-symbols-outlined" style={{ color:"#89ceff", fontSize:18, marginTop:2 }}>info</span>
              <p style={{ margin:0, fontSize:13, color:"#bbcabf", lineHeight:1.6 }}>
                {mode==="add"
                  ? <>Record vaksinasi akan masuk ke <strong style={{ color:"#89ceff" }}>Vaccination Log</strong> dan dicatat ke riwayat kesehatan batch yang dipilih.</>
                  : <>Perubahan akan diperbarui di <strong style={{ color:"#89ceff" }}>Vaccination Log</strong> secara langsung.</>
                }
              </p>
            </div>
          </div>

          {/* Footer */}
          <footer style={{ padding:"16px 24px", borderTop:"1px solid #3c4a42", background:"#353534", display:"flex", justifyContent:"flex-end", gap:12, flexShrink:0 }}>
            <button type="button" onClick={onClose}
              style={{ padding:"10px 24px", background:"transparent", border:"1px solid transparent", borderRadius:8, color:"#bbcabf", cursor:"pointer", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em" }}
              onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.borderColor="#3c4a42";(e.currentTarget as HTMLButtonElement).style.color="#e5e2e1"}}
              onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.borderColor="transparent";(e.currentTarget as HTMLButtonElement).style.color="#bbcabf"}}>
              Cancel
            </button>
            <button type="submit"
              style={{ padding:"10px 28px", background:"#89ceff", border:"none", borderRadius:8, color:"#001e2f", cursor:"pointer", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", display:"flex", alignItems:"center", gap:8, boxShadow:"0 4px 16px rgba(137,206,255,0.2)" }}
              onMouseEnter={e=>(e.currentTarget.style.filter="brightness(1.1)")} onMouseLeave={e=>(e.currentTarget.style.filter="brightness(1)")}>
              <span className="material-symbols-outlined" style={{ fontSize:18 }}>save</span>
              {mode==="add" ? "Save Record" : "Update Record"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// PAGE
// ────────────────────────────────────────────────────────────────────────────
export default function LivestockClient({
  initialBatches,
  initialVaccinations,
}: {
  initialBatches: Batch[]
  initialVaccinations: VaksinasiRecord[]
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  // ─── Batch state ───────────────────────────────────────────────────────────
  const [batchList, setBatchList]     = useState(initialBatches)
  const [batchModal, setBatchModal]   = useState<"add"|"edit"|null>(null)
  const [editBatch, setEditBatch]     = useState<Batch|null>(null)
  const [deleteBatch, setDeleteBatch] = useState<Batch|null>(null)

  // ─── Vaccination state ─────────────────────────────────────────────────────
  const [vakList, setVakList]         = useState<VaksinasiRecord[]>(initialVaccinations)
  const [vakModal, setVakModal]       = useState<"add"|"edit"|null>(null)
  const [editVak, setEditVak]         = useState<VaksinasiRecord|null>(null)
  const [deleteVak, setDeleteVak]     = useState<VaksinasiRecord|null>(null)

  // ─── UI state ──────────────────────────────────────────────────────────────
  const [toast, setToast]             = useState<{msg:string;type:"success"|"error"}|null>(null)
  const [activeNav, setActiveNav]     = useState("Livestock")
  const [activeTab, setActiveTab]     = useState<"overview"|"batches"|"vaccination"|"stok"|"growth">("overview")

  const showToast = useCallback((msg:string, type:"success"|"error"="success") => setToast({msg,type}), [])

  // ─── Batch CRUD ────────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function saveBatch(data: any) {
    const id = batchModal === "edit" ? editBatch?.id ?? null : null
    startTransition(async () => {
      try {
        const savedBatch = await saveLivestockBatchAction(id, data)
        if (batchModal==="add") {
          setBatchList(p => [...p, savedBatch])
          showToast(`${savedBatch.id} berhasil ditambahkan.`)
        } else if (editBatch) {
          setBatchList(p => p.map(b => b.id===editBatch.id ? savedBatch : b))
          showToast(`${savedBatch.id} berhasil diperbarui.`)
        }
        setBatchModal(null); setEditBatch(null)
        router.refresh()
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Gagal menyimpan batch.", "error")
      }
    })
  }
  function confirmDeleteBatch() {
    if (!deleteBatch) return
    const batch = deleteBatch
    startTransition(async () => {
      try {
        await deleteLivestockBatchAction(batch.id)
        setBatchList(p => p.filter(b => b.id!==batch.id))
        showToast(`${batch.id} dihapus.`, "error")
        setDeleteBatch(null)
        router.refresh()
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Gagal menghapus batch.", "error")
      }
    })
  }

  // ─── Vaccination CRUD ──────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function saveVak(data: any) {
    const no = vakModal === "edit" ? editVak?.no ?? null : null
    startTransition(async () => {
      try {
        const savedVak = await saveLivestockVaccinationAction(no, data)
        if (vakModal==="add") {
          setVakList(p => [...p, savedVak].sort((a, b) => a.no - b.no))
          showToast("Record vaksinasi berhasil disimpan.")
        } else if (editVak) {
          setVakList(p => p.map(v => v.no===editVak.no ? savedVak : v))
          showToast("Record vaksinasi berhasil diperbarui.")
        }
        setVakModal(null); setEditVak(null)
        router.refresh()
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Gagal menyimpan record vaksinasi.", "error")
      }
    })
  }
  function confirmDeleteVak() {
    if (!deleteVak) return
    const vaccination = deleteVak
    startTransition(async () => {
      try {
        await deleteLivestockVaccinationAction(vaccination.no)
        setVakList(p => p.filter(v => v.no!==vaccination.no))
        showToast("Record vaksinasi dihapus.", "error")
        setDeleteVak(null)
        router.refresh()
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Gagal menghapus record vaksinasi.", "error")
      }
    })
  }

  // ─── Dynamic flock summary & alerts ──────────────────────────────────────────
  const flockSummary = calculateFlockSummary(batchList)
  const livestockAlerts: LivestockAlert[] = generateLivestockAlerts(
    flockSummary,
    batchList,
    vakList,
    stokTelurBulanan,
    biayaPembesaran
  )

  const batchIds      = batchList.map(b => b.id)
  const totalVakBiaya = vakList.reduce((a,b) => a+b.subtotal, 0)
  const filteredBatchList = batchList
  const filteredVakList = vakList

  const TABS = [
    { key:"overview",    label:"Overview" },
    { key:"batches",     label:"Batch Management" },
    { key:"vaccination", label:"Vaccination Log" },
    { key:"stok",        label:"Stok Telur" },
    { key:"growth",      label:"Growth Chart" },
  ] as const

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap');
        .material-symbols-outlined { font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24; vertical-align:middle; display:inline-block; line-height:1; }
        .ic { background:#121212; border:1px solid #2e2e2e; border-radius:12px; }
        .nav-link { display:flex; align-items:center; gap:12px; padding:10px 12px; border-radius:8px; text-decoration:none; transition:background 0.15s,color 0.15s; color:#bbcabf; font-size:15px; }
        .nav-link:hover { background:#353534; color:#e5e2e1; }
        .nav-link.active { background:#10b981; color:#00422b; font-weight:600; }
        .tr { border-bottom:1px solid #3c4a42; transition:background 0.12s; }
        .tr:hover { background:rgba(42,42,42,0.55); }
        .tr:last-child { border-bottom:none; }
        * { box-sizing:border-box; }
        ::-webkit-scrollbar { width:5px; height:5px; }
        ::-webkit-scrollbar-track { background:#121212; }
        ::-webkit-scrollbar-thumb { background:#3c4a42; border-radius:3px; }
        select option { background:#1c1b1b; color:#e5e2e1; }
        input[type=date]::-webkit-calendar-picker-indicator { filter:invert(0.6); }
        @keyframes led { 0%,100%{opacity:1;box-shadow:0 0 6px rgba(255,180,171,0.5)} 50%{opacity:0.4;box-shadow:0 0 14px rgba(255,180,171,0.9)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
      `}</style>

      <div style={{ display:"flex", minHeight:"100vh", background:"#050505", color:"#e5e2e1", fontFamily:"'Inter',sans-serif" }}>

        {/* ── Sidebar ── */}
        <aside style={{ width:256, flexShrink:0, background:"#201f1f", borderRight:"1px solid #3c4a42", display:"flex", flexDirection:"column", padding:"24px 0", position:"sticky", top:0, height:"100vh", zIndex:50 }}>
          <div style={{ padding:"0 24px", marginBottom:32 }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:40, height:40, borderRadius:8, background:"#4edea3", display:"flex", alignItems:"center", justifyContent:"center", color:"#003824" }}>
                <span className="material-symbols-outlined">agriculture</span>
              </div>
              <div>
                <div style={{ fontSize:16, fontWeight:600, color:"#4edea3" }}>Farm Command</div>
                <div style={{ fontSize:11, fontWeight:700, color:"#bbcabf", textTransform:"uppercase", letterSpacing:"0.05em" }}>Facility ID: P-882</div>
              </div>
            </div>
          </div>
          <nav style={{ flex:1, padding:"0 16px", display:"flex", flexDirection:"column", gap:2 }}>
            {NAV.map(({ label, icon, href }) => (
              <Link key={label} href={href} className={`nav-link${activeNav===label?" active":""}`} onClick={() => setActiveNav(label)}>
                <span className="material-symbols-outlined" style={{ fontSize:20 }}>{icon}</span>{label}
              </Link>
            ))}
          </nav>
          <div style={{ padding:"20px 16px 0", borderTop:"1px solid #3c4a42", display:"flex", flexDirection:"column", gap:4 }}>
            {[{label:"Logs",icon:"history"},{label:"Logout",icon:"logout"}].map(({label,icon}) => (
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
          <header style={{ height:64, background:"rgba(5,5,5,0.9)", backdropFilter:"blur(12px)", borderBottom:"1px solid #3c4a42", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 24px", position:"sticky", top:0, zIndex:40 }}>
            <div style={{ display:"flex", alignItems:"center", gap:24 }}>
              <h1 style={{ fontSize:22, fontWeight:600, color:"#4edea3", margin:0 }}>PoultryPro Analytics</h1>
              <div style={{ width:1, height:32, background:"#3c4a42" }}/>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ display:"flex" }}>
                {["notifications","settings","help"].map(ic => (
                  <button key={ic} style={{ padding:8, background:"transparent", border:"none", color:"#bbcabf", cursor:"pointer", borderRadius:"50%", lineHeight:0 }}>
                    <span className="material-symbols-outlined">{ic}</span>
                  </button>
                ))}
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:8, padding:"4px 10px", borderRadius:24, background:"#201f1f", border:"1px solid #3c4a42" }}>
                <div style={{ width:30, height:30, borderRadius:"50%", background:"linear-gradient(135deg,#10b981,#4edea3)", display:"flex", alignItems:"center", justifyContent:"center", color:"#003824", fontWeight:700, fontSize:11 }}>KA</div>
                <span style={{ fontSize:11, fontWeight:700, color:"#e5e2e1", textTransform:"uppercase" }}>Farm Manager</span>
              </div>
            </div>
          </header>

          <div style={{ padding:24, maxWidth:1600, margin:"0 auto", width:"100%" }}>
            {/* Page header */}
            <div style={{ marginBottom:28, display:"flex", alignItems:"flex-end", justifyContent:"space-between", flexWrap:"wrap", gap:16 }}>
              <div>
                <h2 style={{ fontSize:40, fontWeight:700, color:"#e5e2e1", margin:0, letterSpacing:"-0.02em", lineHeight:1.1 }}>Livestock Management</h2>
                <p style={{ color:"#bbcabf", marginTop:8, fontSize:14 }}>5 batch ayam petelur — populasi, vaksinasi & pertumbuhan DOC · Kandang P-882</p>
              </div>
              <div style={{ display:"flex", gap:12 }}>
                <button onClick={() => { setEditBatch(null); setBatchModal("add") }}
                  style={{ background:"#4edea3", color:"#003824", padding:"12px 24px", fontWeight:600, borderRadius:8, border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:8, fontSize:14 }}>
                  <span className="material-symbols-outlined" style={{ fontSize:20 }}>add</span>New Batch
                </button>
                <button onClick={() => { setEditVak(null); setVakModal("add") }}
                  style={{ background:"transparent", color:"#89ceff", padding:"12px 24px", fontWeight:600, borderRadius:8, border:"1px solid rgba(137,206,255,0.35)", cursor:"pointer", display:"flex", alignItems:"center", gap:8, fontSize:14 }}>
                  <span className="material-symbols-outlined" style={{ fontSize:20 }}>vaccines</span>Add Vaccination
                </button>
              </div>
            </div>

            {/* KPI Cards */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:24 }}>
              {[
                { label:"Total Dibeli",   val:`${fmtInt(flockSummary.totalDibeli)} ekor`, icon:"shopping_cart", color:"#89ceff", sub:"5 batch DOC" },
                { label:"Ayam Aktif",     val:`${fmtInt(flockSummary.aktif)} ekor`,       icon:"pets",          color:"#4edea3", sub:`${flockSummary.persentaseAktif}% dari total` },
                { label:"Total Kematian", val:`${fmtInt(flockSummary.mati)} ekor`,        icon:"warning",       color:"#ffb4ab", sub:`${flockSummary.persentaseMati}% mortalitas` },
                { label:"Record Vaksin",  val:`${vakList.length} record`,                          icon:"vaccines",      color:"#ffb95f", sub:`Total: ${rupiah(totalVakBiaya,true)}` },
              ].map((k,i) => (
                <div key={i} className="ic" style={{ padding:16, position:"relative", overflow:"hidden" }}
                  onMouseEnter={e=>(e.currentTarget.style.borderColor=k.color)} onMouseLeave={e=>(e.currentTarget.style.borderColor="#2e2e2e")}>
                  <div style={{ position:"absolute", top:0, right:0, padding:12, opacity:0.15 }}>
                    <span className="material-symbols-outlined" style={{ fontSize:40, color:k.color }}>{k.icon}</span>
                  </div>
                  <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:`linear-gradient(to right, ${k.color}40, transparent)` }}/>
                  <p style={{ fontSize:11, fontWeight:700, color:"#bbcabf", textTransform:"uppercase", letterSpacing:"0.05em", margin:"0 0 8px" }}>{k.label}</p>
                  <p style={{ fontSize:26, fontWeight:700, color:k.color, margin:"0 0 4px", lineHeight:1 }}>{k.val}</p>
                  <p style={{ fontSize:12, color:"#86948a", margin:0 }}>{k.sub}</p>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div style={{ display:"flex", borderBottom:"1px solid #3c4a42", marginBottom:24 }}>
              {TABS.map(t => (
                <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
                  padding:"12px 20px", background:"transparent", border:"none",
                  borderBottom:`2px solid ${activeTab===t.key?"#4edea3":"transparent"}`,
                  color:activeTab===t.key?"#4edea3":"#bbcabf",
                  fontWeight:activeTab===t.key?700:400, cursor:"pointer", fontSize:14, transition:"all 0.15s",
                }}>{t.label}</button>
              ))}
            </div>

            {/* ═══ OVERVIEW ═══ */}
            {activeTab==="overview" && (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(12,1fr)", gap:16 }}>
                <div className="ic" style={{ gridColumn:"span 7", padding:24, position:"relative", overflow:"hidden" }}>
                  <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:"linear-gradient(to right, rgba(78,222,163,0.25), transparent)" }}/>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
                    <h3 style={{ fontSize:18, fontWeight:600, color:"#e5e2e1", display:"flex", alignItems:"center", gap:8, margin:0 }}>
                      <span className="material-symbols-outlined" style={{ color:"#4edea3" }}>donut_large</span>Distribusi Populasi
                    </h3>
                    <span style={{ fontSize:11, fontWeight:700, color:"#bbcabf", textTransform:"uppercase" }}>Total: {fmtInt(flockSummary.totalDibeli)} ekor</span>
                  </div>
                  <PopulationBar flockSummary={flockSummary}/>
                  <div style={{ marginTop:20, display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
                    {[
                      { label:"Ayam Aktif",      val:flockSummary.aktif,  pct:flockSummary.persentaseAktif, color:"#4edea3" },
                      { label:"Total Kematian",  val:flockSummary.mati,   pct:flockSummary.persentaseMati,  color:"#ffb4ab" },
                      { label:"Dijual (Afkir)",  val:flockSummary.dijual, pct:+(flockSummary.dijual/flockSummary.totalDibeli*100).toFixed(1), color:"#ffb95f" },
                    ].map((s,i) => (
                      <div key={i} style={{ background:"#1c1b1b", borderRadius:8, padding:"14px 16px", borderLeft:`3px solid ${s.color}` }}>
                        <div style={{ fontSize:11, fontWeight:700, color:"#bbcabf", textTransform:"uppercase" }}>{s.label}</div>
                        <div style={{ fontSize:22, fontWeight:700, color:s.color, marginTop:4 }}>{fmtInt(s.val)}</div>
                        <div style={{ fontSize:11, color:"#86948a", marginTop:2 }}>{s.pct}% dari total</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop:20 }}>
                    <h4 style={{ fontSize:14, fontWeight:600, color:"#e5e2e1", margin:"0 0 12px" }}>Biaya Pembesaran DOC</h4>
                    <ResponsiveContainer width="100%" height={130}>
                      <BarChart data={biayaPembesaran} margin={{ top:4, right:0, left:-15, bottom:0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2e2e2e" vertical={false}/>
                        <XAxis dataKey="kategori" tick={{ fontSize:10, fill:"#bbcabf" }} tickLine={false} axisLine={false}/>
                        <YAxis tick={{ fontSize:10, fill:"#bbcabf" }} tickLine={false} axisLine={false} tickFormatter={v=>rupiah(v,true)}/>
                        <Tooltip content={<DarkTip/>}/>
                        <Bar dataKey="jumlah" name="Biaya" radius={[4,4,0,0]}>
                          {biayaPembesaran.map((d,i) => <Cell key={i} fill={d.warna} fillOpacity={0.85}/>)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="ic" style={{ gridColumn:"span 5", overflow:"hidden", display:"flex", flexDirection:"column" }}>
                  <div style={{ padding:"16px 24px", borderBottom:"1px solid #3c4a42", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <h3 style={{ fontSize:16, fontWeight:600, color:"#e5e2e1", margin:0 }}>Critical Alerts</h3>
                    <span style={{ background:"#93000a", color:"#ffdad6", fontSize:10, fontWeight:700, padding:"3px 8px", borderRadius:20 }}>1 ACTION REQUIRED</span>
                  </div>
                  <div style={{ flex:1 }}>
                    {livestockAlerts.map((a,i) => (
                      <div key={i} style={{ padding:16, borderBottom:"1px solid rgba(60,74,66,0.5)", transition:"background 0.15s", cursor:"pointer" }}
                        onMouseEnter={e=>(e.currentTarget.style.background="#1E1E1E")} onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
                        <div style={{ display:"flex", gap:12 }}>
                          <div style={{ width:8, height:8, borderRadius:"50%", background:a.color, marginTop:6, flexShrink:0, ...(a.pulse?{animation:"led 2s infinite"}:{}) }}/>
                          <div style={{ flex:1 }}>
                            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                              <span style={{ fontSize:14, fontWeight:600, color:"#e5e2e1" }}>{a.title}</span>
                              <span style={{ fontSize:10, color:"#bbcabf" }}>{a.time}</span>
                            </div>
                            <p style={{ fontSize:12, color:"#bbcabf", margin:0, lineHeight:1.5 }}>{a.desc}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ padding:"16px 24px", borderTop:"1px solid #3c4a42" }}>
                    <h4 style={{ fontSize:13, fontWeight:600, color:"#e5e2e1", margin:"0 0 12px" }}>Pengadaan DOC</h4>
                    {pengadaanAyam.map((p,i) => (
                      <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:i<pengadaanAyam.length-1?"1px solid rgba(60,74,66,0.3)":"none" }}>
                        <div>
                          <div style={{ fontSize:12, color:"#e5e2e1" }}>{fmtDate(p.tanggal)}</div>
                          <div style={{ fontSize:11, color:"#bbcabf" }}>{p.qty} ekor @ {rupiah(p.harga,true)}</div>
                        </div>
                        <span style={{ fontSize:13, fontWeight:700, color:"#4edea3" }}>{rupiah(p.subtotal,true)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ═══ BATCH MANAGEMENT ═══ */}
            {activeTab==="batches" && (
              <div className="ic" style={{ overflow:"hidden" }}>
                <div style={{ padding:"16px 24px", borderBottom:"1px solid #3c4a42", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <h3 style={{ fontSize:16, fontWeight:600, color:"#e5e2e1", margin:0 }}>Batch Register — {batchList.length} Batch</h3>
                  <button onClick={() => { setEditBatch(null); setBatchModal("add") }}
                    style={{ background:"#4edea3", color:"#003824", padding:"7px 14px", fontSize:12, fontWeight:700, borderRadius:6, border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
                    <span className="material-symbols-outlined" style={{ fontSize:16 }}>add</span>Add Batch
                  </button>
                </div>
                <div style={{ overflowX:"auto" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse" }}>
                    <thead style={{ background:"#1E1E1E" }}>
                      <tr>
                        {["Batch ID","Tanggal Masuk","Jumlah","Usia","Status","Est. Kematian","Aksi"].map((h,i) => (
                          <th key={h} style={{ padding:"13px 24px", fontSize:11, fontWeight:700, color:"#bbcabf", textTransform:"uppercase", letterSpacing:"0.05em", textAlign:i===2||i===5?"right":"left" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {batchList.length === 0 && (
                        <tr><td colSpan={7} style={{ padding:"40px 24px", textAlign:"center", color:"#86948a", fontSize:14 }}>
                          Belum ada batch. Klik {"\"Add Batch\""} untuk menambah.
                        </td></tr>
                      )}
                      {filteredBatchList.map(b => {
                        const mortalityEst = Math.round(b.jumlah * 0.369)
                        const sc = b.status==="active"?"#4edea3":b.status==="partial"?"#ffb95f":"#86948a"
                        return (
                          <tr key={b.id} className="tr">
                            <td style={{ padding:"14px 24px", fontSize:13, fontWeight:700, color:"#4edea3" }}>{b.id}</td>
                            <td style={{ padding:"14px 24px", fontSize:14 }}>{fmtDate(b.masuk)}</td>
                            <td style={{ padding:"14px 24px", textAlign:"right", fontSize:13, fontWeight:600 }}>{fmtInt(b.jumlah)}</td>
                            <td style={{ padding:"14px 24px", fontSize:13, color:"#bbcabf" }}>{ageLabel(b.tahun,b.bulan,b.hari)}</td>
                            <td style={{ padding:"14px 24px" }}>
                              <span style={{ fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:20, background:`${sc}18`, color:sc, textTransform:"uppercase" }}>
                                {b.status}
                              </span>
                            </td>
                            <td style={{ padding:"14px 24px", textAlign:"right", fontSize:13, color:"#ffb4ab" }}>~{mortalityEst}</td>
                            <td style={{ padding:"14px 24px", textAlign:"center" }}>
                              <div style={{ display:"flex", justifyContent:"center", gap:12 }}>
                                <button onClick={() => { setEditBatch(b); setBatchModal("edit") }}
                                  style={{ background:"transparent", border:"none", color:"#bbcabf", cursor:"pointer", lineHeight:0 }}
                                  onMouseEnter={e=>(e.currentTarget.style.color="#4edea3")} onMouseLeave={e=>(e.currentTarget.style.color="#bbcabf")} title="Edit">
                                  <span className="material-symbols-outlined" style={{ fontSize:20 }}>edit</span>
                                </button>
                                <button onClick={() => setDeleteBatch(b)}
                                  style={{ background:"transparent", border:"none", color:"#bbcabf", cursor:"pointer", lineHeight:0 }}
                                  onMouseEnter={e=>(e.currentTarget.style.color="#ffb4ab")} onMouseLeave={e=>(e.currentTarget.style.color="#bbcabf")} title="Hapus">
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
                <div style={{ padding:"12px 24px", background:"#1c1b1b", borderTop:"1px solid #3c4a42", display:"flex", justifyContent:"space-between", fontSize:12 }}>
                  <span style={{ color:"#bbcabf" }}>{batchList.length} batch terdaftar</span>
                  <span style={{ color:"#4edea3", fontWeight:700 }}>Total: {fmtInt(batchList.reduce((a,b)=>a+b.jumlah,0))} ekor</span>
                </div>
              </div>
            )}

            {/* ═══ VACCINATION ═══ */}
            {activeTab==="vaccination" && (
              <div className="ic" style={{ overflow:"hidden" }}>
                <div style={{ padding:"16px 24px", borderBottom:"1px solid #3c4a42", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <h3 style={{ fontSize:16, fontWeight:600, color:"#e5e2e1", margin:0 }}>Vaccination Log — {vakList.length} Record</h3>
                  <button onClick={() => { setEditVak(null); setVakModal("add") }}
                    style={{ background:"rgba(137,206,255,0.12)", color:"#89ceff", padding:"7px 14px", fontSize:12, fontWeight:700, borderRadius:6, border:"1px solid rgba(137,206,255,0.3)", cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
                    <span className="material-symbols-outlined" style={{ fontSize:16 }}>add</span>Add Vaccination
                  </button>
                </div>
                <div style={{ overflowX:"auto" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse", textAlign:"left" }}>
                    <thead style={{ background:"#1E1E1E" }}>
                      <tr>
                        {["No","Tanggal","Nama Vaksin","Qty","Satuan","Batch","Total (Rp)","Aksi"].map((h,i) => (
                          <th key={h} style={{ padding:"13px 24px", fontSize:11, fontWeight:700, color:"#bbcabf", textTransform:"uppercase", letterSpacing:"0.05em", textAlign:i===3||i===4?"right":i===7?"center":"left" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {vakList.length === 0 && (
                        <tr><td colSpan={8} style={{ padding:"40px 24px", textAlign:"center", color:"#86948a", fontSize:14 }}>
                          Belum ada record. Klik {"\"Add Vaccination\""} untuk menambah.
                        </td></tr>
                      )}
                      {filteredVakList.map((v,i) => (
                        <tr key={i} className="tr">
                          <td style={{ padding:"14px 24px", fontSize:13, color:"#bbcabf" }}>{v.no}</td>
                          <td style={{ padding:"14px 24px", fontSize:14 }}>{fmtDate(v.tanggal)}</td>
                          <td style={{ padding:"14px 24px", fontSize:14, fontWeight:500 }}>
                            <span style={{ display:"flex", alignItems:"center", gap:8 }}>
                              <span className="material-symbols-outlined" style={{ fontSize:16, color:"#89ceff" }}>vaccines</span>
                              {v.nama}
                            </span>
                          </td>
                          <td style={{ padding:"14px 24px", textAlign:"right", fontSize:13 }}>{v.qty}</td>
                          <td style={{ padding:"14px 24px", textAlign:"right", fontSize:13, color:"#bbcabf" }}>{v.satuan}</td>
                          <td style={{ padding:"14px 24px" }}>
                            {v.batch.split(",").map(b => (
                              <span key={b} style={{ fontSize:10, fontWeight:700, padding:"2px 6px", borderRadius:4, background:"rgba(78,222,163,0.1)", color:"#4edea3", border:"1px solid rgba(78,222,163,0.2)", marginRight:4 }}>{b.trim()}</span>
                            ))}
                          </td>
                          <td style={{ padding:"14px 24px", textAlign:"right", fontSize:13, fontWeight:600, color:"#4edea3" }}>{rupiah(v.subtotal)}</td>
                          <td style={{ padding:"14px 24px", textAlign:"center" }}>
                            <div style={{ display:"flex", justifyContent:"center", gap:12 }}>
                              <button onClick={() => { setEditVak(v); setVakModal("edit") }}
                                style={{ background:"transparent", border:"none", color:"#bbcabf", cursor:"pointer", lineHeight:0 }}
                                onMouseEnter={e=>(e.currentTarget.style.color="#89ceff")} onMouseLeave={e=>(e.currentTarget.style.color="#bbcabf")} title="Edit">
                                <span className="material-symbols-outlined" style={{ fontSize:20 }}>edit</span>
                              </button>
                              <button onClick={() => setDeleteVak(v)}
                                style={{ background:"transparent", border:"none", color:"#bbcabf", cursor:"pointer", lineHeight:0 }}
                                onMouseEnter={e=>(e.currentTarget.style.color="#ffb4ab")} onMouseLeave={e=>(e.currentTarget.style.color="#bbcabf")} title="Hapus">
                                <span className="material-symbols-outlined" style={{ fontSize:20 }}>delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background:"#1c1b1b", borderTop:"1px solid #3c4a42" }}>
                        <td colSpan={6} style={{ padding:"12px 24px", fontSize:12, fontWeight:700, color:"#bbcabf", textTransform:"uppercase" }}>Total Biaya Vaksinasi</td>
                        <td style={{ padding:"12px 24px", textAlign:"right", fontSize:14, fontWeight:700, color:"#4edea3" }}>{rupiah(totalVakBiaya)}</td>
                        <td/>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* ═══ STOK TELUR ═══ */}
            {activeTab==="stok" && (() => {
              const totalStok    = stokTelurBulanan.reduce((a,b) => a + b.stokKg, 0)
              const totalTerjual = stokTelurBulanan.reduce((a,b) => a + b.terjualKg, 0)
              const totalSisa    = stokTelurBulanan.reduce((a,b) => a + b.sisaKg, 0)
              const lastBulan    = stokTelurBulanan[stokTelurBulanan.length - 1]
              return (
                <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

                  {/* KPI row */}
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
                    {[
                      { label:"Total Diproduksi",  val:`${totalStok.toFixed(1)} kg`,          sub:`≈ ${Math.round(totalStok*16).toLocaleString()} butir`, color:"#4edea3", icon:"egg" },
                      { label:"Total Terjual",      val:`${totalTerjual.toFixed(1)} kg`,        sub:`≈ ${Math.round(totalTerjual*16).toLocaleString()} butir`, color:"#89ceff", icon:"shopping_cart" },
                      { label:"Sisa Stok",          val:`${lastBulan.sisaKg.toFixed(1)} kg`,   sub:`≈ ${lastBulan.sisaButir.toLocaleString()} butir`, color:"#ffb95f", icon:"inventory" },
                      { label:"Harga Rata-rata",    val:`Rp25.500/kg`,                          sub:"Rp25.000–26.000 range", color:"#f472b6", icon:"payments" },
                    ].map((k,i) => (
                      <div key={i} className="ic" style={{ padding:16, position:"relative", overflow:"hidden" }}
                        onMouseEnter={e=>(e.currentTarget.style.borderColor=k.color)} onMouseLeave={e=>(e.currentTarget.style.borderColor="#2e2e2e")}>
                        <div style={{ position:"absolute", top:0, right:0, padding:10, opacity:0.15 }}>
                          <span className="material-symbols-outlined" style={{ fontSize:38, color:k.color }}>{k.icon}</span>
                        </div>
                        <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:`linear-gradient(to right, ${k.color}40, transparent)` }}/>
                        <p style={{ fontSize:11, fontWeight:700, color:"#bbcabf", textTransform:"uppercase", letterSpacing:"0.05em", margin:"0 0 8px" }}>{k.label}</p>
                        <p style={{ fontSize:22, fontWeight:700, color:k.color, margin:"0 0 4px", lineHeight:1 }}>{k.val}</p>
                        <p style={{ fontSize:11, color:"#86948a", margin:0 }}>{k.sub}</p>
                      </div>
                    ))}
                  </div>

                  {/* Bar chart stok vs terjual */}
                  <div className="ic" style={{ padding:24 }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
                      <div>
                        <h3 style={{ fontSize:16, fontWeight:600, color:"#e5e2e1", margin:0 }}>
                          <span className="material-symbols-outlined" style={{ color:"#4edea3", marginRight:8, fontSize:18 }}>bar_chart</span>
                          Stok vs Terjual per Bulan (kg)
                        </h3>
                        <p style={{ fontSize:12, color:"#bbcabf", marginTop:4 }}>Data dari sheet Stok dan Penjualan · 1 kg ≈ 16 butir</p>
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={stokTelurBulanan} margin={{ top:4, right:4, left:-8, bottom:0 }} barGap={4}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2e2e2e" vertical={false}/>
                        <XAxis dataKey="bulan" tick={{ fontSize:11, fill:"#bbcabf" }} tickLine={false} axisLine={false}/>
                        <YAxis tick={{ fontSize:10, fill:"#bbcabf" }} tickLine={false} axisLine={false} tickFormatter={v=>`${v}kg`}/>
                        <Tooltip
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          content={({ active, payload, label }:any) => {
                            if (!active || !payload?.length) return null
                            const d = stokTelurBulanan.find(x=>x.bulan===label)
                            return (
                              <div style={{ background:"#201f1f", border:"1px solid #3c4a42", borderRadius:8, padding:"10px 14px", fontSize:12, minWidth:200 }}>
                                <p style={{ color:"#bbcabf", marginBottom:8, fontWeight:700 }}>{label}</p>
                                <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                                  <div style={{ display:"flex", justifyContent:"space-between", gap:16 }}>
                                    <span style={{ color:"#86948a" }}>Stok masuk</span>
                                    <span style={{ color:"#4edea3", fontWeight:700 }}>{d?.stokKg} kg (~{Math.round((d?.stokKg??0)*16)} butir)</span>
                                  </div>
                                  <div style={{ display:"flex", justifyContent:"space-between", gap:16 }}>
                                    <span style={{ color:"#86948a" }}>Terjual</span>
                                    <span style={{ color:"#89ceff", fontWeight:700 }}>{d?.terjualKg} kg (~{Math.round((d?.terjualKg??0)*16)} butir)</span>
                                  </div>
                                  <div style={{ display:"flex", justifyContent:"space-between", gap:16, borderTop:"1px solid #3c4a42", paddingTop:4, marginTop:2 }}>
                                    <span style={{ color:"#86948a" }}>Sisa</span>
                                    <span style={{ color:"#ffb95f", fontWeight:700 }}>{d?.sisaKg} kg (~{d?.sisaButir} butir)</span>
                                  </div>
                                  <div style={{ display:"flex", justifyContent:"space-between", gap:16 }}>
                                    <span style={{ color:"#86948a" }}>Transaksi</span>
                                    <span style={{ color:"#bbcabf" }}>{d?.transaksi}x</span>
                                  </div>
                                </div>
                              </div>
                            )
                          }}
                        />
                        <Bar dataKey="stokKg" name="Stok (kg)" fill="#4edea3" fillOpacity={0.85} radius={[4,4,0,0]} maxBarSize={36}/>
                        <Bar dataKey="terjualKg" name="Terjual (kg)" fill="#89ceff" fillOpacity={0.75} radius={[4,4,0,0]} maxBarSize={36}/>
                      </BarChart>
                    </ResponsiveContainer>
                    <div style={{ display:"flex", gap:20, marginTop:12, paddingTop:12, borderTop:"1px solid #2e2e2e" }}>
                      {[["#4edea3","Stok Masuk"],["#89ceff","Terjual"],["#ffb95f","Sisa"]].map(([c,l])=>(
                        <div key={l} style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:"#bbcabf" }}>
                          <div style={{ width:10, height:10, borderRadius:2, background:c }}/>
                          {l}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Detail table */}
                  <div className="ic" style={{ overflow:"hidden" }}>
                    <div style={{ padding:"16px 24px", borderBottom:"1px solid #3c4a42" }}>
                      <h3 style={{ fontSize:16, fontWeight:600, color:"#e5e2e1", margin:0 }}>Detail Stok Telur per Bulan</h3>
                    </div>
                    <div style={{ overflowX:"auto" }}>
                      <table style={{ width:"100%", borderCollapse:"collapse", textAlign:"left" }}>
                        <thead style={{ background:"#1E1E1E" }}>
                          <tr>
                            {["Bulan","Stok (kg)","Stok (butir)","Terjual (kg)","Terjual (butir)","Sisa (kg)","Sisa (butir)","Transaksi"].map((h,i)=>(
                              <th key={h} style={{ padding:"12px 20px", fontSize:11, fontWeight:700, color:"#bbcabf", textTransform:"uppercase", letterSpacing:"0.05em", textAlign:i>0?"right":"left" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {stokTelurBulanan.map((d,i)=>(
                            <tr key={i} className="tr">
                              <td style={{ padding:"13px 20px", fontSize:14, fontWeight:600, color:"#4edea3" }}>{d.bulan}</td>
                              <td style={{ padding:"13px 20px", textAlign:"right", fontSize:13 }}>{d.stokKg.toFixed(1)}</td>
                              <td style={{ padding:"13px 20px", textAlign:"right", fontSize:13, color:"#4edea3" }}>~{Math.round(d.stokKg*16).toLocaleString()}</td>
                              <td style={{ padding:"13px 20px", textAlign:"right", fontSize:13 }}>{d.terjualKg.toFixed(1)}</td>
                              <td style={{ padding:"13px 20px", textAlign:"right", fontSize:13, color:"#89ceff" }}>~{Math.round(d.terjualKg*16).toLocaleString()}</td>
                              <td style={{ padding:"13px 20px", textAlign:"right", fontSize:13 }}>{d.sisaKg.toFixed(1)}</td>
                              <td style={{ padding:"13px 20px", textAlign:"right", fontSize:13, color:"#ffb95f" }}>{d.sisaButir.toLocaleString()}</td>
                              <td style={{ padding:"13px 20px", textAlign:"right", fontSize:13, color:"#bbcabf" }}>{d.transaksi}x</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr style={{ background:"#1c1b1b", borderTop:"1px solid #3c4a42" }}>
                            <td style={{ padding:"12px 20px", fontSize:12, fontWeight:700, color:"#bbcabf", textTransform:"uppercase" }}>Total</td>
                            <td style={{ padding:"12px 20px", textAlign:"right", fontSize:13, fontWeight:700, color:"#e5e2e1" }}>{totalStok.toFixed(1)}</td>
                            <td style={{ padding:"12px 20px", textAlign:"right", fontSize:13, fontWeight:700, color:"#4edea3" }}>~{Math.round(totalStok*16).toLocaleString()}</td>
                            <td style={{ padding:"12px 20px", textAlign:"right", fontSize:13, fontWeight:700, color:"#e5e2e1" }}>{totalTerjual.toFixed(1)}</td>
                            <td style={{ padding:"12px 20px", textAlign:"right", fontSize:13, fontWeight:700, color:"#89ceff" }}>~{Math.round(totalTerjual*16).toLocaleString()}</td>
                            <td style={{ padding:"12px 20px", textAlign:"right", fontSize:13, fontWeight:700, color:"#e5e2e1" }}>{totalSisa.toFixed(1)}</td>
                            <td colSpan={2}/>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* ═══ GROWTH ═══ */}
            {activeTab==="growth" && (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                <div className="ic" style={{ padding:24 }}>
                  <h3 style={{ fontSize:16, fontWeight:600, color:"#e5e2e1", margin:"0 0 20px", display:"flex", alignItems:"center", gap:8 }}>
                    <span className="material-symbols-outlined" style={{ color:"#4edea3" }}>monitor_weight</span>Pertumbuhan Berat (gram)
                  </h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={pertumbuhanMingguan} margin={{ top:4, right:4, left:-15, bottom:0 }}>
                      <defs>
                        <linearGradient id="gGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="10%" stopColor="#4edea3" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#4edea3" stopOpacity={0.01}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2e2e2e"/>
                      <XAxis dataKey="minggu" tick={{ fontSize:11, fill:"#bbcabf" }} tickLine={false} axisLine={false}/>
                      <YAxis tick={{ fontSize:10, fill:"#bbcabf" }} tickLine={false} axisLine={false} tickFormatter={v=>`${v}g`}/>
                      <Tooltip content={<DarkTip/>}/>
                      <Area type="monotone" dataKey="beratGram" name="Berat" stroke="#4edea3" strokeWidth={2.5} fill="url(#gGrad)" dot={{ fill:"#4edea3", r:4, strokeWidth:0 }} activeDot={{ r:6 }}/>
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="ic" style={{ padding:24 }}>
                  <h3 style={{ fontSize:16, fontWeight:600, color:"#e5e2e1", margin:"0 0 20px", display:"flex", alignItems:"center", gap:8 }}>
                    <span className="material-symbols-outlined" style={{ color:"#ffb4ab" }}>trending_down</span>Kumulatif Mortalitas (%)
                  </h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={pertumbuhanMingguan} margin={{ top:4, right:4, left:-15, bottom:0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2e2e2e"/>
                      <XAxis dataKey="minggu" tick={{ fontSize:11, fill:"#bbcabf" }} tickLine={false} axisLine={false}/>
                      <YAxis tick={{ fontSize:10, fill:"#bbcabf" }} tickLine={false} axisLine={false} tickFormatter={v=>`${v}%`}/>
                      <Tooltip content={<DarkTip/>}/>
                      <Line type="monotone" dataKey="mortalitas" name="Mortalitas" stroke="#ffb4ab" strokeWidth={2.5} dot={{ fill:"#ffb4ab", r:4, strokeWidth:0 }} activeDot={{ r:6 }}/>
                    </LineChart>
                  </ResponsiveContainer>
                  <div style={{ marginTop:12, padding:12, background:"rgba(255,180,171,0.06)", borderRadius:8, border:"1px solid rgba(255,180,171,0.2)", fontSize:13, color:"#bbcabf" }}>
                    ⚠️ Mortalitas aktual <strong style={{ color:"#ffb4ab" }}>36.9%</strong> — jauh di atas rata-rata industri 5–8%.
                  </div>
                </div>
              </div>
            )}

            {/* Status banner */}
            <div style={{ marginTop:24, marginBottom:48, background:"rgba(255,180,171,0.05)", border:"1px solid rgba(255,180,171,0.3)", borderRadius:12, padding:16, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ display:"flex", alignItems:"center", gap:16 }}>
                <span className="material-symbols-outlined" style={{ color:"#ffb4ab", animation:"pulse 2s infinite" }}>report_problem</span>
                <div>
                  <span style={{ fontWeight:600, color:"#ffb4ab" }}>Urgent: Mortalitas 36.9% — di atas batas aman. </span>
                  <span style={{ color:"#bbcabf", fontSize:14 }}>480 dari 1.300 ekor mati. Evaluasi kepadatan kandang dan protokol vaksinasi.</span>
                </div>
              </div>
              <button style={{ color:"#ffb4ab", fontWeight:700, fontSize:11, textTransform:"uppercase", background:"transparent", border:"none", cursor:"pointer", whiteSpace:"nowrap" }}>
                Resolve Now
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* ════ MODALS ════ */}

      {batchModal && (
        <BatchModal
          mode={batchModal}
          initial={editBatch ?? {}}
          onSave={saveBatch}
          onClose={() => { setBatchModal(null); setEditBatch(null) }}
        />
      )}

      {vakModal && (
        <VaksinasiModal
          mode={vakModal}
          initial={editVak ?? {}}
          batchIds={batchIds}
          onSave={saveVak}
          onClose={() => { setVakModal(null); setEditVak(null) }}
        />
      )}

      {deleteBatch && (
        <DeleteDialog
          label="Batch"
          desc={`Apakah kamu yakin ingin menghapus batch <strong style="color:#e5e2e1">${deleteBatch.id}</strong> (${fmtInt(deleteBatch.jumlah)} ekor, masuk ${fmtDate(deleteBatch.masuk)})?`}
          onConfirm={confirmDeleteBatch}
          onCancel={() => setDeleteBatch(null)}
        />
      )}

      {deleteVak && (
        <DeleteDialog
          label="Record Vaksinasi"
          desc={`Apakah kamu yakin ingin menghapus record <strong style="color:#e5e2e1">${deleteVak.nama}</strong> (${fmtDate(deleteVak.tanggal)}, batch: ${deleteVak.batch})?`}
          onConfirm={confirmDeleteVak}
          onCancel={() => setDeleteVak(null)}
        />
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)}/>}

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }`}</style>
    </>
  )
}
