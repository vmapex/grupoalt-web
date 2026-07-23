'use client'
/* ═══════════════════════════════════════════════════════════════
   BI de Fechamento · Custo × Faturamento — lente de custo sobre o
   histórico consolidado + curva ABC de agregados (custo por
   motorista, das linhas_resumo dos fechamentos). Mesmo endpoint da
   tela Faturamento — outra lente. fmtInt em leitura; fmtK só em
   eixos/labels de gráfico.
   ═══════════════════════════════════════════════════════════════ */
import { useMemo } from 'react'
import {
  ResponsiveContainer, ComposedChart, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, LabelList,
} from 'recharts'
import { useThemeStore } from '@/store/themeStore'
import { KPICard } from '@/components/ui/KPICard'
import { GlowLine } from '@/components/ui/GlowLine'
import { CustomTooltip } from '@/components/charts/CustomTooltip'
import { fmtInt, fmtPct, fmtK } from '@/lib/formatters'
import { MESES, BiErro, BiCarregando, BiVazio, cardHeading } from '../_shared'
import { useResumoComRecorte } from '../_useResumo'

export default function CustoFaturamentoPage() {
  const t = useThemeStore((s) => s.tokens)
  const {
    data, loading, error, refetch, ano, mes,
    recorteAtivo, labelRecorte, visao,
  } = useResumoComRecorte()

  const serie = useMemo(() => {
    if (!visao) return []
    return visao.serieMensal.map((m, i) => ({
      name: MESES[i],
      custo: m.custo,
      receita: m.faturamento,
      custoPct: m.faturamento > 0 ? (m.custo / m.faturamento) * 100 : 0,
    }))
  }, [visao])

  const porUnidadeCusto = useMemo(
    () => (visao ? [...visao.porUnidade].sort((a, b) => b.custo - a.custo) : []),
    [visao],
  )

  // Curva ABC com % acumulado (sobre o custo total dos agregados listados).
  const abc = useMemo(() => {
    const lista = data?.abc_agregados ?? []
    const total = lista.reduce((s, m) => s + m.custo, 0)
    let acum = 0
    return lista.slice(0, 15).map((m) => {
      acum += m.custo
      return { ...m, share: total > 0 ? (m.custo / total) * 100 : 0, acumPct: total > 0 ? (acum / total) * 100 : 0 }
    })
  }, [data])

  const cardStyle = { background: t.surface, border: `1px solid ${t.border}` } as const

  if (error) return <BiErro erro={error} onRetry={refetch} />
  if (loading && !visao) return <BiCarregando />
  if (!visao) return null

  const k = visao.kpis
  const sufixoRecorte = recorteAtivo ? ` · ${labelRecorte}` : ''

  return (
    <div className="space-y-5">
      {k.fechamentos === 0 && (
        <BiVazio mensagem={`Nenhum fechamento processado no recorte selecionado (${ano}${mes ? ` · ${MESES[mes - 1]}` : ''}${sufixoRecorte}).`} />
      )}

      {/* KPI strip — lente de custo */}
      <div className="rounded-xl overflow-hidden relative" style={cardStyle}>
        <GlowLine color={t.red} />
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
          <KPICard
            label="Custo total"
            value={`R$ ${fmtInt(k.custo)}`}
            color={t.text}
            accent={t.red}
            sub={`${fmtInt(k.fechamentos)} fechamento(s)${sufixoRecorte}`}
          />
          <KPICard
            label="% sobre a receita"
            value={k.faturamento > 0 ? fmtPct((k.custo / k.faturamento) * 100) : '—'}
            color={t.amber}
            accent={t.amber}
            sub={`receita R$ ${fmtInt(k.faturamento)}`}
          />
          <KPICard
            label="Custo / viagem"
            value={k.viagens > 0 ? `R$ ${fmtInt(k.custo / k.viagens)}` : '—'}
            color={t.text}
            accent={t.red}
            sub={`${fmtInt(k.viagens)} viagens`}
          />
          <KPICard
            label="Custo / cabeça"
            value={k.cabecas != null && k.cabecas > 0 ? `R$ ${fmtInt(k.custo / k.cabecas)}` : '—'}
            color={t.text}
            accent={t.red}
            sub={k.cabecas == null ? 'indisponível no recorte intra-mês' : `${fmtInt(k.cabecas)} cabeças`}
          />
          <KPICard
            label="Margem"
            value={fmtPct(k.margem_pct)}
            color={k.margem >= 0 ? t.green : t.red}
            accent={t.green}
            sub={`R$ ${fmtInt(k.margem)}`}
            borderRight={false}
          />
        </div>
      </div>

      {/* Custo × Receita mensal */}
      <div className="rounded-xl p-4 relative" style={cardStyle}>
        <GlowLine color={t.red} />
        {cardHeading(t, `Custo × Receita mês a mês — ${ano}${sufixoRecorte} (tooltip mostra o % custo)`)}
        <div style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={serie} barGap={3}>
              <CartesianGrid vertical={false} stroke={t.gridLine} />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: t.muted, fontFamily: "'JetBrains Mono', monospace" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: t.muted }} axisLine={false} tickLine={false} tickFormatter={(v) => fmtK(v)} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="custo" name="Custo" radius={[3, 3, 0, 0]} barSize={18} fill={t.red} fillOpacity={0.9} />
              <Bar dataKey="receita" name="Receita" radius={[3, 3, 0, 0]} barSize={18} fill={t.blue} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Custo por unidade */}
        <div className="rounded-xl p-4 relative" style={cardStyle}>
          <GlowLine color={t.red} />
          {cardHeading(t, 'Custo por unidade')}
          <div style={{ height: Math.max(200, (porUnidadeCusto.length || 1) * 30) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={porUnidadeCusto} layout="vertical" margin={{ right: 56 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="unidade_nome" width={130} tick={{ fontSize: 9, fill: t.textSec, fontFamily: "'JetBrains Mono', monospace" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="custo" name="Custo" fill={t.red} radius={[0, 3, 3, 0]} barSize={14}>
                  <LabelList dataKey="custo" position="right" formatter={(v: number) => fmtK(v)} style={{ fontSize: 9, fill: t.muted, fontFamily: "'JetBrains Mono', monospace" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Curva ABC de agregados */}
        <div className="rounded-xl p-4 relative overflow-x-auto" style={cardStyle}>
          <GlowLine color={t.amber} />
          {cardHeading(
            t,
            `Curva ABC de agregados — custo por motorista (top 15)${recorteAtivo ? ' · período completo do filtro (ABC não re-fatia por quinzena/dezena)' : ''}`,
          )}
          {abc.length === 0 ? (
            <div className="text-xs py-6 text-center" style={{ color: t.muted }}>
              Sem linhas de agregados nos fechamentos do recorte.
            </div>
          ) : (
            <table className="w-full text-xs" style={{ minWidth: 500 }}>
              <thead>
                <tr style={{ color: t.muted }}>
                  <th className="text-left py-2 font-normal">Motorista</th>
                  <th className="text-left py-2 font-normal">Contrato</th>
                  <th className="text-right py-2 font-normal">Custo</th>
                  <th className="text-right py-2 font-normal">% acum.</th>
                  <th className="text-right py-2 font-normal">Viagens</th>
                  <th className="text-right py-2 font-normal">Custo / viagem</th>
                </tr>
              </thead>
              <tbody>
                {abc.map((m) => (
                  <tr key={`${m.motorista_id}`} style={{ borderTop: `1px solid ${t.border}` }}>
                    <td className="py-2" style={{ color: t.text }}>{m.nome}</td>
                    <td className="py-2" style={{ color: t.muted }}>{m.tipo_contrato || '—'}</td>
                    <td className="py-2 text-right font-mono" style={{ color: t.text }}>R$ {fmtInt(m.custo)}</td>
                    <td className="py-2 text-right font-mono" style={{ color: m.acumPct <= 80 ? t.amber : t.muted }}>
                      {fmtPct(m.acumPct)}
                    </td>
                    <td className="py-2 text-right font-mono" style={{ color: t.textSec }}>{fmtInt(m.viagens)}</td>
                    <td className="py-2 text-right font-mono" style={{ color: t.textSec }}>
                      R$ {fmtInt(m.viagens > 0 ? m.custo / m.viagens : 0)}
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
}
