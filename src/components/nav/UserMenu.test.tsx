/* @vitest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import { UserMenu } from './UserMenu'

/**
 * Bug #3 follow-up (2026-05-23) — testes do dropdown do usuario com
 * acao de logoff. Pre-existente o avatar so tinha hover, sem onClick
 * nem logoff exposto. Garante:
 *
 *   - dropdown comeca fechado (aria-expanded=false, menu nao no DOM)
 *   - click no botao alterna estado (aria-expanded toggla)
 *   - menu mostra nome + email do user
 *   - "Sair" chama logout() + router.push('/login')
 *   - ESC fecha o dropdown
 *   - click fora fecha
 *   - fallback de nome quando user ausente
 */


const pushMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))


const logoutMock = vi.fn()
let userMock: { id: number; nome: string; email: string; is_admin: boolean } | null = null

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: {
    user: typeof userMock
    logout: () => void
  }) => unknown) =>
    selector({ user: userMock, logout: logoutMock }),
}))


vi.mock('@/store/themeStore', () => ({
  useThemeStore: (selector: (s: { tokens: Record<string, string> }) => unknown) =>
    selector({
      tokens: {
        text: '#fff', muted: '#999', border: '#333', borderGold: '#553',
        surface: '#111', surfaceHover: '#222', surfaceElevated: '#0a0a0a',
        gold: '#e0b82e', goldSoft: '#d4a635', goldDim: '#332a0a',
      },
    }),
}))


beforeEach(() => {
  pushMock.mockReset()
  logoutMock.mockReset()
  userMock = {
    id: 1,
    nome: 'Vinicius Cardoso Menezes',
    email: 'vmenezestreinamentos@gmail.com',
    is_admin: true,
  }
})


describe('<UserMenu />', () => {
  it('comeca com dropdown fechado', () => {
    render(<UserMenu />)
    const btn = screen.getByRole('button', { name: /abrir menu/i })
    expect(btn.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('mostra iniciais do usuario no avatar', () => {
    // 2 primeiras palavras = VC
    render(<UserMenu />)
    expect(screen.getByText('VC')).toBeTruthy()
  })

  it('mostra "?" como iniciais se user ausente', () => {
    userMock = null
    render(<UserMenu />)
    expect(screen.getByText('?')).toBeTruthy()
  })

  it('mostra primeiros 2 nomes no botao', () => {
    userMock = {
      id: 2,
      nome: 'João da Silva Pereira',
      email: 'joao@x',
      is_admin: false,
    }
    render(<UserMenu />)
    expect(screen.getByText('João da')).toBeTruthy()
  })

  it('mostra "Administrador" quando is_admin=true', () => {
    render(<UserMenu />)
    expect(screen.getByText('Administrador')).toBeTruthy()
  })

  it('mostra "Usuário" quando is_admin=false', () => {
    userMock = { id: 2, nome: 'João', email: 'j@x', is_admin: false }
    render(<UserMenu />)
    expect(screen.getByText('Usuário')).toBeTruthy()
  })

  it('click no botao abre o dropdown', () => {
    render(<UserMenu />)
    const btn = screen.getByRole('button', { name: /abrir menu/i })
    fireEvent.click(btn)
    expect(btn.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByRole('menu')).toBeTruthy()
  })

  it('dropdown aberto mostra nome completo + email', () => {
    render(<UserMenu />)
    fireEvent.click(screen.getByRole('button', { name: /abrir menu/i }))
    // Botao mostra 2 primeiras palavras ("Vinicius Cardoso"); header do
    // dropdown mostra completo ("Vinicius Cardoso Menezes").
    expect(screen.getByText('Vinicius Cardoso Menezes')).toBeTruthy()
    expect(screen.getByText('vmenezestreinamentos@gmail.com')).toBeTruthy()
  })

  it('dropdown aberto mostra botao "Sair"', () => {
    render(<UserMenu />)
    fireEvent.click(screen.getByRole('button', { name: /abrir menu/i }))
    expect(screen.getByRole('menuitem', { name: /sair/i })).toBeTruthy()
  })

  it('click em "Sair" chama logout() + push /login + fecha menu', () => {
    render(<UserMenu />)
    fireEvent.click(screen.getByRole('button', { name: /abrir menu/i }))
    fireEvent.click(screen.getByRole('menuitem', { name: /sair/i }))

    expect(logoutMock).toHaveBeenCalledTimes(1)
    expect(pushMock).toHaveBeenCalledWith('/login')
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('segundo click no botao fecha o dropdown', () => {
    render(<UserMenu />)
    const btn = screen.getByRole('button', { name: /abrir menu/i })
    fireEvent.click(btn)
    expect(screen.getByRole('menu')).toBeTruthy()
    fireEvent.click(btn)
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('ESC fecha o dropdown', () => {
    render(<UserMenu />)
    fireEvent.click(screen.getByRole('button', { name: /abrir menu/i }))
    expect(screen.getByRole('menu')).toBeTruthy()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('click fora fecha o dropdown', () => {
    render(
      <div>
        <UserMenu />
        <div data-testid="outside">fora</div>
      </div>,
    )
    fireEvent.click(screen.getByRole('button', { name: /abrir menu/i }))
    expect(screen.getByRole('menu')).toBeTruthy()
    fireEvent.mouseDown(screen.getByTestId('outside'))
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('nao renderiza email no dropdown se ausente', () => {
    userMock = { id: 3, nome: 'Sem Email Cadastrado', email: '', is_admin: false }
    render(<UserMenu />)
    fireEvent.click(screen.getByRole('button', { name: /abrir menu/i }))
    // Nome completo no header do dropdown
    expect(screen.getByText('Sem Email Cadastrado')).toBeTruthy()
    // Sem elemento de email (title vazio) — div de email so renderiza se truthy
    expect(screen.queryByTitle('')).toBeNull()
  })
})
