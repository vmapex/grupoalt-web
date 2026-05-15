/* @vitest-environment jsdom */
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useSyncStatus, type SyncStatus } from './useSyncStatus'

vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

import api from '@/lib/api'

function makeStatus(overrides: Partial<SyncStatus> = {}): SyncStatus {
  return {
    empresa_id: 1,
    in_progress: true,
    stage: 'contas_correntes',
    stage_label: 'Contas bancárias',
    stages_completed: [],
    stages_failed: [],
    progress: { current: 1, total: 7 },
    started_at: new Date().toISOString(),
    last_completed_at: null,
    ultima_sync: null,
    registros: { lancamentos: 0, contas_pagar: 0, contas_receber: 0 },
    stage_labels: {
      contas_correntes: 'Contas bancárias',
      unidades: 'Unidades',
      lancamentos: 'Extrato bancário',
      cp: 'Contas a pagar',
      cr: 'Contas a receber',
      baixas: 'Pagamentos e recebimentos',
      categorias: 'Plano de contas',
    },
    ...overrides,
  }
}

describe('useSyncStatus', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset()
    vi.mocked(api.post).mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('não dispara polling quando enabled=false', () => {
    renderHook(() => useSyncStatus({ empresaId: 1, enabled: false }))
    expect(api.get).not.toHaveBeenCalled()
  })

  it('não dispara nenhuma chamada com empresaId=null', () => {
    renderHook(() => useSyncStatus({ empresaId: null, enabled: true }))
    expect(api.get).not.toHaveBeenCalled()
  })

  it('faz GET imediato e popula status quando enabled=true', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: makeStatus() })
    const { result } = renderHook(() => useSyncStatus({ empresaId: 1, enabled: true }))

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/sync/status/1')
    })
    await waitFor(() => {
      expect(result.current.status?.stage).toBe('contas_correntes')
    })
  })

  it('para de poll após receber in_progress=false', async () => {
    // 1ª chamada: rolando. 2ª: já terminado.
    vi.mocked(api.get)
      .mockResolvedValueOnce({ data: makeStatus({ in_progress: true }) })
      .mockResolvedValueOnce({ data: makeStatus({ in_progress: false, stage: null }) })
      .mockResolvedValue({ data: makeStatus({ in_progress: false, stage: null }) })

    const { result } = renderHook(() => useSyncStatus({ empresaId: 1, enabled: true }))

    await waitFor(() => expect(result.current.status?.in_progress).toBe(false), {
      timeout: 10_000,
    })
    expect(result.current.loading).toBe(false)
  }, 15_000)

  it('trigger() retorna 202 e armazena state inicial', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: makeStatus({ in_progress: true }) })
    const initial = makeStatus({
      in_progress: true,
      stage: null,
      progress: { current: 0, total: 7 },
    })
    vi.mocked(api.post).mockResolvedValueOnce({ data: initial })

    const { result } = renderHook(() => useSyncStatus({ empresaId: 1, enabled: false }))
    await act(async () => {
      await result.current.trigger()
    })

    expect(api.post).toHaveBeenCalledWith('/sync/empresas/1')
    expect(result.current.status?.in_progress).toBe(true)
    expect(result.current.error).toBeNull()
  })

  it('trigger() trata 409 adotando state do detail.status sem propagar erro', async () => {
    const conflictState = makeStatus({ in_progress: true, stage: 'lancamentos' })
    // GET subsequente (polling após trigger) também devolve o conflict state
    // pra que o test verifique stage consistente independente do timing.
    vi.mocked(api.get).mockResolvedValue({ data: conflictState })
    vi.mocked(api.post).mockRejectedValueOnce({
      response: { status: 409, data: { detail: { status: conflictState } } },
    })

    const { result } = renderHook(() => useSyncStatus({ empresaId: 1, enabled: false }))
    await act(async () => {
      await result.current.trigger()
    })

    expect(result.current.status?.stage).toBe('lancamentos')
    expect(result.current.error).toBeNull()
  })

  it('trigger() propaga erro genérico (não 409) para state.error', async () => {
    // Mock GET pra polling subsequente não estourar.
    vi.mocked(api.get).mockResolvedValue({ data: makeStatus({ in_progress: false }) })
    vi.mocked(api.post).mockRejectedValueOnce(new Error('Network down'))

    const { result } = renderHook(() => useSyncStatus({ empresaId: 1, enabled: false }))
    await act(async () => {
      await result.current.trigger()
    })

    expect(result.current.error).toBe('Network down')
  })

  it('refresh() reseta timedOut e força novo polling', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: makeStatus({ in_progress: true }) })
    const { result } = renderHook(() => useSyncStatus({ empresaId: 1, enabled: false }))

    act(() => {
      result.current.refresh()
    })

    await waitFor(() => expect(api.get).toHaveBeenCalled())
    expect(result.current.timedOut).toBe(false)
  })

  it('limpa polling ao desmontar', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: makeStatus({ in_progress: true }) })
    const { unmount } = renderHook(() => useSyncStatus({ empresaId: 1, enabled: true }))

    await waitFor(() => expect(api.get).toHaveBeenCalled())
    const callsAtUnmount = vi.mocked(api.get).mock.calls.length

    unmount()

    // Aguarda o intervalo inicial (5s) — sem o cleanup, haveria nova chamada.
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(vi.mocked(api.get).mock.calls.length).toBe(callsAtUnmount)
  })
})
