'use client'
import { useState, useMemo } from 'react'
import {
  ComposedChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { Search, Loader2 } from 'lucide-react'
import { useThemeStore } from '@/store/themeStore'
import { SortHeader } from '@/components/ui/SortHeader'
import { Badge } from '@/components/ui/Badge'
import { GlowLine } from '@/components/ui/GlowLine'
import { KPICard } from '@/components/ui/KPICard'
import { CustomTooltip } from '@/components/charts/CustomTooltip'
import { mockCPFull as fallbackCP, mockCRFull as fallbackCR, cpTemporalData as fallbackTemporal } from '@/lib/mocks/cpcrData'
import type { ContaPagarReceber } from '@/lib/mocks/cpcrData'
import { getCatDesc } from '@/lib/mocks/extratoData'
import { CATEGORIAS } from '@/lib/planoContas'

function getCatNivel2(catCode: string): string {
  const info = CATEGORIAS[catCode]
  if (info) return info.nivel2
  return getCatDesc(catCode)
}
import { fmtBRL, fmtK, parseDMY, toggleSort, sortRows, type SortState } from '@/lib/formatters'
import { useCP, useCR, useCPResumo, useCRResumo } from '@/hooks/useAPI'
import { useEmpresaId } from '@/hooks/useEmpresaId'
import { transformCPCR } from '@/lib/transformers'

export default function PageCPCR() {
  const t = useThemeStore((s) => s.tokens)
  const empresaId = useEmpresaId()
  const [tab, setTab] = useState<'CP' | 'CR'>('CP')
  const [view, setView] = useState<'lanc' | 'temp' | 'repr'>('lanc')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('TODOS')
  const [sort, setSort] = useState<SortState>({ field: 'vcto', dir: 'asc' })

  // CP/CR: sem filtro de data do dateRangeStore — busca todos os títulos
  const { data: cpRaw, loading: loadingCP } = useCP(empresaId, { registros: 100 })
  const { data: crRaw, loading: loadingCR } = useCR(empresaId, { registros: 100 })
  const { data: cpResumo } = useCPResumo(empresaId)
  const { data: crResumo } = useCRResumo(empresaId)

  // Transform API → component shape, fallback to mock
  const cpData: ContaPagarReceber[] = useMemo(
    () => (cpRaw?.dados ? transformCPCR(cpRaw.dados, 'CP') : fallbackCP),
    [cpRaw],
  )
  const crData: ContaPagarReceber[] = useMemo(
    () => (crRaw?.dados ? transformCPCR(crRaw.dados, 'CR') : fallbackCR),
    [crRaw],
  )

  const rawData = tab === 'CP' ? cpData : crData
  const loading = tab === 'CP' ? loadingCP : loadingCR
  const resumo = tab === 'CP' ? cpResumo : crResumo
  const isCP = tab === 'CP'
  const accent = isCP ? t.red : t.green
  const accentDim = isCP ? t.redDim : t.greenDim

  const data = useMemo(
    () => rawData.filter((r) => {
      if (search && !r.fav.toLowerCase().includes(search.toLowerCase()) && !getCatDesc(r.cat).toLowerCase().includes(search.toLowerCase())) return false
      if (statusFilter !== 'TODOS' && r.status !== statusFilter) return false
      return true
    }),
    [rawData, search, statusFilter],
  )

  const dataSorted = useMemo(
    () => sortRows(data, sort, (r, f) => {
      if (f === 'fav') return r.fav
      if (f === 'categoria') return getCatDesc(r.cat)
      if (f === 'grupo') return getCatNivel2(r.cat)
      if (f === 'vcto') return parseDMY(r.vcto)
      if (f === 'valor') return r.valor
      if (f === 'valor_pago') return r.valor_pago
      if (f === 'valor_aberto') return r.valor_aberto
      if (f === 'status') return r.status
      return 0
    }),
    [data, sort],
  )

  // Use API KPIs when available, otherwise compute from data
  const totalAberto = resumo?.total_aberto ?? data.filter((r) => r.status !== 'PAGO' && r.status !== 'RECEBIDO').reduce((s, r) => s + r.valor, 0)
  const aVencer = resumo?.total_a_vencer ?? data.filter((r) => r.status === 'A VENCER' || r.status === 'A RECEBER').reduce((s, r) => s + r.valor, 0)
  const atrasado = resumo?.total_atrasado ?? data.filter((r) => r.status === 'ATRASADO').reduce((s, r) => s + r.valor, 0)
  const pago = resumo?.total_realizado ?? data.filter((r) => r.status === 'PAGO' || r.status === 'RECEBIDO').reduce((s, r) => s + r.valor, 0)
  const aberto = data.filter((r) => r.status !== 'PAGO' && r.status !== 'RECEBIDO')
  const pmDias = resumo?.prazo_medio ?? (isCP ? 24.7 : 19.3)

  // Aging buckets
  const today = new Date()
  const aging = useMemo(() => {
    const ag: Record<string, number> = { '0-15': 0, '16-30': 0, '31-60': 0, '60+': 0 }
    aberto.forEach((r) => {
      const dt = parseDMY(r.vcto)
      if (isNaN(dt.getTime())) return
      const diff = Math.round((dt.getTime() - today.getTime()) / 86400000)
      if (diff <= 15) ag['0-15'] += r.valor
      else if (diff <= 30) ag['16-30'] += r.valor
      else if (diff <= 60) ag['31-60'] += r.valor
      else ag['60+'] += r.valor
    })
    return ag
  }, [aberto])
  const agingMax = Math.max(...Object.values(aging), 1)

  // Category breakdown
  const catSorted = useMemo(() => {
    // Use API category data when available
    if (resumo?.por_categoria?.length) {
      return resumo.por_categoria.map((c) => [getCatDesc(c.categoria) || c.categoria, c.valor] as [string, number])
    }
    const catBreak: Record<string, number> = {}
    data.forEach((r) => { const desc = getCatDesc(r.cat); catBreak[desc] = (catBreak[desc] || 0) + r.valor })
    return Object.entries(catBreak).sort((a, b) => b[1] - a[1])
  }, [data, resumo])
  const catMax = catSorted[0]?.[1] || 1
  const catTotal = catSorted.reduce((s, [, v]) => s + v, 0) || 1

  // Favorecido ranking
  const favSorted = useMemo(() => {
    const favBreak: Record<string, number> = {}
    data.forEach((r) => { favBreak[r.fav] = (favBreak[r.fav] || 0) + r.valor })
    return Object.entries(favBreak).sort((a, b) => b[1] - a[1])
  }, [data])
  const favMax = favSorted[0]?.[1] || 1
  const favTotal = favSorted.reduce((s, [, v]) => s + v, 0) || 1

  const viewBtns = [
    { id: 'lanc' as const, label: '☰ Lançamentos' },
    { id: 'temp' as const, label: '📅 Temporal' },
    { id: 'repr' as const, label: '◫ Representatividade' },
  ]

  // Temporal chart data — derive from actual data when available
  const temporalData = useMemo(() => {
    if (!cpRaw?.dados && !crRaw?.dados) return fallbackTemporal
    const months: Record<string, { cp: number; cr: number }> = {}
    const fmt = (d: string | null) => {
      if (!d) return null
      const dt = parseDMY(d)
      if (isNaN(dt.getTime())) return null
      const m = dt.getMonth()
      const y = dt.getFullYear()
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
      return `${monthNames[m]}/${String(y).slice(2)}`
    }
    for (const r of cpData) {
      const key = fmt(r.vcto)
      if (!key) continue
      if (!months[key]) months[key] = { cp: 0, cr: 0 }
      months[key].cp += r.valor
    }
    for (const r of crData) {
      const key = fmt(r.vcto)
      if (!key) continue
      if (!months[key]) months[key] = { cp: 0, cr: 0 }
      months[key].cr += r.valor
    }
    const entries = Object.entries(months).sort((a, b) => a[0].localeCompare(b[0]))
    if (entries.length === 0) return fallbackTemporal
    return entries.map(([mes, v]) => ({ mes, cp: Math.round(v.cp), cr: Math.round(v.cr) }))
  }, [cpData, crData, cpRaw, crRaw])

  return (
    <div className="flex flex-col min-h-full">
      {/* Tab Bar + View Toggle */}
      <div className="flex items-center shrink-0" style={{ borderBottom: `1px solid ${t.border}`, background: `${t.bg}DD` }}>
        {(['CP', 'CR'] as const).map((tb) => {
          const tbColor = tb === 'CP' ? t.red : t.green
          const tbDim = tb === 'CP' ? t.redDim : t.greenDim
          const tbData = tb === 'CP' ? cpData : crData
          const count = tbData.filter((r) => r.status !== 'PAGO' && r.status !== 'RECEBIDO').length
          return (
            <button
              key={tb}
              onClick={() => { setTab(tb); setSearch('') }}
              className="flex items-center gap-2 px-7 py-3 text-[11px] cursor-pointer transition-all"
              style={{
                fontWeight: tab === tb ? 600 : 400,
                color: tab === tb ? t.text : t.muted,
                background: 'transparent',
                border: 'none',
                borderBottom: `2px solid ${tab === tb ? tbColor : 'transparent'}`,
                fontFamily: 'inherit',
              }}
            >
              {tb === 'CP' ? 'Contas a Pagar' : 'Contas a Receber'}
              <span
                className="text-[9px] px-2 py-px rounded-full font-mono"
                style={{ background: tbDim, color: tbColor }}
              >
                {count}
              </span>
            </button>
          )
        })}
        <div className="ml-auto flex gap-0.5 rounded-lg p-0.5 mr-5" style={{ background: `${t.text}06` }}>
          {viewBtns.map((vb) => (
            <button
              key={vb.id}
              onClick={() => setView(vb.id)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-[10px] cursor-pointer transition-all"
              style={{
                background: view === vb.id ? t.blueDim : 'transparent',
                color: view === vb.id ? t.blue : t.muted,
                fontWeight: view === vb.id ? 600 : 400,
                border: 'none',
                fontFamily: 'inherit',
              }}
            >
              {vb.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-5 shrink-0" style={{ borderBottom: `1px solid ${t.border}` }}>
        {[
          { label: isCP ? 'Total a Pagar' : 'Total a Receber', value: fmtK(totalAberto), color: accent, accent, sub: 'Em aberto' },
          { label: 'A Vencer', value: fmtK(aVencer), color: t.text, accent: t.green, sub: 'Dentro do prazo' },
          { label: 'Atrasado', value: fmtK(atrasado), color: atrasado > 0 ? t.red : t.text, accent: t.red, sub: atrasado > 0 ? 'Atenção necessária' : 'Nenhum em atraso' },
          { label: 'Prazo Médio', value: `${pmDias} dias`, color: t.text, accent: t.amber, sub: isCP ? 'Pagamento' : 'Recebimento' },
          { label: isCP ? 'Pago' : 'Recebido', value: fmtK(pago), color: t.muted, accent: t.blue, sub: `${resumo?.quantidade_realizado ?? 0} títulos` },
        ].map((k, i) => (
          <KPICard key={i} label={k.label} value={k.value} color={k.color} accent={k.accent} sub={k.sub} borderRight={i < 4} />
        ))}
      </div>

      {/* Body */}
      <div className="grid min-h-[500px]" style={{ gridTemplateColumns: '1fr 290px' }}>
        {/* LEFT */}
        <div className="flex flex-col" style={{ borderRight: `1px solid ${t.border}` }}>
          {/* VIEW: LANÇAMENTOS */}
          {view === 'lanc' && (
            <>
              <div className="flex items-center gap-2.5 px-4 py-2.5 shrink-0" style={{ borderBottom: `1px solid ${t.border}`, background: `${t.bg}88` }}>
                <div className="relative flex-1">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: t.muted }} />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar favorecido, categoria..."
                    className="w-full rounded-lg pl-8 pr-2.5 py-2 text-[11px] outline-none"
                    style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.text, fontFamily: 'inherit' }} />
                </div>
                {[
                  { value: 'TODOS', label: 'Todos' },
                  { value: 'A VENCER', label: 'A Vencer' },
                  { value: 'ATRASADO', label: 'Atrasado' },
                  { value: 'PARCIAL', label: 'Parcial' },
                  { value: isCP ? 'PAGO' : 'RECEBIDO', label: isCP ? 'Pago' : 'Recebido' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setStatusFilter(opt.value)}
                    className="px-2.5 py-1.5 rounded-md text-[10px] cursor-pointer transition-all"
                    style={{
                      background: statusFilter === opt.value ? t.blueDim : 'transparent',
                      color: statusFilter === opt.value ? t.blue : t.muted,
                      border: `1px solid ${statusFilter === opt.value ? `${t.blue}44` : t.border}`,
                      fontWeight: statusFilter === opt.value ? 600 : 400,
                      fontFamily: 'inherit',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
                <span className="text-[10px] font-mono whitespace-nowrap" style={{ color: t.muted }}>{loading ? '...' : `${data.length} itens`}</span>
              </div>
              {/* Summary row */}
              <div className="grid grid-cols-3 gap-2.5 px-4 py-2.5 shrink-0" style={{ borderBottom: `1px solid ${t.border}` }}>
                {[
                  { icon: '↑', label: isCP ? 'Pago' : 'Recebido', value: fmtK(pago), color: t.muted, bg: `${t.muted}12` },
                  { icon: '⏳', label: 'Em aberto', value: fmtK(totalAberto), color: accent, bg: accentDim },
                  { icon: '⚠', label: 'Atrasado', value: fmtK(atrasado), color: t.red, bg: t.redDim },
                ].map((s, i) => (
                  <div key={i} className="flex items-center gap-2.5 rounded-lg p-2.5" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
                    <div className="w-7 h-7 rounded-md flex items-center justify-center text-[13px] shrink-0" style={{ background: s.bg }}>{s.icon}</div>
                    <div>
                      <div className="text-[9px] uppercase tracking-wide" style={{ color: t.muted }}>{s.label}</div>
                      <div className="font-mono text-sm mt-px" style={{ color: s.color }}>{s.value}</div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Table */}
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center h-48 gap-2">
                    <Loader2 size={18} className="animate-spin" style={{ color: t.blue }} />
                    <span className="text-[11px]" style={{ color: t.muted }}>Carregando {isCP ? 'contas a pagar' : 'contas a receber'}...</span>
                  </div>
                ) : dataSorted.length === 0 ? (
                  <div className="flex items-center justify-center h-48">
                    <span className="text-[11px]" style={{ color: t.muted }}>Nenhum lançamento encontrado</span>
                  </div>
                ) : (
                  <table className="w-full text-[11px]" style={{ borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: `${t.bg}EE`, position: 'sticky', top: 0, zIndex: 5 }}>
                        <SortHeader label="Favorecido" field="fav" sort={sort} onSort={(f) => setSort((prev) => toggleSort(prev, f))} />
                        <SortHeader label="Categoria" field="categoria" sort={sort} onSort={(f) => setSort((prev) => toggleSort(prev, f))} />
                        <SortHeader label="Grupo" field="grupo" sort={sort} onSort={(f) => setSort((prev) => toggleSort(prev, f))} />
                        <SortHeader label="Vencimento" field="vcto" sort={sort} onSort={(f) => setSort((prev) => toggleSort(prev, f))} />
                        <SortHeader label="Valor" field="valor" sort={sort} onSort={(f) => setSort((prev) => toggleSort(prev, f))} align="right" />
                        <SortHeader label="Pago" field="valor_pago" sort={sort} onSort={(f) => setSort((prev) => toggleSort(prev, f))} align="right" />
                        <SortHeader label="Em Aberto" field="valor_aberto" sort={sort} onSort={(f) => setSort((prev) => toggleSort(prev, f))} align="right" />
                        <SortHeader label="Status" field="status" sort={sort} onSort={(f) => setSort((prev) => toggleSort(prev, f))} align="center" />
                      </tr>
                    </thead>
                    <tbody>
                      {dataSorted.map((r, i) => (
                        <tr key={i} className="transition-colors hover:bg-surface-hover" style={{ borderBottom: `1px solid ${t.border}22` }}>
                          <td className="px-3.5 py-2.5 font-medium">{r.fav}</td>
                          <td className="px-3.5 py-2.5 text-[10px] max-w-[140px] truncate" style={{ color: t.muted }} title={`${r.cat} — ${getCatDesc(r.cat)}`}>{getCatDesc(r.cat)}</td>
                          <td className="px-3.5 py-2.5 text-[10px]" style={{ color: t.muted }}>{getCatNivel2(r.cat)}</td>
                          <td className="px-3.5 py-2.5 font-mono text-[10px]" style={{ color: r.status === 'ATRASADO' ? t.red : t.muted }}>{r.vcto}</td>
                          <td className="px-3.5 py-2.5 text-right font-mono font-medium" style={{ color: accent }}>{fmtBRL(r.valor)}</td>
                          <td className="px-3.5 py-2.5 text-right font-mono text-[10px]" style={{ color: r.valor_pago > 0 ? t.green : t.mutedDim }}>{r.valor_pago > 0 ? fmtBRL(r.valor_pago) : '—'}</td>
                          <td className="px-3.5 py-2.5 text-right font-mono text-[10px]" style={{ color: r.valor_aberto > 0 ? t.red : t.mutedDim }}>{r.valor_aberto > 0 ? fmtBRL(r.valor_aberto) : '—'}</td>
                          <td className="px-3.5 py-2.5 text-center"><Badge status={r.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}

          {/* VIEW: TEMPORAL */}
          {view === 'temp' && (
            <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-3.5">
              {/* Main Chart */}
              <div className="relative overflow-hidden rounded-xl p-3.5" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
                <GlowLine color={t.blue} />
                <div className="text-[10px] uppercase tracking-wider mb-3" style={{ color: t.muted }}>
                  Vencimentos por Mês — CP × CR
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <ComposedChart data={temporalData} barSize={28} margin={{ top: 20, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={`${t.text}06`} />
                    <XAxis dataKey="mes" tick={{ fill: t.muted, fontSize: 10, fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: t.muted, fontSize: 9, fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} tickFormatter={fmtK} />
                    <Tooltip content={<CustomTooltip />} cursor={false} />
                    <Bar dataKey="cp" name="A Pagar" fill={`${t.red}25`} stroke={t.red} strokeWidth={1.5} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="cr" name="A Receber" fill={`${t.green}25`} stroke={t.green} strokeWidth={1.5} radius={[4, 4, 0, 0]} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Aging */}
              <div className="relative overflow-hidden rounded-xl p-3.5" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
                <GlowLine color={t.amber} />
                <div className="text-[10px] uppercase tracking-wider mb-3" style={{ color: t.muted }}>
                  Aging — Envelhecimento de Títulos
                </div>
                <div className="flex flex-col gap-2.5">
                  {Object.entries(aging).map(([bucket, val]) => (
                    <div key={bucket}>
                      <div className="flex justify-between text-[10px] mb-1">
                        <span style={{ color: t.textSec }}>{bucket} dias</span>
                        <span className="font-mono" style={{ color: t.text }}>{fmtK(val)}</span>
                      </div>
                      <div className="h-2 rounded-sm overflow-hidden" style={{ background: `${t.text}08` }}>
                        <div className="h-full rounded-sm transition-[width] duration-500" style={{ width: `${(val / agingMax) * 100}%`, background: accent, opacity: 0.6 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Distribution */}
              <div className="relative overflow-hidden rounded-xl p-3.5" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
                <GlowLine color={accent} />
                <div className="text-[10px] uppercase tracking-wider mb-3" style={{ color: t.muted }}>
                  Distribuição por Status
                </div>
                {[
                  { label: isCP ? 'Pago' : 'Recebido', value: pago, color: t.muted },
                  { label: 'Em aberto', value: totalAberto, color: accent },
                  { label: 'Atrasado', value: atrasado, color: t.red },
                ].map((s, i) => {
                  const total = pago + totalAberto + atrasado || 1
                  return (
                    <div key={i} className="mb-2.5">
                      <div className="flex justify-between text-[10px] mb-1">
                        <span style={{ color: t.textSec }}>{s.label}</span>
                        <div className="flex gap-2.5">
                          <span className="font-mono" style={{ color: t.text }}>{fmtK(s.value)}</span>
                          <span className="font-mono" style={{ color: s.color }}>{((s.value / total) * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-sm overflow-hidden" style={{ background: `${t.text}08` }}>
                        <div className="h-full rounded-sm transition-[width] duration-500" style={{ width: `${(s.value / total) * 100}%`, background: s.color, opacity: 0.6 }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* VIEW: REPRESENTATIVIDADE */}
          {view === 'repr' && (
            <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-3.5">
              {/* Ranking por Favorecido */}
              <div className="relative overflow-hidden rounded-xl p-3.5" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
                <GlowLine color={accent} />
                <div className="text-[10px] uppercase tracking-wider mb-3" style={{ color: t.muted }}>
                  Ranking por Favorecido
                </div>
                {favSorted.map(([nome, valor], i) => (
                  <div key={i} className="mb-2.5">
                    <div className="flex justify-between text-[10px] mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[9px] min-w-[16px]" style={{ color: t.mutedDim }}>{i + 1}.</span>
                        <span style={{ color: t.text }}>{nome}</span>
                      </div>
                      <div className="flex gap-2.5">
                        <span className="font-mono" style={{ color: t.text }}>{fmtK(valor)}</span>
                        <span className="font-mono min-w-[36px] text-right" style={{ color: accent }}>{((valor / favTotal) * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-sm overflow-hidden" style={{ background: `${t.text}08` }}>
                      <div className="h-full rounded-sm transition-[width] duration-500" style={{ width: `${(valor / favMax) * 100}%`, background: accent, opacity: 0.5 }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Ranking por Categoria */}
              <div className="relative overflow-hidden rounded-xl p-3.5" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
                <GlowLine color={t.amber} />
                <div className="text-[10px] uppercase tracking-wider mb-3" style={{ color: t.muted }}>
                  Ranking por Categoria
                </div>
                {catSorted.map(([nome, valor], i) => (
                  <div key={i} className="mb-2.5">
                    <div className="flex justify-between text-[10px] mb-1">
                      <span style={{ color: t.text }}>{nome}</span>
                      <div className="flex gap-2.5">
                        <span className="font-mono" style={{ color: t.text }}>{fmtK(valor)}</span>
                        <span className="font-mono min-w-[36px] text-right" style={{ color: t.amber }}>{((valor / catTotal) * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-sm overflow-hidden" style={{ background: `${t.text}08` }}>
                      <div className="h-full rounded-sm transition-[width] duration-500" style={{ width: `${(valor / catMax) * 100}%`, background: t.amber, opacity: 0.5 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT SIDEBAR */}
        <div className="p-4 overflow-y-auto flex flex-col gap-3">
          {/* Position card */}
          <div className="relative overflow-hidden rounded-lg p-3" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
            <GlowLine color={accent} />
            <div className="text-[9px] uppercase tracking-wider mb-2" style={{ color: t.muted }}>
              Posição {isCP ? 'Contas a Pagar' : 'Contas a Receber'}
            </div>
            <div className="font-mono text-xl mb-0.5" style={{ color: accent }}>{fmtK(totalAberto)}</div>
            <div className="text-[9px]" style={{ color: t.muted }}>{aberto.length} títulos em aberto</div>
          </div>

          {/* Prazo Médio */}
          <div className="rounded-lg p-3" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
            <div className="text-[9px] uppercase tracking-wider mb-2" style={{ color: t.muted }}>Prazo Médio</div>
            <div className="font-mono text-lg" style={{ color: t.text }}>{pmDias} <span className="text-[10px]" style={{ color: t.muted }}>dias</span></div>
          </div>

          {/* Top Favorecidos */}
          <div className="rounded-lg p-3" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
            <div className="text-[9px] uppercase tracking-wider mb-2" style={{ color: t.muted }}>Top Favorecidos</div>
            {favSorted.slice(0, 5).map(([nome, valor], i) => (
              <div key={i} className="flex justify-between text-[10px] py-1" style={{ borderBottom: i < 4 ? `1px solid ${t.text}06` : 'none' }}>
                <span className="truncate max-w-[140px]" style={{ color: t.textSec }}>{nome}</span>
                <span className="font-mono" style={{ color: t.text }}>{fmtK(valor)}</span>
              </div>
            ))}
          </div>

          {/* Aging mini */}
          <div className="rounded-lg p-3" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
            <div className="text-[9px] uppercase tracking-wider mb-2" style={{ color: t.muted }}>Aging</div>
            {Object.entries(aging).map(([bucket, val]) => (
              <div key={bucket} className="flex justify-between text-[10px] py-1">
                <span style={{ color: t.muted }}>{bucket}d</span>
                <span className="font-mono" style={{ color: val > 0 ? t.text : t.mutedDim }}>{fmtK(val)}</span>
              </div>
            ))}
          </div>

          {/* Próximos vencimentos */}
          <div className="rounded-lg p-3" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
            <div className="text-[9px] uppercase tracking-wider mb-2" style={{ color: t.muted }}>Próximos Vencimentos</div>
            {[...rawData]
              .filter((r) => r.status !== 'PAGO' && r.status !== 'RECEBIDO')
              .sort((a, b) => {
                const da = parseDMY(a.vcto), db = parseDMY(b.vcto)
                return (isNaN(da.getTime()) ? Infinity : da.getTime()) - (isNaN(db.getTime()) ? Infinity : db.getTime())
              })
              .slice(0, 4)
              .map((r, i) => (
                <div key={i} className="flex justify-between text-[10px] py-1" style={{ borderBottom: i < 3 ? `1px solid ${t.text}06` : 'none' }}>
                  <div className="flex flex-col">
                    <span className="truncate max-w-[120px]" style={{ color: t.textSec }}>{r.fav}</span>
                    <span className="font-mono text-[9px]" style={{ color: r.status === 'ATRASADO' ? t.red : t.muted }}>{r.vcto}</span>
                  </div>
                  <span className="font-mono" style={{ color: accent }}>{fmtK(r.valor)}</span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}
