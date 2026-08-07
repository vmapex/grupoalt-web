/* @vitest-environment jsdom */
import { render, screen, fireEvent, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MultiSelectDropdown } from './MultiSelectDropdown'

/**
 * Filtro multi-seleção (2026-08-07) — nasceu do filtro de categoria do
 * CP/CR, onde o `<select>` nativo só deixava escolher uma. Regras que
 * importam: contador no botão, toggle sem fechar o painel (dá pra marcar
 * várias em sequência), "Limpar" volta pra todas, e opção selecionada
 * que saiu do recorte continua visível — senão vira filtro invisível
 * preso, impossível de desmarcar.
 */

vi.mock('@/store/themeStore', () => ({
  useThemeStore: (sel: (s: { tokens: Record<string, string> }) => unknown) =>
    sel({
      tokens: {
        blue: '#3D8AD6', blueDim: 'rgba(61,138,214,0.14)', muted: '#999',
        mutedDim: '#555', textSec: '#ccc', border: '#333', surfaceElevated: '#1a1a1a',
        borderHover: '#444', tooltipShadow: 'none',
      },
    }),
}))

const OPTS = [
  { value: '2.01', label: 'Postos' },
  { value: '2.02', label: 'Agregados' },
  { value: '2.03', label: 'Aluguel' },
]

function setup(selected: string[] = [], options = OPTS) {
  const onToggle = vi.fn()
  const onClear = vi.fn()
  const view = render(
    <MultiSelectDropdown
      options={options}
      selected={new Set(selected)}
      onToggle={onToggle}
      onClear={onClear}
      allLabel="Todas as categorias"
      countLabel="categorias"
      ariaLabel="Filtrar por categoria"
    />,
  )
  const abrir = () => fireEvent.click(screen.getByLabelText('Filtrar por categoria'))
  return { onToggle, onClear, abrir, unmount: view.unmount }
}

describe('MultiSelectDropdown', () => {
  it('sem seleção: mostra o rótulo de "todas"', () => {
    setup()
    expect(screen.getByLabelText('Filtrar por categoria').textContent).toContain(
      'Todas as categorias',
    )
  })

  it('1 selecionada: mostra o nome; 2+: mostra o contador', () => {
    const { unmount } = render(
      <MultiSelectDropdown
        options={OPTS} selected={new Set(['2.01'])} onToggle={vi.fn()} onClear={vi.fn()}
        allLabel="Todas as categorias" countLabel="categorias" ariaLabel="f1"
      />,
    )
    expect(screen.getByLabelText('f1').textContent).toContain('Postos')
    unmount()

    render(
      <MultiSelectDropdown
        options={OPTS} selected={new Set(['2.01', '2.02'])} onToggle={vi.fn()} onClear={vi.fn()}
        allLabel="Todas as categorias" countLabel="categorias" ariaLabel="f2"
      />,
    )
    expect(screen.getByLabelText('f2').textContent).toContain('2 categorias')
  })

  it('marcar não fecha o painel (dá pra escolher várias em sequência)', () => {
    const { onToggle, abrir } = setup()
    abrir()
    fireEvent.click(screen.getByText('Postos'))
    expect(onToggle).toHaveBeenCalledWith('2.01')
    // painel segue aberto
    fireEvent.click(screen.getByText('Agregados'))
    expect(onToggle).toHaveBeenCalledWith('2.02')
    expect(onToggle).toHaveBeenCalledTimes(2)
  })

  it('"Limpar filtro" só aparece com seleção e chama onClear', () => {
    const semSel = setup()
    semSel.abrir()
    expect(screen.queryByText('Limpar filtro')).toBeNull()
    semSel.unmount()

    const comSel = setup(['2.01'])
    comSel.abrir()
    fireEvent.click(screen.getByText('Limpar filtro'))
    expect(comSel.onClear).toHaveBeenCalled()
  })

  it('opção fora do recorte fica visível e desmarcável (marcada "sem lançamentos")', () => {
    const { abrir, onToggle } = setup(
      ['9.99'],
      [...OPTS, { value: '9.99', label: 'Categoria antiga', ausente: true }],
    )
    abrir()
    expect(screen.getByText('sem lançamentos')).toBeTruthy()
    // o rótulo também aparece no botão (1 selecionada) — clicar o da LISTA
    const lista = screen.getByTestId('multiselect-lista')
    const item = within(lista).getByText('Categoria antiga')
    fireEvent.click(item)
    expect(onToggle).toHaveBeenCalledWith('9.99')
  })

  it('lista vazia explica em vez de mostrar painel em branco', () => {
    const { abrir } = setup([], [])
    abrir()
    expect(screen.getByText('Nada para filtrar no recorte atual')).toBeTruthy()
  })

  it('a lista é a única área rolável e tem teto de altura', () => {
    const { abrir } = setup()
    abrir()
    const lista = screen.getByTestId('multiselect-lista')
    expect(lista.className).toContain('overflow-y-auto')
    const painel = lista.parentElement as HTMLElement
    expect(painel.style.maxHeight).toBeTruthy()
  })
})
