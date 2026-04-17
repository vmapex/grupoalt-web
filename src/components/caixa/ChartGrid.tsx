'use client'
import { memo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, ComposedChart, LabelList,
} from 'recharts'
import { useThemeStore } from '@/store/themeStore'
import { GlowLine } from '@/components/ui/GlowLine'
import { DetailBtn } from '@/components/ui/DetailBtn'
import { BarLabel } from '@/components/charts/BarLabel'
import { CustomTooltip } from '@/components/charts/CustomTooltip'
import { fmtK } from '@/lib/formatters'
import type { CaixaLevelData } from '@/lib/mocks/caixaData'

type Level = 'quarterly' | 'monthly' | 'weekly'

export interface ChartGridDreData {
  rob: number; tdcf: number; cv: number; cf: number; mc: number
  rnop: number; dnop: number; ebt1: number; ebt2: number
}

interface ChartGridProps {
  d: CaixaLevelData
  level: Level
  dreData: ChartGridDreData | null
  onDrillIntoMonth: (month: string) => void
  onDetailView: (key: string) => void
}

const CHART_DEFS = [
  { key: 'TD', title: 'T.D.C.F.', colorKey: 'amber' as const, pctField: 'tdcf' as const },
  { key: 'CV', title: 'Custo Variável', colorKey: 'red' as const, pctField: 'cv' as const },
  { key: 'CF', title: 'Custo Fixo', colorKey: 'orange' as const, pctField: 'cf' as const },
]

const sum = (arr: number[]) => arr.reduce((s, v) => s + (v || 0), 0)

export const ChartGrid = memo(function ChartGrid({ d, level, dreData, onDrillIntoMonth, onDetailView }: ChartGridProps) {
  const t = useThemeStore((s) => s.tokens)
  const barSize = level === 'weekly' ? 20 : 24

  return (
    <>
      {/* TOP ROW: RoB (2fr) + Conciliação (1fr) */}
      <div className="grid gap-2.5 mb-2.5" style={{ gridTemplateColumns: '2fr 1fr' }}>
        {/* Receita Bruta */}
        <div
          className="relative overflow-hidden rounded-xl p-3.5 transition-colors"
          style={{ background: t.surface, border: `1px solid ${t.border}` }}
        >
          <GlowLine color={t.blue} />
          <div className="flex justify-between mb-3">
            <div className="text-[9px] uppercase tracking-wider" style={{ color: t.blue }}>
              Receita Bruta
            </div>
            <div className="text-right">
              <div className="font-mono text-base" style={{ color: t.text }}>{fmtK(sum(d.RB))}</div>
              <div className="text-[9px]" style={{ color: t.muted }}>Total período</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={150}>
            <ComposedChart data={d.labels.map((l, i) => ({ name: l, value: d.RB[i] || 0 }))} barSize={level === 'weekly' ? 24 : 30} margin={{ top: 18, right: 4, left: 4, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fill: t.muted, fontSize: 9, fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} cursor={false} />
              <Bar dataKey="value" name="Receita Bruta" radius={[5, 5, 0, 0]}
                activeBar={{ fill: `${t.blue}30`, stroke: t.blue, strokeWidth: 2, radius: [5, 5, 0, 0] as any }}
                onClick={(_: any, idx: number) => { if (level === 'monthly') onDrillIntoMonth(d.labels[idx]) }}>
                {d.labels.map((_, i) => (
                  <Cell key={i} fill={d.RB[i] > 0 ? `${t.blue}18` : 'transparent'} stroke={d.RB[i] > 0 ? t.blue : 'transparent'} strokeWidth={1.5} cursor={level === 'monthly' ? 'pointer' : 'default'} />
                ))}
                <LabelList dataKey="value" content={(props: any) => <BarLabel {...props} fill={t.blue} />} />
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
          <div className="flex justify-between items-center mt-1">
            {level === 'monthly' && (
              <div className="text-[8px]" style={{ color: `${t.muted}77` }}>clique em uma barra para detalhar ▼</div>
            )}
            <div className="ml-auto">
              <DetailBtn onClick={() => onDetailView('receita')} color={t.blue} />
            </div>
          </div>
        </div>

        {/* Receita Líquida card (RoB − TDCF) */}
        <div
          className="relative overflow-hidden rounded-xl p-3.5"
          style={{ background: t.surface, border: `1px solid ${t.border}` }}
        >
          <GlowLine color={t.green} />
          <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: t.green }}>Receita Líquida</div>
          <div className="font-mono text-[28px] leading-none my-1" style={{ color: t.text }}>
            {dreData ? fmtK(dreData.rob - dreData.tdcf) : '0'}
          </div>
          <div className="text-[9px] mb-2.5" style={{ color: t.muted }}>
            {dreData && dreData.rob
              ? `${(((dreData.rob - dreData.tdcf) / dreData.rob) * 100).toFixed(1)}% sobre RoB`
              : 'RoB − TDCF'}
          </div>
          <div className="h-[3px] rounded-full overflow-hidden mb-3" style={{ background: `${t.text}0A` }}>
            <div
              className="h-full rounded-full transition-[width] duration-1000 ease-[cubic-bezier(.4,0,.2,1)]"
              style={{
                width: dreData && dreData.rob ? `${Math.max(0, Math.min(100, ((dreData.rob - dreData.tdcf) / dreData.rob) * 100))}%` : '0%',
                background: t.green,
              }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-[10px]">
              <div className="flex items-center gap-1.5" style={{ color: t.muted }}>
                <div className="w-[5px] h-[5px] rounded-full" style={{ background: t.blue }} />
                Receita Bruta
              </div>
              <span className="font-mono" style={{ color: t.text }}>{dreData ? fmtK(dreData.rob) : '0'}</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <div className="flex items-center gap-1.5" style={{ color: t.muted }}>
                <div className="w-[5px] h-[5px] rounded-full" style={{ background: t.amber }} />
                TDCF
              </div>
              <span className="font-mono" style={{ color: t.amber }}>−{dreData ? fmtK(dreData.tdcf) : '0'}</span>
            </div>
            <div className="flex justify-between text-[10px] pt-1.5 mt-0.5" style={{ borderTop: `1px solid ${t.border}` }}>
              <div className="flex items-center gap-1.5" style={{ color: t.muted }}>
                <div className="w-[5px] h-[5px] rounded-full" style={{ background: t.green }} /> Líquida
              </div>
              <span className="font-mono" style={{ color: t.green }}>{dreData ? fmtK(dreData.rob - dreData.tdcf) : '0'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ROW 2: TDCF, CV, CF — 3 columns */}
      <div className="grid grid-cols-3 gap-2.5">
        {CHART_DEFS.map((cd) => {
          const color = t[cd.colorKey]
          const detailKey = { TD: 'tdcf', CV: 'cv', CF: 'cf' }[cd.key]!
          const chartData = d.labels.map((l, i) => ({ name: l, value: (d as any)[cd.key][i] || 0 }))
          const pctLabel = dreData && dreData.rob
            ? `${((dreData[cd.pctField] / dreData.rob) * 100).toFixed(1)}% RoB`
            : '— RoB'
          return (
            <div key={cd.key} className="relative overflow-hidden rounded-xl p-3.5 transition-colors" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
              <GlowLine color={color} />
              <div className="flex justify-between mb-2">
                <div className="text-[9px] uppercase tracking-wider" style={{ color }}>{cd.title}</div>
                <div className="text-right">
                  <div className="font-mono text-sm" style={{ color }}>{fmtK(sum((d as any)[cd.key]))}</div>
                  <div className="text-[9px]" style={{ color: t.muted }}>{pctLabel}</div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={108}>
                <BarChart data={chartData} barSize={barSize} margin={{ top: 16, right: 4, left: 4, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fill: t.muted, fontSize: 9, fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} cursor={false} />
                  <Bar dataKey="value" name={cd.title} radius={[4, 4, 0, 0]}
                    activeBar={{ fill: `${color}30`, stroke: color, strokeWidth: 2, radius: [4, 4, 0, 0] as any }}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.value > 0 ? `${color}18` : 'transparent'} stroke={entry.value > 0 ? color : 'transparent'} strokeWidth={1.5} />
                    ))}
                    <LabelList dataKey="value" content={(props: any) => <BarLabel {...props} fill={color} />} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="flex justify-end">
                <DetailBtn onClick={() => onDetailView(detailKey)} color={color} />
              </div>
            </div>
          )
        })}
      </div>

      {/* ROW 3: Saldo NOP (span 2) + Resultado Final (1) */}
      <div className="grid grid-cols-3 gap-2.5 mt-2.5">
        {/* Saldo NOP */}
        <div className="col-span-2 relative overflow-hidden rounded-xl p-3.5" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
          <GlowLine color={t.purple} />
          <div className="flex justify-between mb-2">
            <div>
              <div className="text-[9px] uppercase tracking-wider" style={{ color: t.purple }}>Saldo NOP</div>
              <div className="flex gap-2 mt-0.5 text-[8px] font-mono">
                <span style={{ color: t.green }}>R: {fmtK(sum(d.RN))}</span>
                <span style={{ color: t.red }}>D: {fmtK(sum(d.DN))}</span>
              </div>
            </div>
            <div className="text-right">
              {(() => {
                const cardVal = sum(d.RN) - sum(d.DN)
                const pctLabel = dreData && dreData.rob
                  ? `${((cardVal / dreData.rob) * 100).toFixed(1)}% RoB`
                  : '— RoB'
                return (
                  <>
                    <div className="font-mono text-sm" style={{ color: cardVal >= 0 ? t.green : t.red }}>
                      {cardVal >= 0 ? '+' : ''}{fmtK(cardVal)}
                    </div>
                    <div className="text-[9px]" style={{ color: t.muted }}>{pctLabel}</div>
                  </>
                )
              })()}
            </div>
          </div>
          {(() => {
            // Pre-computar saldos pra derivar domain com padding (evita labels
            // clipados pelo plot area quando ficam fora das barras).
            const saldos = d.labels.map((_, i) => (d.RN[i] || 0) - (d.DN[i] || 0))
            const maxAbs = Math.max(1, ...saldos.map((v) => Math.abs(v)))
            const hasNegative = saldos.some((v) => v < 0)
            const hasPositive = saldos.some((v) => v > 0)
            // 18% de padding acima/abaixo garante ~16-20px de folga para labels
            const pad = maxAbs * 0.18
            const yMin = hasNegative ? -(maxAbs + pad) : -pad
            const yMax = hasPositive ? (maxAbs + pad) : pad
            return (
              <ResponsiveContainer width="100%" height={170}>
                <ComposedChart
                  data={d.labels.map((l, i) => ({ name: l, saldo: saldos[i] }))}
                  barSize={level === 'weekly' ? 20 : 28}
                  margin={{ top: 18, right: 4, left: 4, bottom: 24 }}
                >
                  <XAxis dataKey="name" tick={{ fill: t.muted, fontSize: 9, fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} />
                  {/* YAxis hide mas com domain explícito — dá espaço acima/abaixo para os labels */}
                  <YAxis hide domain={[yMin, yMax]} />
                  <Tooltip content={<CustomTooltip />} cursor={false} />
                  <Bar
                    dataKey="saldo"
                    name="Saldo NOP"
                    radius={[4, 4, 0, 0]}
                    activeBar={{ fill: `${t.purple}35`, stroke: t.purple, strokeWidth: 2, radius: [4, 4, 0, 0] as any }}
                    isAnimationActive={false}
                  >
                    {d.labels.map((_, i) => {
                      const saldo = saldos[i]
                      return <Cell key={i} fill={saldo >= 0 ? `${t.green}20` : `${t.red}20`} stroke={saldo >= 0 ? t.green : t.red} strokeWidth={1.5} />
                    })}
                    {/* content custom ignora position — aplicamos o offset manualmente:
                        - positivo: props.y - 6 (acima do topo do bar)
                        - negativo: props.y + height + 10 (abaixo do fundo do bar)
                        Tipografia idêntica ao BarLabel dos outros charts. */}
                    <LabelList
                      dataKey="saldo"
                      content={(props: any) => {
                        const v = props.value as number | undefined
                        if (!v || v === 0) return null
                        const x = (props.x ?? 0) + (props.width ?? 0) / 2
                        const y = v > 0
                          ? (props.y ?? 0) - 6
                          : (props.y ?? 0) + (props.height ?? 0) + 10
                        return (
                          <text
                            x={x}
                            y={y}
                            textAnchor="middle"
                            fill={v > 0 ? t.green : t.red}
                            fontSize={8}
                            fontFamily="DM Mono, monospace"
                            fontWeight="normal"
                            opacity={0.75}
                          >
                            {fmtK(v)}
                          </text>
                        )
                      }}
                    />
                  </Bar>
                </ComposedChart>
              </ResponsiveContainer>
            )
          })()}
          <div className="flex justify-end">
            <DetailBtn onClick={() => onDetailView('saldoNop')} color={t.purple} />
          </div>
        </div>

        {/* Resultado Final */}
        <div
          className="rounded-xl p-3.5"
          style={{
            background: `linear-gradient(135deg, rgba(52,211,153,0.07), rgba(56,189,248,0.04))`,
            border: `1px solid rgba(52,211,153,0.18)`,
          }}
        >
          <div className="text-[9px] uppercase tracking-wider" style={{ color: `${t.green}BB` }}>Resultado Final</div>
          <div
            className="font-mono text-2xl leading-none my-1.5"
            style={{ color: dreData && dreData.ebt2 < 0 ? t.red : t.green }}
          >
            {dreData ? fmtK(dreData.ebt2) : '0'}
          </div>
          <div className="text-[9px] mb-3" style={{ color: `${t.green}99` }}>
            {dreData && dreData.rob
              ? `EBT2 — ${((dreData.ebt2 / dreData.rob) * 100).toFixed(1)}% sobre RoB`
              : 'EBT2'}
          </div>
          {dreData && [
            { n: 'EBT1', v: dreData.ebt1, c: dreData.ebt1 >= 0 ? t.green : t.red },
            { n: '+ RNOP', v: dreData.rnop, c: t.green },
            { n: '− DNOP', v: -dreData.dnop, c: t.purple },
          ].map((r, i) => (
            <div key={i} className="flex justify-between text-[10px] py-1" style={{ borderBottom: `1px solid ${t.text}06` }}>
              <span style={{ color: t.muted }}>{r.n}</span>
              <span className="font-mono" style={{ color: r.c }}>{r.v >= 0 ? '+' : ''}{fmtK(r.v)}</span>
            </div>
          ))}
          <div className="flex justify-between text-[10px] pt-1.5 mt-0.5" style={{ borderTop: `1px solid ${t.green}33` }}>
            <span className="font-semibold" style={{ color: t.text }}>= EBT2</span>
            <span
              className="font-mono font-bold"
              style={{ color: dreData && dreData.ebt2 < 0 ? t.red : t.green }}
            >
              {dreData ? (dreData.ebt2 >= 0 ? '+' : '') + fmtK(dreData.ebt2) : '0'}
            </span>
          </div>
        </div>
      </div>
    </>
  )
})
