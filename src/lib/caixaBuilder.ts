/**
 * Calcula CaixaLevelData a partir de lançamentos do extrato + planoContas
 * Agrupa por trimestre, mês, ou semana conforme o nível
 */

import { CATEGORIAS } from './planoContas'
import type { CaixaLevelData } from './mocks/caixaData'

interface Lancamento {
  data_lancamento?: string | null
  valor: number
  categoria?: string | null
}

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function parseDMY(s: string): Date {
  const [d, m, y] = s.split('/')
  return new Date(Number(y), Number(m) - 1, Number(d))
}

function getGrupoDRE(categoria: string | null | undefined): string | null {
  if (!categoria) return null
  return CATEGORIAS[categoria]?.grupoDRE ?? null
}

function groupBy(
  lancamentos: Lancamento[],
  keyFn: (d: Date) => string,
): Record<string, Record<string, number>> {
  const groups: Record<string, Record<string, number>> = {}
  for (const l of lancamentos) {
    if (!l.data_lancamento) continue
    const dt = parseDMY(l.data_lancamento)
    if (isNaN(dt.getTime())) continue
    const key = keyFn(dt)
    const grupo = getGrupoDRE(l.categoria)
    if (!grupo) continue
    if (!groups[key]) groups[key] = {}
    groups[key][grupo] = (groups[key][grupo] || 0) + Math.abs(l.valor)
  }
  return groups
}

function toLevel(groups: Record<string, Record<string, number>>, sortedKeys: string[]): CaixaLevelData {
  return {
    labels: sortedKeys,
    RB: sortedKeys.map((k) => Math.round(groups[k]?.RoB || 0)),
    TD: sortedKeys.map((k) => Math.round(groups[k]?.TDCF || 0)),
    CV: sortedKeys.map((k) => Math.round(groups[k]?.CV || 0)),
    CF: sortedKeys.map((k) => Math.round(groups[k]?.CF || 0)),
    RN: sortedKeys.map((k) => Math.round(groups[k]?.RNOP || 0)),
    DN: sortedKeys.map((k) => Math.round(groups[k]?.DNOP || 0)),
  }
}

export function buildQuarterly(lancamentos: Lancamento[]): CaixaLevelData {
  const groups = groupBy(lancamentos, (dt) => {
    const q = Math.floor(dt.getMonth() / 3) + 1
    return `Q${q}/${String(dt.getFullYear()).slice(2)}`
  })
  const keys = Object.keys(groups).sort()
  return toLevel(groups, keys)
}

export function buildMonthly(lancamentos: Lancamento[]): CaixaLevelData {
  const groups = groupBy(lancamentos, (dt) => {
    return `${MONTH_NAMES[dt.getMonth()]}/${String(dt.getFullYear()).slice(2)}`
  })
  // Sort by date order
  const keys = Object.keys(groups).sort((a, b) => {
    const [mA, yA] = a.split('/')
    const [mB, yB] = b.split('/')
    const iA = MONTH_NAMES.indexOf(mA) + Number(yA) * 12
    const iB = MONTH_NAMES.indexOf(mB) + Number(yB) * 12
    return iA - iB
  })
  return toLevel(groups, keys)
}

export function buildWeekly(lancamentos: Lancamento[], month: string): CaixaLevelData {
  // month format: "Dez/25"
  const [mName, y] = month.split('/')
  const mIdx = MONTH_NAMES.indexOf(mName)
  if (mIdx < 0) return { labels: [], RB: [], TD: [], CV: [], CF: [], RN: [], DN: [] }

  const year = 2000 + Number(y)
  const filtered = lancamentos.filter((l) => {
    if (!l.data_lancamento) return false
    const dt = parseDMY(l.data_lancamento)
    return dt.getMonth() === mIdx && dt.getFullYear() === year
  })

  const groups = groupBy(filtered, (dt) => {
    const weekNum = Math.ceil(dt.getDate() / 7)
    return `S${weekNum}·${mName}`
  })
  const keys = [`S1·${mName}`, `S2·${mName}`, `S3·${mName}`, `S4·${mName}`]
  return toLevel(groups, keys)
}
