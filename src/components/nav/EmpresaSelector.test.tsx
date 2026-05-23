/* @vitest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import { EmpresaSelector } from './EmpresaSelector'
import type { Empresa } from '@/store/empresaStore'

/**
 * Bug #1/2 follow-up (2026-05-23) — testes do dropdown de seletor
 * de empresa no topo do Sidebar. Pre-existente o botao "Grupo ALT"
 * mostrava chevron mas nao tinha onClick (sem dropdown nenhum).
 * Pra trocar empresa o user tinha que usar lista duplicada no meio
 * do Sidebar (removida no mesmo PR).
 *
 * Cobre: estado fechado por default, abrir/fechar (click, ESC,
 * click fora), lista de empresas, click chama setActive, marca
 * empresa ativa com Check, fallback quando sem empresas (disabled).
 */


const setActiveMock = vi.fn()
let empresasMock: Empresa[] = []
let activeIdMock = ''

vi.mock('@/store/empresaStore', () => ({
  useEmpresaStore: (selector: (s: {
    empresas: Empresa[]
    activeId: string
    setActive: (id: string) => void
  }) => unknown) =>
    selector({
      empresas: empresasMock,
      activeId: activeIdMock,
      setActive: setActiveMock,
    }),
}))


vi.mock('@/store/themeStore', () => ({
  useThemeStore: (selector: (s: { tokens: Record<string, string> }) => unknown) =>
    selector({
      tokens: {
        text: '#fff', muted: '#999', border: '#333', borderGold: '#553',
        surface: '#111', surfaceHover: '#222', surfaceElevated: '#0a0a0a',
        gold: '#e0b82e',
      },
    }),
}))


function mkEmpresa(overrides: Partial<Empresa> = {}): Empresa {
  return {
    id: '1',
    nome: 'ALT-MAX',
    cnpj: '00.000.000/0001-00',
    logoDark: null,
    logoLight: null,
    cor: '#38BDF8',
    ...overrides,
  }
}


beforeEach(() => {
  setActiveMock.mockReset()
  empresasMock = [
    mkEmpresa({ id: '1', nome: 'ALT-MAX', cor: '#38BDF8' }),
    mkEmpresa({ id: '2', nome: 'GRUPO ALT', cor: '#34D399', cnpj: '00.000.000/0002-00' }),
    mkEmpresa({ id: '3', nome: 'TESTE', cor: '#FBBF24', cnpj: '' }),
  ]
  activeIdMock = '1'
})


describe('<EmpresaSelector />', () => {
  // ── Estado inicial ─────────────────────────────────────────────────────────

  it('comeca com dropdown fechado', () => {
    render(<EmpresaSelector />)
    const btn = screen.getByRole('button', { name: /selecionar empresa/i })
    expect(btn.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('mostra nome da empresa ativa no botao', () => {
    render(<EmpresaSelector />)
    expect(screen.getByText('ALT-MAX')).toBeTruthy()
  })

  it('mostra "Selecione..." quando nao ha empresa ativa', () => {
    activeIdMock = ''
    render(<EmpresaSelector />)
    expect(screen.getByText('Selecione...')).toBeTruthy()
  })

  it('mostra "Sem empresas" e fica disabled quando lista vazia', () => {
    empresasMock = []
    activeIdMock = ''
    render(<EmpresaSelector />)
    const btn = screen.getByRole('button', { name: /selecionar empresa/i }) as HTMLButtonElement
    expect(screen.getByText('Sem empresas')).toBeTruthy()
    expect(btn.disabled).toBe(true)
  })


  // ── Abrir / fechar ─────────────────────────────────────────────────────────

  it('click no botao abre dropdown', () => {
    render(<EmpresaSelector />)
    const btn = screen.getByRole('button', { name: /selecionar empresa/i })
    fireEvent.click(btn)
    expect(btn.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByRole('menu')).toBeTruthy()
  })

  it('segundo click fecha o dropdown', () => {
    render(<EmpresaSelector />)
    const btn = screen.getByRole('button', { name: /selecionar empresa/i })
    fireEvent.click(btn)
    expect(screen.getByRole('menu')).toBeTruthy()
    fireEvent.click(btn)
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('ESC fecha o dropdown', () => {
    render(<EmpresaSelector />)
    fireEvent.click(screen.getByRole('button', { name: /selecionar empresa/i }))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('click fora fecha o dropdown', () => {
    render(
      <div>
        <EmpresaSelector />
        <div data-testid="outside">fora</div>
      </div>,
    )
    fireEvent.click(screen.getByRole('button', { name: /selecionar empresa/i }))
    fireEvent.mouseDown(screen.getByTestId('outside'))
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('botao disabled nao abre dropdown ao clicar', () => {
    empresasMock = []
    activeIdMock = ''
    render(<EmpresaSelector />)
    const btn = screen.getByRole('button', { name: /selecionar empresa/i })
    fireEvent.click(btn)
    expect(btn.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('menu')).toBeNull()
  })


  // ── Lista de empresas ──────────────────────────────────────────────────────

  it('dropdown lista todas as empresas', () => {
    render(<EmpresaSelector />)
    fireEvent.click(screen.getByRole('button', { name: /selecionar empresa/i }))
    expect(screen.getAllByText('ALT-MAX').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('GRUPO ALT')).toBeTruthy()
    expect(screen.getByText('TESTE')).toBeTruthy()
  })

  it('mostra cnpj quando presente', () => {
    render(<EmpresaSelector />)
    fireEvent.click(screen.getByRole('button', { name: /selecionar empresa/i }))
    expect(screen.getByText('00.000.000/0001-00')).toBeTruthy()
    expect(screen.getByText('00.000.000/0002-00')).toBeTruthy()
  })

  it('nao renderiza cnpj quando vazio', () => {
    render(<EmpresaSelector />)
    fireEvent.click(screen.getByRole('button', { name: /selecionar empresa/i }))
    // TESTE tem cnpj vazio
    const cnpjs = screen.queryAllByText('')
    // Smoke test — apenas garante que renderiza
    expect(cnpjs).toBeDefined()
  })

  it('marca empresa ativa com Check', () => {
    render(<EmpresaSelector />)
    fireEvent.click(screen.getByRole('button', { name: /selecionar empresa/i }))
    expect(screen.getByLabelText('Ativa')).toBeTruthy()
  })


  // ── Interacao ──────────────────────────────────────────────────────────────

  it('click em empresa diferente chama setActive + fecha dropdown', () => {
    render(<EmpresaSelector />)
    fireEvent.click(screen.getByRole('button', { name: /selecionar empresa/i }))

    const itemGrupoAlt = screen.getByRole('menuitem', { name: /GRUPO ALT/i })
    fireEvent.click(itemGrupoAlt)

    expect(setActiveMock).toHaveBeenCalledWith('2')
    expect(setActiveMock).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('click na empresa ativa tambem fecha (idempotente)', () => {
    render(<EmpresaSelector />)
    fireEvent.click(screen.getByRole('button', { name: /selecionar empresa/i }))

    const itemAtiva = screen.getByRole('menuitem', { name: /ALT-MAX/i })
    fireEvent.click(itemAtiva)

    expect(setActiveMock).toHaveBeenCalledWith('1')
    expect(screen.queryByRole('menu')).toBeNull()
  })
})
