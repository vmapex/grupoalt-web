/* @vitest-environment jsdom */
import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import AdminUsuariosRedirect from './page'

/**
 * 2026-07-15 — a tela de usuários do BI foi aposentada: a gestão de
 * usuários (perfis RBAC + Acesso ao Motor + exclusão/restauração)
 * migrou pro /portal/admin. Esta rota vira redirect pra não quebrar
 * bookmarks e instruções antigas ("Admin → Usuários → Acesso ao Motor").
 */

const replaceMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn(), prefetch: vi.fn() }),
}))

beforeEach(() => {
  replaceMock.mockReset()
})

describe('/bi/financeiro/admin/usuarios (redirect)', () => {
  it('redireciona para /portal/admin no mount', async () => {
    render(<AdminUsuariosRedirect />)
    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/portal/admin')
    })
    expect(replaceMock).toHaveBeenCalledTimes(1)
  })

  it('mostra mensagem informativa enquanto redireciona', () => {
    render(<AdminUsuariosRedirect />)
    expect(
      screen.getByText(/gestão de usuários mudou para a Administração do Portal/i),
    ).toBeTruthy()
  })
})
