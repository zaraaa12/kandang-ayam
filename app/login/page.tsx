"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense } from "react"

// ─── Auth helpers (cookie-based untuk middleware) ─────────────────────────────
const COOKIE_NAME = "fc_auth"

export function setAuthCookie(user: { username: string; name: string; role: string }) {
  // Session cookie (expires when browser closes)
  document.cookie = `${COOKIE_NAME}=${JSON.stringify(user)}; path=/; SameSite=Lax`
}
export function clearAuthCookie() {
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`
}
export function getAuthCookie() {
  if (typeof document === "undefined") return null
  const match = document.cookie.split(";").find(c => c.trim().startsWith(COOKIE_NAME + "="))
  if (!match) return null
  try { return JSON.parse(decodeURIComponent(match.split("=").slice(1).join("="))) } catch { return null }
}

// ─── Demo users for quick select ──────────────────────────────────────────────
// ─── Inner component (uses useSearchParams — must be inside Suspense) ─────────
function LoginForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const redirect     = searchParams.get("redirect") ?? "/dashboard"

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPw,   setShowPw]   = useState(false)
  const [error,    setError]    = useState("")
  const [loading,  setLoading]  = useState(false)

  useEffect(() => {
    // Already logged in → skip login
    if (getAuthCookie()) router.replace("/dashboard")
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!username || !password) { setError("Username dan password wajib diisi."); return }

    setLoading(true)
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      })

      const data = await response.json()

      if (data.success && data.user) {
        setAuthCookie({ username: data.user.username, name: data.user.name, role: data.user.role })
        router.push(redirect)
      } else {
        setError(data.error || "Username atau password salah. Coba lagi.")
        setLoading(false)
      }
    } catch (error) {
      console.error("Login error:", error)
      setError("Terjadi kesalahan pada server. Silakan coba lagi.")
      setLoading(false)
    }
  }

  return (
    <div style={{ width:460, flexShrink:0, display:"flex", flexDirection:"column", justifyContent:"center", padding:"60px 48px", position:"relative", animation:"fadeIn 0.4s ease" }}>

      {/* Form header */}
      <div style={{ marginBottom:36 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:28 }}>
          <div style={{ width:44, height:44, borderRadius:12, background:"#4edea3", display:"flex", alignItems:"center", justifyContent:"center", color:"#003824", fontSize:24 }}>
            <span className="material-symbols-outlined">agriculture</span>
          </div>
          <div>
            <div style={{ fontSize:18, fontWeight:700, color:"#4edea3" }}>Farm Command</div>
            <div style={{ fontSize:11, color:"#86948a", textTransform:"uppercase", letterSpacing:"0.05em" }}>P-882</div>
          </div>
        </div>
        <h2 style={{ fontSize:28, fontWeight:700, color:"#e5e2e1", letterSpacing:"-0.01em", margin:"0 0 8px" }}>Selamat Datang</h2>
        <p style={{ fontSize:14, color:"#bbcabf", margin:0 }}>Masuk ke sistem manajemen Kandang P-882</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:18 }}>

        {/* Username */}
        <div>
          <label style={{ fontSize:11, fontWeight:700, color:"#bbcabf", textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:8 }}>
            Username
          </label>
          <div style={{ position:"relative" }}>
            <span className="material-symbols-outlined" style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", color:"#86948a", fontSize:20, pointerEvents:"none" }}>person</span>
            <input className="inp" type="text" value={username}
              onChange={e => { setUsername(e.target.value); setError("") }}
              placeholder="Masukkan username" autoComplete="username"
              style={{ paddingLeft:44 }}
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label style={{ fontSize:11, fontWeight:700, color:"#bbcabf", textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:8 }}>
            Password
          </label>
          <div style={{ position:"relative" }}>
            <span className="material-symbols-outlined" style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", color:"#86948a", fontSize:20, pointerEvents:"none" }}>lock</span>
            <input className="inp"
              type={showPw ? "text" : "password"}
              value={password}
              onChange={e => { setPassword(e.target.value); setError("") }}
              placeholder="Masukkan password" autoComplete="current-password"
              style={{ paddingLeft:44, paddingRight:52 }}
            />
            <button type="button" onClick={() => setShowPw(v => !v)}
              style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)", background:"transparent", border:"none", color:"#86948a", cursor:"pointer", lineHeight:0, padding:4 }}
              onMouseEnter={e=>(e.currentTarget.style.color="#4edea3")} onMouseLeave={e=>(e.currentTarget.style.color="#86948a")}>
              <span className="material-symbols-outlined" style={{ fontSize:20 }}>{showPw ? "visibility_off" : "visibility"}</span>
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 14px", background:"rgba(147,0,10,0.12)", border:"1px solid rgba(255,180,171,0.3)", borderRadius:8 }}>
            <span className="material-symbols-outlined" style={{ color:"#ffb4ab", fontSize:18 }}>error</span>
            <span style={{ fontSize:13, color:"#ffb4ab" }}>{error}</span>
          </div>
        )}

        {/* Submit */}
        <button className="btn-login" type="submit" disabled={loading} style={{ marginTop:4 }}>
          {loading ? (
            <>
              <span className="spinner"/>
              Memverifikasi...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined" style={{ fontSize:20 }}>login</span>
              Masuk
            </>
          )}
        </button>
      </form>

      <p style={{ fontSize:11, color:"#86948a", textAlign:"center", marginTop:32 }}>
        © 2025 PoultryPro Analytics · Farm Command P-882
      </p>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LoginPage() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap');
        * { box-sizing:border-box; }
        body { margin:0; background:#050505; }
        .material-symbols-outlined { font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24; vertical-align:middle; display:inline-block; line-height:1; }
        .inp {
          width:100%; background:#0e0e0e; border:1px solid #3c4a42;
          border-radius:8px; padding:13px 16px; color:#e5e2e1;
          font-size:15px; outline:none; font-family:inherit;
          transition:border-color 0.15s, box-shadow 0.15s;
        }
        .inp:focus { border-color:#4edea3; box-shadow:0 0 0 3px rgba(78,222,163,0.12); }
        .inp::placeholder { color:#86948a; }
        .btn-login {
          width:100%; padding:14px; background:#4edea3; color:#003824;
          font-weight:700; font-size:15px; border:none; border-radius:8px;
          cursor:pointer; font-family:inherit; display:flex; align-items:center;
          justify-content:center; gap:8px; letter-spacing:0.02em;
          transition:filter 0.15s, transform 0.1s;
          box-shadow:0 4px 20px rgba(78,222,163,0.25);
        }
        .btn-login:hover:not(:disabled) { filter:brightness(1.1); }
        .btn-login:active:not(:disabled) { transform:scale(0.98); }
        .btn-login:disabled { opacity:0.6; cursor:not-allowed; }
        .user-card {
          display:flex; align-items:center; justify-content:space-between;
          padding:10px 14px; background:#121212; border:1px solid #2e2e2e;
          border-radius:8px; cursor:pointer; transition:border-color 0.15s;
          font-family:inherit; width:100%;
        }
        .user-card:hover { border-color:#4edea3; }
        .spinner {
          width:18px; height:18px; border:2px solid #003824;
          border-top-color:transparent; border-radius:50%;
          animation:spin 0.7s linear infinite; display:inline-block;
        }
        @keyframes spin { to { transform:rotate(360deg) } }
        @keyframes fadeIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes floatA { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-14px)} }
        @keyframes floatB { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
      `}</style>

      <div style={{ minHeight:"100vh", background:"#050505", display:"flex", fontFamily:"'Inter',sans-serif", position:"relative", overflow:"hidden" }}>

        {/* Background decoration */}
        <div style={{ position:"absolute", inset:0, pointerEvents:"none" }}>
          <div style={{ position:"absolute", top:"-10%", left:"-5%", width:500, height:500, borderRadius:"50%", background:"radial-gradient(circle, rgba(78,222,163,0.07) 0%, transparent 70%)", animation:"floatA 8s ease-in-out infinite" }}/>
          <div style={{ position:"absolute", bottom:"-10%", right:"-5%", width:600, height:600, borderRadius:"50%", background:"radial-gradient(circle, rgba(137,206,255,0.04) 0%, transparent 70%)", animation:"floatB 11s ease-in-out infinite" }}/>
          <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", opacity:0.035 }}>
            <defs>
              <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#4edea3" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)"/>
          </svg>
        </div>

        {/* Left branding panel */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"center", padding:"60px 72px", borderRight:"1px solid rgba(60,74,66,0.35)", position:"relative" }}>
          <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:56 }}>
            <div style={{ width:48, height:48, borderRadius:14, background:"#4edea3", display:"flex", alignItems:"center", justifyContent:"center", color:"#003824" }}>
              <span className="material-symbols-outlined" style={{ fontSize:28 }}>agriculture</span>
            </div>
            <div>
              <div style={{ fontSize:22, fontWeight:700, color:"#4edea3" }}>Farm Command</div>
              <div style={{ fontSize:12, fontWeight:700, color:"#bbcabf", textTransform:"uppercase", letterSpacing:"0.06em", marginTop:2 }}>Facility ID: P-882</div>
            </div>
          </div>

          <h1 style={{ fontSize:44, fontWeight:700, color:"#e5e2e1", letterSpacing:"-0.02em", lineHeight:1.15, marginBottom:20, maxWidth:440 }}>
            Kelola Kandang<br/>
            <span style={{ color:"#4edea3" }}>Lebih Cerdas.</span>
          </h1>
          <p style={{ fontSize:15, color:"#bbcabf", lineHeight:1.7, maxWidth:400, marginBottom:48 }}>
            Sistem manajemen terpadu untuk produksi telur, keuangan, ternak, dan inventaris Kandang Ayam P-882.
          </p>

          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {[
              { icon:"egg",        label:"Monitoring HDP & Produksi Telur real-time" },
              { icon:"payments",   label:"Keuangan & laporan penjualan per bulan" },
              { icon:"pets",       label:"Manajemen batch, vaksinasi & pertumbuhan" },
              { icon:"inventory_2",label:"Stok pakan, medis & peralatan kandang" },
            ].map((f,i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:36, height:36, borderRadius:8, background:"rgba(78,222,163,0.1)", border:"1px solid rgba(78,222,163,0.2)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <span className="material-symbols-outlined" style={{ color:"#4edea3", fontSize:18 }}>{f.icon}</span>
                </div>
                <span style={{ fontSize:14, color:"#bbcabf" }}>{f.label}</span>
              </div>
            ))}
          </div>

          <div style={{ display:"flex", gap:40, marginTop:56, paddingTop:32, borderTop:"1px solid rgba(60,74,66,0.35)" }}>
            {[["764","Ayam Aktif"],["51.4%","HDP Des '25"],["5 Batch","Batch Aktif"]].map(([val,lbl],i) => (
              <div key={i}>
                <div style={{ fontSize:26, fontWeight:700, color:"#4edea3" }}>{val}</div>
                <div style={{ fontSize:12, color:"#86948a", marginTop:2 }}>{lbl}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right form panel */}
        <Suspense fallback={<div style={{ width:460, background:"#050505" }}/>}>
          <LoginForm/>
        </Suspense>
      </div>
    </>
  )
}
