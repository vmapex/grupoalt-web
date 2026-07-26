'use client'
/* Peças compartilhadas entre as telas do /bi/fechamento (mesmo padrão do
   _shared do /bi/motor). Prefixo _ tira o arquivo do roteamento. */
import type { ReactNode } from 'react'
import { useThemeStore, type ThemeTokens } from '@/store/themeStore'

export const MESES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ']

/**
 * Tick de eixo X em duas linhas: mês em cima e o marcador do trimestre
 * (1º TRI…4º TRI) sob o mês central de cada tri — espelho do eixo do
 * Power BI de referência; prepara a mudança de granularidade mês/tri.
 * Uso: <XAxis tick={<MesTriTick t={t} />} height={34} …/>
 */
export function MesTriTick(props: {
  x?: number
  y?: number
  payload?: { value?: string; index?: number }
  t: ThemeTokens
}) {
  const { x = 0, y = 0, payload, t } = props
  const nome = payload?.value ?? ''
  const idx = payload?.index ?? MESES.indexOf(nome)
  // FEV/MAI/AGO/NOV (mês do meio do tri) carregam o rótulo do trimestre.
  const tri = idx % 3 === 1 ? `${Math.floor(idx / 3) + 1}º TRI` : null
  const mono = "'JetBrains Mono', monospace"
  return (
    <g>
      <text x={x} y={y + 10} textAnchor="middle" fontSize={9} fontFamily={mono} fill={t.muted}>
        {nome}
      </text>
      {tri && (
        <text x={x} y={y + 24} textAnchor="middle" fontSize={8} fontFamily={mono} fill={t.gold} letterSpacing="0.12em">
          {tri}
        </text>
      )}
    </g>
  )
}

export function cardHeading(t: ThemeTokens, label: string): ReactNode {
  return (
    <div
      className="text-[10px] mb-3"
      style={{ color: t.muted, fontFamily: 'var(--font-mono)', letterSpacing: '0.2em', textTransform: 'uppercase' }}
    >
      {label}
    </div>
  )
}

/**
 * Aviso de filtro global SEM EFEITO na tela atual. Cada tela declara os
 * filtros que não consegue aplicar (ex.: quinzena/dezena no Crédito &
 * Débito, navio nos lançamentos de posto) e o que está sendo exibido no
 * lugar — sem isso o usuário seleciona um recorte e a tela segue igual
 * em silêncio, o que numa validação de paridade lê como divergência.
 * Renderiza nada quando a lista está vazia (nenhum filtro ignorado ativo).
 */
export function FiltrosSemEfeito({ filtros, exibindo }: { filtros: string[]; exibindo: string }) {
  const t = useThemeStore((s) => s.tokens)
  if (filtros.length === 0) return null
  return (
    <div
      className="rounded-lg px-3 py-2 text-[11px] flex items-start gap-2"
      style={{ background: `${t.amber}14`, border: `1px solid ${t.amber}55`, color: t.textSec }}
    >
      <span aria-hidden="true" style={{ color: t.amber }}>⚠</span>
      <span>
        {filtros.length === 1 ? 'O filtro' : 'Os filtros'}{' '}
        <span style={{ color: t.amber, fontWeight: 600 }}>{filtros.join(' · ')}</span>{' '}
        {filtros.length === 1 ? 'não se aplica' : 'não se aplicam'} a esta tela — exibindo {exibindo}.
      </span>
    </div>
  )
}

export function BiErro({ erro, onRetry }: { erro: string; onRetry: () => void }) {
  const t = useThemeStore((s) => s.tokens)
  return (
    <div
      role="alert"
      className="rounded-xl px-4 py-3 flex items-center justify-between gap-4"
      style={{ background: t.redDim, border: `1px solid ${t.red}55`, color: t.text }}
    >
      <span className="text-xs">Falha ao carregar o BI de Fechamento: {erro}</span>
      <button
        onClick={onRetry}
        className="text-xs px-3 py-1.5 rounded-lg shrink-0"
        style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.text }}
      >
        Tentar de novo
      </button>
    </div>
  )
}

export function BiCarregando() {
  const t = useThemeStore((s) => s.tokens)
  return (
    <div className="rounded-xl p-10 text-center text-xs" style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.muted }}>
      Carregando BI de Fechamento…
    </div>
  )
}

export function BiVazio({ mensagem }: { mensagem: string }) {
  const t = useThemeStore((s) => s.tokens)
  return (
    <div className="rounded-xl p-6 text-center text-xs" style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.muted }}>
      {mensagem}
    </div>
  )
}

/** Tela estruturada, ainda sem dados — lista o que a etapa seguinte entrega. */
export function TelaEmConstrucao({ titulo, descricao, itens }: { titulo: string; descricao: string; itens: string[] }) {
  const t = useThemeStore((s) => s.tokens)
  return (
    <div className="rounded-xl p-8" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
      <div className="text-sm mb-1" style={{ color: t.text, fontFamily: 'var(--font-display)' }}>{titulo}</div>
      <div
        className="text-[9px] mb-3 inline-block px-2 py-0.5 rounded-full"
        style={{ color: t.gold, background: t.goldDim, fontFamily: 'var(--font-mono)', letterSpacing: '0.16em', textTransform: 'uppercase' }}
      >
        Em construção · shell do módulo
      </div>
      <p className="text-xs mb-4" style={{ color: t.textSec }}>{descricao}</p>
      <ul className="space-y-1.5">
        {itens.map((i) => (
          <li key={i} className="text-xs flex items-start gap-2" style={{ color: t.textSec }}>
            <span style={{ color: t.gold }}>·</span> {i}
          </li>
        ))}
      </ul>
    </div>
  )
}
