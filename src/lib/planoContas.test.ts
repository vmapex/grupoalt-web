import { describe, expect, it } from 'vitest'
import {
  calcularDRE,
  calcularDREPorMes,
  calcularNeutros,
  buildCategoriasFromAPI,
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
})
