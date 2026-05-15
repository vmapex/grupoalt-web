'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import api from '@/lib/api'

/**
 * ADR-002 — Polling do estado de sincronização Omie.
 *
 * Shape espelha `app/services/sync_state.py::build_status_response`.
 * Cuidados:
 * - Backoff exponencial 5s → 7s → 10s → 13s → 15s (cap).
 * - Reset do backoff quando `stage` muda (progresso real detectado).
 * - Timeout duro de 10min — para de poll mesmo se backend nunca finalizar.
 * - `enabled=false` mantém o hook montado sem disparar polling
 *   (útil quando o front ainda nem sabe se vai sincronizar).
 */

export interface SyncFailedStage {
  stage: string
  error: string
}

export interface SyncStatus {
  empresa_id: number
  in_progress: boolean
  stage: string | null
  stage_label: string | null
  stages_completed: string[]
  stages_failed: SyncFailedStage[]
  progress: { current: number; total: number }
  started_at: string | null
  last_completed_at: string | null
  ultima_sync: string | null
  registros: {
    lancamentos: number
    contas_pagar: number
    contas_receber: number
  }
  stage_labels: Record<string, string>
}

export const POLL_INTERVAL_INITIAL_MS = 5_000
export const POLL_INTERVAL_MAX_MS = 15_000
export const POLL_TIMEOUT_MS = 10 * 60 * 1_000

function nextInterval(current: number): number {
  // 5 → 7 → 10 → 13 → 15
  return Math.min(Math.round(current * 1.4), POLL_INTERVAL_MAX_MS)
}

interface UseSyncStatusOptions {
  empresaId: number | null
  enabled: boolean
}

interface UseSyncStatusResult {
  status: SyncStatus | null
  loading: boolean
  error: string | null
  /** Para indicar timeout do polling sem resposta de "concluído". */
  timedOut: boolean
  /** Dispara um POST /sync/empresas/{id} e reinicia o polling. */
  trigger: () => Promise<void>
  /** Reseta o estado interno e força um GET imediato. */
  refresh: () => void
}

export function useSyncStatus(opts: UseSyncStatusOptions): UseSyncStatusResult {
  const { empresaId, enabled } = opts
  const [status, setStatus] = useState<SyncStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [timedOut, setTimedOut] = useState(false)

  const intervalRef = useRef<number>(POLL_INTERVAL_INITIAL_MS)
  const lastStageRef = useRef<string | null>(null)
  const startedAtRef = useRef<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cancelledRef = useRef<boolean>(false)

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const fetchOnce = useCallback(async (): Promise<SyncStatus | null> => {
    if (empresaId === null) return null
    try {
      const res = await api.get<SyncStatus>(`/sync/status/${empresaId}`)
      setStatus(res.data)
      // Não limpa `error` em sucesso de polling: erro de `trigger()`
      // continua visível até ser substituído por novo erro de trigger
      // ou novo trigger bem sucedido.
      return res.data
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao consultar status de sync'
      setError(msg)
      return null
    }
  }, [empresaId])

  const stopPolling = useCallback(() => {
    cancelledRef.current = true
    clearTimer()
    setLoading(false)
  }, [])

  const scheduleNext = useCallback(
    (delayMs: number, loop: () => void) => {
      clearTimer()
      timerRef.current = setTimeout(loop, delayMs)
    },
    [],
  )

  const startPolling = useCallback(() => {
    if (empresaId === null || cancelledRef.current) return
    setLoading(true)
    intervalRef.current = POLL_INTERVAL_INITIAL_MS
    lastStageRef.current = null
    if (startedAtRef.current === null) startedAtRef.current = Date.now()

    const tick = async () => {
      if (cancelledRef.current) return
      const data = await fetchOnce()

      // Sem dados: tenta de novo no próximo ciclo.
      if (!data) {
        scheduleNext(intervalRef.current, tick)
        return
      }

      // Stage avançou → reset do backoff (progresso real).
      if (data.stage !== lastStageRef.current) {
        intervalRef.current = POLL_INTERVAL_INITIAL_MS
        lastStageRef.current = data.stage
      } else {
        intervalRef.current = nextInterval(intervalRef.current)
      }

      // Concluído (servidor diz que parou) → stop.
      if (!data.in_progress) {
        setLoading(false)
        return
      }

      // Timeout duro: 10min sem sair de in_progress.
      if (startedAtRef.current !== null && Date.now() - startedAtRef.current > POLL_TIMEOUT_MS) {
        setTimedOut(true)
        setLoading(false)
        return
      }

      scheduleNext(intervalRef.current, tick)
    }

    // Primeira chamada imediata; subsequentes via setTimeout.
    void tick()
  }, [empresaId, fetchOnce, scheduleNext])

  const refresh = useCallback(() => {
    cancelledRef.current = false
    setTimedOut(false)
    startedAtRef.current = Date.now()
    startPolling()
  }, [startPolling])

  const trigger = useCallback(async () => {
    if (empresaId === null) return
    setError(null)
    setTimedOut(false)
    cancelledRef.current = false
    startedAtRef.current = Date.now()
    try {
      const res = await api.post<SyncStatus>(`/sync/empresas/${empresaId}`)
      setStatus(res.data)
    } catch (e: unknown) {
      // 409 → sync já rolando; backend devolveu state no detail.status.
      // Em qualquer outro erro, propaga.
      const err = e as { response?: { status?: number; data?: { detail?: { status?: SyncStatus } } } }
      const conflictStatus = err.response?.status === 409 ? err.response?.data?.detail?.status : undefined
      if (conflictStatus) {
        setStatus(conflictStatus)
      } else {
        const msg = e instanceof Error ? e.message : 'Erro ao iniciar sincronização'
        setError(msg)
      }
    }
    startPolling()
  }, [empresaId, startPolling])

  // Liga / desliga polling conforme prop `enabled`.
  useEffect(() => {
    if (!enabled || empresaId === null) {
      stopPolling()
      return
    }
    cancelledRef.current = false
    startPolling()
    return () => {
      cancelledRef.current = true
      clearTimer()
    }
  }, [enabled, empresaId, startPolling, stopPolling])

  // Cleanup hard no unmount.
  useEffect(() => {
    return () => {
      cancelledRef.current = true
      clearTimer()
    }
  }, [])

  return { status, loading, error, timedOut, trigger, refresh }
}
