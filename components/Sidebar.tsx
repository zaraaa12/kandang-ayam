"use client"

import { useState } from "react"
import Link from "next/link"
import { getAuthUser, logout, type AuthUser } from "@/lib/auth"

const NAV = [
  { label: "Dashboard",  icon: "dashboard",   href: "/dashboard" },
  { label: "Production", icon: "egg",          href: "/produksi" },
  { label: "Finance",    icon: "payments",     href: "/finance" },
  { label: "Livestock",  icon: "pets",         href: "/livestock" },
  { label: "Inventory",  icon: "inventory_2",  href: "/inventory" },
]

interface SidebarProps {
  active: string
}

export default function Sidebar({ active }: SidebarProps) {
  const [user] = useState<AuthUser | null>(() => getAuthUser())

  const initials = user?.name
    ? user.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : "KA"

  return (
    <aside style={{
      width: 256, flexShrink: 0, background: "#201f1f",
      borderRight: "1px solid #3c4a42", display: "flex",
      flexDirection: "column", padding: "24px 0",
      position: "sticky", top: 0, height: "100vh", zIndex: 50,
    }}>
      {/* Logo */}
      <div style={{ padding: "0 24px", marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 8, background: "#4edea3",
            display: "flex", alignItems: "center", justifyContent: "center", color: "#003824",
          }}>
            <span className="material-symbols-outlined">agriculture</span>
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#4edea3", lineHeight: 1.2 }}>Farm Command</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#bbcabf", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Facility ID: P-882
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "0 16px", display: "flex", flexDirection: "column", gap: 2 }}>
        {NAV.map(({ label, icon, href }) => {
          const isActive = active === label
          return (
            <Link key={label} href={href} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "12px 16px", borderRadius: 8, textDecoration: "none",
              transition: "background 0.15s, color 0.15s",
              background: isActive ? "#10b981" : "transparent",
              color: isActive ? "#00422b" : "#bbcabf",
              fontWeight: isActive ? 600 : 400, fontSize: 16,
            }}
              onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLAnchorElement).style.background = "#353534" }}
              onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLAnchorElement).style.background = "transparent" }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 22 }}>{icon}</span>
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div style={{ padding: "16px 16px 0", borderTop: "1px solid #3c4a42", display: "flex", flexDirection: "column", gap: 4 }}>

        {/* User info */}
        {user && (
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 12px", marginBottom: 8,
            background: "#121212", borderRadius: 8, border: "1px solid #2e2e2e",
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "linear-gradient(135deg,#10b981,#4edea3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#003824", fontWeight: 700, fontSize: 12, flexShrink: 0,
            }}>
              {initials}
            </div>
            <div style={{ overflow: "hidden" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#e5e2e1", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {user.name}
              </div>
              <div style={{ fontSize: 11, color: "#86948a" }}>{user.role}</div>
            </div>
          </div>
        )}

        <Link href="#" style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 12px", borderRadius:8, textDecoration:"none", color:"#bbcabf", fontSize:15 }}
          onMouseEnter={e=>(e.currentTarget.style.background="#353534")} onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>history</span>Logs
        </Link>

        <button
          onClick={logout}
          style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "10px 12px", borderRadius: 8, border: "none",
            background: "transparent", color: "#ffb4ab", fontSize: 15,
            cursor: "pointer", width: "100%", textAlign: "left",
            transition: "background 0.15s",
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,180,171,0.08)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>logout</span>
          Logout
        </button>
      </div>
    </aside>
  )
}
