"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState, useTransition } from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { BULAN_ORDER } from "@/data/produksi"
import { deleteProduksiAction, saveProduksiAction } from "@/app/produksi/actions"
import type { ProduksiRecord } from "@/lib/produksi-db"
import { fmtInt } from "@/lib/fmt"
import { logout } from "@/lib/auth"

type FormState = {
  date: string
  act: string
  vol: string
  ayam: string
}
type ChartRecord = ProduksiRecord & { label: string }
type ChartTooltipProps = {
  active?: boolean
  payload?: Array<{ payload?: ChartRecord }>
}

const NAV_ITEMS = [
  { label: "Dashboard", icon: "dashboard", href: "/dashboard" },
  { label: "Production", icon: "egg", href: "/produksi" },
  { label: "Finance", icon: "payments", href: "/finance" },
  { label: "Livestock", icon: "pets", href: "/livestock" },
  { label: "Inventory", icon: "inventory_2", href: "/inventory" },
]

function sortRecords(records: ProduksiRecord[]) {
  return [...records].sort((a, b) => a.date.localeCompare(b.date))
}

function hdpColor(v: number) {
  return v >= 50 ? "#4edea3" : v >= 35 ? "#ffb95f" : "#ffb4ab"
}

function statusLabel(v: number) {
  return v >= 50 ? "Baik" : v >= 35 ? "Sedang" : "Rendah"
}

function emptyForm(): FormState {
  return {
    date: new Date().toISOString().slice(0, 10),
    act: "",
    vol: "",
    ayam: "820",
  }
}

function calculateStats(records: ProduksiRecord[]) {
  if (!records.length) return null
  const totalAct = records.reduce((sum, item) => sum + item.act, 0)
  const totalVol = records.reduce((sum, item) => sum + item.vol, 0)
  const avgHdp = records.reduce((sum, item) => sum + item.hdp, 0) / records.length
  const maxHdp = Math.max(...records.map(item => item.hdp))
  const minHdp = Math.min(...records.map(item => item.hdp))
  const last = records[records.length - 1]
  return {
    totalAct,
    totalVol,
    avgHdp,
    maxHdp,
    minHdp,
    lastAyam: last.ayam,
    hari: records.length,
  }
}

function DarkTooltip({ active, payload }: ChartTooltipProps) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null

  return (
    <div style={{ background: "#1E1E1E", border: "1px solid #3c4a42", borderRadius: 8, padding: "10px 14px", fontSize: 12, minWidth: 160 }}>
      <p style={{ color: "#bbcabf", marginBottom: 6, fontWeight: 600 }}>
        {new Date(d.date).toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" })}
      </p>
      {[
        ["HDP", `${d.hdp.toFixed(1)}%`, hdpColor(d.hdp)],
        ["Telur", `${fmtInt(d.act)} butir`, "#e5e2e1"],
        ["Volume", `${d.vol.toFixed(2)} kg`, "#e5e2e1"],
        ["Ayam", `${fmtInt(d.ayam)} ekor`, "#bbcabf"],
      ].map(([label, value, color]) => (
        <div key={label as string} style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
          <span style={{ color: "#bbcabf" }}>{label}</span>
          <span style={{ color: color as string, fontWeight: 600 }}>{value}</span>
        </div>
      ))}
    </div>
  )
}

export default function ProduksiCrudClient({ initialRecords }: { initialRecords: ProduksiRecord[] }) {
  const router = useRouter()
  const [records, setRecords] = useState<ProduksiRecord[]>(() => sortRecords(initialRecords))
  const [bulan, setBulan] = useState("Semua")
  const [mode, setMode] = useState<"area" | "bar">("area")
  const [search, setSearch] = useState("")
  const [form, setForm] = useState<FormState>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [isPending, startTransition] = useTransition()

  const visibleRecords = useMemo(() => {
    const q = search.trim().toLowerCase()
    return records.filter(record => {
      const matchMonth = bulan === "Semua" || record.month === bulan
      const matchSearch = !q || [
        record.date,
        record.month,
        record.act.toString(),
        record.vol.toFixed(2),
        record.ayam.toString(),
        record.hdp.toFixed(1),
      ].some(value => value.toLowerCase().includes(q))
      return matchMonth && matchSearch
    })
  }, [records, bulan, search])

  const chartData = useMemo(() => visibleRecords.map(item => ({
    ...item,
    label: new Date(item.date).toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
  })), [visibleRecords])

  const stats = useMemo(() => calculateStats(visibleRecords), [visibleRecords])
  const rekap = useMemo(() => {
    return [...new Set([...BULAN_ORDER, ...records.map(item => item.month)])]
      .map(month => {
        const monthRecords = records.filter(item => item.month === month)
        const stat = calculateStats(monthRecords)
        return stat ? { bulan: month, avgHdp: stat.avgHdp, totalVol: stat.totalVol, hari: stat.hari } : null
      })
      .filter(Boolean) as { bulan: string; avgHdp: number; totalVol: number; hari: number }[]
  }, [records])

  const maxHdp = chartData.length ? Math.max(...chartData.map(item => item.hdp)) : 0
  const minHdp = chartData.length ? Math.min(...chartData.map(item => item.hdp)) : 0
  const tickGap = bulan === "Semua" ? Math.max(0, Math.floor(chartData.length / 8)) : 4
  const deletingRecord = deleteId ? records.find(item => item.id === deleteId) : null

  function openCreateForm() {
    setEditingId(null)
    setForm(emptyForm())
    setIsFormOpen(true)
    setErrorMessage("")
  }

  function openEditForm(record: ProduksiRecord) {
    setEditingId(record.id)
    setForm({
      date: record.date,
      act: String(record.act),
      vol: String(record.vol),
      ayam: String(record.ayam),
    })
    setIsFormOpen(true)
    setErrorMessage("")
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage("")
    startTransition(async () => {
      try {
        const savedRecord = await saveProduksiAction(editingId, form)
        setRecords(current => {
          const next = editingId
            ? current.map(item => item.id === editingId ? savedRecord : item)
            : [...current, savedRecord]
          return sortRecords(next)
        })
        setBulan("Semua")
        setSearch("")
        setIsFormOpen(false)
        setEditingId(null)
        setForm(emptyForm())
        router.refresh()
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Gagal menyimpan record produksi.")
      }
    })
  }

  function confirmDelete() {
    if (!deleteId) return
    const id = deleteId
    setErrorMessage("")
    startTransition(async () => {
      try {
        await deleteProduksiAction(id)
        setRecords(current => current.filter(item => item.id !== id))
        setDeleteId(null)
        router.refresh()
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Gagal menghapus record produksi.")
      }
    })
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');
        .material-symbols-outlined { font-variation-settings: 'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24; }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #121212; }
        ::-webkit-scrollbar-thumb { background: #3c4a42; border-radius: 3px; }
        .production-action { border: none; background: transparent; color: #bbcabf; cursor: pointer; border-radius: 6px; padding: 6px; line-height: 0; }
        .production-action:hover { color: #4edea3; background: #1e1e1e; }
        .production-action.danger:hover { color: #ffb4ab; }
        .production-input { width: 100%; background: #121212; border: 1px solid #3c4a42; border-radius: 8px; color: #e5e2e1; padding: 10px 12px; font: inherit; outline: none; }
        .production-input:focus { border-color: #4edea3; box-shadow: 0 0 0 3px rgba(78,222,163,0.12); }
      `}</style>

      <div style={{ display: "flex", minHeight: "100vh", background: "#050505", color: "#e5e2e1", fontFamily: "'Inter', sans-serif" }}>
        <aside style={{ width: 256, flexShrink: 0, background: "#121212", borderRight: "1px solid #2E2E2E", display: "flex", flexDirection: "column", padding: "24px 0", position: "sticky", top: 0, height: "100vh" }}>
          <div style={{ padding: "0 24px", marginBottom: 32 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#4edea3", margin: 0 }}>Farm Command</h1>
            <p style={{ fontSize: 11, letterSpacing: "0.05em", fontWeight: 700, color: "#bbcabf", margin: "4px 0 0", textTransform: "uppercase" }}>Facility ID: P-882</p>
          </div>
          <nav style={{ flex: 1, padding: "0 12px", display: "flex", flexDirection: "column", gap: 2 }}>
            {NAV_ITEMS.map(({ label, icon, href }) => {
              const active = label === "Production"
              return (
                <Link key={label} href={href} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 8,
                  textDecoration: "none", background: active ? "#10b981" : "transparent",
                  color: active ? "#00422b" : "#bbcabf", fontWeight: active ? 600 : 400, fontSize: 16,
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 22 }}>{icon}</span>
                  {label}
                </Link>
              )
            })}
          </nav>
          <div style={{ padding: "16px 12px 0", borderTop: "1px solid #2E2E2E" }}>
            <button onClick={logout} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 8, border: "none", background: "transparent", color: "#bbcabf", fontSize: 16, cursor: "pointer", width: "100%" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 22 }}>logout</span>
              Logout
            </button>
          </div>
        </aside>

        <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <header style={{ minHeight: 64, background: "#050505", borderBottom: "1px solid #2E2E2E", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "12px 24px", position: "sticky", top: 0, zIndex: 40 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <h2 style={{ fontSize: 22, fontWeight: 600, color: "#4edea3", margin: 0 }}>PoultryPro Analytics</h2>
              <div style={{ width: 1, height: 32, background: "#2E2E2E" }} />
              <div style={{ position: "relative" }}>
                <span className="material-symbols-outlined" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#bbcabf", fontSize: 18 }}>search</span>
                <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search records..." style={{ background: "#121212", border: "1px solid #2E2E2E", outline: "none", color: "#e5e2e1", borderRadius: 8, padding: "8px 16px 8px 40px", width: 256, fontSize: 14 }} />
              </div>
            </div>
            <button onClick={openCreateForm} style={{ background: "#4edea3", color: "#003824", padding: "9px 16px", borderRadius: 8, fontWeight: 700, display: "flex", alignItems: "center", gap: 8, border: "none", cursor: "pointer", fontSize: 14 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>add</span>
              Add Record
            </button>
          </header>

          <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>Production Records</h2>
                <p style={{ fontSize: 14, color: "#bbcabf", margin: "4px 0 0" }}>Tambah, ubah, hapus, dan pantau produksi telur harian.</p>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {["Semua", ...rekap.map(item => item.bulan)].map(item => (
                  <button key={item} onClick={() => setBulan(item)} style={{
                    padding: "6px 14px", borderRadius: 20, fontSize: 13, fontWeight: bulan === item ? 600 : 400,
                    border: "1px solid", cursor: "pointer", borderColor: bulan === item ? "#4edea3" : "#2E2E2E",
                    background: bulan === item ? "rgba(78,222,163,0.1)" : "transparent",
                    color: bulan === item ? "#4edea3" : "#bbcabf",
                  }}>
                    {item === "Semua" ? "All Months" : item}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
              {[
                { label: "Avg. % HDP", val: stats ? `${stats.avgHdp.toFixed(1)}%` : "0.0%", sub: `${stats?.hari ?? 0} hari data` },
                { label: "Peak HDP", val: stats ? `${stats.maxHdp.toFixed(1)}%` : "0.0%", sub: "Tertinggi dicapai" },
                { label: "Total Volume", val: stats ? `${stats.totalVol.toFixed(0)} kg` : "0 kg", sub: `${fmtInt(stats?.totalAct ?? 0)} butir` },
                { label: "Active Flock", val: fmtInt(stats?.lastAyam ?? 0), sub: "ekor data terakhir" },
              ].map(item => (
                <div key={item.label} style={{ background: "#121212", border: "1px solid #2E2E2E", padding: 16, borderRadius: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#bbcabf", textTransform: "uppercase", letterSpacing: "0.05em" }}>{item.label}</span>
                  <p style={{ fontSize: 22, fontWeight: 700, color: "#4edea3", margin: "8px 0 4px" }}>{item.val}</p>
                  <p style={{ fontSize: 12, color: "#bbcabf", margin: 0 }}>{item.sub}</p>
                </div>
              ))}
            </div>

            <section style={{ background: "#121212", border: "1px solid #2E2E2E", borderRadius: 8, padding: 24 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, gap: 16 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Daily HDP Trend {bulan !== "Semua" && <span style={{ color: "#4edea3" }}>- {bulan}</span>}</h3>
                  <p style={{ fontSize: 12, color: "#bbcabf", margin: "4px 0 0" }}>Min {minHdp.toFixed(1)}% - Max {maxHdp.toFixed(1)}% - Avg {(stats?.avgHdp ?? 0).toFixed(1)}%</p>
                </div>
                <div style={{ display: "flex", background: "#1E1E1E", border: "1px solid #2E2E2E", borderRadius: 8, padding: 4, gap: 2 }}>
                  {(["area", "bar"] as const).map(item => (
                    <button key={item} onClick={() => setMode(item)} style={{
                      padding: "6px 14px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 13,
                      background: mode === item ? "#2a2a2a" : "transparent",
                      color: mode === item ? "#e5e2e1" : "#bbcabf",
                      fontWeight: mode === item ? 600 : 400,
                    }}>{item === "area" ? "Area" : "Bar"}</button>
                  ))}
                </div>
              </div>

              <ResponsiveContainer width="100%" height={280}>
                {mode === "area" ? (
                  <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="productionHdpGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4edea3" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#4edea3" stopOpacity={0.01} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2E2E2E" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#bbcabf" }} tickLine={false} axisLine={false} interval={tickGap} />
                    <YAxis domain={[0, 70]} tick={{ fontSize: 10, fill: "#bbcabf" }} tickLine={false} axisLine={false} tickFormatter={value => `${value}%`} />
                    <Tooltip content={<DarkTooltip />} />
                    <ReferenceLine y={50} stroke="#4edea3" strokeDasharray="5 4" strokeWidth={1.5} />
                    <Area type="monotone" dataKey="hdp" stroke="#4edea3" strokeWidth={2} fill="url(#productionHdpGradient)" dot={false} activeDot={{ r: 5, fill: "#4edea3", strokeWidth: 0 }} />
                  </AreaChart>
                ) : (
                  <BarChart data={chartData} margin={{ top: 4, right: 4, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2E2E2E" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#bbcabf" }} tickLine={false} axisLine={false} interval={tickGap} />
                    <YAxis domain={[0, 70]} tick={{ fontSize: 10, fill: "#bbcabf" }} tickLine={false} axisLine={false} tickFormatter={value => `${value}%`} />
                    <Tooltip content={<DarkTooltip />} cursor={{ fill: "rgba(78,222,163,0.05)" }} />
                    <ReferenceLine y={50} stroke="#4edea3" strokeDasharray="5 4" strokeWidth={1.5} />
                    <Bar dataKey="hdp" radius={[3, 3, 0, 0]}>
                      {chartData.map(item => <Cell key={item.id} fill={hdpColor(item.hdp)} fillOpacity={0.85} />)}
                    </Bar>
                  </BarChart>
                )}
              </ResponsiveContainer>
            </section>

            <section style={{ background: "#121212", border: "1px solid #2E2E2E", borderRadius: 8, padding: 24 }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 20px" }}>Monthly Recap</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12 }}>
                {rekap.map(item => (
                  <button key={item.bulan} onClick={() => setBulan(item.bulan)} style={{
                    background: bulan === item.bulan ? "rgba(78,222,163,0.08)" : "#1E1E1E",
                    border: `1px solid ${bulan === item.bulan ? "#4edea3" : "#2E2E2E"}`,
                    borderRadius: 8, padding: "12px 10px", textAlign: "left", cursor: "pointer",
                  }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#bbcabf", margin: "0 0 4px", textTransform: "uppercase" }}>{item.bulan}</p>
                    <p style={{ fontSize: 20, fontWeight: 700, color: hdpColor(item.avgHdp), margin: "0 0 2px" }}>{item.avgHdp.toFixed(1)}%</p>
                    <p style={{ fontSize: 11, color: "#bbcabf", margin: 0 }}>{item.totalVol.toFixed(0)} kg - {item.hari} hari</p>
                  </button>
                ))}
              </div>
            </section>

            <section style={{ background: "#121212", border: "1px solid #2E2E2E", borderRadius: 8, overflow: "hidden", marginBottom: 48 }}>
              <div style={{ padding: "16px 24px", borderBottom: "1px solid #2E2E2E", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Daily Data</h3>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#bbcabf", background: "#1E1E1E", border: "1px solid #2E2E2E", padding: "4px 10px", borderRadius: 20 }}>{visibleRecords.length} records</span>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#1E1E1E", borderBottom: "1px solid #2E2E2E" }}>
                      {["Tanggal", "Bulan", "Telur", "Volume", "Ayam", "HDP", "Status", "Actions"].map((head, index) => (
                        <th key={head} style={{ padding: "14px 24px", fontSize: 11, fontWeight: 700, color: "#bbcabf", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: index >= 2 && index <= 5 ? "right" : index === 7 ? "center" : "left" }}>{head}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRecords.length === 0 && (
                      <tr>
                        <td colSpan={8} style={{ padding: 32, color: "#bbcabf", textAlign: "center" }}>Tidak ada data produksi untuk filter ini.</td>
                      </tr>
                    )}
                    {[...visibleRecords].reverse().map(record => (
                      <tr key={record.id} style={{ borderBottom: "1px solid #2E2E2E" }}>
                        <td style={{ padding: "14px 24px", fontSize: 13, fontWeight: 500, whiteSpace: "nowrap" }}>{new Date(record.date).toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" })}</td>
                        <td style={{ padding: "14px 24px", fontSize: 13, color: "#bbcabf" }}>{record.month}</td>
                        <td style={{ padding: "14px 24px", textAlign: "right", fontSize: 13 }}>{fmtInt(record.act)}</td>
                        <td style={{ padding: "14px 24px", textAlign: "right", fontSize: 13 }}>{record.vol.toFixed(2)} kg</td>
                        <td style={{ padding: "14px 24px", textAlign: "right", fontSize: 13, color: "#bbcabf" }}>{fmtInt(record.ayam)}</td>
                        <td style={{ padding: "14px 24px", textAlign: "right" }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: hdpColor(record.hdp) }}>{record.hdp.toFixed(1)}%</span>
                        </td>
                        <td style={{ padding: "14px 24px" }}>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 20, background: `${hdpColor(record.hdp)}22`, color: hdpColor(record.hdp) }}>{statusLabel(record.hdp)}</span>
                        </td>
                        <td style={{ padding: "14px 24px", textAlign: "center", whiteSpace: "nowrap" }}>
                          <button className="production-action" onClick={() => openEditForm(record)} title="Edit record">
                            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>edit</span>
                          </button>
                          <button className="production-action danger" onClick={() => setDeleteId(record.id)} title="Hapus record">
                            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>delete</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </main>
      </div>

      {isFormOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 80, padding: 24 }}>
          <form onSubmit={handleSubmit} style={{ width: "min(520px, 100%)", background: "#121212", border: "1px solid #3c4a42", borderRadius: 8, padding: 24, boxShadow: "0 20px 80px rgba(0,0,0,0.45)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: 20, margin: 0 }}>{editingId ? "Edit Record Produksi" : "Tambah Record Produksi"}</h3>
                <p style={{ color: "#bbcabf", fontSize: 13, margin: "4px 0 0" }}>HDP dihitung otomatis dari telur dibagi jumlah ayam.</p>
              </div>
              <button type="button" onClick={() => setIsFormOpen(false)} className="production-action" title="Tutup">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <label style={{ display: "grid", gap: 6, gridColumn: "1 / -1", fontSize: 13, color: "#bbcabf" }}>
                Tanggal
                <input className="production-input" type="date" required value={form.date} onChange={event => setForm(current => ({ ...current, date: event.target.value }))} />
              </label>
              <label style={{ display: "grid", gap: 6, fontSize: 13, color: "#bbcabf" }}>
                Telur (butir)
                <input className="production-input" type="number" min="0" required value={form.act} onChange={event => setForm(current => ({ ...current, act: event.target.value }))} />
              </label>
              <label style={{ display: "grid", gap: 6, fontSize: 13, color: "#bbcabf" }}>
                Volume (kg)
                <input className="production-input" type="number" min="0" step="0.01" required value={form.vol} onChange={event => setForm(current => ({ ...current, vol: event.target.value }))} />
              </label>
              <label style={{ display: "grid", gap: 6, fontSize: 13, color: "#bbcabf" }}>
                Ayam (ekor)
                <input className="production-input" type="number" min="1" required value={form.ayam} onChange={event => setForm(current => ({ ...current, ayam: event.target.value }))} />
              </label>
              <div style={{ display: "grid", gap: 6, fontSize: 13, color: "#bbcabf" }}>
                HDP otomatis
                <div style={{ padding: "10px 12px", borderRadius: 8, background: "#1E1E1E", border: "1px solid #2E2E2E", color: hdpColor(Number(form.ayam) > 0 ? (Number(form.act) / Number(form.ayam)) * 100 : 0), fontWeight: 700 }}>
                  {Number(form.ayam) > 0 ? ((Number(form.act) / Number(form.ayam)) * 100).toFixed(1) : "0.0"}%
                </div>
              </div>
            </div>

            {errorMessage && (
              <p style={{ margin: "16px 0 0", color: "#ffb4ab", fontSize: 13, fontWeight: 600 }}>
                {errorMessage}
              </p>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}>
              <button type="button" disabled={isPending} onClick={() => setIsFormOpen(false)} style={{ padding: "10px 16px", borderRadius: 8, border: "1px solid #3c4a42", background: "transparent", color: "#bbcabf", cursor: isPending ? "not-allowed" : "pointer", fontWeight: 600, opacity: isPending ? 0.65 : 1 }}>Batal</button>
              <button type="submit" disabled={isPending} style={{ padding: "10px 16px", borderRadius: 8, border: "none", background: "#4edea3", color: "#003824", cursor: isPending ? "not-allowed" : "pointer", fontWeight: 800, opacity: isPending ? 0.72 : 1 }}>{isPending ? "Menyimpan..." : editingId ? "Simpan Perubahan" : "Tambah Record"}</button>
            </div>
          </form>
        </div>
      )}

      {deleteId && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 90, padding: 24 }}>
          <div style={{ width: "min(420px, 100%)", background: "#121212", border: "1px solid #3c4a42", borderRadius: 8, padding: 24 }}>
            <h3 style={{ margin: 0, fontSize: 20 }}>Hapus record?</h3>
            <p style={{ color: "#bbcabf", fontSize: 14, margin: "8px 0 0" }}>
              {deletingRecord ? `Record ${deletingRecord.date} akan dihapus dari daftar produksi.` : "Record ini akan dihapus dari daftar produksi."}
            </p>
            {errorMessage && (
              <p style={{ margin: "12px 0 0", color: "#ffb4ab", fontSize: 13, fontWeight: 600 }}>
                {errorMessage}
              </p>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}>
              <button type="button" disabled={isPending} onClick={() => setDeleteId(null)} style={{ padding: "10px 16px", borderRadius: 8, border: "1px solid #3c4a42", background: "transparent", color: "#bbcabf", cursor: isPending ? "not-allowed" : "pointer", fontWeight: 600, opacity: isPending ? 0.65 : 1 }}>Batal</button>
              <button type="button" disabled={isPending} onClick={confirmDelete} style={{ padding: "10px 16px", borderRadius: 8, border: "none", background: "#ffb4ab", color: "#690005", cursor: isPending ? "not-allowed" : "pointer", fontWeight: 800, opacity: isPending ? 0.72 : 1 }}>{isPending ? "Menghapus..." : "Hapus"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
