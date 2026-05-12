import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

import type {
  FixtureExpected,
  FixtureInput,
  FixtureMeta,
  OracleFixture,
} from './types'

const FIXTURES_ROOT = path.resolve(__dirname, 'fixtures')

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(file, 'utf8')) as T
}

function isDir(p: string): boolean {
  try {
    return statSync(p).isDirectory()
  } catch {
    return false
  }
}

/**
 * Varre `tests/oracle/fixtures/<grupo>/<id>/` e devolve a lista de
 * fixtures válidas. Uma fixture válida é um diretório com os 3
 * arquivos `meta.json`, `input.json` e `expected.json`.
 *
 * Diretórios sem os 3 arquivos são silenciosamente ignorados — útil
 * para slots ainda vazios (placeholders enquanto se aguarda dado
 * do financeiro).
 */
export function loadAllFixtures(): OracleFixture[] {
  if (!isDir(FIXTURES_ROOT)) return []

  const result: OracleFixture[] = []
  const groups = readdirSync(FIXTURES_ROOT).filter((g) =>
    isDir(path.join(FIXTURES_ROOT, g)),
  )

  for (const group of groups) {
    const groupDir = path.join(FIXTURES_ROOT, group)
    const cases = readdirSync(groupDir).filter((c) =>
      isDir(path.join(groupDir, c)),
    )

    for (const id of cases) {
      const dir = path.join(groupDir, id)
      const metaFile = path.join(dir, 'meta.json')
      const inputFile = path.join(dir, 'input.json')
      const expectedFile = path.join(dir, 'expected.json')

      try {
        statSync(metaFile)
        statSync(inputFile)
        statSync(expectedFile)
      } catch {
        continue
      }

      const meta = readJson<FixtureMeta>(metaFile)
      const input = readJson<FixtureInput>(inputFile)
      const expected = readJson<FixtureExpected>(expectedFile)

      result.push({
        meta,
        input,
        expected,
        path: `${group}/${id}`,
      })
    }
  }

  result.sort((a, b) => a.path.localeCompare(b.path))
  return result
}

/**
 * Decide se um cenário deve usar `it.todo` (esqueleto) ao invés de
 * `it`. Regra: kind `known-divergence` cujos subtotais esperados
 * ainda não foram preenchidos. Demais kinds rodam normalmente.
 */
export function isTodoFixture(fixture: OracleFixture): boolean {
  if (fixture.meta.kind !== 'known-divergence') return false
  const values = Object.entries(fixture.expected)
    .filter(([k]) => k !== 'tolerance')
    .map(([, v]) => v)
  return values.every((v) => v === null || v === undefined)
}
