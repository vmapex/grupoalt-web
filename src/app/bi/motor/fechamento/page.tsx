'use client'
/* ═══════════════════════════════════════════════════════════════
   BI do Motor · Fechamento AO VIVO (D3, 2026-07-30).

   Espelho do período ABERTO de cada unidade calculado AGORA pelo
   motor server-side do Motor (preview — nada é persistido): a visão
   que o Power BI antigo nunca teve. Consome /fechamento-bi/ao-vivo
   (cache 120s no backend). O filtro global ANO não se aplica — o
   ao-vivo é sempre o período corrente; UNIDADE aplica.
   fmtInt em leitura; fmtK é exclusivo de gráfico.
   ═══════════════════════════════════════════════════════════════ */
import { useThemeStore, type ThemeTokens } from '@/store/themeStore'
import { useBiMotorStore } from '@/store/biMotorStore'
import { GlowLine } from '@/components/ui/GlowLine'
import { fmtInt, fmtPct } from '@/lib/formatters'
import { BiErro, BiCarregando, cardHeading } from '../_shared'
import {
  useFechamentoBiAoVivo,
  type FechamentoBiAoVivoItemAPI,
} from '@/hooks/api/useFechamentoBi'

function fmtData(iso: string | null | undefined): string {
  if (!iso || iso.length < 10) return '—'
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`
}

function BarraProgresso({ pct, t }: { pct: number; t: ThemeTokens }) {
  return (
    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: t.border }}>
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: t.gold }}
      />
    </div>
  )
}

function CardUnidade({ item, t }: { item: FechamentoBiAoVivoItemAPI; t: ThemeTokens }) {
  if (!item.suportado) {
    return (
      <div className="rounded-xl p-4" style={{ background: t.surface, border: `1px solid ${t.border}`, opacity: 0.7 }}>
        <div className="text-xs mb-1" style={{ color: t.textSec }}>{item.unidade_nome}</div>
        <div className="text-[10px]" style={{ color: t.muted, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>
          {item.tipo_periodo === 'NAVIO' ? 'PERÍODO POR NAVIO' : 'SEM PERÍODO DE CALENDÁRIO'}
        </div>
        <div className="text-[10px] mt-2" style={{ color: t.muted }}>{item.motivo}</div>
      </div>
    )
  }
  const p = item.periodo!
  const tot = item.totais!
  const prog = item.progresso!
  return (
    <div className="rounded-xl p-4 relative" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
      <GlowLine color={p.ja_fechado ? t.green : t.gold} />
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="text-xs" style={{ color: t.text, fontFamily: 'var(--font-display)' }}>{item.unidade_nome}</div>
        <span
          className="text-[8px] px-1.5 py-0.5 rounded-full shrink-0"
          style={p.ja_fechado
            ? { color: t.green, background: `${t.green}22`, border: `1px solid ${t.green}55` }
            : { color: t.gold, background: t.goldDim, border: `1px solid ${t.gold}55` }}
        >
          {p.ja_fechado ? 'JÁ FECHADO' : 'EM ABERTO'}
        </span>
      </div>
      <div className="text-[10px] mb-2" style={{ color: t.muted, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }}>
        {p.label} · {fmtData(p.dt_ini)} → {fmtData(p.dt_fim)}
      </div>
      <BarraProgresso pct={prog.pct} t={t} />
      <div className="text-[9px] mt-1 mb-3" style={{ color: t.muted }}>
        dia {fmtInt(prog.dias_decorridos)} de {fmtInt(prog.dias_total)} · {fmtPct(prog.pct)} do período
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
        <div>
          <div className="text-[9px]" style={{ color: t.muted }}>FATURAMENTO</div>
          <div className="text-sm font-mono" style={{ color: t.gold }}>R$ {fmtInt(tot.faturamento)}</div>
        </div>
        <div>
          <div className="text-[9px]" style={{ color: t.muted }}>CUSTO MOT.</div>
          <div className="text-sm font-mono" style={{ color: t.textSec }}>R$ {fmtInt(tot.custo_motorista)}</div>
        </div>
        <div>
          <div className="text-[9px]" style={{ color: t.muted }}>RESULTADO</div>
          <div className="text-sm font-mono" style={{ color: tot.resultado >= 0 ? t.green : t.red }}>
            R$ {fmtInt(tot.resultado)}
          </div>
        </div>
        <div>
          <div className="text-[9px]" style={{ color: t.muted }}>VIAGENS</div>
          <div className="text-sm font-mono" style={{ color: t.text }}>{fmtInt(tot.viagens)}</div>
        </div>
      </div>
    </div>
  )
}

export default function FechamentoAoVivoPage() {
  const t = useThemeStore((s) => s.tokens)
  const unidadeId = useBiMotorStore((s) => s.unidadeId)
  const { data, loading, error, refetch } = useFechamentoBiAoVivo(unidadeId)

  if (error) return <BiErro erro={error} onRetry={refetch} />
  if (loading && !data) return <BiCarregando />
  if (!data) return null

  const suportados = data.itens.filter((i) => i.suportado)
  const naoSuportados = data.itens.filter((i) => !i.suportado)
  // Detalhe por motorista: quando o recorte cai numa única unidade.
  const detalhe = suportados.length === 1 ? suportados[0] : null

  return (
    <div className="space-y-5">
      {/* Nota de natureza do dado — prévia, não persistida */}
      <div
        className="rounded-lg px-3 py-2 text-[11px] flex items-start gap-2"
        style={{ background: t.goldDim, border: `1px solid ${t.gold}55`, color: t.textSec }}
      >
        <span aria-hidden="true" style={{ color: t.gold }}>◉</span>
        <span>
          <span style={{ color: t.gold, fontWeight: 600 }}>PRÉVIA AO VIVO</span> — período corrente
          calculado agora pelo motor do fechamento ({fmtData(data.hoje)}), nada é gravado; os números
          finais são os do fechamento processado. O filtro de ANO não se aplica aqui. Atualiza a cada
          ~2 minutos.
        </span>
      </div>

      {data.itens.length === 0 && (
        <div className="rounded-xl p-6 text-center text-xs" style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.muted }}>
          Nenhuma unidade no recorte.
        </div>
      )}

      {/* Cards por unidade (suportadas primeiro — o backend já ordena) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {suportados.map((i) => <CardUnidade key={i.unidade_id} item={i} t={t} />)}
        {naoSuportados.map((i) => <CardUnidade key={i.unidade_id} item={i} t={t} />)}
      </div>

      {/* Detalhe por motorista (unidade única no recorte) */}
      {detalhe && detalhe.por_motorista && detalhe.por_motorista.length > 0 && (
        <div className="rounded-xl p-4 relative overflow-x-auto" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
          <GlowLine color={t.blue} />
          {cardHeading(t, `Por motorista — ${detalhe.unidade_nome} · ${detalhe.periodo?.label} (prévia)`)}
          <table className="w-full text-xs" style={{ minWidth: 560 }}>
            <thead>
              <tr style={{ color: t.muted }}>
                <th className="text-left py-2 font-normal">Motorista</th>
                <th className="text-right py-2 font-normal">Viagens</th>
                <th className="text-right py-2 font-normal">Custo</th>
                <th className="text-right py-2 font-normal">Seguro</th>
                <th className="text-right py-2 font-normal">Imposto</th>
                <th className="text-right py-2 font-normal">Líquido</th>
              </tr>
            </thead>
            <tbody>
              {detalhe.por_motorista.map((m) => (
                <tr key={m.motorista_id ?? m.nome} style={{ borderTop: `1px solid ${t.border}` }}>
                  <td className="py-2" style={{ color: t.text }}>{m.nome}</td>
                  <td className="py-2 text-right font-mono" style={{ color: t.textSec }}>{fmtInt(m.viagens)}</td>
                  <td className="py-2 text-right font-mono" style={{ color: t.text }}>R$ {fmtInt(m.custo)}</td>
                  <td className="py-2 text-right font-mono" style={{ color: t.textSec }}>R$ {fmtInt(m.seguro)}</td>
                  <td className="py-2 text-right font-mono" style={{ color: t.textSec }}>R$ {fmtInt(m.imposto)}</td>
                  <td className="py-2 text-right font-mono" style={{ color: m.liquido >= 0 ? t.green : t.red }}>
                    R$ {fmtInt(m.liquido)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!detalhe && suportados.length > 1 && (
        <div className="text-[10px] text-center" style={{ color: t.muted }}>
          Selecione uma unidade no filtro para abrir o detalhe por motorista.
        </div>
      )}
    </div>
  )
}
