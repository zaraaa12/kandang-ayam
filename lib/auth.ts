/**
 * lib/auth.ts
 * Client-side auth helpers — cookie-based session.
 */

const COOKIE = "fc_auth"

export interface AuthUser {
  username: string
  name: string
  role: string
}

export function setAuthCookie(user: AuthUser) {
  document.cookie = `${COOKIE}=${encodeURIComponent(JSON.stringify(user))}; path=/; SameSite=Lax`
}

export function clearAuthCookie() {
  document.cookie = `${COOKIE}=; path=/; max-age=0`
}

export function getAuthUser(): AuthUser | null {
  if (typeof document === "undefined") return null
  const match = document.cookie.split(";").find(c => c.trim().startsWith(COOKIE + "="))
  if (!match) return null
  try {
    return JSON.parse(decodeURIComponent(match.split("=").slice(1).join("=")))
  } catch {
    return null
  }
}

export function logout() {
  clearAuthCookie()
  window.location.href = "/login"
}
