import { describe, expect, it } from 'vitest'
import {
  transformExtrato,
  transformCPCR,
  transformSaldos,
  transformConcilMovimento,
  buildContaMap,
} from './transformers'
import type {
  ExtratoAPI,
  SaldoAPI,
  LancamentoAPI,
  ConcilMovimentoAPI,
} from './types'

/**
 * Step 14 — Suite de testes dos transformadores API → shapes do frontend.
 *
 * Garante que valores numericos, datas null e campos opcionais nao quebram
 * o pipeline e que defaults seguros sao aplicados.
 */

function mockExtrato(overrides: Partial<ExtratoAPI> = {}): ExtratoAPI {
  return {
    id: 1,
    data_lancamento: '2026-04-15',
    data_conciliacao: null,
    descricao: 'PAGAMENTO X',
    favorecido: 'FORNEC Y',
    valor: -100,
    tipo: 'D',
    conciliado: false,
    conta_id: 10,
    categoria: '2.03.01',
    documento: 'NF-1',
    origem: 'extrato',
    banco: 'Itaú',
    projeto_omie_id: null,
    ...overrides,
  }
}

function mockLanc(overrides: Partial<LancamentoAPI> = {}): LancamentoAPI {
  return {
    codigo: 1,
    favorecido: 'FORNEC',
    categoria: '2.03.01',
    data_emissao: null,
    data_vcto: '2026-04-15',
    data_previsao: null,
    data_pagamento: null,
    valor: 100,
    valor_pago: 0,
    valor_aberto: 100,
    saldo: 100,
    status: 'A VENCER',
    numero_documento: null,
    numero_parcela: null,
    observacao: null,
    pagamentos: [],
    projeto_omie_id: null,
    ...overrides,
  }
}

describe('transformExtrato', () => {
  it('preserva campos basicos do lancamento', () => {
    const result = transformExtrato([mockExtrato()], new Map([[10, 'Itaú']]))
    expect(result[0]).toMatchObject({
      data: '15/04/2026',
      favorecido: 'FORNEC Y',
      valor: -100,
      catCod: '2.03.01',
      banco: 'Itaú',
      nf: 'NF-1',
      conciliado: false,
    })
  })

  it('preserva valor negativo (sem Math.abs no transformer)', () => {
    const result = transformExtrato([mockExtrato({ valor: -1234.56 })], new Map())
    expect(result[0].valor).toBe(-1234.56)
  })

  it('preserva valor zero', () => {
    const result = transformExtrato([mockExtrato({ valor: 0 })], new Map())
    expect(result[0].valor).toBe(0)
  })

  it('usa descricao quando favorecido e null', () => {
    const result = transformExtrato(
      [mockExtrato({ favorecido: null, descricao: 'TARIFA BANCARIA' })],
      new Map(),
    )
    expect(result[0].favorecido).toBe('TARIFA BANCARIA')
  })

  it('data null vira string vazia (nao quebra)', () => {
    const result = transformExtrato([mockExtrato({ data_lancamento: null })], new Map())
    expect(result[0].data).toBe('')
  })

  it('descricao null vira string vazia', () => {
    const result = transformExtrato(
      // descricao em ExtratoAPI nao e nullable, mas runtime pode chegar undefined
      [mockExtrato({ descricao: undefined as unknown as string, favorecido: null })],
      new Map(),
    )
    expect(result[0].favorecido).toBe('')
  })

  it('fallback do banco via map quando r.banco e null', () => {
    const result = transformExtrato(
      [mockExtrato({ banco: null, conta_id: 5 })],
      new Map([[5, 'Bradesco']]),
    )
    expect(result[0].banco).toBe('Bradesco')
  })

  it('fallback final "N/D" quando banco e map nao tem nada', () => {
    const result = transformExtrato([mockExtrato({ banco: null, conta_id: 99 })], new Map())
    expect(result[0].banco).toBe('N/D')
  })

  it('preserva projeto_omie_id null como string vazia', () => {
    const result = transformExtrato([mockExtrato({ projeto_omie_id: null })], new Map())
    expect(result[0].projeto_omie_id).toBe('')
  })

  it('preserva categoria null como string vazia (nao quebra DRE downstream)', () => {
    const result = transformExtrato([mockExtrato({ categoria: null })], new Map())
    expect(result[0].catCod).toBe('')
  })
})

describe('transformCPCR', () => {
  it('preserva todos os status do contrato (A VENCER/PAGO/RECEBIDO/PARCIAL/ATRASADO)', () => {
    const items = [
      mockLanc({ codigo: 1, status: 'A VENCER' }),
      mockLanc({ codigo: 2, status: 'PAGO' }),
      mockLanc({ codigo: 3, status: 'RECEBIDO' }),
      mockLanc({ codigo: 4, status: 'PARCIAL' }),
      mockLanc({ codigo: 5, status: 'ATRASADO' }),
    ]
    const result = transformCPCR(items, 'CP')
    expect(result.map((r) => r.status)).toEqual([
      'A VENCER', 'PAGO', 'RECEBIDO', 'PARCIAL', 'ATRASADO',
    ])
  })

  it('preserva valores decimais sem perda de precisao', () => {
    const result = transformCPCR(
      [mockLanc({ valor: 1234.56, valor_pago: 234.10, valor_aberto: 1000.46 })],
      'CP',
    )
    expect(result[0].valor).toBe(1234.56)
    expect(result[0].valor_pago).toBe(234.10)
    expect(result[0].valor_aberto).toBe(1000.46)
  })

  it('valor zero e preservado (nao confundido com null)', () => {
    const result = transformCPCR([mockLanc({ valor: 0 })], 'CP')
    expect(result[0].valor).toBe(0)
  })

  it('valor_pago null vira 0; valor_aberto null cai em saldo', () => {
    const result = transformCPCR(
      [mockLanc({ valor: 1000, valor_pago: null, valor_aberto: null, saldo: 800 })],
      'CR',
    )
    expect(result[0].valor_pago).toBe(0)
    expect(result[0].valor_aberto).toBe(800)
  })

  it('preserva NF (numero_documento) e PA (numero_parcela)', () => {
    const result = transformCPCR(
      [mockLanc({ numero_documento: 'NF-789', numero_parcela: '3/12' })],
      'CP',
    )
    expect(result[0].nf).toBe('NF-789')
    expect(result[0].pa).toBe('3/12')
  })

  it('NF e PA null/undefined viram string vazia', () => {
    const result = transformCPCR(
      [mockLanc({ numero_documento: null, numero_parcela: null })],
      'CP',
    )
    expect(result[0].nf).toBe('')
    expect(result[0].pa).toBe('')
  })

  it('data_vcto null vira string vazia (nao quebra ordenacao downstream)', () => {
    const result = transformCPCR([mockLanc({ data_vcto: null })], 'CR')
    expect(result[0].vcto).toBe('')
  })

  it('preserva pagamentos com desconto/juros/multa', () => {
    const result = transformCPCR(
      [
        mockLanc({
          pagamentos: [
            { data: '2026-04-01', valor: 100, desconto: 5, juros: 2, multa: 1 },
            { data: '2026-04-15', valor: 50, desconto: 0, juros: 0, multa: 0 },
          ],
        }),
      ],
      'CR',
    )
    // P1-2 Camada 2.2b.2: API devolve ISO, transformer converte para DD/MM/YYYY.
    expect(result[0].pagamentos).toEqual([
      { data: '01/04/2026', valor: 100, desconto: 5, juros: 2, multa: 1 },
      { data: '15/04/2026', valor: 50, desconto: 0, juros: 0, multa: 0 },
    ])
  })

  it('lista de pagamentos vazia/undefined vira array vazio', () => {
    const a = transformCPCR([mockLanc({ pagamentos: [] })], 'CP')
    const b = transformCPCR(
      [mockLanc({ pagamentos: undefined as unknown as LancamentoAPI['pagamentos'] })],
      'CP',
    )
    expect(a[0].pagamentos).toEqual([])
    expect(b[0].pagamentos).toEqual([])
  })

  it('categoria null vira string vazia', () => {
    const result = transformCPCR(
      [mockLanc({ categoria: null as unknown as string })],
      'CP',
    )
    expect(result[0].cat).toBe('')
  })
})

describe('transformSaldos', () => {
  it('mapeia bancos via codigo numerico (compatibilidade Omie)', () => {
    const items: SaldoAPI[] = [
      { conta_id: 1, descricao: 'CC Itau', banco: '341', saldo: 1000 },
      { conta_id: 2, descricao: 'CC BB', banco: '001', saldo: 500 },
      { conta_id: 3, descricao: 'CC Caixa', banco: '104', saldo: 300 },
      { conta_id: 4, descricao: 'CC Inter', banco: '077', saldo: 200 },
    ]
    expect(transformSaldos(items).map((s) => s.nome)).toEqual([
      'Itaú', 'Banco do Brasil', 'Caixa', 'Inter',
    ])
  })

  it('cai em descricao quando codigo do banco e desconhecido', () => {
    const items: SaldoAPI[] = [
      { conta_id: 1, descricao: 'BANCO BRADESCO S.A.', banco: '999', saldo: 100 },
    ]
    expect(transformSaldos(items)[0].nome).toBe('Bradesco')
  })

  it('cai em descricao truncada (20 chars) quando nada bate', () => {
    const items: SaldoAPI[] = [
      // Descricao que nao contem nenhum match no mapa de bancos conhecidos
      { conta_id: 1, descricao: 'COOPERATIVA DA REGIAO SUL', banco: null, saldo: 0 },
    ]
    expect(transformSaldos(items)[0].nome).toBe('COOPERATIVA DA REGIA') // truncado em 20 chars
  })

  it('preserva saldo numerico positivo, negativo e zero', () => {
    const items: SaldoAPI[] = [
      { conta_id: 1, descricao: 'X', banco: null, saldo: 1234.56 },
      { conta_id: 2, descricao: 'Y', banco: null, saldo: -789.10 },
      { conta_id: 3, descricao: 'Z', banco: null, saldo: 0 },
    ]
    const r = transformSaldos(items)
    expect(r[0].saldo).toBe(1234.56)
    expect(r[1].saldo).toBe(-789.10)
    expect(r[2].saldo).toBe(0)
  })

  it('atribui cor para cada banco identificado', () => {
    const items: SaldoAPI[] = [
      { conta_id: 1, descricao: 'Itau', banco: '341', saldo: 0 },
    ]
    expect(transformSaldos(items)[0].cor).toMatch(/^#[0-9A-Fa-f]{6}$/)
  })
})

describe('transformConcilMovimento', () => {
  it('marca conciliado=true quando |diferenca| < 0.01', () => {
    const items: ConcilMovimentoAPI[] = [
      { data: '01/04/2026', extrato: 1000, saldo_banco: 1000, diferenca: 0, status: 'ok', banco: 'Itaú' },
      { data: '02/04/2026', extrato: 1000, saldo_banco: 1000.005, diferenca: 0.005, status: 'ok', banco: 'Itaú' },
    ]
    const result = transformConcilMovimento(items)
    expect(result['01/04/2026'].conciliado).toBe(true)
    expect(result['02/04/2026'].conciliado).toBe(true)
  })

  it('marca conciliado=false quando |diferenca| >= 0.01', () => {
    const items: ConcilMovimentoAPI[] = [
      { data: '01/04/2026', extrato: 1000, saldo_banco: 1001, diferenca: 1, status: 'diverge', banco: 'Itaú' },
    ]
    expect(transformConcilMovimento(items)['01/04/2026'].conciliado).toBe(false)
  })

  it('diferenca negativa tambem usa Math.abs para classificar', () => {
    const items: ConcilMovimentoAPI[] = [
      { data: '01/04/2026', extrato: 1000, saldo_banco: 999, diferenca: -1, status: 'diverge', banco: 'Itaú' },
    ]
    expect(transformConcilMovimento(items)['01/04/2026'].conciliado).toBe(false)
  })

  it('preserva extrato e saldoBanco sem alteracao', () => {
    const items: ConcilMovimentoAPI[] = [
      { data: '01/04/2026', extrato: 1234.56, saldo_banco: 1234.55, diferenca: 0.01, status: 'diverge', banco: 'BB' },
    ]
    const r = transformConcilMovimento(items)['01/04/2026']
    expect(r.extrato).toBe(1234.56)
    expect(r.saldoBanco).toBe(1234.55)
    expect(r.dif).toBe(0.01)
    expect(r.banco).toBe('BB')
  })

  it('lista vazia retorna objeto vazio', () => {
    expect(transformConcilMovimento([])).toEqual({})
  })

  it('chave do dicionario e a data do movimento', () => {
    const items: ConcilMovimentoAPI[] = [
      { data: '15/04/2026', extrato: 100, saldo_banco: 100, diferenca: 0, status: 'ok', banco: 'X' },
    ]
    const result = transformConcilMovimento(items)
    expect(Object.keys(result)).toEqual(['15/04/2026'])
  })
})

describe('buildContaMap', () => {
  it('constroi Map<conta_id, bankName> a partir de saldos', () => {
    const items: SaldoAPI[] = [
      { conta_id: 10, descricao: 'CC Itau', banco: '341', saldo: 0 },
      { conta_id: 20, descricao: 'CC BB', banco: '001', saldo: 0 },
    ]
    const map = buildContaMap(items)
    expect(map.get(10)).toBe('Itaú')
    expect(map.get(20)).toBe('Banco do Brasil')
  })

  it('lista vazia retorna Map vazio', () => {
    expect(buildContaMap([]).size).toBe(0)
  })
})
