/* @vitest-environment jsdom */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import { ConfirmDeleteModal } from './ConfirmDeleteModal'

/**
 * E2 (2026-05-24) — testes do componente base de modal de soft delete.
 *
 * Cobertura focada nas responsabilidades exclusivas do base (que os
 * wrappers Delete{Empresa,Usuario}Modal nao precisam mais testar):
 *
 *   - Renderiza title + warningContent customizados
 *   - idPrefix unico gera IDs unicos (htmlFor + aria-labelledby)
 *   - onConfirm injetado eh chamado com (id, senha, nome)
 *   - errorMessages overrides 404/409 mostram mensagem customizada
 *   - errorMessages default (sem props) usa fallback generico
 *   - target null nao renderiza nada
 *   - Reset de inputs quando target.id muda
 *
 * Os 2 wrappers ja tem 23 tests cobrindo cenarios integrados
 * (DeleteEmpresaModal.test.tsx, DeleteUsuarioModal.test.tsx).
 */


vi.mock('@/store/themeStore', () => ({
  useThemeStore: (selector: (s: { tokens: Record<string, string> }) => unknown) =>
    selector({
      tokens: {
        bg: '#000', surface: '#111', surfaceHover: '#222', border: '#333',
        text: '#fff', textSec: '#ccc', muted: '#999',
        red: '#f18888', redDim: '#3a1818',
      },
    }),
}))


const onConfirmMock = vi.fn()
const onCloseMock = vi.fn()
const onSuccessMock = vi.fn()


beforeEach(() => {
  onConfirmMock.mockReset()
  onCloseMock.mockReset()
  onSuccessMock.mockReset()
})


function renderModal(overrides: {
  target?: { id: number; nome: string } | null
  title?: string
  idPrefix?: string
  errorMessages?: { 403?: string; 404?: string; 409?: string }
} = {}) {
  return render(
    <ConfirmDeleteModal
      target={overrides.target ?? { id: 42, nome: 'Alvo Teste' }}
      title={overrides.title ?? 'Excluir alvo'}
      idPrefix={overrides.idPrefix ?? 'test-modal'}
      warningContent={<>Aviso customizado pra este modal.</>}
      onConfirm={onConfirmMock}
      errorMessages={overrides.errorMessages}
      onClose={onCloseMock}
      onSuccess={onSuccessMock}
    />,
  )
}


describe('<ConfirmDeleteModal />', () => {
  it('nao renderiza quando target eh null', () => {
    const { container } = render(
      <ConfirmDeleteModal
        target={null}
        title="Excluir alvo"
        idPrefix="test-null"
        warningContent={<>Aviso.</>}
        onConfirm={onConfirmMock}
        onClose={onCloseMock}
        onSuccess={onSuccessMock}
      />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('renderiza title + warningContent customizados', () => {
    renderModal({ title: 'Apagar registro X' })
    expect(screen.getByText('Apagar registro X')).toBeTruthy()
    expect(screen.getByText(/Aviso customizado/)).toBeTruthy()
  })

  it('idPrefix unico gera ID consistente em htmlFor + aria-labelledby', () => {
    renderModal({ idPrefix: 'meu-prefix' })
    const dialog = screen.getByRole('dialog')
    expect(dialog.getAttribute('aria-labelledby')).toBe('meu-prefix-title')
    const senhaInput = screen.getByLabelText(/Senha do admin/)
    expect(senhaInput.getAttribute('id')).toBe('meu-prefix-senha')
    const nomeInput = screen.getByLabelText(/Digite o nome exato/)
    expect(nomeInput.getAttribute('id')).toBe('meu-prefix-nome')
  })

  it('botao Excluir habilita quando senha + nome batem', () => {
    renderModal()
    fireEvent.change(screen.getByLabelText(/Senha do admin/), { target: { value: 'x' } })
    fireEvent.change(screen.getByLabelText(/Digite o nome exato/), {
      target: { value: 'Alvo Teste' },
    })
    expect((screen.getByRole('button', { name: /^Excluir$/ }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('click em Excluir chama onConfirm com (id, senha, nome)', async () => {
    onConfirmMock.mockResolvedValueOnce(undefined)
    renderModal({ target: { id: 99, nome: 'Alvo X' } })

    fireEvent.change(screen.getByLabelText(/Senha do admin/), { target: { value: 'minhaSenha' } })
    fireEvent.change(screen.getByLabelText(/Digite o nome exato/), { target: { value: 'Alvo X' } })
    fireEvent.click(screen.getByRole('button', { name: /^Excluir$/ }))

    await waitFor(() => expect(onConfirmMock).toHaveBeenCalledWith(99, 'minhaSenha', 'Alvo X'))
    expect(onSuccessMock).toHaveBeenCalledOnce()
    expect(onCloseMock).toHaveBeenCalledOnce()
  })

  it('errorMessages.404 override aplica em status 404', async () => {
    onConfirmMock.mockRejectedValueOnce({ response: { status: 404, data: {} } })
    renderModal({ errorMessages: { 404: 'Custom 404 message' } })

    fireEvent.change(screen.getByLabelText(/Senha do admin/), { target: { value: 'x' } })
    fireEvent.change(screen.getByLabelText(/Digite o nome exato/), { target: { value: 'Alvo Teste' } })
    fireEvent.click(screen.getByRole('button', { name: /^Excluir$/ }))

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toMatch(/Custom 404 message/)
    })
  })

  it('errorMessages.409 override aplica em status 409', async () => {
    onConfirmMock.mockRejectedValueOnce({ response: { status: 409, data: {} } })
    renderModal({ errorMessages: { 409: 'Custom 409 message' } })

    fireEvent.change(screen.getByLabelText(/Senha do admin/), { target: { value: 'x' } })
    fireEvent.change(screen.getByLabelText(/Digite o nome exato/), { target: { value: 'Alvo Teste' } })
    fireEvent.click(screen.getByRole('button', { name: /^Excluir$/ }))

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toMatch(/Custom 409 message/)
    })
  })

  it('backend detail tem prioridade sobre errorMessages override', async () => {
    // Backend explicitly mandou detail: use o detail, nao o override.
    onConfirmMock.mockRejectedValueOnce({
      response: { status: 403, data: { detail: 'Detalhe especifico do backend' } },
    })
    renderModal({ errorMessages: { 403: 'Generico nao deve aparecer' } })

    fireEvent.change(screen.getByLabelText(/Senha do admin/), { target: { value: 'x' } })
    fireEvent.change(screen.getByLabelText(/Digite o nome exato/), { target: { value: 'Alvo Teste' } })
    fireEvent.click(screen.getByRole('button', { name: /^Excluir$/ }))

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toMatch(/Detalhe especifico do backend/)
    })
  })

  it('5xx/network (default branch) usa fallback "Erro ao excluir"', async () => {
    onConfirmMock.mockRejectedValueOnce(new Error('Network Error'))
    renderModal()

    fireEvent.change(screen.getByLabelText(/Senha do admin/), { target: { value: 'x' } })
    fireEvent.change(screen.getByLabelText(/Digite o nome exato/), { target: { value: 'Alvo Teste' } })
    fireEvent.click(screen.getByRole('button', { name: /^Excluir$/ }))

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toMatch(/Erro ao excluir/)
    })
  })

  it('reseta inputs ao trocar de target (id muda)', () => {
    const { rerender } = renderModal({ target: { id: 1, nome: 'Primeiro' } })
    fireEvent.change(screen.getByLabelText(/Senha do admin/), { target: { value: 'preencheu' } })

    rerender(
      <ConfirmDeleteModal
        target={{ id: 2, nome: 'Segundo' }}
        title="Excluir alvo"
        idPrefix="test-modal"
        warningContent={<>Aviso customizado pra este modal.</>}
        onConfirm={onConfirmMock}
        onClose={onCloseMock}
        onSuccess={onSuccessMock}
      />,
    )
    expect((screen.getByLabelText(/Senha do admin/) as HTMLInputElement).value).toBe('')
  })

  it('input de senha tem autoFocus', () => {
    renderModal()
    const senhaInput = screen.getByLabelText(/Senha do admin/) as HTMLInputElement
    // Em jsdom, autoFocus seta o foco no document.activeElement na montagem
    expect(document.activeElement).toBe(senhaInput)
  })
})
