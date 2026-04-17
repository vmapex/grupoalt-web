/** Format as BRL without R$ prefix — absolute value, 2 decimals */
export function fmtBRL(v: number): string {
  return Math.abs(v).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/** Abbreviate to K/M with sign */
export function fmtK(v: number): string {
  if (!v || v === 0) return '0'
  const a = Math.abs(v)
  const s = v < 0 ? '\u2212' : ''
  if (a >= 1e6) return s + (a / 1e6).toFixed(1).replace('.', ',') + 'M'
  if (a >= 1e3) return s + (a / 1e3).toFixed(1).replace('.', ',') + 'K'
  return s + a.toFixed(0)
}

/** Format percentage */
export function fmtPct(v: number): string {
  return (v >= 0 ? '' : '\u2212') + Math.abs(v).toFixed(1).replace('.', ',') + '%'
}

/** Parse DD/MM/YYYY to Date */
export function parseDMY(s: string): Date {
  const [d, m, y] = s.split('/')
  return new Date(Number(y), Number(m) - 1, Number(d))
}

/** Generic sort toggle */
export function toggleSort(prev: SortState, field: string): SortState {
  if (prev.field === field) return { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
  return { field, dir: 'asc' }
}

/** Generic row sorter */
export function sortRows<T>(
  rows: T[],
  sort: SortState,
  getVal: (row: T, field: string) => number | string | Date,
): T[] {
  if (!sort.field) return rows
  return [...rows].sort((a, b) => {
    const va = getVal(a, sort.field)
    const vb = getVal(b, sort.field)
    if (va === vb) return 0
    let cmp: number
    if (va instanceof Date && vb instanceof Date) {
      cmp = va.getTime() - vb.getTime()
    } else if (typeof va === 'number' && typeof vb === 'number') {
      cmp = va - vb
    } else {
      cmp = String(va).localeCompare(String(vb), 'pt-BR')
    }
    return sort.dir === 'asc' ? cmp : -cmp
  })
}

const MONTHS_PT: Record<string, number> = {
  jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6,
  jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12,
}

/** Sort "Mmm/YY" labels (pt-BR, e.g. "Jan/26") chronologically. */
export function sortByMonthYear<T>(items: T[], getLabel?: (item: T) => string): T[] {
  const extract = (x: T): string => {
    if (getLabel) return getLabel(x)
    if (typeof x === 'string') return x
    if (x && typeof x === 'object' && 'name' in x) return String((x as { name: unknown }).name ?? '')
    return ''
  }
  const key = (x: T) => {
    const [mon, yr] = extract(x).toLowerCase().split('/')
    return (parseInt(yr || '0', 10) * 100) + (MONTHS_PT[mon] ?? 0)
  }
  return [...items].sort((a, b) => key(a) - key(b))
}

export interface SortState {
  field: string
  dir: 'asc' | 'desc'
}
