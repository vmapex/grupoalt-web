'use client'
import { useState, useCallback, useMemo } from 'react'
import { BarChart3, Sparkles, Loader2 } from 'lucide-react'
import { useThemeStore } from '@/store/themeStore'
import { CAIXA_DATA, WEEKLY } from '@/lib/mocks/caixaData'
import { CATEGORIAS } from '@/lib/planoContas'
import { fmtK, fmtBRL } from '@/lib/formatters'
import { KPIStrip } from '@/components/caixa/KPIStrip'
import { DrillBar } from '@/components/caixa/DrillBar'
import { ChartGrid } from '@/components/caixa/ChartGrid'
import { DRESidebar } from '@/components/caixa/DRESidebar'
import { DetailPanel } from '@/components/caixa/DetailPanel'
import { useExtrato } from '@/hooks/useAPI'
import { useEmpresaId } from '@/hooks/useEmpresaId'
import { useDateRangeStore } from '@/store/dateRangeStore'

function isoToDMY(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

type Level = 'quarterly' | 'monthly' | 'weekly'

export default function PageCaixa() {
  const t = useThemeStore((s) => s.tokens)
  const empresaId = useEmpresaId()
  const dateFrom = useDateRangeStore((s) => s.from)
  const dateTo = useDateRangeStore((s) => s.to)
  const dt_inicio = isoToDMY(dateFrom)
  const dt_fim = isoToDMY(dateTo)
  const [level, setLevel] = useState<Level>('monthly')
  const [selMonth, setSelMonth] = useState<string | null>(null)
  const [caixaView, setCaixaView] = useState<'dashboard' | 'analise'>('dashboard')
  const [detailView, setDetailView] = useState<string | null>(null)

  // API calls for KPI strip with date range
  const { data: extratoRaw, loading: loadingExtrato } = useExtrato(empresaId, dt_inicio, dt_fim)

  const lancamentos = extratoRaw?.lancamentos ?? []
  const saldoInicial = extratoRaw?.saldo_inicial ?? 0

  // Compute KPI and DRE values from API data
  const kpiValues = useMemo(() => {
    if (!lancamentos.length) return null
    const entradas = lancamentos.filter((r: any) => r.valor > 0).reduce((s: number, r: any) => s + r.valor, 0)
    const saidas = lancamentos.filter((r: any) => r.valor < 0).reduce((s: number, r: any) => s + Math.abs(r.valor), 0)
    const saldoFinal = saldoInicial + entradas - saidas
    return { entradas, saidas, saldoFinal }
  }, [lancamentos, saldoInicial])

  // DRE from extrato
  const dreData = useMemo(() => {
    if (!lancamentos.length) return null
    const groups: Record<string, number> = {}
    for (const l of lancamentos) {
      const cat = CATEGORIAS[(l as any).categoria || '']
      if (!cat) continue
      groups[cat.grupoDRE] = (groups[cat.grupoDRE] || 0) + Math.abs((l as any).valor)
    }
    const rob = groups['RoB'] || 0
    const tdcf = groups['TDCF'] || 0
    const cv = groups['CV'] || 0
    const cf = groups['CF'] || 0
    const rnop = groups['RNOP'] || 0
    const dnop = groups['DNOP'] || 0
    const mc = rob - tdcf - cv
    const ebt1 = mc - cf
    const ebt2 = ebt1 + rnop - dnop
    return { rob, tdcf, cv, cf, mc, rnop, dnop, ebt1, ebt2 }
  }, [lancamentos])

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
              { label: 'Saldo Inicial', value: fmtBRL(saldoInicial), color: saldoInicial >= 0 ? t.blue : t.red, accent: t.blue, sub: 'Base do período' },
              { label: 'Entradas', value: kpiValues ? fmtK(kpiValues.entradas) : '0', color: t.green, accent: t.green, sub: 'Receitas realizadas' },
              { label: 'Saídas', value: kpiValues ? fmtK(kpiValues.saidas) : '0', color: t.red, accent: t.red, sub: 'Custos + despesas' },
              { label: 'Saldo Final', value: kpiValues ? fmtK(kpiValues.saldoFinal) : '0', color: kpiValues ? (kpiValues.saldoFinal >= 0 ? t.green : t.red) : t.text, accent: t.green, sub: 'Posição atual' },
              { label: 'Resultado (EBT2)', value: dreData ? fmtK(dreData.ebt2) : '0', color: dreData ? (dreData.ebt2 >= 0 ? t.green : t.red) : t.text, accent: t.green, sub: dreData ? `${((dreData.ebt2 / (dreData.rob || 1)) * 100).toFixed(1)}% sobre RoB` : '' },
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
            <DRESidebar rows={dreData ? [
              { name: 'RoB', val: dreData.rob, pct: 100 },
              { name: 'T.D.C.F.', val: dreData.tdcf, pct: dreData.rob ? (dreData.tdcf / dreData.rob) * 100 : 0 },
              { name: 'Rec. Líq.', val: dreData.rob - dreData.tdcf, pct: dreData.rob ? ((dreData.rob - dreData.tdcf) / dreData.rob) * 100 : 0 },
              { name: 'Cust. Var.', val: dreData.cv, pct: dreData.rob ? (dreData.cv / dreData.rob) * 100 : 0 },
              { name: 'Marg. Cont.', val: dreData.mc, pct: dreData.rob ? (dreData.mc / dreData.rob) * 100 : 0 },
              { name: 'Cust. Fixo', val: dreData.cf, pct: dreData.rob ? (dreData.cf / dreData.rob) * 100 : 0 },
              { name: 'EBT1', val: dreData.ebt1, pct: dreData.rob ? (dreData.ebt1 / dreData.rob) * 100 : 0 },
              { name: 'RNOP', val: dreData.rnop, pct: dreData.rob ? (dreData.rnop / dreData.rob) * 100 : 0 },
              { name: 'DNOP', val: dreData.dnop, pct: dreData.rob ? (dreData.dnop / dreData.rob) * 100 : 0 },
              { name: 'EBT2', val: dreData.ebt2, pct: dreData.rob ? (dreData.ebt2 / dreData.rob) * 100 : 0 },
            ] : undefined} />
          </div>

          {/* Footer strip */}
          <div className="grid grid-cols-5 shrink-0" style={{ borderTop: `1px solid ${t.border}` }}>
            {[
              { l: 'Resultado Líquido', v: dreData ? fmtK(dreData.ebt2) : '0', c: dreData && dreData.ebt2 >= 0 ? t.green : t.red, sub: dreData ? `EBT2 = ${((dreData.ebt2 / (dreData.rob || 1)) * 100).toFixed(1)}% RoB` : '' },
              { l: 'Margem Contribuição', v: dreData ? fmtK(dreData.mc) : '0', c: t.blue, sub: dreData ? `${((dreData.mc / (dreData.rob || 1)) * 100).toFixed(1)}% sobre RoB` : '' },
              { l: 'Cobertura CF (EBT1)', v: dreData ? fmtK(dreData.ebt1) : '0', c: dreData && dreData.ebt1 >= 0 ? t.green : t.red, sub: dreData ? `${((dreData.ebt1 / (dreData.rob || 1)) * 100).toFixed(1)}%` : '' },
              { l: 'Receitas NOP', v: dreData ? fmtK(dreData.rnop - dreData.dnop) : '0', c: dreData && (dreData.rnop - dreData.dnop) >= 0 ? t.green : t.red, sub: 'Saldo não operacional' },
              { l: 'Taxa TDCF', v: dreData ? `${((dreData.tdcf / (dreData.rob || 1)) * 100).toFixed(1)}%` : '0%', c: t.amber, sub: 'Sobre receita bruta' },
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
