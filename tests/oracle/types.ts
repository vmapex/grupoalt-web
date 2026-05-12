/**
 * Tipos compartilhados entre fixtures e runner do oracle financeiro.
 *
 * Cada fixture vive em `tests/oracle/fixtures/<group>/<id>/` e contém
 * três arquivos JSON:
 *   - meta.json      → FixtureMeta (procedência, aprovação, classificação)
 *   - input.json     → FixtureInput (lançamentos + categoriaMap opcional)
 *   - expected.json  → FixtureExpected (subtotais esperados; null = TODO)
 *
 * Ver `docs/oracle-financeiro.md` para o protocolo completo.
 */

import type { CategoriaInfo } from '../../src/lib/planoContas'

/**
 * Origem da expectativa numérica.
 *
 * - `verdade-contabil` — fechado pelo financeiro, com assinatura e data
 *   em `meta.approvedBy/approvedAt`. Falha = regressão real do motor.
 * - `regression-baseline` — captura do output atual de `calcularDRE`,
 *   sem aval do financeiro. Falha = mudança não justificada do motor;
 *   NÃO valida se a regra está contábilmente correta.
 * - `known-divergence` — caso onde o comportamento atual diverge da
 *   expectativa contábil (ex.: bug Math.abs em estornos). Os campos
 *   de `expected` permanecem null; a suite usa `it.todo` até o
 *   financeiro liberar o valor.
 * - `synthetic` — números fabricados para sanity check (ex.: aritmética
 *   da cadeia DRE). Não representa cenário real.
 */
export type FixtureKind =
  | 'verdade-contabil'
  | 'regression-baseline'
  | 'known-divergence'
  | 'synthetic'

export interface FixtureMeta {
  id: string
  kind: FixtureKind
  source: string
  description: string
  approvedBy?: string
  approvedAt?: string
  notes?: string
}

export interface FixtureLancamento {
  valor: number
  categoria: string | null
  data_lancamento?: string
  origem?: string
}

export interface FixtureInput {
  lancamentos: FixtureLancamento[]
  categoriaMap?: Record<string, CategoriaInfo>
}

export type DRESubtotal =
  | 'RoB'
  | 'TDCF'
  | 'RL'
  | 'CV'
  | 'MC'
  | 'CF'
  | 'EBT1'
  | 'RNOP'
  | 'DNOP'
  | 'SNOP'
  | 'EBT2'
  | 'IRPJ'
  | 'CSLL'
  | 'RES_LIQ'

/**
 * Subtotais esperados. `null` em qualquer campo = pendente aprovação
 * do financeiro; o runner converte o cenário em `it.todo` se algum
 * campo esperado vier null e o kind for `known-divergence`.
 *
 * Para `regression-baseline` e `verdade-contabil`, todos os campos
 * devem ser preenchidos.
 *
 * Para `synthetic`, basta preencher os campos que o cenário cobre;
 * os demais podem ser omitidos (não checados).
 */
export type FixtureExpected = {
  [K in DRESubtotal]?: number | null
} & {
  tolerance?: {
    /** Tolerância padrão em reais aplicada a qualquer subtotal. */
    perField?: number
    /** Tolerância por subtotal (sobrescreve `perField`). */
    perSubtotal?: Partial<Record<DRESubtotal, number>>
  }
}

export interface OracleFixture {
  meta: FixtureMeta
  input: FixtureInput
  expected: FixtureExpected
  /** Caminho relativo a `tests/oracle/fixtures/` (ex.: `synthetic/S01-receita-simples`). */
  path: string
}
