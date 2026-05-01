'use client'
/* ═══════════════════════════════════════════════════════════════
   Hooks de API — Conecta frontend aos endpoints FastAPI
   Padrão: { data, loading, error, refetch }
   Fallback: mock data quando API falha (apenas em dev)
   ═══════════════════════════════════════════════════════════════ */

import { useState, useEffect, useCallback, useRef } from 'react'
import api from '@/lib/api'
import type {
  ExtratoAPI,
  ExtratoResponseAPI,
  SaldoAPI,
  PaginatedResponseAPI,
  ResumoKPIsAPI,
  FluxoCaixaAPI,
  ConcilDiaAPI,
  ConcilResumoAPI,
  ConcilMovimentoAPI,
  ConcilDiaDetalheAPI,
  NotificacaoAPI,
} from '@/lib/types'

// ── Generic fetch hook ────────────────────────────────────────

interface UseApiResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
}

type ApiParamValue = string | number | string[] | number[] | undefined

/** Limpa params removendo undefined/null/empty e preservando arrays (repeat
 *  format que FastAPI consome em `Query(List[...])`). */
function buildCleanParams(
  params?: Record<string, ApiParamValue>,
): Record<string, string | string[]> {
  const cleanParams: Record<string, string | string[]> = {}
  if (!params) return cleanParams
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue
    if (Array.isArray(v)) {
      const arr = v.map(String).filter(Boolean)
      if (arr.length > 0) cleanParams[k] = arr
    } else {
      cleanParams[k] = String(v)
    }
  }
  return cleanParams
}

function useApi<T>(
  url: string | null,
  params?: Record<string, ApiParamValue>,
): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const fetch = useCallback(() => {
    if (!url) return
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    setLoading(true)
    setError(null)

    const cleanParams = buildCleanParams(params)

    api
      .get<T>(url, { params: cleanParams, signal: ctrl.signal })
      .then((res) => {
        if (!ctrl.signal.aborted) {
          setData(res.data)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!ctrl.signal.aborted) {
          setError(err?.response?.data?.detail || err.message || 'Erro ao carregar')
          setLoading(false)
        }
      })
  }, [url, JSON.stringify(params)])

  useEffect(() => {
    fetch()
    return () => abortRef.current?.abort()
  }, [fetch])

  return { data, loading, error, refetch: fetch }
}

/** Cap atual do backend (`Query(registros: int, le=1000)` em
 *  `app/routers/cp_cr.py`). Exportado para visibilidade nos testes. */
export const PAGINATED_ALL_PAGE_SIZE = 1000

/** Pagina ate esgotar e concatena `dados`. Funcao pura para facilitar
 *  testes — `useApiPaginatedAll` apenas cuida do ciclo React em volta. */
export async function fetchAllPages(
  fetcher: (pagina: number, registros: number) => Promise<PaginatedResponseAPI>,
): Promise<PaginatedResponseAPI> {
  const allDados: PaginatedResponseAPI['dados'] = []
  let pagina = 1
  let totalPaginas = 1
  let totalRegistros = 0

  while (pagina <= totalPaginas) {
    const res = await fetcher(pagina, PAGINATED_ALL_PAGE_SIZE)
    allDados.push(...res.dados)
    totalPaginas = res.paginas || 1
    totalRegistros = res.total
    // Defesa: se o backend retornar pagina vazia antes do esperado,
    // nao entra em loop infinito.
    if (res.dados.length === 0) break
    pagina += 1
  }

  return {
    total: totalRegistros,
    pagina: 1,
    registros: allDados.length,
    paginas: 1,
    dados: allDados,
  }
}

/** Pagina automaticamente um endpoint que retorna `PaginatedResponseAPI`
 *  ate esgotar todas as paginas. Usado para KPIs/breakdowns que precisam
 *  do conjunto completo de lancamentos (Step 13 — Parte C).
 *
 *  Retorna o mesmo shape de `useApi<PaginatedResponseAPI>`, mas com
 *  `dados` contendo TODAS as linhas concatenadas. `pagina` vira 1,
 *  `registros` reflete o total carregado e `paginas` vira 1.
 */
function useApiPaginatedAll(
  url: string | null,
  params?: Record<string, ApiParamValue>,
): UseApiResult<PaginatedResponseAPI> {
  const [data, setData] = useState<PaginatedResponseAPI | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const fetch = useCallback(() => {
    if (!url) return
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    setLoading(true)
    setError(null)

    const baseParams = buildCleanParams(params)

    fetchAllPages(async (pagina, registros) => {
      const res = await api.get<PaginatedResponseAPI>(url, {
        params: { ...baseParams, pagina: String(pagina), registros: String(registros) },
        signal: ctrl.signal,
      })
      return res.data
    })
      .then((merged) => {
        if (!ctrl.signal.aborted) {
          setData(merged)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!ctrl.signal.aborted) {
          setError(err?.response?.data?.detail || err.message || 'Erro ao carregar')
          setLoading(false)
        }
      })
  }, [url, JSON.stringify(params)])

  useEffect(() => {
    fetch()
    return () => abortRef.current?.abort()
  }, [fetch])

  return { data, loading, error, refetch: fetch }
}

// ── Extrato ───────────────────────────────────────────────────

export function useExtrato(
  empresaId: number | null,
  dtInicio?: string,
  dtFim?: string,
  projetoIds?: string[],
  incluirProjecao?: boolean,
) {
  return useApi<ExtratoResponseAPI>(
    empresaId ? `/empresas/${empresaId}/extrato` : null,
    {
      dt_inicio: dtInicio,
      dt_fim: dtFim,
      projeto_ids: projetoIds,
      incluir_projecao: incluirProjecao ? 'true' : undefined,
    },
  )
}

// ── Saldos por conta ──────────────────────────────────────────

export function useSaldos(
  empresaId: number | null,
  dtInicio?: string,
  dtFim?: string,
  projetoIds?: string[],
  incluirProjecao?: boolean,
) {
  return useApi<SaldoAPI[]>(
    empresaId ? `/empresas/${empresaId}/saldos` : null,
    {
      dt_inicio: dtInicio,
      dt_fim: dtFim,
      projeto_ids: projetoIds,
      incluir_projecao: incluirProjecao ? 'true' : undefined,
    },
  )
}

// ── CP (Contas a Pagar) ──────────────────────────────────────

export function useCP(
  empresaId: number | null,
  opts?: {
    status?: string
    pagina?: number
    registros?: number
    favorecido?: string
    dtInicio?: string
    dtFim?: string
    projetoIds?: string[]
  },
) {
  return useApi<PaginatedResponseAPI>(
    empresaId ? `/empresas/${empresaId}/cp` : null,
    {
      status: opts?.status,
      pagina: opts?.pagina,
      registros: opts?.registros ?? 500,
      favorecido: opts?.favorecido,
      data_inicio: opts?.dtInicio,
      data_fim: opts?.dtFim,
      projeto_ids: opts?.projetoIds,
    },
  )
}

export function useCPResumo(
  empresaId: number | null,
  dtInicio?: string,
  dtFim?: string,
  projetoIds?: string[],
) {
  return useApi<ResumoKPIsAPI>(
    empresaId ? `/empresas/${empresaId}/cp/resumo` : null,
    { data_inicio: dtInicio, data_fim: dtFim, projeto_ids: projetoIds },
  )
}

/** Variante de `useCP` que pagina automaticamente ate trazer TODOS os
 *  lancamentos (Step 13 — Parte C). Use em KPIs, breakdowns e contextos
 *  enviados pra IA — ou seja, qualquer lugar que NAO seja a tabela
 *  paginada da pagina /cp-cr. Para a tabela visual, prefira `useCP`. */
export function useCPAll(
  empresaId: number | null,
  opts?: {
    status?: string
    favorecido?: string
    dtInicio?: string
    dtFim?: string
    projetoIds?: string[]
  },
) {
  return useApiPaginatedAll(
    empresaId ? `/empresas/${empresaId}/cp` : null,
    {
      status: opts?.status,
      favorecido: opts?.favorecido,
      data_inicio: opts?.dtInicio,
      data_fim: opts?.dtFim,
      projeto_ids: opts?.projetoIds,
    },
  )
}

// ── CR (Contas a Receber) ────────────────────────────────────

export function useCR(
  empresaId: number | null,
  opts?: {
    status?: string
    pagina?: number
    registros?: number
    favorecido?: string
    dtInicio?: string
    dtFim?: string
    projetoIds?: string[]
  },
) {
  return useApi<PaginatedResponseAPI>(
    empresaId ? `/empresas/${empresaId}/cr` : null,
    {
      status: opts?.status,
      pagina: opts?.pagina,
      registros: opts?.registros ?? 500,
      favorecido: opts?.favorecido,
      data_inicio: opts?.dtInicio,
      data_fim: opts?.dtFim,
      projeto_ids: opts?.projetoIds,
    },
  )
}

export function useCRResumo(
  empresaId: number | null,
  dtInicio?: string,
  dtFim?: string,
  projetoIds?: string[],
) {
  return useApi<ResumoKPIsAPI>(
    empresaId ? `/empresas/${empresaId}/cr/resumo` : null,
    { data_inicio: dtInicio, data_fim: dtFim, projeto_ids: projetoIds },
  )
}

/** Variante de `useCR` que pagina automaticamente — ver `useCPAll`. */
export function useCRAll(
  empresaId: number | null,
  opts?: {
    status?: string
    favorecido?: string
    dtInicio?: string
    dtFim?: string
    projetoIds?: string[]
  },
) {
  return useApiPaginatedAll(
    empresaId ? `/empresas/${empresaId}/cr` : null,
    {
      status: opts?.status,
      favorecido: opts?.favorecido,
      data_inicio: opts?.dtInicio,
      data_fim: opts?.dtFim,
      projeto_ids: opts?.projetoIds,
    },
  )
}

// ── Baixas (pagamentos individuais, on-demand) ──────────────

interface BaixaItem {
  data: string | null
  valor: number
  desconto: number
  juros: number
  multa: number
  codigo_baixa?: number
}

interface BaixasResponse {
  baixas: BaixaItem[]
}

export function useBaixas(empresaId: number | null, tipo: 'CP' | 'CR', codigo: number | null) {
  const endpoint = tipo === 'CP' ? 'cp' : 'cr'
  return useApi<BaixasResponse>(
    empresaId && codigo ? `/empresas/${empresaId}/${endpoint}/${codigo}/baixas` : null,
  )
}

// ── Fluxo de Caixa ───────────────────────────────────────────

/** Step 13 — Parte D: contrato explicito do fluxo de caixa.
 *
 *  - `dataFim` (DD/MM/YYYY): horizonte fixo. Usado quando o consumidor
 *    quer respeitar o filtro global de data.
 *  - `horizonteDias`: janela em dias a partir de hoje. Tem prioridade
 *    sobre `dataFim`. Usado por KPIs como "Fluxo 30d" que devem ignorar
 *    o filtro global e sempre olhar para frente.
 *
 *  Backend valida `1 <= horizonte_dias <= 365`.
 */
export function useFluxoCaixa(
  empresaId: number | null,
  dataFim?: string,
  projetoIds?: string[],
  horizonteDias?: number,
) {
  return useApi<FluxoCaixaAPI>(
    empresaId ? `/empresas/${empresaId}/fluxo-caixa` : null,
    {
      data_fim: dataFim,
      horizonte_dias: horizonteDias,
      projeto_ids: projetoIds,
    },
  )
}

// ── Conciliação ──────────────────────────────────────────────

export function useConcilCalendario(empresaId: number | null, projetoIds?: string[]) {
  return useApi<ConcilDiaAPI[]>(
    empresaId ? `/empresas/${empresaId}/conciliacao/calendario` : null,
    { projeto_ids: projetoIds },
  )
}

export function useConcilResumo(empresaId: number | null, projetoIds?: string[]) {
  return useApi<ConcilResumoAPI>(
    empresaId ? `/empresas/${empresaId}/conciliacao/resumo` : null,
    { projeto_ids: projetoIds },
  )
}

export function useConcilMovimentacao(empresaId: number | null, projetoIds?: string[]) {
  return useApi<ConcilMovimentoAPI[]>(
    empresaId ? `/empresas/${empresaId}/conciliacao/movimentacao` : null,
    { projeto_ids: projetoIds },
  )
}

export function useConcilDia(empresaId: number | null, data: string | null, projetoIds?: string[]) {
  return useApi<ConcilDiaDetalheAPI>(
    empresaId && data ? `/empresas/${empresaId}/conciliacao/dia/${data}` : null,
    { projeto_ids: projetoIds },
  )
}

// ── Notificações ─────────────────────────────────────────────

export function useNotificacoes(limit?: number) {
  return useApi<NotificacaoAPI[]>('/notificacoes', { limit: limit ?? 50 })
}

export function useNotificacoesContagem() {
  return useApi<{ nao_lidas: number }>('/notificacoes/contagem')
}

export async function marcarNotificacaoLida(id: number) {
  return api.patch(`/notificacoes/${id}/ler`)
}

export async function marcarTodasLidas() {
  return api.post('/notificacoes/ler-todas')
}

// ── Categorias Omie (dinâmicas) ─────────────────────────────

export interface CategoriaAPIItem {
  descricao: string
  nivel1: string
  nivel2: string
  /** Override manual do grupo DRE para esta empresa. Null = usa inferência por prefixo */
  grupo_dre: string | null
}

export function useCategorias(empresaId: number | null) {
  return useApi<Record<string, CategoriaAPIItem>>(
    empresaId ? `/empresas/${empresaId}/categorias` : null,
  )
}

/** Define ou remove o override de grupo DRE de uma categoria por empresa.
 *  Passe `grupoDre=null` para remover o override. */
export async function updateCategoriaGrupoDRE(
  empresaId: number,
  codigo: string,
  grupoDre: string | null,
) {
  return api.patch(`/empresas/${empresaId}/categorias/${codigo}`, {
    grupo_dre: grupoDre,
  })
}

/** Sincroniza APENAS o plano de contas (categorias) da Omie — síncrono.
 *  Retorna `{ sincronizadas, empresa_id }` quando bem-sucedido. */
export async function syncCategoriasEmpresa(empresaId: number) {
  const res = await api.post<{ sincronizadas: number; empresa_id: number; aviso?: string }>(
    `/empresas/${empresaId}/categorias/sync`,
  )
  return res.data
}

/** Aplica override de grupo DRE em várias categorias de uma só vez.
 *  Passe `grupoDre=null` para remover o override em todas. */
export async function bulkUpdateCategoriasGrupoDRE(
  empresaId: number,
  codigos: string[],
  grupoDre: string | null,
) {
  const res = await api.post<{ updated: number; grupo_dre: string | null; nao_encontradas: string[] }>(
    `/empresas/${empresaId}/categorias/bulk-override`,
    { codigos, grupo_dre: grupoDre },
  )
  return res.data
}

// ── Contas Bancárias (admin) ────────────────────────────────

export interface ContaBancariaAPIItem {
  id: number           // omie_id
  descricao: string | null
  banco: string | null
  tipo: string | null
  ativa: boolean       // inverso de inativo
  incluir_bi: boolean
  is_projecao: boolean
}

export function useContasBancarias(empresaId: number | null) {
  return useApi<ContaBancariaAPIItem[]>(
    empresaId ? `/empresas/${empresaId}/contas` : null,
  )
}

/** Atualiza flags de uma conta bancária. Omita um campo para não alterar. */
export async function updateContaBancariaFlags(
  empresaId: number,
  omieId: number,
  flags: { incluir_bi?: boolean; is_projecao?: boolean },
) {
  const res = await api.patch<ContaBancariaAPIItem>(
    `/empresas/${empresaId}/contas-bancarias/${omieId}`,
    flags,
  )
  return res.data
}
