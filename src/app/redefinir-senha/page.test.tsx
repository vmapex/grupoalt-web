/* @vitest-environment jsdom */
import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import RedefinirSenhaPage from './page'

/**
 * /redefinir-senha (2026-07-16) — define a senha via token (convite ou
 * reset). Cobre: link sem token, modo convite, validação de confirmação,
 * fluxo feliz e erro 400 (token inválido/expirado).
 */

const apiPostMock = vi.fn()
vi.mock('@/lib/api', () => ({
  default: { post: (...args: unknown[]) => apiPostMock(...args) },
}))

let searchParams = new URLSearchParams()
vi.mock('next/navigation', () => ({
  useSearchParams: () => searchParams,
}))

beforeEach(() => {
  apiPostMock.mockReset()
  searchParams = new URLSearchParams()
})

async function preencherSenhas(senha: string, confirma: string) {
  fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: senha } })
  fireEvent.change(screen.getByLabelText('Confirmar senha'), { target: { value: confirma } })
}

describe('/redefinir-senha', () => {
  it('sem token mostra "Link incompleto" com CTA pro esqueci-senha', () => {
    render(<RedefinirSenhaPage />)
    expect(screen.getByText(/Link incompleto/i)).toBeTruthy()
    expect(screen.getByText(/Pedir novo link/i).getAttribute('href')).toBe('/esqueci-senha')
  })

  it('convite=1 usa o texto de primeiro acesso', () => {
    searchParams = new URLSearchParams('token=abc&convite=1')
    render(<RedefinirSenhaPage />)
    expect(screen.getByText(/Defina sua senha de acesso/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: /Definir senha e continuar/i })).toBeTruthy()
  })

  it('botão desabilitado com senha curta ou confirmação divergente', async () => {
    searchParams = new URLSearchParams('token=abc')
    render(<RedefinirSenhaPage />)
    const btn = screen.getByRole('button', { name: /Redefinir senha/i })

    await act(async () => { await preencherSenhas('curta', 'curta') })
    expect(btn.hasAttribute('disabled')).toBe(true)

    await act(async () => { await preencherSenhas('senha-valida-123', 'diferente-123') })
    expect(btn.hasAttribute('disabled')).toBe(true)
    expect(screen.getByText(/não coincidem/i)).toBeTruthy()

    await act(async () => { await preencherSenhas('senha-valida-123', 'senha-valida-123') })
    expect(btn.hasAttribute('disabled')).toBe(false)
  })

  it('fluxo feliz: POST com token+senha e tela de sucesso', async () => {
    searchParams = new URLSearchParams('token=tok-123')
    apiPostMock.mockResolvedValue({ data: { message: 'ok' } })
    render(<RedefinirSenhaPage />)

    await act(async () => { await preencherSenhas('senha-valida-123', 'senha-valida-123') })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Redefinir senha/i }))
    })

    expect(apiPostMock).toHaveBeenCalledWith('/auth/redefinir-senha', {
      token: 'tok-123', nova_senha: 'senha-valida-123',
    })
    expect(screen.getByText(/Senha definida!/i)).toBeTruthy()
    expect(screen.getByText(/Ir para o login/i).getAttribute('href')).toBe('/login')
  })

  it('400 do backend mostra o detail (token expirado)', async () => {
    searchParams = new URLSearchParams('token=tok-velho')
    apiPostMock.mockRejectedValue({
      response: { status: 400, data: { detail: 'Link inválido ou expirado.' } },
    })
    render(<RedefinirSenhaPage />)

    await act(async () => { await preencherSenhas('senha-valida-123', 'senha-valida-123') })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Redefinir senha/i }))
    })

    expect(screen.getByRole('alert').textContent).toContain('Link inválido ou expirado')
  })
})
