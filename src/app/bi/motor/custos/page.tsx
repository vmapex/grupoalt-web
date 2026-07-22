'use client'
/* ═══════════════════════════════════════════════════════════════
   BI do Motor · Custo × Faturamento — espelho da aba do Power BI:
   KPIs de custo, custo × receita mês a mês (com % custo), custo
   por unidade e curva ABC de agregados (custo por motorista,
   motor-api #189). Mesmo endpoint da executiva — outra lente.
   ═══════════════════════════════════════════════════════════════ */
import { useMemo } from 'react'
import {
  ResponsiveContainer, ComposedChart, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, LabelList,
} from 'recharts'
import { useThemeStore } from '@/store/themeStore'
import { useBiMotorStore } from '@/store/biMotorStore'
import { KPICard } from '@/components/ui/KPICard'
import { GlowLine } from '@/components/ui/GlowLine'
import { CustomTooltip } from '@/components/charts/CustomTooltip'
import { fmtInt, fmtPct, fmtK, fmtBRL } from '@/lib/formatters'
import { useMotorBiExecutivo } from '@/hooks/api/useMotorBi'
import { MESES, BiErro, BiCarregando, BiVazio, cardHeading } from '../_shared'

export default function CustoFaturamentoPage() {
  const t = useThemeStore((s) => s.tokens)
  const ano = useBiMotorStore((s) => s.ano)
  const unidadeId = useBiMotorStore((s) => s.unidadeId)
  const { data, loading, error, refetch } = useMotorBiExecutivo({ ano, unidade_id: unidadeId })

  const serie = useMemo(() => {
    if (!data) return []
    return data.serie_mensal.map((m, i) => ({
      name: MESES[i],
      receita: m.faturamento,
      custo: m.custo,
      custoPct: m.faturamento > 0 ? (m.custo / m.faturamento) * 100 : 0,
      parcial: m.parcial,
    }))
  }, [data])

  const porUnidadeCusto = useMemo(
    () => (data ? [...data.por_unidade].sort((a, b) => b.custo - a.custo) : []),
    [data],
  )

  const cardStyle = { background: t.surface, border: `1px solid ${t.border}` } as const

  if (error) return <BiErro erro={error} onRetry={refetch} />
  if (loading && !data) return <BiCarregando />
  if (!data) return null

  const custoTotal = data.kpis.custo
  const agregados = data.por_motorista ?? []

  return (
    <div className="space-y-5">
      {data.kpis.viagens === 0 && <BiVazio ano={ano} unidade={!!unidadeId} />}

      {/* KPI strip — lente de custo */}
      <div className="rounded-xl overflow-hidden relative" style={cardStyle}>
        <GlowLine color={t.red} />
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
          <KPICard
            label="Custo total"
            value={`R$ ${fmtInt(data.kpis.custo)}`}
            color={t.text}
            accent={t.red}
            sub={data.totais_ano_anterior.custo > 0 ? `${ano - 1}: R$ ${fmtInt(data.totais_ano_anterior.custo)}` : undefined}
          />
          <KPICard
            label="% sobre a receita"
            value={fmtPct(data.kpis.custo_pct)}
            color={t.amber}
            accent={t.amber}
            sub={`receita R$ ${fmtInt(data.kpis.faturamento)}`}
          />
          <KPICard
            label="Custo / KM"
            value={fmtBRL(data.kpis.custo_km)}
            color={t.text}
            accent={t.red}
            sub={`R$/km receita: ${fmtBRL(data.kpis.rs_km)}`}
          />
          <KPICard
            label="Custo / cabeça"
            value={fmtBRL(data.kpis.custo_cabeca)}
            color={t.text}
            accent={t.red}
            sub={`${fmtInt(data.kpis.cabecas)} cabeças`}
          />
          <KPICard
            label="Margem"
            value={fmtPct(data.kpis.margem_pct)}
            color={data.kpis.margem >= 0 ? t.green : t.red}
            accent={t.green}
            sub={`R$ ${fmtInt(data.kpis.margem)}`}
            borderRight={false}
          />
        </div>
      </div>

      {/* Custo × Receita mensal */}
      <div className="rounded-xl p-4 relative" style={cardStyle}>
        <GlowLine color={t.red} />
        {cardHeading(t, `Custo × Receita mês a mês — ${ano} (tooltip mostra o % custo)`)}
        <div style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={serie} barGap={3}>
              <CartesianGrid vertical={false} stroke={t.gridLine} />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: t.muted, fontFamily: "'JetBrains Mono', monospace" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: t.muted }} axisLine={false} tickLine={false} tickFormatter={(v) => fmtK(v)} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="custo" name="Custo" radius={[3, 3, 0, 0]} barSize={18}>
                {serie.map((m, i) => (
                  <Cell key={i} fill={t.red} fillOpacity={m.parcial ? 0.4 : 0.9} />
                ))}
              </Bar>
              <Bar dataKey="receita" name="Receita" radius={[3, 3, 0, 0]} barSize={18}>
                {serie.map((m, i) => (
                  <Cell key={i} fill={t.blue} fillOpacity={m.parcial ? 0.4 : 1} />
                ))}
              </Bar>
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
                <YAxis type="category" dataKey="label" width={130} tick={{ fontSize: 9, fill: t.textSec, fontFamily: "'JetBrains Mono', monospace" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="custo" name="Custo" fill={t.red} radius={[0, 3, 3, 0]} barSize={14}>
                  <LabelList dataKey="custo" position="right" formatter={(v: number) => fmtK(v)} style={{ fontSize: 9, fill: t.muted, fontFamily: "'JetBrains Mono', monospace" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ABC de agregados */}
        <div className="rounded-xl p-4 relative overflow-x-auto" style={cardStyle}>
          <GlowLine color={t.amber} />
          {cardHeading(t, 'Curva ABC de agregados — custo por motorista (top 15)')}
          {agregados.length === 0 ? (
            <div className="text-xs py-6 text-center" style={{ color: t.muted }}>
              Disponível após o deploy do motor-api #189 (por_motorista).
            </div>
          ) : (
            <table className="w-full text-xs" style={{ minWidth: 480 }}>
              <thead>
                <tr style={{ color: t.muted }}>
                  <th className="text-left py-2 font-normal">Motorista</th>
                  <th className="text-right py-2 font-normal">Custo</th>
                  <th className="text-right py-2 font-normal">% do custo</th>
                  <th className="text-right py-2 font-normal">Viagens</th>
                  <th className="text-right py-2 font-normal">Custo / viagem</th>
                </tr>
              </thead>
              <tbody>
                {agregados.slice(0, 15).map((m) => {
                  const share = custoTotal > 0 ? (m.custo / custoTotal) * 100 : 0
                  return (
                    <tr key={`${m.chave}`} style={{ borderTop: `1px solid ${t.border}` }}>
                      <td className="py-2" style={{ color: t.text }}>{m.label}</td>
                      <td className="py-2 text-right font-mono" style={{ color: t.text }}>R$ {fmtInt(m.custo)}</td>
                      <td className="py-2 text-right font-mono" style={{ color: t.muted }}>{fmtPct(share)}</td>
                      <td className="py-2 text-right font-mono" style={{ color: t.textSec }}>{fmtInt(m.viagens)}</td>
                      <td className="py-2 text-right font-mono" style={{ color: t.textSec }}>
                        R$ {fmtInt(m.viagens > 0 ? m.custo / m.viagens : 0)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
