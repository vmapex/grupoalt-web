'use client'

import { useEffect, useRef } from 'react'

import { useSyncStatus } from '@/hooks/useSyncStatus'
import { SyncProgress } from './SyncProgress'

/**
 * ADR-002 — Plug-and-play wrapper para páginas que consomem endpoints
 * com campo `sync_pending`.
 *
 * Uso típico:
 *   const { data, refetch } = useExtrato(empresaId, ...)
 *   <SyncWatcher
 *     empresaId={empresaId}
 *     pending={data?.sync_pending}
 *     onComplete={refetch}
 *   />
 *
 * - Quando `pending=true`, monta o polling e renderiza `<SyncProgress />`.
 * - Quando o polling detecta `in_progress: false`, chama `onComplete()`
 *   exatamente uma vez por ciclo de sync.
 * - Quando `pending` volta a false (refetch trouxe dados), desliga
 *   o polling.
 */

interface SyncWatcherProps {
  empresaId: number | null
  pending: boolean | null | undefined
  onComplete?: () => void
  /** Mostra o componente em modo `compact` (inline em headers). */
  compact?: boolean
}

export function SyncWatcher({
  empresaId,
  pending,
  onComplete,
  compact = false,
}: SyncWatcherProps) {
  const enabled = pending === true && empresaId !== null
  const { status, error, timedOut, refresh } = useSyncStatus({
    empresaId,
    enabled,
  })

  // Dispara onComplete UMA vez por ciclo de sync (quando transita
  // de in_progress=true → false).
  const wasInProgressRef = useRef(false)
  useEffect(() => {
    if (!enabled) return
    const isInProgress = status?.in_progress === true
    if (wasInProgressRef.current && !isInProgress) {
      onComplete?.()
    }
    wasInProgressRef.current = isInProgress
  }, [status?.in_progress, enabled, onComplete])

  if (!enabled) return null

  return (
    <SyncProgress
      status={status}
      error={error}
      timedOut={timedOut}
      onRetry={refresh}
      variant={compact ? 'compact' : 'card'}
    />
  )
}
