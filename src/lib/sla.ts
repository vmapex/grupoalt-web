export const FERIADOS = new Set([
  '2025-10-12',
  '2025-11-02',
  '2025-11-15',
  '2025-11-20',
  '2025-12-25',
  '2026-01-01',
  '2026-02-16',
  '2026-02-17',
  '2026-02-18',
])

export function isBusinessDay(d: Date): boolean {
  const dow = d.getDay()
  if (dow === 0 || dow === 6) return false
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return !FERIADOS.has(key)
}

export function nextBusinessDay(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + 1) // D+1
  while (!isBusinessDay(dt)) {
    dt.setDate(dt.getDate() + 1)
  }
  return dt
}

export function fmtDateBR(key: string): string {
  if (!key) return '\u2014'
  const [y, m, d] = key.split('-')
  return `${d}/${m}/${y}`
}
