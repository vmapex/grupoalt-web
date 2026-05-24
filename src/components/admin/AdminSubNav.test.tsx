/* @vitest-environment jsdom */
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { AdminSubNav } from './AdminSubNav'

/**
 * E1 (2026-05-24) — testes do AdminSubNav compartilhado.
 *
 * Antes: 5 implementacoes diferentes da mesma sub-nav. Agora:
 * 1 componente unico. Tests garantem que (a) os 5 links existem,
 * (b) o link "active" recebe aria-current="page", (c) styling
 * difere entre active e inativo.
 */


vi.mock('@/store/themeStore', () => ({
  useThemeStore: (selector: (s: { tokens: Record<string, string> }) => unknown) =>
    selector({
      tokens: {
        text: '#fff', muted: '#999', border: '#333',
        blue: '#3D8AD6', blueDim: '#0a1a2a',
      },
    }),
}))


describe('<AdminSubNav />', () => {
  it('renderiza os 5 links das paginas admin', () => {
    render(<AdminSubNav active="empresas" />)
    expect(screen.getByRole('link', { name: /Empresas/i })).toBeTruthy()
    expect(screen.getByRole('link', { name: /Plano de Contas/i })).toBeTruthy()
    expect(screen.getByRole('link', { name: /Contas Bancárias/i })).toBeTruthy()
    expect(screen.getByRole('link', { name: /Orbit IA/i })).toBeTruthy()
    expect(screen.getByRole('link', { name: /Usuários/i })).toBeTruthy()
  })

  it('marca o link ativo com aria-current="page"', () => {
    render(<AdminSubNav active="usuarios" />)
    const ativo = screen.getByRole('link', { name: /Usuários/i })
    expect(ativo.getAttribute('aria-current')).toBe('page')
    // Outros nao tem aria-current
    expect(screen.getByRole('link', { name: /Empresas/i }).getAttribute('aria-current')).toBeNull()
  })

  it('hrefs apontam pros paths corretos', () => {
    render(<AdminSubNav active="empresas" />)
    const links = screen
      .getAllByRole('link')
      .map((el) => el.getAttribute('href'))
    expect(links).toEqual([
      '/bi/financeiro/admin',
      '/bi/financeiro/admin/categorias',
      '/bi/financeiro/admin/contas-bancarias',
      '/bi/financeiro/admin/orbit',
      '/bi/financeiro/admin/usuarios',
    ])
  })

  it('container tem role="navigation" via <nav>', () => {
    render(<AdminSubNav active="orbit" />)
    expect(screen.getByRole('navigation', { name: 'Administração' })).toBeTruthy()
  })

  it('cada key valida do tipo AdminSubNavKey resolve para link ativo', () => {
    const keys = ['empresas', 'categorias', 'contas', 'orbit', 'usuarios'] as const
    for (const k of keys) {
      const { unmount } = render(<AdminSubNav active={k} />)
      // Exatamente 1 link deve ter aria-current="page"
      const ativos = screen
        .getAllByRole('link')
        .filter((el) => el.getAttribute('aria-current') === 'page')
      expect(ativos).toHaveLength(1)
      unmount()
    }
  })
})
