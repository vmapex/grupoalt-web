'use client'
/* ═══════════════════════════════════════════════════════════════
   BI de Fechamento · Adiantamentos & Devedores — posição ATUAL da
   carteira (GET /fechamento-bi/devedores): aging da dívida pendente,
   top devedores e posição por unidade. Filtro aplicado: UNIDADE.
   Ano/mês/quinzena/navio não se aplicam — dívida antiga continua
   devida (nota no cabeçalho). fmtInt em leitura.
   ═══════════════════════════════════════════════════════════════ */
import {
  ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, Tooltip, LabelList,
} from 'recharts'
import { useThemeStore } from '@/store/themeStore'
import { useBiFechamentoStore } from '@/store/biFechamentoStore'
import { KPICard } from '@/components/ui/KPICard'
import { GlowLine } from '@/components/ui/GlowLine'
import { CustomTooltip } from '@/components/charts/CustomTooltip'
import { fmtInt, fmtPct, fmtK } from '@/lib/formatters'
import { useFechamentoBiDevedores } from '@/hooks/api/useFechamentoBi'
import { BiErro, BiCarregando, BiVazio, cardHeading } from '../_shared'

export default function AdiantamentosDevedoresPage() {
  const t = useThemeStore((s) => s.tokens)
  const unidadeId = useBiFechamentoStore((s) => s.unidadeId)
  const { data, loading, error, refetch } = useFechamentoBiDevedores({ unidade_id: unidadeId })

  const cardStyle = { background: t.surface, border: `1px solid ${t.border}` } as const

  if (error) return <BiErro erro={error} onRetry={refetch} />
  if (loading && !data) return <BiCarregando />
  if (!data) return null

  const k = data.kpis
  const recuperadoPct = k.pendente_total + k.quitado_total > 0
    ? (k.quitado_total / (k.pendente_total + k.quitado_total)) * 100
    : 0
  const maisAntigo = data.top_devedores.reduce((m, d) => Math.max(m, d.mais_antigo_dias), 0)
  const corFaixa = [t.green, t.amber, '#fb923c', t.red]

  return (
    <div className="space-y-5">
      {k.pendente_count === 0 && k.quitado_count === 0 && (
        <BiVazio mensagem="Nenhum devedor/adiantamento registrado no Motor para o filtro selecionado." />
      )}

      {/* KPI strip — posição atual, não respeita filtro de período */}
      <div className="rounded-xl overflow-hidden relative" style={cardStyle}>
        <GlowLine color={t.red} />
        <div className="grid grid-cols-2 md:grid-cols-4">
          <KPICard
            label="Carteira em aberto"
            value={`R$ ${fmtInt(k.pendente_total)}`}
            color={t.text}
            accent={t.red}
            sub={`${fmtInt(k.pendente_count)} débito(s) pendente(s) · posição atual`}
          />
          <KPICard
            label="Recuperado (quitados)"
            value={`R$ ${fmtInt(k.quitado_total)}`}
            color={t.green}
            accent={t.green}
            sub={`${fmtInt(k.quitado_count)} quitado(s)`}
          />
          <KPICard
            label="Taxa de recuperação"
            value={fmtPct(recuperadoPct)}
            color={recuperadoPct >= 50 ? t.green : t.amber}
            accent={t.blue}
            sub="quitado ÷ (quitado + pendente)"
          />
          <KPICard
            label="Débito mais antigo"
            value={maisAntigo > 0 ? `${fmtInt(maisAntigo)} dias` : '—'}
            color={maisAntigo > 90 ? t.red : t.text}
            accent={t.amber}
            borderRight={false}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Aging */}
        <div className="rounded-xl p-4 relative" style={cardStyle}>
          <GlowLine color={t.red} />
          {cardHeading(t, 'Aging da carteira pendente (dias desde o lançamento)')}
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.aging} margin={{ top: 24 }}>
                <XAxis dataKey="faixa" tick={{ fontSize: 10, fill: t.muted, fontFamily: "'JetBrains Mono', monospace" }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="valor" name="Em aberto" radius={[3, 3, 0, 0]} barSize={44}>
                  {data.aging.map((_, i) => (
                    <Cell key={i} fill={corFaixa[i] ?? t.red} fillOpacity={0.9} />
                  ))}
                  <LabelList dataKey="valor" position="top" formatter={(v: number) => (v > 0 ? fmtK(v) : '')} style={{ fontSize: 10, fill: t.textSec, fontFamily: "'JetBrains Mono', monospace" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Por unidade */}
        <div className="rounded-xl p-4 relative overflow-x-auto" style={cardStyle}>
          <GlowLine color={t.purple} />
          {cardHeading(t, 'Carteira pendente por unidade')}
          <table className="w-full text-xs" style={{ minWidth: 360 }}>
            <thead>
              <tr style={{ color: t.muted }}>
                <th className="text-left py-2 font-normal">Unidade</th>
                <th className="text-right py-2 font-normal">Débitos</th>
                <th className="text-right py-2 font-normal">Em aberto</th>
              </tr>
            </thead>
            <tbody>
              {data.por_unidade.map((u) => (
                <tr key={`${u.unidade_id}`} style={{ borderTop: `1px solid ${t.border}` }}>
                  <td className="py-2" style={{ color: t.text }}>{u.unidade_nome}</td>
                  <td className="py-2 text-right font-mono" style={{ color: t.muted }}>{fmtInt(u.count)}</td>
                  <td className="py-2 text-right font-mono" style={{ color: t.text }}>R$ {fmtInt(u.valor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top devedores */}
      <div className="rounded-xl p-4 relative overflow-x-auto" style={cardStyle}>
        <GlowLine color={t.amber} />
        {cardHeading(t, 'Top devedores (pendentes, por motorista)')}
        <table className="w-full text-xs" style={{ minWidth: 520 }}>
          <thead>
            <tr style={{ color: t.muted }}>
              <th className="text-left py-2 font-normal">Motorista</th>
              <th className="text-right py-2 font-normal">Débitos</th>
              <th className="text-right py-2 font-normal">Valor em aberto</th>
              <th className="text-right py-2 font-normal">Mais antigo</th>
            </tr>
          </thead>
          <tbody>
            {data.top_devedores.map((d) => (
              <tr key={`${d.motorista_id}`} style={{ borderTop: `1px solid ${t.border}` }}>
                <td className="py-2" style={{ color: t.text }}>{d.nome}</td>
                <td className="py-2 text-right font-mono" style={{ color: t.muted }}>{fmtInt(d.count)}</td>
                <td className="py-2 text-right font-mono" style={{ color: t.text }}>R$ {fmtInt(d.valor)}</td>
                <td className="py-2 text-right font-mono" style={{ color: d.mais_antigo_dias > 90 ? t.red : t.textSec }}>
                  {d.mais_antigo_dias > 0 ? `${fmtInt(d.mais_antigo_dias)} dias` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
