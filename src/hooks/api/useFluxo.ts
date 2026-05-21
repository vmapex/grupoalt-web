'use client'
import { useApi } from './_core'
import type { FluxoCaixaAPI } from '@/lib/types'

/** Step 13 — Parte D: contrato explicito do fluxo de caixa.
 *
 *  - `dataFim` (DD/MM/YYYY): horizonte fixo. Usado quando o consumidor
 *    quer respeitar o filtro global de data.
 *  - `horizonteDias`: janela em dias a partir de hoje. Tem prioridade
 *    sobre `dataFim`. Usado por KPIs como "Fluxo 30d" que devem ignorar
 *    o filtro global e sempre olhar para frente.
 *  - `saldoAtual`: posicao de caixa de partida para a projecao. Default
 *    do backend e 0; passe o valor real do extrato pra que o
 *    `saldo_acumulado` diario reflita o caixa atual do grupo.
 *
 *  Backend valida `1 <= horizonte_dias <= 365`.
 */
export function useFluxoCaixa(
  empresaId: number | null,
  dataFim?: string,
  projetoIds?: string[],
  horizonteDias?: number,
  saldoAtual?: number,
) {
  return useApi<FluxoCaixaAPI>(
    empresaId ? `/empresas/${empresaId}/fluxo-caixa` : null,
    {
      data_fim: dataFim,
      horizonte_dias: horizonteDias,
      saldo_atual: saldoAtual,
      projeto_ids: projetoIds,
    },
  )
}
