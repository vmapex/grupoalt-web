'use client'
/* ═══════════════════════════════════════════════════════════════
   Fase D — BI do Motor · Visão Executiva (D1).

   Substitui o Power BI publish-to-web (link público, alimentado à mão
   pelas planilhas de fechamento): lê a API do Motor ao vivo via proxy
   /motor/bi/executivo (cache 5min) e apresenta KPIs, evolução YoY,
   faturamento por unidade, ABC de clientes COM margem e por tipo de
   veículo. Mês corrente (parcial) é marcado e não deve ser comparado.

   Gate: fechamento:bi (PermissionGate aqui + require no Sidebar +
   has_permission no backend — o gate real é o do backend).
   fmtInt para leitura; fmtK SÓ em eixos/labels de gráfico.
   ═══════════════════════════════════════════════════════════════ */
import { useEffect, useMemo, useState } from 'react'
import {
  ResponsiveContainer, ComposedChart, BarChart, Bar, Line, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, LabelList,
} from 'recharts'
import { useThemeStore } from '@/store/themeStore'
import { PermissionGate } from '@/components/auth/PermissionGate'
import { KPICard } from '@/components/ui/KPICard'
import { GlowLine } from '@/components/ui/GlowLine'
import { CustomTooltip } from '@/components/charts/CustomTooltip'
import { fmtInt, fmtPct, fmtK, fmtBRL } from '@/lib/formatters'
import { useMotorBiExecutivo } from '@/hooks/api/useMotorBi'

const MESES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ']
const ANO_MIN = 2024 // início do histórico das planilhas importadas

function AcessoRestrito() {
  const t = useThemeStore((s) => s.tokens)
  return (
    <div className="rounded-xl p-8 text-center" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
      <div className="text-sm" style={{ color: t.textSec }}>
        Acesso restrito — o BI do Motor exige a permissão <span style={{ color: t.gold }}>fechamento:bi</span>.
      </div>
      <div className="text-xs mt-2" style={{ color: t.muted }}>
        Solicite ao administrador no cadastro de perfis do portal.
      </div>
    </div>
  )
}

function BiExecutivoContent() {
  const t = useThemeStore((s) => s.tokens)
  const anoAtual = new Date().getFullYear()
  const [ano, setAno] = useState(anoAtual)
  const [unidadeId, setUnidadeId] = useState<number | null>(null)
  const { data, loading, error, refetch } = useMotorBiExecutivo({ ano, unidade_id: unidadeId })

  // Opções do filtro de unidade vêm da resposta SEM filtro (quando filtra,
  // por_unidade colapsa numa só) — guarda a última lista completa vista.
  const [unidadeOpts, setUnidadeOpts] = useState<{ id: number; label: string }[]>([])
  useEffect(() => {
    if (!unidadeId && data?.por_unidade?.length) {
      setUnidadeOpts(
        data.por_unidade
          .filter((u) => u.chave != null)
          .map((u) => ({ id: u.chave as number, label: u.label })),
      )
    }
  }, [data, unidadeId])

  const anos = useMemo(() => {
    const list: number[] = []
    for (let a = anoAtual; a >= ANO_MIN; a--) list.push(a)
    return list
  }, [anoAtual])

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

  const selectStyle = {
    background: t.surface,
    border: `1px solid ${t.border}`,
    color: t.text,
  } as const

  const cardStyle = { background: t.surface, border: `1px solid ${t.border}` } as const
  const heading = (label: string) => (
    <div
      className="text-[10px] mb-3"
      style={{ color: t.muted, fontFamily: 'var(--font-mono)', letterSpacing: '0.2em', textTransform: 'uppercase' }}
    >
      {label}
    </div>
  )

  return (
    <div className="space-y-5">
      {/* Header + filtros */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl" style={{ color: t.text, fontFamily: 'var(--font-display)' }}>
            BI do Motor — Visão Executiva
          </h1>
          <p className="text-xs mt-1" style={{ color: t.muted }}>
            Dados ao vivo do Motor de Fechamento · atualização a cada 5 minutos
            {mesParcial ? ` · ${MESES[mesParcial - 1]} em andamento (parcial)` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={ano}
            onChange={(e) => setAno(Number(e.target.value))}
            className="rounded-lg px-3 py-2 text-xs focus:outline-none"
            style={selectStyle}
            aria-label="Ano"
          >
            {anos.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <select
            value={unidadeId ?? ''}
            onChange={(e) => setUnidadeId(e.target.value ? Number(e.target.value) : null)}
            className="rounded-lg px-3 py-2 text-xs focus:outline-none"
            style={selectStyle}
            aria-label="Unidade"
          >
            <option value="">Todas as unidades</option>
            {unidadeOpts.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
          </select>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl px-4 py-3 flex items-center justify-between gap-4"
          style={{ background: t.redDim, border: `1px solid ${t.red}55`, color: t.text }}
        >
          <span className="text-xs">Falha ao carregar o BI do Motor: {error}</span>
          <button
            onClick={refetch}
            className="text-xs px-3 py-1.5 rounded-lg shrink-0"
            style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.text }}
          >
            Tentar de novo
          </button>
        </div>
      )}

      {loading && !data && (
        <div className="rounded-xl p-10 text-center text-xs" style={{ ...cardStyle, color: t.muted }}>
          Carregando BI do Motor…
        </div>
      )}

      {data && data.kpis.viagens === 0 && !loading && (
        <div className="rounded-xl p-6 text-center text-xs" style={{ ...cardStyle, color: t.muted }}>
          Sem viagens registradas no Motor para {ano}
          {unidadeId ? ' nesta unidade' : ''}. O histórico das planilhas pode ainda não ter sido importado.
        </div>
      )}

      {data && (
        <>
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
            {heading(`Faturamento mês a mês — ${ano} vs ${ano - 1}${mesParcial ? ` · ${MESES[mesParcial - 1]} parcial (hachurado)` : ''}`)}
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
              {heading('Faturamento por unidade')}
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
              {heading('Receita por tipo de veículo (tipo efetivo da viagem)')}
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

          {/* ABC clientes com margem — upgrade sobre o Power BI (que só tinha receita) */}
          <div className="rounded-xl p-4 relative overflow-x-auto" style={cardStyle}>
            <GlowLine color={t.green} />
            {heading('Clientes — faturamento e margem (top 12)')}
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
        </>
      )}
    </div>
  )
}

export default function BiMotorPage() {
  return (
    <PermissionGate require="fechamento:bi" fallback={<AcessoRestrito />}>
      <BiExecutivoContent />
    </PermissionGate>
  )
}
