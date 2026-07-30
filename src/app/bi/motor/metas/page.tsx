'use client'
/* ═══════════════════════════════════════════════════════════════
   BI do Motor · Metas — grid unidade × mês (Fase D profundidade).

   Metas de FATURAMENTO e MARGEM por unidade/mês, salvas no banco do
   Portal (PUT /fechamento-bi/metas — o Motor é read-only por design).
   Quem tem fechamento:bi VÊ as metas; editar exige fechamento:metas
   (o GET devolve pode_editar — a UI espelha, o backend é a barreira).
   Campo vazio = sem meta; mês com as duas métricas vazias é removido.
   ═══════════════════════════════════════════════════════════════ */
import { useEffect, useMemo, useState } from 'react'
import { Save, Target } from 'lucide-react'
import { useThemeStore } from '@/store/themeStore'
import { useBiMotorStore } from '@/store/biMotorStore'
import { GlowLine } from '@/components/ui/GlowLine'
import { fmtInt } from '@/lib/formatters'
import {
  useFechamentoBiFiltros,
  useMetasFechamento,
  saveMetasFechamento,
} from '@/hooks/api/useFechamentoBi'
import { MESES, BiErro, BiCarregando, cardHeading } from '../_shared'

type Grid = { faturamento: string; margem: string }[]

const gridVazio = (): Grid =>
  Array.from({ length: 12 }, () => ({ faturamento: '', margem: '' }))

const parseCampo = (raw: string): number | null => {
  if (raw.trim() === '') return null
  const n = Number(raw)
  return Number.isFinite(n) && n >= 0 ? n : null
}

export default function MetasPage() {
  const t = useThemeStore((s) => s.tokens)
  const ano = useBiMotorStore((s) => s.ano)
  const unidadeGlobal = useBiMotorStore((s) => s.unidadeId)

  const filtros = useFechamentoBiFiltros()
  // Todas as unidades entram — meta é por mês-calendário, e o BI
  // executivo agrega viagens de unidade NAVIO por mês do mesmo jeito.
  const unidades = useMemo(() => filtros.data?.unidades ?? [], [filtros.data])

  // Unidade em edição: filtro global quando setado, senão a primeira.
  const [unidadeSel, setUnidadeSel] = useState<number | null>(null)
  useEffect(() => {
    if (unidadeSel !== null && unidades.some((u) => u.id === unidadeSel)) return
    setUnidadeSel(
      unidadeGlobal && unidades.some((u) => u.id === unidadeGlobal)
        ? unidadeGlobal
        : unidades[0]?.id ?? null,
    )
  }, [unidades, unidadeGlobal, unidadeSel])

  const { data, loading, error, refetch } = useMetasFechamento({
    ano,
    unidade_id: unidadeSel,
  })

  const [grid, setGrid] = useState<Grid>(gridVazio)
  const [salvando, setSalvando] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  // Re-semeia o grid quando o recorte (ano/unidade) responde — edição em
  // curso é da MESMA resposta, então trocar de recorte descarta rascunho.
  useEffect(() => {
    if (!data) return
    const novo = gridVazio()
    for (const m of data.metas) {
      if (m.mes < 1 || m.mes > 12) continue
      novo[m.mes - 1] = {
        faturamento: m.faturamento != null ? String(m.faturamento) : '',
        margem: m.margem != null ? String(m.margem) : '',
      }
    }
    setGrid(novo)
  }, [data])

  const podeEditar = data?.pode_editar ?? false

  const setCampo = (i: number, campo: keyof Grid[number], valor: string) =>
    setGrid((g) => g.map((row, j) => (j === i ? { ...row, [campo]: valor } : row)))

  const repetirJan = (campo: keyof Grid[number]) =>
    setGrid((g) => g.map((row) => ({ ...row, [campo]: g[0][campo] })))

  const totais = useMemo(() => {
    const soma = (campo: keyof Grid[number]) =>
      grid.reduce((acc, row) => acc + (parseCampo(row[campo]) ?? 0), 0)
    return { faturamento: soma('faturamento'), margem: soma('margem') }
  }, [grid])

  const salvar = async () => {
    if (unidadeSel === null) return
    setSalvando(true)
    try {
      await saveMetasFechamento({
        ano,
        unidade_id: unidadeSel,
        metas: grid.map((row, i) => ({
          mes: i + 1,
          faturamento: parseCampo(row.faturamento),
          margem: parseCampo(row.margem),
        })),
      })
      refetch()
      setToast({ msg: 'Metas salvas', type: 'ok' })
    } catch {
      setToast({ msg: 'Falha ao salvar — tente de novo', type: 'err' })
    } finally {
      setSalvando(false)
      setTimeout(() => setToast(null), 2500)
    }
  }

  const cardStyle = { background: t.surface, border: `1px solid ${t.border}` } as const
  const inputStyle = {
    background: t.bg, border: `1px solid ${t.border}`, color: t.text,
  } as const

  if (error) return <BiErro erro={error} onRetry={refetch} />
  if (filtros.error) return <BiErro erro={filtros.error} onRetry={filtros.refetch} />
  if ((loading || filtros.loading) && !data) return <BiCarregando />

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="rounded-xl p-4 relative" style={cardStyle}>
        <GlowLine color={t.gold} />
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Target size={15} style={{ color: t.gold }} />
            <div>
              <div className="text-sm" style={{ color: t.text, fontFamily: 'var(--font-display)' }}>
                Metas {ano}
              </div>
              <div className="text-[10px]" style={{ color: t.muted }}>
                Faturamento e margem por unidade/mês — aparecem na Visão Executiva
              </div>
            </div>
          </div>
          <select
            value={unidadeSel ?? ''}
            onChange={(e) => setUnidadeSel(e.target.value ? Number(e.target.value) : null)}
            className="rounded-lg px-3 py-1.5 text-xs focus:outline-none"
            style={inputStyle}
            aria-label="Unidade da meta"
          >
            {unidades.map((u) => (
              <option key={u.id} value={u.id} style={{ background: t.surface, color: t.text }}>
                {u.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!podeEditar && (
        <div
          className="rounded-xl px-4 py-3 text-xs"
          style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.muted }}
        >
          Modo consulta — editar metas exige a permissão{' '}
          <span style={{ color: t.gold }}>fechamento:metas</span> (solicite ao administrador).
        </div>
      )}

      <div className="rounded-xl p-4 relative" style={cardStyle}>
        <GlowLine color={t.blue} />
        {cardHeading(t, `Meta mensal — ${unidades.find((u) => u.id === unidadeSel)?.nome ?? ''}`)}
        <table className="w-full text-xs">
          <thead>
            <tr style={{ color: t.muted }}>
              <th className="text-left py-2 font-normal w-16">Mês</th>
              <th className="text-right py-2 font-normal">
                Meta faturamento (R$)
                {podeEditar && (
                  <button
                    onClick={() => repetirJan('faturamento')}
                    className="ml-2 px-1.5 py-0.5 rounded text-[9px]"
                    style={{ border: `1px solid ${t.border}`, color: t.muted }}
                    title="Copiar o valor de JAN para todos os meses"
                  >
                    repetir JAN ↓
                  </button>
                )}
              </th>
              <th className="text-right py-2 font-normal">
                Meta margem (R$)
                {podeEditar && (
                  <button
                    onClick={() => repetirJan('margem')}
                    className="ml-2 px-1.5 py-0.5 rounded text-[9px]"
                    style={{ border: `1px solid ${t.border}`, color: t.muted }}
                    title="Copiar o valor de JAN para todos os meses"
                  >
                    repetir JAN ↓
                  </button>
                )}
              </th>
            </tr>
          </thead>
          <tbody>
            {grid.map((row, i) => (
              <tr key={MESES[i]} style={{ borderTop: `1px solid ${t.border}` }}>
                <td className="py-1.5 font-mono" style={{ color: t.textSec }}>{MESES[i]}</td>
                {(['faturamento', 'margem'] as const).map((campo) => (
                  <td key={campo} className="py-1.5 text-right">
                    {podeEditar ? (
                      <input
                        type="number"
                        min={0}
                        step={1000}
                        value={row[campo]}
                        onChange={(e) => setCampo(i, campo, e.target.value)}
                        placeholder="—"
                        aria-label={`Meta de ${campo} de ${MESES[i]}`}
                        className="w-40 rounded px-2 py-1 text-right font-mono text-xs focus:outline-none"
                        style={inputStyle}
                      />
                    ) : (
                      <span className="font-mono" style={{ color: t.text }}>
                        {row[campo] !== '' ? `R$ ${fmtInt(Number(row[campo]))}` : '—'}
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
            <tr style={{ borderTop: `1px solid ${t.border}` }}>
              <td className="py-2 font-mono" style={{ color: t.muted }}>ANO</td>
              <td className="py-2 text-right font-mono" style={{ color: t.gold }}>
                R$ {fmtInt(totais.faturamento)}
              </td>
              <td className="py-2 text-right font-mono" style={{ color: t.green }}>
                R$ {fmtInt(totais.margem)}
              </td>
            </tr>
          </tbody>
        </table>

        {podeEditar && (
          <div className="flex items-center justify-end gap-3 mt-4">
            {toast && (
              <span
                role="status"
                className="text-xs"
                style={{ color: toast.type === 'ok' ? t.green : t.red }}
              >
                {toast.msg}
              </span>
            )}
            <button
              onClick={salvar}
              disabled={salvando || unidadeSel === null}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs disabled:opacity-50"
              style={{ background: t.goldDim, border: `1px solid ${t.gold}55`, color: t.gold }}
            >
              <Save size={12} />
              {salvando ? 'Salvando…' : 'Salvar metas da unidade'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
