/* @vitest-environment jsdom */
import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import AdminConfiguracoesRedirect from './page'

/**
 * 2026-07-17 (F1 unificação) — a tela "Configurações" do BI foi
 * aposentada: dados cadastrais, logos e resync de extrato migraram
 * pra aba Empresas do /portal/admin (com persistência real via
 * PATCH — o antigo saveEdit só gravava no zustand). Esta rota vira
 * redirect pra não quebrar bookmarks; os testes do botão de resync
 * moveram junto pro page.test do portal.
 */

const replaceMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn(), prefetch: vi.fn() }),
}))

beforeEach(() => {
  replaceMock.mockReset()
})

describe('/bi/financeiro/admin (redirect)', () => {
  it('redireciona para /portal/admin?tab=empresas no mount', async () => {
    render(<AdminConfiguracoesRedirect />)
    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/portal/admin?tab=empresas')
    })
    expect(replaceMock).toHaveBeenCalledTimes(1)
  })

  it('mostra mensagem informativa enquanto redireciona', () => {
    render(<AdminConfiguracoesRedirect />)
    expect(
      screen.getByText(/configurações de empresa mudaram para a Administração do Portal/i),
    ).toBeTruthy()
  })
})
