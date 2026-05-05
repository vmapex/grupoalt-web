import { describe, expect, it } from 'vitest'
import {
  calcularDRE,
  calcularDREPorMes,
  calcularNeutros,
  buildCategoriasFromAPI,
  getCategoriaInfo,
  getGrupoDRE,
  type CategoriaInfo,
} from './planoContas'

/**
 * Testes do Step 13 — Parte B: regra Math.abs no DRE
 *
 * Estes testes capturam o comportamento ATUAL para servir de referencia
 * antes de qualquer mudanca de regra. A documentacao do step diz:
 *
 *   "Aplicar alteracao somente depois de validada com negocio."
 *
 * Se a regra mudar (passar a respeitar sinal de estorno, por exemplo),
 * esses testes servem de evidencia do que foi alterado.
 */
describe('calcularDRE — comportamento atual com Math.abs', () => {
  it('soma valores positivos no grupo certo (caso normal)', () => {
    const dre = calcularDRE([
      { valor: 1000, categoria: '1.01.01' }, // RoB
      { valor: 100, categoria: '2.01.01' },  // TDCF
      { valor: 200, categoria: '2.03.01' },  // CV
      { valor: 300, categoria: '2.05.93' },  // CF
    ])
    expect(dre.RoB).toBe(1000)
    expect(dre.TDCF).toBe(100)
    expect(dre.CV).toBe(200)
    expect(dre.CF).toBe(300)
    expect(dre.RL).toBe(900)   // 1000 - 100
    expect(dre.MC).toBe(700)   // 900 - 200
    expect(dre.EBT1).toBe(400) // 700 - 300
  })

  it('valor negativo em receita e somado como positivo (limitacao conhecida)', () => {
    // Cenario: estorno de receita lancado como valor negativo.
    // Comportamento ATUAL: estorno -200 vira +200 → RoB = 1200.
    // Comportamento ESPERADO (apos validacao com negocio): RoB = 800.
    // Step 13 / Parte B mantem a regra atual ate validacao do financeiro.
    const dre = calcularDRE([
      { valor: 1000, categoria: '1.01.01' },
      { valor: -200, categoria: '1.01.01' }, // estorno simulado
    ])
    expect(dre.RoB).toBe(1200)
  })

  it('valor positivo em despesa e somado como positivo (limitacao conhecida)', () => {
    // Cenario: estorno de despesa (devolucao) lancado positivo.
    // Comportamento ATUAL: +50 entra como +50 em CV.
    const dre = calcularDRE([
      { valor: 500, categoria: '2.03.01' },  // CV normal
      { valor: 50, categoria: '2.03.01' },   // possivel devolucao
    ])
    expect(dre.CV).toBe(550)
  })

  it('NEUTRO e excluido do calculo (repasses internos)', () => {
    const dre = calcularDRE(
      [
        { valor: 1000, categoria: '1.01.01' },
        { valor: 5000, categoria: '1.99.99' }, // marcado como NEUTRO
      ],
      {
        '1.01.01': { codigo: '1.01.01', nome: 'RECEITA', nivel2: 'X', nivel1: 'X', grupoDRE: 'RoB', op: '+' },
        '1.99.99': { codigo: '1.99.99', nome: 'TRANSF INTERNA', nivel2: 'X', nivel1: 'X', grupoDRE: 'NEUTRO', op: '+' },
      },
    )
    expect(dre.RoB).toBe(1000)
  })

  it('categoria sem mapeamento e ignorada', () => {
    const dre = calcularDRE([
      { valor: 1000, categoria: '1.01.01' },
      { valor: 999, categoria: '9.99.99' }, // sem mapeamento
    ])
    expect(dre.RoB).toBe(1000)
  })

  it('lancamento com valor zero ou nulo nao quebra', () => {
    const dre = calcularDRE([
      { valor: 0, categoria: '1.01.01' },
      // @ts-expect-error — valor undefined deve cair no fallback || 0
      { valor: undefined, categoria: '1.01.01' },
    ])
    expect(dre.RoB).toBe(0)
  })

  it('subtotal RES_LIQ aplica cadeia DRE corretamente', () => {
    const dre = calcularDRE([
      { valor: 10000, categoria: '1.01.01' }, // RoB 10000
      { valor: 1000, categoria: '2.01.01' },  // TDCF 1000
      { valor: 2000, categoria: '2.03.01' },  // CV 2000
      { valor: 3000, categoria: '2.05.93' },  // CF 3000
      { valor: 500, categoria: '1.02.99' },   // RNOP 500
      { valor: 200, categoria: '2.14.94' },   // DNOP 200
      { valor: 100, categoria: '2.15.99' },   // IRPJ 100
      { valor: 50, categoria: '2.16.99' },    // CSLL 50
    ])
    expect(dre.RL).toBe(9000)    // 10000-1000
    expect(dre.MC).toBe(7000)    // 9000-2000
    expect(dre.EBT1).toBe(4000)  // 7000-3000
    expect(dre.SNOP).toBe(300)   // 500-200
    expect(dre.EBT2).toBe(4300)  // 4000+300
    expect(dre.RES_LIQ).toBe(4150) // 4300-100-50
  })
})

describe('calcularDREPorMes', () => {
  it('agrupa lancamentos por mes mantendo a regra do calcularDRE', () => {
    const result = calcularDREPorMes([
      { valor: 1000, categoria: '1.01.01', data_lancamento: '15/01/2026' },
      { valor: 500, categoria: '1.01.01', data_lancamento: '15/02/2026' },
      { valor: 100, categoria: '2.01.01', data_lancamento: '15/02/2026' },
    ])
    expect(result['Jan/26'].RoB).toBe(1000)
    expect(result['Fev/26'].RoB).toBe(500)
    expect(result['Fev/26'].TDCF).toBe(100)
  })

  it('ignora lancamentos sem data', () => {
    const result = calcularDREPorMes([
      { valor: 1000, categoria: '1.01.01', data_lancamento: '' },
    ])
    expect(Object.keys(result)).toHaveLength(0)
  })
})

describe('calcularNeutros', () => {
  it('lista categorias NEUTRO com totais', () => {
    const map: Record<string, CategoriaInfo> = {
      '1.99.99': { codigo: '1.99.99', nome: 'TRANSF', nivel2: 'X', nivel1: 'X', grupoDRE: 'NEUTRO', op: '+' },
    }
    const result = calcularNeutros(
      [
        { valor: 100, categoria: '1.99.99' },
        { valor: -200, categoria: '1.99.99' }, // Math.abs
      ],
      map,
    )
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ codigo: '1.99.99', total: 300, count: 2 })
  })

  it('retorna lista vazia quando nao ha map', () => {
    expect(calcularNeutros([{ valor: 100, categoria: '1.99.99' }])).toEqual([])
  })
})

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
