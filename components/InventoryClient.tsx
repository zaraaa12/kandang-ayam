"use client"

import { logout } from "@/lib/auth"

import { useState, useMemo, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  getStokPersen, getStokStatus,
  fmtDateInv, rupiahInv, KATEGORI_LIST,
  type InventoryItem, type KategoriFilter,
} from "@/data/inventory"
import {
  deleteInventoryItemAction,
  saveInventoryItemAction,
} from "@/app/inventory/actions"

const NAV = [
  { label: "Dashboard",  icon: "dashboard",  href: "/dashboard" },
  { label: "Production", icon: "egg",         href: "/produksi" },
  { label: "Finance",    icon: "payments",    href: "/finance" },
  { label: "Livestock",  icon: "pets",        href: "/livestock" },
  { label: "Inventory",  icon: "inventory_2", href: "/inventory" },
]

const CAT_COLOR: Record<string, { bg: string; text: string; border: string }> = {
  Feed:     { bg:"rgba(78,222,163,0.1)",  text:"#4edea3", border:"rgba(78,222,163,0.2)" },
  Medical:  { bg:"rgba(137,206,255,0.1)", text:"#89ceff", border:"rgba(137,206,255,0.2)" },
  Cleaning: { bg:"rgba(255,185,95,0.1)",  text:"#ffb95f", border:"rgba(255,185,95,0.2)" },
  Parts:    { bg:"rgba(167,139,250,0.1)", text:"#a78bfa", border:"rgba(167,139,250,0.2)" },
  Utility:  { bg:"rgba(167,139,250,0.1)", text:"#a78bfa", border:"rgba(167,139,250,0.2)" },
}

const BAR_COLOR = (pct: number) =>
  pct < 20 ? "#ffb4ab" : pct < 35 ? "#ffb95f" : "#4edea3"

function emptyItem(): InventoryItem {
  return {
    id: "",
    nama: "",
    kategori: "Feed",
    stok: 0,
    satuan: "unit",
    kapasitas: 1,
    hargaSatuan: 0,
    terakhirRestok: new Date().toISOString().split("T")[0],
    keterangan: "",
  }
}

function InventoryModal({
  item,
  onSave,
  onClose,
}: {
  item: InventoryItem
  onSave: (item: InventoryItem) => void
  onClose: () => void
}) {
  const [form, setForm] = useState(item)
  const set = (key: keyof InventoryItem, value: string | number) => setForm(current => ({ ...current, [key]: value }))
  const isEdit = Boolean(item.id)

  return (
    <div className="inventory-modal-backdrop">
      <form onSubmit={event => { event.preventDefault(); onSave(form) }} className="inventory-modal">
        <div className="inventory-modal__header">
          <div>
            <div className="inventory-modal__eyebrow">{isEdit ? "Update record" : "Create record"}</div>
            <h3 className="inventory-modal__title">{isEdit ? "Edit Inventory Item" : "Add Inventory Item"}</h3>
            <p className="inventory-modal__desc">Data akan disimpan ke PostgreSQL.</p>
          </div>
          <button type="button" onClick={onClose} className="icon-btn modal-close" title="Tutup">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="inventory-form-grid">
          <label className="inventory-field">
            <span>ID</span>
            <input required value={form.id} disabled={isEdit} onChange={event => set("id", event.target.value)} className="inventory-input" style={{ opacity:isEdit?0.65:1 }} />
          </label>
          <label className="inventory-field">
            <span>Kategori</span>
            <select value={form.kategori} onChange={event => set("kategori", event.target.value as InventoryItem["kategori"])} className="inventory-input">
              {KATEGORI_LIST.filter(item => item !== "All").map(item => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="inventory-field field-wide">
            <span>Nama Item</span>
            <input required value={form.nama} onChange={event => set("nama", event.target.value)} className="inventory-input" />
          </label>
          <label className="inventory-field">
            <span>Stok</span>
            <input required type="number" min={0} value={form.stok} onChange={event => set("stok", Number(event.target.value))} className="inventory-input" />
          </label>
          <label className="inventory-field">
            <span>Satuan</span>
            <input required value={form.satuan} onChange={event => set("satuan", event.target.value)} className="inventory-input" />
          </label>
          <label className="inventory-field">
            <span>Kapasitas</span>
            <input required type="number" min={1} value={form.kapasitas} onChange={event => set("kapasitas", Number(event.target.value))} className="inventory-input" />
          </label>
          <label className="inventory-field">
            <span>Harga Satuan</span>
            <input required type="number" min={0} value={form.hargaSatuan} onChange={event => set("hargaSatuan", Number(event.target.value))} className="inventory-input" />
          </label>
          <label className="inventory-field">
            <span>Terakhir Restok</span>
            <input required type="date" value={form.terakhirRestok} onChange={event => set("terakhirRestok", event.target.value)} className="inventory-input" />
          </label>
          <label className="inventory-field field-wide">
            <span>Keterangan</span>
            <textarea value={form.keterangan ?? ""} onChange={event => set("keterangan", event.target.value)} rows={3} className="inventory-input inventory-textarea" />
          </label>
        </div>

        <div className="inventory-modal__footer">
          <button type="button" onClick={onClose} className="inventory-secondary-btn">Batal</button>
          <button type="submit" className="inventory-primary-btn">
            <span className="material-symbols-outlined">save</span>
            Simpan
          </button>
        </div>
      </form>
    </div>
  )
}

export function InventoryClient({ initialItems }: { initialItems: InventoryItem[] }) {
  const router = useRouter()
  const [activeNav, setActiveNav] = useState("Inventory")
  const [filter, setFilter]       = useState<KategoriFilter>("All")
  const [search, setSearch]       = useState("")
  const [page, setPage]           = useState(1)
  const [items, setItems]         = useState(initialItems)
  const [modalItem, setModalItem] = useState<InventoryItem | null>(null)
  const [, startTransition]       = useTransition()
  const PER_PAGE = 8

  const stats = useMemo(() => {
    const totalItems = items.length
    const lowStock = items.filter(i => i.stok / i.kapasitas < 0.30).length
    const criticalStock = items.filter(i => i.stok / i.kapasitas < 0.15).length
    const totalNilai = items.reduce((a, b) => a + b.stok * b.hargaSatuan, 0)
    const feedKg = items.filter(i => i.kategori === "Feed").reduce((a, b) => a + b.stok * 50, 0)
    return { totalItems, lowStock, criticalStock, totalNilai, feedKg }
  }, [items])

  const filtered = useMemo(() => {
    let nextItems = items
    if (filter !== "All") nextItems = nextItems.filter(i => i.kategori === filter)
    if (search.trim()) {
      const q = search.toLowerCase()
      nextItems = nextItems.filter(i =>
        i.nama.toLowerCase().includes(q) ||
        i.id.toLowerCase().includes(q) ||
        i.kategori.toLowerCase().includes(q)
      )
    }
    return nextItems
  }, [items, filter, search])

  const totalPages   = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const pageItems    = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  const criticalList = items.filter(i => getStokStatus(i) === "critical")
  const lowList      = items.filter(i => getStokStatus(i) === "low")

  // Summary per kategori besar
  const feedItems  = items.filter(i => i.kategori === "Feed")
  const feedTotal  = feedItems.reduce((a, b) => a + b.stok, 0)
  const feedKap    = feedItems.reduce((a, b) => a + b.kapasitas, 0)
  const feedPct    = Math.round((feedTotal / feedKap) * 100)

  const medItems   = items.filter(i => i.kategori === "Medical")
  const medTotal   = medItems.reduce((a, b) => a + b.stok, 0)
  const medKap     = medItems.reduce((a, b) => a + b.kapasitas, 0)
  const medPct     = Math.round((medTotal / medKap) * 100)

  const partItems  = items.filter(i => i.kategori === "Parts")
  const partTotal  = partItems.reduce((a, b) => a + b.stok, 0)
  const partKap    = partItems.reduce((a, b) => a + b.kapasitas, 0)
  const partPct    = Math.round((partTotal / partKap) * 100)

  function handleFilter(k: KategoriFilter) { setFilter(k); setPage(1) }
  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) { setSearch(e.target.value); setPage(1) }
  function saveItem(item: InventoryItem) {
    startTransition(async () => {
      try {
        const savedItem = await saveInventoryItemAction(item)
        setItems(current => current.some(existing => existing.id === savedItem.id)
          ? current.map(existing => existing.id === savedItem.id ? savedItem : existing)
          : [...current, savedItem])
        setModalItem(null)
        router.refresh()
      } catch (error) {
        window.alert(error instanceof Error ? error.message : "Gagal menyimpan inventory item.")
      }
    })
  }
  function deleteItem(item: InventoryItem) {
    if (!window.confirm(`Hapus ${item.nama}?`)) return
    startTransition(async () => {
      try {
        await deleteInventoryItemAction(item.id)
        setItems(current => current.filter(existing => existing.id !== item.id))
        router.refresh()
      } catch (error) {
        window.alert(error instanceof Error ? error.message : "Gagal menghapus inventory item.")
      }
    })
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap');
        .material-symbols-outlined { font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24; vertical-align:middle; display:inline-block; line-height:1; }
        .nav-link { display:flex; align-items:center; gap:12px; padding:12px 16px; border-radius:8px; text-decoration:none; transition:background 0.15s; color:#bbcabf; font-size:16px; }
        .nav-link:hover { background:#353534; color:#e5e2e1; }
        .nav-link.active { background:#10b981; color:#00422b; font-weight:600; }
        .tr { border-bottom:1px solid #3c4a42; transition:background 0.12s; }
        .tr:hover { background:#2a2a2a; }
        .tr:last-child { border-bottom:none; }
        .icon-btn { width:34px; height:34px; display:inline-flex; align-items:center; justify-content:center; padding:0; background:transparent; border:1px solid transparent; color:#bbcabf; cursor:pointer; line-height:0; border-radius:6px; transition:background 0.12s,color 0.12s,border-color 0.12s; }
        .icon-btn:hover { background:rgba(78,222,163,0.1); border-color:rgba(78,222,163,0.25); color:#4edea3; }
        .icon-btn.danger:hover { background:rgba(255,180,171,0.1); border-color:rgba(255,180,171,0.25); color:#ffb4ab; }
        .modal-close { width:36px; height:36px; flex-shrink:0; }
        .inventory-modal-backdrop { position:fixed; inset:0; z-index:100; display:flex; align-items:center; justify-content:center; padding:24px; background:rgba(0,0,0,0.72); backdrop-filter:blur(8px); }
        .inventory-modal { width:min(680px,100%); max-height:calc(100vh - 48px); overflow:auto; background:#201f1f; border:1px solid #3c4a42; border-radius:8px; box-shadow:0 24px 90px rgba(0,0,0,0.55); }
        .inventory-modal__header { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; padding:22px 24px 18px; border-bottom:1px solid #3c4a42; background:linear-gradient(180deg,rgba(78,222,163,0.07),rgba(32,31,31,0)); }
        .inventory-modal__eyebrow { color:#4edea3; font-size:11px; font-weight:800; letter-spacing:0.08em; text-transform:uppercase; margin-bottom:6px; }
        .inventory-modal__title { margin:0; font-size:20px; line-height:26px; font-weight:700; color:#e5e2e1; }
        .inventory-modal__desc { color:#bbcabf; font-size:13px; margin:4px 0 0; }
        .inventory-form-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px; padding:22px 24px 4px; }
        .inventory-field { display:grid; gap:7px; min-width:0; color:#bbcabf; font-size:12px; font-weight:700; letter-spacing:0.02em; }
        .inventory-field span { min-width:0; }
        .field-wide { grid-column:1 / -1; }
        .inventory-input { width:100%; min-height:42px; background:#131313; border:1px solid #3c4a42; border-radius:6px; color:#e5e2e1; padding:10px 12px; outline:none; font-size:14px; transition:border-color 0.12s,box-shadow 0.12s,background 0.12s; }
        .inventory-input:focus { border-color:#4edea3; box-shadow:0 0 0 3px rgba(78,222,163,0.13); background:#171717; }
        .inventory-input:disabled { cursor:not-allowed; }
        .inventory-textarea { resize:vertical; min-height:86px; }
        .inventory-modal__footer { display:flex; justify-content:flex-end; gap:10px; padding:18px 24px 24px; }
        .inventory-secondary-btn,.inventory-primary-btn { min-height:40px; border-radius:6px; padding:0 16px; cursor:pointer; font-weight:800; font-size:14px; transition:transform 0.12s,background 0.12s,border-color 0.12s; }
        .inventory-secondary-btn { border:1px solid #3c4a42; background:transparent; color:#bbcabf; }
        .inventory-secondary-btn:hover { background:#2a2a2a; color:#e5e2e1; }
        .inventory-primary-btn { display:inline-flex; align-items:center; justify-content:center; gap:8px; border:none; background:#4edea3; color:#003824; }
        .inventory-primary-btn:hover { transform:translateY(-1px); background:#6ffbbe; }
        .inventory-primary-btn .material-symbols-outlined { font-size:20px; }
        .inventory-action-cell { display:flex; justify-content:flex-end; gap:6px; }
        .inventory-add-btn { display:inline-flex; align-items:center; gap:8px; background:#4edea3; color:#003824; padding:8px 14px; border-radius:6px; font-weight:800; border:none; cursor:pointer; font-size:14px; min-height:38px; transition:transform 0.12s,background 0.12s; }
        .inventory-add-btn:hover { transform:translateY(-1px); background:#6ffbbe; }
        .inventory-add-btn .material-symbols-outlined { font-size:20px; }
        .inventory-filter-btn:last-child { border-right:none !important; }
        @media (max-width: 860px) {
          .inventory-form-grid { grid-template-columns:1fr; }
          .field-wide { grid-column:auto; }
          .inventory-modal-backdrop { padding:12px; align-items:flex-start; }
          .inventory-modal { max-height:calc(100vh - 24px); }
          .inventory-modal__header,.inventory-form-grid,.inventory-modal__footer { padding-left:18px; padding-right:18px; }
          .inventory-modal__footer { flex-direction:column-reverse; }
          .inventory-secondary-btn,.inventory-primary-btn { width:100%; }
        }
        .fab { position:fixed; bottom:32px; right:32px; width:56px; height:56px; background:#4edea3; color:#003824; border-radius:50%; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 24px rgba(78,222,163,0.35); z-index:60; transition:transform 0.15s; }
        .fab:hover { transform:scale(1.1); }
        .fab-tip { position:absolute; right:calc(100% + 12px); background:#201f1f; border:1px solid #3c4a42; padding:6px 12px; border-radius:8px; font-size:14px; white-space:nowrap; opacity:0; pointer-events:none; transition:opacity 0.2s; }
        .fab:hover .fab-tip { opacity:1; }
        * { box-sizing:border-box; }
        ::-webkit-scrollbar { width:4px; height:4px; }
        ::-webkit-scrollbar-track { background:#131313; }
        ::-webkit-scrollbar-thumb { background:#2E2E2E; border-radius:2px; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
      `}</style>

      <div style={{ display:"flex", minHeight:"100vh", background:"#131313", color:"#e5e2e1", fontFamily:"'Inter',sans-serif" }}>

        {/* ── Sidebar ── */}
        <aside style={{ width:256, flexShrink:0, background:"#201f1f", borderRight:"1px solid #3c4a42", display:"flex", flexDirection:"column", padding:"24px 0", position:"sticky", top:0, height:"100vh", zIndex:50 }}>
          <div style={{ padding:"0 24px", marginBottom:32 }}>
            <h2 style={{ fontSize:22, fontWeight:700, color:"#4edea3", margin:0 }}>Farm Command</h2>
            <p style={{ fontSize:12, color:"#bbcabf", marginTop:4 }}>Facility ID: P-882</p>
          </div>
          <nav style={{ flex:1, padding:"0 16px", display:"flex", flexDirection:"column", gap:2 }}>
            {NAV.map(({ label, icon, href }) => (
              <Link key={label} href={href} className={`nav-link${activeNav===label?" active":""}`} onClick={() => setActiveNav(label)}>
                <span className="material-symbols-outlined" style={{ fontSize:22 }}>{icon}</span>
                {label}
              </Link>
            ))}
          </nav>
          <div style={{ padding:"16px 16px 0", borderTop:"1px solid #3c4a42", display:"flex", flexDirection:"column", gap:4 }}>
            <a href="#" className="nav-link" style={{ fontSize:14 }}>
              <span className="material-symbols-outlined" style={{ fontSize:20 }}>history</span>Logs
            </a>
            <button onClick={logout} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 12px", borderRadius:8, border:"none", background:"transparent", color:"#ffb4ab", fontSize:15, cursor:"pointer", width:"100%", fontFamily:"inherit" }}><span className="material-symbols-outlined" style={{ fontSize:20 }}>logout</span>Logout</button>
          </div>
        </aside>

        {/* ── Main ── */}
        <main style={{ flex:1, display:"flex", flexDirection:"column" }}>

          {/* TopBar */}
          <header style={{ height:64, background:"#131313", borderBottom:"1px solid #3c4a42", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 24px", position:"sticky", top:0, zIndex:40 }}>
            <div style={{ display:"flex", alignItems:"center", gap:16 }}>
              <h1 style={{ fontSize:22, fontWeight:600, color:"#4edea3", margin:0 }}>PoultryPro Analytics</h1>
              <div style={{ display:"flex", alignItems:"center", background:"#201f1f", border:"1px solid #3c4a42", borderRadius:8, padding:"6px 12px", width:384 }}>
                <span className="material-symbols-outlined" style={{ color:"#bbcabf", fontSize:20, marginRight:8 }}>search</span>
                <input value={search} onChange={handleSearch} placeholder="Search inventory items..."
                  style={{ background:"transparent", border:"none", outline:"none", color:"#e5e2e1", fontSize:14, width:"100%" }}/>
              </div>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <button onClick={() => setModalItem(emptyItem())} className="inventory-add-btn">
                <span className="material-symbols-outlined">add</span>
                Add Record
              </button>
              <div style={{ display:"flex" }}>
                {["notifications","settings","help"].map(ic => (
                  <button key={ic} style={{ padding:8, background:"transparent", border:"none", color:"#bbcabf", cursor:"pointer", borderRadius:"50%", lineHeight:0 }}>
                    <span className="material-symbols-outlined">{ic}</span>
                  </button>
                ))}
              </div>
              <div style={{ width:32, height:32, borderRadius:"50%", background:"linear-gradient(135deg,#10b981,#4edea3)", display:"flex", alignItems:"center", justifyContent:"center", color:"#003824", fontWeight:700, fontSize:12 }}>KA</div>
            </div>
          </header>

          <div style={{ padding:24, flex:1, display:"flex", flexDirection:"column", gap:24 }}>

            {/* ── Alert banners ── */}
            <div style={{ display:"grid", gridTemplateColumns:"3fr 1fr", gap:16 }}>
              <div style={{ background:"rgba(147,0,10,0.08)", border:"1px solid rgba(255,180,171,0.3)", padding:16, borderRadius:12, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div style={{ display:"flex", alignItems:"center", gap:16 }}>
                  <div style={{ width:40, height:40, borderRadius:"50%", background:"rgba(255,180,171,0.15)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <span className="material-symbols-outlined" style={{ color:"#ffb4ab", animation:"pulse 2s infinite" }}>warning</span>
                  </div>
                  <div>
                    <p style={{ fontSize:16, fontWeight:600, color:"#ffb4ab", margin:0 }}>Critical Low Stock Alert</p>
                    <p style={{ fontSize:14, color:"#bbcabf", margin:"2px 0 0" }}>
                      {criticalList.length > 0
                        ? `${criticalList.length} item kritis: ${criticalList.map(i => i.nama.split(" ")[0]).join(", ")}. Segera restok.`
                        : "Semua item dalam kondisi aman."}
                    </p>
                  </div>
                </div>
                <button onClick={() => handleFilter("All")} style={{ background:"#ffb4ab", color:"#690005", fontWeight:700, padding:"8px 16px", borderRadius:6, border:"none", cursor:"pointer", fontSize:11, textTransform:"uppercase", letterSpacing:"0.05em", whiteSpace:"nowrap" }}>
                  Review All
                </button>
              </div>
              <div style={{ background:"rgba(238,152,0,0.08)", border:"1px solid rgba(255,185,95,0.3)", padding:16, borderRadius:12, display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:40, height:40, borderRadius:"50%", background:"rgba(255,185,95,0.15)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <span className="material-symbols-outlined" style={{ color:"#ffb95f" }}>local_shipping</span>
                </div>
                <div>
                  <p style={{ fontSize:16, fontWeight:600, color:"#ffb95f", margin:0 }}>{lowList.length} Low Stock</p>
                  <p style={{ fontSize:12, color:"#bbcabf", margin:"2px 0 0" }}>Item perlu segera direstok.</p>
                </div>
              </div>
            </div>

            {/* ── Stats Cards ── */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 }}>
              {[
                { title:"Feed Stock", icon:"grass", color:"#4edea3", grad:"rgba(78,222,163,0.4)", sub:"PAKAN AKTIF", val:feedTotal, unit:"karung", pct:feedPct, note:`${feedPct}% kapasitas · ~${stats.feedKg.toLocaleString()} kg` },
                { title:"Medical Supplies", icon:"vaccines", color:"#89ceff", grad:"rgba(137,206,255,0.4)", sub:"REFRIGERATED", val:medTotal, unit:"unit", pct:medPct, note:`${medPct}% stok tersisa · Cek suhu penyimpanan` },
                { title:"Equipment & Parts", icon:"settings_suggest", color:"#ffb95f", grad:"rgba(255,185,95,0.4)", sub:"SPARE PARTS", val:partTotal, unit:"unit", pct:partPct, note:`${partPct}% ketersediaan · ${partItems.length} jenis` },
              ].map((c,i) => (
                <div key={i} style={{ background:"#201f1f", border:"1px solid #3c4a42", padding:24, borderRadius:12, position:"relative", overflow:"hidden" }}>
                  <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:`linear-gradient(to right, ${c.grad}, transparent)` }}/>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
                    <div style={{ background:`${c.color}1a`, padding:8, borderRadius:6 }}>
                      <span className="material-symbols-outlined" style={{ color:c.color, fontSize:22 }}>{c.icon}</span>
                    </div>
                    <span style={{ fontSize:11, fontWeight:700, color:"#bbcabf", textTransform:"uppercase", letterSpacing:"0.05em" }}>{c.sub}</span>
                  </div>
                  <h3 style={{ fontSize:13, fontWeight:700, color:"#bbcabf", margin:"0 0 8px", textTransform:"uppercase", letterSpacing:"0.04em" }}>{c.title}</h3>
                  <div style={{ display:"flex", alignItems:"baseline", gap:8, marginBottom:16 }}>
                    <span style={{ fontSize:32, fontWeight:700, color:"#e5e2e1", lineHeight:1 }}>{c.val.toLocaleString()}</span>
                    <span style={{ fontSize:14, color:"#bbcabf" }}>{c.unit}</span>
                  </div>
                  <div style={{ background:"#353534", height:6, borderRadius:3, overflow:"hidden", marginBottom:8 }}>
                    <div style={{ height:"100%", width:`${c.pct}%`, background:BAR_COLOR(c.pct), borderRadius:3 }}/>
                  </div>
                  <p style={{ fontSize:11, fontWeight:700, color:"#bbcabf", margin:0 }}>{c.note}</p>
                </div>
              ))}
            </div>

            {/* ── Table ── */}
            <section style={{ background:"#201f1f", border:"1px solid #3c4a42", borderRadius:12, overflow:"hidden", display:"flex", flexDirection:"column" }}>
              {/* Toolbar */}
              <div style={{ padding:"20px 24px", borderBottom:"1px solid #3c4a42", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
                <h2 style={{ fontSize:22, fontWeight:600, color:"#e5e2e1", margin:0 }}>Inventory Master List</h2>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ display:"flex", border:"1px solid #3c4a42", borderRadius:8, overflow:"hidden" }}>
                    {KATEGORI_LIST.map(k => (
                      <button key={k} onClick={() => handleFilter(k)} className="inventory-filter-btn" style={{
                        padding:"8px 14px", background: filter===k ? "#2a2a2a" : "transparent",
                        color: filter===k ? "#e5e2e1" : "#bbcabf", fontWeight: filter===k ? 600 : 400,
                        fontSize:14, border:"none", borderRight:"1px solid #3c4a42", cursor:"pointer",
                        transition:"background 0.15s",
                      }}>
                        {k}
                      </button>
                    ))}
                  </div>
                  {[{ label:"Filter", icon:"filter_list" },{ label:"Export", icon:"file_download" }].map(btn => (
                    <button key={btn.label} style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 16px", border:"1px solid #3c4a42", borderRadius:8, background:"transparent", color:"#e5e2e1", fontSize:14, fontWeight:600, cursor:"pointer" }}
                      onMouseEnter={e=>(e.currentTarget.style.background="#2a2a2a")} onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
                      <span className="material-symbols-outlined" style={{ fontSize:20 }}>{btn.icon}</span>{btn.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table body */}
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", textAlign:"left" }}>
                  <thead style={{ background:"#131313" }}>
                    <tr>
                      {["Item Name","Category","Stock Level","Harga Satuan","Terakhir Restok","Actions"].map((h,i) => (
                        <th key={h} style={{ padding:"14px 24px", fontSize:11, fontWeight:700, color:"#bbcabf", textTransform:"uppercase", letterSpacing:"0.05em", borderBottom:"1px solid #3c4a42", textAlign:i===5?"right":"left" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.length === 0 && (
                      <tr><td colSpan={6} style={{ padding:"48px 24px", textAlign:"center", color:"#86948a", fontSize:14 }}>
                        Tidak ada item untuk filter ini.
                      </td></tr>
                    )}
                    {pageItems.map(item => {
                      const status = getStokStatus(item)
                      const pct    = getStokPersen(item)
                      const cat    = CAT_COLOR[item.kategori] ?? CAT_COLOR.Utility
                      const barClr = status==="critical" ? "#ffb4ab" : status==="low" ? "#ffb95f" : "#4edea3"
                      const valClr = status==="critical" ? "#ffb4ab" : status==="low" ? "#ffb95f" : "#e5e2e1"
                      return (
                        <tr key={item.id} className="tr">
                          <td style={{ padding:"16px 24px" }}>
                            <div style={{ display:"flex", flexDirection:"column" }}>
                              <span style={{ fontSize:14, fontWeight:700, color:"#e5e2e1" }}>{item.nama}</span>
                              <span style={{ fontSize:11, color:"#86948a" }}>ID: {item.id}</span>
                              {item.keterangan && <span style={{ fontSize:11, color:"#86948a", marginTop:2 }}>{item.keterangan}</span>}
                            </div>
                          </td>
                          <td style={{ padding:"16px 24px" }}>
                            <span style={{ padding:"3px 8px", background:cat.bg, color:cat.text, border:`1px solid ${cat.border}`, borderRadius:4, fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em" }}>
                              {item.kategori}
                            </span>
                          </td>
                          <td style={{ padding:"16px 24px", minWidth:220 }}>
                            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                              <div style={{ flex:1, background:"#353534", height:8, borderRadius:4, overflow:"hidden" }}>
                                <div style={{ height:"100%", width:`${pct}%`, background:barClr, borderRadius:4 }}/>
                              </div>
                              <span style={{ fontSize:13, fontWeight: status!=="ok"?700:400, color:valClr, minWidth:90, textAlign:"right" }}>
                                {item.stok} {item.satuan}
                              </span>
                            </div>
                            <span style={{ fontSize:10, color:"#86948a", marginTop:3, display:"block" }}>{pct}% kapasitas</span>
                          </td>
                          <td style={{ padding:"16px 24px", fontSize:13, color:"#bbcabf" }}>
                            {rupiahInv(item.hargaSatuan)} / {item.satuan}
                          </td>
                          <td style={{ padding:"16px 24px", fontSize:13, color:"#bbcabf" }}>
                            {fmtDateInv(item.terakhirRestok)}
                          </td>
                          <td style={{ padding:"16px 24px", textAlign:"right" }}>
                            <div className="inventory-action-cell">
                              <button className="icon-btn" title="Edit" onClick={() => setModalItem(item)}>
                                <span className="material-symbols-outlined" style={{ fontSize:20 }}>edit</span>
                              </button>
                              <button className="icon-btn danger" title="Hapus" onClick={() => deleteItem(item)}>
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

              {/* Pagination */}
              <div style={{ padding:"14px 24px", borderTop:"1px solid #3c4a42", display:"flex", alignItems:"center", justifyContent:"space-between", background:"#131313", fontSize:14, color:"#bbcabf" }}>
                <span>Showing {filtered.length === 0 ? 0 : (page-1)*PER_PAGE+1}–{Math.min(page*PER_PAGE, filtered.length)} of {filtered.length} entries</span>
                <div style={{ display:"flex", gap:6 }}>
                  <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}
                    style={{ padding:"5px 14px", border:"1px solid #3c4a42", borderRadius:6, background:"transparent", color:page===1?"#86948a":"#bbcabf", cursor:page===1?"not-allowed":"pointer", fontSize:14 }}>
                    Previous
                  </button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    const p = i + 1
                    return (
                      <button key={p} onClick={() => setPage(p)} style={{
                        padding:"5px 12px", borderRadius:6, border:"1px solid #3c4a42", cursor:"pointer", fontSize:14,
                        background: page===p ? "#4edea3" : "transparent",
                        color:      page===p ? "#003824" : "#bbcabf",
                        fontWeight: page===p ? 700 : 400,
                      }}>{p}</button>
                    )
                  })}
                  <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages}
                    style={{ padding:"5px 14px", border:"1px solid #3c4a42", borderRadius:6, background:"transparent", color:page===totalPages?"#86948a":"#bbcabf", cursor:page===totalPages?"not-allowed":"pointer", fontSize:14 }}>
                    Next
                  </button>
                </div>
              </div>
            </section>
          </div>

          {/* Footer */}
          <footer style={{ height:40, borderTop:"1px solid #3c4a42", padding:"0 24px", display:"flex", alignItems:"center", justifyContent:"space-between", background:"#131313", fontSize:11, fontWeight:700, color:"#bbcabf" }}>
            <div style={{ display:"flex", alignItems:"center", gap:20 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:"#4edea3", boxShadow:"0 0 8px rgba(78,222,163,0.5)" }}/>
                System Online
              </div>
              <span>Server: P-882 · Kandang Ayam Aktif</span>
            </div>
            <span>© 2025 PoultryPro Analytics · Farm Command P-882</span>
          </footer>
        </main>
      </div>

      {/* FAB */}
      <button className="fab" onClick={() => setModalItem(emptyItem())}>
        <span className="material-symbols-outlined" style={{ fontSize:32 }}>add</span>
        <span className="fab-tip">Add Inventory Item</span>
      </button>
      {modalItem && <InventoryModal item={modalItem} onSave={saveItem} onClose={() => setModalItem(null)} />}
    </>
  )
}
