'use client'
import { useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ComposedChart, Line, LabelList, CartesianGrid,
} from 'recharts'
import { useThemeStore } from '@/store/themeStore'
import { GlowLine } from '@/components/ui/GlowLine'
import { BarLabel } from '@/components/charts/BarLabel'
import { BarLabelVar } from '@/components/charts/BarLabelVar'
import { CustomTooltip } from '@/components/charts/CustomTooltip'
import { fmtK } from '@/lib/formatters'
import type { CaixaLevelData, DetailDef } from '@/lib/mocks/caixaData'
import type { DREBreakdowns, CatBreakdowns } from '@/lib/caixaBuilder'

interface DetailPanelProps {
  defKey: string
  d: CaixaLevelData
  breakdowns?: DREBreakdowns | null
  catBreakdowns?: CatBreakdowns | null
  /** Breakdown N1 (linha única por grupo DRE) — usado no toggle de TDCF/CV */
  catBreakdownsN1?: CatBreakdowns | null
  /** Breakdown N3 (categoria Omie individual) — Saldo NOP sempre usa N3 */
  catBreakdownsN3?: CatBreakdowns | null
  onBack: () => void
}

type CompGranularidade = 'n1' | 'n2'

const sum = (arr: number[]) => arr.reduce((s, v) => s + (v || 0), 0)

export function DetailPanel({ defKey, d, breakdowns, catBreakdowns, catBreakdownsN1, catBreakdownsN3, onBack }: DetailPanelProps) {
  const t = useThemeStore((s) => s.tokens)
  // Toggle N1/N2 para TDCF e CV. Default N1 (consolidado) conforme plano.
  const [compGran, setCompGran] = useState<CompGranularidade>('n1')
  const showToggle = defKey === 'tdcf' || defKey === 'cv'

  const def = useMemo((): DetailDef => {
    const defs: Record<string, DetailDef> = {
      receita: {
        title: 'Receita Bruta', key: 'RB', color: t.blue,
        kpis: [
          { l: 'Total Período', v: fmtK(sum(d.RB)), c: t.blue },
          { l: 'Média Mensal', v: fmtK(sum(d.RB) / Math.max(d.labels.length, 1)), c: t.text },
          { l: 'Melhor Mês', v: fmtK(Math.max(...d.RB)), c: t.green },
          { l: 'Pior Mês', v: fmtK(Math.min(...d.RB.filter(v => v > 0)) || 0), c: t.amber },
        ],
        breakdown: catBreakdowns?.RoB ?? [],
        clientes: breakdowns?.RoB ?? [],
      },
      tdcf: {
        title: 'T.D.C.F. (Deduções)', key: 'TD', color: t.amber,
        kpis: [
          { l: 'Total Deduções', v: fmtK(sum(d.TD)), c: t.amber },
          { l: '% sobre RoB', v: '14,8%', c: t.text },
          { l: 'PIS/COFINS', v: fmtK(sum(d.TD) * 0.72), c: t.amber },
          { l: 'ISS/ICMS', v: fmtK(sum(d.TD) * 0.28), c: t.amber },
        ],
        breakdown: (compGran === 'n1' ? catBreakdownsN1 : catBreakdowns)?.TDCF ?? [],
        clientes: breakdowns?.TDCF ?? [],
      },
      cv: {
        title: 'Custo Variável', key: 'CV', color: t.red,
        kpis: [
          { l: 'Total CV', v: fmtK(sum(d.CV)), c: t.red },
          { l: '% sobre RoB', v: '73,2%', c: t.text },
          { l: 'Diesel', v: fmtK(sum(d.CV) * 0.45), c: t.red },
          { l: 'Pedágios', v: fmtK(sum(d.CV) * 0.12), c: t.amber },
        ],
        breakdown: (compGran === 'n1' ? catBreakdownsN1 : catBreakdowns)?.CV ?? [],
        clientes: breakdowns?.CV ?? [],
      },
      cf: {
        title: 'Custo Fixo', key: 'CF', color: t.orange,
        kpis: [
          { l: 'Total CF', v: fmtK(sum(d.CF)), c: t.orange },
          { l: '% sobre RoB', v: '42,9%', c: t.text },
          { l: 'Folha', v: fmtK(sum(d.CF) * 0.52), c: t.orange },
          { l: 'Aluguel/Infra', v: fmtK(sum(d.CF) * 0.18), c: t.amber },
        ],
        breakdown: catBreakdowns?.CF ?? [],
        clientes: breakdowns?.CF ?? [],
      },
      saldoNop: {
        title: 'Saldo NOP', key: null, color: t.purple,
        kpis: [
          { l: 'Saldo NOP', v: fmtK(sum(d.RN) - sum(d.DN)), c: sum(d.RN) - sum(d.DN) >= 0 ? t.green : t.red },
          { l: 'Receita NOP', v: fmtK(sum(d.RN)), c: t.green },
          { l: 'Despesa NOP', v: fmtK(sum(d.DN)), c: t.red },
          { l: '% sobre RoB', v: ((sum(d.RN) - sum(d.DN)) / sum(d.RB) * 100).toFixed(1) + '%', c: t.text },
        ],
        // Saldo NOP sempre em N3 (categoria Omie individual) — sem toggle
        breakdown: (catBreakdownsN3 ?? catBreakdowns)?.RNOP ?? [],
        breakdownDN: (catBreakdownsN3 ?? catBreakdowns)?.DNOP ?? [],
        clientes: breakdowns?.RNOP ?? [],
      },
    }
    return defs[defKey]
  }, [defKey, d, t, breakdowns, catBreakdowns, catBreakdownsN1, catBreakdownsN3, compGran])

  if (!def) return null

  const isNop = defKey === 'saldoNop'
  const chartData = isNop
    ? d.labels.map((l, i) => ({ name: l, rnop: d.RN[i] || 0, dnop: d.DN[i] || 0, saldo: (d.RN[i] || 0) - (d.DN[i] || 0) }))
    : d.labels.map((l, i) => ({ name: l, value: (d as any)[def.key!][i] || 0 }))

  const sorted = [...def.clientes].sort((a, b) => b.valor - a.valor)
  const totalCli = sorted.reduce((s, c) => s + c.valor, 0)
  const maxCli = sorted[0]?.valor || 1

  return (
    <div className="p-5 flex flex-col gap-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[10px]">
        <span
          onClick={onBack}
          className="cursor-pointer transition-colors hover:text-accent-blue"
          style={{ color: t.muted }}
        >
          Dashboard
        </span>
        <span style={{ color: t.mutedDim }}>›</span>
        <span className="font-semibold" style={{ color: def.color }}>{def.title}</span>
      </div>

      {/* KPIs */}
      <div className="grid gap-2.5" style={{ gridTemplateColumns: `repeat(${def.kpis.length}, 1fr)` }}>
        {def.kpis.map((k, i) => (
          <div key={i} className="relative overflow-hidden rounded-lg p-3" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
            <GlowLine color={i === 0 ? def.color : t.border} />
            <div className="text-[8px] uppercase tracking-wider mb-1.5" style={{ color: t.muted }}>{k.l}</div>
            <div className="font-mono text-lg" style={{ color: k.c }}>{k.v}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="relative overflow-hidden rounded-xl p-4" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
        <GlowLine color={def.color} />
        <div className="text-[9px] uppercase tracking-wider mb-3.5" style={{ color: t.muted }}>
          {isNop ? 'Receita NOP × Despesa NOP' : `${def.title} — Evolução Mensal`}
        </div>
        <ResponsiveContainer width="100%" height={340}>
          {isNop ? (
            <ComposedChart data={chartData} barSize={42} margin={{ top: 32, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={`${t.text}06`} />
              <XAxis dataKey="name" tick={{ fill: t.muted, fontSize: 12, fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: t.muted, fontSize: 10, fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} tickFormatter={fmtK} />
              <Tooltip content={<CustomTooltip />} cursor={false} />
              <Bar dataKey="rnop" name="Receita NOP" fill={`${t.green}20`} stroke={t.green} strokeWidth={1.5} radius={[5, 5, 0, 0]}>
                <LabelList dataKey="rnop" content={(props: any) => <BarLabel {...props} fill={t.green} />} />
              </Bar>
              <Bar dataKey="dnop" name="Despesa NOP" fill={`${t.red}20`} stroke={t.red} strokeWidth={1.5} radius={[5, 5, 0, 0]}>
                <LabelList dataKey="dnop" content={(props: any) => <BarLabel {...props} fill={t.red} />} />
              </Bar>
              <Line type="monotone" dataKey="saldo" name="Saldo NOP" stroke={t.purple} strokeWidth={2} dot={{ fill: t.purple, r: 5 }} />
            </ComposedChart>
          ) : (
            <BarChart data={chartData} barSize={48} margin={{ top: 36, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={`${t.text}06`} />
              <XAxis dataKey="name" tick={{ fill: t.muted, fontSize: 12, fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: t.muted, fontSize: 10, fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} tickFormatter={fmtK} />
              <Tooltip content={<CustomTooltip />} cursor={false} />
              <Bar dataKey="value" name={def.title} fill={`${def.color}20`} stroke={def.color} strokeWidth={1.5} radius={[5, 5, 0, 0]}>
                <LabelList dataKey="value" content={(props: any) => <BarLabelVar {...props} fill={def.color} data={chartData} dataKey="value" />} />
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Client Ranking */}
      {sorted.length > 0 && (
        <div className="relative overflow-hidden rounded-xl p-4" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
          <GlowLine color={def.color} />
          <div className="flex justify-between items-center mb-3.5">
            <div className="text-[9px] uppercase tracking-wider" style={{ color: t.muted }}>
              {defKey === 'receita' ? 'Ranking por Cliente' : defKey === 'tdcf' ? 'Composição por Tributo' : 'Ranking por Fornecedor'}
            </div>
            <span className="text-[9px] font-mono" style={{ color: t.mutedDim }}>
              {sorted.length} itens · {fmtK(totalCli)} total
            </span>
          </div>
          {sorted.map((c, i) => {
            const pctCli = (c.valor / totalCli) * 100
            return (
              <div key={i} className={i < sorted.length - 1 ? 'mb-2.5' : ''}>
                <div className="flex justify-between items-baseline text-[10px] mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[9px] min-w-[16px]" style={{ color: t.mutedDim }}>{i + 1}.</span>
                    <span style={{ color: t.text }}>{c.nome}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono" style={{ color: t.text }}>{fmtK(c.valor)}</span>
                    <span className="font-mono min-w-[40px] text-right text-[10px]" style={{ color: def.color }}>{pctCli.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="flex gap-1 items-center">
                  <div className="flex-1 h-1.5 rounded-sm overflow-hidden" style={{ background: `${t.text}08` }}>
                    <div className="h-full rounded-sm transition-[width] duration-500" style={{ width: `${(c.valor / maxCli) * 100}%`, background: def.color, opacity: 0.5 }} />
                  </div>
                </div>
              </div>
            )
          })}

          {/* Pareto */}
          <div className="mt-4 pt-3" style={{ borderTop: `1px solid ${t.border}` }}>
            <div className="flex justify-between items-center mb-2.5">
              <span className="text-[10px] uppercase tracking-wider" style={{ color: t.muted }}>Concentração (Pareto)</span>
              <span className="text-[10px] font-mono" style={{ color: t.textSec }}>
                Top 3 = {((sorted.slice(0, 3).reduce((s, c) => s + c.valor, 0)) / totalCli * 100).toFixed(0)}% · Top 5 = {((sorted.slice(0, Math.min(5, sorted.length)).reduce((s, c) => s + c.valor, 0)) / totalCli * 100).toFixed(0)}%
              </span>
            </div>
            <div className="flex gap-px h-7 rounded-md overflow-hidden">
              {sorted.map((c, i) => {
                const pctW = (c.valor / totalCli) * 100
                return (
                  <div key={i} className="h-full flex items-center justify-center" style={{
                    width: `${pctW}%`, background: def.color, opacity: 0.85 - i * 0.08,
                    borderRight: i < sorted.length - 1 ? `1px solid ${t.bg}` : 'none',
                  }}>
                    {pctW > 6 && (
                      <span className="text-[9px] font-mono font-medium text-white whitespace-nowrap">{pctW.toFixed(0)}%</span>
                    )}
                  </div>
                )
              })}
            </div>
            <div className="flex gap-px mt-1">
              {sorted.map((c, i) => {
                const pctW = (c.valor / totalCli) * 100
                return (
                  <div key={i} className="overflow-hidden" style={{ width: `${pctW}%` }}>
                    {pctW > 8 && (
                      <span className="text-[8px] block truncate" style={{ color: t.muted }}>
                        {c.nome.length > 12 ? c.nome.slice(0, 11) + '…' : c.nome}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Breakdown */}
      {/* Toggle N1/N2 (apenas TDCF e CV) */}
      {showToggle && (
        <div className="flex items-center gap-2 mt-1 mb-[-8px]">
          <span className="text-[9px] uppercase tracking-wider" style={{ color: t.muted }}>Granularidade</span>
          <div className="flex items-center gap-1 rounded-md p-0.5" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
            {(['n1', 'n2'] as CompGranularidade[]).map((g) => (
              <button
                key={g}
                onClick={() => setCompGran(g)}
                className="px-2 py-1 text-[10px] rounded font-medium transition-all"
                style={{
                  background: compGran === g ? `${def.color}22` : 'transparent',
                  color: compGran === g ? def.color : t.muted,
                }}
              >
                {g === 'n1' ? 'Consolidado (N1)' : 'Por subgrupo (N2)'}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-3" style={{ gridTemplateColumns: isNop ? '1fr 1fr' : '1fr' }}>
        <BreakdownTable title={isNop ? 'Composição — Receita NOP' : `Composição — ${def.title}`} items={def.breakdown} color={isNop ? t.green : def.color} />
        {isNop && def.breakdownDN && (
          <BreakdownTable title="Composição — Despesa NOP" items={def.breakdownDN} color={t.red} />
        )}
      </div>
    </div>
  )
}

function BreakdownTable({ title, items, color }: { title: string; items: Array<{ item: string; valor: number; pct: number }>; color: string }) {
  const t = useThemeStore((s) => s.tokens)
  return (
    <div className="rounded-xl p-4" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
      <div className="text-[9px] uppercase tracking-wider mb-3" style={{ color: t.muted }}>{title}</div>
      {items.map((r, i) => (
        <div key={i} className="mb-2.5">
          <div className="flex justify-between text-[10px] mb-0.5">
            <span style={{ color: t.text }}>{r.item}</span>
            <div className="flex gap-2.5">
              <span className="font-mono" style={{ color: t.textSec }}>{fmtK(r.valor)}</span>
              <span className="font-mono min-w-[36px] text-right" style={{ color }}>{r.pct}%</span>
            </div>
          </div>
          <div className="h-1 rounded-sm overflow-hidden" style={{ background: `${t.text}08` }}>
            <div className="h-full rounded-sm transition-[width] duration-500" style={{ width: `${r.pct}%`, background: color, opacity: 0.6 }} />
          </div>
        </div>
      ))}
    </div>
  )
}
