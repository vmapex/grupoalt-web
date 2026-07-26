'use client'
/* Peças compartilhadas entre as abas do /bi/motor (loading/erro/vazio +
   heading de card no padrão mono do BI financeiro). Prefixo _ tira o
   arquivo do roteamento do App Router. */
import type { ReactNode } from 'react'
import { useThemeStore, type ThemeTokens } from '@/store/themeStore'

export const MESES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ']

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

export function BiErro({ erro, onRetry }: { erro: string; onRetry: () => void }) {
  const t = useThemeStore((s) => s.tokens)
  return (
    <div
      role="alert"
      className="rounded-xl px-4 py-3 flex items-center justify-between gap-4"
      style={{ background: t.redDim, border: `1px solid ${t.red}55`, color: t.text }}
    >
      <span className="text-xs">Falha ao carregar o BI do Motor: {erro}</span>
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
      Carregando BI do Motor…
    </div>
  )
}

export function BiVazio({ ano, unidade }: { ano: number; unidade: boolean }) {
  const t = useThemeStore((s) => s.tokens)
  return (
    <div className="rounded-xl p-6 text-center text-xs" style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.muted }}>
      Sem viagens registradas no Motor para {ano}
      {unidade ? ' nesta unidade' : ''}. O histórico das planilhas pode ainda não ter sido importado.
    </div>
  )
}

export function BiEmConstrucao({ titulo, fase, itens }: { titulo: string; fase: string; itens: string[] }) {
  const t = useThemeStore((s) => s.tokens)
  return (
    <div className="rounded-xl p-8" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
      <div className="text-sm mb-1" style={{ color: t.text, fontFamily: 'var(--font-display)' }}>{titulo}</div>
      <div
        className="text-[9px] mb-4 inline-block px-2 py-0.5 rounded-full"
        style={{ color: t.gold, background: t.goldDim, fontFamily: 'var(--font-mono)', letterSpacing: '0.16em', textTransform: 'uppercase' }}
      >
        Em construção · {fase}
      </div>
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
