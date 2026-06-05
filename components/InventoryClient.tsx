"use client"

import { logout } from "@/lib/auth"

import { useState, useMemo } from "react"
import Link from "next/link"
import {
  getStokStatus,
  fmtDateInv, rupiahInv, KATEGORI_LIST,
  type InventoryItem, type KategoriFilter,
} from "@/data/inventory"

const NAV = [
  { label: "Dashboard",  icon: "dashboard",  href: "/dashboard" },
  { label: "Production", icon: "egg",         href: "/produksi" },
  { label: "Finance",    icon: "payments",    href: "/finance" },
  { label: "Livestock",  icon: "pets",        href: "/livestock" },
  { label: "Inventory",  icon: "inventory_2", href: "/inventory" },
]

// ── Infra cost data from REKAP TOTAL sheet ────────────────────────────────────
type CategoryMeta = { label: string; color: string; bg: string; border: string; icon: string; dimColor: string }

const CATEGORY_META: Record<InventoryItem["kategori"], CategoryMeta> = {
  Konstruksi: { label: "Konstruksi Fisik", color: "#89ceff", bg: "rgba(137,206,255,0.1)", border: "rgba(137,206,255,0.25)", icon: "architecture",          dimColor: "rgba(137,206,255,0.4)" },
  Utilitas:   { label: "Utilitas & Sistem", color: "#4edea3", bg: "rgba(78,222,163,0.1)",  border: "rgba(78,222,163,0.25)", icon: "bolt",                  dimColor: "rgba(78,222,163,0.4)" },
  SDM:        { label: "SDM & Gaji",      color: "#ffb95f", bg: "rgba(255,185,95,0.1)",  border: "rgba(255,185,95,0.25)", icon: "badge",                 dimColor: "rgba(255,185,95,0.4)" },
}

const UNKNOWN_CATEGORY_META: CategoryMeta = {
  label: "Kategori Lain",
  color: "#bbcabf",
  bg: "rgba(187,202,191,0.1)",
  border: "rgba(187,202,191,0.25)",
  icon: "category",
  dimColor: "rgba(187,202,191,0.4)",
}

function getCategoryMeta(kategori: string): CategoryMeta {
  return CATEGORY_META[kategori as InventoryItem["kategori"]] ?? {
    ...UNKNOWN_CATEGORY_META,
    label: kategori || UNKNOWN_CATEGORY_META.label,
  }
}

type InventoryGroup = KategoriFilter

function fmtJuta(n: number): string {
  return "Rp " + (n / 1_000_000).toFixed(1) + " jt"
}

// ── Simple inline bar chart component ─────────────────────────────────────────
function InlineBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ width: "100%", background: "#353534", height: 8, borderRadius: 4, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 4, transition: "width 0.6s ease" }} />
    </div>
  )
}

// ── Donut (pure CSS/SVG) ──────────────────────────────────────────────────────
function DonutChart({ segments, totalValue }: { segments: { pct: number; color: string; label: string }[]; totalValue: number }) {
  const r = 54
  const cx = 64
  const cy = 64
  const circumference = 2 * Math.PI * r
  const slices = segments.reduce<{
    acc: number
    items: Array<(typeof segments)[number] & { dash: number; gap: number; offset: number }>
  }>((state, s) => {
    const dash = (s.pct / 100) * circumference
    const gap = circumference - dash
    const offset = circumference - (state.acc / 100) * circumference

    return {
      acc: state.acc + s.pct,
      items: [...state.items, { ...s, dash, gap, offset }],
    }
  }, { acc: 0, items: [] }).items
  const totalJt = totalValue

  return (
    <svg viewBox="0 0 128 128" width={128} height={128} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#353534" strokeWidth={16} />
      {slices.map((sl, i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill="none"
          stroke={sl.color} strokeWidth={16}
          strokeDasharray={`${sl.dash} ${sl.gap}`}
          strokeDashoffset={sl.offset}
        />
      ))}
      <text x={cx} y={cy - 6} textAnchor="middle" fill="#e5e2e1" fontSize={11} fontWeight={700}
        style={{ transform: "rotate(90deg)", transformOrigin: "64px 64px" }}>
        Total
      </text>
      <text x={cx} y={cx + 10} textAnchor="middle" fill="#4edea3" fontSize={9} fontWeight={700}
        style={{ transform: "rotate(90deg)", transformOrigin: "64px 64px" }}>
        {fmtJuta(totalJt)}
      </text>
    </svg>
  )
}

// ── Main Export ───────────────────────────────────────────────────────────────
export function InventoryClient({ initialItems }: { initialItems: InventoryItem[] }) {
  const [activeNav, setActiveNav]         = useState("Inventory")
  const [activeGroup, setActiveGroup]     = useState<InventoryGroup>("All")
  const [hoveredId, setHoveredId]         = useState<string | null>(null)

  const totalInventoryValue = initialItems.reduce((sum, item) => sum + item.stok * item.hargaSatuan, 0)
  const totalItems = initialItems.length
  const lowStockCount = initialItems.filter(item => getStokStatus(item) !== "ok").length
  const criticalStockCount = initialItems.filter(item => getStokStatus(item) === "critical").length

  const categoryLatestRestock = useMemo(() => {
    const latest: Record<string, string | null> = Object.fromEntries(
      KATEGORI_LIST.filter(kategori => kategori !== "All").map(kategori => [kategori, null])
    )

    initialItems.forEach(item => {
      const current = latest[item.kategori]
      if (!current || new Date(item.terakhirRestok) > new Date(current)) {
        latest[item.kategori] = item.terakhirRestok
      }
    })

    return latest
  }, [initialItems])

  const groupSummary = useMemo(() => {
    const groups: Record<string, number> = Object.fromEntries(
      KATEGORI_LIST.filter(kategori => kategori !== "All").map(kategori => [kategori, 0])
    )

    initialItems.forEach(item => {
      groups[item.kategori] = (groups[item.kategori] ?? 0) + item.stok * item.hargaSatuan
    })

    return groups
  }, [initialItems])

  const sorted = useMemo(() => {
    return Object.entries(groupSummary).map(([kategori, value]) => {
      const meta = getCategoryMeta(kategori)
      return {
        id: kategori,
        label: meta.label,
        group: kategori,
        value,
        icon: meta.icon,
        tanggal: categoryLatestRestock[kategori]
          ? fmtDateInv(categoryLatestRestock[kategori]!)
          : "-",
      }
    }).sort((a, b) => b.value - a.value)
  }, [groupSummary, categoryLatestRestock])

  const paretoData = useMemo(() => {
    return sorted.reduce<{
      cum: number
      items: Array<(typeof sorted)[number] & { cumPct: number }>
    }>((state, d) => {
      const cum = state.cum + d.value

      return {
        cum,
        items: [
          ...state.items,
          { ...d, cumPct: totalInventoryValue > 0 ? Math.round((cum / totalInventoryValue) * 100) : 0 },
        ],
      }
    }, { cum: 0, items: [] }).items
  }, [sorted, totalInventoryValue])

  const donutSegments = Object.entries(groupSummary).map(([kategori, val]) => {
    const meta = getCategoryMeta(kategori)
    return {
      pct: totalInventoryValue > 0 ? Math.round((val / totalInventoryValue) * 100) : 0,
      color: meta.color,
      label: meta.label,
    }
  })

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap');
        .material-symbols-outlined { font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24; vertical-align:middle; display:inline-block; line-height:1; }
        .nav-link { display:flex; align-items:center; gap:12px; padding:12px 16px; border-radius:8px; text-decoration:none; transition:background 0.15s; color:#bbcabf; font-size:16px; }
        .nav-link:hover { background:#353534; color:#e5e2e1; }
        .nav-link.active { background:#10b981; color:#00422b; font-weight:600; }
        .infra-row { border-bottom:1px solid #3c4a42; transition:background 0.12s; cursor:default; }
        .infra-row:hover { background:#1e2a25; }
        .infra-row:last-child { border-bottom:none; }
        .group-pill { display:inline-flex; align-items:center; gap:5px; padding:3px 10px; border-radius:4px; font-size:10px; font-weight:700; letter-spacing:0.05em; text-transform:uppercase; border:1px solid; }
        .group-btn { padding:8px 16px; border-radius:6px; border:1px solid #3c4a42; background:transparent; color:#bbcabf; font-size:13px; font-weight:600; cursor:pointer; transition:all 0.15s; font-family:inherit; }
        .group-btn.active { color:#003824; }
        .group-btn:hover:not(.active) { background:#2a2a2a; color:#e5e2e1; }
        .kpi-card { background:#201f1f; border:1px solid #3c4a42; padding:20px 24px; border-radius:12px; position:relative; overflow:hidden; }
        .kpi-card::before { content:''; position:absolute; top:0; left:0; right:0; height:2px; }
        .pareto-bar { transition:height 0.4s ease, opacity 0.2s; }
        * { box-sizing:border-box; }
        ::-webkit-scrollbar { width:4px; height:4px; }
        ::-webkit-scrollbar-track { background:#131313; }
        ::-webkit-scrollbar-thumb { background:#2E2E2E; border-radius:2px; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        .fade-in { animation:fadeIn 0.3s ease forwards; }
      `}</style>

      <div style={{ display: "flex", minHeight: "100vh", background: "#131313", color: "#e5e2e1", fontFamily: "'Inter',sans-serif" }}>

        {/* ── Sidebar ── */}
        <aside style={{ width: 256, flexShrink: 0, background: "#201f1f", borderRight: "1px solid #3c4a42", display: "flex", flexDirection: "column", padding: "24px 0", position: "sticky", top: 0, height: "100vh", zIndex: 50 }}>
          <div style={{ padding: "0 24px", marginBottom: 32 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: "#4edea3", margin: 0 }}>Farm Command</h2>
            <p style={{ fontSize: 12, color: "#bbcabf", marginTop: 4 }}>Facility ID: P-882</p>
          </div>
          <nav style={{ flex: 1, padding: "0 16px", display: "flex", flexDirection: "column", gap: 2 }}>
            {NAV.map(({ label, icon, href }) => (
              <Link key={label} href={href} className={`nav-link${activeNav === label ? " active" : ""}`} onClick={() => setActiveNav(label)}>
                <span className="material-symbols-outlined" style={{ fontSize: 22 }}>{icon}</span>
                {label}
              </Link>
            ))}
          </nav>
          <div style={{ padding: "16px 16px 0", borderTop: "1px solid #3c4a42", display: "flex", flexDirection: "column", gap: 4 }}>
            <a href="#" className="nav-link" style={{ fontSize: 14 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>history</span>Logs
            </a>
            <button onClick={logout} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 8, border: "none", background: "transparent", color: "#ffb4ab", fontSize: 15, cursor: "pointer", width: "100%", fontFamily: "inherit" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>logout</span>Logout
            </button>
          </div>
        </aside>

        {/* ── Main ── */}
        <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>

          {/* TopBar */}
          <header style={{ height: 64, background: "#131313", borderBottom: "1px solid #3c4a42", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", position: "sticky", top: 0, zIndex: 40 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <h1 style={{ fontSize: 22, fontWeight: 600, color: "#4edea3", margin: 0 }}>PoultryPro Analytics</h1>
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#201f1f", border: "1px solid #3c4a42", borderRadius: 8, padding: "6px 14px" }}>
                <span className="material-symbols-outlined" style={{ color: "#4edea3", fontSize: 18 }}>inventory_2</span>
                <span style={{ fontSize: 13, color: "#bbcabf", fontWeight: 600 }}>Inventory Stock Overview</span>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {["notifications", "settings", "help"].map(ic => (
                <button key={ic} style={{ padding: 8, background: "transparent", border: "none", color: "#bbcabf", cursor: "pointer", borderRadius: "50%", lineHeight: 0 }}>
                  <span className="material-symbols-outlined">{ic}</span>
                </button>
              ))}
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#10b981,#4edea3)", display: "flex", alignItems: "center", justifyContent: "center", color: "#003824", fontWeight: 700, fontSize: 12 }}>KA</div>
            </div>
          </header>

          <div style={{ padding: 24, flex: 1, display: "flex", flexDirection: "column", gap: 24 }}>

            {/* ── KPI Row ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
              {[
                { label: "Total Item Inventory", value: totalItems.toString(), sub: `${totalItems} produk tersimpan`, icon: "inventory_2", color: "#4edea3" },
                { label: "Nilai Stok", value: fmtJuta(totalInventoryValue), sub: `Total nilai stok saat ini`, icon: "payments", color: "#89ceff" },
                { label: "Stok Rendah", value: lowStockCount.toString(), sub: `${lowStockCount} item perlu restok`, icon: "warning", color: "#ffb95f" },
                { label: "Kritis", value: criticalStockCount.toString(), sub: `${criticalStockCount} item sangat rendah`, icon: "report_problem", color: "#f97316" },
              ].map((k, i) => (
                <div key={i} className="kpi-card" style={{ borderTop: `2px solid ${k.color}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div style={{ background: `${k.color}1a`, padding: 8, borderRadius: 6 }}>
                      <span className="material-symbols-outlined" style={{ color: k.color, fontSize: 22 }}>{k.icon}</span>
                    </div>
                  </div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#bbcabf", textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 6px" }}>{k.label}</p>
                  <p style={{ fontSize: 26, fontWeight: 700, color: "#e5e2e1", margin: "0 0 4px", lineHeight: 1 }}>{k.value}</p>
                  <p style={{ fontSize: 11, color: "#86948a", margin: 0 }}>{k.sub}</p>
                </div>
              ))}
            </div>

            {/* ── Middle Row: Donut + Pareto ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16 }}>

              {/* Donut + legend */}
              <div style={{ background: "#201f1f", border: "1px solid #3c4a42", borderRadius: 12, padding: 24 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#bbcabf", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 20px" }}>Komposisi Kelompok</p>
                <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 24 }}>
                  <DonutChart segments={donutSegments} totalValue={totalInventoryValue} />
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {Object.entries(groupSummary).map(([g, val]) => {
                      const meta = getCategoryMeta(g)
                      return (
                        <div key={g}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                            <div style={{ width: 10, height: 10, borderRadius: 2, background: meta.color, flexShrink: 0 }} />
                            <span style={{ fontSize: 12, color: "#bbcabf", fontWeight: 600 }}>{meta.label}</span>
                          </div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: "#e5e2e1", paddingLeft: 16 }}>{fmtJuta(val)}</div>
                          <div style={{ fontSize: 11, color: "#86948a", paddingLeft: 16 }}>{totalInventoryValue > 0 ? Math.round((val / totalInventoryValue) * 100) : 0}%</div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Per-group bar */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {Object.entries(groupSummary).map(([g, val]) => {
                    const meta = getCategoryMeta(g)
                    const pct = Math.round(totalInventoryValue > 0 ? (val / totalInventoryValue) * 100 : 0)
                    return (
                      <div key={g}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#bbcabf", marginBottom: 4 }}>
                          <span>{meta.label}</span>
                          <span style={{ color: meta.color, fontWeight: 700 }}>{pct}%</span>
                        </div>
                        <InlineBar pct={pct} color={meta.color} />
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Pareto chart */}
              <div style={{ background: "#201f1f", border: "1px solid #3c4a42", borderRadius: 12, padding: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#bbcabf", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px" }}>Analisis Pareto — Nilai Inventory</p>
                    <p style={{ fontSize: 12, color: "#86948a", margin: 0 }}>Kategori inventory dengan nilai stok tertinggi.</p>
                  </div>
                </div>

                {/* Bar chart */}
                <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 160, marginBottom: 8 }}>
                  {paretoData.map(d => {
                    const heightPct = paretoData[0]?.value ? Math.round((d.value / paretoData[0].value) * 100) : 0
                    const gm = getCategoryMeta(d.group)
                    const isHovered = hoveredId === d.id
                    return (
                      <div key={d.id} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "default" }}
                        onMouseEnter={() => setHoveredId(d.id)}
                        onMouseLeave={() => setHoveredId(null)}>
                        {isHovered && (
                          <div style={{ position: "absolute", transform: "translateY(-36px)", background: "#2a2a2a", border: "1px solid #3c4a42", borderRadius: 6, padding: "4px 10px", fontSize: 11, color: "#e5e2e1", whiteSpace: "nowrap", zIndex: 10, pointerEvents: "none" }}>
                            {fmtJuta(d.value)}
                          </div>
                        )}
                        <div className="pareto-bar"
                          style={{ width: "100%", height: `${heightPct}%`, background: isHovered ? gm.color : gm.dimColor, borderRadius: "4px 4px 0 0", minHeight: 4, position: "relative" }}>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* X labels */}
                <div style={{ display: "flex", gap: 8 }}>
                  {paretoData.map(d => (
                    <div key={d.id} style={{ flex: 1, textAlign: "center" }}>
                      <div style={{ fontSize: 9, color: "#86948a", lineHeight: 1.3, wordBreak: "break-word" }}>
                        {d.label.split(" ").slice(0, 2).join(" ")}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Cumulative line indicator */}
                <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {paretoData.slice(0, 5).map(d => (
                    <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 4, background: "#131313", border: "1px solid #3c4a42", borderRadius: 4, padding: "3px 8px" }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: getCategoryMeta(d.group).color }} />
                      <span style={{ fontSize: 10, color: "#bbcabf" }}>{d.cumPct}%</span>
                    </div>
                  ))}
                  <span style={{ fontSize: 10, color: "#86948a", alignSelf: "center" }}>kumulatif top-5</span>
                </div>
              </div>
            </div>

            {/* ── Detail Table ── */}
            <section style={{ background: "#201f1f", border: "1px solid #3c4a42", borderRadius: 12, overflow: "hidden" }}>
              {/* Toolbar */}
              <div style={{ padding: "20px 24px", borderBottom: "1px solid #3c4a42", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 600, color: "#e5e2e1", margin: "0 0 2px" }}>Rincian Inventory</h2>
                  <p style={{ fontSize: 12, color: "#86948a", margin: 0 }}>Data diambil dari database Supabase/Postgres.</p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {KATEGORI_LIST.map(g => {
                    const isActive = activeGroup === g
                    const meta = g === "All" ? null : getCategoryMeta(g)
                    const color = g === "All" ? "#4edea3" : meta!.color
                    return (
                      <button key={g} className={`group-btn${isActive ? " active" : ""}`}
                        style={{ background: isActive ? color : "transparent", borderColor: isActive ? color : "#3c4a42", color: isActive ? "#003824" : "#bbcabf" }}
                        onClick={() => setActiveGroup(g)}>
                        {g === "All" ? "Semua" : meta!.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Table */}
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead style={{ background: "#131313" }}>
                    <tr>
                      {["No", "ID", "Nama Item", "Kategori", "Stok", "Kapasitas", "Satuan", "Harga Satuan", "Nilai Stok", "Terakhir Restok"].map((h, i) => (
                        <th key={h} style={{ padding: "14px 20px", fontSize: 11, fontWeight: 700, color: "#bbcabf", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #3c4a42", textAlign: i >= 4 ? "right" : "left" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {initialItems
                      .filter(item => activeGroup === "All" ? true : item.kategori === activeGroup)
                      .map((item, idx) => {
                        const meta = getCategoryMeta(item.kategori)
                        return (
                        <tr key={item.id} className="infra-row fade-in">
                          <td style={{ padding: "16px 20px", fontSize: 12, color: "#86948a", width: 48 }}>{idx + 1}</td>
                          <td style={{ padding: "16px 20px", fontSize: 13, color: "#e5e2e1" }}>{item.id}</td>
                          <td style={{ padding: "16px 20px", fontSize: 13, color: "#e5e2e1" }}>{item.nama}</td>
                          <td style={{ padding: "16px 20px" }}>
                            <span className="group-pill" style={{ background: meta.bg, color: meta.color, borderColor: meta.border }}>
                              {meta.label}
                            </span>
                          </td>
                          <td style={{ padding: "16px 20px", textAlign: "right", fontSize: 13, color: "#e5e2e1" }}>{item.stok}</td>
                          <td style={{ padding: "16px 20px", textAlign: "right", fontSize: 13, color: "#e5e2e1" }}>{item.kapasitas}</td>
                          <td style={{ padding: "16px 20px", textAlign: "center", fontSize: 13, color: "#e5e2e1" }}>{item.satuan}</td>
                          <td style={{ padding: "16px 20px", textAlign: "right", fontSize: 13, color: "#e5e2e1" }}>{rupiahInv(item.hargaSatuan)}</td>
                          <td style={{ padding: "16px 20px", textAlign: "right", fontSize: 13, color: "#e5e2e1" }}>{rupiahInv(item.stok * item.hargaSatuan)}</td>
                          <td style={{ padding: "16px 20px", textAlign: "right", fontSize: 12, color: "#86948a" }}>{fmtDateInv(item.terakhirRestok)}</td>
                        </tr>
                        )
                      })}
                  </tbody>

                  <tfoot>
                    <tr style={{ background: "#131313", borderTop: "2px solid #3c4a42" }}>
                      <td colSpan={4} style={{ padding: "14px 20px", fontSize: 12, fontWeight: 700, color: "#bbcabf", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Total Inventory
                      </td>
                      <td style={{ padding: "14px 20px", textAlign: "right", fontSize: 13, fontWeight: 700, color: "#4edea3" }}>
                        {initialItems.filter(item => activeGroup === "All" ? true : item.kategori === activeGroup).length}
                      </td>
                      <td colSpan={4} style={{ padding: "14px 20px", textAlign: "right", fontSize: 13, fontWeight: 700, color: "#4edea3" }}>
                        {rupiahInv(initialItems.filter(item => activeGroup === "All" ? true : item.kategori === activeGroup).reduce((sum, item) => sum + item.stok * item.hargaSatuan, 0))}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>
          </div>

          {/* Footer */}
          <footer style={{ height: 40, borderTop: "1px solid #3c4a42", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#131313", fontSize: 11, fontWeight: 700, color: "#bbcabf" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#4edea3", boxShadow: "0 0 8px rgba(78,222,163,0.5)" }} />
                System Online
              </div>
              <span>Server: P-882 · Kandang Ayam Aktif</span>
            </div>
            <span>© 2025 PoultryPro Analytics · Farm Command P-882</span>
          </footer>
        </main>
      </div>
    </>
  )
}
