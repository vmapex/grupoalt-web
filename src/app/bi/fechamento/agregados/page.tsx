'use client'
/* ═══════════════════════════════════════════════════════════════
   BI de Fechamento · Agregados & Postos — abastecimentos, vales e
   descontos por posto (GET /fechamento-bi/postos). Líquido = abast +
   vale − desconto (mesma conta da PostosPage do Motor). R$/litro e
   km/litro ficam PREVISTOS e desabilitados: litros zerados na base
   ("aguardando litros"). Filtros: ano, mês e unidade (navio e
   quinzena/dezena não se aplicam a lançamentos).
   fmtInt em leitura; fmtK só em eixos/labels.
   ═══════════════════════════════════════════════════════════════ */
import { useMemo } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LabelList,
} from 'recharts'
import { useThemeStore } from '@/store/themeStore'
import { useBiFechamentoStore } from '@/store/biFechamentoStore'
import { KPICard } from '@/components/ui/KPICard'
import { GlowLine } from '@/components/ui/GlowLine'
import { CustomTooltip } from '@/components/charts/CustomTooltip'
import { fmtInt, fmtK } from '@/lib/formatters'
import { useFechamentoBiPostos } from '@/hooks/api/useFechamentoBi'
import { MESES, BiErro, BiCarregando, BiVazio, cardHeading } from '../_shared'

export default function AgregadosPostosPage() {
  const t = useThemeStore((s) => s.tokens)
  const ano = useBiFechamentoStore((s) => s.ano)
  const mes = useBiFechamentoStore((s) => s.mes)
  const unidadeId = useBiFechamentoStore((s) => s.unidadeId)
  const { data, loading, error, refetch } = useFechamentoBiPostos({
    ano, mes, unidade_id: unidadeId,
  })

  const topPostos = useMemo(() => (data?.por_posto ?? []).slice(0, 12), [data])

  const cardStyle = { background: t.surface, border: `1px solid ${t.border}` } as const

  if (error) return <BiErro erro={error} onRetry={refetch} />
  if (loading && !data) return <BiCarregando />
  if (!data) return null

  const k = data.kpis

  return (
    <div className="space-y-5">
      {k.lancamentos === 0 && (
        <BiVazio mensagem={`Nenhum abastecimento/vale lançado no recorte (${ano}${mes ? ` · ${MESES[mes - 1]}` : ''}).`} />
      )}

      {/* KPI strip */}
      <div className="rounded-xl overflow-hidden relative" style={cardStyle}>
        <GlowLine color={t.amber} />
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
          <KPICard
            label="Abastecimentos"
            value={`R$ ${fmtInt(k.abastecimento)}`}
            color={t.text}
            accent={t.amber}
            sub={`${fmtInt(k.lancamentos)} lançamento(s) no total`}
          />
          <KPICard
            label="Vales"
            value={`R$ ${fmtInt(k.vale)}`}
            color={t.text}
            accent={t.blue}
          />
          <KPICard
            label="Descontos negociados"
            value={`R$ ${fmtInt(k.desconto)}`}
            color={t.text}
            accent={t.green}
            sub="abatem o líquido"
          />
          <KPICard
            label="Líquido (abast + vale − desc)"
            value={`R$ ${fmtInt(k.liquido)}`}
            color={t.text}
            accent={t.red}
          />
          <KPICard
            label="R$ / litro"
            value={k.litros_disponivel && k.rs_por_litro != null ? `R$ ${fmtInt(k.rs_por_litro)}` : '—'}
            color={t.muted}
            accent={t.muted}
            sub="aguardando litros na base do Motor"
            borderRight={false}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Líquido por posto */}
        <div className="rounded-xl p-4 relative" style={cardStyle}>
          <GlowLine color={t.amber} />
          {cardHeading(t, 'Líquido por posto (top 12)')}
          <div style={{ height: Math.max(220, (topPostos.length || 1) * 28) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topPostos} layout="vertical" margin={{ right: 56 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="posto_nome" width={150} tick={{ fontSize: 9, fill: t.textSec, fontFamily: "'JetBrains Mono', monospace" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="liquido" name="Líquido" fill={t.amber} radius={[0, 3, 3, 0]} barSize={14}>
                  <LabelList dataKey="liquido" position="right" formatter={(v: number) => fmtK(v)} style={{ fontSize: 9, fill: t.muted, fontFamily: "'JetBrains Mono', monospace" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tabela por posto */}
        <div className="rounded-xl p-4 relative overflow-x-auto" style={cardStyle}>
          <GlowLine color={t.blue} />
          {cardHeading(t, `Postos do recorte (${fmtInt(data.por_posto.length)})`)}
          <table className="w-full text-xs" style={{ minWidth: 520 }}>
            <thead>
              <tr style={{ color: t.muted }}>
                <th className="text-left py-2 font-normal">Posto</th>
                <th className="text-right py-2 font-normal">Lanç.</th>
                <th className="text-right py-2 font-normal">Abastec.</th>
                <th className="text-right py-2 font-normal">Vales</th>
                <th className="text-right py-2 font-normal">Descontos</th>
                <th className="text-right py-2 font-normal">Líquido</th>
              </tr>
            </thead>
            <tbody>
              {data.por_posto.map((p) => (
                <tr key={`${p.posto_id}`} style={{ borderTop: `1px solid ${t.border}` }}>
                  <td className="py-2" style={{ color: t.text }}>{p.posto_nome}</td>
                  <td className="py-2 text-right font-mono" style={{ color: t.muted }}>{fmtInt(p.lancamentos)}</td>
                  <td className="py-2 text-right font-mono" style={{ color: t.text }}>R$ {fmtInt(p.abastecimento)}</td>
                  <td className="py-2 text-right font-mono" style={{ color: t.textSec }}>R$ {fmtInt(p.vale)}</td>
                  <td className="py-2 text-right font-mono" style={{ color: t.green }}>R$ {fmtInt(p.desconto)}</td>
                  <td className="py-2 text-right font-mono" style={{ color: t.text }}>R$ {fmtInt(p.liquido)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
