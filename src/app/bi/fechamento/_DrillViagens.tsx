'use client'
/* ═══════════════════════════════════════════════════════════════
   Drill-down até a viagem (Fase D — profundidade, 2026-07-29).

   Modal aberto pelo clique num fechamento da tabela "Fechamentos do
   recorte" (tela Faturamento). Mostra as viagens do SNAPSHOT daquele
   fechamento — verdade histórica vinda do Motor via
   /fechamento-bi/fechamentos/{id}/viagens; nada é recalculado aqui.
   fmtInt em leitura (fmtK é exclusivo de gráfico). Prefixo _ tira o
   arquivo do roteamento do App Router.
   ═══════════════════════════════════════════════════════════════ */
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useThemeStore } from '@/store/themeStore'
import { fmtInt } from '@/lib/formatters'
import {
  useFechamentoBiViagens,
  type FechamentoBiFechamentoAPI,
  type FechamentoBiViagemAPI,
} from '@/hooks/api/useFechamentoBi'

function fmtData(iso: string | null): string {
  if (!iso || iso.length < 10) return '—'
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(2, 4)}`
}

type SortCol = 'dt' | 'motorista' | 'cliente' | 'razao' | 'custo_motorista' | 'resultado' | 'km'

export function DrillViagensModal({
  fechamento,
  onClose,
}: {
  fechamento: FechamentoBiFechamentoAPI | null
  onClose: () => void
}) {
  const t = useThemeStore((s) => s.tokens)
  const { data, loading, error, refetch } = useFechamentoBiViagens(fechamento?.id ?? null)
  const [sortCol, setSortCol] = useState<SortCol>('dt')
  const [sortAsc, setSortAsc] = useState(true)

  // Reabrir com outro fechamento volta à ordenação padrão (cronológica).
  useEffect(() => {
    setSortCol('dt')
    setSortAsc(true)
  }, [fechamento?.id])

  useEffect(() => {
    if (!fechamento) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [fechamento, onClose])

  const viagens = useMemo(() => {
    const rows = [...(data?.viagens ?? [])]
    const dir = sortAsc ? 1 : -1
    rows.sort((a, b) => {
      const va = a[sortCol]
      const vb = b[sortCol]
      if (typeof va === 'string' || typeof vb === 'string') {
        return String(va ?? '').localeCompare(String(vb ?? '')) * dir
      }
      return ((va as number ?? 0) - (vb as number ?? 0)) * dir
    })
    return rows
  }, [data, sortCol, sortAsc])

  if (!fechamento) return null

  const temNavio = (data?.viagens ?? []).some((v) => v.navio)
  const toggleSort = (col: SortCol) => {
    if (sortCol === col) setSortAsc((a) => !a)
    else {
      setSortCol(col)
      setSortAsc(col === 'dt' || col === 'motorista' || col === 'cliente')
    }
  }

  const th = (label: string, col: SortCol | null, align: 'left' | 'right' = 'right') => (
    <th
      className={`text-${align} py-2 px-2 font-normal whitespace-nowrap ${col ? 'cursor-pointer select-none' : ''}`}
      style={{ color: sortCol === col ? t.gold : t.muted }}
      onClick={col ? () => toggleSort(col) : undefined}
    >
      {label}
      {col && sortCol === col && <span className="ml-1 text-[8px]">{sortAsc ? '▲' : '▼'}</span>}
    </th>
  )

  const tot = data?.totais

  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Viagens do fechamento ${fechamento.periodo_label ?? fechamento.id}`}
    >
      <div
        className="rounded-xl w-full flex flex-col"
        style={{ background: t.surface, border: `1px solid ${t.border}`, maxWidth: 1080, maxHeight: '88vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3" style={{ borderBottom: `1px solid ${t.border}` }}>
          <div>
            <div className="text-sm" style={{ color: t.text, fontFamily: 'var(--font-display)' }}>
              {fechamento.periodo_label || `${fmtData(fechamento.dt_ini)} – ${fmtData(fechamento.dt_fim)}`}
              <span className="ml-2" style={{ color: t.textSec }}>· {fechamento.unidade_nome}</span>
            </div>
            <div className="text-[10px] mt-0.5" style={{ color: t.muted, fontFamily: 'var(--font-mono)', letterSpacing: '0.12em' }}>
              VIAGENS DO FECHAMENTO · {fmtData(fechamento.dt_ini)} → {fmtData(fechamento.dt_fim)} · SNAPSHOT CONSOLIDADO
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="p-1.5 rounded-lg shrink-0 transition-colors"
            style={{ color: t.muted, border: `1px solid ${t.border}` }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Totais */}
        {tot && (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-px px-5 py-3" style={{ borderBottom: `1px solid ${t.border}` }}>
            {[
              { label: 'Viagens', val: fmtInt(tot.viagens), cor: t.text },
              { label: 'Faturamento', val: `R$ ${fmtInt(tot.razao)}`, cor: t.gold },
              { label: 'Custo motorista', val: `R$ ${fmtInt(tot.custo_motorista)}`, cor: t.red },
              { label: 'Resultado', val: `R$ ${fmtInt(tot.resultado)}`, cor: tot.resultado >= 0 ? t.green : t.red },
              { label: 'Cabeças', val: fmtInt(tot.cabecas), cor: t.textSec },
              { label: 'KM', val: fmtInt(tot.km), cor: t.textSec },
            ].map((k) => (
              <div key={k.label}>
                <div className="text-[9px]" style={{ color: t.muted, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{k.label}</div>
                <div className="text-sm font-mono" style={{ color: k.cor }}>{k.val}</div>
              </div>
            ))}
          </div>
        )}

        {/* Corpo */}
        <div className="overflow-auto px-5 py-3" style={{ flex: 1 }}>
          {error ? (
            <div role="alert" className="rounded-lg px-4 py-3 flex items-center justify-between gap-4 text-xs" style={{ background: t.redDim, border: `1px solid ${t.red}55`, color: t.text }}>
              <span>Falha ao carregar as viagens: {error}</span>
              <button onClick={refetch} className="px-3 py-1.5 rounded-lg shrink-0" style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.text }}>
                Tentar de novo
              </button>
            </div>
          ) : loading || !data ? (
            <div className="py-10 text-center text-xs" style={{ color: t.muted }}>Carregando viagens…</div>
          ) : viagens.length === 0 ? (
            <div className="py-10 text-center text-xs" style={{ color: t.muted }}>Fechamento sem viagens no snapshot.</div>
          ) : (
            <table className="w-full text-xs" style={{ minWidth: 860 }}>
              <thead className="sticky top-0" style={{ background: t.surface }}>
                <tr>
                  {th('Data', 'dt', 'left')}
                  {th('Motorista', 'motorista', 'left')}
                  {th('Cliente', 'cliente', 'left')}
                  <th className="text-left py-2 px-2 font-normal" style={{ color: t.muted }}>Placa</th>
                  {temNavio && <th className="text-left py-2 px-2 font-normal" style={{ color: t.muted }}>Navio</th>}
                  {th('KM', 'km')}
                  <th className="text-right py-2 px-2 font-normal" style={{ color: t.muted }}>Cab.</th>
                  {th('Razão', 'razao')}
                  {th('Custo mot.', 'custo_motorista')}
                  {th('Resultado', 'resultado')}
                </tr>
              </thead>
              <tbody>
                {viagens.map((v: FechamentoBiViagemAPI, i) => (
                  <tr key={v.id ?? i} style={{ borderTop: `1px solid ${t.border}` }}>
                    <td className="py-1.5 px-2 font-mono whitespace-nowrap" style={{ color: t.textSec }}>
                      {fmtData(v.dt)}
                      {v.combinada && (
                        <span className="ml-1.5 text-[8px] px-1 py-0.5 rounded" style={{ color: t.purple, background: `${t.purple}22` }} title="Viagem combinada">
                          COMB
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 px-2" style={{ color: t.text }}>{v.motorista}</td>
                    <td className="py-1.5 px-2" style={{ color: t.textSec }}>{v.cliente}</td>
                    <td className="py-1.5 px-2 font-mono" style={{ color: t.textSec }}>{v.placa}</td>
                    {temNavio && <td className="py-1.5 px-2" style={{ color: t.textSec }}>{v.navio ?? '—'}</td>}
                    <td className="py-1.5 px-2 text-right font-mono" style={{ color: t.textSec }}>{fmtInt(v.km)}</td>
                    <td className="py-1.5 px-2 text-right font-mono" style={{ color: t.textSec }}>{v.cabecas ? fmtInt(v.cabecas) : '—'}</td>
                    <td className="py-1.5 px-2 text-right font-mono" style={{ color: t.text }}>R$ {fmtInt(v.razao)}</td>
                    <td className="py-1.5 px-2 text-right font-mono" style={{ color: t.textSec }}>R$ {fmtInt(v.custo_motorista)}</td>
                    <td className="py-1.5 px-2 text-right font-mono" style={{ color: v.resultado >= 0 ? t.green : t.red }}>
                      R$ {fmtInt(v.resultado)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
