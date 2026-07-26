'use client'
/* ═══════════════════════════════════════════════════════════════
   BI de Fechamento · Faturamento 5 anos — comparativo plurianual
   (GET /fechamento-bi/faturamento-anual). Acessada pelo botão
   "Comparar 5 anos" no card mensal do Faturamento (fora da barra de
   abas — indicador de alta gestão, validação 2026-07-23).

   UM gráfico mensal com tooltip rico: ao passar o mouse num mês,
   compara aquele MÊS entre os anos e o ACUMULADO até ali entre os
   anos (o antigo chart YTD separado virou esta camada do tooltip).
   Respeita UNIDADE e NAVIO; ano/mês/quinzena não se aplicam.
   fmtInt em leitura; fmtK só em eixos.
   ═══════════════════════════════════════════════════════════════ */
import { useMemo } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import {
  ResponsiveContainer, ComposedChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { useThemeStore, type ThemeTokens } from '@/store/themeStore'
import { useBiFechamentoStore } from '@/store/biFechamentoStore'
import { GlowLine } from '@/components/ui/GlowLine'
import { fmtInt, fmtPct, fmtK } from '@/lib/formatters'
import { useFechamentoBiFaturamentoAnual, type FechamentoBiAnoAPI } from '@/hooks/api/useFechamentoBi'
import { MESES, MesTriTick, BiErro, BiCarregando, BiVazio, cardHeading } from '../_shared'

const MAX_ANOS = 5

interface LinhaTooltip {
  ano: number
  cor: string
  mes: number
  acum: number
  varMes: number | null
  varAcum: number | null
}

/** Tooltip no formato do Power BI de referência: tabela com ANO | Mês |
 *  %YoY | YTD | %YoY — mês e acumulado comparados entre os anos. */
function TooltipCincoAnos({
  active, label, linhasPorMes, t,
}: {
  active?: boolean
  label?: string
  linhasPorMes: Record<string, LinhaTooltip[]>
  t: ThemeTokens
}) {
  const linhas = active && label ? linhasPorMes[label] : undefined
  if (!linhas?.length) return null
  const delta = (v: number | null) =>
    v == null ? <span style={{ color: t.muted }}>—</span> : (
      <span className="font-mono" style={{ color: v >= 0 ? t.green : t.red }}>
        {v >= 0 ? '▲' : '▼'} {fmtPct(Math.abs(v))}
      </span>
    )
  const th = { color: t.muted, fontWeight: 600 } as const
  return (
    <div
      className="rounded-lg"
      style={{
        background: t.surfaceElevated,
        border: `1px solid ${t.borderHover}`,
        padding: '10px 12px',
        boxShadow: t.tooltipShadow,
      }}
    >
      <table className="text-[11px]" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr className="text-[9.5px] uppercase" style={{ borderBottom: `1px solid ${t.border}` }}>
            <th className="text-left pr-3 pb-1" style={th}>Ano</th>
            <th className="text-right pr-3 pb-1" style={th}>{label}</th>
            <th className="text-right pr-3 pb-1" style={th}>%YoY</th>
            <th className="text-right pr-3 pb-1" style={th}>YTD</th>
            <th className="text-right pb-1" style={th}>%YoY</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l, i) => (
            <tr key={l.ano} style={i === 0 ? { background: `${t.gold}14` } : undefined}>
              <td className="pr-3 py-1">
                <span className="inline-block w-1.5 h-1.5 rounded-sm mr-1.5 align-middle" style={{ background: l.cor }} />
                <span className="font-mono" style={{ color: t.text }}>{l.ano}</span>
              </td>
              <td className="pr-3 py-1 text-right font-mono" style={{ color: t.text }}>
                {l.mes > 0 ? fmtK(l.mes) : '—'}
              </td>
              <td className="pr-3 py-1 text-right">{l.mes > 0 ? delta(l.varMes) : <span style={{ color: t.muted }}>—</span>}</td>
              <td className="pr-3 py-1 text-right font-mono" style={{ color: t.text }}>
                {l.acum > 0 ? fmtK(l.acum) : '—'}
              </td>
              <td className="py-1 text-right">{l.acum > 0 ? delta(l.varAcum) : <span style={{ color: t.muted }}>—</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function Faturamento5AnosPage() {
  const t = useThemeStore((s) => s.tokens)
  const unidadeId = useBiFechamentoStore((s) => s.unidadeId)
  const navioId = useBiFechamentoStore((s) => s.navioId)
  const { data, loading, error, refetch } = useFechamentoBiFaturamentoAnual({
    unidade_id: unidadeId, navio_id: navioId,
  })

  // 5 anos mais recentes, do mais antigo pro mais novo (linhas do gráfico).
  const anos = useMemo(() => (data?.anos ?? []).slice(-MAX_ANOS), [data])

  // Paleta por ano — o mais recente ganha o dourado.
  const cores = useMemo(() => {
    const base = [t.muted, t.purple, t.green, t.blue, t.gold]
    return anos.map((_, i) => base[base.length - anos.length + i] ?? t.muted)
  }, [anos, t])

  const serieMensal = useMemo(
    () =>
      MESES.map((name, i) => {
        const row: Record<string, number | string> = { name }
        for (const y of anos) row[String(y.ano)] = y.serie_mensal[i]?.faturamento ?? 0
        return row
      }),
    [anos],
  )

  // Linhas do tooltip por mês: valor do mês + acumulado até o mês, com Δ%
  // contra o ano IMEDIATAMENTE anterior na lista. Anos em ordem desc.
  const linhasPorMes = useMemo(() => {
    const acumulado = (y: FechamentoBiAnoAPI, ate: number) =>
      y.serie_mensal.slice(0, ate + 1).reduce((s, m) => s + m.faturamento, 0)
    const out: Record<string, LinhaTooltip[]> = {}
    MESES.forEach((name, i) => {
      out[name] = [...anos].reverse().map((y) => {
        const idxAno = anos.findIndex((a) => a.ano === y.ano)
        const anterior = idxAno > 0 ? anos[idxAno - 1] : null
        const mes = y.serie_mensal[i]?.faturamento ?? 0
        const acum = acumulado(y, i)
        const mesAnt = anterior?.serie_mensal[i]?.faturamento ?? 0
        const acumAnt = anterior ? acumulado(anterior, i) : 0
        return {
          ano: y.ano,
          cor: cores[idxAno],
          mes,
          acum,
          varMes: mesAnt > 0 ? ((mes - mesAnt) / mesAnt) * 100 : null,
          varAcum: acumAnt > 0 ? ((acum - acumAnt) / acumAnt) * 100 : null,
        }
      })
    })
    return out
  }, [anos, cores])

  const cardStyle = { background: t.surface, border: `1px solid ${t.border}` } as const

  if (error) return <BiErro erro={error} onRetry={refetch} />
  if (loading && !data) return <BiCarregando />
  if (!data) return null

  if (anos.length === 0) {
    return <BiVazio mensagem="Nenhum fechamento no histórico do Motor para o filtro selecionado. O comparativo plurianual depende do import do histórico 2024/25." />
  }

  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/bi/fechamento"
          className="inline-flex items-center gap-1.5 text-[11px] rounded-full px-2.5 py-1"
          style={{ color: t.muted, border: `1px solid ${t.border}` }}
        >
          <ArrowLeft size={12} /> Voltar ao Faturamento
        </Link>
      </div>

      {/* Resumo por ano */}
      <div className="rounded-xl p-4 relative overflow-x-auto" style={cardStyle}>
        <GlowLine color={t.gold} />
        {cardHeading(t, 'Faturamento ano a ano — filtros de unidade/navio aplicados; mês e quinzena/dezena não valem nesta visão')}
        <table className="w-full text-xs" style={{ minWidth: 560 }}>
          <thead>
            <tr style={{ color: t.muted }}>
              <th className="text-left py-2 font-normal">Ano</th>
              <th className="text-right py-2 font-normal">Fechamentos</th>
              <th className="text-right py-2 font-normal">Viagens</th>
              <th className="text-right py-2 font-normal">Faturamento</th>
              <th className="text-right py-2 font-normal">Δ vs ano anterior</th>
              <th className="text-right py-2 font-normal">Margem</th>
            </tr>
          </thead>
          <tbody>
            {[...anos].reverse().map((y) => (
              <tr key={y.ano} style={{ borderTop: `1px solid ${t.border}` }}>
                <td className="py-2 font-mono" style={{ color: t.text }}>{y.ano}</td>
                <td className="py-2 text-right font-mono" style={{ color: t.textSec }}>{fmtInt(y.fechamentos)}</td>
                <td className="py-2 text-right font-mono" style={{ color: t.textSec }}>{fmtInt(y.viagens)}</td>
                <td className="py-2 text-right font-mono" style={{ color: t.text }}>R$ {fmtInt(y.faturamento)}</td>
                <td className="py-2 text-right font-mono" style={{ color: y.var_pct == null ? t.muted : y.var_pct >= 0 ? t.green : t.red }}>
                  {y.var_pct == null ? '—' : `${y.var_pct >= 0 ? '▲' : '▼'} ${fmtPct(Math.abs(y.var_pct))}`}
                </td>
                <td className="py-2 text-right font-mono" style={{ color: y.margem >= 0 ? t.green : t.red }}>
                  R$ {fmtInt(y.margem)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mensal por ano — tooltip com mês e acumulado comparados entre anos */}
      <div className="rounded-xl p-4 relative" style={cardStyle}>
        <GlowLine color={t.blue} />
        {cardHeading(t, `Faturamento mês a mês — ${anos[0].ano} a ${anos[anos.length - 1].ano} (tooltip compara o mês e o acumulado entre os anos)`)}
        <div style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={serieMensal} margin={{ top: 20 }}>
              <CartesianGrid vertical={false} stroke={t.gridLine} />
              <XAxis dataKey="name" tick={<MesTriTick t={t} />} height={34} axisLine={false} tickLine={false} interval={0} />
              <YAxis tick={{ fontSize: 9, fill: t.muted }} axisLine={false} tickLine={false} tickFormatter={(v) => fmtK(v)} />
              <Tooltip content={<TooltipCincoAnos linhasPorMes={linhasPorMes} t={t} />} />
              <Legend wrapperStyle={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }} />
              {anos.map((y, i) => {
                const atual = i === anos.length - 1
                return (
                  <Line
                    key={y.ano}
                    type="monotone"
                    dataKey={String(y.ano)}
                    stroke={cores[i]}
                    strokeWidth={atual ? 2.5 : 1.5}
                    dot={atual ? { r: 2.5, fill: cores[i], strokeWidth: 0 } : false}
                    // Rótulo de valor em cada mês só no ano corrente —
                    // marcação pedida na validação sem poluir os 5 anos.
                    label={atual ? {
                      position: 'top', formatter: (v: number) => (v > 0 ? fmtK(v) : ''),
                      fontSize: 9, fill: cores[i], fontFamily: "'JetBrains Mono', monospace",
                    } : undefined}
                  />
                )
              })}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
