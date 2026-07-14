/** Format as BRL without R$ prefix — absolute value, 2 decimals */
export function fmtBRL(v: number): string {
  return Math.abs(v).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/** Inteiro pt-BR com separador de milhar e sinal (− U+2212). Ex.: −4.774.032.
 *  Para tabelas/cards onde o valor completo importa — abreviação K/M (fmtK)
 *  fica restrita a gráficos (eixos, rótulos de barra, tooltips). */
export function fmtInt(v: number): string {
  if (!v) return '0'
  const r = Math.round(Math.abs(v))
  if (r === 0) return '0'
  return (v < 0 ? '−' : '') + r.toLocaleString('pt-BR')
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

/** P1-2 Camada 2.2b.2: formata ISO "YYYY-MM-DD" (do backend) para
 *  "DD/MM/YYYY" (display BR). Defensivo para null/undefined/formato invalido.
 *
 *  Exemplos:
 *    formatIsoToBr("2026-03-15") === "15/03/2026"
 *    formatIsoToBr(null) === ""
 *    formatIsoToBr("") === ""
 *    formatIsoToBr("foo") === "foo"  // fallback: devolve raw se nao bate ISO
 */
export function formatIsoToBr(iso: string | null | undefined): string {
  if (!iso) return ''
  // Match exato YYYY-MM-DD (ignora time se vier ISO completo)
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!m) return iso  // devolve raw se nao for ISO (compat com legados/erros)
  return `${m[3]}/${m[2]}/${m[1]}`
}

/** Parse ISO "YYYY-MM-DD" to Date object. Defensive: returns null on invalid input. */
export function parseIso(iso: string | null | undefined): Date | null {
  if (!iso) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!m) return null
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

/** Parse de data CRUA da API → Date local, ou `null` se inválida.
 *
 *  Aceita ISO "YYYY-MM-DD" (canônico pós-P1-2, com ou sem componente de hora
 *  "T...") e o legado "DD/MM/YYYY". Valida a faixa (mês 1-12, dia 1-31) para
 *  NÃO rebucketar via overflow do `new Date` (ex.: mês 13 → ano seguinte).
 *
 *  Fonte ÚNICA de parsing de data crua no front — caixaBuilder, dashboards e
 *  qualquer consumidor de campo de data não-transformado devem usar isto, em
 *  vez de `split('/')`/`parseDMY` próprios (que quebram silenciosamente com ISO). */
export function parseApiDate(s: string | null | undefined): Date | null {
  if (!s) return null
  let y: number
  let mo: number
  let d: number
  if (s.includes('-')) {
    // ISO; slice(0,10) descarta um eventual "T..." de datetime
    const [yy, mm, dd] = s.slice(0, 10).split('-')
    y = Number(yy)
    mo = Number(mm)
    d = Number(dd)
  } else {
    const [dd, mm, yy] = s.split('/')
    d = Number(dd)
    mo = Number(mm)
    y = Number(yy)
  }
  if (!y || !mo || !d || mo < 1 || mo > 12 || d < 1 || d > 31) return null
  return new Date(y, mo - 1, d)
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
