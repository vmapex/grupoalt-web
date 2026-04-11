'use client'
import { useMemo } from 'react'
import {
  ComposedChart, Bar, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { ArrowUpRight, Clock, ShieldCheck } from 'lucide-react'
import { useThemeStore } from '@/store/themeStore'
import { useBiViewStore } from '@/store/biViewStore'
import { GlowLine } from '@/components/ui/GlowLine'
import { CustomTooltip } from '@/components/charts/CustomTooltip'
import { fmtK, fmtBRL } from '@/lib/formatters'
import { CATEGORIAS } from '@/lib/planoContas'
import { AnaliseIAView } from '@/components/analise/AnaliseIAView'

import { useExtrato, useCP, useCR, useConcilResumo, useFluxoCaixa } from '@/hooks/useAPI'
import { useEmpresaId } from '@/hooks/useEmpresaId'
import { useDateRangeStore } from '@/store/dateRangeStore'
import { transformCPCR } from '@/lib/transformers'

function isoToDMY(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

/* ── KPI card data ─────────────────────────── */
interface KPICardData {
  label: string
  value: string
  color: string
  dim: string
  route: string
}

/* ── Waterfall item ────────────────────────── */
interface WaterfallItem {
  name: string
  value: number
  color: string
  pctOfMax: number
}

export default function FinanceiroPage() {
  const biView = useBiViewStore((s) => s.view)
  if (biView === 'analise') return <AnaliseIAView />
  return <DashboardExecutivo />
}

function DashboardExecutivo() {
  const t = useThemeStore((s) => s.tokens)
  const empresaId = useEmpresaId()
  const dateFrom = useDateRangeStore((s) => s.from)
  const dateTo = useDateRangeStore((s) => s.to)
  const dt_inicio = isoToDMY(dateFrom)
  const dt_fim = isoToDMY(dateTo)

  // API calls with date range
  const { data: extratoResponse } = useExtrato(empresaId, dt_inicio, dt_fim)
  const { data: cpRaw } = useCP(empresaId, { registros: 500 })
  const { data: crRaw } = useCR(empresaId, { registros: 500 })
  const { data: concilResumoAPI } = useConcilResumo(empresaId)
  const { data: fluxoAPI } = useFluxoCaixa(empresaId, dt_fim)

  // Transform API or fallback
  const cpData = useMemo(() => (cpRaw?.dados ? transformCPCR(cpRaw.dados, 'CP') : []), [cpRaw])
  const crData = useMemo(() => (crRaw?.dados ? transformCPCR(crRaw.dados, 'CR') : []), [crRaw])
  const lancamentos = extratoResponse?.lancamentos ?? []

  /* ── Computed values ──────────────────────── */
  const saldoCaixa = extratoResponse?.saldo_atual ?? 0

  // Calcular DRE real do extrato usando planoContas
  const dreData = useMemo(() => {
    if (!lancamentos.length) return null
    const groups: Record<string, number> = {}
    for (const l of lancamentos) {
      const cat = CATEGORIAS[l.categoria || '']
      if (!cat) continue
      const grupo = cat.grupoDRE
      const val = Math.abs(l.valor)
      groups[grupo] = (groups[grupo] || 0) + val
    }
    const rob = groups['RoB'] || 0
    const tdcf = groups['TDCF'] || 0
    const cv = groups['CV'] || 0
    const cf = groups['CF'] || 0
    const rnop = groups['RNOP'] || 0
    const dnop = groups['DNOP'] || 0
    const ebt1 = rob - tdcf - cv - cf
    const ebt2 = ebt1 + rnop - dnop
    return { rob, tdcf, cv, cf, rnop, dnop, ebt1, ebt2 }
  }, [lancamentos])

  const ebt2 = dreData?.ebt2 ?? 0

  const cpAtrasado = useMemo(
    () => cpData.filter((c) => c.status === 'ATRASADO').reduce((s, c) => s + c.valor, 0),
    [cpData],
  )

  const crPrevisto = useMemo(
    () => crData.filter((c) => c.status === 'A VENCER' || c.status === 'A RECEBER').reduce((s, c) => s + c.valor, 0),
    [crData],
  )

  const concilPct = concilResumoAPI?.percentual_conciliado ?? 0
  const fluxo30d = fluxoAPI?.kpis?.saldo_projetado ?? 0

  const kpis: KPICardData[] = useMemo(() => [
    { label: 'Saldo de Caixa', value: `R$ ${fmtK(saldoCaixa)}`, color: t.blue, dim: t.blueDim, route: '/bi/financeiro/extrato' },
    { label: 'Resultado (EBT2)', value: `R$ ${fmtK(ebt2)}`, color: ebt2 >= 0 ? t.green : t.red, dim: ebt2 >= 0 ? t.greenDim : t.redDim, route: '/bi/financeiro/caixa' },
    { label: 'CP Atrasado', value: `R$ ${fmtK(cpAtrasado)}`, color: cpAtrasado > 0 ? t.red : t.green, dim: cpAtrasado > 0 ? t.redDim : t.greenDim, route: '/bi/financeiro/cp-cr' },
    { label: 'CR Previsto', value: `R$ ${fmtK(crPrevisto)}`, color: t.green, dim: t.greenDim, route: '/bi/financeiro/cp-cr' },
    { label: 'Conciliacao', value: `${concilPct}%`, color: concilPct >= 80 ? t.green : t.amber, dim: concilPct >= 80 ? t.greenDim : t.amberDim, route: '/bi/financeiro/conciliacao' },
    { label: 'Fluxo 30d', value: `R$ ${fmtK(fluxo30d)}`, color: fluxo30d >= 0 ? t.green : t.red, dim: fluxo30d >= 0 ? t.greenDim : t.redDim, route: '/bi/financeiro/fluxo' },
  ], [t, saldoCaixa, ebt2, cpAtrasado, crPrevisto])

  /* ── Receita vs Custos chart data (from extrato) ──── */
  const receitaCustosData = useMemo(() => {
    if (!lancamentos.length) return []
    const months: Record<string, { receita: number; custos: number }> = {}
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    for (const l of lancamentos) {
      const d = l.data_lancamento
      if (!d) continue
      const [dd, mm, yy] = d.split('/')
      const key = `${monthNames[Number(mm) - 1]}/${yy?.slice(2)}`
      if (!months[key]) months[key] = { receita: 0, custos: 0 }
      if (l.valor > 0) months[key].receita += l.valor
      else months[key].custos += Math.abs(l.valor)
    }
    return Object.entries(months)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, v]) => ({ name, receita: Math.round(v.receita), custos: Math.round(v.custos) }))
  }, [lancamentos])

  /* ── Waterfall mini (from real DRE) ──────── */
  const waterfallItems: WaterfallItem[] = useMemo(() => {
    const d = dreData ?? { rob: 0, tdcf: 0, cv: 0, cf: 0, rnop: 0, dnop: 0, ebt1: 0, ebt2: 0 }
    const custos = d.tdcf + d.cv + d.cf
    const nop = d.rnop - d.dnop
    const maxVal = Math.max(d.rob, custos, Math.abs(d.ebt1), Math.abs(nop), Math.abs(d.ebt2), 1)
    return [
      { name: 'RoB', value: d.rob, color: t.blue, pctOfMax: (d.rob / maxVal) * 100 },
      { name: 'Custos', value: -custos, color: t.red, pctOfMax: (custos / maxVal) * 100 },
      { name: 'EBT1', value: d.ebt1, color: d.ebt1 >= 0 ? t.green : t.red, pctOfMax: (Math.abs(d.ebt1) / maxVal) * 100 },
      { name: 'NOP', value: nop, color: nop >= 0 ? t.green : t.purple, pctOfMax: (Math.abs(nop) / maxVal) * 100 },
      { name: 'EBT2', value: d.ebt2, color: d.ebt2 >= 0 ? t.green : t.red, pctOfMax: (Math.abs(d.ebt2) / maxVal) * 100 },
    ]
  }, [t, dreData])

  /* ── Fluxo projetado 30d (from API or CP/CR) ── */
  const fluxoData = useMemo(() => {
    if (fluxoAPI?.diario?.length) {
      return fluxoAPI.diario.slice(0, 30).map((d, i) => {
        const saldo = Math.round(d.saldo_acumulado)
        return {
          dia: `D${i + 1}`,
          saldo,
          saldoPos: saldo >= 0 ? saldo : 0,
          saldoNeg: saldo < 0 ? saldo : 0,
        }
      })
    }
    // Fallback: simple projection from saldo + CP/CR schedule
    let saldo = saldoCaixa
    const cpOpen = cpData.filter((c) => c.status === 'A VENCER' || c.status === 'ATRASADO')
    const crOpen = crData.filter((c) => c.status === 'A VENCER' || c.status === 'A RECEBER')
    const avgDailyCR = crOpen.reduce((s, r) => s + r.valor, 0) / 30
    const avgDailyCP = cpOpen.reduce((s, r) => s + r.valor, 0) / 30
    return Array.from({ length: 30 }, (_, i) => {
      saldo += avgDailyCR - avgDailyCP
      const rounded = Math.round(saldo)
      return {
        dia: `D${i + 1}`,
        saldo: rounded,
        saldoPos: rounded >= 0 ? rounded : 0,
        saldoNeg: rounded < 0 ? rounded : 0,
      }
    })
  }, [saldoCaixa, fluxoAPI, cpData, crData])

  /* ── Aging CP ──────────────────────────────── */
  const agingData = useMemo(() => {
    const today = new Date()
    const buckets = [
      { label: '0-15d', min: 0, max: 15, total: 0 },
      { label: '16-30d', min: 16, max: 30, total: 0 },
      { label: '31-60d', min: 31, max: 60, total: 0 },
      { label: '60+d', min: 61, max: 9999, total: 0 },
    ]
    cpData.filter((c) => c.status === 'A VENCER' || c.status === 'ATRASADO').forEach((c) => {
      const [d, m, y] = c.vcto.split('/')
      const vcto = new Date(Number(y), Number(m) - 1, Number(d))
      const dias = Math.max(0, Math.round((vcto.getTime() - today.getTime()) / 86400000))
      const bucket = buckets.find((b) => dias >= b.min && dias <= b.max)
      if (bucket) bucket.total += c.valor
    })
    const maxBucket = Math.max(...buckets.map((b) => b.total), 1)
    return buckets.map((b) => ({ ...b, pct: (b.total / maxBucket) * 100 }))
  }, [cpData])

  /* ── Top Clientes (CR) ─────────────────────── */
  const topClientes = useMemo(() => {
    const sorted = [...crData].sort((a, b) => b.valor - a.valor).slice(0, 5)
    const maxVal = sorted[0]?.valor ?? 1
    return sorted.map((c) => ({ nome: c.fav, valor: c.valor, pct: (c.valor / maxVal) * 100 }))
  }, [crData])

  /* ── Ultimas movimentacoes ─────────────────── */
  const ultimasMov = useMemo(() => {
    if (lancamentos.length) {
      const sorted = [...lancamentos].sort((a, b) => {
        const dA = (a as any).data_lancamento || ''
        const dB = (b as any).data_lancamento || ''
        // Parse DD/MM/YYYY → comparable
        const pA = dA.split('/').reverse().join('')
        const pB = dB.split('/').reverse().join('')
        return pB.localeCompare(pA)
      })
      return sorted.slice(0, 5).map((l) => ({
        data_lancamento: (l as any).data_lancamento || '',
        favorecido: (l as any).favorecido || (l as any).descricao || '',
        valor: (l as any).valor || 0,
        banco: (l as any).banco || '',
      }))
    }
    return []
  }, [lancamentos])

  /* ── Progress ring vars ────────────────────── */
  const ringR = 45
  const ringC = 2 * Math.PI * ringR

  /* ── SLA data ──────────────────────────────── */
  const slaStatus = useMemo(() => ({
    dentroSLA: concilResumoAPI ? Math.round(concilResumoAPI.percentual_conciliado) : 0,
    foraSLA: concilResumoAPI?.total_divergencias ?? 0,
    ultimoConcil: '',
    streak: concilResumoAPI?.dias_sem_conciliar ?? 0,
  }), [concilResumoAPI])

  return (
    <div className="flex flex-col gap-5 p-5 min-h-full">
      {/* ── KPI Strip ────────────────────────── */}
      <div className="grid grid-cols-6 gap-3">
        {kpis.map((kpi) => (
          <a
            key={kpi.label}
            href={kpi.route}
            className="relative rounded-xl p-4 transition-all duration-200 no-underline group"
            style={{
              background: t.surface,
              border: `1px solid ${t.border}`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = `${kpi.color}44`
              e.currentTarget.style.background = t.surfaceHover
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = t.border
              e.currentTarget.style.background = t.surface
            }}
          >
            <GlowLine color={kpi.color} />
            <div
              className="text-[9px] uppercase tracking-wider mb-2 font-medium"
              style={{ color: t.muted }}
            >
              {kpi.label}
            </div>
            <div
              className="text-xl font-mono font-semibold mb-2"
              style={{ color: kpi.color, fontFamily: "'DM Mono', monospace" }}
            >
              {kpi.value}
            </div>
            {/* Value indicator dot */}
            <div className="w-1 h-1 rounded-full mt-1" style={{ background: kpi.color, opacity: 0.5 }} />
          </a>
        ))}
      </div>

      {/* ── Row 1: Receita vs Custos + Waterfall ── */}
      <div className="grid gap-3" style={{ gridTemplateColumns: '2fr 1fr' }}>
        {/* Receita vs Custos */}
        <div
          className="relative rounded-xl p-4"
          style={{ background: t.surface, border: `1px solid ${t.border}` }}
        >
          <GlowLine color={t.blue} />
          <div className="text-[11px] font-semibold mb-3" style={{ color: t.textSec }}>
            Receita vs Custos
          </div>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={receitaCustosData} barGap={4}>
                <CartesianGrid vertical={false} stroke={t.gridLine} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 9, fill: t.muted, fontFamily: "'DM Mono', monospace" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: t.muted, fontFamily: "'DM Mono', monospace" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => fmtK(v)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="receita" name="Receita" fill={t.blue} radius={[3, 3, 0, 0]} barSize={28} />
                <Bar dataKey="custos" name="Custos" fill={t.red} radius={[3, 3, 0, 0]} barSize={28} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Waterfall mini */}
        <div
          className="relative rounded-xl p-4"
          style={{ background: t.surface, border: `1px solid ${t.border}` }}
        >
          <GlowLine color={t.green} />
          <div className="text-[11px] font-semibold mb-3" style={{ color: t.textSec }}>
            Resultado Waterfall
          </div>
          <div className="flex items-end justify-between gap-2" style={{ height: 200 }}>
            {waterfallItems.map((item) => (
              <div key={item.name} className="flex flex-col items-center flex-1 gap-1.5" style={{ height: '100%', justifyContent: 'flex-end' }}>
                <div
                  className="text-[9px] font-mono font-medium"
                  style={{ color: item.color }}
                >
                  {fmtK(item.value)}
                </div>
                <div
                  className="w-full rounded-t-md transition-all"
                  style={{
                    height: `${Math.max(item.pctOfMax, 4)}%`,
                    background: `${item.color}33`,
                    border: `1px solid ${item.color}66`,
                    borderBottom: 'none',
                    minHeight: 8,
                  }}
                />
                <div
                  className="text-[8px] font-medium text-center"
                  style={{ color: t.muted }}
                >
                  {item.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Row 2: Fluxo Projetado + Conciliacao ring ── */}
      <div className="grid gap-3" style={{ gridTemplateColumns: '2fr 1fr' }}>
        {/* Fluxo Projetado 30d */}
        <div
          className="relative rounded-xl p-4"
          style={{ background: t.surface, border: `1px solid ${t.border}` }}
        >
          <GlowLine color={fluxo30d >= 0 ? t.green : t.red} />
          <div className="text-[11px] font-semibold mb-3" style={{ color: t.textSec }}>
            Fluxo Projetado 30d
          </div>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={fluxoData}>
                <defs>
                  <linearGradient id="fluxoGradGreen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={t.green} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={t.green} stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="fluxoGradRed" x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0%" stopColor={t.red} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={t.red} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke={t.gridLine} />
                <XAxis
                  dataKey="dia"
                  tick={{ fontSize: 8, fill: t.muted, fontFamily: "'DM Mono', monospace" }}
                  axisLine={false}
                  tickLine={false}
                  interval={4}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: t.muted, fontFamily: "'DM Mono', monospace" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => fmtK(v)}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={0} stroke={t.red} strokeDasharray="4 4" strokeOpacity={0.5} />
                <Area
                  type="monotone"
                  dataKey="saldoPos"
                  name="Saldo +"
                  stroke={t.green}
                  strokeWidth={1.5}
                  fill="url(#fluxoGradGreen)"
                  connectNulls={false}
                />
                <Area
                  type="monotone"
                  dataKey="saldoNeg"
                  name="Saldo −"
                  stroke={t.red}
                  strokeWidth={1.5}
                  fill="url(#fluxoGradRed)"
                  connectNulls={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Conciliacao Progress Ring */}
        <div
          className="relative rounded-xl p-4 flex flex-col items-center justify-center"
          style={{ background: t.surface, border: `1px solid ${t.border}` }}
        >
          <GlowLine color={t.green} />
          <div className="text-[11px] font-semibold mb-4 self-start" style={{ color: t.textSec }}>
            Conciliacao
          </div>
          <svg width={120} height={120} viewBox="0 0 100 100">
            <circle
              cx={50} cy={50} r={ringR}
              fill="none"
              stroke={`${t.text}0A`}
              strokeWidth={6}
            />
            <circle
              cx={50} cy={50} r={ringR}
              fill="none"
              stroke={t.green}
              strokeWidth={6}
              strokeDasharray={ringC}
              strokeDashoffset={ringC * (1 - concilPct / 100)}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
            />
            <text
              x={50} y={50}
              textAnchor="middle" dy="0.35em"
              fill={t.text}
              fontSize={18}
              fontFamily="DM Mono"
            >
              {concilPct}%
            </text>
          </svg>
          <div className="mt-3 text-[10px] text-center" style={{ color: t.muted }}>
            Dias em conformidade
          </div>
          <div
            className="text-xs font-mono font-semibold mt-1"
            style={{ color: t.green }}
          >
            {slaStatus.dentroSLA} dias
          </div>
        </div>
      </div>

      {/* ── Row 3: Aging CP + Top Clientes + SLA Status ── */}
      <div className="grid grid-cols-3 gap-3">
        {/* Aging CP */}
        <div
          className="relative rounded-xl p-4"
          style={{ background: t.surface, border: `1px solid ${t.border}` }}
        >
          <GlowLine color={t.amber} />
          <div className="text-[11px] font-semibold mb-3" style={{ color: t.textSec }}>
            Aging CP
          </div>
          <div className="flex flex-col gap-2.5">
            {agingData.map((bucket) => (
              <div key={bucket.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-mono" style={{ color: t.muted }}>
                    {bucket.label}
                  </span>
                  <span className="text-[10px] font-mono font-medium" style={{ color: t.text }}>
                    {fmtK(bucket.total)}
                  </span>
                </div>
                <div
                  className="h-2 rounded-full overflow-hidden"
                  style={{ background: `${t.text}08` }}
                >
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${bucket.pct}%`,
                      background: bucket.label === '60+d' ? t.red
                        : bucket.label === '31-60d' ? t.amber
                        : t.blue,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Clientes */}
        <div
          className="relative rounded-xl p-4"
          style={{ background: t.surface, border: `1px solid ${t.border}` }}
        >
          <GlowLine color={t.blue} />
          <div className="text-[11px] font-semibold mb-3" style={{ color: t.textSec }}>
            Top Clientes (CR)
          </div>
          <div className="flex flex-col gap-2.5">
            {topClientes.map((c, i) => (
              <div key={c.nome}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] truncate mr-2" style={{ color: t.textSec }}>
                    <span className="font-mono" style={{ color: t.muted }}>{i + 1}.</span>{' '}
                    {c.nome}
                  </span>
                  <span className="text-[10px] font-mono font-medium shrink-0" style={{ color: t.text }}>
                    {fmtK(c.valor)}
                  </span>
                </div>
                <div
                  className="h-1.5 rounded-full overflow-hidden"
                  style={{ background: `${t.text}08` }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${c.pct}%`, background: t.blue }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SLA Status */}
        <div
          className="relative rounded-xl p-4"
          style={{ background: t.surface, border: `1px solid ${t.border}` }}
        >
          <GlowLine color={t.green} />
          <div className="text-[11px] font-semibold mb-3" style={{ color: t.textSec }}>
            SLA Status
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: t.greenDim }}
              >
                <ShieldCheck size={16} style={{ color: t.green }} />
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-wider" style={{ color: t.muted }}>
                  Dentro SLA
                </div>
                <div className="text-sm font-mono font-semibold" style={{ color: t.green }}>
                  {slaStatus.dentroSLA} dias
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: slaStatus.foraSLA > 0 ? t.redDim : t.greenDim }}
              >
                <Clock size={16} style={{ color: slaStatus.foraSLA > 0 ? t.red : t.green }} />
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-wider" style={{ color: t.muted }}>
                  Fora SLA
                </div>
                <div
                  className="text-sm font-mono font-semibold"
                  style={{ color: slaStatus.foraSLA > 0 ? t.red : t.green }}
                >
                  {slaStatus.foraSLA} dias
                </div>
              </div>
            </div>
            <div
              className="mt-1 p-2.5 rounded-lg"
              style={{ background: `${t.text}04`, border: `1px solid ${t.border}` }}
            >
              <div className="text-[9px]" style={{ color: t.muted }}>
                Ultimo conciliado
              </div>
              <div className="text-[11px] font-mono font-medium mt-0.5" style={{ color: t.text }}>
                {slaStatus.ultimoConcil}
              </div>
            </div>
            <div
              className="p-2.5 rounded-lg"
              style={{ background: `${t.text}04`, border: `1px solid ${t.border}` }}
            >
              <div className="text-[9px]" style={{ color: t.muted }}>
                Regra SLA
              </div>
              <div className="text-[11px] font-mono font-medium mt-0.5" style={{ color: t.textSec }}>
                D+1 util
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Ultimas Movimentacoes ─────────────── */}
      <div
        className="relative rounded-xl p-4"
        style={{ background: t.surface, border: `1px solid ${t.border}` }}
      >
        <GlowLine color={t.blue} />
        <div className="flex items-center justify-between mb-3">
          <div className="text-[11px] font-semibold" style={{ color: t.textSec }}>
            Ultimas Movimentacoes
          </div>
          <a
            href="/portal/extrato"
            className="flex items-center gap-1 text-[10px] no-underline transition-colors"
            style={{ color: t.blue }}
          >
            Ver extrato <ArrowUpRight size={10} />
          </a>
        </div>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {['Data', 'Descricao', 'Banco', 'Valor'].map((col) => (
                <th
                  key={col}
                  className="text-left text-[9px] uppercase tracking-wider font-medium pb-2"
                  style={{
                    color: t.muted,
                    borderBottom: `1px solid ${t.border}`,
                    fontFamily: "'DM Mono', monospace",
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ultimasMov.map((row, i) => (
              <tr
                key={i}
                className="transition-colors"
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = t.surfaceHover
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                <td
                  className="py-2 text-[10px] font-mono"
                  style={{ color: t.muted, borderBottom: `1px solid ${t.border}` }}
                >
                  {row.data_lancamento}
                </td>
                <td
                  className="py-2 text-[11px]"
                  style={{ color: t.textSec, borderBottom: `1px solid ${t.border}` }}
                >
                  {row.favorecido}
                </td>
                <td
                  className="py-2 text-[10px]"
                  style={{ color: t.muted, borderBottom: `1px solid ${t.border}` }}
                >
                  {row.banco || ''}
                </td>
                <td
                  className="py-2 text-[11px] font-mono font-medium text-right"
                  style={{
                    color: row.valor >= 0 ? t.green : t.red,
                    borderBottom: `1px solid ${t.border}`,
                  }}
                >
                  {row.valor >= 0 ? '+' : ''}{fmtBRL(row.valor)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
