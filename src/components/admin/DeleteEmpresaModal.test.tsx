/* @vitest-environment jsdom */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import { DeleteEmpresaModal } from './DeleteEmpresaModal'

// Mock do hook de API (mesmo arquivo em que vive deleteEmpresa).
const deleteEmpresaMock = vi.fn()
vi.mock('@/hooks/api/useAdminEmpresas', () => ({
  deleteEmpresa: (...args: unknown[]) => deleteEmpresaMock(...args),
}))

// O componente le tokens do themeStore. Mock minimo para testes.
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
  deleteEmpresaMock.mockReset()
})

describe('<DeleteEmpresaModal />', () => {
  const empresa = { id: 42, nome: 'ALT Transportes' }

  it('nao renderiza quando empresa eh null', () => {
    const { container } = render(
      <DeleteEmpresaModal empresa={null} onClose={() => {}} onSuccess={() => {}} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('renderiza titulo e nome da empresa', () => {
    render(<DeleteEmpresaModal empresa={empresa} onClose={() => {}} onSuccess={() => {}} />)
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByText('Excluir empresa')).toBeTruthy()
    // Nome aparece no aviso + no label do input
    const matches = screen.getAllByText(/ALT Transportes/)
    expect(matches.length).toBeGreaterThanOrEqual(2)
  })

  it('botao Excluir comeca desabilitado', () => {
    render(<DeleteEmpresaModal empresa={empresa} onClose={() => {}} onSuccess={() => {}} />)
    const btn = screen.getByRole('button', { name: /^Excluir$/ })
    expect((btn as HTMLButtonElement).disabled).toBe(true)
  })

  it('botao Excluir continua desabilitado com nome errado', () => {
    render(<DeleteEmpresaModal empresa={empresa} onClose={() => {}} onSuccess={() => {}} />)
    const senha = screen.getByLabelText(/Senha do admin/)
    const nome = screen.getByLabelText(/Digite o nome exato/)
    fireEvent.change(senha, { target: { value: 'minhasenha' } })
    fireEvent.change(nome, { target: { value: 'ALT Trans' } })
    const btn = screen.getByRole('button', { name: /^Excluir$/ })
    expect((btn as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText(/Nome nao bate/)).toBeTruthy()
  })

  it('botao Excluir habilita quando senha + nome batem exatamente', () => {
    render(<DeleteEmpresaModal empresa={empresa} onClose={() => {}} onSuccess={() => {}} />)
    const senha = screen.getByLabelText(/Senha do admin/)
    const nome = screen.getByLabelText(/Digite o nome exato/)
    fireEvent.change(senha, { target: { value: 'minhasenha' } })
    fireEvent.change(nome, { target: { value: 'ALT Transportes' } })
    const btn = screen.getByRole('button', { name: /^Excluir$/ })
    expect((btn as HTMLButtonElement).disabled).toBe(false)
  })

  it('click em Excluir chama deleteEmpresa com argumentos corretos + onSuccess', async () => {
    deleteEmpresaMock.mockResolvedValueOnce(undefined)
    const onClose = vi.fn()
    const onSuccess = vi.fn()
    render(<DeleteEmpresaModal empresa={empresa} onClose={onClose} onSuccess={onSuccess} />)

    fireEvent.change(screen.getByLabelText(/Senha do admin/), { target: { value: 'admin123' } })
    fireEvent.change(screen.getByLabelText(/Digite o nome exato/), {
      target: { value: 'ALT Transportes' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^Excluir$/ }))

    await waitFor(() => {
      expect(deleteEmpresaMock).toHaveBeenCalledWith(42, 'admin123', 'ALT Transportes')
    })
    expect(onSuccess).toHaveBeenCalledOnce()
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('renderiza erro 403 no banner sem chamar onSuccess', async () => {
    deleteEmpresaMock.mockRejectedValueOnce({
      response: { status: 403, data: { detail: 'Senha do admin nao confere' } },
    })
    const onSuccess = vi.fn()
    render(<DeleteEmpresaModal empresa={empresa} onClose={() => {}} onSuccess={onSuccess} />)

    fireEvent.change(screen.getByLabelText(/Senha do admin/), { target: { value: 'errada' } })
    fireEvent.change(screen.getByLabelText(/Digite o nome exato/), {
      target: { value: 'ALT Transportes' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^Excluir$/ }))

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toMatch(/Senha do admin nao confere/)
    })
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('renderiza erro 409 (ja deletada) no banner', async () => {
    deleteEmpresaMock.mockRejectedValueOnce({
      response: { status: 409, data: { detail: 'Empresa ja esta soft-deletada' } },
    })
    render(<DeleteEmpresaModal empresa={empresa} onClose={() => {}} onSuccess={() => {}} />)

    fireEvent.change(screen.getByLabelText(/Senha do admin/), { target: { value: 'admin123' } })
    fireEvent.change(screen.getByLabelText(/Digite o nome exato/), {
      target: { value: 'ALT Transportes' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^Excluir$/ }))

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toMatch(/ja esta soft-deletada/)
    })
  })

  it('click em Cancelar chama onClose sem deletar', () => {
    const onClose = vi.fn()
    render(<DeleteEmpresaModal empresa={empresa} onClose={onClose} onSuccess={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /Cancelar/ }))
    expect(onClose).toHaveBeenCalledOnce()
    expect(deleteEmpresaMock).not.toHaveBeenCalled()
  })

  it('reseta inputs ao trocar de empresa (id muda)', () => {
    const { rerender } = render(
      <DeleteEmpresaModal empresa={empresa} onClose={() => {}} onSuccess={() => {}} />,
    )
    fireEvent.change(screen.getByLabelText(/Senha do admin/), { target: { value: 'minhasenha' } })

    // Trocar pra outra empresa: inputs zeram
    rerender(
      <DeleteEmpresaModal
        empresa={{ id: 99, nome: 'Outra Empresa' }}
        onClose={() => {}}
        onSuccess={() => {}}
      />,
    )
    const senhaInput = screen.getByLabelText(/Senha do admin/) as HTMLInputElement
    expect(senhaInput.value).toBe('')
  })
})
