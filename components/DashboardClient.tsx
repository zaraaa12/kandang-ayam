"use client"

import { logout } from "@/lib/auth"
import { fmtInt } from "@/lib/fmt"
import { useState, useMemo, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts"
import type { InventoryItem } from "@/data/inventory"
import type { ProduksiRecord } from "@/lib/produksi-db"

type RechartPayloadItem = { payload?: Record<string, unknown>; value?: number; name?: string; stroke?: string; fill?: string }
type RechartPayload = readonly RechartPayloadItem[]

// ─── Props ────────────────────────────────────────────────────────────────────
export type DashboardProps = {
  produksiData: ProduksiRecord[]
  financeSummary: {
    totalIncome: number
    totalExpense: number
    pendapatanTelur: number
    penjualanAyam: number
    saldo: number
    roiPercent: number
    totalInvestasi: number
  }
  latestEggSale: { volKg: number; stockKg: number; jumlah: number; date: string } | null
  monthlyCashflow: { label: string; income: number; expense: number }[]
  flockSummary: {
    totalDibeli: number
    mati: number
    dijual: number
    aktif: number
    persentaseMati: number
    persentaseAktif: number
  }
  biayaPembesaran: { kategori: string; jumlah: number; warna: string }[]
  inventoryStats: {
    totalItems: number
    totalNilai: number
    lowStock: number
    criticalStock: number
    items: InventoryItem[]
  }
  investasiItems: { label: string; jumlah: number }[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function rupiah(n: number, short = false): string {
  if (short) {
    if (n >= 1_000_000_000) return `Rp${(n / 1_000_000_000).toFixed(1)} M`
    if (n >= 1_000_000) return `Rp${(n / 1_000_000).toFixed(0)} jt`
    if (n >= 1_000) return `Rp${(n / 1_000).toFixed(0)} rb`
  }
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n)
}

// ─── Nav config ──────────────────────────────────────────────────────────────
const NAV = [
  { label: "Dashboard",  icon: "dashboard",   href: "/dashboard" },
  { label: "Production", icon: "egg",          href: "/produksi" },
  { label: "Finance",    icon: "payments",     href: "/finance" },
  { label: "Livestock",  icon: "pets",         href: "/livestock" },
  { label: "Inventory",  icon: "inventory_2",  href: "/inventory" },
]

// ─── Custom tooltip ───────────────────────────────────────────────────────────
function DarkTooltip({ active, payload, label }: { active?: boolean; payload?: RechartPayload; label?: string | number }) {
  if (!active || !payload?.length) return null
  return (
    <div className="fc-tooltip">
      <p style={{ color: "#bbcabf", marginBottom: 6, fontWeight: 600, fontSize: 12 }}>{label}</p>
      {payload.map((p, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: p.stroke || p.fill }} />
          <span style={{ color: "#e5e2e1" }}>{p.name}: <strong>{rupiah(p.value ?? 0, true)}</strong></span>
        </div>
      ))}
    </div>
  )
}

// ─── Gauge SVG ────────────────────────────────────────────────────────────────
function GaugeChart({ value, max = 70 }: { value: number; max?: number }) {
  const r = 80
  const circ = 2 * Math.PI * r
  const arcLength = circ * 0.75
  const fillLength = (value / max) * arcLength
  const color = value >= 50 ? "#4edea3" : value >= 35 ? "#ffb95f" : "#ffb4ab"
  const statusText = value >= 50 ? "Excellent" : value >= 35 ? "Good" : "Low"

  return (
    <div style={{ position: "relative", width: 192, height: 192, margin: "0 auto" }}>
      <svg width={192} height={192} style={{ transform: "rotate(135deg)" }}>
        <circle cx={96} cy={96} r={r} fill="transparent"
          stroke="#2a2a2a" strokeWidth={12}
          strokeDasharray={`${arcLength} ${circ - arcLength}`}
          strokeLinecap="round" />
        <circle cx={96} cy={96} r={r} fill="transparent"
          stroke={color} strokeWidth={12}
          strokeDasharray={`${fillLength} ${circ}`}
          strokeDashoffset={0}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${color}60)`, transition: "stroke-dasharray 1s ease" }} />
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ fontSize: 36, fontWeight: 700, color: "#e5e2e1", lineHeight: 1 }}>{value.toFixed(0)}%</span>
        <span style={{ fontSize: 11, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 4 }}>
          {statusText}
        </span>
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
      <span className="material-symbols-outlined" style={{ color: iconColor, fontSize: 20 }}>{icon}</span>
      <span style={{ fontSize: 14, color: "#e5e2e1", flex: 1 }}>{msg}</span>
      <button onClick={onClose} style={{ background: "transparent", border: "none", color: borderColor, cursor: "pointer", fontSize: 18, padding: 0, lineHeight: 0 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
      </button>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardClient({
  produksiData,
  financeSummary,
  latestEggSale,
  monthlyCashflow,
  flockSummary,
  biayaPembesaran,
  inventoryStats,
  investasiItems,
}: DashboardProps) {
  const [activeNav, setActiveNav] = useState("Dashboard")
  const [hdpView, setHdpView]     = useState<"weekly" | "monthly">("monthly")
  const [toast, setToast]         = useState<{ msg: string; type: "alert" | "success" | "warning" } | null>(null)

  // ─── Derived from produksi data ────────────────────────────────────────────
  const latestDay   = produksiData[produksiData.length - 1]
  const latestHdp   = latestDay?.hdp ?? 0
  const prevHdp     = produksiData[produksiData.length - 8]?.hdp ?? 0
  const hdpDiff     = +(latestHdp - prevHdp).toFixed(1)
  const peakHdp     = Math.max(...produksiData.map(d => d.hdp), 0)

  const totalPendapatan = financeSummary.pendapatanTelur + financeSummary.penjualanAyam
  const totalBiayaOps   = financeSummary.totalExpense
  const roiPercent      = financeSummary.roiPercent

  // ─── Monthly HDP averages (from produksi data) ────────────────────────────
  const hdpBarData = useMemo(() => {
    const byMonth = new Map<string, { total: number; count: number; label: string }>()
    for (const r of produksiData) {
      const month = r.month || new Date(r.date).toLocaleDateString("id-ID", { month: "short" })
      if (!byMonth.has(month)) {
        byMonth.set(month, { total: 0, count: 0, label: month.slice(0, 3) })
      }
      const entry = byMonth.get(month)!
      entry.total += r.hdp
      entry.count += 1
    }
    return Array.from(byMonth.values()).map(m => ({
      label: m.label,
      hdp: +(m.total / m.count).toFixed(1),
    }))
  }, [produksiData])

  // ─── Weekly HDP averages ──────────────────────────────────────────────────
  const hdpWeeklyData = useMemo(() => {
    const weeks: { label: string; hdp: number; min: number; max: number }[] = []
    const sorted = [...produksiData].sort((a, b) => a.date.localeCompare(b.date))
    for (let i = 0; i < sorted.length; i += 7) {
      const chunk = sorted.slice(i, i + 7)
      if (chunk.length === 0) continue
      const vals = chunk.map(d => d.hdp)
      const avg  = vals.reduce((a, b) => a + b, 0) / vals.length
      const date = new Date(chunk[0].date)
      const label = `${date.getDate()} ${date.toLocaleString("en", { month: "short" })}`
      weeks.push({ label, hdp: +avg.toFixed(1), min: +Math.min(...vals).toFixed(1), max: +Math.max(...vals).toFixed(1) })
    }
    return weeks
  }, [produksiData])

  const activeHdpData = hdpView === "monthly" ? hdpBarData : hdpWeeklyData

  // ─── Dynamic alerts based on real data ────────────────────────────────────
  const generateDynamicAlerts = useCallback(() => {
    const alerts: Array<{ title: string; desc: string; type: "error" | "warning" | "success"; priority: number }> = []

    if (roiPercent < 40) {
      alerts.push({
        title: "ROI Belum Target",
        desc: `ROI saat ini ${roiPercent.toFixed(1)}% — masih jauh dari target 50%. Tingkatkan produktivitas atau efisiensi biaya.`,
        type: "error", priority: 1,
      })
    } else if (roiPercent >= 40 && roiPercent < 50) {
      alerts.push({
        title: "ROI Sedang Meningkat",
        desc: `ROI mencapai ${roiPercent.toFixed(1)}% — mendekati target. Pertahankan momentum produksi.`,
        type: "warning", priority: 2,
      })
    } else {
      alerts.push({
        title: "Target ROI Tercapai",
        desc: `ROI sudah mencapai ${roiPercent.toFixed(1)}% — excellent performance! Jaga konsistensi.`,
        type: "success", priority: 3,
      })
    }

    if (latestHdp < 45) {
      alerts.push({
        title: "HDP Kritis",
        desc: `HDP turun ke ${latestHdp.toFixed(1)}% — periksa pakan, kesehatan ayam, dan kondisi kandang segera.`,
        type: "error", priority: 1,
      })
    } else if (hdpDiff < -2) {
      alerts.push({
        title: "HDP Menurun",
        desc: `HDP turun ${Math.abs(hdpDiff)}% dalam 7 hari terakhir dari ${prevHdp.toFixed(1)}% ke ${latestHdp.toFixed(1)}%.`,
        type: "warning", priority: 2,
      })
    } else if (hdpDiff >= 1 || latestHdp > 51) {
      alerts.push({
        title: "HDP Optimal",
        desc: `HDP stabil di ${latestHdp.toFixed(1)}% — produktivitas excellent, lanjutkan manajemen pakan saat ini.`,
        type: "success", priority: 3,
      })
    }

    if (totalBiayaOps > 15_000_000) {
      alerts.push({
        title: "Biaya Operasional Tinggi",
        desc: `Pengeluaran operasional Rp${(totalBiayaOps / 1_000_000).toFixed(1)}jt — cek efisiensi pembelian pakan dan utilitas.`,
        type: "warning", priority: 2,
      })
    }

    if (flockSummary.persentaseMati > 15) {
      alerts.push({
        title: "Mortalitas Tinggi",
        desc: `Tingkat kematian ${flockSummary.persentaseMati.toFixed(1)}% dari ${flockSummary.totalDibeli} ekor. Evaluasi manajemen kesehatan.`,
        type: "error", priority: 1,
      })
    }

    return alerts.sort((a, b) => a.priority - b.priority)
  }, [hdpDiff, latestHdp, prevHdp, roiPercent, totalBiayaOps, flockSummary])

  const DYNAMIC_ALERTS = useMemo(() => generateDynamicAlerts(), [generateDynamicAlerts])

  useEffect(() => {
    const top = DYNAMIC_ALERTS[0]
    if (top) {
      const icon = top.type === "error" ? "⚠️" : top.type === "warning" ? "⚡" : "✓"
      setTimeout(() => setToast({ msg: `${icon} ${top.title}`, type: top.type === "error" ? "alert" : top.type }), 0)
    }
  }, [DYNAMIC_ALERTS])

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap');
        .material-symbols-outlined {
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
          vertical-align: middle; display: inline-block; line-height: 1;
        }
        .fc-tooltip { background: #1E1E1E; border: 1px solid #3c4a42; border-radius: 8px; padding: 10px 14px; min-width: 160px; }
        .nav-link { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: 8px; text-decoration: none; transition: background 0.15s, color 0.15s; color: #bbcabf; font-size: 16px; font-weight: 400; }
        .nav-link:hover { background: #353534; color: #e5e2e1; }
        .nav-link.active { background: #10b981; color: #00422b; font-weight: 600; }
        .stat-card { background: #121212; border: 1px solid #2E2E2E; border-radius: 12px; padding: 16px; position: relative; overflow: hidden; transition: border-color 0.2s; cursor: default; }
        .stat-card:hover { border-color: #4edea3; }
        .stat-card:hover .stat-icon { opacity: 1; }
        .stat-icon { opacity: 0.2; transition: opacity 0.2s; position: absolute; top: 12px; right: 12px; }
        .chart-card { background: #121212; border: 1px solid #2E2E2E; border-radius: 12px; padding: 24px; position: relative; overflow: hidden; }
        .chart-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(to right, rgba(78,222,163,0.3), rgba(78,222,163,0.05), transparent); }
        .alert-item { padding: 16px; border-bottom: 1px solid rgba(60,74,66,0.5); transition: background 0.15s; cursor: pointer; }
        .alert-item:last-child { border-bottom: none; }
        .alert-item:hover { background: #1E1E1E; }
        @keyframes led-pulse { 0%,100% { box-shadow: 0 0 4px rgba(255,180,171,0.5); opacity: 1; } 50% { box-shadow: 0 0 12px rgba(255,180,171,0.9); opacity: 0.5; } }
        .led-pulse { animation: led-pulse 2s infinite; }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: #121212; }
        ::-webkit-scrollbar-thumb { background: #3c4a42; border-radius: 3px; }
      `}</style>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <div style={{ display: "flex", minHeight: "100vh", background: "#050505", color: "#e5e2e1", fontFamily: "'Inter', sans-serif" }}>

        {/* ── Sidebar ── */}
        <aside style={{ width: 256, flexShrink: 0, background: "#121212", borderRight: "1px solid #3c4a42", display: "flex", flexDirection: "column", padding: "24px 0", position: "sticky", top: 0, height: "100vh", zIndex: 50 }}>
          <div style={{ padding: "0 24px", marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, background: "#4edea3", display: "flex", alignItems: "center", justifyContent: "center", color: "#003824" }}>
                <span className="material-symbols-outlined">agriculture</span>
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600, color: "#4edea3", lineHeight: 1.2 }}>Farm Command</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#bbcabf", letterSpacing: "0.05em", textTransform: "uppercase" }}>Facility ID: P-882</div>
              </div>
            </div>
          </div>
          <nav style={{ flex: 1, padding: "0 16px", display: "flex", flexDirection: "column", gap: 2 }}>
            {NAV.map(({ label, icon, href }) => (
              <Link key={label} href={href}
                className={`nav-link${activeNav === label ? " active" : ""}`}
                onClick={() => setActiveNav(label)}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 22 }}>{icon}</span>
                <span style={{ fontSize: 16 }}>{label}</span>
              </Link>
            ))}
          </nav>
          <div style={{ padding: "24px 16px 0", borderTop: "1px solid #3c4a42", display: "flex", flexDirection: "column", gap: 4 }}>
            <a href="#" className="nav-link" style={{ fontSize: 14 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>history</span>Logs
            </a>
            <button onClick={logout} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 12px", borderRadius:8, border:"none", background:"transparent", color:"#ffb4ab", fontSize:15, cursor:"pointer", width:"100%", fontFamily:"inherit" }}><span className="material-symbols-outlined" style={{ fontSize:20 }}>logout</span>Logout</button>
          </div>
        </aside>

        {/* ── Main ── */}
        <main style={{ flex: 1, minHeight: "100vh", display: "flex", flexDirection: "column" }}>

          {/* TopBar */}
          <header style={{ height: 64, background: "rgba(5,5,5,0.85)", backdropFilter: "blur(12px)", borderBottom: "1px solid #3c4a42", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", position: "sticky", top: 0, zIndex: 40 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
              <h1 style={{ fontSize: 22, fontWeight: 600, color: "#4edea3", margin: 0, letterSpacing: "-0.01em" }}>PoultryPro Analytics</h1>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              {["notifications", "settings", "help"].map(ic => (
                <button key={ic} style={{ padding: 8, background: "transparent", border: "none", color: "#bbcabf", cursor: "pointer", borderRadius: "50%", lineHeight: 0, transition: "background 0.15s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#1E1E1E")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <span className="material-symbols-outlined">{ic}</span>
                </button>
              ))}
              <div style={{ width: 1, height: 32, background: "#3c4a42" }} />
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 8px", borderRadius: 24, cursor: "pointer", transition: "background 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#1E1E1E")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#10b981,#4edea3)", display: "flex", alignItems: "center", justifyContent: "center", color: "#003824", fontWeight: 700, fontSize: 12, border: "1px solid #3c4a42" }}>KA</div>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#e5e2e1", letterSpacing: "0.05em", textTransform: "uppercase" }}>Farm Manager</span>
              </div>
            </div>
          </header>

          <div style={{ padding: 24, maxWidth: 1600, margin: "0 auto", width: "100%" }}>

            {/* ── KPI Cards ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
              {/* Total Eggs - from finance (Penjualan Telur) */}
              <div className="stat-card" onMouseEnter={e => (e.currentTarget.style.borderColor = "#4edea3")} onMouseLeave={e => (e.currentTarget.style.borderColor = "#2E2E2E")}>
                <div className="stat-icon"><span className="material-symbols-outlined" style={{ fontSize: 40, color: "#4edea3" }}>egg</span></div>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#bbcabf", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Penjualan Telur Terakhir</p>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <h2 style={{ fontSize: 36, fontWeight: 700, color: "#e5e2e1", margin: 0, lineHeight: 1 }}>{latestEggSale ? latestEggSale.volKg.toFixed(1) : "0"}</h2>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#4edea3" }}>kg</span>
                </div>
                <p style={{ fontSize: 11, color: "#86948a", margin: "6px 0 0" }}>
                  {latestEggSale
                    ? `${rupiah(latestEggSale.jumlah, true)} · ${new Date(latestEggSale.date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}`
                    : "Belum ada data penjualan telur"}
                </p>
                <div style={{ marginTop: 10, height: 4, background: "#2a2a2a", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${latestEggSale && latestEggSale.stockKg > 0 ? Math.min((latestEggSale.volKg / latestEggSale.stockKg) * 100, 100) : 0}%`, background: "#4edea3", borderRadius: 2 }} />
                </div>
              </div>

              {/* HDP */}
              <div className="stat-card" onMouseEnter={e => (e.currentTarget.style.borderColor = "#89ceff")} onMouseLeave={e => (e.currentTarget.style.borderColor = "#2E2E2E")}>
                <div className="stat-icon"><span className="material-symbols-outlined" style={{ fontSize: 40, color: "#89ceff" }}>analytics</span></div>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#bbcabf", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Current HDP %</p>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <h2 style={{ fontSize: 36, fontWeight: 700, color: "#e5e2e1", margin: 0, lineHeight: 1 }}>{latestHdp.toFixed(1)}%</h2>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#89ceff" }}>{latestHdp >= 50 ? "Optimal" : "Sedang"}</span>
                </div>
                <div style={{ marginTop: 16, height: 4, background: "#2a2a2a", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${latestHdp}%`, background: "#89ceff", borderRadius: 2 }} />
                </div>
              </div>

              {/* Pendapatan */}
              <div className="stat-card" onMouseEnter={e => (e.currentTarget.style.borderColor = "#ffb95f")} onMouseLeave={e => (e.currentTarget.style.borderColor = "#2E2E2E")}>
                <div className="stat-icon"><span className="material-symbols-outlined" style={{ fontSize: 40, color: "#ffb95f" }}>payments</span></div>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#bbcabf", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Total Pendapatan</p>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <h2 style={{ fontSize: 28, fontWeight: 700, color: "#e5e2e1", margin: 0, lineHeight: 1 }}>{rupiah(totalPendapatan, true)}</h2>
                </div>
                <div style={{ marginTop: 16, height: 4, background: "#2a2a2a", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${financeSummary.totalInvestasi > 0 ? (totalPendapatan / financeSummary.totalInvestasi) * 100 : 0}%`, background: "#ffb95f", borderRadius: 2 }} />
                </div>
              </div>

              {/* Ayam aktif */}
              <div className="stat-card" onMouseEnter={e => (e.currentTarget.style.borderColor = "#10b981")} onMouseLeave={e => (e.currentTarget.style.borderColor = "#2E2E2E")}>
                <div className="stat-icon"><span className="material-symbols-outlined" style={{ fontSize: 40, color: "#10b981" }}>layers</span></div>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#bbcabf", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Active Flock</p>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <h2 style={{ fontSize: 36, fontWeight: 700, color: "#e5e2e1", margin: 0, lineHeight: 1 }}>{fmtInt(flockSummary.aktif)}</h2>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#bbcabf" }}>ekor</span>
                </div>
                <div style={{ marginTop: 16, display: "flex", gap: 3 }}>
                  {[...Array(5)].map((_, i) => (
                    <div key={i} style={{ flex: 1, height: 4, background: i < Math.min(flockSummary.totalDibeli / 200, 5) ? "#4edea3" : "#2a2a2a", borderRadius: 2 }} />
                  ))}
                </div>
              </div>
            </div>

            {/* ── Row 2: HDP Chart (8) + Gauge (4) ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(12,1fr)", gap: 16, marginBottom: 16 }}>
              {/* HDP Bar chart */}
              <div className="chart-card" style={{ gridColumn: "span 8" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 600, color: "#e5e2e1", margin: 0 }}>
                      HDP Trends — {hdpView === "monthly" ? "Rata-rata Bulanan" : "Rata-rata Mingguan"}
                    </h3>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#bbcabf", margin: "4px 0 0", letterSpacing: "0.03em" }}>
                      {hdpView === "monthly" ? `${hdpBarData.length} bulan` : `${hdpWeeklyData.length} minggu`} · data dari produksi
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 4, background: "#1E1E1E", border: "1px solid #2E2E2E", borderRadius: 6, padding: 3 }}>
                    {(["weekly", "monthly"] as const).map(v => (
                      <button key={v} onClick={() => setHdpView(v)} style={{
                        padding: "5px 14px", borderRadius: 4, border: "none", cursor: "pointer",
                        fontSize: 11, fontWeight: 700, transition: "all 0.15s",
                        background: hdpView === v ? "#4edea3" : "transparent",
                        color: hdpView === v ? "#003824" : "#bbcabf",
                      }}>{v === "weekly" ? "Weekly" : "Monthly"}</button>
                    ))}
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={activeHdpData} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2E2E2E" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: hdpView === "weekly" ? 9 : 11, fill: "#bbcabf" }} tickLine={false} axisLine={false} interval={hdpView === "weekly" ? 2 : 0} />
                    <YAxis domain={[0, 70]} tick={{ fontSize: 10, fill: "#bbcabf" }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                    <Tooltip content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null
                      const d = payload[0]?.payload as { hdp?: number; min?: number; max?: number } | undefined
                      return (
                        <div className="fc-tooltip">
                          <p style={{ color: "#bbcabf", marginBottom: 6, fontWeight: 600, fontSize: 12 }}>{hdpView === "weekly" ? `Minggu ${label}` : label}</p>
                          <div style={{ fontSize: 12, color: "#4edea3", fontWeight: 700 }}>Avg HDP: {d?.hdp !== undefined ? d.hdp.toFixed(1) : "0.0"}%</div>
                          {hdpView === "weekly" && d?.min !== undefined && (<>
                            <div style={{ fontSize: 11, color: "#bbcabf", marginTop: 3 }}>Min: {d.min}%</div>
                            <div style={{ fontSize: 11, color: "#bbcabf" }}>Max: {d.max}%</div>
                          </>)}
                        </div>
                      )
                    }} cursor={{ fill: "rgba(78,222,163,0.05)" }} />
                    <Bar dataKey="hdp" radius={[4, 4, 0, 0]}>
                      {activeHdpData.map((d, i) => (
                        <Cell key={i} fill={d.hdp >= 50 ? "#4edea3" : d.hdp >= 35 ? "#ffb95f" : "#ffb4ab"} fillOpacity={0.85}
                          style={{ filter: d.hdp >= 50 ? "drop-shadow(0 0 4px rgba(78,222,163,0.4))" : "none" }} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Real-time HDP Gauge */}
              <div className="chart-card" style={{ gridColumn: "span 4", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: "#e5e2e1", margin: "0 0 4px" }}>Real-time HDP</h3>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#bbcabf", margin: 0, letterSpacing: "0.03em" }}>Efficiency vs Target</p>
                </div>
                <div style={{ marginTop: 16 }}><GaugeChart value={latestHdp} max={70} /></div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
                  {[
                    { label: "Target", value: "50.0%" },
                    { label: `Peak`, value: `${peakHdp.toFixed(1)}%` },
                    { label: "Ayam aktif", value: `${fmtInt(flockSummary.aktif)} ekor` },
                  ].map(item => (
                    <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#1c1b1b", padding: "8px 12px", borderRadius: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#bbcabf", textTransform: "uppercase", letterSpacing: "0.04em" }}>{item.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#e5e2e1" }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Row 3: Cash Flow (7) + Critical Alerts (5) ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(12,1fr)", gap: 16, marginBottom: 32 }}>
              {/* Cash Flow */}
              <div className="chart-card" style={{ gridColumn: "span 7" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 600, color: "#e5e2e1", margin: 0 }}>Cash Flow Analysis</h3>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#bbcabf", margin: "4px 0 0", letterSpacing: "0.03em" }}>Income vs Expense (dari finance)</p>
                  </div>
                  <span className="material-symbols-outlined" style={{ color: "#4edea3" }}>payments</span>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={monthlyCashflow} margin={{ top: 4, right: 4, left: -15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="incGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4edea3" stopOpacity={0.15} />
                        <stop offset="100%" stopColor="#4edea3" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2E2E2E" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#bbcabf" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#bbcabf" }} tickLine={false} axisLine={false} tickFormatter={v => rupiah(v, true)} />
                    <Tooltip content={<DarkTooltip />} />
                    <Line type="monotone" dataKey="income" name="Income" stroke="#4edea3" strokeWidth={2} dot={false} activeDot={{ r: 5, fill: "#4edea3", strokeWidth: 0 }} />
                    <Line type="monotone" dataKey="expense" name="Expense" stroke="#ffb95f" strokeWidth={2} dot={false} strokeDasharray="4 3" activeDot={{ r: 5, fill: "#ffb95f", strokeWidth: 0 }} />
                  </LineChart>
                </ResponsiveContainer>
                <div style={{ display: "flex", gap: 24, marginTop: 16, paddingTop: 12, borderTop: "1px solid #2E2E2E" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#4edea3" }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#e5e2e1" }}>Income: {rupiah(totalPendapatan, true)}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ffb95f" }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#e5e2e1" }}>Expense: {rupiah(totalBiayaOps, true)}</span>
                  </div>
                </div>
              </div>

              {/* Critical Alerts */}
              <div style={{ gridColumn: "span 5", background: "#121212", border: "1px solid #2E2E2E", borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                <div style={{ padding: "16px 24px", borderBottom: "1px solid #3c4a42", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: "#e5e2e1", margin: 0 }}>Critical Alerts</h3>
                  <span style={{ background: "#93000a", color: "#ffdad6", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20, letterSpacing: "0.04em" }}>
                    {DYNAMIC_ALERTS.filter(a => a.type === "error").length} ACTION REQUIRED
                  </span>
                </div>
                <div style={{ flex: 1, overflowY: "auto" }}>
                  {DYNAMIC_ALERTS.map((alert, i) => {
                    const color = alert.type === "error" ? "#ffb4ab" : alert.type === "warning" ? "#ffb95f" : "#4edea3"
                    return (
                      <div key={i} className="alert-item">
                        <div style={{ display: "flex", gap: 12 }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, marginTop: 6, flexShrink: 0, ...(alert.type === "error" ? { animation: "led-pulse 2s infinite" } : {}) }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                              <span style={{ fontSize: 14, fontWeight: 600, color: "#e5e2e1" }}>{alert.title}</span>
                              <span style={{ fontSize: 10, color: "#bbcabf" }}>realtime</span>
                            </div>
                            <p style={{ fontSize: 12, color: "#bbcabf", margin: 0, lineHeight: 1.5 }}>{alert.desc}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* ── Row 4: Cage Assets (6) + Data Integration (6) ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, paddingBottom: 80 }}>
              <div className="chart-card" style={{ gridColumn: "span 2" }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: "#e5e2e1", margin: "0 0 20px" }}>Cage Assets Inventory</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={{ background: "#1c1b1b", padding: 16, borderRadius: 8, border: "1px solid #3c4a42" }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#bbcabf", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.04em" }}>Infrastructure</p>
                    <div style={{ fontSize: 22, fontWeight: 700, color: "#4edea3" }}>{rupiah(inventoryStats.totalNilai, true)}</div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#bbcabf", margin: "8px 0 0" }}>{inventoryStats.totalItems} item inventory</p>
                  </div>
                  <div style={{ background: "#1c1b1b", padding: 16, borderRadius: 8, border: "1px solid #3c4a42" }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#bbcabf", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.04em" }}>Ayam Aktif</p>
                    <div style={{ fontSize: 22, fontWeight: 700, color: "#89ceff" }}>
                      {flockSummary.totalDibeli > 0 ? ((flockSummary.aktif / flockSummary.totalDibeli) * 100).toFixed(1) : 0}%
                    </div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#bbcabf", margin: "8px 0 0" }}>{flockSummary.aktif} dari {flockSummary.totalDibeli} ekor</p>
                  </div>
                </div>
                {/* Top investasi items */}
                <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                  {investasiItems.slice(0, 4).map((item, i) => {
                    const colors = ["#4edea3", "#89ceff", "#ffb95f", "#ffb4ab"]
                    const pct = inventoryStats.totalNilai > 0 ? (item.jumlah / inventoryStats.totalNilai) * 100 : 0
                    return (
                      <div key={i}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12 }}>
                          <span style={{ color: "#bbcabf" }}>{item.label}</span>
                          <span style={{ color: "#e5e2e1", fontWeight: 600 }}>{rupiah(item.jumlah, true)}</span>
                        </div>
                        <div style={{ height: 4, background: "#2a2a2a", borderRadius: 2 }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: colors[i], borderRadius: 2 }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Data Integration */}
              <div className="chart-card" style={{ gridColumn: "span 2", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", position: "relative", overflow: "hidden", minHeight: 240 }}>
                <div style={{ position: "absolute", inset: 0, opacity: 0.06, background: "radial-gradient(circle at 60% 40%, #4edea3 0%, transparent 65%)", pointerEvents: "none" }} />
                <div style={{ position: "relative", zIndex: 1 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 48, color: "#4edea3", marginBottom: 8 }}>add_task</span>
                  <h4 style={{ fontSize: 22, fontWeight: 600, color: "#e5e2e1", margin: "0 0 8px" }}>Data Integration Active</h4>
                  <p style={{ fontSize: 14, color: "#bbcabf", maxWidth: 280, margin: "0 auto 12px", lineHeight: 1.6 }}>
                    Finance · Livestock · Inventory · Produksi
                  </p>
                  <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                    {[
                      { label: "Finance", color: "#4edea3" },
                      { label: "Livestock", color: "#89ceff" },
                      { label: "Inventory", color: "#ffb95f" },
                      { label: "Produksi", color: "#f472b6" },
                    ].map(s => (
                      <span key={s.label} style={{ fontSize: 10, fontWeight: 700, color: s.color, background: `${s.color}15`, border: `1px solid ${s.color}40`, borderRadius: 20, padding: "3px 10px" }}>{s.label}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* ── Mobile bottom nav ── */}
        <nav style={{ display: "none", position: "fixed", bottom: 0, left: 0, right: 0, background: "#121212", borderTop: "1px solid #3c4a42", height: 64, alignItems: "center", justifyContent: "space-around", padding: "0 16px", zIndex: 50 }} className="mobile-nav">
          {[
            { label: "Home",    icon: "dashboard",     active: true },
            { label: "Prod",    icon: "egg",           active: false },
            { label: "Finance", icon: "payments",      active: false },
            { label: "Alerts",  icon: "notifications", active: false },
          ].map(item => (
            <a key={item.label} href="#" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, textDecoration: "none", color: item.active ? "#4edea3" : "#bbcabf" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 22 }}>{item.icon}</span>
              <span style={{ fontSize: 10, fontWeight: item.active ? 700 : 400 }}>{item.label}</span>
            </a>
          ))}
        </nav>

        <style>{`
          @media (max-width: 768px) {
            aside { display: none !important; }
            main { margin-left: 0 !important; }
            .mobile-nav { display: flex !important; }
          }
        `}</style>
      </div>
    </>
  )
}
