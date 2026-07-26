/* Recorte intra-mês do BI de Fechamento (quinzena/dezena, client-side).
   Trava as regras de contenção da janela e a reagregação local. */
import { describe, expect, it } from 'vitest'
import {
  agregarFechamentosNoCliente,
  fechamentoNoRecorte,
  filtrarFechamentosPorRecorte,
} from './fechamentoBi'
import { periodosPermitidos } from '@/store/biFechamentoStore'
import type { FechamentoBiFechamentoAPI } from '@/hooks/api/useFechamentoBi'

function fech(over: Partial<FechamentoBiFechamentoAPI>): FechamentoBiFechamentoAPI {
  return {
    id: 1, unidade_id: 3, unidade_nome: 'IMPERATRIZ', periodo_label: 'x',
    ano: 2026, mes: 7, navio_id: null,
    dt_ini: '2026-07-01', dt_fim: '2026-07-15', dt_fechamento: '2026-07-16',
    faturamento: 1000, custo: 600, margem: 400, viagens: 10,
    ...over,
  }
}

describe('fechamentoNoRecorte', () => {
  it('sem recorte, tudo passa', () => {
    expect(fechamentoNoRecorte(fech({}), '')).toBe(true)
  })

  it('quinzenas: janela contida decide', () => {
    expect(fechamentoNoRecorte(fech({ dt_ini: '2026-07-01', dt_fim: '2026-07-15' }), 'Q1')).toBe(true)
    expect(fechamentoNoRecorte(fech({ dt_ini: '2026-07-16', dt_fim: '2026-07-31' }), 'Q1')).toBe(false)
    expect(fechamentoNoRecorte(fech({ dt_ini: '2026-07-16', dt_fim: '2026-07-31' }), 'Q2')).toBe(true)
    // Mês inteiro não cabe em nenhuma quinzena.
    expect(fechamentoNoRecorte(fech({ dt_ini: '2026-07-01', dt_fim: '2026-07-31' }), 'Q1')).toBe(false)
    expect(fechamentoNoRecorte(fech({ dt_ini: '2026-07-01', dt_fim: '2026-07-31' }), 'Q2')).toBe(false)
  })

  it('dezenas: D1/D2/D3 com bordas inclusivas', () => {
    expect(fechamentoNoRecorte(fech({ dt_ini: '2026-07-01', dt_fim: '2026-07-10' }), 'D1')).toBe(true)
    expect(fechamentoNoRecorte(fech({ dt_ini: '2026-07-11', dt_fim: '2026-07-20' }), 'D2')).toBe(true)
    expect(fechamentoNoRecorte(fech({ dt_ini: '2026-07-21', dt_fim: '2026-07-31' }), 'D3')).toBe(true)
    expect(fechamentoNoRecorte(fech({ dt_ini: '2026-07-01', dt_fim: '2026-07-10' }), 'D2')).toBe(false)
    expect(fechamentoNoRecorte(fech({ dt_ini: '2026-07-11', dt_fim: '2026-07-20' }), 'D1')).toBe(false)
  })

  it('navio com janela curta entra no recorte que a contém', () => {
    expect(fechamentoNoRecorte(fech({ dt_ini: '2026-07-03', dt_fim: '2026-07-06' }), 'Q1')).toBe(true)
    expect(fechamentoNoRecorte(fech({ dt_ini: '2026-07-03', dt_fim: '2026-07-06' }), 'D1')).toBe(true)
  })

  it('janela cruzando mês ou sem datas nunca casa recorte', () => {
    expect(fechamentoNoRecorte(fech({ dt_ini: '2026-07-28', dt_fim: '2026-08-05' }), 'D3')).toBe(false)
    expect(fechamentoNoRecorte(fech({ dt_ini: null, dt_fim: null }), 'Q1')).toBe(false)
  })
})

describe('periodosPermitidos (tipo_periodo da unidade)', () => {
  it('quinzenal só oferece quinzenas; dezena só dezenas', () => {
    expect(periodosPermitidos('QUINZENAL')).toEqual(['', 'Q1', 'Q2'])
    expect(periodosPermitidos('DEZENA')).toEqual(['', 'D1', 'D2', 'D3'])
  })

  it('mensal/navio não praticam recorte intra-mês', () => {
    expect(periodosPermitidos('MENSAL')).toEqual([''])
    expect(periodosPermitidos('NAVIO')).toEqual([''])
  })

  it('sem unidade selecionada (grupo) ou tipo desconhecido oferece tudo', () => {
    expect(periodosPermitidos(null)).toHaveLength(6)
    expect(periodosPermitidos(undefined)).toHaveLength(6)
    expect(periodosPermitidos('OUTRO')).toHaveLength(6)
  })
})

describe('agregarFechamentosNoCliente', () => {
  const lista = [
    fech({ id: 1, faturamento: 1000, custo: 600, viagens: 10, mes: 7 }),
    fech({ id: 2, faturamento: 500, custo: 300, viagens: 4, mes: 7, unidade_id: 4, unidade_nome: 'SANTA INES' }),
    fech({ id: 3, faturamento: 200, custo: 150, viagens: 2, mes: 8 }),
    // Ano diferente: entra nos KPIs (recorte do filtro), fora da série do ano.
    fech({ id: 4, faturamento: 100, custo: 90, viagens: 1, ano: 2025, mes: 7 }),
  ]

  it('KPIs somam tudo; margem_pct derivada; série só do ano', () => {
    const agg = agregarFechamentosNoCliente(lista, 2026)
    expect(agg.kpis.faturamento).toBe(1800)
    expect(agg.kpis.custo).toBe(1140)
    expect(agg.kpis.margem).toBe(660)
    expect(agg.kpis.margem_pct).toBeCloseTo((660 / 1800) * 100, 2)
    expect(agg.kpis.viagens).toBe(17)
    expect(agg.kpis.fechamentos).toBe(4)
    expect(agg.serieMensal[6].faturamento).toBe(1500) // jul/2026
    expect(agg.serieMensal[6].fechamentos).toBe(2)
    expect(agg.serieMensal[7].faturamento).toBe(200) // ago/2026
    expect(agg.serieMensal[0].faturamento).toBe(0)
  })

  it('por unidade ordena por faturamento desc e calcula margem', () => {
    const agg = agregarFechamentosNoCliente(lista, 2026)
    expect(agg.porUnidade[0].unidade_nome).toBe('IMPERATRIZ')
    expect(agg.porUnidade[0].faturamento).toBe(1300) // 1000 + 200 + 100
    expect(agg.porUnidade[0].margem).toBe(1300 - 840)
    expect(agg.porUnidade[1].unidade_nome).toBe('SANTA INES')
  })

  it('vazio não divide por zero', () => {
    const agg = agregarFechamentosNoCliente([], 2026)
    expect(agg.kpis.margem_pct).toBe(0)
    expect(agg.porUnidade).toEqual([])
  })

  it('filtrar + agregar compõem (fluxo real do recorte)', () => {
    const soQ1 = filtrarFechamentosPorRecorte(
      [
        fech({ id: 1, dt_ini: '2026-07-01', dt_fim: '2026-07-15', faturamento: 1000 }),
        fech({ id: 2, dt_ini: '2026-07-16', dt_fim: '2026-07-31', faturamento: 700 }),
      ],
      'Q1',
    )
    expect(soQ1.map((f) => f.id)).toEqual([1])
    expect(agregarFechamentosNoCliente(soQ1, 2026).kpis.faturamento).toBe(1000)
  })
})
