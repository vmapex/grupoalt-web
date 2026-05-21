'use client'
/* ═══════════════════════════════════════════════════════════════
   Barrel de hooks de API.

   O conteudo real foi quebrado por dominio em `src/hooks/api/`
   (refactor P2, 2026-05-21). Este arquivo eh mantido como entry
   point unico para preservar os 19 call sites existentes sem
   precisar tocar nenhum import.

   Para novo codigo, considere importar direto do dominio:
     import { useExtrato } from '@/hooks/api/useExtrato'
   ═══════════════════════════════════════════════════════════════ */

// Infra (exportada para os testes em useAPI.test.ts)
export { fetchAllPages, PAGINATED_ALL_PAGE_SIZE } from './api/_core'

// Extrato
export { useExtrato } from './api/useExtrato'

// Saldos
export { useSaldos } from './api/useSaldos'

// CP/CR + Baixas
export {
  useCP,
  useCPResumo,
  useCPAll,
  useCR,
  useCRResumo,
  useCRAll,
  useBaixas,
} from './api/useCPCR'

// Fluxo de caixa
export { useFluxoCaixa } from './api/useFluxo'

// Conciliacao
export {
  useConcilCalendario,
  useConcilResumo,
  useConcilMovimentacao,
  useConcilDia,
} from './api/useConciliacao'

// Notificacoes
export {
  useNotificacoes,
  useNotificacoesContagem,
  marcarNotificacaoLida,
  marcarTodasLidas,
} from './api/useNotificacoes'

// Categorias / plano de contas
export {
  useCategorias,
  updateCategoriaGrupoDRE,
  syncCategoriasEmpresa,
  bulkUpdateCategoriasGrupoDRE,
} from './api/useCategoriasAPI'
export type { CategoriaAPIItem } from './api/useCategoriasAPI'

// Contas bancarias (admin)
export {
  useContasBancarias,
  updateContaBancariaFlags,
} from './api/useContasBancarias'
export type { ContaBancariaAPIItem } from './api/useContasBancarias'

// Orbit audit (admin — Step 16 Fase C)
export {
  useOrbitAudit,
  useOrbitAuditSummary,
} from './api/useOrbitAudit'
export type {
  OrbitAuditItemAPI,
  OrbitAuditPageAPI,
  OrbitAuditTopUserAPI,
  OrbitAuditTopEmpresaAPI,
  OrbitAuditStatusBucketAPI,
  OrbitAuditSummaryAPI,
  OrbitAuditFilters,
} from './api/useOrbitAudit'

// Admin empresas (P0-7)
export {
  useAdminEmpresas,
  deleteEmpresa,
  restoreEmpresa,
} from './api/useAdminEmpresas'
export type { AdminEmpresaAPI } from './api/useAdminEmpresas'
