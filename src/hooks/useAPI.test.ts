import { describe, expect, it, vi } from 'vitest'
import { fetchAllPages, PAGINATED_ALL_PAGE_SIZE } from './useAPI'
import type { LancamentoAPI } from '@/lib/types'

/**
 * Step 13 — Parte C: paginacao CP/CR sem truncamento.
 *
 * `fetchAllPages` substitui o uso direto de `registros: 500` em locais
 * que consomem o conjunto completo (KPIs, breakdowns, contexto da IA).
 */

function makeLanc(codigo: number): LancamentoAPI {
  return {
    codigo,
    favorecido: `F${codigo}`,
    categoria: '1.01.01',
    data_emissao: null,
    data_vcto: null,
    data_previsao: null,
    data_pagamento: null,
    valor: 100,
    valor_pago: null,
    valor_aberto: null,
    saldo: 100,
    status: 'A VENCER',
    numero_documento: null,
    numero_parcela: null,
    observacao: null,
    pagamentos: [],
    projeto_omie_id: null,
  }
}

describe('fetchAllPages (Step 13 — Parte C)', () => {
  it('retorna pagina unica quando paginas=1', async () => {
    const fetcher = vi.fn(async () => ({
      total: 3,
      pagina: 1,
      registros: PAGINATED_ALL_PAGE_SIZE,
      paginas: 1,
      dados: [makeLanc(1), makeLanc(2), makeLanc(3)],
    }))
    const result = await fetchAllPages(fetcher)
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(result.total).toBe(3)
    expect(result.dados).toHaveLength(3)
  })

  it('concatena multiplas paginas ate esgotar', async () => {
    const dataset = Array.from({ length: 2500 }, (_, i) => makeLanc(i + 1))
    const fetcher = vi.fn(async (pagina: number, registros: number) => {
      const start = (pagina - 1) * registros
      const slice = dataset.slice(start, start + registros)
      return {
        total: dataset.length,
        pagina,
        registros,
        paginas: Math.ceil(dataset.length / registros),
        dados: slice,
      }
    })
    const result = await fetchAllPages(fetcher)
    expect(fetcher).toHaveBeenCalledTimes(3) // 1000 + 1000 + 500
    expect(result.dados).toHaveLength(2500)
    expect(result.total).toBe(2500)
    expect(result.dados[0].codigo).toBe(1)
    expect(result.dados[2499].codigo).toBe(2500)
  })

  it('para se backend retornar pagina vazia (defesa contra loop)', async () => {
    let calls = 0
    const fetcher = vi.fn(async () => {
      calls += 1
      if (calls === 1) {
        return { total: 999, pagina: 1, registros: 1000, paginas: 5, dados: [makeLanc(1)] }
      }
      // backend mente sobre paginas — retorna vazio na proxima
      return { total: 999, pagina: calls, registros: 1000, paginas: 5, dados: [] }
    })
    const result = await fetchAllPages(fetcher)
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(result.dados).toHaveLength(1)
  })

  it('propaga erro quando fetcher rejeita', async () => {
    const fetcher = vi.fn(async () => {
      throw new Error('boom')
    })
    await expect(fetchAllPages(fetcher)).rejects.toThrow('boom')
  })

  it('chama fetcher com PAGINATED_ALL_PAGE_SIZE', async () => {
    const fetcher = vi.fn(async () => ({
      total: 0, pagina: 1, registros: 1000, paginas: 1, dados: [],
    }))
    await fetchAllPages(fetcher)
    expect(fetcher).toHaveBeenCalledWith(1, PAGINATED_ALL_PAGE_SIZE)
  })
})
