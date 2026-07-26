'use client'
/* ═══════════════════════════════════════════════════════════════
   BI de Fechamento · Crédito & Débito — espelho da página homônima
   do Power BI (GET /fechamento-bi/credito-debito), com as fórmulas
   canônicas do RelatoriosPage do Motor. Dois lados + rodapé:

   CRÉDITO: comissão bruta, comissão carretas, seguro boi, saldo
   posto + imposto, devedores, adiantamentos, SUBTOTAL (= razão),
   total terceiros (aguardando definição), total postos.
   DÉBITO: devedores gerados (motorista × valor), postos outras
   unidades, desconto razão, custo motorista.
   RODAPÉ: saldos crédito × débito e VALOR TOTAL FECHAMENTO.

   MELHORIA vs PBI: KPIs de RESULTADO e MARGEM % no topo.
   Período sem fechamento → "período em aberto", não zeros.
   NÃO recalcula nada: só apresenta o que o Motor consolidou.
   fmtInt em leitura.
   ═══════════════════════════════════════════════════════════════ */
import type { ReactNode } from 'react'
import { useThemeStore, type ThemeTokens } from '@/store/themeStore'
import { useBiFechamentoStore, PERIODO_INTRA_MES_OPTS } from '@/store/biFechamentoStore'
import { KPICard } from '@/components/ui/KPICard'
import { GlowLine } from '@/components/ui/GlowLine'
import { fmtInt, fmtPct } from '@/lib/formatters'
import { useFechamentoBiCreditoDebito } from '@/hooks/api/useFechamentoBi'
import { MESES, BiErro, BiCarregando, BiVazio, FiltrosSemEfeito, cardHeading } from '../_shared'

function fmtData(iso: string | null): string {
  if (!iso || iso.length < 10) return '—'
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(2, 4)}`
}

function Linha({
  t, label, valor, destaque, nota,
}: {
  t: ThemeTokens
  label: string
  valor: number | null
  destaque?: boolean
  nota?: string
}) {
  return (
    <div
      className="flex items-center justify-between gap-3 py-1.5"
      style={destaque ? { borderTop: `1px solid ${t.border}`, marginTop: 4, paddingTop: 8 } : undefined}
    >
      <span className={destaque ? 'text-xs font-semibold' : 'text-xs'} style={{ color: destaque ? t.text : t.textSec }}>
        {label}
        {nota && <span className="ml-2 text-[10px]" style={{ color: t.muted }}>{nota}</span>}
      </span>
      <span className={`font-mono ${destaque ? 'text-sm font-bold' : 'text-xs'}`} style={{ color: valor == null ? t.muted : t.text }}>
        {valor == null ? '—' : `R$ ${fmtInt(valor)}`}
      </span>
    </div>
  )
}

export default function CreditoDebitoPage() {
  const t = useThemeStore((s) => s.tokens)
  const ano = useBiFechamentoStore((s) => s.ano)
  const mes = useBiFechamentoStore((s) => s.mes)
  const periodo = useBiFechamentoStore((s) => s.periodo)
  const unidadeId = useBiFechamentoStore((s) => s.unidadeId)
  const navioId = useBiFechamentoStore((s) => s.navioId)
  const { data, loading, error, refetch } = useFechamentoBiCreditoDebito({
    ano, mes, unidade_id: unidadeId, navio_id: navioId,
  })

  const cardStyle = { background: t.surface, border: `1px solid ${t.border}` } as const

  if (error) return <BiErro erro={error} onRetry={refetch} />
  if (loading && !data) return <BiCarregando />
  if (!data) return null

  // Período sem fechamento processado ≠ resultado zero.
  if (data.fechamentos.length === 0) {
    return (
      <BiVazio
        mensagem={`Período em aberto — sem resultado consolidado (${ano}${mes ? ` · ${MESES[mes - 1]}` : ''}). O resultado aparece aqui quando o fechamento do período for processado no Motor.`}
      />
    )
  }

  const c = data.credito
  const d = data.debito
  const r = data.rodape

  // O breakdown de crédito/débito é agregado no BACKEND por ano/mês/
  // unidade/navio — quinzena/dezena não re-fatia esta tela.
  const labelPeriodo = PERIODO_INTRA_MES_OPTS.find((p) => p.value === periodo)?.label

  return (
    <div className="space-y-5">
      <FiltrosSemEfeito
        filtros={periodo && labelPeriodo ? [labelPeriodo] : []}
        exibindo={`o período completo do filtro (${ano}${mes ? ` · ${MESES[mes - 1]}` : ''})`}
      />
      {/* MELHORIA vs PBI: resultado e margem em destaque */}
      <div className="rounded-xl overflow-hidden relative" style={cardStyle}>
        <GlowLine color={t.gold} />
        <div className="grid grid-cols-2 md:grid-cols-4">
          <KPICard
            label="Valor total fechamento"
            value={`R$ ${fmtInt(r.valor_total_fechamento)}`}
            color={r.valor_total_fechamento >= 0 ? t.text : t.red}
            accent={t.gold}
            sub="razão − custo motorista"
          />
          <KPICard
            label="Margem do período"
            value={fmtPct(r.margem_pct)}
            color={r.margem_pct >= 0 ? t.green : t.red}
            accent={t.green}
            sub={`sobre razão R$ ${fmtInt(r.subtotal_credito)}`}
          />
          <KPICard
            label="Líquido a pagar (fichas)"
            value={`R$ ${fmtInt(r.liquido_a_pagar)}`}
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
        {/* CRÉDITO */}
        <div className="rounded-xl p-4 relative" style={cardStyle}>
          <GlowLine color={t.green} />
          {cardHeading(t, 'Crédito — o que fica com a unidade')}
          <Linha t={t} label="Comissão (bruta)" valor={c.comissao_bruta} nota="razão − motorista + frota" />
          <Linha t={t} label="Comissão carretas" valor={c.comissao_carretas} nota="repassada ao locador" />
          <Linha t={t} label="Seguro boi" valor={c.seguro_boi} />
          <Linha t={t} label="Saldo posto" valor={c.saldo_posto} nota="retido nas fichas" />
          <Linha t={t} label="Imposto" valor={c.imposto} />
          <Linha t={t} label="Devedores" valor={c.devedores} nota="descontados no período" />
          <Linha t={t} label="Adiantamentos" valor={c.adiantamentos} nota="descontados no período" />
          <Linha t={t} label="SUBTOTAL (total razão)" valor={c.subtotal} destaque />
          <Linha t={t} label="Total terceiros" valor={c.total_terceiros} nota="aguardando definição da fonte" />
          <Linha t={t} label="Total postos" valor={c.total_postos} nota="abast + vale − desc do período" />
        </div>

        {/* DÉBITO */}
        <div className="rounded-xl p-4 relative" style={cardStyle}>
          <GlowLine color={t.red} />
          {cardHeading(t, 'Débito — o que a unidade paga')}
          <Linha t={t} label="Custo motorista (líquido)" valor={d.custo_motorista_liq} />
          <Linha t={t} label="Postos outras unidades" valor={d.postos_outras_unidades} nota="reembolso à unidade pagadora" />
          <Linha t={t} label="Desconto razão" valor={d.desconto_razao} />
          <Linha t={t} label="TOTAL DÉBITO" valor={d.total} destaque />

          <div className="mt-4">
            <div className="text-[10px] mb-2" style={{ color: t.muted, fontFamily: 'var(--font-mono)', letterSpacing: '0.16em', textTransform: 'uppercase' }}>
              Devedores gerados no fechamento ({fmtInt(d.devedores_gerados.length)})
            </div>
            {d.devedores_gerados.length === 0 ? (
              <div className="text-xs py-2" style={{ color: t.muted }}>Nenhuma ficha negativa no recorte.</div>
            ) : (
              <table className="w-full text-xs">
                <tbody>
                  {d.devedores_gerados.map((dg) => (
                    <tr key={`${dg.motorista_id}`} style={{ borderTop: `1px solid ${t.border}` }}>
                      <td className="py-1.5" style={{ color: t.textSec }}>{dg.nome}</td>
                      <td className="py-1.5 text-right font-mono" style={{ color: t.red }}>R$ {fmtInt(dg.valor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* RODAPÉ — saldos e valor total */}
      <div className="rounded-xl p-4 relative" style={cardStyle}>
        <GlowLine color={t.gold} />
        {cardHeading(t, 'Saldos do período')}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <RodapeItem t={t} label="Saldo crédito (subtotal)" valor={r.subtotal_credito} cor={t.green} />
          <RodapeItem t={t} label="Saldo débito (total)" valor={r.total_debito} cor={t.red} />
          <RodapeItem
            t={t}
            label="VALOR TOTAL FECHAMENTO"
            valor={r.valor_total_fechamento}
            cor={r.valor_total_fechamento >= 0 ? t.gold : t.red}
            grande
          />
        </div>
      </div>

      {/* Fechamentos que compõem o recorte */}
      <div className="rounded-xl p-4 relative overflow-x-auto" style={cardStyle}>
        <GlowLine color={t.purple} />
        {cardHeading(t, `Fechamentos do recorte (${fmtInt(data.fechamentos.length)})`)}
        <table className="w-full text-xs" style={{ minWidth: 560 }}>
          <thead>
            <tr style={{ color: t.muted }}>
              <th className="text-left py-2 font-normal">Período</th>
              <th className="text-left py-2 font-normal">Unidade</th>
              <th className="text-right py-2 font-normal">Fechado em</th>
              <th className="text-right py-2 font-normal">Total razão</th>
              <th className="text-right py-2 font-normal">Custo motorista</th>
              <th className="text-right py-2 font-normal">Valor total</th>
            </tr>
          </thead>
          <tbody>
            {data.fechamentos.map((f) => (
              <tr key={f.id} style={{ borderTop: `1px solid ${t.border}` }}>
                <td className="py-2" style={{ color: t.text }}>{f.periodo_label || '—'}</td>
                <td className="py-2" style={{ color: t.textSec }}>{f.unidade_nome}</td>
                <td className="py-2 text-right font-mono" style={{ color: t.muted }}>{fmtData(f.dt_fechamento)}</td>
                <td className="py-2 text-right font-mono" style={{ color: t.text }}>R$ {fmtInt(f.total_razao)}</td>
                <td className="py-2 text-right font-mono" style={{ color: t.textSec }}>R$ {fmtInt(f.custo_motorista_liq)}</td>
                <td className="py-2 text-right font-mono" style={{ color: f.valor_total >= 0 ? t.green : t.red }}>
                  R$ {fmtInt(f.valor_total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function RodapeItem({
  t, label, valor, cor, grande,
}: {
  t: ThemeTokens
  label: string
  valor: number
  cor: string
  grande?: boolean
}): ReactNode {
  return (
    <div className="rounded-lg p-3" style={{ background: t.bg, border: `1px solid ${t.border}` }}>
      <div className="text-[10px] mb-1" style={{ color: t.muted, fontFamily: 'var(--font-mono)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
        {label}
      </div>
      <div className={`font-mono font-bold ${grande ? 'text-xl' : 'text-base'}`} style={{ color: cor }}>
        R$ {fmtInt(valor)}
      </div>
    </div>
  )
}
