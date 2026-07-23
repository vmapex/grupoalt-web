'use client'
/* ═══════════════════════════════════════════════════════════════
   BI de Fechamento · Crédito & Débito — "DRE do fechamento" a partir
   das linhas_resumo consolidadas (GET /fechamento-bi/credito-debito):
   débitos ao motorista (valor + bônus + pedágio) × retenções da
   unidade (desconto + seguro do boi + imposto + comissão de carreta,
   repassada ao locador) × saldo líquido a pagar. Filtros: ano, mês,
   unidade e navio (quinzena/dezena não se aplica — o componente vem
   por fechamento inteiro). fmtInt em leitura; fmtK só em labels.
   ═══════════════════════════════════════════════════════════════ */
import { useMemo } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, Tooltip, LabelList,
} from 'recharts'
import { useThemeStore } from '@/store/themeStore'
import { useBiFechamentoStore } from '@/store/biFechamentoStore'
import { KPICard } from '@/components/ui/KPICard'
import { GlowLine } from '@/components/ui/GlowLine'
import { CustomTooltip } from '@/components/charts/CustomTooltip'
import { fmtInt, fmtK } from '@/lib/formatters'
import {
  useFechamentoBiCreditoDebito,
  type FechamentoBiComponentesAPI,
} from '@/hooks/api/useFechamentoBi'
import { MESES, BiErro, BiCarregando, BiVazio, cardHeading } from '../_shared'

function fmtData(iso: string | null): string {
  if (!iso || iso.length < 10) return '—'
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(2, 4)}`
}

const COMPONENTES: { chave: keyof FechamentoBiComponentesAPI; label: string; lado: 'debito' | 'retencao' }[] = [
  { chave: 'valor_motorista', label: 'Valor motorista', lado: 'debito' },
  { chave: 'bonus_motorista', label: 'Bônus', lado: 'debito' },
  { chave: 'pedagio', label: 'Pedágio (reembolso)', lado: 'debito' },
  { chave: 'desconto_motorista', label: 'Descontos', lado: 'retencao' },
  { chave: 'seguro_boi', label: 'Seguro do boi', lado: 'retencao' },
  { chave: 'imposto', label: 'Imposto', lado: 'retencao' },
  { chave: 'comissao_carreta', label: 'Comissão carreta (locador)', lado: 'retencao' },
]

export default function CreditoDebitoPage() {
  const t = useThemeStore((s) => s.tokens)
  const ano = useBiFechamentoStore((s) => s.ano)
  const mes = useBiFechamentoStore((s) => s.mes)
  const unidadeId = useBiFechamentoStore((s) => s.unidadeId)
  const navioId = useBiFechamentoStore((s) => s.navioId)
  const { data, loading, error, refetch } = useFechamentoBiCreditoDebito({
    ano, mes, unidade_id: unidadeId, navio_id: navioId,
  })

  const composicao = useMemo(() => {
    if (!data) return []
    return COMPONENTES.map((c) => ({
      name: c.label,
      valor: Math.abs(data.totais[c.chave]),
      lado: c.lado,
    })).filter((c) => c.valor > 0)
  }, [data])

  const cardStyle = { background: t.surface, border: `1px solid ${t.border}` } as const

  if (error) return <BiErro erro={error} onRetry={refetch} />
  if (loading && !data) return <BiCarregando />
  if (!data) return null

  const tot = data.totais

  return (
    <div className="space-y-5">
      {data.fechamentos.length === 0 && (
        <BiVazio mensagem={`Nenhum fechamento processado no recorte (${ano}${mes ? ` · ${MESES[mes - 1]}` : ''}).`} />
      )}

      {/* KPI strip */}
      <div className="rounded-xl overflow-hidden relative" style={cardStyle}>
        <GlowLine color={t.purple} />
        <div className="grid grid-cols-2 md:grid-cols-4">
          <KPICard
            label="Débitos ao motorista"
            value={`R$ ${fmtInt(tot.debitos)}`}
            color={t.text}
            accent={t.red}
            sub="valor + bônus + pedágio"
          />
          <KPICard
            label="Retenções da unidade"
            value={`R$ ${fmtInt(tot.retencoes)}`}
            color={t.text}
            accent={t.green}
            sub="descontos + seguro + imposto + carreta"
          />
          <KPICard
            label="Líquido a pagar (saldo)"
            value={`R$ ${fmtInt(tot.saldo_motorista)}`}
            color={t.text}
            accent={t.purple}
            sub="consolidado nos fechamentos"
          />
          <KPICard
            label="Fechamentos no recorte"
            value={fmtInt(data.fechamentos.length)}
            color={t.text}
            accent={t.blue}
            borderRight={false}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Composição crédito × débito */}
        <div className="rounded-xl p-4 relative" style={cardStyle}>
          <GlowLine color={t.purple} />
          {cardHeading(t, 'Composição — débitos (vermelho) × retenções (verde)')}
          <div style={{ height: Math.max(220, (composicao.length || 1) * 34) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={composicao} layout="vertical" margin={{ right: 60 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={170} tick={{ fontSize: 9, fill: t.textSec, fontFamily: "'JetBrains Mono', monospace" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="valor" name="Valor" radius={[0, 3, 3, 0]} barSize={16}>
                  <LabelList dataKey="valor" position="right" formatter={(v: number) => fmtK(v)} style={{ fontSize: 9, fill: t.muted, fontFamily: "'JetBrains Mono', monospace" }} />
                  {composicao.map((c, i) => (
                    <Cell key={i} fill={c.lado === 'debito' ? t.red : t.green} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Por unidade */}
        <div className="rounded-xl p-4 relative overflow-x-auto" style={cardStyle}>
          <GlowLine color={t.blue} />
          {cardHeading(t, 'Crédito × débito por unidade')}
          <table className="w-full text-xs" style={{ minWidth: 440 }}>
            <thead>
              <tr style={{ color: t.muted }}>
                <th className="text-left py-2 font-normal">Unidade</th>
                <th className="text-right py-2 font-normal">Fech.</th>
                <th className="text-right py-2 font-normal">Débitos</th>
                <th className="text-right py-2 font-normal">Retenções</th>
                <th className="text-right py-2 font-normal">Saldo líquido</th>
              </tr>
            </thead>
            <tbody>
              {data.por_unidade.map((u) => (
                <tr key={u.unidade_id} style={{ borderTop: `1px solid ${t.border}` }}>
                  <td className="py-2" style={{ color: t.text }}>{u.unidade_nome}</td>
                  <td className="py-2 text-right font-mono" style={{ color: t.muted }}>{fmtInt(u.fechamentos)}</td>
                  <td className="py-2 text-right font-mono" style={{ color: t.red }}>R$ {fmtInt(u.debitos)}</td>
                  <td className="py-2 text-right font-mono" style={{ color: t.green }}>R$ {fmtInt(u.retencoes)}</td>
                  <td className="py-2 text-right font-mono" style={{ color: t.text }}>R$ {fmtInt(u.saldo_motorista)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fechamentos */}
      <div className="rounded-xl p-4 relative overflow-x-auto" style={cardStyle}>
        <GlowLine color={t.gold} />
        {cardHeading(t, `Fechamentos do recorte (${fmtInt(data.fechamentos.length)})`)}
        <table className="w-full text-xs" style={{ minWidth: 640 }}>
          <thead>
            <tr style={{ color: t.muted }}>
              <th className="text-left py-2 font-normal">Período</th>
              <th className="text-left py-2 font-normal">Unidade</th>
              <th className="text-right py-2 font-normal">Fechado em</th>
              <th className="text-right py-2 font-normal">Débitos</th>
              <th className="text-right py-2 font-normal">Retenções</th>
              <th className="text-right py-2 font-normal">Saldo líquido</th>
            </tr>
          </thead>
          <tbody>
            {data.fechamentos.map((f) => (
              <tr key={f.id} style={{ borderTop: `1px solid ${t.border}` }}>
                <td className="py-2" style={{ color: t.text }}>{f.periodo_label || '—'}</td>
                <td className="py-2" style={{ color: t.textSec }}>{f.unidade_nome}</td>
                <td className="py-2 text-right font-mono" style={{ color: t.muted }}>{fmtData(f.dt_fechamento)}</td>
                <td className="py-2 text-right font-mono" style={{ color: t.red }}>R$ {fmtInt(f.debitos)}</td>
                <td className="py-2 text-right font-mono" style={{ color: t.green }}>R$ {fmtInt(f.retencoes)}</td>
                <td className="py-2 text-right font-mono" style={{ color: t.text }}>R$ {fmtInt(f.saldo_motorista)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
