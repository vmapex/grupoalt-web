'use client'
import { useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { Loader2, ChevronRight } from 'lucide-react'
import { useThemeStore } from '@/store/themeStore'
import type { CaixaLevelData } from '@/lib/mocks/caixaData'
import { calcularDRE } from '@/lib/planoContas'
import { buildQuarterly, buildMonthly, buildWeekly, buildBreakdownByFavorecido, buildBreakdownByCategoria } from '@/lib/caixaBuilder'
import { fmtK, fmtBRL } from '@/lib/formatters'
import { KPIStrip } from '@/components/caixa/KPIStrip'
import { DrillBar } from '@/components/caixa/DrillBar'
import { ChartGrid } from '@/components/caixa/ChartGrid'
import { DRESidebar } from '@/components/caixa/DRESidebar'
import { DetailPanel } from '@/components/caixa/DetailPanel'
import { useExtrato } from '@/hooks/useAPI'
import { useEmpresaId } from '@/hooks/useEmpresaId'
import { useCategoriasMap } from '@/hooks/useCategoriasMap'
import { useDateRangeStore } from '@/store/dateRangeStore'
import { useUnidadeStore } from '@/store/unidadeStore'

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
  const [detailView, setDetailView] = useState<string | null>(null)

  const projetoIds = useUnidadeStore((s) => s.getSelectedCodigos())

  // API calls for KPI strip with date range
  const { data: extratoRaw, loading: loadingExtrato } = useExtrato(empresaId, dt_inicio, dt_fim, projetoIds)

  // Plano de contas dinâmico (com overrides da empresa)
  const { map: categoriaMap } = useCategoriasMap(empresaId)

  const lancamentos = extratoRaw?.lancamentos ?? []
  const saldoInicial = extratoRaw?.saldo_inicial ?? 0

  // Build level data from real extrato
  const EMPTY_LEVEL: CaixaLevelData = { labels: [], RB: [], TD: [], CV: [], CF: [], RN: [], DN: [] }
  const quarterlyData = useMemo(() => lancamentos.length ? buildQuarterly(lancamentos as any, categoriaMap) : EMPTY_LEVEL, [lancamentos, categoriaMap])
  const monthlyData = useMemo(() => lancamentos.length ? buildMonthly(lancamentos as any, categoriaMap) : EMPTY_LEVEL, [lancamentos, categoriaMap])
  const weeklyDataMap = useMemo(() => {
    if (!lancamentos.length) return {}
    const map: Record<string, ReturnType<typeof buildWeekly>> = {}
    for (const label of monthlyData.labels) {
      map[label] = buildWeekly(lancamentos as any, label, categoriaMap)
    }
    return map
  }, [lancamentos, monthlyData, categoriaMap])

  // KPI and DRE values
  const kpiValues = useMemo(() => {
    if (!lancamentos.length) return null
    const entradas = lancamentos.filter((r: any) => r.valor > 0).reduce((s: number, r: any) => s + r.valor, 0)
    const saidas = lancamentos.filter((r: any) => r.valor < 0).reduce((s: number, r: any) => s + Math.abs(r.valor), 0)
    const saldoFinal = saldoInicial + entradas - saidas
    return { entradas, saidas, saldoFinal }
  }, [lancamentos, saldoInicial])

  const dreData = useMemo(() => {
    if (!lancamentos.length) return null
    const dre = calcularDRE(
      (lancamentos as any[]).map((l) => ({ valor: l.valor, categoria: l.categoria, origem: l.origem ?? undefined })),
      categoriaMap,
    )
    return {
      rob: dre.RoB, tdcf: dre.TDCF, cv: dre.CV, cf: dre.CF, mc: dre.MC,
      rnop: dre.RNOP, dnop: dre.DNOP, ebt1: dre.EBT1, ebt2: dre.EBT2,
    }
  }, [lancamentos, categoriaMap])

  // Breakdowns para DetailPanel
  const breakdowns = useMemo(
    () => lancamentos.length ? buildBreakdownByFavorecido(lancamentos as any, categoriaMap) : null,
    [lancamentos, categoriaMap],
  )
  const catBreakdowns = useMemo(
    () => lancamentos.length ? buildBreakdownByCategoria(lancamentos as any, categoriaMap, 'n2') : null,
    [lancamentos, categoriaMap],
  )
  const catBreakdownsN1 = useMemo(
    () => lancamentos.length ? buildBreakdownByCategoria(lancamentos as any, categoriaMap, 'n1') : null,
    [lancamentos, categoriaMap],
  )
  const catBreakdownsN3 = useMemo(
    () => lancamentos.length ? buildBreakdownByCategoria(lancamentos as any, categoriaMap, 'n3') : null,
    [lancamentos, categoriaMap],
  )

  const getLevelData = useCallback(() => {
    if (level === 'quarterly') return quarterlyData
    if (level === 'monthly') return monthlyData
    if (level === 'weekly' && selMonth && weeklyDataMap[selMonth]) return weeklyDataMap[selMonth]
    return monthlyData
  }, [level, selMonth, quarterlyData, monthlyData, weeklyDataMap])

  const d = getLevelData()
  const sum = (arr: number[]) => arr.reduce((s, v) => s + (v || 0), 0)

  const drillUp = () => {
    if (level === 'weekly') { setLevel('monthly'); setSelMonth(null) }
    else if (level === 'monthly') { setLevel('quarterly'); setSelMonth(null) }
  }
  const drillDown = () => {
    if (level === 'quarterly') { setLevel('monthly'); setSelMonth(null) }
    else if (level === 'monthly') {
      const firstMonth = monthlyData.labels[0]
      if (firstMonth) { setSelMonth(firstMonth); setLevel('weekly') }
    }
  }
  const drillIntoMonth = (monthLabel: string) => {
    if (weeklyDataMap[monthLabel]) { setSelMonth(monthLabel); setLevel('weekly') }
  }
  const jumpTo = (lv: Level) => { setLevel(lv); if (lv !== 'weekly') setSelMonth(null) }

  return (
    <div className="flex flex-col min-h-full">
      {/* View toggle bar removed — provided by parent layout (bi/financeiro/layout.tsx) */}

      {/* DASHBOARD VIEW */}
      {detailView && (
        <DetailPanel
          defKey={detailView}
          d={d}
          breakdowns={breakdowns}
          catBreakdowns={catBreakdowns}
          catBreakdownsN1={catBreakdownsN1}
          catBreakdownsN3={catBreakdownsN3}
          onBack={() => setDetailView(null)}
        />
      )}

      {!detailView && (
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
              {/* DRE Mês a Mês — link para visão detalhada em nova página */}
              <div className="flex justify-end mb-2">
                <Link
                  href="/bi/financeiro/caixa/dre-mensal"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] transition-all"
                  style={{
                    background: t.surface,
                    border: `1px solid ${t.green}44`,
                    color: t.green,
                    textDecoration: 'none',
                  }}
                >
                  DRE Mês a Mês
                  <ChevronRight size={12} />
                </Link>
              </div>
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
                dreData={dreData}
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
              { l: 'Saldo NOP', v: dreData ? fmtK(dreData.rnop - dreData.dnop) : '0', c: dreData && (dreData.rnop - dreData.dnop) >= 0 ? t.green : t.red, sub: dreData && dreData.rob ? `${(((dreData.rnop - dreData.dnop) / dreData.rob) * 100).toFixed(1)}% sobre RoB` : 'RNOP − DNOP' },
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

    </div>
  )
}
