'use client'
import { useState, useCallback, useMemo } from 'react'
import { BarChart3, Sparkles, Loader2 } from 'lucide-react'
import { useThemeStore } from '@/store/themeStore'
import { CAIXA_DATA, WEEKLY } from '@/lib/mocks/caixaData'
import { fmtK, fmtBRL } from '@/lib/formatters'
import { KPIStrip } from '@/components/caixa/KPIStrip'
import { DrillBar } from '@/components/caixa/DrillBar'
import { ChartGrid } from '@/components/caixa/ChartGrid'
import { DRESidebar } from '@/components/caixa/DRESidebar'
import { DetailPanel } from '@/components/caixa/DetailPanel'
import { useExtrato, useSaldos } from '@/hooks/useAPI'
import { useEmpresaId } from '@/hooks/useEmpresaId'

type Level = 'quarterly' | 'monthly' | 'weekly'

export default function PageCaixa() {
  const t = useThemeStore((s) => s.tokens)
  const empresaId = useEmpresaId()
  const [level, setLevel] = useState<Level>('monthly')
  const [selMonth, setSelMonth] = useState<string | null>(null)
  const [caixaView, setCaixaView] = useState<'dashboard' | 'analise'>('dashboard')
  const [detailView, setDetailView] = useState<string | null>(null)

  // API calls for KPI strip (saldo data)
  const { data: saldosRaw } = useSaldos(empresaId)
  const { data: extratoRaw, loading: loadingExtrato } = useExtrato(empresaId)

  // Compute KPI values from API data
  const kpiValues = useMemo(() => {
    const lancs = extratoRaw?.lancamentos
    if (!lancs?.length) return null
    const entradas = lancs.filter((r) => r.valor > 0).reduce((s, r) => s + r.valor, 0)
    const saidas = lancs.filter((r) => r.valor < 0).reduce((s, r) => s + Math.abs(r.valor), 0)
    const saldoFinal = entradas - saidas
    return { entradas, saidas, saldoFinal }
  }, [extratoRaw])

  const getLevelData = useCallback(() => {
    if (level === 'quarterly') return CAIXA_DATA.quarterly
    if (level === 'monthly') return CAIXA_DATA.monthly
    if (level === 'weekly' && selMonth && WEEKLY[selMonth]) return WEEKLY[selMonth]
    return CAIXA_DATA.monthly
  }, [level, selMonth])

  const d = getLevelData()
  const sum = (arr: number[]) => arr.reduce((s, v) => s + (v || 0), 0)

  const drillUp = () => {
    if (level === 'weekly') { setLevel('monthly'); setSelMonth(null) }
    else if (level === 'monthly') { setLevel('quarterly'); setSelMonth(null) }
  }
  const drillDown = () => {
    if (level === 'quarterly') { setLevel('monthly'); setSelMonth(null) }
    else if (level === 'monthly') { setSelMonth('Dez/25'); setLevel('weekly') }
  }
  const drillIntoMonth = (monthLabel: string) => {
    if (WEEKLY[monthLabel]) { setSelMonth(monthLabel); setLevel('weekly') }
  }
  const jumpTo = (lv: Level) => { setLevel(lv); if (lv !== 'weekly') setSelMonth(null) }

  return (
    <div className="flex flex-col min-h-full">
      {/* View toggle bar */}
      <div
        className="flex items-center justify-between px-5 shrink-0"
        style={{ height: 38, borderBottom: `1px solid ${t.border}`, background: `${t.bg}CC` }}
      >
        <div className="flex gap-0.5 rounded-lg p-0.5" style={{ background: `${t.text}06` }}>
          {[
            { id: 'dashboard' as const, label: 'Dashboard', Icon: BarChart3, accent: t.blue, dim: t.blueDim },
            { id: 'analise' as const, label: 'Análise IA', Icon: Sparkles, accent: t.purple, dim: t.purpleDim },
          ].map((v) => (
            <button
              key={v.id}
              onClick={() => { setCaixaView(v.id); setDetailView(null) }}
              className="flex items-center gap-1.5 px-3.5 py-1 rounded-md text-[10px] border-none cursor-pointer transition-all"
              style={{
                color: caixaView === v.id ? v.accent : t.muted,
                background: caixaView === v.id ? v.dim : 'transparent',
                fontWeight: caixaView === v.id ? 600 : 400,
                fontFamily: 'inherit',
              }}
            >
              <v.Icon size={11} strokeWidth={caixaView === v.id ? 2 : 1.5} />
              {v.label}
            </button>
          ))}
        </div>
        {caixaView === 'analise' && (
          <div
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg"
            style={{ background: `${t.purple}0A`, border: `1px solid ${t.purple}22` }}
          >
            <div className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: t.purple }} />
            <span className="text-[9px] font-semibold" style={{ color: t.purple }}>Agente IA ativo</span>
          </div>
        )}
      </div>

      {/* DASHBOARD VIEW */}
      {caixaView === 'dashboard' && detailView && (
        <DetailPanel defKey={detailView} d={d} onBack={() => setDetailView(null)} />
      )}

      {caixaView === 'dashboard' && !detailView && (
        <>
          {/* KPI Strip */}
          <KPIStrip
            items={[
              { label: 'Saldo Inicial', value: '0,00', color: t.text, accent: t.blue, sub: 'Base do período' },
              { label: 'Entradas', value: kpiValues ? fmtBRL(kpiValues.entradas) : '303.453,50', color: t.green, accent: t.green, sub: 'Receitas realizadas' },
              { label: 'Saídas', value: kpiValues ? fmtBRL(kpiValues.saidas) : '297.552,49', color: t.red, accent: t.red, sub: 'Custos + despesas' },
              { label: 'Saldo Final', value: kpiValues ? fmtBRL(kpiValues.saldoFinal) : '5.901,01', color: kpiValues ? (kpiValues.saldoFinal >= 0 ? t.green : t.red) : t.green, accent: t.green, sub: 'Posição atual' },
              { label: 'Balanço', value: kpiValues ? fmtBRL(kpiValues.saldoFinal) : '5.901,01', color: kpiValues ? (kpiValues.saldoFinal >= 0 ? t.green : t.red) : t.green, accent: t.green, sub: kpiValues ? `${((kpiValues.saldoFinal / (kpiValues.entradas || 1)) * 100).toFixed(1)}% sobre RoB` : '2,8% sobre RoB' },
            ]}
          />

          {/* Body: Charts + DRE */}
          <div className="grid min-h-[550px]" style={{ gridTemplateColumns: '1fr 252px' }}>
            {/* LEFT: Charts */}
            <div className="p-4 overflow-y-auto" style={{ borderRight: `1px solid ${t.border}` }}>
              <DrillBar
                level={level}
                selMonth={selMonth}
                onJumpTo={jumpTo}
                onDrillUp={drillUp}
                onDrillDown={drillDown}
              />
              <ChartGrid
                d={d}
                level={level}
                onDrillIntoMonth={drillIntoMonth}
                onDetailView={setDetailView}
              />
            </div>

            {/* RIGHT: DRE Sidebar */}
            <DRESidebar />
          </div>

          {/* Footer strip */}
          <div className="grid grid-cols-5 shrink-0" style={{ borderTop: `1px solid ${t.border}` }}>
            {[
              { l: 'Resultado Líquido', v: '+5.901,01', c: t.green, sub: 'EBT2 = 2,8% RoB' },
              { l: 'Margem de Contribuição', v: '25.232', c: t.blue, sub: '12,0% sobre RoB' },
              { l: 'Cobertura CF', v: '−65.248', c: t.red, sub: 'EBT1 = −31,0%' },
              { l: 'Receitas NOP', v: '+71.149', c: t.green, sub: 'Salvou o resultado' },
              { l: 'Taxa TDCF', v: '14,79%', c: t.amber, sub: 'Sobre receita bruta' },
            ].map((f, i) => (
              <div
                key={i}
                className="px-5 py-3"
                style={{ borderRight: i < 4 ? `1px solid ${t.border}` : 'none' }}
              >
                <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: t.muted }}>{f.l}</div>
                <div className="font-mono text-sm" style={{ color: f.c }}>{f.v}</div>
                <div className="text-[9px] mt-0.5" style={{ color: t.muted }}>{f.sub}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ANÁLISE IA VIEW — placeholder */}
      {caixaView === 'analise' && (
        <div className="flex-1 flex items-center justify-center" style={{ color: t.muted }}>
          <div className="text-center">
            <Sparkles size={40} className="mx-auto mb-4 opacity-30" />
            <div className="text-sm font-semibold mb-1">Análise IA</div>
            <div className="text-[11px] max-w-xs">
              O agente Claude será integrado aqui para análise financeira em tempo real.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
