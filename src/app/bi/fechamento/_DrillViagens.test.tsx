/* @vitest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import { DrillViagensModal } from './_DrillViagens'
import type { FechamentoBiFechamentoAPI, FechamentoBiViagensAPI } from '@/hooks/api/useFechamentoBi'

/**
 * Drill-down até a viagem (Fase D — profundidade). O modal é a única
 * porta do agregado para o dado: fechado (fechamento=null) não pode
 * disparar fetch; aberto renderiza snapshot + totais; erro tem retry.
 * Sem jest-dom no setup → matchers puros.
 */

const tokens = {
  text: '#fff', textSec: '#ccc', muted: '#999', gold: '#D4AF37',
  red: '#F18888', redDim: 'rgba(241,136,136,0.14)', green: '#7CC58F',
  purple: '#B48EDE', surface: '#111', border: '#333',
}

vi.mock('@/store/themeStore', () => ({
  useThemeStore: (sel: (s: { tokens: typeof tokens }) => unknown) => sel({ tokens }),
}))

const mockUse = vi.fn()
vi.mock('@/hooks/api/useFechamentoBi', () => ({
  useFechamentoBiViagens: (id: number | null) => mockUse(id),
}))

const FECH: FechamentoBiFechamentoAPI = {
  id: 90, unidade_id: 1, unidade_nome: 'SANTA INES',
  periodo_label: '1ª DEZENA (1-10)', ano: 2026, mes: 7, navio_id: null,
  dt_ini: '2026-07-01', dt_fim: '2026-07-10', dt_fechamento: '2026-07-21',
  faturamento: 1550, custo: 1080, margem: 470, viagens: 2,
}

const PAYLOAD: FechamentoBiViagensAPI = {
  fechamento: { id: 90, periodo_label: '1ª DEZENA (1-10)', unidade_id: 1, dt_ini: '2026-07-01', dt_fim: '2026-07-10' },
  viagens: [
    {
      id: 501, dt: '2026-07-03', motorista: 'JOSÉ', cliente: 'AGRO X',
      placa: 'ABC1D23', navio: null, km: 100, cabecas: 40,
      razao: 1050, custo_motorista: 730, resultado: 320,
      comissao_carreta: 90, pedagio: 30, combinada: true,
    },
    {
      id: 502, dt: '2026-07-01', motorista: 'MOTORISTA 99', cliente: 'FAZ BOA VISTA',
      placa: '—', navio: null, km: 80, cabecas: 0,
      razao: 500, custo_motorista: 350, resultado: 150,
      comissao_carreta: 0, pedagio: 0, combinada: false,
    },
  ],
  totais: { viagens: 2, razao: 1550, custo_motorista: 1080, resultado: 470, comissao_carreta: 90, pedagio: 30, cabecas: 40, km: 180 },
  meta: { fonte: 'historico-fechamentos', fechamento_id: 90 },
}

const okState = { data: PAYLOAD, loading: false, error: null, refetch: vi.fn() }

beforeEach(() => {
  mockUse.mockReset()
  mockUse.mockReturnValue(okState)
})

describe('DrillViagensModal', () => {
  it('fechado (fechamento=null): não renderiza e o hook recebe null (fetch desligado)', () => {
    const { container } = render(<DrillViagensModal fechamento={null} onClose={vi.fn()} />)
    expect(container.firstChild).toBeNull()
    expect(mockUse).toHaveBeenCalledWith(null)
  })

  it('aberto: busca pelo id, mostra viagens e totais do snapshot', () => {
    render(<DrillViagensModal fechamento={FECH} onClose={vi.fn()} />)
    expect(mockUse).toHaveBeenCalledWith(90)
    expect(screen.getByText('JOSÉ')).toBeTruthy()
    expect(screen.getByText('AGRO X')).toBeTruthy()
    expect(screen.getByText('FAZ BOA VISTA')).toBeTruthy()
    // Totais: faturamento consolidado do snapshot.
    expect(screen.getByText('R$ 1.550')).toBeTruthy()
    // Badge de viagem combinada.
    expect(screen.getByText('COMB')).toBeTruthy()
  })

  it('erro tem retry visível (sem zeros silenciosos)', () => {
    const refetch = vi.fn()
    mockUse.mockReturnValue({ data: null, loading: false, error: 'timeout', refetch })
    render(<DrillViagensModal fechamento={FECH} onClose={vi.fn()} />)
    expect(screen.getByRole('alert').textContent).toContain('timeout')
    fireEvent.click(screen.getByText('Tentar de novo'))
    expect(refetch).toHaveBeenCalled()
  })

  it('Escape e clique no backdrop fecham; clique no conteúdo não fecha', () => {
    const onClose = vi.fn()
    render(<DrillViagensModal fechamento={FECH} onClose={onClose} />)
    fireEvent.click(screen.getByText('JOSÉ'))
    expect(onClose).not.toHaveBeenCalled()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('dialog'))
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('ordena por coluna ao clicar no header (Razão desc primeiro)', () => {
    render(<DrillViagensModal fechamento={FECH} onClose={vi.fn()} />)
    // Ordem cronológica padrão: 502 (01/07) vem antes de 501 (03/07).
    let linhas = screen.getAllByText(/^R\$ (1\.050|500)$/)
    expect(linhas[0].textContent).toBe('R$ 500')
    fireEvent.click(screen.getByText('Razão'))
    linhas = screen.getAllByText(/^R\$ (1\.050|500)$/)
    expect(linhas[0].textContent).toBe('R$ 1.050')
  })
})
