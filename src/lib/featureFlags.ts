/* ═══════════════════════════════════════════════════════════════
   Feature flags do front.

   Convencao: variaveis `NEXT_PUBLIC_*` sao inlined em build pelo
   Next.js (estaticas por deploy). Para alterar uma flag em prod,
   eh preciso novo deploy. Para alterar em dev, basta editar
   `.env.local` e reiniciar `npm run dev`.

   Cada flag exporta um getter (`useBackendDRE()`) em vez de uma
   constante pra facilitar override em testes via `vi.stubEnv`.
   ═══════════════════════════════════════════════════════════════ */

/**
 * Quando `true`, paginas BI/Portal consomem o endpoint backend
 * `GET /v1/empresas/{id}/dre` em vez de calcular DRE localmente
 * via `calcularDRE` em `src/lib/planoContas.ts`.
 *
 * Fase 5.F (ADR-001): default `false` em prod inicial pra soak
 * controlado. Backend ja esta em prod silencioso desde os merges
 * dos PRs api #91/#92/#93. Ligar a flag eh operacao separada.
 *
 * Fase 5.G (apos 7-14 dias de soak com flag ligada): remove
 * `calcularDRE` do `planoContas.ts` + caixaBuilder.ts + esta flag.
 */
export function useBackendDRE(): boolean {
  return process.env.NEXT_PUBLIC_USE_BACKEND_DRE === 'true'
}

/**
 * Quando `true`, paginas em modo dev/staging renderizam o
 * componente `<ComparativoDRE />` lado a lado com o DRE em uso.
 *
 * Ativo automaticamente quando `NODE_ENV !== 'production'`. Em
 * prod, soh ativa se `NEXT_PUBLIC_DRE_COMPARATIVO=true` (escape
 * hatch para validacao manual em staging Vercel).
 */
export function useDREComparativo(): boolean {
  if (process.env.NEXT_PUBLIC_DRE_COMPARATIVO === 'true') return true
  return process.env.NODE_ENV !== 'production'
}
