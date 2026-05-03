/**
 * Calcula CaixaLevelData a partir de lançamentos do extrato + planoContas
 * Agrupa por trimestre, mês, ou semana conforme o nível
 */

import { CATEGORIAS, getGrupoDRE as getGrupoDREPrefix, type CategoriaInfo } from './planoContas'
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

/** Resolve o grupo DRE de uma categoria usando o mapa dinâmico (overrides
 *  da empresa) se fornecido, senão cai no mapa estático + prefixo.
 *
 *  Categorias com `grupoDRE === 'NEUTRO'` retornam null (são excluídas do
 *  agrupamento DRE, mesmo comportamento que getGrupoDRE retornar null). */
function resolveGrupoDRE(
  categoria: string | null | undefined,
  categoriaMap?: Record<string, CategoriaInfo>,
): string | null {
  if (!categoria) return null
  let grupo: string | null = null
  if (categoriaMap && categoriaMap[categoria]) grupo = categoriaMap[categoria].grupoDRE
  else if (CATEGORIAS[categoria]) grupo = CATEGORIAS[categoria].grupoDRE
  else grupo = getGrupoDREPrefix(categoria)
  // NEUTRO é excluído de todos os agregadores de DRE
  if (grupo === 'NEUTRO') return null
  return grupo
}

function groupBy(
  lancamentos: Lancamento[],
  keyFn: (d: Date) => string,
  categoriaMap?: Record<string, CategoriaInfo>,
): Record<string, Record<string, number>> {
  const groups: Record<string, Record<string, number>> = {}
  for (const l of lancamentos) {
    if (!l.data_lancamento) continue
    const dt = parseDMY(l.data_lancamento)
    if (isNaN(dt.getTime())) continue
    const key = keyFn(dt)
    const grupo = resolveGrupoDRE(l.categoria, categoriaMap)
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

export function buildQuarterly(
  lancamentos: Lancamento[],
  categoriaMap?: Record<string, CategoriaInfo>,
): CaixaLevelData {
  const groups = groupBy(lancamentos, (dt) => {
    const q = Math.floor(dt.getMonth() / 3) + 1
    return `Q${q}/${String(dt.getFullYear()).slice(2)}`
  }, categoriaMap)
  const keys = Object.keys(groups).sort()
  return toLevel(groups, keys)
}

export function buildMonthly(
  lancamentos: Lancamento[],
  categoriaMap?: Record<string, CategoriaInfo>,
): CaixaLevelData {
  const groups = groupBy(lancamentos, (dt) => {
    return `${MONTH_NAMES[dt.getMonth()]}/${String(dt.getFullYear()).slice(2)}`
  }, categoriaMap)
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

export function buildWeekly(
  lancamentos: Lancamento[],
  month: string,
  categoriaMap?: Record<string, CategoriaInfo>,
): CaixaLevelData {
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
  }, categoriaMap)

  // Numero de semanas dinamico baseado no tamanho do mes:
  // 28 dias (Fev nao bissexto) → S1-S4; 29-31 dias → S1-S5.
  // O dia 0 do mes seguinte equivale ao ultimo dia do mes corrente.
  const daysInMonth = new Date(year, mIdx + 1, 0).getDate()
  const maxWeek = Math.ceil(daysInMonth / 7)
  const keys: string[] = []
  for (let w = 1; w <= maxWeek; w++) keys.push(`S${w}·${mName}`)
  return toLevel(groups, keys)
}

// ── Breakdown por favorecido dentro de cada grupo DRE ────────────────────────

export interface FavBreakdownItem {
  nome: string
  valor: number
}

export interface DREBreakdowns {
  RoB: FavBreakdownItem[]
  TDCF: FavBreakdownItem[]
  CV: FavBreakdownItem[]
  CF: FavBreakdownItem[]
  RNOP: FavBreakdownItem[]
  DNOP: FavBreakdownItem[]
}

interface LancamentoWithFav extends Lancamento {
  favorecido?: string | null
}

export interface CatBreakdownItem {
  item: string
  valor: number
  pct: number
}

export interface CatBreakdowns {
  RoB: CatBreakdownItem[]
  TDCF: CatBreakdownItem[]
  CV: CatBreakdownItem[]
  CF: CatBreakdownItem[]
  RNOP: CatBreakdownItem[]
  DNOP: CatBreakdownItem[]
}

/** Granularidade do breakdown:
 *  - `n1`: linha única consolidada do grupo DRE inteiro
 *  - `n2` (default): agrupado por subgrupo (info.nivel2 com fallback)
 *  - `n3`: categoria Omie individual (nome + código)
 */
export type BreakdownGranularidade = 'n1' | 'n2' | 'n3'

export function buildBreakdownByCategoria(
  lancamentos: Lancamento[],
  categoriaMap?: Record<string, CategoriaInfo>,
  granularidade: BreakdownGranularidade = 'n2',
): CatBreakdowns {
  const groups: Record<string, Record<string, number>> = {
    RoB: {}, TDCF: {}, CV: {}, CF: {}, RNOP: {}, DNOP: {},
  }

  for (const l of lancamentos) {
    const cat = l.categoria || ''
    // Prioriza o mapa dinâmico (API + overrides) sobre o estático
    const info = (categoriaMap && categoriaMap[cat]) || CATEGORIAS[cat]
    if (!info) continue
    const grupo = info.grupoDRE
    // NEUTRO é excluído (repasses internos, mútuos, etc)
    if (grupo === 'NEUTRO') continue
    if (!groups[grupo]) continue

    let label: string
    if (granularidade === 'n1') {
      // Tudo vira uma linha única — a label é o próprio grupo DRE
      label = grupo
    } else if (granularidade === 'n3') {
      // Categoria Omie individual, com código para desambiguar nomes iguais
      const nome = info.nome || cat || 'Sem categoria'
      label = cat ? `${cat} — ${nome}` : nome
    } else {
      // n2 (default) — subgrupo da categoria
      label = info.nivel2 || info.nome || cat || 'Outros'
    }
    groups[grupo][label] = (groups[grupo][label] || 0) + Math.abs(l.valor)
  }

  const toSorted = (map: Record<string, number>): CatBreakdownItem[] => {
    const total = Object.values(map).reduce((s, v) => s + v, 0)
    return Object.entries(map)
      .map(([item, valor]) => ({ item, valor: Math.round(valor), pct: total > 0 ? Math.round((valor / total) * 1000) / 10 : 0 }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 10)
  }

  return {
    RoB: toSorted(groups.RoB),
    TDCF: toSorted(groups.TDCF),
    CV: toSorted(groups.CV),
    CF: toSorted(groups.CF),
    RNOP: toSorted(groups.RNOP),
    DNOP: toSorted(groups.DNOP),
  }
}

export function buildBreakdownByFavorecido(
  lancamentos: LancamentoWithFav[],
  categoriaMap?: Record<string, CategoriaInfo>,
): DREBreakdowns {
  const groups: Record<string, Record<string, number>> = {
    RoB: {}, TDCF: {}, CV: {}, CF: {}, RNOP: {}, DNOP: {},
  }

  for (const l of lancamentos) {
    const grupo = resolveGrupoDRE(l.categoria, categoriaMap)
    if (!grupo || !groups[grupo]) continue
    const fav = (l.favorecido || '').trim() || 'Sem favorecido'
    groups[grupo][fav] = (groups[grupo][fav] || 0) + Math.abs(l.valor)
  }

  const toSorted = (map: Record<string, number>): FavBreakdownItem[] =>
    Object.entries(map)
      .map(([nome, valor]) => ({ nome, valor: Math.round(valor) }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 15) // top 15

  return {
    RoB: toSorted(groups.RoB),
    TDCF: toSorted(groups.TDCF),
    CV: toSorted(groups.CV),
    CF: toSorted(groups.CF),
    RNOP: toSorted(groups.RNOP),
    DNOP: toSorted(groups.DNOP),
  }
}

// ─── DRE Mês a Mês (matriz colapsável N1 → N2 → N3) ─────────────────────────

export interface DREMesCategoria {
  codigo: string
  nome: string
  porMes: Record<string, number>
  consolidado: number
}

export interface DREMesNivel2 {
  label: string
  porMes: Record<string, number>
  consolidado: number
  categorias: DREMesCategoria[]
}

export interface DREMesGrupo {
  grupo: string
  porMes: Record<string, number>
  consolidado: number
  nivel2: DREMesNivel2[]
}

export interface DREMesMatrix {
  meses: string[]
  grupos: Record<string, DREMesGrupo>
}

const MESES_ABBR = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function mesKey(dtStr: string): string | null {
  const parts = (dtStr || '').split('/')
  if (parts.length < 3) return null
  const mIdx = parseInt(parts[1]) - 1
  if (mIdx < 0 || mIdx > 11) return null
  const yr = (parts[2] || '').slice(-2)
  return `${MESES_ABBR[mIdx]}/${yr}`
}

function sortMeses(meses: string[]): string[] {
  const MONTHS: Record<string, number> = {
    jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6,
    jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12,
  }
  return [...meses].sort((a, b) => {
    const [ma, ya] = a.toLowerCase().split('/')
    const [mb, yb] = b.toLowerCase().split('/')
    return (parseInt(ya || '0') * 100 + (MONTHS[ma] ?? 0))
         - (parseInt(yb || '0') * 100 + (MONTHS[mb] ?? 0))
  })
}

/**
 * Matriz DRE agrupada por (grupo, nivel2, categoria, mes). Valores sempre
 * positivos (Math.abs) — o sinal do grupo DRE é contextual na renderização.
 * NEUTRO é excluído.
 */
export function buildDREMatrix(
  lancamentos: Lancamento[],
  categoriaMap?: Record<string, CategoriaInfo>,
): DREMesMatrix {
  const grupoData: Record<string, {
    porMes: Record<string, number>
    nivel2: Record<string, {
      porMes: Record<string, number>
      categorias: Record<string, { nome: string; porMes: Record<string, number> }>
    }>
  }> = {}

  const allMeses = new Set<string>()

  for (const l of lancamentos) {
    if (!l.data_lancamento) continue
    const mes = mesKey(l.data_lancamento)
    if (!mes) continue
    allMeses.add(mes)

    const cat = l.categoria || ''
    const info = (categoriaMap && categoriaMap[cat]) || CATEGORIAS[cat]
    if (!info) continue
    const grupo = info.grupoDRE
    if (!grupo || grupo === 'NEUTRO') continue

    const n2Label = info.nivel2 || info.nome || cat || 'Outros'
    const valor = Math.abs(l.valor)

    if (!grupoData[grupo]) grupoData[grupo] = { porMes: {}, nivel2: {} }
    grupoData[grupo].porMes[mes] = (grupoData[grupo].porMes[mes] ?? 0) + valor

    if (!grupoData[grupo].nivel2[n2Label]) {
      grupoData[grupo].nivel2[n2Label] = { porMes: {}, categorias: {} }
    }
    grupoData[grupo].nivel2[n2Label].porMes[mes] =
      (grupoData[grupo].nivel2[n2Label].porMes[mes] ?? 0) + valor

    if (!grupoData[grupo].nivel2[n2Label].categorias[cat]) {
      grupoData[grupo].nivel2[n2Label].categorias[cat] = {
        nome: info.nome || cat || 'Outros',
        porMes: {},
      }
    }
    grupoData[grupo].nivel2[n2Label].categorias[cat].porMes[mes] =
      (grupoData[grupo].nivel2[n2Label].categorias[cat].porMes[mes] ?? 0) + valor
  }

  const meses = sortMeses([...allMeses])
  const sumMap = (m: Record<string, number>) => Object.values(m).reduce((s, v) => s + v, 0)

  const grupos: Record<string, DREMesGrupo> = {}
  for (const [grupo, data] of Object.entries(grupoData)) {
    const nivel2: DREMesNivel2[] = Object.entries(data.nivel2)
      .map(([label, n2]) => ({
        label,
        porMes: n2.porMes,
        consolidado: sumMap(n2.porMes),
        categorias: Object.entries(n2.categorias)
          .map(([codigo, cat]) => ({
            codigo,
            nome: cat.nome,
            porMes: cat.porMes,
            consolidado: sumMap(cat.porMes),
          }))
          .sort((a, b) => b.consolidado - a.consolidado),
      }))
      .sort((a, b) => b.consolidado - a.consolidado)

    grupos[grupo] = {
      grupo,
      porMes: data.porMes,
      consolidado: sumMap(data.porMes),
      nivel2,
    }
  }

  return { meses, grupos }
}
