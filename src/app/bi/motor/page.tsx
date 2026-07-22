'use client'
/* ═══════════════════════════════════════════════════════════════
   BI do Motor · Visão Executiva — primeira aba do shell /bi/motor.
   Filtros (ano/unidade) vêm do biMotorStore (barra do layout).
   fmtInt em leitura; fmtK só em eixos/labels de gráfico.
   ═══════════════════════════════════════════════════════════════ */
import { useEffect, useMemo } from 'react'
import {
  ResponsiveContainer, ComposedChart, BarChart, Bar, Line, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, LabelList,
} from 'recharts'
import { useThemeStore } from '@/store/themeStore'
import { useBiMotorStore } from '@/store/biMotorStore'
import { KPICard } from '@/components/ui/KPICard'
import { GlowLine } from '@/components/ui/GlowLine'
import { CustomTooltip } from '@/components/charts/CustomTooltip'
import { fmtInt, fmtPct, fmtK, fmtBRL } from '@/lib/formatters'
import { useMotorBiExecutivo } from '@/hooks/api/useMotorBi'
import { MESES, BiErro, BiCarregando, BiVazio, cardHeading } from './_shared'

export default function VisaoExecutivaPage() {
  const t = useThemeStore((s) => s.tokens)
  const ano = useBiMotorStore((s) => s.ano)
  const unidadeId = useBiMotorStore((s) => s.unidadeId)
  const setUnidadeOpts = useBiMotorStore((s) => s.setUnidadeOpts)
  const { data, loading, error, refetch } = useMotorBiExecutivo({ ano, unidade_id: unidadeId })

  // Alimenta o dropdown global de unidades com a última resposta SEM filtro.
  useEffect(() => {
    if (!unidadeId && data?.por_unidade?.length) {
      setUnidadeOpts(
        data.por_unidade
          .filter((u) => u.chave != null)
          .map((u) => ({ id: u.chave as number, label: u.label })),
      )
    }
  }, [data, unidadeId, setUnidadeOpts])

  const serieMensal = useMemo(() => {
    if (!data) return []
    return data.serie_mensal.map((m, i) => ({
      name: MESES[i],
      atual: m.faturamento,
      anterior: data.serie_mensal_ano_anterior[i]?.faturamento ?? 0,
      margem: m.margem,
      parcial: m.parcial,
    }))
  }, [data])

  const mesParcial = data?.serie_mensal.find((m) => m.parcial)?.mes ?? null
  const cardStyle = { background: t.surface, border: `1px solid ${t.border}` } as const

  if (error) return <BiErro erro={error} onRetry={refetch} />
  if (loading && !data) return <BiCarregando />
  if (!data) return null

  return (
    <div className="space-y-5">
      {data.kpis.viagens === 0 && <BiVazio ano={ano} unidade={!!unidadeId} />}

      {/* KPI strip */}
      <div className="rounded-xl overflow-hidden relative" style={cardStyle}>
        <GlowLine color={t.gold} />
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
          <KPICard
            label="Faturamento"
            value={`R$ ${fmtInt(data.kpis.faturamento)}`}
            color={t.text}
            accent={t.gold}
            sub={data.totais_ano_anterior.faturamento > 0 ? `${ano - 1}: R$ ${fmtInt(data.totais_ano_anterior.faturamento)}` : undefined}
          />
          <KPICard
            label="Margem"
            value={fmtPct(data.kpis.margem_pct)}
            color={data.kpis.margem >= 0 ? t.green : t.red}
            accent={t.green}
            sub={`R$ ${fmtInt(data.kpis.margem)}`}
          />
          <KPICard
            label="Ticket médio / viagem"
            value={`R$ ${fmtInt(data.kpis.ticket_medio_viagem)}`}
            color={t.text}
            accent={t.blue}
            sub={`${fmtInt(data.kpis.viagens)} viagens`}
          />
          <KPICard
            label="R$ / KM"
            value={fmtBRL(data.kpis.rs_km)}
            color={t.text}
            accent={t.blue}
            sub={`${fmtInt(data.kpis.km)} km rodados`}
          />
          <KPICard
            label="Cabeças"
            value={fmtInt(data.kpis.cabecas)}
            color={t.text}
            accent={t.purple}
            sub={`R$ ${fmtBRL(data.kpis.rs_cabeca)} / cabeça`}
          />
          <KPICard
            label="Custo / Receita"
            value={fmtPct(data.kpis.custo_pct)}
            color={t.amber}
            accent={t.amber}
            sub={`custo R$ ${fmtInt(data.kpis.custo)}`}
            borderRight={false}
          />
        </div>
      </div>

      {/* Evolução mensal YoY */}
      <div className="rounded-xl p-4 relative" style={cardStyle}>
        <GlowLine color={t.blue} />
        {cardHeading(t, `Faturamento mês a mês — ${ano} vs ${ano - 1}${mesParcial ? ` · ${MESES[mesParcial - 1]} parcial` : ''}`)}
        <div style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={serieMensal} barGap={4}>
              <CartesianGrid vertical={false} stroke={t.gridLine} />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: t.muted, fontFamily: "'JetBrains Mono', monospace" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: t.muted }} axisLine={false} tickLine={false} tickFormatter={(v) => fmtK(v)} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="atual" name={`Faturamento ${ano}`} radius={[3, 3, 0, 0]} barSize={26}>
                {serieMensal.map((m, i) => (
                  <Cell key={i} fill={t.blue} fillOpacity={m.parcial ? 0.4 : 1} />
                ))}
              </Bar>
              <Line dataKey="anterior" name={`Faturamento ${ano - 1}`} stroke={t.muted} strokeWidth={2} dot={{ r: 2 }} type="monotone" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Por unidade */}
        <div className="rounded-xl p-4 relative" style={cardStyle}>
          <GlowLine color={t.gold} />
          {cardHeading(t, 'Faturamento por unidade')}
          <div style={{ height: Math.max(200, (data.por_unidade.length || 1) * 30) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.por_unidade} layout="vertical" margin={{ right: 56 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="label" width={130} tick={{ fontSize: 9, fill: t.textSec, fontFamily: "'JetBrains Mono', monospace" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="faturamento" name="Faturamento" fill={t.gold} radius={[0, 3, 3, 0]} barSize={14}>
                  <LabelList dataKey="faturamento" position="right" formatter={(v: number) => fmtK(v)} style={{ fontSize: 9, fill: t.muted, fontFamily: "'JetBrains Mono', monospace" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Por tipo de veículo */}
        <div className="rounded-xl p-4 relative" style={cardStyle}>
          <GlowLine color={t.purple} />
          {cardHeading(t, 'Receita por tipo de veículo (tipo efetivo da viagem)')}
          <div style={{ height: Math.max(200, (data.por_tipo_veiculo.length || 1) * 30) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.por_tipo_veiculo} layout="vertical" margin={{ right: 56 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="label" width={130} tick={{ fontSize: 9, fill: t.textSec, fontFamily: "'JetBrains Mono', monospace" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="faturamento" name="Faturamento" fill={t.purple} radius={[0, 3, 3, 0]} barSize={14}>
                  <LabelList dataKey="faturamento" position="right" formatter={(v: number) => fmtK(v)} style={{ fontSize: 9, fill: t.muted, fontFamily: "'JetBrains Mono', monospace" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ABC clientes com margem */}
      <div className="rounded-xl p-4 relative overflow-x-auto" style={cardStyle}>
        <GlowLine color={t.green} />
        {cardHeading(t, 'Clientes — faturamento e margem (top 12)')}
        <table className="w-full text-xs" style={{ minWidth: 640 }}>
          <thead>
            <tr style={{ color: t.muted }}>
              <th className="text-left py-2 font-normal">Cliente</th>
              <th className="text-right py-2 font-normal">Faturamento</th>
              <th className="text-right py-2 font-normal">% do total</th>
              <th className="text-right py-2 font-normal">Margem</th>
              <th className="text-right py-2 font-normal">Margem %</th>
              <th className="text-right py-2 font-normal">Cabeças</th>
              <th className="text-right py-2 font-normal">Viagens</th>
            </tr>
          </thead>
          <tbody>
            {data.por_cliente.slice(0, 12).map((c) => {
              const share = data.kpis.faturamento > 0 ? (c.faturamento / data.kpis.faturamento) * 100 : 0
              const margemPct = c.faturamento > 0 ? (c.margem / c.faturamento) * 100 : 0
              return (
                <tr key={`${c.chave}`} style={{ borderTop: `1px solid ${t.border}` }}>
                  <td className="py-2" style={{ color: t.text }}>{c.label}</td>
                  <td className="py-2 text-right font-mono" style={{ color: t.text }}>R$ {fmtInt(c.faturamento)}</td>
                  <td className="py-2 text-right font-mono" style={{ color: t.muted }}>{fmtPct(share)}</td>
                  <td className="py-2 text-right font-mono" style={{ color: c.margem >= 0 ? t.green : t.red }}>R$ {fmtInt(c.margem)}</td>
                  <td className="py-2 text-right font-mono" style={{ color: margemPct >= 0 ? t.green : t.red }}>{fmtPct(margemPct)}</td>
                  <td className="py-2 text-right font-mono" style={{ color: t.textSec }}>{fmtInt(c.cabecas)}</td>
                  <td className="py-2 text-right font-mono" style={{ color: t.textSec }}>{fmtInt(c.viagens)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
