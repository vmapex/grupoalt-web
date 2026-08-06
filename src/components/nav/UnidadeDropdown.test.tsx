/* @vitest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { UnidadeDropdown } from './UnidadeDropdown'
import { useUnidadeStore } from '@/store/unidadeStore'

/**
 * Pedido 2026-08-07: com 17 unidades cadastradas o dropdown crescia sem
 * teto e vazava pra fora da viewport — as últimas ficavam inalcançáveis.
 * A lista virou a ÚNICA área rolável; cabeçalho, "Todas as unidades" e
 * "Limpar filtro" continuam fixos (senão o usuário rola pra perder a
 * ação de limpar).
 */

vi.mock('@/store/themeStore', () => ({
  useThemeStore: (sel: (s: { tokens: Record<string, string> }) => unknown) =>
    sel({
      tokens: {
        blue: '#3D8AD6', blueDim: 'rgba(61,138,214,0.14)', muted: '#999',
        mutedDim: '#555', textSec: '#ccc', surface: '#111', border: '#333',
        surfaceElevated: '#1a1a1a', borderHover: '#444', tooltipShadow: 'none',
        bg: '#000',
      },
    }),
}))

const UNIDADES = Array.from({ length: 17 }, (_, i) => ({
  id: String(i + 1),
  nome: `UNIDADE ${i + 1}`,
  codigo: `${1000 + i}`,
}))

beforeEach(() => {
  useUnidadeStore.setState({ projetos: UNIDADES, selectedIds: [], loading: false })
})

describe('UnidadeDropdown — rolagem da lista', () => {
  it('renderiza TODAS as unidades e a lista é a área rolável', () => {
    render(<UnidadeDropdown />)
    fireEvent.click(screen.getByRole('button', { name: /todas unidades/i }))

    // a última unidade existe no DOM (alcançável por rolagem)
    expect(screen.getByText('UNIDADE 17')).toBeTruthy()

    const lista = screen.getByTestId('unidade-lista')
    expect(lista.className).toContain('overflow-y-auto')
    expect(lista.className).toContain('min-h-0')
  })

  it('o painel tem teto de altura (não vaza da viewport)', () => {
    render(<UnidadeDropdown />)
    fireEvent.click(screen.getByRole('button', { name: /todas unidades/i }))

    const painel = screen.getByTestId('unidade-lista').parentElement as HTMLElement
    expect(painel.style.maxHeight).toBeTruthy()
    expect(painel.className).toContain('flex-col')
  })

  it('"Todas as unidades" fica FORA da área rolável (sempre visível)', () => {
    render(<UnidadeDropdown />)
    fireEvent.click(screen.getByRole('button', { name: /todas unidades/i }))

    const todas = screen.getByText('Todas as unidades')
    const lista = screen.getByTestId('unidade-lista')
    expect(lista.contains(todas)).toBe(false)
  })

  it('"Limpar filtro" fica FORA da área rolável quando há seleção', () => {
    useUnidadeStore.setState({ selectedIds: ['1', '2'] })
    render(<UnidadeDropdown />)
    fireEvent.click(screen.getByRole('button', { name: /2 unidades/i }))

    const limpar = screen.getByText('Limpar filtro')
    const lista = screen.getByTestId('unidade-lista')
    expect(lista.contains(limpar)).toBe(false)
  })

  it('clicar numa unidade alterna a seleção (comportamento preservado)', () => {
    render(<UnidadeDropdown />)
    fireEvent.click(screen.getByRole('button', { name: /todas unidades/i }))
    fireEvent.click(screen.getByText('UNIDADE 3'))
    expect(useUnidadeStore.getState().selectedIds).toEqual(['3'])
  })
})
