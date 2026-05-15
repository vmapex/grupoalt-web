'use client'

import type { SyncStatus } from '@/hooks/useSyncStatus'
import { useThemeStore } from '@/store/themeStore'

interface SyncProgressProps {
  status: SyncStatus | null
  /** Disparado quando usuário clica "tentar novamente" após erro/timeout. */
  onRetry?: () => void
  /** Mostrado quando o polling estourou o timeout de 10min. */
  timedOut?: boolean
  error?: string | null
  /** Compacto: usado em headers / inline. Padrão: card grande. */
  variant?: 'card' | 'compact'
}

function formatElapsed(startedAtIso: string | null): string | null {
  if (!startedAtIso) return null
  const startedAt = new Date(startedAtIso).getTime()
  if (Number.isNaN(startedAt)) return null
  const seconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000))
  if (seconds < 60) return `iniciado há ${seconds}s`
  const minutes = Math.floor(seconds / 60)
  return `iniciado há ${minutes} min`
}

export function SyncProgress({
  status,
  onRetry,
  timedOut,
  error,
  variant = 'card',
}: SyncProgressProps) {
  const t = useThemeStore((s) => s.tokens)

  if (!status && !error && !timedOut) {
    return null
  }

  const percent = status?.progress
    ? Math.min(100, Math.round((status.progress.current / Math.max(1, status.progress.total)) * 100))
    : 0
  const elapsed = formatElapsed(status?.started_at ?? null)
  const hasFailures = (status?.stages_failed.length ?? 0) > 0
  const finished = status?.in_progress === false && status !== null && !timedOut

  // ── Compact variant ────────────────────────────────────────────────────
  if (variant === 'compact') {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex items-center gap-3 rounded-md px-3 py-2 text-sm"
        style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.text }}
      >
        <div
          className="h-2 w-2 animate-pulse rounded-full"
          style={{ background: status?.in_progress ? t.gold : t.green }}
        />
        <span style={{ color: t.textSec }}>
          {status?.in_progress
            ? `Sincronizando: ${status?.stage_label ?? '...'}`
            : finished
              ? 'Sincronização concluída'
              : 'Aguardando...'}
        </span>
        {status?.progress && status.in_progress && (
          <span style={{ color: t.muted }}>
            {status.progress.current}/{status.progress.total}
          </span>
        )}
      </div>
    )
  }

  // ── Card variant (default) ────────────────────────────────────────────
  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-lg p-5"
      style={{ background: t.surface, border: `1px solid ${t.border}` }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-base font-medium" style={{ color: t.text }}>
            {timedOut ? (
              <>
                <span className="text-xl" aria-hidden="true">⏱️</span>
                <span>Sincronização demorou mais que o esperado</span>
              </>
            ) : finished && !hasFailures ? (
              <>
                <span className="text-xl" aria-hidden="true">✅</span>
                <span>Sincronização concluída</span>
              </>
            ) : finished && hasFailures ? (
              <>
                <span className="text-xl" aria-hidden="true">⚠️</span>
                <span>Sincronização concluída com avisos</span>
              </>
            ) : (
              <>
                <span
                  className="inline-block h-2.5 w-2.5 animate-pulse rounded-full"
                  style={{ background: t.gold }}
                  aria-hidden="true"
                />
                <span>Sincronizando dados da Omie</span>
              </>
            )}
          </div>

          {status?.in_progress && status.stage_label && (
            <div className="mt-1 text-sm" style={{ color: t.textSec }}>
              <span>{status.stage_label}</span>
              {status.progress && (
                <span style={{ color: t.muted }}>
                  {' '}— etapa {status.progress.current} de {status.progress.total}
                </span>
              )}
            </div>
          )}

          {elapsed && status?.in_progress && (
            <div className="mt-1 text-xs" style={{ color: t.muted }}>
              {elapsed}
            </div>
          )}
        </div>

        {onRetry && (timedOut || (finished && hasFailures) || error) && (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
            style={{
              background: t.gold,
              color: t.isDark ? '#050A14' : '#ffffff',
            }}
          >
            Tentar novamente
          </button>
        )}
      </div>

      {/* Progress bar */}
      {status?.in_progress && (
        <div className="mt-4">
          <div
            className="h-2 w-full overflow-hidden rounded-full"
            style={{ background: t.surface3 }}
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full transition-all duration-500 ease-out"
              style={{ width: `${percent}%`, background: t.gold }}
            />
          </div>
        </div>
      )}

      {/* Failed stages summary */}
      {hasFailures && status?.stages_failed && (
        <div className="mt-4 rounded-md p-3 text-sm" style={{ background: t.amberDim, color: t.text }}>
          <div className="font-medium" style={{ color: t.amber }}>
            {status.stages_failed.length === 1
              ? 'Uma etapa falhou:'
              : `${status.stages_failed.length} etapas falharam:`}
          </div>
          <ul className="mt-1.5 list-inside list-disc space-y-0.5">
            {status.stages_failed.map((f) => (
              <li key={f.stage} style={{ color: t.textSec }}>
                <span className="font-medium" style={{ color: t.text }}>
                  {status.stage_labels?.[f.stage] ?? f.stage}
                </span>
                {f.error && <span style={{ color: t.muted }}> — {f.error}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Generic error (network, 5xx) */}
      {error && !status && (
        <div className="mt-4 rounded-md p-3 text-sm" style={{ background: t.redDim, color: t.red }}>
          {error}
        </div>
      )}

      {/* Timeout hint */}
      {timedOut && (
        <div className="mt-3 text-sm" style={{ color: t.textSec }}>
          A sincronização passou de 10 minutos sem retornar. Pode ter
          terminado em segundo plano — clique em &quot;Tentar novamente&quot; para
          recarregar o status.
        </div>
      )}
    </div>
  )
}
