'use client'
import { useMemo } from 'react'
import { useThemeStore } from '@/store/themeStore'
import { useDateRangeStore } from '@/store/dateRangeStore'
import { useEmpresaId } from '@/hooks/useEmpresaId'
import { useExtrato, useCP, useCR, useFluxoCaixa } from '@/hooks/useAPI'
import { useCategoriasMap } from '@/hooks/useCategoriasMap'
import { calcularDRE, calcularNeutros } from '@/lib/planoContas'
import { fmtK, fmtBRL } from '@/lib/formatters'
import { transformCPCR } from '@/lib/transformers'
import { GlowLine } from '@/components/ui/GlowLine'
import { ChatPanel } from '@/components/chat/ChatPanel'

function isoToDMY(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

/** Get the current month label (e.g. "Mar/26") from date range */
function getMonthLabel(dateStr: string): string {
  const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  const [y, m] = dateStr.split('-')
  return `${MESES[Number(m) - 1]}/${y?.slice(2)}`
}

/** Determine status badge for a DRE indicator */
function getStatusBadge(sigla: string, value: number, robValue: number): { label: string; type: 'g' | 'a' | 'r' } {
  const pctRob = robValue > 0 ? (value / robValue) * 100 : 0
  switch (sigla) {
    case 'RoB': return { label: 'Base', type: 'g' }
    case 'MC': return pctRob < 15 ? { label: 'Atenção', type: 'a' } : { label: 'OK', type: 'g' }
    case 'CF': return pctRob > 40 ? { label: 'Alto', type: 'r' } : pctRob > 30 ? { label: 'Atenção', type: 'a' } : { label: 'OK', type: 'g' }
    case 'EBT2': return value > 0 ? { label: 'Positivo', type: 'g' } : value === 0 ? { label: 'Neutro', type: 'a' } : { label: 'Negativo', type: 'r' }
    case 'RNOP': return pctRob > 30 ? { label: 'Dependência', type: 'a' } : { label: 'OK', type: 'g' }
    default: return { label: 'OK', type: 'g' }
  }
}

export function AnaliseIAView() {
  const t = useThemeStore((s) => s.tokens)
  const empresaId = useEmpresaId()
  const dateFrom = useDateRangeStore((s) => s.from)
  const dateTo = useDateRangeStore((s) => s.to)
  const dt_inicio = isoToDMY(dateFrom)
  const dt_fim = isoToDMY(dateTo)

  // Data hooks (same as dashboard)
  const { data: extratoResponse } = useExtrato(empresaId, dt_inicio, dt_fim)
  const { data: cpRaw } = useCP(empresaId, { registros: 500 })
  const { data: crRaw } = useCR(empresaId, { registros: 500 })
  const { data: fluxoAPI } = useFluxoCaixa(empresaId, dt_fim)

  // Plano de contas dinâmico (overrides da empresa)
  const { map: categoriaMap } = useCategoriasMap(empresaId)

  const lancamentos = extratoResponse?.lancamentos ?? []
  const saldoCaixa = extratoResponse?.saldo_atual ?? 0

  // Compute DRE using the proper function with the empresa-specific map
  const dre = useMemo(() => calcularDRE(
    lancamentos.map((l) => ({ valor: l.valor, categoria: l.categoria, origem: l.origem ?? undefined })),
    categoriaMap,
  ), [lancamentos, categoriaMap])

  // CP/CR data for context
  const cpData = useMemo(() => (cpRaw?.dados ? transformCPCR(cpRaw.dados, 'CP') : []), [cpRaw])
  const crData = useMemo(() => (crRaw?.dados ? transformCPCR(crRaw.dados, 'CR') : []), [crRaw])

  const cpAtrasado = useMemo(
    () => cpData.filter((c) => c.status === 'ATRASADO').reduce((s, c) => s + c.valor, 0),
    [cpData],
  )
  const crAberto = useMemo(
    () => crData.filter((c) => c.status === 'A VENCER' || c.status === 'A RECEBER').reduce((s, c) => s + c.valor, 0),
    [crData],
  )

  const monthLabel = getMonthLabel(dateTo)

  // KPIs
  const kpis = useMemo(() => [
    { label: 'Receita Bruta', value: dre.RoB, color: t.blue, sub: monthLabel },
    { label: 'Custos Variáveis', value: dre.CV, color: t.red, sub: dre.RoB > 0 ? `${((dre.CV / dre.RoB) * 100).toFixed(1).replace('.', ',')}% da RoB` : '' },
    { label: 'Margem de Contribuição', value: dre.MC, color: t.green, sub: dre.RoB > 0 ? `${((dre.MC / dre.RoB) * 100).toFixed(1).replace('.', ',')}%` : '' },
    { label: 'Saldo de Caixa', value: saldoCaixa, color: t.amber, sub: 'Posição atual' },
  ], [dre, saldoCaixa, t, monthLabel])

  // Waterfall bars (10 DRE lines) — colors mapped to brand palette
  const waterfallBars = useMemo(() => {
    const items = [
      { sigla: 'RoB',  value: dre.RoB,  color: t.blue },
      { sigla: 'TDCF', value: dre.TDCF, color: t.amber },
      { sigla: 'RL',   value: dre.RL,   color: t.green },
      { sigla: 'CV',   value: dre.CV,   color: t.red },
      { sigla: 'MC',   value: dre.MC,   color: t.green },
      { sigla: 'CF',   value: dre.CF,   color: t.amber },
      { sigla: 'EBT1', value: dre.EBT1, color: dre.EBT1 >= 0 ? t.green : t.red },
      { sigla: 'RNOP', value: dre.RNOP, color: t.purple },
      { sigla: 'DNOP', value: dre.DNOP, color: t.red },
      { sigla: 'EBT2', value: dre.EBT2, color: dre.EBT2 >= 0 ? t.gold : t.red },
    ]
    const maxVal = Math.max(...items.map((i) => Math.abs(i.value)), 1)
    return items.map((i) => ({ ...i, pct: (Math.abs(i.value) / maxVal) * 100 }))
  }, [dre, t])

  // DRE table rows
  const tableRows = useMemo(() => {
    const entries = [
      { sigla: 'RoB',  nome: 'Receita Bruta (RoB)', value: dre.RoB },
      { sigla: 'MC',   nome: 'Margem de Contribuição', value: dre.MC },
      { sigla: 'CF',   nome: 'Custo Fixo (CF)', value: dre.CF },
      { sigla: 'RNOP', nome: 'Receitas Não Operacionais', value: dre.RNOP },
      { sigla: 'EBT2', nome: 'Resultado Final (EBT2)', value: dre.EBT2 },
    ]
    return entries.map((e) => ({
      ...e,
      pctRob: dre.RoB > 0 ? ((e.value / dre.RoB) * 100).toFixed(1).replace('.', ',') + '%' : '0%',
      badge: getStatusBadge(e.sigla, e.value, dre.RoB),
    }))
  }, [dre])

  // Categorias marcadas como NEUTRO (excluídas do DRE) — para exibir no contexto
  const neutros = useMemo(
    () => calcularNeutros(
      lancamentos.map((l) => ({ valor: l.valor, categoria: l.categoria })),
      categoriaMap,
    ),
    [lancamentos, categoriaMap],
  )
  const totalNeutro = useMemo(() => neutros.reduce((s, n) => s + n.total, 0), [neutros])

  // Build financial context for the AI chat
  const financialContext = useMemo(() => {
    const pct = (v: number) => dre.RoB > 0 ? `${((v / dre.RoB) * 100).toFixed(1)}%` : '0%'
    const topAtrasados = cpData
      .filter((c) => c.status === 'ATRASADO')
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5)
      .map((c) => `- ${c.fav}: R$ ${fmtBRL(c.valor)} — vence ${c.vcto}`)
      .join('\n')
    const topCR = crData
      .filter((c) => c.status === 'A VENCER' || c.status === 'A RECEBER')
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5)
      .map((c) => `- ${c.fav}: R$ ${fmtBRL(c.valor)} — vence ${c.vcto}`)
      .join('\n')

    const neutrosBlock = neutros.length > 0
      ? `\n\nCATEGORIAS NEUTRAS (excluídas do DRE — repasses internos / mútuos):
${neutros.map((n) => `- ${n.nome} (${n.codigo}): R$ ${fmtBRL(n.total)} em ${n.count} lançamento${n.count !== 1 ? 's' : ''}`).join('\n')}
Total movimentado neutro: R$ ${fmtBRL(totalNeutro)} (efeito zero no resultado).
Importante: NÃO inclua esses valores em RNOP, DNOP ou no resultado. Eles são transferências internas que se anulam.`
      : ''

    return `Você é o Claude, analista financeiro integrado ao dashboard.
Responda SEMPRE em português brasileiro, de forma direta e profissional.

DADOS FINANCEIROS ATUAIS (${monthLabel}):
- Receita Bruta (RoB): R$ ${fmtBRL(dre.RoB)} (100%)
- TDCF (deduções fiscais): R$ ${fmtBRL(dre.TDCF)} (${pct(dre.TDCF)})
- Receita Líquida (RL): R$ ${fmtBRL(dre.RL)} (${pct(dre.RL)})
- Custos Variáveis (CV): R$ ${fmtBRL(dre.CV)} (${pct(dre.CV)} da RoB)
- Margem de Contribuição (MC): R$ ${fmtBRL(dre.MC)} (${pct(dre.MC)})
- Custo Fixo (CF): R$ ${fmtBRL(dre.CF)} (${pct(dre.CF)})
- EBT1 (antes NOP): R$ ${fmtBRL(dre.EBT1)} (${pct(dre.EBT1)})
- RNOP (receitas não operacionais): R$ ${fmtBRL(dre.RNOP)} (${pct(dre.RNOP)})
- DNOP (despesas não operacionais): R$ ${fmtBRL(dre.DNOP)} (${pct(dre.DNOP)})
- Resultado Final (EBT2): R$ ${fmtBRL(dre.EBT2)} (${pct(dre.EBT2)})
- Saldo de Caixa atual: R$ ${fmtBRL(saldoCaixa)}
- Fluxo projetado 30d: R$ ${fmtBRL(fluxoAPI?.kpis?.saldo_projetado ?? 0)}

CP ATRASADO TOTAL: R$ ${fmtBRL(cpAtrasado)}
${topAtrasados ? `TOP ATRASADOS:\n${topAtrasados}` : ''}

CR EM ABERTO TOTAL: R$ ${fmtBRL(crAberto)}
${topCR ? `TOP CR:\n${topCR}` : ''}${neutrosBlock}

Seja conciso, prático e focado em ação. Máximo 200 palavras por resposta.`
  }, [dre, saldoCaixa, cpData, crData, cpAtrasado, crAberto, monthLabel, fluxoAPI, neutros, totalNeutro])

  // Contextual AI suggestions based on actual data
  const aiSuggestions = useMemo(() => {
    const suggestions: string[] = []
    const mcPct = dre.RoB > 0 ? (dre.MC / dre.RoB) * 100 : 0
    const cfPct = dre.RoB > 0 ? (dre.CF / dre.RoB) * 100 : 0
    const rnopPct = dre.RoB > 0 ? (dre.RNOP / dre.RoB) * 100 : 0

    if (mcPct < 20) {
      suggestions.push(`A margem de contribuição está em ${mcPct.toFixed(1)}%. O que pode ser feito para melhorar?`)
    }
    if (cfPct > 35) {
      suggestions.push(`O custo fixo está em ${cfPct.toFixed(1)}% da receita bruta. Isso é preocupante?`)
    }
    if (rnopPct > 25) {
      suggestions.push(`O negócio depende ${rnopPct.toFixed(1)}% de RNOP — isso é um risco?`)
    }
    if (cpAtrasado > 0) {
      suggestions.push(`Temos R$ ${fmtK(cpAtrasado)} em CP atrasado. Qual o impacto e priorização?`)
    }
    suggestions.push(`Crie um resumo executivo do resultado de ${monthLabel} para o diretor.`)

    return suggestions.slice(0, 4)
  }, [dre, cpAtrasado, monthLabel])

  // Badge colors — pull from current theme tokens so light/dark stay consistent
  const badgeStyles: Record<string, { bg: string; color: string; border: string }> = {
    g: { bg: t.greenDim, color: t.green, border: `${t.green}40` },
    a: { bg: t.amberDim, color: t.amber, border: `${t.amber}40` },
    r: { bg: t.redDim,   color: t.red,   border: `${t.red}40`   },
  }

  return (
    <div
      className="grid h-full overflow-hidden"
      style={{ gridTemplateColumns: '1fr 400px', minHeight: 0 }}
    >
      {/* ── Left Column: Charts & Data ── */}
      <div
        className="flex flex-col gap-3.5 p-5 overflow-y-auto min-h-0"
        style={{ borderRight: `1px solid ${t.border}` }}
      >
        {/* KPI Strip */}
        <div className="grid grid-cols-4" style={{ borderBottom: `1px solid ${t.border}`, margin: '-20px -20px 0', padding: '0' }}>
          {kpis.map((kpi, i) => (
            <div
              key={kpi.label}
              className="px-5 py-3.5 transition-colors"
              style={{ borderRight: i < 3 ? `1px solid ${t.border}` : 'none' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = `rgba(255,255,255,0.01)` }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              <div className="text-[9px] uppercase tracking-widest mb-1.5 font-mono" style={{ color: t.muted }}>{kpi.label}</div>
              <div className="text-xl font-mono font-medium" style={{ color: kpi.color }}>{fmtK(kpi.value)}</div>
              <div className="text-[9px] mt-0.5" style={{ color: t.muted }}>{kpi.sub}</div>
            </div>
          ))}
        </div>

        {/* Mini Cards: EBT2 + TDCF */}
        <div className="grid grid-cols-2 gap-3">
          <div className="relative rounded-xl p-4 overflow-hidden" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
            <GlowLine color={t.blue} />
            <div className="text-[9px] uppercase tracking-widest mb-2.5 font-mono" style={{ color: t.muted }}>EBT2 (Resultado Final)</div>
            <div className="text-[22px] font-mono font-medium mb-1" style={{ color: dre.EBT2 >= 0 ? t.green : t.red }}>
              {dre.EBT2 >= 0 ? '+' : ''}{fmtK(dre.EBT2)}
            </div>
            <div className="text-[9px]" style={{ color: t.muted }}>
              {dre.RoB > 0 ? `${dre.EBT2 >= 0 ? '+' : ''}${((dre.EBT2 / dre.RoB) * 100).toFixed(1).replace('.', ',')}% sobre RoB` : ''}
            </div>
          </div>
          <div className="relative rounded-xl p-4 overflow-hidden" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
            <GlowLine color={t.red} />
            <div className="text-[9px] uppercase tracking-widest mb-2.5 font-mono" style={{ color: t.muted }}>TDCF (Deduções)</div>
            <div className="text-[22px] font-mono font-medium mb-1" style={{ color: t.amber }}>{fmtK(dre.TDCF)}</div>
            <div className="text-[9px]" style={{ color: t.muted }}>
              {dre.RoB > 0 ? `${((dre.TDCF / dre.RoB) * 100).toFixed(1).replace('.', ',')}% da RoB` : ''}
            </div>
          </div>
        </div>

        {/* Waterfall DRE */}
        <div
          className="relative rounded-xl p-4"
          style={{ background: t.surface, border: `1px solid ${t.border}` }}
        >
          {/* Hairline accent inside card (avoids overflow-hidden) */}
          <div
            className="absolute left-3 right-3 top-0 h-px pointer-events-none"
            style={{
              background: `linear-gradient(90deg, transparent, ${t.gold}, transparent)`,
              opacity: 0.55,
            }}
          />
          <div className="alt-eyebrow mb-4" style={{ color: t.muted }}>
            DRE — Cascata de resultado ({monthLabel})
          </div>

          {/* Bars row — fixed height, each bar is a flex item with explicit alignment */}
          <div
            className="flex items-end gap-2"
            style={{ height: 140 }}
          >
            {waterfallBars.map((bar) => (
              <div
                key={`bar-${bar.sigla}`}
                className="flex-1 min-w-0 flex items-end"
                style={{ height: '100%' }}
                title={`${bar.sigla}: ${fmtBRL(bar.value)}`}
              >
                <div
                  className="w-full rounded-t transition-[height] duration-500"
                  style={{
                    height: `${Math.max(bar.pct, 3.5)}%`,
                    minHeight: 4,
                    background: `linear-gradient(180deg, ${bar.color}, ${bar.color}AA)`,
                    boxShadow: `inset 0 1px 0 rgba(255,255,255,0.20), 0 0 14px ${bar.color}33`,
                  }}
                />
              </div>
            ))}
          </div>

          {/* Labels row — separate grid so labels never clip the bars */}
          <div
            className="grid gap-2 mt-3"
            style={{ gridTemplateColumns: `repeat(${waterfallBars.length}, minmax(0, 1fr))` }}
          >
            {waterfallBars.map((bar) => {
              const negative = bar.value < 0
              return (
                <div key={`lbl-${bar.sigla}`} className="min-w-0 text-center">
                  <div
                    className="text-[10px] truncate"
                    style={{
                      color: t.muted,
                      fontFamily: 'var(--font-mono)',
                      letterSpacing: '0.10em',
                      textTransform: 'uppercase',
                      fontWeight: 600,
                      lineHeight: 1.2,
                    }}
                  >
                    {bar.sigla}
                  </div>
                  <div
                    className="text-[10px] truncate"
                    style={{
                      color: negative ? t.red : t.textSec,
                      fontFamily: 'var(--font-mono)',
                      lineHeight: 1.3,
                      marginTop: 2,
                    }}
                  >
                    {negative ? '−' : ''}{fmtK(Math.abs(bar.value))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* DRE Indicators Table */}
        <div
          className="relative rounded-xl overflow-hidden"
          style={{
            background: t.surface,
            border: `1px solid ${t.border}`,
          }}
        >
          {/* Top hairline accent */}
          <div
            className="absolute left-3 right-3 top-0 h-px pointer-events-none"
            style={{
              background: `linear-gradient(90deg, transparent, ${t.green}, transparent)`,
              opacity: 0.55,
            }}
          />
          {/* Eyebrow + section header */}
          <div
            className="px-4 pt-4 pb-3 flex items-center justify-between"
            style={{ borderBottom: `1px solid ${t.border}` }}
          >
            <div className="alt-eyebrow" style={{ color: t.muted }}>
              Indicadores DRE
            </div>
            <div
              className="text-[10px]"
              style={{
                color: t.mutedDim,
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.1em',
              }}
            >
              {monthLabel}
            </div>
          </div>
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ background: t.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.025)' }}>
                {[
                  { key: 'ind', label: 'Indicador', align: 'left' as const },
                  { key: 'val', label: 'Valor', align: 'right' as const },
                  { key: 'pct', label: '% RoB', align: 'right' as const },
                  { key: 'status', label: 'Status', align: 'right' as const },
                ].map((col) => (
                  <th
                    key={col.key}
                    className="px-4 py-2.5"
                    style={{
                      textAlign: col.align,
                      color: t.muted,
                      borderBottom: `1px solid ${t.border}`,
                      fontFamily: 'var(--font-mono)',
                      fontSize: 10,
                      fontWeight: 500,
                      letterSpacing: '0.18em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row, i) => {
                const isLast = i === tableRows.length - 1
                return (
                  <tr
                    key={row.sigla}
                    className="transition-colors"
                    onMouseEnter={(e) => { e.currentTarget.style.background = t.surfaceHover }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <td
                      className="px-4 py-3"
                      style={{
                        color: t.text,
                        borderBottom: isLast ? 'none' : `1px solid ${t.border}`,
                        fontSize: 13,
                        fontFamily: 'var(--font-body)',
                        fontWeight: 500,
                      }}
                    >
                      {row.nome}
                    </td>
                    <td
                      className="px-4 py-3 text-right"
                      style={{
                        color: row.value < 0 ? t.red : t.text,
                        borderBottom: isLast ? 'none' : `1px solid ${t.border}`,
                        fontFamily: 'var(--font-mono)',
                        fontSize: 12,
                        fontWeight: 500,
                      }}
                    >
                      {row.value < 0 ? '−' : ''}{fmtBRL(Math.abs(row.value))}
                    </td>
                    <td
                      className="px-4 py-3 text-right"
                      style={{
                        color: row.badge.type === 'g' ? t.green : row.badge.type === 'a' ? t.amber : t.red,
                        borderBottom: isLast ? 'none' : `1px solid ${t.border}`,
                        fontFamily: 'var(--font-mono)',
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {row.pctRob}
                    </td>
                    <td
                      className="px-4 py-3 text-right"
                      style={{ borderBottom: isLast ? 'none' : `1px solid ${t.border}` }}
                    >
                      <span
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full"
                        style={{
                          background: badgeStyles[row.badge.type].bg,
                          color: badgeStyles[row.badge.type].color,
                          border: `1px solid ${badgeStyles[row.badge.type].border}`,
                          fontFamily: 'var(--font-mono)',
                          fontSize: 9.5,
                          fontWeight: 600,
                          letterSpacing: '0.14em',
                          textTransform: 'uppercase',
                        }}
                      >
                        {row.badge.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Nota de categorias neutras (excluídas do DRE) */}
        {neutros.length > 0 && (
          <div
            className="rounded-lg p-3"
            style={{
              background: `${t.muted}10`,
              border: `1px solid ${t.muted}30`,
            }}
          >
            <div className="text-[9px] uppercase tracking-widest mb-1.5 font-mono flex items-center gap-1.5" style={{ color: t.muted }}>
              <span>🚫</span>
              {neutros.length} categoria{neutros.length !== 1 ? 's' : ''} neutra{neutros.length !== 1 ? 's' : ''} excluída{neutros.length !== 1 ? 's' : ''} do DRE
            </div>
            <div className="text-[10px] mb-1" style={{ color: t.textSec }}>
              R$ {fmtBRL(totalNeutro)} movimentado · efeito zero no resultado
            </div>
            <div className="text-[9px]" style={{ color: t.mutedDim }}>
              {neutros.map((n) => `${n.codigo} ${n.nome}`).join(' · ')}
            </div>
          </div>
        )}
      </div>

      {/* ── Right Column: Embedded Chat ── */}
      <ChatPanel
        open={true}
        onClose={() => {}}
        embedded={true}
        suggestions={aiSuggestions}
        financialContext={financialContext}
        currentPage="/bi/financeiro"
      />
    </div>
  )
}
