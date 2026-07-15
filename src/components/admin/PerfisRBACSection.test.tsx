/* @vitest-environment jsdom */
import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

import { PerfisRBACSection } from './PerfisRBACSection'

/**
 * PerfisRBACSection (2026-07-15) — seção de atribuição de perfis RBAC
 * no /portal/admin, herdeira da antiga tela /bi/financeiro/admin/usuarios.
 * Cobre: empty state, listagem, atribuir (com refetch), revogar (com
 * confirm), aviso de bypass pra admin e filtro de empresas já atribuídas.
 */

const refetchMock = vi.fn()
const criarMock = vi.fn()
const removerMock = vi.fn()

let perfisData: unknown[] = []
let atribuicoesData: unknown[] = []

vi.mock('@/hooks/api/useAdminPerfis', () => ({
  useAdminPerfis: () => ({
    data: perfisData, loading: false, error: null, refetch: vi.fn(),
  }),
  useAdminUsuarioAtribuicoes: () => ({
    data: atribuicoesData, loading: false, error: null, refetch: refetchMock,
  }),
  criarAtribuicaoPerfil: (...args: unknown[]) => criarMock(...args),
  removerAtribuicaoPerfil: (...args: unknown[]) => removerMock(...args),
}))

const EMPRESAS = [
  { id: 1, nome: 'GRUPO ALT' },
  { id: 2, nome: 'ALT-MAX' },
]

const ATRIBUICAO_DIRETORIA = {
  id: 100, usuario_id: 5, perfil_id: 7, perfil_nome: 'Diretoria',
  empresa_id: 1, empresa_nome: 'GRUPO ALT', criado_em: '2026-07-15T00:00:00Z',
}

beforeEach(() => {
  refetchMock.mockReset()
  criarMock.mockReset().mockResolvedValue({})
  removerMock.mockReset().mockResolvedValue(undefined)
  perfisData = [
    { id: 7, nome: 'Diretoria', descricao: null, exports_confidencial: false, sistema: true, permissoes: [] },
    { id: 8, nome: 'Operacoes', descricao: null, exports_confidencial: true, sistema: true, permissoes: [] },
  ]
  atribuicoesData = []
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('<PerfisRBACSection />', () => {
  it('sem atribuições mostra empty state com aviso do 403', () => {
    render(<PerfisRBACSection usuarioId={5} isAdmin={false} empresas={EMPRESAS} />)
    expect(screen.getByText(/Nenhum perfil atribuído/i)).toBeTruthy()
    expect(screen.getByText(/403 no BI/i)).toBeTruthy()
  })

  it('lista atribuições com empresa e badge de marca confidencial', () => {
    atribuicoesData = [
      ATRIBUICAO_DIRETORIA,
      {
        id: 101, usuario_id: 5, perfil_id: 8, perfil_nome: 'Operacoes',
        empresa_id: 2, empresa_nome: 'ALT-MAX', criado_em: '2026-07-15T00:00:00Z',
      },
    ]
    render(<PerfisRBACSection usuarioId={5} isAdmin={false} empresas={EMPRESAS} />)

    // 'Diretoria'/'GRUPO ALT' também existem como <option> dos dropdowns —
    // valida presença na LISTA pelos botões de revogar (1 por atribuição).
    expect(screen.getByRole('button', { name: /Revogar Diretoria em GRUPO ALT/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Revogar Operacoes em ALT-MAX/i })).toBeTruthy()
    // Só o perfil Operacoes tem exports_confidencial
    expect(screen.getAllByText(/Marca confidencial/i)).toHaveLength(1)
  })

  it('atribuir: seleciona perfil + empresa, chama criarAtribuicaoPerfil e refetch', async () => {
    render(<PerfisRBACSection usuarioId={5} isAdmin={false} empresas={EMPRESAS} />)

    fireEvent.change(screen.getByLabelText('Perfil RBAC'), { target: { value: '7' } })
    fireEvent.change(screen.getByLabelText('Empresa do perfil'), { target: { value: '2' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Atribuir/i }))
    })

    expect(criarMock).toHaveBeenCalledWith(5, 7, 2)
    expect(refetchMock).toHaveBeenCalled()
  })

  it('botão Atribuir desabilitado sem perfil+empresa selecionados', () => {
    render(<PerfisRBACSection usuarioId={5} isAdmin={false} empresas={EMPRESAS} />)
    const btn = screen.getByRole('button', { name: /Atribuir/i })
    expect(btn.hasAttribute('disabled')).toBe(true)
  })

  it('erro do backend ao atribuir aparece no banner role=alert', async () => {
    criarMock.mockRejectedValue({ response: { data: { detail: 'Perfil inexistente' } } })
    render(<PerfisRBACSection usuarioId={5} isAdmin={false} empresas={EMPRESAS} />)

    fireEvent.change(screen.getByLabelText('Perfil RBAC'), { target: { value: '7' } })
    fireEvent.change(screen.getByLabelText('Empresa do perfil'), { target: { value: '1' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Atribuir/i }))
    })

    expect(screen.getByRole('alert').textContent).toContain('Perfil inexistente')
    expect(refetchMock).not.toHaveBeenCalled()
  })

  it('revogar: pede confirm e chama removerAtribuicaoPerfil + refetch', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    atribuicoesData = [ATRIBUICAO_DIRETORIA]
    render(<PerfisRBACSection usuarioId={5} isAdmin={false} empresas={EMPRESAS} />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Revogar Diretoria em GRUPO ALT/i }))
    })

    expect(removerMock).toHaveBeenCalledWith(5, 100)
    expect(refetchMock).toHaveBeenCalled()
  })

  it('revogar cancelado no confirm não chama a API', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    atribuicoesData = [ATRIBUICAO_DIRETORIA]
    render(<PerfisRBACSection usuarioId={5} isAdmin={false} empresas={EMPRESAS} />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Revogar Diretoria em GRUPO ALT/i }))
    })

    expect(removerMock).not.toHaveBeenCalled()
  })

  it('isAdmin mostra aviso de bypass do RBAC', () => {
    render(<PerfisRBACSection usuarioId={5} isAdmin empresas={EMPRESAS} />)
    expect(screen.getByText(/bypass total no RBAC/i)).toBeTruthy()
  })

  it('empresa onde o user já tem o perfil selecionado some do dropdown', () => {
    atribuicoesData = [ATRIBUICAO_DIRETORIA]
    render(<PerfisRBACSection usuarioId={5} isAdmin={false} empresas={EMPRESAS} />)

    // Sem perfil selecionado: todas as empresas disponíveis
    const selectEmpresa = screen.getByLabelText('Empresa do perfil') as HTMLSelectElement
    expect(selectEmpresa.options.length).toBe(3) // placeholder + 2

    // Seleciona Diretoria (já atribuída na GRUPO ALT) → só ALT-MAX resta
    fireEvent.change(screen.getByLabelText('Perfil RBAC'), { target: { value: '7' } })
    expect(selectEmpresa.options.length).toBe(2) // placeholder + ALT-MAX
    const nomes = Array.from(selectEmpresa.options).map((o) => o.text)
    expect(nomes).not.toContain('GRUPO ALT')
    expect(nomes).toContain('ALT-MAX')
  })
})
