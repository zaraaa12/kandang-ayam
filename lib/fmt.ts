/**
 * Locale-safe formatting utilities.
 * Avoids Intl.NumberFormat and toLocaleString to prevent SSR↔client
 * hydration mismatches in Next.js App Router.
 */

/** Format integer with thousand separators using dots (id-ID style) */
export function fmtInt(n: number): string {
  return Math.abs(Math.round(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")
}

/** Format as Rupiah. short=true for compact (jt/rb/M) */
export function rupiah(n: number, short = false): string {
  if (short) {
    const abs = Math.abs(n)
    if (abs >= 1_000_000_000) return `Rp${(n / 1_000_000_000).toFixed(1)} M`
    if (abs >= 1_000_000)     return `Rp${(n / 1_000_000).toFixed(0)} jt`
    if (abs >= 1_000)         return `Rp${(n / 1_000).toFixed(0)} rb`
    return `Rp${fmtInt(n)}`
  }
  return `${n < 0 ? "-" : ""}Rp ${fmtInt(n)}`
}
