import { describe, expect, it } from 'vitest'
import type { CategoriaInfo } from './planoContas'
import {
  buildWeekly,
  buildMonthly,
  buildQuarterly,
  buildBreakdownByCategoria,
  buildBreakdownByFavorecido,
  buildDREMatrix,
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

/**
 * Step 14 — Cobertura adicional do agrupamento mensal e trimestral.
 *
 * Garante que as datas/categorias edge-case nao quebram silenciosamente.
 */
describe('buildMonthly (Step 14 — datas e NEUTRO)', () => {
  it('soma multiplos lancamentos no mesmo mes/grupo', () => {
    const result = buildMonthly([
      { data_lancamento: '01/01/2026', valor: 100, categoria: '1.01.01' },
      { data_lancamento: '15/01/2026', valor: 200, categoria: '1.01.01' },
      { data_lancamento: '31/01/2026', valor: 300, categoria: '1.01.01' },
    ])
    expect(result.labels).toEqual(['Jan/26'])
    expect(result.RB).toEqual([600])
  })

  it('exclui NEUTRO via map dinamico (nao infla RoB)', () => {
    const map: Record<string, CategoriaInfo> = {
      '1.01.01': { codigo: '1.01.01', nome: 'RECEITA', nivel2: 'X', nivel1: 'X', grupoDRE: 'RoB', op: '+' },
      '1.99.99': { codigo: '1.99.99', nome: 'TRANSF', nivel2: 'X', nivel1: 'X', grupoDRE: 'NEUTRO', op: '+' },
    }
    const result = buildMonthly([
      { data_lancamento: '15/01/2026', valor: 1000, categoria: '1.01.01' },
      { data_lancamento: '15/01/2026', valor: 5000, categoria: '1.99.99' },
    ], map)
    expect(result.labels).toEqual(['Jan/26'])
    expect(result.RB).toEqual([1000])
  })

  it('ignora lancamentos sem data', () => {
    const result = buildMonthly([
      { data_lancamento: null, valor: 100, categoria: '1.01.01' },
      { data_lancamento: undefined, valor: 200, categoria: '1.01.01' },
    ])
    expect(result.labels).toEqual([])
  })

  it('ignora lancamentos com data mal-formada', () => {
    const result = buildMonthly([
      { data_lancamento: 'XX/YY/ZZZZ', valor: 100, categoria: '1.01.01' },
      { data_lancamento: '', valor: 200, categoria: '1.01.01' },
    ])
    // Nao deve gerar labels com NaN
    expect(result.labels.every((l) => !l.includes('NaN') && !l.includes('undefined'))).toBe(true)
    // E nao soma o valor da data invalida
    const totalRB = result.RB.reduce((s, v) => s + v, 0)
    expect(totalRB).toBe(0)
  })

  it('mantem ordem cronologica entre anos diferentes', () => {
    const result = buildMonthly([
      { data_lancamento: '15/01/2027', valor: 100, categoria: '1.01.01' },
      { data_lancamento: '15/12/2025', valor: 200, categoria: '1.01.01' },
      { data_lancamento: '15/06/2026', valor: 300, categoria: '1.01.01' },
    ])
    expect(result.labels).toEqual(['Dez/25', 'Jun/26', 'Jan/27'])
    expect(result.RB).toEqual([200, 300, 100])
  })
})

describe('buildQuarterly (Step 14)', () => {
  it('agrupa janeiro/fevereiro/marco em Q1', () => {
    const result = buildQuarterly([
      { data_lancamento: '15/01/2026', valor: 100, categoria: '1.01.01' },
      { data_lancamento: '15/02/2026', valor: 200, categoria: '1.01.01' },
      { data_lancamento: '15/03/2026', valor: 300, categoria: '1.01.01' },
    ])
    expect(result.labels).toEqual(['Q1/26'])
    expect(result.RB).toEqual([600])
  })

  it('separa Q1, Q2, Q3 e Q4 corretamente', () => {
    const result = buildQuarterly([
      { data_lancamento: '15/02/2026', valor: 100, categoria: '1.01.01' }, // Q1
      { data_lancamento: '15/05/2026', valor: 200, categoria: '1.01.01' }, // Q2
      { data_lancamento: '15/08/2026', valor: 300, categoria: '1.01.01' }, // Q3
      { data_lancamento: '15/11/2026', valor: 400, categoria: '1.01.01' }, // Q4
    ])
    expect(result.labels).toEqual(['Q1/26', 'Q2/26', 'Q3/26', 'Q4/26'])
    expect(result.RB).toEqual([100, 200, 300, 400])
  })

  it('exclui NEUTRO no nivel trimestral', () => {
    const map: Record<string, CategoriaInfo> = {
      '1.99.99': { codigo: '1.99.99', nome: 'X', nivel2: '', nivel1: '', grupoDRE: 'NEUTRO', op: '+' },
    }
    const result = buildQuarterly([
      { data_lancamento: '15/01/2026', valor: 5000, categoria: '1.99.99' },
    ], map)
    expect(result.labels).toEqual([]) // unico lancamento foi NEUTRO → nada agrupado
  })

  it('ignora data invalida sem quebrar', () => {
    const result = buildQuarterly([
      { data_lancamento: 'invalida', valor: 100, categoria: '1.01.01' },
      { data_lancamento: '15/06/2026', valor: 200, categoria: '1.01.01' },
    ])
    expect(result.labels).toEqual(['Q2/26'])
    expect(result.RB).toEqual([200])
  })
})

describe('buildBreakdownByCategoria (Step 14 — exclusao NEUTRO)', () => {
  it('NEUTRO nao aparece em nenhum grupo do breakdown', () => {
    const map: Record<string, CategoriaInfo> = {
      '1.01.01': { codigo: '1.01.01', nome: 'RECEITA MI', nivel2: 'RECEITAS', nivel1: 'RB', grupoDRE: 'RoB', op: '+' },
      '1.99.99': { codigo: '1.99.99', nome: 'TRANSF INT', nivel2: 'NEUTRO', nivel1: 'X', grupoDRE: 'NEUTRO', op: '+' },
    }
    const result = buildBreakdownByCategoria([
      { categoria: '1.01.01', valor: 1000 },
      { categoria: '1.99.99', valor: 9999 },
    ], map)
    const todos = [
      ...result.RoB, ...result.TDCF, ...result.CV,
      ...result.CF, ...result.RNOP, ...result.DNOP,
    ]
    expect(todos.some((it) => it.item.includes('TRANSF') || it.item.includes('NEUTRO'))).toBe(false)
  })

  it('granularidade n3 inclui codigo + nome', () => {
    const map: Record<string, CategoriaInfo> = {
      '1.01.01': { codigo: '1.01.01', nome: 'RECEITA MI', nivel2: 'X', nivel1: 'X', grupoDRE: 'RoB', op: '+' },
    }
    const result = buildBreakdownByCategoria([
      { categoria: '1.01.01', valor: 100 },
    ], map, 'n3')
    expect(result.RoB[0].item).toBe('1.01.01 — RECEITA MI')
  })

  it('granularidade n1 consolida cada grupo numa linha unica', () => {
    const map: Record<string, CategoriaInfo> = {
      '1.01.01': { codigo: '1.01.01', nome: 'RECEITA MI', nivel2: 'X', nivel1: 'X', grupoDRE: 'RoB', op: '+' },
      '1.01.02': { codigo: '1.01.02', nome: 'RECEITA ME', nivel2: 'X', nivel1: 'X', grupoDRE: 'RoB', op: '+' },
    }
    const result = buildBreakdownByCategoria([
      { categoria: '1.01.01', valor: 100 },
      { categoria: '1.01.02', valor: 200 },
    ], map, 'n1')
    expect(result.RoB).toHaveLength(1)
    expect(result.RoB[0]).toMatchObject({ item: 'RoB', valor: 300, pct: 100 })
  })
})

describe('buildBreakdownByFavorecido (Step 14)', () => {
  it('agrupa por favorecido dentro do grupo RoB', () => {
    const result = buildBreakdownByFavorecido([
      { categoria: '1.01.01', valor: 1000, favorecido: 'CLIENTE A' },
      { categoria: '1.01.01', valor: 500, favorecido: 'CLIENTE A' },
      { categoria: '1.01.01', valor: 700, favorecido: 'CLIENTE B' },
    ])
    expect(result.RoB).toHaveLength(2)
    expect(result.RoB[0]).toMatchObject({ nome: 'CLIENTE A', valor: 1500 })
    expect(result.RoB[1]).toMatchObject({ nome: 'CLIENTE B', valor: 700 })
  })

  it('favorecido vazio/null e mapeado para "Sem favorecido"', () => {
    const result = buildBreakdownByFavorecido([
      { categoria: '1.01.01', valor: 100, favorecido: null },
      { categoria: '1.01.01', valor: 200, favorecido: '' },
    ])
    expect(result.RoB).toHaveLength(1)
    expect(result.RoB[0]).toMatchObject({ nome: 'Sem favorecido', valor: 300 })
  })

  it('NEUTRO nao aparece em buildBreakdownByFavorecido', () => {
    const map: Record<string, CategoriaInfo> = {
      '1.99.99': { codigo: '1.99.99', nome: 'TRANSF', nivel2: 'X', nivel1: 'X', grupoDRE: 'NEUTRO', op: '+' },
    }
    const result = buildBreakdownByFavorecido([
      { categoria: '1.99.99', valor: 5000, favorecido: 'INTERCO' },
    ], map)
    const total = [...result.RoB, ...result.RNOP, ...result.CV, ...result.CF, ...result.TDCF, ...result.DNOP]
    expect(total).toEqual([])
  })
})

/**
 * Regressão P1-2 (Camada 2.2b) — a API passou a mandar `data_lancamento` em
 * ISO "YYYY-MM-DD" (era "DD/MM/YYYY"). Os call sites (caixa/page.tsx, portal,
 * dre-mensal) passam os lançamentos CRUS pro caixaBuilder, então o parser
 * tem que aceitar ISO — senão `new Date(NaN)` descartava TODOS os lançamentos
 * e os gráficos/DRE-mês-a-mês zeravam (KPIs continuavam OK pois só usam valor).
 */
describe('caixaBuilder — datas ISO (P1-2 Camada 2.2b)', () => {
  it('buildMonthly bucketiza datas ISO YYYY-MM-DD (formato real da API)', () => {
    const result = buildMonthly([
      { data_lancamento: '2026-01-31', valor: 1000, categoria: '1.01.01' }, // RoB Jan
      { data_lancamento: '2026-02-15', valor: 500, categoria: '1.01.01' },  // RoB Fev
    ])
    expect(result.labels).toEqual(['Jan/26', 'Fev/26'])
    expect(result.RB).toEqual([1000, 500])
  })

  it('ISO e DMY produzem o mesmo resultado (paridade do parser)', () => {
    const iso = buildMonthly([{ data_lancamento: '2026-04-30', valor: 750, categoria: '2.03.01' }]) // CV
    const dmy = buildMonthly([{ data_lancamento: '30/04/2026', valor: 750, categoria: '2.03.01' }])
    expect(iso).toEqual(dmy)
    expect(iso.CV).toEqual([750])
  })

  it('buildQuarterly aceita ISO', () => {
    const result = buildQuarterly([
      { data_lancamento: '2026-06-30', valor: 300, categoria: '1.01.01' }, // Q2
    ])
    expect(result.labels).toEqual(['Q2/26'])
    expect(result.RB).toEqual([300])
  })

  it('buildWeekly aceita ISO (dia 31 → S5)', () => {
    const result = buildWeekly([
      { data_lancamento: '2026-01-31', valor: 1000, categoria: '1.01.01' },
    ], 'Jan/26')
    const idx = result.labels.indexOf('S5·Jan')
    expect(idx).toBeGreaterThanOrEqual(0)
    expect(result.RB[idx]).toBe(1000)
  })

  it('buildDREMatrix (mesKey) aceita ISO', () => {
    // buildDREMatrix resolve grupo via CATEGORIAS[cat] (sem fallback de prefixo),
    // então passamos um map explícito.
    const map: Record<string, CategoriaInfo> = {
      '1.01.01': { codigo: '1.01.01', nome: 'Venda', nivel2: 'Receita', nivel1: 'R', grupoDRE: 'RoB', op: '+' },
    }
    const matrix = buildDREMatrix([
      { data_lancamento: '2026-03-10', valor: 1000, categoria: '1.01.01' },
      { data_lancamento: '2026-04-10', valor: 500, categoria: '1.01.01' },
    ], map)
    expect(matrix.meses).toEqual(['Mar/26', 'Abr/26'])
    expect(matrix.grupos.RoB?.porMes['Mar/26']).toBe(1000)
    expect(matrix.grupos.RoB?.porMes['Abr/26']).toBe(500)
  })

  it('data ISO com componente de hora é bucketizada (slice 10)', () => {
    const result = buildMonthly([
      { data_lancamento: '2026-05-15T00:00:00Z', valor: 200, categoria: '1.01.01' },
    ])
    expect(result.labels).toEqual(['Mai/26'])
    expect(result.RB).toEqual([200])
  })

  it('datas fora de faixa são descartadas (sem rollover) e batem entre buildMonthly e buildDREMatrix', () => {
    // Regressão: new Date(2026,12,15) rolaria pra Jan/2027; new Date(2026,5,32)
    // pra Jul. parseApiDate rejeita → o lançamento some (não migra de mês).
    const map: Record<string, CategoriaInfo> = {
      '1.01.01': { codigo: '1.01.01', nome: 'Venda', nivel2: 'Receita', nivel1: 'R', grupoDRE: 'RoB', op: '+' },
    }
    const lanc = [
      { data_lancamento: '2026-13-15', valor: 100, categoria: '1.01.01' }, // mês 13
      { data_lancamento: '2026-06-32', valor: 100, categoria: '1.01.01' }, // dia 32
      { data_lancamento: '2026-00-15', valor: 100, categoria: '1.01.01' }, // mês 0
      { data_lancamento: '2026-05-15', valor: 200, categoria: '1.01.01' }, // válido
    ]
    const monthly = buildMonthly(lanc)
    expect(monthly.labels).toEqual(['Mai/26'])
    expect(monthly.RB).toEqual([200])
    // buildDREMatrix (mesKey) descarta os mesmos inválidos — paridade travada.
    const matrix = buildDREMatrix(lanc, map)
    expect(matrix.meses).toEqual(['Mai/26'])
  })
})
