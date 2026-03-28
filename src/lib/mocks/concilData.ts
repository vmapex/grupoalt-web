export interface ConcilEntry {
  date: string
  extrato: number
  saldoBanco: number
  dif: number
  conciliado: boolean
  banco: string
}

/** Deterministic pseudo-random based on seed index */
const seed = (i: number): number => Math.abs(Math.sin(i * 9301 + 49297) * 233280) % 1

export function genConcilData(): Record<string, ConcilEntry> {
  const data: Record<string, ConcilEntry> = {}
  const banks = ['Itau', 'Banco do Brasil', 'Bradesco', 'Santander']
  const start = new Date(2025, 9, 1) // Oct 1 2025
  const end = new Date(2026, 2, 31) // Mar 31 2026
  const today = new Date(2025, 10, 27)
  const cur = new Date(start)
  let idx = 0

  while (cur <= end) {
    const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`
    const dow = cur.getDay()
    if (dow !== 0 && dow !== 6) {
      const hasMovement = seed(idx) > 0.12
      if (hasMovement) {
        const extrato = Math.round((seed(idx * 2) - 0.4) * 50000 * 100) / 100
        const saldoLimite = Math.round((seed(idx * 3) * 80000 - 10000) * 100) / 100

        const daysUntilToday = Math.round((today.getTime() - cur.getTime()) / 86400000)
        const reconcileChance =
          daysUntilToday > 30 ? 0.92 : daysUntilToday > 14 ? 0.75 : daysUntilToday > 0 ? 0.55 : 0.2

        const isReconciled = seed(idx * 7) < reconcileChance
        const rawDif = Math.round((extrato - saldoLimite) * 100) / 100
        const dif = isReconciled ? 0 : rawDif
        const saldoBanco = isReconciled ? Math.round((saldoLimite + rawDif) * 100) / 100 : saldoLimite

        data[key] = {
          date: key,
          extrato,
          saldoBanco,
          dif,
          conciliado: dif === 0,
          banco: banks[Math.floor(seed(idx * 5) * banks.length)],
        }
      }
      idx++
    }
    cur.setDate(cur.getDate() + 1)
  }
  return data
}

export const CONCIL_DATA = genConcilData()
