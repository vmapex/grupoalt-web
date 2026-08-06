/* @vitest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TablePager } from './TablePager'

vi.mock('@/store/themeStore', () => ({
  useThemeStore: (sel: (s: { tokens: Record<string, string> }) => unknown) =>
    sel({ tokens: { border: '#333', bg: '#000', surface: '#111', muted: '#999', mutedDim: '#555', text: '#fff', textSec: '#ccc' } }),
}))

describe('TablePager', () => {
  it('não renderiza quando tudo cabe numa página', () => {
    const { container } = render(
      <TablePager page={0} totalPages={1} total={80} pageSize={100} setPage={vi.fn()} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('mostra o intervalo (fmtInt pt-BR) e navega', () => {
    const setPage = vi.fn()
    render(
      <TablePager page={1} totalPages={35} total={3421} pageSize={100} setPage={setPage} />,
    )
    expect(screen.getByText('101–200 de 3.421')).toBeTruthy()
    fireEvent.click(screen.getByLabelText('Próxima página'))
    expect(setPage).toHaveBeenCalledWith(2)
    fireEvent.click(screen.getByLabelText('Primeira página'))
    expect(setPage).toHaveBeenCalledWith(0)
    fireEvent.click(screen.getByLabelText('Última página'))
    expect(setPage).toHaveBeenCalledWith(34)
  })

  it('desabilita as pontas na primeira e na última página', () => {
    render(
      <TablePager page={0} totalPages={3} total={250} pageSize={100} setPage={vi.fn()} />,
    )
    expect((screen.getByLabelText('Página anterior') as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByLabelText('Próxima página') as HTMLButtonElement).disabled).toBe(false)
  })
})
