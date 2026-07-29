/* @vitest-environment jsdom */
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import FechamentoAoVivoPage from './page'
import type { FechamentoBiAoVivoAPI } from '@/hooks/api/useFechamentoBi'

/**
 * D3 — Fechamento ao vivo. Trava as decisões da tela: nota de PRÉVIA
 * sempre visível (dado não persistido não pode parecer definitivo),
 * badge JÁ FECHADO × EM ABERTO, unidade NAVIO como não-suportada com
 * motivo, e o detalhe por motorista só quando o recorte cai numa única
 * unidade. Sem jest-dom no setup → matchers puros.
 */

const tokens = {
  text: '#fff', textSec: '#ccc', muted: '#999', gold: '#D4AF37',
  goldDim: 'rgba(212,175,55,0.14)', red: '#F18888', green: '#7CC58F',
  blue: '#3D8AD6', surface: '#111', border: '#333',
}

vi.mock('@/store/themeStore', () => ({
  useThemeStore: (sel: (s: { tokens: typeof tokens }) => unknown) => sel({ tokens }),
}))

let unidadeId: number | null = null
vi.mock('@/store/biMotorStore', () => ({
  useBiMotorStore: (sel: (s: { unidadeId: number | null }) => unknown) => sel({ unidadeId }),
}))

const mockUse = vi.fn()
vi.mock('@/hooks/api/useFechamentoBi', () => ({
  useFechamentoBiAoVivo: (id: number | null) => mockUse(id),
}))

const ITEM_ABERTO = {
  unidade_id: 1, unidade_nome: 'SANTA INES', tipo_periodo: 'DEZENA', suportado: true,
  periodo: { dt_ini: '2026-07-21', dt_fim: '2026-07-31', label: '3ª DEZENA (21-FIM)', ja_fechado: false, fechamento_id: null },
  progresso: { dias_total: 11, dias_decorridos: 10, pct: 90.9 },
  totais: {
    viagens: 42, faturamento: 350000, custo_motorista: 210000, resultado: 140000,
    seguro_boi: 9000, imposto: 4000, comissao_carreta: 12000, pedagio: 3000, liquido_a_pagar: 180000,
  },
  por_motorista: [
    { motorista_id: 7, nome: 'JOSÉ', viagens: 5, custo: 30000, seguro: 900, imposto: 400, liquido: 27000 },
  ],
  motor_versao: '1.2.1',
}

const ITEM_FECHADO = {
  ...ITEM_ABERTO,
  unidade_id: 2, unidade_nome: 'IMPERATRIZ',
  periodo: { ...ITEM_ABERTO.periodo, ja_fechado: true, fechamento_id: 91 },
  por_motorista: [],
}

const ITEM_NAVIO = {
  unidade_id: 9, unidade_nome: 'PORTO', tipo_periodo: 'NAVIO', suportado: false,
  motivo: 'período por NAVIO não segue calendário — acompanhe pela tela de Fechamento do Motor',
}

function payload(itens: unknown[]): FechamentoBiAoVivoAPI {
  return {
    hoje: '2026-07-30',
    itens: itens as FechamentoBiAoVivoAPI['itens'],
    meta: { unidade_id: null, fonte: 'preview-motor' },
  }
}

beforeEach(() => {
  unidadeId = null
  mockUse.mockReset()
})

describe('FechamentoAoVivoPage (D3)', () => {
  it('nota de PRÉVIA sempre visível + badges por estado do período', () => {
    mockUse.mockReturnValue({ data: payload([ITEM_ABERTO, ITEM_FECHADO, ITEM_NAVIO]), loading: false, error: null, refetch: vi.fn() })
    render(<FechamentoAoVivoPage />)
    expect(screen.getByText('PRÉVIA AO VIVO')).toBeTruthy()
    expect(screen.getByText('EM ABERTO')).toBeTruthy()
    expect(screen.getByText('JÁ FECHADO')).toBeTruthy()
    // NAVIO: não-suportada com motivo, sem KPI.
    expect(screen.getByText('PERÍODO POR NAVIO')).toBeTruthy()
    expect(screen.getByText(/não segue calendário/)).toBeTruthy()
  })

  it('com várias unidades no recorte NÃO abre detalhe por motorista', () => {
    mockUse.mockReturnValue({ data: payload([ITEM_ABERTO, ITEM_FECHADO]), loading: false, error: null, refetch: vi.fn() })
    render(<FechamentoAoVivoPage />)
    expect(screen.queryByText('JOSÉ')).toBeNull()
    expect(screen.getByText(/Selecione uma unidade no filtro/)).toBeTruthy()
  })

  it('unidade única no recorte abre a tabela por motorista (prévia)', () => {
    unidadeId = 1
    mockUse.mockReturnValue({ data: payload([ITEM_ABERTO]), loading: false, error: null, refetch: vi.fn() })
    render(<FechamentoAoVivoPage />)
    expect(mockUse).toHaveBeenCalledWith(1)
    expect(screen.getByText('JOSÉ')).toBeTruthy()
    expect(screen.getByText('R$ 27.000')).toBeTruthy()
  })

  it('erro mostra retry (BiErro), sem zeros silenciosos', () => {
    mockUse.mockReturnValue({ data: null, loading: false, error: 'Motor 503', refetch: vi.fn() })
    render(<FechamentoAoVivoPage />)
    expect(screen.getByText(/Motor 503/)).toBeTruthy()
  })
})
