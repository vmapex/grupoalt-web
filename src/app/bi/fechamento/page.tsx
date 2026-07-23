'use client'
/* ═══════════════════════════════════════════════════════════════
   BI de Fechamento · Faturamento — tela principal do módulo.
   Base = HISTÓRICO DE FECHAMENTO consolidado (/fechamento-bi/resumo);
   filtros globais do layout (ano/mês/quinzena-dezena/navio/unidade).
   fmtInt em leitura; fmtK só em eixos/labels de gráfico.
   ═══════════════════════════════════════════════════════════════ */
import { useMemo } from 'react'
import Link from 'next/link'
import { History } from 'lucide-react'
import {
  ResponsiveContainer, ComposedChart, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, LabelList,
} from 'recharts'
import { useThemeStore } from '@/store/themeStore'
import { KPICard } from '@/components/ui/KPICard'
import { GlowLine } from '@/components/ui/GlowLine'
import { CustomTooltip } from '@/components/charts/CustomTooltip'
import { BarLabelVar } from '@/components/charts/BarLabelVar'
import { fmtInt, fmtPct, fmtK } from '@/lib/formatters'
import { MESES, MesTriTick, BiErro, BiCarregando, BiVazio, cardHeading } from './_shared'
import { useResumoComRecorte } from './_useResumo'

function fmtData(iso: string | null): string {
  if (!iso || iso.length < 10) return '—'
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(2, 4)}`
}

export default function FaturamentoPage() {
  const t = useThemeStore((s) => s.tokens)
  const {
    loading, error, refetch, ano, mes,
    recorteAtivo, labelRecorte, fechamentos, visao,
  } = useResumoComRecorte()

  const serie = useMemo(() => {
    if (!visao) return []
    return visao.serieMensal.map((m, i) => ({
      name: MESES[i],
      faturamento: m.faturamento,
      custo: m.custo,
      margem: m.margem,
    }))
  }, [visao])

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

      {/* KPI strip */}
      <div className="rounded-xl overflow-hidden relative" style={cardStyle}>
        <GlowLine color={t.gold} />
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
          <KPICard
            label="Faturamento"
            value={`R$ ${fmtInt(k.faturamento)}`}
            color={t.text}
            accent={t.gold}
            sub={`${fmtInt(k.fechamentos)} fechamento(s)${sufixoRecorte}`}
          />
          <KPICard
            label="Custo"
            value={`R$ ${fmtInt(k.custo)}`}
            color={t.text}
            accent={t.red}
            sub={k.faturamento > 0 ? `${fmtPct((k.custo / k.faturamento) * 100)} da receita` : undefined}
          />
          <KPICard
            label="Margem"
            value={fmtPct(k.margem_pct)}
            color={k.margem >= 0 ? t.green : t.red}
            accent={t.green}
            sub={`R$ ${fmtInt(k.margem)}`}
          />
          <KPICard
            label="Viagens"
            value={fmtInt(k.viagens)}
            color={t.text}
            accent={t.blue}
            sub={k.viagens > 0 ? `ticket médio R$ ${fmtInt(k.faturamento / k.viagens)}` : undefined}
          />
          <KPICard
            label="Cabeças"
            value={k.cabecas != null ? fmtInt(k.cabecas) : '—'}
            color={t.text}
            accent={t.purple}
            sub={k.cabecas == null ? 'indisponível no recorte intra-mês' : k.cabecas > 0 ? `R$ ${fmtInt(k.faturamento / k.cabecas)} / cabeça` : undefined}
          />
          <KPICard
            label="KM rodados"
            value={k.km != null ? fmtInt(k.km) : '—'}
            color={t.text}
            accent={t.blue}
            sub={k.km == null ? 'indisponível no recorte intra-mês' : k.km > 0 ? `R$ ${fmtInt(k.faturamento / k.km)} / km` : undefined}
            borderRight={false}
          />
        </div>
      </div>

      {/* Faturamento mês a mês com variação % sobre o mês anterior
          (pedido da validação 2026-07-23: sem custo aqui — custo tem
          lente própria na aba Custo × Faturamento). */}
      <div className="rounded-xl p-4 relative" style={cardStyle}>
        <GlowLine color={t.gold} />
        <div className="flex items-start justify-between gap-3">
          {cardHeading(t, `Faturamento mês a mês — ${ano}${sufixoRecorte} (▲▼ variação sobre o mês anterior)`)}
          <Link
            href="/bi/fechamento/faturamento-5-anos"
            className="flex items-center gap-1.5 text-[10px] shrink-0 rounded-full px-2.5 py-1 transition-all"
            style={{ color: t.gold, background: t.goldDim, border: `1px solid ${t.border}`, fontWeight: 600, letterSpacing: '0.04em' }}
          >
            <History size={11} /> Comparar 5 anos
          </Link>
        </div>
        <div style={{ height: 290 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={serie} margin={{ top: 34 }}>
              <CartesianGrid vertical={false} stroke={t.gridLine} />
              <XAxis dataKey="name" tick={<MesTriTick t={t} />} height={34} axisLine={false} tickLine={false} interval={0} />
              <YAxis tick={{ fontSize: 9, fill: t.muted }} axisLine={false} tickLine={false} tickFormatter={(v) => fmtK(v)} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="faturamento" name="Faturamento" radius={[3, 3, 0, 0]} barSize={26} fill={t.gold}>
                <LabelList
                  dataKey="faturamento"
                  content={(props) => (
                    <BarLabelVar {...(props as object)} fill={t.gold} data={serie} dataKey="faturamento" />
                  )}
                />
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Faturamento por unidade */}
        <div className="rounded-xl p-4 relative" style={cardStyle}>
          <GlowLine color={t.gold} />
          {cardHeading(t, 'Resultado por unidade')}
          <div style={{ height: Math.max(200, (visao.porUnidade.length || 1) * 34) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={visao.porUnidade} layout="vertical" margin={{ right: 56 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="unidade_nome" width={130} tick={{ fontSize: 9, fill: t.textSec, fontFamily: "'JetBrains Mono', monospace" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="faturamento" name="Faturamento" fill={t.gold} radius={[0, 3, 3, 0]} barSize={12}>
                  <LabelList dataKey="faturamento" position="right" formatter={(v: number) => fmtK(v)} style={{ fontSize: 9, fill: t.muted, fontFamily: "'JetBrains Mono', monospace" }} />
                </Bar>
                <Bar dataKey="margem" name="Margem" radius={[0, 3, 3, 0]} barSize={12}>
                  {visao.porUnidade.map((u, i) => (
                    <Cell key={i} fill={u.margem >= 0 ? t.green : t.red} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tabela por unidade (números de leitura) */}
        <div className="rounded-xl p-4 relative overflow-x-auto" style={cardStyle}>
          <GlowLine color={t.blue} />
          {cardHeading(t, 'Unidades — números do recorte')}
          <table className="w-full text-xs" style={{ minWidth: 440 }}>
            <thead>
              <tr style={{ color: t.muted }}>
                <th className="text-left py-2 font-normal">Unidade</th>
                <th className="text-right py-2 font-normal">Fech.</th>
                <th className="text-right py-2 font-normal">Viagens</th>
                <th className="text-right py-2 font-normal">Faturamento</th>
                <th className="text-right py-2 font-normal">Margem</th>
              </tr>
            </thead>
            <tbody>
              {visao.porUnidade.map((u) => (
                <tr key={u.unidade_id} style={{ borderTop: `1px solid ${t.border}` }}>
                  <td className="py-2" style={{ color: t.text }}>{u.unidade_nome}</td>
                  <td className="py-2 text-right font-mono" style={{ color: t.textSec }}>{fmtInt(u.fechamentos)}</td>
                  <td className="py-2 text-right font-mono" style={{ color: t.textSec }}>{fmtInt(u.viagens)}</td>
                  <td className="py-2 text-right font-mono" style={{ color: t.text }}>R$ {fmtInt(u.faturamento)}</td>
                  <td className="py-2 text-right font-mono" style={{ color: u.margem >= 0 ? t.green : t.red }}>
                    R$ {fmtInt(u.margem)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fechamentos do recorte */}
      <div className="rounded-xl p-4 relative overflow-x-auto" style={cardStyle}>
        <GlowLine color={t.purple} />
        {cardHeading(t, `Fechamentos do recorte (${fmtInt(fechamentos.length)})`)}
        <table className="w-full text-xs" style={{ minWidth: 640 }}>
          <thead>
            <tr style={{ color: t.muted }}>
              <th className="text-left py-2 font-normal">Período</th>
              <th className="text-left py-2 font-normal">Unidade</th>
              <th className="text-right py-2 font-normal">Fechado em</th>
              <th className="text-right py-2 font-normal">Viagens</th>
              <th className="text-right py-2 font-normal">Faturamento</th>
              <th className="text-right py-2 font-normal">Custo</th>
              <th className="text-right py-2 font-normal">Margem</th>
            </tr>
          </thead>
          <tbody>
            {fechamentos.map((f) => (
              <tr key={f.id} style={{ borderTop: `1px solid ${t.border}` }}>
                <td className="py-2" style={{ color: t.text }}>{f.periodo_label || `${fmtData(f.dt_ini)} – ${fmtData(f.dt_fim)}`}</td>
                <td className="py-2" style={{ color: t.textSec }}>{f.unidade_nome}</td>
                <td className="py-2 text-right font-mono" style={{ color: t.muted }}>{fmtData(f.dt_fechamento)}</td>
                <td className="py-2 text-right font-mono" style={{ color: t.textSec }}>{fmtInt(f.viagens)}</td>
                <td className="py-2 text-right font-mono" style={{ color: t.text }}>R$ {fmtInt(f.faturamento)}</td>
                <td className="py-2 text-right font-mono" style={{ color: t.textSec }}>R$ {fmtInt(f.custo)}</td>
                <td className="py-2 text-right font-mono" style={{ color: f.margem >= 0 ? t.green : t.red }}>
                  R$ {fmtInt(f.margem)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
