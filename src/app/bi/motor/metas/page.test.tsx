/* @vitest-environment jsdom */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import MetasPage from './page'

/**
 * Metas do BI do Motor. Trava as decisões da tela: modo consulta sem
 * fechamento:metas (pode_editar do GET é a fonte — sem inputs), grid
 * semeado da API, salvar manda os 12 meses com vazio→null (contrato
 * do PUT: mês todo nulo é removido), e "repetir JAN ↓" copia a coluna.
 */

const tokens = {
  text: '#fff', textSec: '#ccc', muted: '#999', gold: '#D4AF37',
  goldDim: 'rgba(212,175,55,0.14)', red: '#F18888', green: '#7CC58F',
  blue: '#3D8AD6', surface: '#111', border: '#333', bg: '#000',
}

vi.mock('@/store/themeStore', () => ({
  useThemeStore: (sel: (s: { tokens: typeof tokens }) => unknown) => sel({ tokens }),
}))

vi.mock('@/store/biMotorStore', () => ({
  useBiMotorStore: (sel: (s: { ano: number; unidadeId: number | null }) => unknown) =>
    sel({ ano: 2026, unidadeId: null }),
}))

const mockFiltros = vi.fn()
const mockMetas = vi.fn()
const mockSave = vi.fn()
vi.mock('@/hooks/api/useFechamentoBi', () => ({
  useFechamentoBiFiltros: () => mockFiltros(),
  useMetasFechamento: (p: unknown) => mockMetas(p),
  saveMetasFechamento: (body: unknown) => mockSave(body),
}))

const FILTROS = {
  data: {
    unidades: [
      { id: 1, nome: 'SANTA INES', tipo_periodo: 'DEZENA' },
      { id: 9, nome: 'PORTO', tipo_periodo: 'NAVIO' },
    ],
    navios: [], navios_com_fechamento: [], anos: [2026], meses_por_ano: {}, total_fechamentos: 0,
  },
  loading: false, error: null, refetch: vi.fn(),
}

const metasPayload = (podeEditar: boolean) => ({
  data: {
    ano: 2026,
    unidade_id: 1,
    metas: [
      { unidade_id: 1, mes: 1, faturamento: 1000000, margem: 200000 },
      { unidade_id: 1, mes: 2, faturamento: 1500000, margem: null },
    ],
    pode_editar: podeEditar,
  },
  loading: false, error: null, refetch: vi.fn(),
})

beforeEach(() => {
  mockFiltros.mockReset().mockReturnValue(FILTROS)
  mockMetas.mockReset()
  mockSave.mockReset().mockResolvedValue({ ano: 2026, unidade_id: 1, metas: [] })
})

describe('MetasPage', () => {
  it('sem fechamento:metas: modo consulta, valores como texto, sem inputs', () => {
    mockMetas.mockReturnValue(metasPayload(false))
    render(<MetasPage />)
    expect(screen.getByText(/Modo consulta/)).toBeTruthy()
    expect(screen.getByText('fechamento:metas')).toBeTruthy()
    expect(screen.queryAllByRole('spinbutton')).toHaveLength(0)
    expect(screen.getByText('R$ 1.000.000')).toBeTruthy()
  })

  it('com permissão: grid semeado da API e salvar manda 12 meses (vazio→null)', async () => {
    mockMetas.mockReturnValue(metasPayload(true))
    render(<MetasPage />)

    const jan = screen.getByLabelText('Meta de faturamento de JAN') as HTMLInputElement
    expect(jan.value).toBe('1000000')

    fireEvent.click(screen.getByText('Salvar metas da unidade'))
    await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(1))

    const body = mockSave.mock.calls[0][0] as {
      ano: number; unidade_id: number
      metas: { mes: number; faturamento: number | null; margem: number | null }[]
    }
    expect(body.ano).toBe(2026)
    expect(body.unidade_id).toBe(1)
    expect(body.metas).toHaveLength(12)
    expect(body.metas[0]).toEqual({ mes: 1, faturamento: 1000000, margem: 200000 })
    expect(body.metas[1]).toEqual({ mes: 2, faturamento: 1500000, margem: null })
    expect(body.metas[11]).toEqual({ mes: 12, faturamento: null, margem: null })

    expect(await screen.findByText('Metas salvas')).toBeTruthy()
  })

  it('"repetir JAN" copia o valor de janeiro para os 12 meses da coluna', () => {
    mockMetas.mockReturnValue(metasPayload(true))
    render(<MetasPage />)

    fireEvent.click(screen.getAllByTitle('Copiar o valor de JAN para todos os meses')[0])
    const dez = screen.getByLabelText('Meta de faturamento de DEZ') as HTMLInputElement
    expect(dez.value).toBe('1000000')
    // coluna de margem não é tocada
    const dezMargem = screen.getByLabelText('Meta de margem de DEZ') as HTMLInputElement
    expect(dezMargem.value).toBe('')
  })

  it('unidade NAVIO aparece no seletor (meta é por mês-calendário)', () => {
    mockMetas.mockReturnValue(metasPayload(true))
    render(<MetasPage />)
    expect(screen.getByRole('option', { name: 'PORTO' })).toBeTruthy()
  })
})
