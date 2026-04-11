'use client'
import { useState, useMemo } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { useThemeStore } from '@/store/themeStore'
import { SortHeader } from '@/components/ui/SortHeader'
import { ConcilBadge } from '@/components/ui/ConcilBadge'
import { getCatDesc } from '@/lib/mocks/extratoData'
import { fmtBRL, fmtK, parseDMY, toggleSort, sortRows, type SortState } from '@/lib/formatters'
import { useExtrato } from '@/hooks/useAPI'
import { useEmpresaId } from '@/hooks/useEmpresaId'
import { useDateRangeStore } from '@/store/dateRangeStore'
import { transformExtrato, transformSaldos } from '@/lib/transformers'
import type { ExtratoLancamento, ContaSaldo } from '@/lib/mocks/extratoData'

function isoToDMY(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export default function PageExtrato() {
  const t = useThemeStore((s) => s.tokens)
  const empresaId = useEmpresaId()
  const dateFrom = useDateRangeStore((s) => s.from)
  const dateTo = useDateRangeStore((s) => s.to)
  const dt_inicio = isoToDMY(dateFrom)
  const dt_fim = isoToDMY(dateTo)
  const [search, setSearch] = useState('')
  const [filtro, setFiltro] = useState<'all' | 'concil' | 'pend'>('all')
  const [sort, setSort] = useState<SortState>({ field: 'data', dir: 'desc' })

  // API call with date range (returns {saldo_inicial, saldo_atual, lancamentos, saldos_contas})
  const { data: extratoResponse, loading } = useExtrato(empresaId, dt_inicio, dt_fim)

  // Extract data from response or fallback
  const extrato: ExtratoLancamento[] = useMemo(
    () => (extratoResponse?.lancamentos ? transformExtrato(extratoResponse.lancamentos, new Map()) : []),
    [extratoResponse],
  )
  const contas: ContaSaldo[] = useMemo(
    () => (extratoResponse?.saldos_contas ? transformSaldos(extratoResponse.saldos_contas) : []),
    [extratoResponse],
  )
  const saldoInicial = extratoResponse?.saldo_inicial ?? 0
  const saldoAtual = extratoResponse?.saldo_atual ?? 0

  const filtered = useMemo(
    () =>
      extrato.filter((r) => {
        if (
          search &&
          !r.favorecido.toLowerCase().includes(search.toLowerCase()) &&
          !r.descricao.toLowerCase().includes(search.toLowerCase()) &&
          !getCatDesc(r.catCod).toLowerCase().includes(search.toLowerCase())
        )
          return false
        if (filtro === 'concil' && !r.conciliado) return false
        if (filtro === 'pend' && r.conciliado) return false
        return true
      }),
    [search, filtro, extrato],
  )

  const sorted = useMemo(
    () =>
      sortRows(filtered, sort, (r, f) => {
        if (f === 'data') return parseDMY(r.data)
        if (f === 'banco') return r.banco
        if (f === 'valor') return r.valor
        if (f === 'descricao') return r.favorecido
        if (f === 'categoria') return getCatDesc(r.catCod)
        if (f === 'status') return r.conciliado ? 1 : 0
        return 0
      }),
    [filtered, sort],
  )

  const totEnt = useMemo(() => filtered.filter((r) => r.valor > 0).reduce((s, r) => s + r.valor, 0), [filtered])
  const totSai = useMemo(() => filtered.filter((r) => r.valor < 0).reduce((s, r) => s + Math.abs(r.valor), 0), [filtered])
  const balanco = totEnt - totSai
  const saldoFinal = saldoInicial + balanco
  const maxSaldo = useMemo(() => Math.max(...contas.filter((c) => c.saldo !== 0).map((c) => Math.abs(c.saldo)), 1), [contas])

  return (
    <div className="grid min-h-full" style={{ gridTemplateColumns: '1fr 240px' }}>
      {/* Left: Table */}
      <div className="flex flex-col min-h-0" style={{ borderRight: `1px solid ${t.border}` }}>
        {/* KPIs */}
        <div className="grid grid-cols-5 shrink-0" style={{ borderBottom: `1px solid ${t.border}` }}>
          {/* Saldo Inicial */}
          <div className="px-4 py-3.5" style={{ borderRight: `1px solid ${t.border}` }}>
            <div className="text-[9px] uppercase tracking-wider mb-1.5" style={{ color: t.muted }}>Saldo Inicial</div>
            <div className="font-mono text-[17px]" style={{ color: saldoInicial >= 0 ? t.blue : t.red }}>
              {saldoInicial < 0 ? '−' : ''}{fmtK(Math.abs(saldoInicial))}
            </div>
          </div>
          {/* Entradas */}
          <div className="px-4 py-3.5" style={{ borderRight: `1px solid ${t.border}` }}>
            <div className="text-[9px] uppercase tracking-wider mb-1.5" style={{ color: t.muted }}>Entradas</div>
            <div className="font-mono text-[17px]" style={{ color: t.green }}>{fmtK(totEnt)}</div>
          </div>
          {/* Saídas */}
          <div className="px-4 py-3.5" style={{ borderRight: `1px solid ${t.border}` }}>
            <div className="text-[9px] uppercase tracking-wider mb-1.5" style={{ color: t.muted }}>Saídas</div>
            <div className="font-mono text-[17px]" style={{ color: t.red }}>{fmtK(totSai)}</div>
          </div>
          {/* Resultado: Saldo Final + Balanço */}
          <div className="px-4 py-3.5" style={{ borderRight: `1px solid ${t.border}` }}>
            <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: t.muted }}>Saldo Final</div>
            <div className="font-mono text-[15px]" style={{ color: saldoFinal >= 0 ? t.green : t.red }}>
              {saldoFinal < 0 ? '−' : ''}{fmtK(Math.abs(saldoFinal))}
            </div>
            <div className="text-[8px] uppercase tracking-wider mt-1.5 mb-0.5" style={{ color: t.muted }}>Balanço</div>
            <div className="font-mono text-[13px]" style={{ color: balanco >= 0 ? t.green : t.red }}>
              {balanco >= 0 ? '+' : '−'}{fmtK(Math.abs(balanco))}
            </div>
          </div>
          {/* Lançamentos */}
          <div className="px-4 py-3.5">
            <div className="text-[9px] uppercase tracking-wider mb-1.5" style={{ color: t.muted }}>Lançamentos</div>
            <div className="font-mono text-[17px]" style={{ color: t.text }}>{String(filtered.length)}</div>
          </div>
        </div>

        {/* Filters */}
        <div
          className="flex items-center gap-2.5 px-4 py-2.5 shrink-0"
          style={{ borderBottom: `1px solid ${t.border}`, background: `${t.bg}88` }}
        >
          <div className="relative flex-1">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: t.muted }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar descrição, categoria..."
              className="w-full rounded-lg pl-8 pr-2.5 py-2 text-[11px] outline-none"
              style={{
                background: t.surface,
                border: `1px solid ${t.border}`,
                color: t.text,
                fontFamily: 'inherit',
              }}
            />
          </div>
          {(['all', 'concil', 'pend'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className="px-3.5 py-1.5 rounded-lg text-[10px] cursor-pointer transition-all"
              style={{
                border: `1px solid ${filtro === f ? `${t.blue}55` : t.border}`,
                background: filtro === f ? t.blueDim : 'transparent',
                color: filtro === f ? t.blue : t.muted,
                fontWeight: filtro === f ? 600 : 400,
                fontFamily: 'inherit',
              }}
            >
              {f === 'all' ? 'Todos' : f === 'concil' ? 'Conciliados' : 'Pendentes'}
            </button>
          ))}
          <span className="text-[10px] font-mono whitespace-nowrap" style={{ color: t.muted }}>
            {loading ? '...' : `${filtered.length} itens`}
          </span>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-48 gap-2">
              <Loader2 size={18} className="animate-spin" style={{ color: t.blue }} />
              <span className="text-[11px]" style={{ color: t.muted }}>Carregando extrato...</span>
            </div>
          ) : sorted.length === 0 ? (
            <div className="flex items-center justify-center h-48">
              <span className="text-[11px]" style={{ color: t.muted }}>Nenhum lançamento encontrado</span>
            </div>
          ) : (
            <table className="w-full text-[11px]" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: `${t.bg}EE`, position: 'sticky', top: 0, zIndex: 5 }}>
                  <SortHeader label="Data" field="data" sort={sort} onSort={(f) => setSort((prev) => toggleSort(prev, f))} />
                  <SortHeader label="Banco" field="banco" sort={sort} onSort={(f) => setSort((prev) => toggleSort(prev, f))} />
                  <SortHeader label="Valor" field="valor" sort={sort} onSort={(f) => setSort((prev) => toggleSort(prev, f))} align="right" />
                  <SortHeader label="Favorecido" field="descricao" sort={sort} onSort={(f) => setSort((prev) => toggleSort(prev, f))} />
                  <SortHeader label="NF" field="nf" sort={sort} onSort={(f) => setSort((prev) => toggleSort(prev, f))} />
                  <SortHeader label="Categoria" field="categoria" sort={sort} onSort={(f) => setSort((prev) => toggleSort(prev, f))} />
                  <SortHeader label="Status" field="status" sort={sort} onSort={(f) => setSort((prev) => toggleSort(prev, f))} align="center" />
                </tr>
              </thead>
              <tbody>
                {sorted.map((r, i) => {
                  const isE = r.valor > 0
                  return (
                    <tr
                      key={i}
                      className="transition-colors"
                      style={{ borderBottom: `1px solid ${t.border}22` }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLTableRowElement).style.background = isE ? `${t.green}08` : `${t.red}08`
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'
                      }}
                    >
                      <td className="px-3.5 py-2.5 font-mono text-[10px]" style={{ color: t.muted }}>
                        {r.data}
                      </td>
                      <td className="px-3.5 py-2.5 text-[10px]" style={{ color: t.muted }}>
                        {r.banco}
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-mono font-medium" style={{ color: isE ? t.green : t.red }}>
                        {isE ? '+' : '\u2212'} {fmtBRL(r.valor)}
                      </td>
                      <td className="px-3.5 py-2.5 max-w-[200px] truncate" title={r.descricao}>{r.favorecido}</td>
                      <td className="px-3.5 py-2.5 font-mono text-[10px]" style={{ color: t.muted }}>{r.nf || '—'}</td>
                      <td
                        className="px-3.5 py-2.5 text-[10px] max-w-[140px] truncate"
                        style={{ color: t.muted }}
                        title={`${r.catCod} — ${getCatDesc(r.catCod)}`}
                      >
                        {getCatDesc(r.catCod)}
                      </td>
                      <td className="px-3.5 py-2.5 text-center">
                        <ConcilBadge ok={r.conciliado} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Right: Saldo por Conta */}
      <div className="p-4 overflow-y-auto flex flex-col gap-3">
        <div className="text-[10px] uppercase tracking-[1.5px] font-medium" style={{ color: t.muted }}>
          Saldo por Conta
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-24">
            <Loader2 size={14} className="animate-spin" style={{ color: t.blue }} />
          </div>
        ) : (
          contas.filter((c) => c.saldo !== 0).length === 0 ? (
            <div className="text-[10px]" style={{ color: t.muted }}>Nenhuma conta com movimento</div>
          ) : (
            contas.filter((c) => c.saldo !== 0).map((c, i) => (
              <div
                key={i}
                className="rounded-lg p-3"
                style={{ background: t.surface, border: `1px solid ${t.border}` }}
              >
                <div className="flex items-center gap-1.5 text-[10px] mb-1.5" style={{ color: t.muted }}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: c.cor }} />
                  {c.nome}
                </div>
                <div className="font-mono text-base" style={{ color: c.saldo >= 0 ? t.text : t.red }}>
                  {fmtBRL(c.saldo)}
                </div>
                <div className="h-0.5 rounded-sm mt-2 overflow-hidden" style={{ background: `${t.text}08` }}>
                  <div
                    className="h-full rounded-sm"
                    style={{
                      width: `${(Math.abs(c.saldo) / maxSaldo) * 100}%`,
                      background: c.cor,
                      opacity: 0.6,
                    }}
                  />
                </div>
              </div>
            ))
          )
        )}
      </div>
    </div>
  )
}
