/* @vitest-environment jsdom */
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useDRE, type DREResponse } from './useDRE'

vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
  },
}))

import api from '@/lib/api'

function makeResponse(overrides: Partial<DREResponse> = {}): DREResponse {
  return {
    subtotais: {
      RoB: 150000, TDCF: 20000, RL: 130000, CV: 50000, MC: 80000,
      CF: 45000, EBT1: 35000, RNOP: 0, DNOP: 0, SNOP: 0, EBT2: 35000,
      IRPJ: 1000, CSLL: 500, RES_LIQ: 33500,
    },
    neutros: [],
    meta: {
      empresa_id: 1,
      dt_inicio: '2026-04-01',
      dt_fim: '2026-04-30',
      projeto_omie_ids: null,
      granularity: 'total',
      total_lancamentos: 19,
    },
    subtotais_por_periodo: null,
    ...overrides,
  }
}

describe('useDRE — Fase 5.F', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('não chama API quando empresaId=null', async () => {
    const { result } = renderHook(() => useDRE(null))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(api.get).not.toHaveBeenCalled()
    expect(result.current.data).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('faz GET no path /empresas/{id}/dre quando empresaId valido', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: makeResponse() })
    renderHook(() => useDRE(42))
    await waitFor(() => {
      expect(api.get).toHaveBeenCalled()
    })
    const [path] = vi.mocked(api.get).mock.calls[0]
    expect(path).toBe('/empresas/42/dre')
  })

  it('popula data quando GET retorna sucesso', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: makeResponse() })
    const { result } = renderHook(() => useDRE(1))

    await waitFor(() => expect(result.current.data).not.toBeNull())
    expect(result.current.data?.subtotais.RoB).toBe(150000)
    expect(result.current.data?.meta.total_lancamentos).toBe(19)
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('popula error quando GET falha (com detail do backend)', async () => {
    vi.mocked(api.get).mockRejectedValue({
      response: { data: { detail: 'Empresa não encontrada' } },
    })
    const { result } = renderHook(() => useDRE(999))

    await waitFor(() => expect(result.current.error).not.toBeNull())
    expect(result.current.error).toBe('Empresa não encontrada')
    expect(result.current.data).toBeNull()
    expect(result.current.loading).toBe(false)
  })

  it('cai no fallback de mensagem genérica quando erro sem detail', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('Network down'))
    const { result } = renderHook(() => useDRE(1))

    await waitFor(() => expect(result.current.error).not.toBeNull())
    expect(result.current.error).toBe('Network down')
  })

  it('envia dt_inicio e dt_fim como params ISO YYYY-MM-DD', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: makeResponse() })
    renderHook(() =>
      useDRE(1, { dt_inicio: '2026-04-01', dt_fim: '2026-04-30' }),
    )
    await waitFor(() => expect(api.get).toHaveBeenCalled())
    const [, config] = vi.mocked(api.get).mock.calls[0]
    expect(config?.params).toMatchObject({
      dt_inicio: '2026-04-01',
      dt_fim: '2026-04-30',
    })
  })

  it('envia projeto_omie_ids como array (FastAPI repeat format)', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: makeResponse() })
    renderHook(() => useDRE(1, { projeto_omie_ids: ['A', 'B'] }))
    await waitFor(() => expect(api.get).toHaveBeenCalled())
    const [, config] = vi.mocked(api.get).mock.calls[0]
    expect(config?.params).toMatchObject({ projeto_omie_ids: ['A', 'B'] })
  })

  it("OMITE granularity quando 'total' (default) para preservar cache key da Fase 5.D", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: makeResponse() })
    renderHook(() => useDRE(1, { granularity: 'total' }))
    await waitFor(() => expect(api.get).toHaveBeenCalled())
    const [, config] = vi.mocked(api.get).mock.calls[0]
    expect(config?.params?.granularity).toBeUndefined()
  })

  it("envia granularity quando != 'total'", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: makeResponse() })
    renderHook(() => useDRE(1, { granularity: 'mensal' }))
    await waitFor(() => expect(api.get).toHaveBeenCalled())
    const [, config] = vi.mocked(api.get).mock.calls[0]
    expect(config?.params?.granularity).toBe('mensal')
  })

  it('nao envia params undefined nem array vazio', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: makeResponse() })
    renderHook(() => useDRE(1, { dt_inicio: undefined, projeto_omie_ids: [] }))
    await waitFor(() => expect(api.get).toHaveBeenCalled())
    const [, config] = vi.mocked(api.get).mock.calls[0]
    expect(config?.params).not.toHaveProperty('dt_inicio')
    expect(config?.params).not.toHaveProperty('projeto_omie_ids')
  })

  it('passa AbortController signal nos requests (cancelamento)', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: makeResponse() })
    renderHook(() => useDRE(1))
    await waitFor(() => expect(api.get).toHaveBeenCalled())
    const [, config] = vi.mocked(api.get).mock.calls[0]
    expect(config?.signal).toBeInstanceOf(AbortSignal)
  })

  it('refetch() dispara nova chamada manualmente', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: makeResponse() })
    const { result } = renderHook(() => useDRE(1))

    await waitFor(() => expect(api.get).toHaveBeenCalled())
    const callsBefore = vi.mocked(api.get).mock.calls.length
    result.current.refetch()
    await waitFor(() =>
      expect(vi.mocked(api.get).mock.calls.length).toBeGreaterThan(callsBefore),
    )
  })

  it('decodifica subtotais_por_periodo quando granularity=mensal', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: makeResponse({
        subtotais_por_periodo: [
          {
            periodo: '2026-04',
            total_lancamentos: 10,
            subtotais: {
              RoB: 100, TDCF: 10, RL: 90, CV: 30, MC: 60, CF: 20,
              EBT1: 40, RNOP: 0, DNOP: 0, SNOP: 0, EBT2: 40,
              IRPJ: 0, CSLL: 0, RES_LIQ: 40,
            },
          },
        ],
        meta: {
          empresa_id: 1, dt_inicio: null, dt_fim: null,
          projeto_omie_ids: null, granularity: 'mensal', total_lancamentos: 10,
        },
      }),
    })

    const { result } = renderHook(() => useDRE(1, { granularity: 'mensal' }))
    await waitFor(() => expect(result.current.data).not.toBeNull())
    expect(result.current.data?.subtotais_por_periodo).toHaveLength(1)
    expect(result.current.data?.subtotais_por_periodo?.[0].periodo).toBe('2026-04')
    expect(result.current.data?.meta.granularity).toBe('mensal')
  })
})
