'use client'
import { useState, useMemo } from 'react'
import {
  ComposedChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, LabelList,
} from 'recharts'
import { Calendar, TrendingUp, ArrowUpRight, ArrowDownRight, Loader2 } from 'lucide-react'
import { useThemeStore } from '@/store/themeStore'
import { GlowLine } from '@/components/ui/GlowLine'
import { KPICard } from '@/components/ui/KPICard'
import { BarLabel } from '@/components/charts/BarLabel'
import { CustomTooltip } from '@/components/charts/CustomTooltip'
import { fmtK, fmtBRL, sortByMonthYear } from '@/lib/formatters'
import type { ContaPagarReceber } from '@/lib/mocks/cpcrData'
import { useFluxoCaixa, useCPAll, useCRAll, useExtrato } from '@/hooks/useAPI'
import { useEmpresaId } from '@/hooks/useEmpresaId'
import { transformCPCR } from '@/lib/transformers'
import { parseDMY } from '@/lib/formatters'

const HZ_OPTIONS = [
  { label: '+7d', days: 7 },
  { label: '+30d', days: 30 },
  { label: '+60d', days: 60 },
  { label: '+90d', days: 90 },
] as const

export default function PageFluxo() {
  const t = useThemeStore((s) => s.tokens)
  const empresaId = useEmpresaId()
  const [hz, setHz] = useState(30)

  // Saldo atual vem do extrato (sem filtro de data) e e usado como ponto de
  // partida da projecao no backend. Step 13 — Parte D.
  const { data: extratoAtual } = useExtrato(empresaId)
  const saldoAtualExtrato = extratoAtual?.saldo_atual ?? 0
  // O horizonte e controlado pelos botoes +7d/+30d/+60d/+90d (state `hz`).
  // Antes a chamada usava `dt_fim` do filtro global, o que zerava a janela
  // quando o usuario tinha o range setado em data passada/curta.
  const { data: fluxoAPI, loading: loadingFluxo } = useFluxoCaixa(empresaId, undefined, undefined, hz, saldoAtualExtrato)
  // Pagina ate esgotar — KPIs/graficos nao podem truncar (Step 13 — Parte C).
  const { data: cpRaw } = useCPAll(empresaId)
  const { data: crRaw } = useCRAll(empresaId)

  // Use API data or fallback — SOMENTE títulos em aberto
  const cpData = useMemo(() => (cpRaw?.dados ? transformCPCR(cpRaw.dados, 'CP') : []), [cpRaw])
  const crData = useMemo(() => (crRaw?.dados ? transformCPCR(crRaw.dados, 'CR') : []), [crRaw])
  const cpAberto = useMemo(() => cpData.filter((c) => c.status !== 'PAGO'), [cpData])
  const crAberto = useMemo(() => crData.filter((c) => c.status !== 'RECEBIDO'), [crData])

  const saldoAtual = useMemo(() => {
    if (fluxoAPI?.kpis?.saldo_atual) return fluxoAPI.kpis.saldo_atual
    if (extratoAtual?.saldo_atual) return extratoAtual.saldo_atual
    return 0
  }, [fluxoAPI, extratoAtual])

  const totalEnt = useMemo(() => {
    if (fluxoAPI?.kpis) return fluxoAPI.kpis.total_entradas
    return crAberto.reduce((s, r) => s + r.valor, 0)
  }, [fluxoAPI, crAberto])

  const totalSai = useMemo(() => {
    if (fluxoAPI?.kpis) return fluxoAPI.kpis.total_saidas
    return cpAberto.reduce((s, r) => s + r.valor, 0)
  }, [fluxoAPI, cpAberto])

  // Monthly data — TODOS os titulos em aberto por mes de vencimento
  // (inclui atrasados/passados — o subtitulo do chart e
  // "Titulos em aberto por mes de vencimento", nao "Proximos 30 dias").
  // Sempre computado localmente: o `fluxoAPI.mensal` vem limitado por
  // horizonte e nao serve pra essa visao agregada.
  const fluxoMensal = useMemo(() => {
    const months: Record<string, { ent: number; sai: number }> = {}
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    const fmt = (d: string) => {
      const dt = parseDMY(d)
      if (isNaN(dt.getTime())) return null
      return `${monthNames[dt.getMonth()]}/${String(dt.getFullYear()).slice(2)}`
    }
    for (const r of crAberto) {
      const key = fmt(r.vcto)
      if (!key) continue
      if (!months[key]) months[key] = { ent: 0, sai: 0 }
      months[key].ent += r.valor
    }
    for (const r of cpAberto) {
      const key = fmt(r.vcto)
      if (!key) continue
      if (!months[key]) months[key] = { ent: 0, sai: 0 }
      months[key].sai += r.valor
    }
    const rows = Object.entries(months).map(([mes, v]) => ({
      mes, ent: Math.round(v.ent), sai: Math.round(v.sai),
    }))
    if (rows.length === 0) return [{ mes: '-', ent: 0, sai: 0 }]
    return sortByMonthYear(rows, (r) => r.mes)
  }, [cpAberto, crAberto])

  // Daily projection from API or seed-based fallback
  const fluxoDiario = useMemo(() => {
    if (fluxoAPI?.diario?.length) {
      const sliced = fluxoAPI.diario.slice(0, hz)
      return sliced.map((d) => {
        const parts = d.data.split(/[-\/]/)
        const label = parts.length >= 2 ? `${parts[parts.length - 1]}/${parts[parts.length - 2]}` : d.data
        return {
          dia: label,
          saldo: Math.round(d.saldo_acumulado),
          saldoPos: d.saldo_acumulado >= 0 ? Math.round(d.saldo_acumulado) : 0,
          saldoNeg: d.saldo_acumulado < 0 ? Math.round(d.saldo_acumulado) : 0,
        }
      })
    }
    // Fallback: linear projection from CP/CR open items
    const cpOpen = cpAberto.reduce((s, r) => s + r.valor, 0)
    const crOpen = crAberto.reduce((s, r) => s + r.valor, 0)
    const dailyNet = (crOpen - cpOpen) / Math.max(hz, 1)
    let saldo = saldoAtual
    const base = new Date()
    return Array.from({ length: hz }, (_, i) => {
      const d = new Date(base)
      d.setDate(d.getDate() + i)
      saldo += dailyNet
      const rounded = Math.round(saldo)
      return {
        dia: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
        saldo: rounded,
        saldoPos: rounded >= 0 ? rounded : 0,
        saldoNeg: rounded < 0 ? rounded : 0,
      }
    })
  }, [hz, saldoAtual, fluxoAPI])

  const saldoProjetado = fluxoAPI?.kpis?.saldo_projetado ?? (fluxoDiario.length > 0 ? fluxoDiario[fluxoDiario.length - 1].saldo : saldoAtual)
  const cobertura = fluxoAPI?.kpis?.cobertura ?? (totalSai > 0 ? (saldoAtual + totalEnt) / totalSai : 0)

  const topEntradas = useMemo(
    () => [...crAberto].sort((a, b) => b.valor - a.valor).slice(0, 4),
    [crAberto],
  )

  const topSaidas = useMemo(
    () => [...cpAberto].sort((a, b) => b.valor - a.valor).slice(0, 4),
    [cpAberto],
  )

  const todayStr = useMemo(() => {
    const d = new Date()
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
  }, [])

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
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: t.green }} />
          <span className="text-[10px]" style={{ color: t.muted }}>Hoje: {todayStr}</span>
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
        <KPICard label="Saldo Atual" value={`R$ ${fmtK(saldoAtual)}`} color={t.blue} accent={t.blue} />
        <KPICard label="Entradas Prev." value={`R$ ${fmtK(totalEnt)}`} color={t.green} accent={t.green} />
        <KPICard label="Saidas Prev." value={`R$ ${fmtK(totalSai)}`} color={t.red} accent={t.red} />
        <KPICard label="Saldo Projetado" value={`R$ ${fmtK(saldoProjetado)}`} color={saldoProjetado >= 0 ? t.green : t.red} accent={saldoProjetado >= 0 ? t.green : t.red} />
        <KPICard label="Cobertura" value={`${cobertura.toFixed(1).replace('.', ',')}x`} color={cobertura >= 1 ? t.green : t.amber} accent={cobertura >= 1 ? t.green : t.amber} sub={cobertura >= 1 ? 'Saudavel' : 'Atencao'} borderRight={false} />
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0 grid" style={{ gridTemplateColumns: '1fr 260px' }}>
        {/* Left: Charts */}
        <div className="overflow-y-auto p-5 flex flex-col gap-5" style={{ borderRight: `1px solid ${t.border}` }}>
          {loadingFluxo ? (
            <div className="flex items-center justify-center h-48 gap-2">
              <Loader2 size={18} className="animate-spin" style={{ color: t.blue }} />
              <span className="text-[11px]" style={{ color: t.muted }}>Carregando fluxo de caixa...</span>
            </div>
          ) : (
            <>
              {/* Entradas x Saidas Mensais */}
              <div className="relative rounded-xl overflow-hidden" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
                <GlowLine color={t.blue} />
                <div className="px-5 pt-4 pb-2 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-semibold" style={{ color: t.text }}>Previsão Entradas x Saídas Mensais</div>
                    <div className="text-[9px] mt-0.5" style={{ color: t.muted }}>Títulos em aberto por mês de vencimento</div>
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
                    <ComposedChart data={fluxoMensal} margin={{ top: 20, right: 20, bottom: 5, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={t.gridLine} />
                      <XAxis dataKey="mes" tick={{ fill: t.muted, fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }} axisLine={{ stroke: t.border }} tickLine={false} />
                      <YAxis tick={{ fill: t.muted, fontSize: 9, fontFamily: 'JetBrains Mono, monospace' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => fmtK(v)} width={50} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="ent" name="Entradas" fill={`${t.green}AA`} radius={[4, 4, 0, 0]} barSize={28}>
                        <LabelList dataKey="ent" content={(props) => (<BarLabel x={props.x as number} y={props.y as number} width={props.width as number} value={props.value as number} fill={t.green} />)} />
                      </Bar>
                      <Bar dataKey="sai" name="Saidas" fill={`${t.red}AA`} radius={[4, 4, 0, 0]} barSize={28}>
                        <LabelList dataKey="sai" content={(props) => (<BarLabel x={props.x as number} y={props.y as number} width={props.width as number} value={props.value as number} fill={t.red} />)} />
                      </Bar>
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Saldo Projetado Diario */}
              <div className="relative rounded-xl overflow-hidden" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
                <GlowLine color={t.amber} />
                <div className="px-5 pt-4 pb-2 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-semibold" style={{ color: t.text }}>Saldo Projetado Diário</div>
                    <div className="text-[9px] mt-0.5" style={{ color: t.muted }}>Saldo atual + entradas previstas − saídas previstas ({hz} dias)</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <TrendingUp size={12} style={{ color: t.amber }} />
                    <span className="text-[9px] font-mono" style={{ color: t.amber }}>Final: R$ {fmtK(saldoProjetado)}</span>
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
                      <XAxis dataKey="dia" tick={{ fill: t.muted, fontSize: 9, fontFamily: 'JetBrains Mono, monospace' }} axisLine={{ stroke: t.border }} tickLine={false} interval={hz <= 7 ? 0 : hz <= 30 ? 2 : hz <= 60 ? 5 : 9} />
                      <YAxis tick={{ fill: t.muted, fontSize: 9, fontFamily: 'JetBrains Mono, monospace' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => fmtK(v)} width={50} />
                      <Tooltip content={<CustomTooltip />} />
                      <ReferenceLine y={0} stroke={t.red} strokeDasharray="4 4" strokeOpacity={0.5} />
                      <Area type="monotone" dataKey="saldoPos" name="Saldo +" stroke={t.green} strokeWidth={2} fill="url(#saldoGradGreen)" connectNulls={false} />
                      <Area type="monotone" dataKey="saldoNeg" name="Saldo −" stroke={t.red} strokeWidth={2} fill="url(#saldoGradRed)" connectNulls={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right: Sidebar */}
        <div className="overflow-y-auto p-4 flex flex-col gap-4">
          {/* Saldo Projetado Final */}
          <div className="rounded-xl p-4 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${t.blueDim}, ${saldoProjetado >= 0 ? t.greenDim : t.redDim})`, border: `1px solid ${t.border}` }}>
            <div className="text-[9px] uppercase tracking-wider mb-2" style={{ color: t.muted }}>Saldo Projetado Final</div>
            <div className="font-mono text-xl font-medium" style={{ color: saldoProjetado >= 0 ? t.green : t.red }}>R$ {fmtBRL(saldoProjetado)}</div>
            <div className="text-[9px] mt-1" style={{ color: t.muted }}>em {hz} dias ({HZ_OPTIONS.find((o) => o.days === hz)?.label})</div>
            <div className="flex items-center gap-1 mt-2">
              {saldoProjetado >= saldoAtual ? <ArrowUpRight size={11} style={{ color: t.green }} /> : <ArrowDownRight size={11} style={{ color: t.red }} />}
              <span className="text-[9px] font-mono" style={{ color: saldoProjetado >= saldoAtual ? t.green : t.red }}>{fmtK(saldoProjetado - saldoAtual)} vs atual</span>
            </div>
          </div>

          {/* Maiores Entradas */}
          <div>
            <div className="text-[10px] uppercase tracking-[1.5px] font-medium mb-3" style={{ color: t.muted }}>Maiores Entradas</div>
            <div className="flex flex-col gap-2">
              {topEntradas.map((r, i) => (
                <div key={i} className="rounded-lg p-3" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] truncate max-w-[140px]" style={{ color: t.textSec }}>{r.fav}</span>
                    <span className="text-[10px] font-mono font-medium" style={{ color: t.green }}>{fmtK(r.valor)}</span>
                  </div>
                  <div className="h-0.5 rounded-sm overflow-hidden" style={{ background: `${t.text}08` }}>
                    <div className="h-full rounded-sm" style={{ width: `${(r.valor / (topEntradas[0]?.valor || 1)) * 100}%`, background: t.green, opacity: 0.5 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Maiores Saidas */}
          <div>
            <div className="text-[10px] uppercase tracking-[1.5px] font-medium mb-3" style={{ color: t.muted }}>Maiores Saidas</div>
            <div className="flex flex-col gap-2">
              {topSaidas.map((r, i) => (
                <div key={i} className="rounded-lg p-3" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] truncate max-w-[140px]" style={{ color: t.textSec }}>{r.fav}</span>
                    <span className="text-[10px] font-mono font-medium" style={{ color: t.red }}>{fmtK(r.valor)}</span>
                  </div>
                  <div className="h-0.5 rounded-sm overflow-hidden" style={{ background: `${t.text}08` }}>
                    <div className="h-full rounded-sm" style={{ width: `${(r.valor / (topSaidas[0]?.valor || 1)) * 100}%`, background: t.red, opacity: 0.5 }} />
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
