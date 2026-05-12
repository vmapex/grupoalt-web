import { describe, expect, it } from 'vitest'

import { calcularDRE } from '../../src/lib/planoContas'

import { isTodoFixture, loadAllFixtures } from './loader'
import type { DRESubtotal, FixtureExpected, OracleFixture } from './types'

/**
 * Suite parametrizada do oracle financeiro.
 *
 * Cada fixture vira um `it()` ou `it.todo()` conforme regras
 * documentadas em `docs/oracle-financeiro.md`. Para adicionar um
 * cenário novo, basta criar `tests/oracle/fixtures/<grupo>/<id>/`
 * com os três JSONs — o loader pega automaticamente.
 *
 * IMPORTANTE: esta suite NÃO altera `src/lib/planoContas.ts`. Ela
 * apenas captura o comportamento do `calcularDRE` contra valores
 * esperados (sejam aprovados pelo financeiro, baseline de regressão
 * ou síntese para sanity check da cadeia DRE).
 */

const SUBTOTAIS: DRESubtotal[] = [
  'RoB',
  'TDCF',
  'RL',
  'CV',
  'MC',
  'CF',
  'EBT1',
  'RNOP',
  'DNOP',
  'SNOP',
  'EBT2',
  'IRPJ',
  'CSLL',
  'RES_LIQ',
]

function toleranceFor(
  expected: FixtureExpected,
  subtotal: DRESubtotal,
): number {
  const perSubtotal = expected.tolerance?.perSubtotal?.[subtotal]
  if (typeof perSubtotal === 'number') return perSubtotal
  return expected.tolerance?.perField ?? 0
}

function runFixture(fixture: OracleFixture): void {
  const dre = calcularDRE(fixture.input.lancamentos, fixture.input.categoriaMap)

  for (const sub of SUBTOTAIS) {
    if (!(sub in fixture.expected)) continue
    const expected = fixture.expected[sub]
    if (expected === null || expected === undefined) continue
    const actual = dre[sub]
    const tolerance = toleranceFor(fixture.expected, sub)
    if (tolerance > 0) {
      expect(
        Math.abs(actual - expected),
        `subtotal ${sub} fora da tolerância (esperado ${expected}, atual ${actual}, tol ±${tolerance})`,
      ).toBeLessThanOrEqual(tolerance)
    } else {
      expect(actual, `subtotal ${sub}`).toBe(expected)
    }
  }
}

const fixtures = loadAllFixtures()

describe('oracle financeiro — fixtures versionadas', () => {
  if (fixtures.length === 0) {
    it('nenhuma fixture encontrada (placeholder)', () => {
      expect.fail(
        'tests/oracle/fixtures/ está vazio. Adicione ao menos uma fixture ou remova a suite.',
      )
    })
    return
  }

  for (const fixture of fixtures) {
    const label = `[${fixture.meta.kind}] ${fixture.path} — ${fixture.meta.description}`
    if (isTodoFixture(fixture)) {
      it.todo(label)
      continue
    }
    it(label, () => runFixture(fixture))
  }
})
