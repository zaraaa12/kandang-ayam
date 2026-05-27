import { NextRequest, NextResponse } from "next/server"
import { getDbMode, getDbPool, getSqliteDb, initSqliteDatabase } from "@/lib/db"

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  success: boolean
  user?: {
    username: string
    name: string
    role: string
  }
  error?: string
}

/**
 * POST /api/auth/login
 * Authenticate user against database
 */
export async function POST(request: NextRequest) {
  try {
    const body: LoginRequest = await request.json()
    const { username, password } = body

    // Validate input
    if (!username || !password) {
      return NextResponse.json<LoginResponse>({
        success: false,
        error: "Username dan password wajib diisi."
      }, { status: 400 })
    }

    const dbMode = getDbMode()
    let user: { username: string; password: string; name: string; role: string } | null = null

    if (dbMode === "sqlite") {
      initSqliteDatabase()
      const db = getSqliteDb()
      const row = db
        .prepare("SELECT username, password, name, role FROM users WHERE username = ? AND is_active = 1")
        .get(username) as { username?: string; password?: string; name?: string; role?: string } | undefined

      if (row?.username) {
        user = {
          username: row.username,
          password: row.password ?? "",
          name: row.name ?? "",
          role: row.role ?? ""
        }
      }
    } else {
      try {
        const pool = getDbPool()
        const result = await pool.query(
          "SELECT username, password, name, role FROM users WHERE username = $1 AND is_active = true",
          [username]
        )

        if (result.rows.length > 0) {
          user = result.rows[0]
        }
      } catch (error) {
        console.error("PostgreSQL login failed, falling back to SQLite:", error)
        initSqliteDatabase()
        const db = getSqliteDb()
        const row = db
          .prepare("SELECT username, password, name, role FROM users WHERE username = ? AND is_active = 1")
          .get(username) as { username?: string; password?: string; name?: string; role?: string } | undefined

        if (row?.username) {
          user = {
            username: row.username,
            password: row.password ?? "",
            name: row.name ?? "",
            role: row.role ?? ""
          }
        }
      }
    }

    if (!user) {
      return NextResponse.json<LoginResponse>({
        success: false,
        error: "Username atau password salah. Coba lagi."
      }, { status: 401 })
    }

    // Check password (plain text comparison - should use bcrypt in production)
    if (user.password !== password) {
      return NextResponse.json<LoginResponse>({
        success: false,
        error: "Username atau password salah. Coba lagi."
      }, { status: 401 })
    }

    // Return success with user data (exclude password and id)
    return NextResponse.json<LoginResponse>({
      success: true,
      user: {
        username: user.username,
        name: user.name,
        role: user.role
      }
    })

  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json<LoginResponse>({
      success: false,
      error: "Terjadi kesalahan pada server. Silakan coba lagi."
    }, { status: 500 })
  }
}