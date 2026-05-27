"use client"

import { useState, useMemo } from "react"
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from "recharts"
import {
  dataProduksi,
  getStatsBulan,
  getRekapBulanan,
  BULAN_ORDER,
} from "@/data/produksi"

// ─── Utility ──────────────────────────────────────────────────────────────────

function hdpColor(hdp: number): string {
  if (hdp >= 50) return "#16a34a"
  if (hdp >= 35) return "#d97706"
  return "#dc2626"
}

function hdpLabel(hdp: number): { text: string; cls: string } {
  if (hdp >= 50) return { text: "Baik", cls: "bg-green-100 text-green-800" }
  if (hdp >= 35) return { text: "Sedang", cls: "bg-amber-100 text-amber-800" }
  return { text: "Rendah", cls: "bg-red-100 text-red-800" }
}

function fmt(n: number, dec = 1) {
  return n.toLocaleString("id-ID", { minimumFractionDigits: dec, maximumFractionDigits: dec })
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload?: { date: string; hdp: number; act: number; vol: number; ayam: number }; }> }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  const { text, cls } = hdpLabel(d.hdp)
  return (
    <div className="bg-white border border-stone-200 rounded-xl shadow-lg p-3 text-sm min-w-[160px]">
      <p className="font-semibold text-stone-700 mb-2">
        {new Date(d.date).toLocaleDateString("id-ID", {
          day: "numeric", month: "short", year: "numeric",
        })}
      </p>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-stone-500">HDP</span>
          <span className="font-semibold" style={{ color: hdpColor(d.hdp) }}>
            {fmt(d.hdp)}%
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-stone-500">Telur</span>
          <span className="font-medium text-stone-700">{d.act.toLocaleString()} butir</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-stone-500">Volume</span>
          <span className="font-medium text-stone-700">{fmt(d.vol)} kg</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-stone-500">Ayam</span>
          <span className="font-medium text-stone-700">{d.ayam.toLocaleString()} ekor</span>
        </div>
        <div className="flex justify-between gap-4 pt-1 border-t border-stone-100">
          <span className="text-stone-500">Status</span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cls}`}>{text}</span>
        </div>
      </div>
    </div>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, unit, sub, trend,
}: {
  label: string; value: string | number; unit?: string
  sub?: string; trend?: "up" | "down" | "neutral"
}) {
  const arrow = trend === "up" ? "↑" : trend === "down" ? "↓" : ""
  const arrowCls = trend === "up" ? "text-green-600" : trend === "down" ? "text-red-500" : ""
  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-5">
      <p className="text-xs font-medium text-stone-400 uppercase tracking-widest mb-2">{label}</p>
      <div className="flex items-end gap-1.5">
        <span className="text-3xl font-bold text-stone-800 leading-none">{value}</span>
        {unit && <span className="text-base text-stone-400 mb-0.5">{unit}</span>}
        {arrow && <span className={`text-sm font-bold mb-0.5 ${arrowCls}`}>{arrow}</span>}
      </div>
      {sub && <p className="text-xs text-stone-400 mt-1.5">{sub}</p>}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProduksiPage() {
  const [bulanAktif, setBulanAktif] = useState<string>("Semua")
  const [viewMode, setViewMode] = useState<"area" | "bar">("area")

  const chartData = useMemo(() => {
    const raw = bulanAktif === "Semua"
      ? dataProduksi
      : dataProduksi.filter(d => d.month === bulanAktif)
    return raw.map(d => ({
      ...d,
      label: new Date(d.date).toLocaleDateString("id-ID", {
        day: "numeric", month: "short",
      }),
    }))
  }, [bulanAktif])

  const stats = useMemo(() => getStatsBulan(bulanAktif), [bulanAktif])
  const rekap = useMemo(() => getRekapBulanan(), [])
  const maxHdp = useMemo(() => Math.max(...chartData.map(d => d.hdp)), [chartData])
  const minHdp = useMemo(() => Math.min(...chartData.map(d => d.hdp)), [chartData])

  if (!stats) return null

  // Ticks: show every N-th label to avoid crowding
  const tickInterval = bulanAktif === "Semua" ? Math.floor(chartData.length / 8) : 4

  return (
    <div className="min-h-screen bg-stone-50 font-sans">

      {/* Header */}
      <header className="bg-white border-b border-stone-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center text-white text-base">
            🥚
          </div>
          <div>
            <h1 className="text-base font-bold text-stone-800 leading-none">Kandang Ayam</h1>
            <p className="text-xs text-stone-400 mt-0.5">Produksi Telur · 2025</p>
          </div>
        </div>
        <nav className="hidden md:flex items-center gap-1 text-sm">
          {["Dashboard", "Produksi", "Keuangan", "SDM"].map(m => (
            <a
              key={m}
              href="#"
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                m === "Produksi"
                  ? "bg-amber-50 text-amber-700"
                  : "text-stone-500 hover:text-stone-700 hover:bg-stone-100"
              }`}
            >
              {m}
            </a>
          ))}
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* Page title + filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-stone-800">Produksi Telur</h2>
            <p className="text-sm text-stone-400 mt-0.5">
              HDP — Hen Day Production · Jul–Des 2025
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {["Semua", ...BULAN_ORDER].map(b => (
              <button
                key={b}
                onClick={() => setBulanAktif(b)}
                className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                  bulanAktif === b
                    ? "bg-amber-500 text-white shadow-sm"
                    : "bg-white text-stone-500 border border-stone-200 hover:border-amber-300 hover:text-amber-600"
                }`}
              >
                {b === "Semua" ? "Semua bulan" : b}
              </button>
            ))}
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            label="Rata-rata HDP"
            value={fmt(stats.avgHdp)}
            unit="%"
            sub={`${stats.hari} hari data`}
            trend={stats.avgHdp >= 45 ? "up" : stats.avgHdp >= 30 ? "neutral" : "down"}
          />
          <KpiCard
            label="HDP Tertinggi"
            value={fmt(stats.maxHdp)}
            unit="%"
            sub="Puncak produksi"
            trend="up"
          />
          <KpiCard
            label="Volume Total"
            value={fmt(stats.totalVol, 0)}
            unit="kg"
            sub={`${stats.totalAct.toLocaleString()} butir`}
          />
          <KpiCard
            label="Ayam Aktif"
            value={stats.lastAyam.toLocaleString()}
            unit="ekor"
            sub="Data terakhir"
          />
        </div>

        {/* Main Chart */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h3 className="font-bold text-stone-800">
                Tren HDP Harian
                {bulanAktif !== "Semua" && (
                  <span className="ml-2 text-amber-500">· {bulanAktif}</span>
                )}
              </h3>
              <p className="text-xs text-stone-400 mt-0.5">
                Min {fmt(minHdp)}% · Maks {fmt(maxHdp)}% · Rata-rata {fmt(stats.avgHdp)}%
              </p>
            </div>
            <div className="flex gap-1 bg-stone-100 rounded-xl p-1">
              <button
                onClick={() => setViewMode("area")}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  viewMode === "area"
                    ? "bg-white text-stone-800 shadow-sm"
                    : "text-stone-400 hover:text-stone-600"
                }`}
              >
                Area
              </button>
              <button
                onClick={() => setViewMode("bar")}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  viewMode === "bar"
                    ? "bg-white text-stone-800 shadow-sm"
                    : "text-stone-400 hover:text-stone-600"
                }`}
              >
                Batang
              </button>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={320}>
            {viewMode === "area" ? (
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="hdpGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#a8a29e" }}
                  tickLine={false}
                  axisLine={false}
                  interval={tickInterval}
                />
                <YAxis
                  domain={[0, 70]}
                  tick={{ fontSize: 11, fill: "#a8a29e" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={v => `${v}%`}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine
                  y={50}
                  stroke="#16a34a"
                  strokeDasharray="5 4"
                  strokeWidth={1.5}
                  label={{
                    value: "Target 50%",
                    position: "insideTopRight",
                    fill: "#16a34a",
                    fontSize: 11,
                  }}
                />
                <ReferenceLine
                  y={stats.avgHdp}
                  stroke="#f59e0b"
                  strokeDasharray="4 4"
                  strokeWidth={1}
                  label={{
                    value: `Avg ${fmt(stats.avgHdp)}%`,
                    position: "insideBottomRight",
                    fill: "#d97706",
                    fontSize: 11,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="hdp"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fill="url(#hdpGradient)"
                  dot={false}
                  activeDot={{ r: 5, fill: "#f59e0b", strokeWidth: 0 }}
                />
              </AreaChart>
            ) : (
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#a8a29e" }}
                  tickLine={false}
                  axisLine={false}
                  interval={tickInterval}
                />
                <YAxis
                  domain={[0, 70]}
                  tick={{ fontSize: 11, fill: "#a8a29e" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={v => `${v}%`}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine
                  y={50}
                  stroke="#16a34a"
                  strokeDasharray="5 4"
                  strokeWidth={1.5}
                  label={{
                    value: "Target 50%",
                    position: "insideTopRight",
                    fill: "#16a34a",
                    fontSize: 11,
                  }}
                />
                <Bar dataKey="hdp" radius={[3, 3, 0, 0]}>
                  {chartData.map((d, i) => (
                    <Cell key={i} fill={hdpColor(d.hdp)} fillOpacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-stone-100 text-xs text-stone-400">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-green-600" />
              <span>≥ 50% Baik</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-amber-500" />
              <span>35–49% Sedang</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-red-500" />
              <span>&lt; 35% Rendah</span>
            </div>
          </div>
        </div>

        {/* Rekap Bulanan */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6">
          <h3 className="font-bold text-stone-800 mb-5">Rekap Bulanan</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {rekap.map(r => {
              const { text, cls } = hdpLabel(r.avgHdp)
              const isActive = bulanAktif === r.bulan
              return (
                <button
                  key={r.bulan}
                  onClick={() => setBulanAktif(r.bulan)}
                  className={`rounded-xl p-3 text-left transition-all border ${
                    isActive
                      ? "border-amber-400 bg-amber-50 shadow-sm"
                      : "border-stone-200 hover:border-amber-200 hover:bg-amber-50/40"
                  }`}
                >
                  <p className="text-xs font-semibold text-stone-500 mb-1">{r.bulan}</p>
                  <p className="text-xl font-bold text-stone-800 leading-none">
                    {fmt(r.avgHdp)}
                    <span className="text-sm font-normal text-stone-400">%</span>
                  </p>
                  <p className="text-[11px] text-stone-400 mt-1">{fmt(r.totalVol, 0)} kg</p>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full mt-1.5 inline-block ${cls}`}>
                    {text}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
            <h3 className="font-bold text-stone-800">
              Data Harian
              {bulanAktif !== "Semua" && (
                <span className="ml-2 text-sm font-normal text-stone-400">· {bulanAktif}</span>
              )}
            </h3>
            <span className="text-xs text-stone-400 bg-stone-100 px-2.5 py-1 rounded-full">
              {chartData.length} hari
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-50 text-left">
                  {["Tanggal", "Bulan", "Telur (butir)", "Volume (kg)", "Ayam (ekor)", "HDP %", "Status"].map(h => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold text-stone-400 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {chartData.slice().reverse().map((d, i) => {
                  const { text, cls } = hdpLabel(d.hdp)
                  return (
                    <tr key={i} className="hover:bg-stone-50/70 transition-colors">
                      <td className="px-4 py-3 font-medium text-stone-700 whitespace-nowrap">
                        {new Date(d.date).toLocaleDateString("id-ID", {
                          weekday: "short", day: "numeric", month: "short",
                        })}
                      </td>
                      <td className="px-4 py-3 text-stone-500">{d.month}</td>
                      <td className="px-4 py-3 text-stone-700">{d.act.toLocaleString()}</td>
                      <td className="px-4 py-3 text-stone-700">{fmt(d.vol)}</td>
                      <td className="px-4 py-3 text-stone-500">{d.ayam.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-stone-100 rounded-full h-1.5 min-w-[50px] max-w-[80px]">
                            <div
                              className="h-1.5 rounded-full transition-all"
                              style={{
                                width: `${Math.min(d.hdp, 70) / 70 * 100}%`,
                                backgroundColor: hdpColor(d.hdp),
                              }}
                            />
                          </div>
                          <span className="font-semibold text-stone-700 w-12 text-right">
                            {fmt(d.hdp)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cls}`}>
                          {text}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  )
}
