/* @vitest-environment jsdom */
import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import EsqueciSenhaPage from './page'

/**
 * /esqueci-senha (2026-07-16) — pede o link de redefinição. A confirmação
 * é GENÉRICA por design (anti-enumeração: o backend responde 200 igual
 * pra e-mail existente ou não).
 */

const apiPostMock = vi.fn()
vi.mock('@/lib/api', () => ({
  default: { post: (...args: unknown[]) => apiPostMock(...args) },
}))

beforeEach(() => {
  apiPostMock.mockReset()
})

describe('/esqueci-senha', () => {
  it('envia o e-mail digitado e mostra confirmação genérica', async () => {
    apiPostMock.mockResolvedValue({ data: { message: 'ok' } })
    render(<EsqueciSenhaPage />)

    fireEvent.change(screen.getByLabelText('E-mail corporativo'), {
      target: { value: 'alguem@grupoalt.agr.br' },
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Enviar link/i }))
    })

    expect(apiPostMock).toHaveBeenCalledWith('/auth/esqueci-senha', {
      email: 'alguem@grupoalt.agr.br',
    })
    expect(screen.getByText(/Verifique seu e-mail/i)).toBeTruthy()
    expect(screen.getByText(/estiver cadastrado/i)).toBeTruthy()
  })

  it('botão desabilitado sem e-mail', () => {
    render(<EsqueciSenhaPage />)
    expect(
      screen.getByRole('button', { name: /Enviar link/i }).hasAttribute('disabled'),
    ).toBe(true)
  })

  it('429 mostra mensagem de rate limit', async () => {
    apiPostMock.mockRejectedValue({ response: { status: 429 } })
    render(<EsqueciSenhaPage />)

    fireEvent.change(screen.getByLabelText('E-mail corporativo'), {
      target: { value: 'x@y.com' },
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Enviar link/i }))
    })

    expect(screen.getByRole('alert').textContent).toContain('Muitas tentativas')
  })
})
