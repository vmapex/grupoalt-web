'use client'
/* ═══════════════════════════════════════════════════════════════
   BI de Fechamento · Faturamento 5 anos — comparativo plurianual do
   histórico consolidado (GET /fechamento-bi/faturamento-anual). Os
   anos são descobertos do próprio histórico; a tela mostra os 5 mais
   recentes. Respeita os filtros de UNIDADE e NAVIO; ano/mês/quinzena
   não se aplicam a esta visão (nota no cabeçalho).
   fmtInt em leitura; fmtK só em eixos/labels de gráfico.
   ═══════════════════════════════════════════════════════════════ */
import { useMemo } from 'react'
import {
  ResponsiveContainer, ComposedChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { useThemeStore } from '@/store/themeStore'
import { useBiFechamentoStore } from '@/store/biFechamentoStore'
import { GlowLine } from '@/components/ui/GlowLine'
import { CustomTooltip } from '@/components/charts/CustomTooltip'
import { fmtInt, fmtPct, fmtK } from '@/lib/formatters'
import { useFechamentoBiFaturamentoAnual } from '@/hooks/api/useFechamentoBi'
import { MESES, BiErro, BiCarregando, BiVazio, cardHeading } from '../_shared'

const MAX_ANOS = 5

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

  // Acumulado YTD por ano (soma progressiva da série mensal).
  const serieAcumulada = useMemo(
    () =>
      MESES.map((name, i) => {
        const row: Record<string, number | string> = { name }
        for (const y of anos) {
          row[String(y.ano)] = y.serie_mensal
            .slice(0, i + 1)
            .reduce((s, m) => s + m.faturamento, 0)
        }
        return row
      }),
    [anos],
  )

  const cardStyle = { background: t.surface, border: `1px solid ${t.border}` } as const

  if (error) return <BiErro erro={error} onRetry={refetch} />
  if (loading && !data) return <BiCarregando />
  if (!data) return null

  if (anos.length === 0) {
    return <BiVazio mensagem="Nenhum fechamento no histórico do Motor para o filtro selecionado. O comparativo plurianual depende do import do histórico 2024/25." />
  }

  const legenda = { fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }

  return (
    <div className="space-y-5">
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

      {/* Mensal por ano */}
      <div className="rounded-xl p-4 relative" style={cardStyle}>
        <GlowLine color={t.blue} />
        {cardHeading(t, `Faturamento mês a mês — ${anos[0].ano} a ${anos[anos.length - 1].ano}`)}
        <div style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={serieMensal}>
              <CartesianGrid vertical={false} stroke={t.gridLine} />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: t.muted, fontFamily: "'JetBrains Mono', monospace" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: t.muted }} axisLine={false} tickLine={false} tickFormatter={(v) => fmtK(v)} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={legenda} />
              {anos.map((y, i) => (
                <Line
                  key={y.ano}
                  type="monotone"
                  dataKey={String(y.ano)}
                  stroke={cores[i]}
                  strokeWidth={i === anos.length - 1 ? 2.5 : 1.5}
                  dot={false}
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Acumulado YTD por ano */}
      <div className="rounded-xl p-4 relative" style={cardStyle}>
        <GlowLine color={t.purple} />
        {cardHeading(t, 'Acumulado no ano (YTD) — corrida mês a mês entre os anos')}
        <div style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={serieAcumulada}>
              <CartesianGrid vertical={false} stroke={t.gridLine} />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: t.muted, fontFamily: "'JetBrains Mono', monospace" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: t.muted }} axisLine={false} tickLine={false} tickFormatter={(v) => fmtK(v)} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={legenda} />
              {anos.map((y, i) => (
                <Line
                  key={y.ano}
                  type="monotone"
                  dataKey={String(y.ano)}
                  stroke={cores[i]}
                  strokeWidth={i === anos.length - 1 ? 2.5 : 1.5}
                  dot={false}
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
