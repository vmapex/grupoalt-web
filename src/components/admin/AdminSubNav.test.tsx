/* @vitest-environment jsdom */
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { AdminSubNav } from './AdminSubNav'

/**
 * E1 (2026-05-24) — testes do AdminSubNav compartilhado.
 *
 * Antes: 5 implementacoes diferentes da mesma sub-nav. Agora:
 * 1 componente unico. Tests garantem que (a) os links existem,
 * (b) o link "active" recebe aria-current="page", (c) styling
 * difere entre active e inativo.
 *
 * 2026-07-15: "Usuários" saiu da sub-nav — gestao de usuarios
 * (perfis RBAC + Acesso ao Motor) migrou pro /portal/admin.
 * 2026-07-17 (F1 unificação): "Empresas" saiu tambem — config de
 * empresa (dados, logos, resync) migrou pra aba Empresas do
 * /portal/admin; admin do BI é só de BI.
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
  it('renderiza os 3 links das paginas admin do BI (sem Usuários nem Empresas)', () => {
    render(<AdminSubNav active="categorias" />)
    expect(screen.getByRole('link', { name: /Plano de Contas/i })).toBeTruthy()
    expect(screen.getByRole('link', { name: /Contas Bancárias/i })).toBeTruthy()
    expect(screen.getByRole('link', { name: /Orbit IA/i })).toBeTruthy()
    expect(screen.queryByRole('link', { name: /Usuários/i })).toBeNull()
    expect(screen.queryByRole('link', { name: /^Empresas$/i })).toBeNull()
  })

  it('marca o link ativo com aria-current="page"', () => {
    render(<AdminSubNav active="orbit" />)
    const ativo = screen.getByRole('link', { name: /Orbit IA/i })
    expect(ativo.getAttribute('aria-current')).toBe('page')
    // Outros nao tem aria-current
    expect(screen.getByRole('link', { name: /Plano de Contas/i }).getAttribute('aria-current')).toBeNull()
  })

  it('hrefs apontam pros paths corretos', () => {
    render(<AdminSubNav active="categorias" />)
    const links = screen
      .getAllByRole('link')
      .map((el) => el.getAttribute('href'))
    expect(links).toEqual([
      '/bi/financeiro/admin/categorias',
      '/bi/financeiro/admin/contas-bancarias',
      '/bi/financeiro/admin/orbit',
    ])
  })

  it('container tem role="navigation" via <nav>', () => {
    render(<AdminSubNav active="orbit" />)
    expect(screen.getByRole('navigation', { name: 'Administração' })).toBeTruthy()
  })

  it('cada key valida do tipo AdminSubNavKey resolve para link ativo', () => {
    const keys = ['categorias', 'contas', 'orbit'] as const
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
