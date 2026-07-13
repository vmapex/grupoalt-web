'use client'
import { useThemeStore } from '@/store/themeStore'

interface DREErrorBannerProps {
  /** Mensagem de erro do hook `useDRE` (null/'' quando saudável). */
  error: string | null
  /** Callback de retry — normalmente o `refetch` do `useDRE`. */
  onRetry?: () => void
  /** Classes extra de espaçamento, conforme o layout do consumidor. */
  className?: string
}

/**
 * Banner de erro do DRE backend. Renderiza `null` quando `error` é falsy.
 *
 * Contexto (Fase 5.G / PR-6): o cálculo DRE local foi removido — o endpoint
 * backend `/dre` (via `useDRE`) virou fonte única. Sem o fallback local, uma
 * falha do `/dre` (5xx, 403, timeout, rede) deixava Dashboard / Caixa /
 * DRE-mensal / Análise IA mostrando ZEROS silenciosos (`dreData=null` ou
 * `EMPTY_DRE`), indistinguíveis de "mês sem movimento". Este banner torna a
 * falha explícita e oferece "Tentar novamente" (refetch do hook).
 */
export function DREErrorBanner({ error, onRetry, className }: DREErrorBannerProps) {
  const t = useThemeStore((s) => s.tokens)
  if (!error) return null

  return (
    <div
      role="alert"
      className={`flex items-start gap-2.5 rounded-lg px-3.5 py-2.5 ${className ?? ''}`}
      style={{ background: t.redDim, border: `1px solid ${t.red}40` }}
    >
      <span aria-hidden className="text-sm leading-none mt-0.5">⚠️</span>
      <div className="min-w-0 flex-1">
        <div
          className="text-[11px] font-semibold"
          style={{ color: t.red, fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}
        >
          Não foi possível carregar o DRE
        </div>
        <div className="text-[10px] mt-0.5 break-words" style={{ color: t.textSec }}>
          Os indicadores abaixo podem aparecer zerados. {error}
        </div>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 rounded-md px-2.5 py-1 text-[10px] font-medium transition-colors"
          style={{ background: `${t.red}1F`, color: t.red, border: `1px solid ${t.red}55` }}
        >
          Tentar novamente
        </button>
      )}
    </div>
  )
}
