import { describe, expect, it } from 'vitest'
import {
  buildCategoriasFromAPI,
  getCategoriaInfo,
  getGrupoDRE,
  type CategoriaInfo,
} from './planoContas'

describe('buildCategoriasFromAPI', () => {
  it('preserva override grupo_dre quando presente', () => {
    const apiData = {
      '1.01': { descricao: '( + ) RECEITAS', nivel1: '', nivel2: '', grupo_dre: null },
      '1.01.01': { descricao: 'RECEITA MI', nivel1: '', nivel2: '', grupo_dre: 'NEUTRO' },
    }
    const result = buildCategoriasFromAPI(apiData)
    expect(result['1.01.01'].grupoDRE).toBe('NEUTRO')
  })

  it('infere grupo_dre por prefixo quando nao ha override', () => {
    const apiData = {
      '1.01.01': { descricao: 'RECEITA MI', nivel1: '', nivel2: '', grupo_dre: null },
    }
    const result = buildCategoriasFromAPI(apiData)
    expect(result['1.01.01'].grupoDRE).toBe('RoB')
  })

  it('usa descricao da categoria-pai como nivel2 quando disponivel', () => {
    const apiData = {
      '1.01': { descricao: '( + ) RECEITAS REALIZADAS', nivel1: '', nivel2: '', grupo_dre: null },
      '1.01.01': { descricao: 'RECEITA MI', nivel1: '', nivel2: '', grupo_dre: null },
    }
    const result = buildCategoriasFromAPI(apiData)
    expect(result['1.01.01'].nivel2).toBe('( + ) RECEITAS REALIZADAS')
  })

  it('override vence inferencia por prefixo (NEUTRO em codigo CV)', () => {
    // Step 14 - cobertura: override da empresa tem prioridade absoluta
    // sobre o mapa estatico/prefixo. 2.03.x normalmente seria CV,
    // mas com override NEUTRO deve sair como NEUTRO.
    const apiData = {
      '2.03.01': { descricao: 'AGREGADOS', nivel1: '', nivel2: '', grupo_dre: 'NEUTRO' },
    }
    const result = buildCategoriasFromAPI(apiData)
    expect(result['2.03.01'].grupoDRE).toBe('NEUTRO')
  })

  it('descarta categoria sem override e sem prefixo conhecido', () => {
    const apiData = {
      '9.99.99': { descricao: 'DESCONHECIDA', nivel1: '', nivel2: '', grupo_dre: null },
    }
    const result = buildCategoriasFromAPI(apiData)
    expect(result['9.99.99']).toBeUndefined()
  })

  it('atribui op="+" para grupos positivos (RoB/RNOP)', () => {
    const apiData = {
      '1.01.01': { descricao: 'RECEITA', nivel1: '', nivel2: '', grupo_dre: null },
      '1.02.01': { descricao: 'MUTUOS', nivel1: '', nivel2: '', grupo_dre: null },
    }
    const result = buildCategoriasFromAPI(apiData)
    expect(result['1.01.01'].op).toBe('+')
    expect(result['1.02.01'].op).toBe('+')
  })

  it('atribui op="-" para grupos negativos (CV/CF/TDCF/DNOP/IRPJ/CSLL)', () => {
    const apiData = {
      '2.01.01': { descricao: 'PIS', nivel1: '', nivel2: '', grupo_dre: null },        // TDCF
      '2.03.01': { descricao: 'AGREG', nivel1: '', nivel2: '', grupo_dre: null },      // CV
      '2.05.93': { descricao: 'SALARIO', nivel1: '', nivel2: '', grupo_dre: null },    // CF
      '2.14.94': { descricao: 'DIVID', nivel1: '', nivel2: '', grupo_dre: null },      // DNOP
      '2.15.99': { descricao: 'IRPJ', nivel1: '', nivel2: '', grupo_dre: null },       // IRPJ
      '2.16.99': { descricao: 'CSLL', nivel1: '', nivel2: '', grupo_dre: null },       // CSLL
    }
    const result = buildCategoriasFromAPI(apiData)
    expect(result['2.01.01'].op).toBe('-')
    expect(result['2.03.01'].op).toBe('-')
    expect(result['2.05.93'].op).toBe('-')
    expect(result['2.14.94'].op).toBe('-')
    expect(result['2.15.99'].op).toBe('-')
    expect(result['2.16.99'].op).toBe('-')
  })
})

/**
 * Step 14 — Helpers do plano de contas
 *
 * `getGrupoDRE` resolve o grupo a partir do mapa estatico CATEGORIAS;
 * se nao encontrar, faz fallback por prefixo (`1.01.*` → RoB etc).
 */
describe('getGrupoDRE — resolucao por mapa estatico + fallback de prefixo', () => {
  it('encontra grupo exato no mapa CATEGORIAS', () => {
    expect(getGrupoDRE('1.01.01')).toBe('RoB')
    expect(getGrupoDRE('2.03.01')).toBe('CV')
    expect(getGrupoDRE('2.05.93')).toBe('CF')
    expect(getGrupoDRE('2.14.99')).toBe('DNOP')
    expect(getGrupoDRE('2.15.99')).toBe('IRPJ')
    expect(getGrupoDRE('2.16.99')).toBe('CSLL')
  })

  it('cai em fallback por prefixo quando codigo nao mapeado existe', () => {
    // Sufixo invalido mas prefixo conhecido → resolve pelo prefixo
    expect(getGrupoDRE('1.01.77')).toBe('RoB')
    expect(getGrupoDRE('2.03.99')).toBe('CV')
    expect(getGrupoDRE('2.05.55')).toBe('CF')
    expect(getGrupoDRE('2.14.50')).toBe('DNOP')
  })

  it('null/undefined/string vazia retornam null', () => {
    expect(getGrupoDRE(null)).toBeNull()
    expect(getGrupoDRE('')).toBeNull()
  })

  it('codigo sem prefixo conhecido retorna null', () => {
    expect(getGrupoDRE('9.99.99')).toBeNull()
    expect(getGrupoDRE('FOOBAR')).toBeNull()
  })

  it('codigo com espacos extras e tratado (trim)', () => {
    expect(getGrupoDRE(' 1.01.01 ')).toBe('RoB')
  })
})

describe('getCategoriaInfo', () => {
  it('retorna info completa quando categoria existe', () => {
    const info = getCategoriaInfo('1.01.01')
    expect(info).not.toBeNull()
    expect(info?.codigo).toBe('1.01.01')
    expect(info?.grupoDRE).toBe('RoB')
    expect(info?.op).toBe('+')
  })

  it('retorna null para categoria desconhecida', () => {
    expect(getCategoriaInfo('9.99.99')).toBeNull()
  })

  it('retorna null para null/string vazia', () => {
    expect(getCategoriaInfo(null)).toBeNull()
    expect(getCategoriaInfo('')).toBeNull()
  })
})
