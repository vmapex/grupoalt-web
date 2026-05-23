/* @vitest-environment jsdom */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import { DeleteUsuarioModal } from './DeleteUsuarioModal'

/**
 * Bug #4 (2026-05-23) — testes do modal de soft delete de usuario.
 * Espelha test_admin_soft_delete_empresa pra manter consistencia.
 *
 * Cobre:
 *   - nao renderiza quando usuario eh null
 *   - renderiza titulo + nome + email do usuario
 *   - botao Excluir comeca disabled
 *   - habilita quando senha + nome batem exatamente
 *   - nome errado mostra erro inline + mantem Excluir disabled
 *   - click em Excluir chama deleteUsuario com args corretos
 *   - erros 403 / 409 / 404 viram banner
 *   - Cancelar fecha sem chamar deleteUsuario
 *   - reset de inputs ao trocar usuario (id muda)
 */


const deleteUsuarioMock = vi.fn()
vi.mock('@/hooks/api/useAdminPerfis', () => ({
  deleteUsuario: (...args: unknown[]) => deleteUsuarioMock(...args),
}))


vi.mock('@/store/themeStore', () => ({
  useThemeStore: (selector: (s: { tokens: Record<string, string> }) => unknown) =>
    selector({
      tokens: {
        bg: '#000', surface: '#111', surfaceHover: '#222', border: '#333',
        borderHover: '#444', text: '#fff', textSec: '#ccc', muted: '#999',
        red: '#f18888', redDim: '#3a1818', blue: '#3D8AD6', blueDim: '#0a1a2a',
        gold: '#e0b82e', isDark: 'true',
      },
    }),
}))


beforeEach(() => {
  deleteUsuarioMock.mockReset()
})


describe('<DeleteUsuarioModal />', () => {
  const usuario = {
    id: 42,
    nome: 'Maria da Silva',
    email: 'maria@grupoalt.com.br',
  }

  it('nao renderiza quando usuario eh null', () => {
    const { container } = render(
      <DeleteUsuarioModal usuario={null} onClose={() => {}} onSuccess={() => {}} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('renderiza titulo + nome + email', () => {
    render(<DeleteUsuarioModal usuario={usuario} onClose={() => {}} onSuccess={() => {}} />)
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByText('Excluir usuario')).toBeTruthy()
    // Nome aparece no aviso + label do input (>= 2 matches)
    expect(screen.getAllByText(/Maria da Silva/).length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText(/maria@grupoalt.com.br/)).toBeTruthy()
  })

  it('botao Excluir comeca disabled', () => {
    render(<DeleteUsuarioModal usuario={usuario} onClose={() => {}} onSuccess={() => {}} />)
    const btn = screen.getByRole('button', { name: /^Excluir$/ })
    expect((btn as HTMLButtonElement).disabled).toBe(true)
  })

  it('botao continua disabled com nome errado', () => {
    render(<DeleteUsuarioModal usuario={usuario} onClose={() => {}} onSuccess={() => {}} />)
    fireEvent.change(screen.getByLabelText(/Senha do admin/), { target: { value: 'admin123' } })
    fireEvent.change(screen.getByLabelText(/Digite o nome exato/), {
      target: { value: 'Maria' },
    })
    const btn = screen.getByRole('button', { name: /^Excluir$/ })
    expect((btn as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText(/Nome nao bate/)).toBeTruthy()
  })

  it('botao habilita quando senha + nome batem exatamente', () => {
    render(<DeleteUsuarioModal usuario={usuario} onClose={() => {}} onSuccess={() => {}} />)
    fireEvent.change(screen.getByLabelText(/Senha do admin/), { target: { value: 'admin123' } })
    fireEvent.change(screen.getByLabelText(/Digite o nome exato/), {
      target: { value: 'Maria da Silva' },
    })
    const btn = screen.getByRole('button', { name: /^Excluir$/ })
    expect((btn as HTMLButtonElement).disabled).toBe(false)
  })

  it('click em Excluir chama deleteUsuario com args corretos + onSuccess + onClose', async () => {
    deleteUsuarioMock.mockResolvedValueOnce(undefined)
    const onClose = vi.fn()
    const onSuccess = vi.fn()
    render(<DeleteUsuarioModal usuario={usuario} onClose={onClose} onSuccess={onSuccess} />)

    fireEvent.change(screen.getByLabelText(/Senha do admin/), { target: { value: 'admin123' } })
    fireEvent.change(screen.getByLabelText(/Digite o nome exato/), {
      target: { value: 'Maria da Silva' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^Excluir$/ }))

    await waitFor(() => {
      expect(deleteUsuarioMock).toHaveBeenCalledWith(42, 'admin123', 'Maria da Silva')
    })
    expect(onSuccess).toHaveBeenCalledOnce()
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('erro 403 vira banner + nao chama onSuccess', async () => {
    deleteUsuarioMock.mockRejectedValueOnce({
      response: { status: 403, data: { detail: 'Senha do admin nao confere' } },
    })
    const onSuccess = vi.fn()
    render(<DeleteUsuarioModal usuario={usuario} onClose={() => {}} onSuccess={onSuccess} />)

    fireEvent.change(screen.getByLabelText(/Senha do admin/), { target: { value: 'errada' } })
    fireEvent.change(screen.getByLabelText(/Digite o nome exato/), {
      target: { value: 'Maria da Silva' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^Excluir$/ }))

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toMatch(/Senha do admin nao confere/)
    })
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('erro 403 (auto-delete) tambem vira banner com mensagem do backend', async () => {
    deleteUsuarioMock.mockRejectedValueOnce({
      response: {
        status: 403,
        data: { detail: 'Voce nao pode deletar a si mesmo. Peca a outro admin.' },
      },
    })
    render(<DeleteUsuarioModal usuario={usuario} onClose={() => {}} onSuccess={() => {}} />)

    fireEvent.change(screen.getByLabelText(/Senha do admin/), { target: { value: 'admin123' } })
    fireEvent.change(screen.getByLabelText(/Digite o nome exato/), {
      target: { value: 'Maria da Silva' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^Excluir$/ }))

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toMatch(/si mesmo/)
    })
  })

  it('erro 409 (ja deletado) vira banner', async () => {
    deleteUsuarioMock.mockRejectedValueOnce({
      response: {
        status: 409,
        data: { detail: 'Usuario ja esta soft-deletado (use /restore)' },
      },
    })
    render(<DeleteUsuarioModal usuario={usuario} onClose={() => {}} onSuccess={() => {}} />)

    fireEvent.change(screen.getByLabelText(/Senha do admin/), { target: { value: 'admin123' } })
    fireEvent.change(screen.getByLabelText(/Digite o nome exato/), {
      target: { value: 'Maria da Silva' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^Excluir$/ }))

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toMatch(/ja esta soft-deletado/)
    })
  })

  it('erro 404 vira banner com mensagem amigavel', async () => {
    deleteUsuarioMock.mockRejectedValueOnce({
      response: { status: 404, data: {} },
    })
    render(<DeleteUsuarioModal usuario={usuario} onClose={() => {}} onSuccess={() => {}} />)

    fireEvent.change(screen.getByLabelText(/Senha do admin/), { target: { value: 'admin123' } })
    fireEvent.change(screen.getByLabelText(/Digite o nome exato/), {
      target: { value: 'Maria da Silva' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^Excluir$/ }))

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toMatch(/nao encontrado/)
    })
  })

  it('click em Cancelar fecha sem chamar deleteUsuario', () => {
    const onClose = vi.fn()
    render(<DeleteUsuarioModal usuario={usuario} onClose={onClose} onSuccess={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /Cancelar/ }))
    expect(onClose).toHaveBeenCalledOnce()
    expect(deleteUsuarioMock).not.toHaveBeenCalled()
  })

  it('reseta inputs ao trocar de usuario (id muda)', () => {
    const { rerender } = render(
      <DeleteUsuarioModal usuario={usuario} onClose={() => {}} onSuccess={() => {}} />,
    )
    fireEvent.change(screen.getByLabelText(/Senha do admin/), { target: { value: 'minhasenha' } })

    rerender(
      <DeleteUsuarioModal
        usuario={{ id: 99, nome: 'Outro User', email: 'outro@x.com' }}
        onClose={() => {}}
        onSuccess={() => {}}
      />,
    )
    const senhaInput = screen.getByLabelText(/Senha do admin/) as HTMLInputElement
    expect(senhaInput.value).toBe('')
  })
})
