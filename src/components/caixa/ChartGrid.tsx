'use client'
import { memo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, ComposedChart, Line, LabelList,
} from 'recharts'
import { useThemeStore } from '@/store/themeStore'
import { GlowLine } from '@/components/ui/GlowLine'
import { DetailBtn } from '@/components/ui/DetailBtn'
import { BarLabel } from '@/components/charts/BarLabel'
import { CustomTooltip } from '@/components/charts/CustomTooltip'
import { fmtK } from '@/lib/formatters'
import type { CaixaLevelData } from '@/lib/mocks/caixaData'

type Level = 'quarterly' | 'monthly' | 'weekly'

interface ChartGridProps {
  d: CaixaLevelData
  level: Level
  onDrillIntoMonth: (month: string) => void
  onDetailView: (key: string) => void
}

const CHART_DEFS = [
  { key: 'TD', title: 'T.D.C.F.', pctLabel: '14,79% RoB', colorKey: 'amber' as const },
  { key: 'CV', title: 'Custo Variável', pctLabel: '73,2% RoB', colorKey: 'red' as const },
  { key: 'CF', title: 'Custo Fixo', pctLabel: '42,9% RoB', colorKey: 'orange' as const },
]

const sum = (arr: number[]) => arr.reduce((s, v) => s + (v || 0), 0)

export const ChartGrid = memo(function ChartGrid({ d, level, onDrillIntoMonth, onDetailView }: ChartGridProps) {
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
              <XAxis dataKey="name" tick={{ fill: t.mutedDim, fontSize: 9, fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} />
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
              {level === 'monthly' && (
                <Line type="monotone" dataKey="value" stroke={`${t.blue}45`} strokeWidth={1.5} strokeDasharray="4 4" dot={{ fill: t.blue, r: 3 }} />
              )}
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

        {/* Conciliação card */}
        <div
          className="relative overflow-hidden rounded-xl p-3.5"
          style={{ background: t.surface, border: `1px solid ${t.border}` }}
        >
          <GlowLine color={t.green} />
          <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: t.green }}>Conciliação</div>
          <div className="font-mono text-[28px] leading-none my-1" style={{ color: t.text }}>87%</div>
          <div className="text-[9px] mb-2.5" style={{ color: t.muted }}>dos lançamentos conciliados</div>
          <div className="h-[3px] rounded-full overflow-hidden mb-3" style={{ background: `${t.text}0A` }}>
            <div className="h-full rounded-full transition-[width] duration-1000 ease-[cubic-bezier(.4,0,.2,1)]" style={{ width: '87%', background: t.green }} />
          </div>
          <div className="flex flex-col gap-1.5">
            {[
              { label: 'Conciliados', val: '342', dot: t.green, c: t.text },
              { label: 'Pendentes', val: '51', dot: t.amber, c: t.amber },
            ].map((r, i) => (
              <div key={i} className="flex justify-between text-[10px]">
                <div className="flex items-center gap-1.5" style={{ color: t.muted }}>
                  <div className="w-[5px] h-[5px] rounded-full" style={{ background: r.dot }} />
                  {r.label}
                </div>
                <span className="font-mono text-[10px]" style={{ color: r.c }}>{r.val}</span>
              </div>
            ))}
            <div className="flex justify-between text-[10px] pt-1.5 mt-0.5" style={{ borderTop: `1px solid ${t.border}` }}>
              <div className="flex items-center gap-1.5" style={{ color: t.muted }}>
                <div className="w-[5px] h-[5px] rounded-full" style={{ background: t.muted }} /> Total
              </div>
              <span className="font-mono" style={{ color: t.text }}>393</span>
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
          return (
            <div key={cd.key} className="relative overflow-hidden rounded-xl p-3.5 transition-colors" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
              <GlowLine color={color} />
              <div className="flex justify-between mb-2">
                <div className="text-[9px] uppercase tracking-wider" style={{ color }}>{cd.title}</div>
                <div className="text-right">
                  <div className="font-mono text-sm" style={{ color }}>{fmtK(sum((d as any)[cd.key]))}</div>
                  <div className="text-[9px]" style={{ color: t.muted }}>{cd.pctLabel}</div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={108}>
                <BarChart data={chartData} barSize={barSize} margin={{ top: 16, right: 4, left: 4, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fill: t.mutedDim, fontSize: 9, fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} />
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
                return (
                  <>
                    <div className="font-mono text-sm" style={{ color: cardVal >= 0 ? t.green : t.red }}>
                      {cardVal >= 0 ? '+' : ''}{fmtK(cardVal)}
                    </div>
                    <div className="text-[9px]" style={{ color: t.muted }}>33,8% RoB</div>
                  </>
                )
              })()}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={108}>
            <ComposedChart data={d.labels.map((l, i) => ({ name: l, saldo: (d.RN[i] || 0) - (d.DN[i] || 0) }))} barSize={level === 'weekly' ? 20 : 28} margin={{ top: 16, right: 4, left: 4, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fill: t.mutedDim, fontSize: 9, fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} cursor={false} />
              <Bar dataKey="saldo" name="Saldo NOP" radius={[4, 4, 0, 0]}
                activeBar={{ fill: `${t.purple}35`, stroke: t.purple, strokeWidth: 2, radius: [4, 4, 0, 0] as any }}>
                {d.labels.map((_, i) => {
                  const saldo = (d.RN[i] || 0) - (d.DN[i] || 0)
                  return <Cell key={i} fill={saldo >= 0 ? `${t.green}20` : `${t.red}20`} stroke={saldo >= 0 ? t.green : t.red} strokeWidth={1.5} />
                })}
                <LabelList dataKey="saldo" content={(props: any) => <BarLabel {...props} fill={props.value >= 0 ? t.green : t.red} />} />
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
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
          <div className="font-mono text-2xl leading-none my-1.5" style={{ color: t.green }}>5.901</div>
          <div className="text-[9px] mb-3" style={{ color: `${t.green}99` }}>EBT2 — 2,8% sobre RoB</div>
          {[
            { n: 'EBT1', v: -65248, c: t.red },
            { n: '+ RNOP', v: 92702, c: t.green },
            { n: '− DNOP', v: -21553, c: t.purple },
          ].map((r, i) => (
            <div key={i} className="flex justify-between text-[10px] py-1" style={{ borderBottom: `1px solid ${t.text}06` }}>
              <span style={{ color: t.muted }}>{r.n}</span>
              <span className="font-mono" style={{ color: r.c }}>{r.v >= 0 ? '+' : ''}{fmtK(r.v)}</span>
            </div>
          ))}
          <div className="flex justify-between text-[10px] pt-1.5 mt-0.5" style={{ borderTop: `1px solid ${t.green}33` }}>
            <span className="font-semibold" style={{ color: t.text }}>= EBT2</span>
            <span className="font-mono font-bold" style={{ color: t.green }}>+5.901</span>
          </div>
          <div className="flex justify-end">
            <DetailBtn onClick={() => onDetailView('saldoNop')} color={t.purple} />
          </div>
        </div>
      </div>
    </>
  )
})
