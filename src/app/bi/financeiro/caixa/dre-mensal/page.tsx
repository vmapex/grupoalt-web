'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ChevronRight, ChevronDown, Loader2 } from 'lucide-react'
import { useThemeStore } from '@/store/themeStore'
import { useEmpresaId } from '@/hooks/useEmpresaId'
import { useCategoriasMap } from '@/hooks/useCategoriasMap'
import { useUnidadeStore } from '@/store/unidadeStore'
import { useDateRangeStore } from '@/store/dateRangeStore'
import { useExtrato } from '@/hooks/useAPI'
import { buildDREMatrix, type DREMesMatrix } from '@/lib/caixaBuilder'
import { calcularDRE } from '@/lib/planoContas'
import { fmtK } from '@/lib/formatters'
import { GlowLine } from '@/components/ui/GlowLine'

function isoToDMY(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

/* Sinal e label por grupo DRE. Receitas somam, custos subtraem. */
const GRUPO_ORDEM = ['RoB', 'TDCF', 'RL', 'CV', 'MC', 'CF', 'EBT1', 'RNOP', 'DNOP', 'EBT2'] as const
type GrupoRow = typeof GRUPO_ORDEM[number]

const GRUPO_META: Record<GrupoRow, { label: string; sign: 1 | -1 | 0; isDerived: boolean; colorToken?: 'blue' | 'amber' | 'red' | 'orange' | 'green' | 'purple' }> = {
  RoB:  { label: 'Receita Bruta',                   sign: 1,  isDerived: false, colorToken: 'blue' },
  TDCF: { label: 'T.D.C.F.',                        sign: -1, isDerived: false, colorToken: 'amber' },
  RL:   { label: 'Receita Líquida',                 sign: 0,  isDerived: true,  colorToken: 'green' },
  CV:   { label: 'Custo Variável',                  sign: -1, isDerived: false, colorToken: 'red' },
  MC:   { label: 'Margem Contribuição',             sign: 0,  isDerived: true,  colorToken: 'green' },
  CF:   { label: 'Custo Fixo',                      sign: -1, isDerived: false, colorToken: 'orange' },
  EBT1: { label: 'EBT1',                            sign: 0,  isDerived: true,  colorToken: 'green' },
  RNOP: { label: 'Receita Não Operacional',         sign: 1,  isDerived: false, colorToken: 'green' },
  DNOP: { label: 'Despesa Não Operacional',         sign: -1, isDerived: false, colorToken: 'purple' },
  EBT2: { label: 'Resultado (EBT2)',                sign: 0,  isDerived: true,  colorToken: 'green' },
}

export default function DREMensalPage() {
  const t = useThemeStore((s) => s.tokens)
  const empresaId = useEmpresaId()
  const dateFrom = useDateRangeStore((s) => s.from)
  const dateTo = useDateRangeStore((s) => s.to)
  const dt_inicio = isoToDMY(dateFrom)
  const dt_fim = isoToDMY(dateTo)
  const projetoIds = useUnidadeStore((s) => s.getSelectedCodigos())
  const { map: categoriaMap } = useCategoriasMap(empresaId)

  const { data: extratoRaw, loading } = useExtrato(empresaId, dt_inicio, dt_fim, projetoIds)
  const lancamentos = extratoRaw?.lancamentos ?? []

  const matrix = useMemo<DREMesMatrix>(
    () => buildDREMatrix(lancamentos as any, categoriaMap),
    [lancamentos, categoriaMap],
  )

  /** Cálculo das linhas derivadas por mês (RL, MC, EBT1, EBT2) */
  const derivedPorMes = useMemo(() => {
    const g = matrix.grupos
    const mes = matrix.meses
    const mk = (grupo: string, m: string) => g[grupo]?.porMes[m] ?? 0
    const rl: Record<string, number> = {}
    const mc: Record<string, number> = {}
    const ebt1: Record<string, number> = {}
    const ebt2: Record<string, number> = {}
    for (const m of mes) {
      rl[m] = mk('RoB', m) - mk('TDCF', m)
      mc[m] = rl[m] - mk('CV', m)
      ebt1[m] = mc[m] - mk('CF', m)
      ebt2[m] = ebt1[m] + mk('RNOP', m) - mk('DNOP', m)
    }
    return { rl, mc, ebt1, ebt2 }
  }, [matrix])

  /** Consolidado do período (via calcularDRE tradicional). */
  const consolidado = useMemo(() => {
    if (!lancamentos.length) return null
    return calcularDRE(
      lancamentos.map((l: any) => ({ valor: l.valor, categoria: l.categoria, origem: l.origem ?? undefined })),
      categoriaMap,
    )
  }, [lancamentos, categoriaMap])

  /** Estado de expansão: grupo expandido → mostra N2; N2 expandido → mostra N3. */
  const [expandedGrupos, setExpandedGrupos] = useState<Set<string>>(new Set())
  const [expandedN2, setExpandedN2] = useState<Set<string>>(new Set())

  const toggleGrupo = (g: string) => {
    setExpandedGrupos((prev) => {
      const next = new Set(prev)
      if (next.has(g)) next.delete(g)
      else next.add(g)
      return next
    })
  }
  const toggleN2 = (key: string) => {
    setExpandedN2((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const getGrupoColor = (grupo: GrupoRow): string => {
    const token = GRUPO_META[grupo].colorToken
    if (!token) return t.text
    const colorMap: Record<string, string> = {
      blue: t.blue, amber: t.amber, red: t.red, orange: t.orange,
      green: t.green, purple: t.purple,
    }
    return colorMap[token] || t.text
  }

  const getGrupoValor = (grupo: GrupoRow, mes: string): number => {
    if (grupo === 'RL') return derivedPorMes.rl[mes] ?? 0
    if (grupo === 'MC') return derivedPorMes.mc[mes] ?? 0
    if (grupo === 'EBT1') return derivedPorMes.ebt1[mes] ?? 0
    if (grupo === 'EBT2') return derivedPorMes.ebt2[mes] ?? 0
    return matrix.grupos[grupo]?.porMes[mes] ?? 0
  }

  const getGrupoConsolidado = (grupo: GrupoRow): number => {
    if (!consolidado) return 0
    if (grupo === 'RL') return consolidado.RoB - consolidado.TDCF
    if (grupo === 'MC') return consolidado.MC
    if (grupo === 'EBT1') return consolidado.EBT1
    if (grupo === 'EBT2') return consolidado.EBT2
    const raw = matrix.grupos[grupo]?.consolidado ?? 0
    return raw
  }

  // Cor da célula: para linhas derivadas (RL, MC, EBT1, EBT2), fica em
  // vermelho quando o valor é negativo — senão o verde fixo esconde que
  // está no prejuízo. Outras linhas mantêm sempre a cor do grupo.
  const getCellColor = (grupo: GrupoRow, v: number): string => {
    const base = getGrupoColor(grupo)
    if (GRUPO_META[grupo].isDerived && v < 0) return t.red
    return base
  }

  // % relativo à Receita Bruta (do mesmo mês, ou consolidada quando `mes`
  // for null). Zero se RoB for 0 (evita divisão por zero na formatação).
  const getPctRoB = (valor: number, mes: string | null): number => {
    const rob = mes ? getGrupoValor('RoB', mes) : getGrupoConsolidado('RoB')
    if (!rob) return 0
    return (valor / rob) * 100
  }

  // Formata % com até 1 casa decimal e vírgula ao invés de ponto. O `sign`
  // da linha DRE prefixa o sinal (TDCF/CV/CF/DNOP já são displayed com `−`).
  const fmtPctSigned = (pct: number, sign: 1 | -1 | 0): string => {
    if (!isFinite(pct) || pct === 0) return '0,0%'
    const prefix = sign === -1 ? '−' : (pct < 0 ? '−' : '')
    return `${prefix}${Math.abs(pct).toFixed(1).replace('.', ',')}%`
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 shrink-0" style={{ borderBottom: `1px solid ${t.border}` }}>
        <Link
          href="/bi/financeiro/caixa"
          className="flex items-center gap-1.5 text-[11px] transition-colors"
          style={{ color: t.muted }}
        >
          <ArrowLeft size={14} />
          Caixa Realizado
        </Link>
        <span style={{ color: t.mutedDim }}>›</span>
        <span className="text-[12px] font-semibold" style={{ color: t.text }}>DRE Mês a Mês</span>
        <span className="text-[10px] ml-2" style={{ color: t.muted }}>
          {dt_inicio} — {dt_fim}
        </span>
      </div>

      {loading && (
        <div className="flex-1 flex items-center justify-center" style={{ color: t.muted }}>
          <Loader2 className="animate-spin" size={20} />
          <span className="ml-2 text-[11px]">Carregando...</span>
        </div>
      )}

      {!loading && (
        <div className="p-5 flex flex-col gap-4 overflow-auto">
          {/* ── Tabela DRE Mensal ────────────────────────────── */}
          <div className="rounded-lg overflow-hidden" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
            <div className="px-4 py-3 text-[10px] uppercase tracking-wider" style={{ color: t.muted, borderBottom: `1px solid ${t.border}` }}>
              DRE mês a mês — clique numa linha para expandir subgrupos (N2) e categorias (N3)
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="text-[11px]" style={{ minWidth: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: `${t.bg}66` }}>
                    <th className="px-3.5 py-2.5 text-left font-semibold sticky left-0 z-10"
                      style={{ color: t.muted, background: `${t.bg}EE`, minWidth: 280, borderRight: `1px solid ${t.border}` }}>
                      Grupo / Subgrupo / Categoria
                    </th>
                    {matrix.meses.map((m) => (
                      <th key={m} className="px-3 py-2.5 text-right font-mono font-semibold" style={{ color: t.muted }}>
                        {m}
                      </th>
                    ))}
                    <th className="px-3.5 py-2.5 text-right font-semibold"
                      style={{ color: t.text, borderLeft: `1px solid ${t.border}`, minWidth: 110 }}>
                      Consolidado
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {GRUPO_ORDEM.map((grupo) => {
                    const meta = GRUPO_META[grupo]
                    const cor = getGrupoColor(grupo)
                    const isExpandable = !meta.isDerived && (matrix.grupos[grupo]?.nivel2?.length ?? 0) > 0
                    const expanded = expandedGrupos.has(grupo)
                    return (
                      <>
                        <tr
                          key={grupo}
                          onClick={() => isExpandable && toggleGrupo(grupo)}
                          style={{
                            borderBottom: `1px solid ${t.border}33`,
                            cursor: isExpandable ? 'pointer' : 'default',
                            background: meta.isDerived ? `${t.text}05` : 'transparent',
                            fontWeight: meta.isDerived ? 600 : 500,
                          }}
                        >
                          <td className="px-3.5 py-2 sticky left-0"
                            style={{
                              color: cor,
                              background: meta.isDerived ? `${t.surface}FF` : t.surface,
                              borderRight: `1px solid ${t.border}`,
                            }}>
                            <div className="flex items-center gap-1.5">
                              {isExpandable ? (
                                expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />
                              ) : (
                                <span style={{ width: 12, display: 'inline-block' }} />
                              )}
                              <span>
                                {meta.sign === -1 ? '− ' : meta.sign === 1 ? '+ ' : '= '}
                                {meta.label}
                              </span>
                            </div>
                          </td>
                          {matrix.meses.map((m) => {
                            const v = getGrupoValor(grupo, m)
                            const pct = getPctRoB(v, m)
                            const cellCor = getCellColor(grupo, v)
                            return (
                              <td key={m} className="px-3 py-2 text-right font-mono" style={{ color: cellCor }}>
                                <div className="flex items-baseline justify-end gap-1.5">
                                  <span>{meta.sign === -1 && v !== 0 ? '−' : ''}{fmtK(v)}</span>
                                  <span className="text-[8px]" style={{ color: t.muted }}>
                                    {fmtPctSigned(pct, meta.sign)}
                                  </span>
                                </div>
                              </td>
                            )
                          })}
                          {(() => {
                            const cons = getGrupoConsolidado(grupo)
                            const cellCor = getCellColor(grupo, cons)
                            return (
                              <td className="px-3.5 py-2 text-right font-mono font-bold"
                                style={{ color: cellCor, borderLeft: `1px solid ${t.border}` }}>
                                <div className="flex items-baseline justify-end gap-1.5">
                                  <span>
                                    {meta.sign === -1 && cons !== 0 ? '−' : ''}
                                    {fmtK(cons)}
                                  </span>
                                  <span className="text-[8px] font-normal" style={{ color: t.muted }}>
                                    {fmtPctSigned(getPctRoB(cons, null), meta.sign)}
                                  </span>
                                </div>
                              </td>
                            )
                          })()}
                        </tr>
                        {isExpandable && expanded && matrix.grupos[grupo].nivel2.map((n2) => {
                          const n2Key = `${grupo}:${n2.label}`
                          const n2Expanded = expandedN2.has(n2Key)
                          return (
                            <>
                              <tr
                                key={n2Key}
                                onClick={() => toggleN2(n2Key)}
                                style={{ borderBottom: `1px solid ${t.border}22`, cursor: 'pointer', background: `${t.bg}33` }}
                              >
                                <td className="px-3.5 py-1.5 sticky left-0"
                                  style={{ color: t.textSec, background: `${t.surface}F8`, borderRight: `1px solid ${t.border}`, paddingLeft: 28 }}>
                                  <div className="flex items-center gap-1.5">
                                    {n2Expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                                    <span className="text-[10px]">{n2.label}</span>
                                  </div>
                                </td>
                                {matrix.meses.map((m) => {
                                  const v = n2.porMes[m] ?? 0
                                  return (
                                    <td key={m} className="px-3 py-1.5 text-right font-mono text-[10px]" style={{ color: t.textSec }}>
                                      <div className="flex items-baseline justify-end gap-1.5">
                                        <span>{fmtK(v)}</span>
                                        <span className="text-[8px]" style={{ color: t.muted }}>
                                          {fmtPctSigned(getPctRoB(v, m), meta.sign)}
                                        </span>
                                      </div>
                                    </td>
                                  )
                                })}
                                <td className="px-3.5 py-1.5 text-right font-mono text-[10px]"
                                  style={{ color: t.textSec, borderLeft: `1px solid ${t.border}` }}>
                                  <div className="flex items-baseline justify-end gap-1.5">
                                    <span>{fmtK(n2.consolidado)}</span>
                                    <span className="text-[8px]" style={{ color: t.muted }}>
                                      {fmtPctSigned(getPctRoB(n2.consolidado, null), meta.sign)}
                                    </span>
                                  </div>
                                </td>
                              </tr>
                              {n2Expanded && n2.categorias.map((cat) => (
                                <tr key={`${n2Key}:${cat.codigo}`} style={{ borderBottom: `1px solid ${t.border}11`, background: `${t.bg}55` }}>
                                  <td className="px-3.5 py-1 sticky left-0"
                                    style={{ color: t.muted, background: `${t.surface}F0`, borderRight: `1px solid ${t.border}`, paddingLeft: 48 }}>
                                    <span className="text-[9px] font-mono" style={{ color: t.mutedDim }}>{cat.codigo}</span>
                                    <span className="text-[10px] ml-1.5">{cat.nome}</span>
                                  </td>
                                  {matrix.meses.map((m) => {
                                    const v = cat.porMes[m] ?? 0
                                    return (
                                      <td key={m} className="px-3 py-1 text-right font-mono text-[9px]" style={{ color: t.muted }}>
                                        <div className="flex items-baseline justify-end gap-1.5">
                                          <span>{fmtK(v)}</span>
                                          <span className="text-[8px]" style={{ color: t.mutedDim }}>
                                            {fmtPctSigned(getPctRoB(v, m), meta.sign)}
                                          </span>
                                        </div>
                                      </td>
                                    )
                                  })}
                                  <td className="px-3.5 py-1 text-right font-mono text-[9px]"
                                    style={{ color: t.muted, borderLeft: `1px solid ${t.border}` }}>
                                    <div className="flex items-baseline justify-end gap-1.5">
                                      <span>{fmtK(cat.consolidado)}</span>
                                      <span className="text-[8px]" style={{ color: t.mutedDim }}>
                                        {fmtPctSigned(getPctRoB(cat.consolidado, null), meta.sign)}
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </>
                          )
                        })}
                      </>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Consolidado do Período ──────────────────────── */}
          {consolidado && (
            <div className="rounded-lg overflow-hidden" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
              <GlowLine color={t.green} />
              <div className="px-4 py-3 text-[10px] uppercase tracking-wider" style={{ color: t.muted, borderBottom: `1px solid ${t.border}` }}>
                Consolidado do período ({matrix.meses.length} {matrix.meses.length === 1 ? 'mês' : 'meses'})
              </div>
              <div className="grid grid-cols-5 gap-0">
                {[
                  { l: 'Receita Bruta', v: consolidado.RoB, c: t.blue, sign: 1 },
                  { l: 'T.D.C.F.', v: consolidado.TDCF, c: t.amber, sign: -1 },
                  { l: 'Receita Líquida', v: consolidado.RoB - consolidado.TDCF, c: (consolidado.RoB - consolidado.TDCF) >= 0 ? t.green : t.red, sign: 0 },
                  { l: 'Custo Variável', v: consolidado.CV, c: t.red, sign: -1 },
                  { l: 'Custo Fixo', v: consolidado.CF, c: t.orange, sign: -1 },
                  { l: 'Margem Contribuição', v: consolidado.MC, c: consolidado.MC >= 0 ? t.green : t.red, sign: 0 },
                  { l: 'EBT1', v: consolidado.EBT1, c: consolidado.EBT1 >= 0 ? t.green : t.red, sign: 0 },
                  { l: 'Saldo NOP', v: consolidado.RNOP - consolidado.DNOP, c: t.purple, sign: 0 },
                  { l: 'EBT2 (Resultado)', v: consolidado.EBT2, c: consolidado.EBT2 >= 0 ? t.green : t.red, sign: 0 },
                  {
                    l: '% EBT2 / RoB',
                    v: consolidado.RoB ? (consolidado.EBT2 / consolidado.RoB) * 100 : 0,
                    c: consolidado.EBT2 >= 0 ? t.green : t.red,
                    sign: 0,
                    isPct: true,
                  },
                ].map((k, i) => (
                  <div key={i} className="px-4 py-3" style={{
                    borderRight: (i + 1) % 5 !== 0 ? `1px solid ${t.border}` : 'none',
                    borderTop: i >= 5 ? `1px solid ${t.border}` : 'none',
                  }}>
                    <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: t.muted }}>{k.l}</div>
                    <div className="font-mono text-sm" style={{ color: k.c }}>
                      {(k as any).isPct
                        ? (k.v >= 0 ? '' : '−') + Math.abs(k.v).toFixed(1).replace('.', ',') + '%'
                        : (k.sign === -1 && k.v !== 0 ? '−' : '') + fmtK(k.v)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
