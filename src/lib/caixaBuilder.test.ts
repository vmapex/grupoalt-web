import { describe, expect, it } from 'vitest'
import {
  buildWeekly,
  buildMonthly,
  buildBreakdownByCategoria,
} from './caixaBuilder'

/**
 * Testes do Step 13 — Calculos BI/DRE e Paginacao
 *
 * Parte A — Semana 5
 * O bug original era `keys = ['S1·...', 'S2·...', 'S3·...', 'S4·...']`
 * fixo, descartando lancamentos dos dias 29-31 que viram S5.
 */
describe('buildWeekly (Step 13 — Parte A: Semana 5)', () => {
  it('inclui Semana 5 quando ha lancamento no dia 31', () => {
    const lancamentos = [
      { data_lancamento: '31/01/2026', valor: 1000, categoria: '1.01.01' }, // RoB
    ]
    const result = buildWeekly(lancamentos, 'Jan/26')
    expect(result.labels).toContain('S5·Jan')
    const idx = result.labels.indexOf('S5·Jan')
    expect(result.RB[idx]).toBe(1000)
  })

  it('inclui Semana 5 para lancamento no dia 29', () => {
    const lancamentos = [
      { data_lancamento: '29/03/2026', valor: 500, categoria: '2.05.93' }, // CF (SALARIO)
    ]
    const result = buildWeekly(lancamentos, 'Mar/26')
    expect(result.labels).toContain('S5·Mar')
    const idx = result.labels.indexOf('S5·Mar')
    expect(result.CF[idx]).toBe(500)
  })

  it('inclui Semana 5 para lancamento no dia 30', () => {
    const lancamentos = [
      { data_lancamento: '30/04/2026', valor: 750, categoria: '2.03.01' }, // CV
    ]
    const result = buildWeekly(lancamentos, 'Abr/26')
    expect(result.labels).toContain('S5·Abr')
    const idx = result.labels.indexOf('S5·Abr')
    expect(result.CV[idx]).toBe(750)
  })

  it('mes com 28 dias (Fev nao bissexto) gera apenas S1-S4', () => {
    const lancamentos = [
      { data_lancamento: '28/02/2025', valor: 100, categoria: '1.01.01' },
    ]
    const result = buildWeekly(lancamentos, 'Fev/25')
    expect(result.labels).toEqual(['S1·Fev', 'S2·Fev', 'S3·Fev', 'S4·Fev'])
    expect(result.RB[3]).toBe(100) // dia 28 cai em S4
  })

  it('mes com 29 dias (Fev bissexto) gera S1-S5', () => {
    const lancamentos = [
      { data_lancamento: '29/02/2024', valor: 200, categoria: '1.01.01' },
    ]
    const result = buildWeekly(lancamentos, 'Fev/24')
    expect(result.labels).toEqual(['S1·Fev', 'S2·Fev', 'S3·Fev', 'S4·Fev', 'S5·Fev'])
    expect(result.RB[4]).toBe(200) // dia 29 cai em S5
  })

  it('mes com 30 dias gera S1-S5', () => {
    const lancamentos = [
      { data_lancamento: '15/04/2026', valor: 100, categoria: '1.01.01' },
      { data_lancamento: '30/04/2026', valor: 300, categoria: '1.01.01' },
    ]
    const result = buildWeekly(lancamentos, 'Abr/26')
    expect(result.labels).toEqual(['S1·Abr', 'S2·Abr', 'S3·Abr', 'S4·Abr', 'S5·Abr'])
    expect(result.RB[2]).toBe(100) // dia 15 → S3
    expect(result.RB[4]).toBe(300) // dia 30 → S5
  })

  it('mes com 31 dias gera S1-S5', () => {
    const lancamentos = [
      { data_lancamento: '01/01/2026', valor: 100, categoria: '1.01.01' },
      { data_lancamento: '31/01/2026', valor: 500, categoria: '1.01.01' },
    ]
    const result = buildWeekly(lancamentos, 'Jan/26')
    expect(result.labels).toEqual(['S1·Jan', 'S2·Jan', 'S3·Jan', 'S4·Jan', 'S5·Jan'])
    expect(result.RB[0]).toBe(100) // dia 1 → S1
    expect(result.RB[4]).toBe(500) // dia 31 → S5
  })

  it('valor de Jan/26 nao aparece quando filtro e Fev/26', () => {
    const lancamentos = [
      { data_lancamento: '15/01/2026', valor: 999, categoria: '1.01.01' },
    ]
    const result = buildWeekly(lancamentos, 'Fev/26')
    // Jan/26 nao deve aparecer em Fev/26 (mesmo ano)
    expect(result.RB.reduce((s, v) => s + v, 0)).toBe(0)
  })

  it('mes invalido retorna labels vazios', () => {
    const result = buildWeekly([], 'XYZ/26')
    expect(result.labels).toEqual([])
  })
})

/**
 * Parte B — DRE e Math.abs
 *
 * Os testes abaixo documentam o comportamento atual: todos os valores sao
 * somados como `Math.abs(valor)` no grupo DRE da categoria. Isso pode estar
 * incorreto para estornos (entrada negativa em RoB ou positiva em CV), mas
 * a regra so deve ser alterada apos validacao com financeiro/controladoria.
 */
describe('Math.abs no DRE (Step 13 — Parte B: comportamento atual documentado)', () => {
  it('valor negativo em receita e somado como positivo (Math.abs)', () => {
    const result = buildBreakdownByCategoria([
      { categoria: '1.01.01', valor: 1000 },
      { categoria: '1.01.01', valor: -200 }, // possivel estorno
    ])
    // Comportamento ATUAL: estorno -200 vira +200 → total 1200
    // Comportamento esperado (apos validacao): 800
    const total = result.RoB.reduce((s, v) => s + v.valor, 0)
    expect(total).toBe(1200)
  })

  it('NEUTRO continua sendo excluido do DRE', () => {
    const result = buildBreakdownByCategoria(
      [
        { categoria: '1.01.01', valor: 1000 },
        { categoria: '1.99.99', valor: 500 }, // mapeada como NEUTRO no map
      ],
      {
        '1.01.01': { codigo: '1.01.01', nome: 'RECEITA MI', nivel2: 'X', nivel1: 'X', grupoDRE: 'RoB', op: '+' },
        '1.99.99': { codigo: '1.99.99', nome: 'TRANSF INTERNA', nivel2: 'X', nivel1: 'X', grupoDRE: 'NEUTRO', op: '+' },
      },
    )
    const total = result.RoB.reduce((s, v) => s + v.valor, 0)
    expect(total).toBe(1000) // 500 NEUTRO ignorado
  })
})

/**
 * Sanity check em buildMonthly (regressao basica do agrupamento mensal)
 */
describe('buildMonthly (regressao)', () => {
  it('agrupa por mes em ordem cronologica', () => {
    const lancamentos = [
      { data_lancamento: '15/02/2026', valor: 100, categoria: '1.01.01' },
      { data_lancamento: '15/01/2026', valor: 200, categoria: '1.01.01' },
      { data_lancamento: '15/12/2025', valor: 300, categoria: '1.01.01' },
    ]
    const result = buildMonthly(lancamentos)
    expect(result.labels).toEqual(['Dez/25', 'Jan/26', 'Fev/26'])
    expect(result.RB).toEqual([300, 200, 100])
  })
})
