'use client'
import { useMemo } from 'react'
import {
  ComposedChart, Bar, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import {
  TrendingUp, TrendingDown, ArrowUpRight, Clock, ShieldCheck,
} from 'lucide-react'
import { useThemeStore } from '@/store/themeStore'
import { GlowLine } from '@/components/ui/GlowLine'
import { CustomTooltip } from '@/components/charts/CustomTooltip'
import { fmtK, fmtBRL } from '@/lib/formatters'
import { CAIXA_DATA, DRE_ROWS, getDREColor } from '@/lib/mocks/caixaData'
import { mockExtrato, mockContas } from '@/lib/mocks/extratoData'
import { mockCPFull, mockCRFull } from '@/lib/mocks/cpcrData'

/* ── KPI card data ─────────────────────────── */
interface KPICardData {
  label: string
  value: string
  color: string
  dim: string
  trend: number // percentage
  trendUp: boolean
  route: string
}

/* ── Waterfall item ────────────────────────── */
interface WaterfallItem {
  name: string
  value: number
  color: string
  pctOfMax: number
}

export default function DashboardExecutivo() {
  const t = useThemeStore((s) => s.tokens)

  /* ── Computed values ──────────────────────── */
  const saldoCaixa = useMemo(
    () => mockContas.reduce((s, c) => s + c.saldo, 0),
    [],
  )

  const ebt2 = useMemo(() => DRE_ROWS.find((r) => r.name === 'EBT2')?.val ?? 0, [])

  const cpAtrasado = useMemo(
    () => mockCPFull.filter((c) => c.status === 'ATRASADO').reduce((s, c) => s + c.valor, 0),
    [],
  )

  const crPrevisto = useMemo(
    () => mockCRFull.filter((c) => c.status === 'A RECEBER').reduce((s, c) => s + c.valor, 0),
    [],
  )

  const concilPct = 87
  const fluxo30d = 38400

  const kpis: KPICardData[] = useMemo(() => [
    { label: 'Saldo de Caixa', value: `R$ ${fmtK(saldoCaixa)}`, color: t.blue, dim: t.blueDim, trend: 4.2, trendUp: true, route: '/portal/extrato' },
    { label: 'Resultado (EBT2)', value: `R$ ${fmtK(ebt2)}`, color: ebt2 >= 0 ? t.green : t.red, dim: ebt2 >= 0 ? t.greenDim : t.redDim, trend: 2.8, trendUp: true, route: '/portal/caixa' },
    { label: 'CP Atrasado', value: `R$ ${fmtK(cpAtrasado)}`, color: cpAtrasado > 0 ? t.red : t.green, dim: cpAtrasado > 0 ? t.redDim : t.greenDim, trend: 12.3, trendUp: false, route: '/portal/cp-cr' },
    { label: 'CR Previsto', value: `R$ ${fmtK(crPrevisto)}`, color: t.green, dim: t.greenDim, trend: 8.1, trendUp: true, route: '/portal/cp-cr' },
    { label: 'Conciliacao', value: `${concilPct}%`, color: t.green, dim: t.greenDim, trend: 3.0, trendUp: true, route: '/portal/conciliacao' },
    { label: 'Fluxo 30d', value: `+R$ ${fmtK(fluxo30d)}`, color: t.green, dim: t.greenDim, trend: 5.4, trendUp: true, route: '/portal/fluxo' },
  ], [t, saldoCaixa, ebt2, cpAtrasado, crPrevisto])

  /* ── Receita vs Custos chart data ──────────── */
  const receitaCustosData = useMemo(() => {
    const m = CAIXA_DATA.monthly
    return m.labels.map((label, i) => ({
      name: label,
      receita: m.RB[i],
      custos: m.CV[i] + m.CF[i] + m.TD[i],
    }))
  }, [])

  /* ── Waterfall mini ────────────────────────── */
  const waterfallItems: WaterfallItem[] = useMemo(() => {
    const rob = DRE_ROWS.find((r) => r.name === 'RoB')?.val ?? 0
    const custos = (DRE_ROWS.find((r) => r.name === 'Cust. Var.')?.val ?? 0)
      + (DRE_ROWS.find((r) => r.name === 'Cust. Fixo')?.val ?? 0)
      + (DRE_ROWS.find((r) => r.name === 'T.D.C.F.')?.val ?? 0)
    const ebt1 = DRE_ROWS.find((r) => r.name === 'EBT1')?.val ?? 0
    const nop = (DRE_ROWS.find((r) => r.name === 'RNOP')?.val ?? 0)
      - (DRE_ROWS.find((r) => r.name === 'DNOP')?.val ?? 0)
    const ebt2v = DRE_ROWS.find((r) => r.name === 'EBT2')?.val ?? 0
    const maxVal = Math.max(rob, Math.abs(custos), Math.abs(ebt1), Math.abs(nop), Math.abs(ebt2v))
    return [
      { name: 'RoB', value: rob, color: t.blue, pctOfMax: (rob / maxVal) * 100 },
      { name: 'Custos', value: -custos, color: t.red, pctOfMax: (custos / maxVal) * 100 },
      { name: 'EBT1', value: ebt1, color: ebt1 >= 0 ? t.green : t.red, pctOfMax: (Math.abs(ebt1) / maxVal) * 100 },
      { name: 'NOP', value: nop, color: nop >= 0 ? t.green : t.purple, pctOfMax: (Math.abs(nop) / maxVal) * 100 },
      { name: 'EBT2', value: ebt2v, color: ebt2v >= 0 ? t.green : t.red, pctOfMax: (Math.abs(ebt2v) / maxVal) * 100 },
    ]
  }, [t])

  /* ── Fluxo projetado 30d ───────────────────── */
  const fluxoData = useMemo(() => {
    let saldo = saldoCaixa
    return Array.from({ length: 30 }, (_, i) => {
      // deterministic seed-based variation
      const seed = ((i + 1) * 7919) % 100
      const delta = seed < 50 ? -1200 + seed * 80 : 800 + (seed - 50) * 60
      saldo += delta
      return { dia: `D${i + 1}`, saldo: Math.round(saldo) }
    })
  }, [saldoCaixa])

  /* ── Aging CP ──────────────────────────────── */
  const agingData = useMemo(() => {
    const today = new Date()
    const buckets = [
      { label: '0-15d', min: 0, max: 15, total: 0 },
      { label: '16-30d', min: 16, max: 30, total: 0 },
      { label: '31-60d', min: 31, max: 60, total: 0 },
      { label: '60+d', min: 61, max: 9999, total: 0 },
    ]
    mockCPFull.filter((c) => c.status === 'A VENCER' || c.status === 'ATRASADO').forEach((c) => {
      const [d, m, y] = c.vcto.split('/')
      const vcto = new Date(Number(y), Number(m) - 1, Number(d))
      const dias = Math.max(0, Math.round((vcto.getTime() - today.getTime()) / 86400000))
      const bucket = buckets.find((b) => dias >= b.min && dias <= b.max)
      if (bucket) bucket.total += c.valor
    })
    const maxBucket = Math.max(...buckets.map((b) => b.total), 1)
    return buckets.map((b) => ({ ...b, pct: (b.total / maxBucket) * 100 }))
  }, [])

  /* ── Top Clientes (CR) ─────────────────────── */
  const topClientes = useMemo(() => {
    const sorted = [...mockCRFull].sort((a, b) => b.valor - a.valor).slice(0, 5)
    const maxVal = sorted[0]?.valor ?? 1
    return sorted.map((c) => ({ nome: c.fav, valor: c.valor, pct: (c.valor / maxVal) * 100 }))
  }, [])

  /* ── Ultimas movimentacoes ─────────────────── */
  const ultimasMov = useMemo(() => mockExtrato.slice(0, 5), [])

  /* ── Progress ring vars ────────────────────── */
  const ringR = 45
  const ringC = 2 * Math.PI * ringR

  /* ── SLA data ──────────────────────────────── */
  const slaStatus = useMemo(() => ({
    dentroSLA: 42,
    foraSLA: 3,
    ultimoConcil: '27/03/2026',
    streak: 0,
  }), [])

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
            <div className="flex items-center gap-1">
              {kpi.trendUp ? (
                <TrendingUp size={11} style={{ color: t.green }} />
              ) : (
                <TrendingDown size={11} style={{ color: t.red }} />
              )}
              <span
                className="text-[10px] font-mono font-medium"
                style={{ color: kpi.trendUp ? t.green : t.red }}
              >
                {kpi.trendUp ? '\u25B2' : '\u25BC'} {kpi.trend.toFixed(1).replace('.', ',')}%
              </span>
            </div>
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
          <GlowLine color={t.green} />
          <div className="text-[11px] font-semibold mb-3" style={{ color: t.textSec }}>
            Fluxo Projetado 30d
          </div>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={fluxoData}>
                <defs>
                  <linearGradient id="fluxoGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={t.green} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={t.green} stopOpacity={0.02} />
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
                  dataKey="saldo"
                  name="Saldo"
                  stroke={t.green}
                  strokeWidth={1.5}
                  fill="url(#fluxoGrad)"
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
                  {row.data}
                </td>
                <td
                  className="py-2 text-[11px]"
                  style={{ color: t.textSec, borderBottom: `1px solid ${t.border}` }}
                >
                  {row.descricao}
                </td>
                <td
                  className="py-2 text-[10px]"
                  style={{ color: t.muted, borderBottom: `1px solid ${t.border}` }}
                >
                  {row.banco}
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
