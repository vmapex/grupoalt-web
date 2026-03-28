'use client'
import { useState, useMemo } from 'react'
import {
  ComposedChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, LabelList,
} from 'recharts'
import { Calendar, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { useThemeStore } from '@/store/themeStore'
import { GlowLine } from '@/components/ui/GlowLine'
import { KPICard } from '@/components/ui/KPICard'
import { BarLabel } from '@/components/charts/BarLabel'
import { CustomTooltip } from '@/components/charts/CustomTooltip'
import { fmtK, fmtBRL } from '@/lib/formatters'
import { mockContas } from '@/lib/mocks/extratoData'
import { mockCPFull, mockCRFull } from '@/lib/mocks/cpcrData'

const mockFluxo = [
  { mes: 'Dez/25', ent: 358700, sai: 193100 },
  { mes: 'Jan/26', ent: 285400, sai: 201800 },
  { mes: 'Fev/26', ent: 312600, sai: 188400 },
  { mes: 'Mar/26', ent: 298100, sai: 195600 },
]

const seed = (i: number) => Math.abs(Math.sin(i * 9301 + 49297) * 233280) % 1

const HZ_OPTIONS = [
  { label: '+7d', days: 7 },
  { label: '+30d', days: 30 },
  { label: '+60d', days: 60 },
  { label: '+90d', days: 90 },
] as const

export default function PageFluxo() {
  const t = useThemeStore((s) => s.tokens)
  const [hz, setHz] = useState(30)

  const saldoAtual = useMemo(
    () => mockContas.reduce((s, c) => s + c.saldo, 0),
    [],
  )

  const totalEnt = useMemo(
    () => mockCRFull.reduce((s, r) => s + r.valor, 0),
    [],
  )

  const totalSai = useMemo(
    () => mockCPFull.reduce((s, r) => s + r.valor, 0),
    [],
  )

  const fluxoDiario = useMemo(() => {
    const data: { dia: string; saldo: number; saldoPos: number | null; saldoNeg: number | null }[] = []
    let saldo = saldoAtual
    const base = new Date(2025, 10, 27) // 27/Nov/2025
    for (let i = 0; i < hz; i++) {
      const d = new Date(base)
      d.setDate(d.getDate() + i)
      const label = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
      const entDia = seed(i * 2) * 18000 + 2000
      const saiDia = seed(i * 2 + 1) * 15000 + 3000
      saldo += entDia - saiDia
      const rounded = Math.round(saldo)
      data.push({
        dia: label,
        saldo: rounded,
        saldoPos: rounded >= 0 ? rounded : 0,
        saldoNeg: rounded < 0 ? rounded : 0,
      })
    }
    return data
  }, [hz, saldoAtual])

  const saldoProjetado = fluxoDiario.length > 0 ? fluxoDiario[fluxoDiario.length - 1].saldo : saldoAtual
  const cobertura = totalSai > 0 ? (saldoAtual + totalEnt) / totalSai : 0

  const topEntradas = useMemo(
    () => [...mockCRFull].sort((a, b) => b.valor - a.valor).slice(0, 4),
    [],
  )

  const topSaidas = useMemo(
    () => [...mockCPFull].sort((a, b) => b.valor - a.valor).slice(0, 4),
    [],
  )

  return (
    <div className="flex flex-col min-h-full">
      {/* Horizon Bar */}
      <div
        className="flex items-center gap-3 px-5 py-2.5 shrink-0"
        style={{ borderBottom: `1px solid ${t.border}`, background: `${t.bg}88` }}
      >
        <Calendar size={13} style={{ color: t.muted }} />
        <span className="text-[10px] uppercase tracking-wider" style={{ color: t.muted }}>
          Horizonte
        </span>
        {HZ_OPTIONS.map((opt) => (
          <button
            key={opt.days}
            onClick={() => setHz(opt.days)}
            className="px-3.5 py-1.5 rounded-lg text-[10px] cursor-pointer transition-all"
            style={{
              border: `1px solid ${hz === opt.days ? `${t.blue}55` : t.border}`,
              background: hz === opt.days ? t.blueDim : 'transparent',
              color: hz === opt.days ? t.blue : t.muted,
              fontWeight: hz === opt.days ? 600 : 400,
              fontFamily: 'inherit',
            }}
          >
            {opt.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: t.green }}
          />
          <span className="text-[10px]" style={{ color: t.muted }}>
            Hoje: 27/11/2025
          </span>
          <span
            className="text-[10px] font-mono ml-2 px-2 py-0.5 rounded"
            style={{ background: t.blueDim, color: t.blue }}
          >
            {hz} dias
          </span>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-5 shrink-0" style={{ borderBottom: `1px solid ${t.border}` }}>
        <KPICard
          label="Saldo Atual"
          value={`R$ ${fmtK(saldoAtual)}`}
          color={t.blue}
          accent={t.blue}
        />
        <KPICard
          label="Entradas Prev."
          value={`R$ ${fmtK(totalEnt)}`}
          color={t.green}
          accent={t.green}
        />
        <KPICard
          label="Saidas Prev."
          value={`R$ ${fmtK(totalSai)}`}
          color={t.red}
          accent={t.red}
        />
        <KPICard
          label="Saldo Projetado"
          value={`R$ ${fmtK(saldoProjetado)}`}
          color={saldoProjetado >= 0 ? t.green : t.red}
          accent={saldoProjetado >= 0 ? t.green : t.red}
        />
        <KPICard
          label="Cobertura"
          value={`${cobertura.toFixed(1).replace('.', ',')}x`}
          color={cobertura >= 1 ? t.green : t.amber}
          accent={cobertura >= 1 ? t.green : t.amber}
          sub={cobertura >= 1 ? 'Saudavel' : 'Atencao'}
          borderRight={false}
        />
      </div>

      {/* Main Content: Grid 1fr 260px */}
      <div className="flex-1 min-h-0 grid" style={{ gridTemplateColumns: '1fr 260px' }}>
        {/* Left: Charts */}
        <div className="overflow-y-auto p-5 flex flex-col gap-5" style={{ borderRight: `1px solid ${t.border}` }}>
          {/* Entradas x Saidas Mensais */}
          <div
            className="relative rounded-xl overflow-hidden"
            style={{ background: t.surface, border: `1px solid ${t.border}` }}
          >
            <GlowLine color={t.blue} />
            <div className="px-5 pt-4 pb-2 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-semibold" style={{ color: t.text }}>
                  Entradas x Saidas Mensais
                </div>
                <div className="text-[9px] mt-0.5" style={{ color: t.muted }}>
                  Comparativo de fluxo por periodo
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-sm" style={{ background: t.green }} />
                  <span className="text-[9px]" style={{ color: t.muted }}>Entradas</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-sm" style={{ background: t.red }} />
                  <span className="text-[9px]" style={{ color: t.muted }}>Saidas</span>
                </div>
              </div>
            </div>
            <div style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={mockFluxo} margin={{ top: 20, right: 20, bottom: 5, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={t.gridLine} />
                  <XAxis
                    dataKey="mes"
                    tick={{ fill: t.muted, fontSize: 10, fontFamily: 'DM Mono, monospace' }}
                    axisLine={{ stroke: t.border }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: t.muted, fontSize: 9, fontFamily: 'DM Mono, monospace' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => fmtK(v)}
                    width={50}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="ent"
                    name="Entradas"
                    fill={`${t.green}AA`}
                    radius={[4, 4, 0, 0]}
                    barSize={28}
                  >
                    <LabelList
                      dataKey="ent"
                      content={(props) => (
                        <BarLabel
                          x={props.x as number}
                          y={props.y as number}
                          width={props.width as number}
                          value={props.value as number}
                          fill={t.green}
                        />
                      )}
                    />
                  </Bar>
                  <Bar
                    dataKey="sai"
                    name="Saidas"
                    fill={`${t.red}AA`}
                    radius={[4, 4, 0, 0]}
                    barSize={28}
                  >
                    <LabelList
                      dataKey="sai"
                      content={(props) => (
                        <BarLabel
                          x={props.x as number}
                          y={props.y as number}
                          width={props.width as number}
                          value={props.value as number}
                          fill={t.red}
                        />
                      )}
                    />
                  </Bar>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Saldo Projetado Diario */}
          <div
            className="relative rounded-xl overflow-hidden"
            style={{ background: t.surface, border: `1px solid ${t.border}` }}
          >
            <GlowLine color={t.amber} />
            <div className="px-5 pt-4 pb-2 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-semibold" style={{ color: t.text }}>
                  Saldo Projetado Diario
                </div>
                <div className="text-[9px] mt-0.5" style={{ color: t.muted }}>
                  Projecao de saldo para os proximos {hz} dias
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <TrendingUp size={12} style={{ color: t.amber }} />
                <span className="text-[9px] font-mono" style={{ color: t.amber }}>
                  Final: R$ {fmtK(saldoProjetado)}
                </span>
              </div>
            </div>
            <div style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={fluxoDiario} margin={{ top: 10, right: 20, bottom: 5, left: 10 }}>
                  <defs>
                    <linearGradient id="saldoGradGreen" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={t.green} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={t.green} stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="saldoGradRed" x1="0" y1="1" x2="0" y2="0">
                      <stop offset="5%" stopColor={t.red} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={t.red} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={t.gridLine} />
                  <XAxis
                    dataKey="dia"
                    tick={{ fill: t.muted, fontSize: 9, fontFamily: 'DM Mono, monospace' }}
                    axisLine={{ stroke: t.border }}
                    tickLine={false}
                    interval={hz <= 7 ? 0 : hz <= 30 ? 2 : hz <= 60 ? 5 : 9}
                  />
                  <YAxis
                    tick={{ fill: t.muted, fontSize: 9, fontFamily: 'DM Mono, monospace' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => fmtK(v)}
                    width={50}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={0} stroke={t.red} strokeDasharray="4 4" strokeOpacity={0.5} />
                  <Area
                    type="monotone"
                    dataKey="saldoPos"
                    name="Saldo +"
                    stroke={t.green}
                    strokeWidth={2}
                    fill="url(#saldoGradGreen)"
                    connectNulls={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="saldoNeg"
                    name="Saldo −"
                    stroke={t.red}
                    strokeWidth={2}
                    fill="url(#saldoGradRed)"
                    connectNulls={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right: Sidebar */}
        <div className="overflow-y-auto p-4 flex flex-col gap-4">
          {/* Saldo Projetado Final */}
          <div
            className="rounded-xl p-4 relative overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${t.blueDim}, ${saldoProjetado >= 0 ? t.greenDim : t.redDim})`,
              border: `1px solid ${t.border}`,
            }}
          >
            <div className="text-[9px] uppercase tracking-wider mb-2" style={{ color: t.muted }}>
              Saldo Projetado Final
            </div>
            <div
              className="font-mono text-xl font-medium"
              style={{ color: saldoProjetado >= 0 ? t.green : t.red }}
            >
              R$ {fmtBRL(saldoProjetado)}
            </div>
            <div className="text-[9px] mt-1" style={{ color: t.muted }}>
              em {hz} dias ({HZ_OPTIONS.find((o) => o.days === hz)?.label})
            </div>
            <div className="flex items-center gap-1 mt-2">
              {saldoProjetado >= saldoAtual ? (
                <ArrowUpRight size={11} style={{ color: t.green }} />
              ) : (
                <ArrowDownRight size={11} style={{ color: t.red }} />
              )}
              <span
                className="text-[9px] font-mono"
                style={{ color: saldoProjetado >= saldoAtual ? t.green : t.red }}
              >
                {fmtK(saldoProjetado - saldoAtual)} vs atual
              </span>
            </div>
          </div>

          {/* Maiores Entradas */}
          <div>
            <div className="text-[10px] uppercase tracking-[1.5px] font-medium mb-3" style={{ color: t.muted }}>
              Maiores Entradas
            </div>
            <div className="flex flex-col gap-2">
              {topEntradas.map((r, i) => (
                <div
                  key={i}
                  className="rounded-lg p-3"
                  style={{ background: t.surface, border: `1px solid ${t.border}` }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] truncate max-w-[140px]" style={{ color: t.textSec }}>
                      {r.fav}
                    </span>
                    <span className="text-[10px] font-mono font-medium" style={{ color: t.green }}>
                      {fmtK(r.valor)}
                    </span>
                  </div>
                  <div className="h-0.5 rounded-sm overflow-hidden" style={{ background: `${t.text}08` }}>
                    <div
                      className="h-full rounded-sm"
                      style={{
                        width: `${(r.valor / topEntradas[0].valor) * 100}%`,
                        background: t.green,
                        opacity: 0.5,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Maiores Saidas */}
          <div>
            <div className="text-[10px] uppercase tracking-[1.5px] font-medium mb-3" style={{ color: t.muted }}>
              Maiores Saidas
            </div>
            <div className="flex flex-col gap-2">
              {topSaidas.map((r, i) => (
                <div
                  key={i}
                  className="rounded-lg p-3"
                  style={{ background: t.surface, border: `1px solid ${t.border}` }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] truncate max-w-[140px]" style={{ color: t.textSec }}>
                      {r.fav}
                    </span>
                    <span className="text-[10px] font-mono font-medium" style={{ color: t.red }}>
                      {fmtK(r.valor)}
                    </span>
                  </div>
                  <div className="h-0.5 rounded-sm overflow-hidden" style={{ background: `${t.text}08` }}>
                    <div
                      className="h-full rounded-sm"
                      style={{
                        width: `${(r.valor / topSaidas[0].valor) * 100}%`,
                        background: t.red,
                        opacity: 0.5,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
