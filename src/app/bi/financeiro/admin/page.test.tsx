/* @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import PageAdmin from './page'
import { useEmpresaStore } from '@/store/empresaStore'

/**
 * Botão "Resync extrato" (follow-up da investigação de contaminação do
 * extrato, 2026-07-13/14): dispara POST /sync/empresas/{id}/resync-extrato
 * direto da tela admin — antes só dava via fetch manual no console.
 *
 * Cobre: confirm() de guarda, chamada com id numérico correto, banner de
 * sucesso com contadores, e o caminho de timeout (504) que NÃO é erro —
 * o resync continua em segundo plano.
 */

const apiPostMock = vi.fn()

vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
    post: (...args: unknown[]) => apiPostMock(...args),
    delete: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
  },
}))

vi.mock('@/hooks/useRequireAdmin', () => ({
  useRequireAdmin: () => 'allowed' as const,
}))

vi.mock('@/components/AccessDenied', () => ({
  AccessDenied: () => <div>access denied</div>,
}))

vi.mock('@/components/admin/DeleteEmpresaModal', () => ({
  DeleteEmpresaModal: () => null,
}))

const EMPRESA = {
  id: '2',
  nome: 'GRUPO ALT',
  cnpj: '00.000.000/0001-00',
  cor: '#3b82f6',
  logoDark: null,
  logoLight: null,
}

describe('PageAdmin — botão Resync extrato', () => {
  beforeEach(() => {
    apiPostMock.mockReset()
    useEmpresaStore.setState({ empresas: [EMPRESA as never] })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('confirm cancelado nao chama a API', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<PageAdmin />)
    fireEvent.click(screen.getByRole('button', { name: /resync extrato grupo alt/i }))
    expect(apiPostMock).not.toHaveBeenCalled()
  })

  it('confirmado: POST no endpoint certo com id numerico + banner de sucesso', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    apiPostMock.mockResolvedValueOnce({
      data: { status: 'ok', deleted: 1113, lancamentos_synced: 5400 },
    })
    render(<PageAdmin />)
    fireEvent.click(screen.getByRole('button', { name: /resync extrato grupo alt/i }))

    expect(apiPostMock).toHaveBeenCalledWith('/sync/empresas/2/resync-extrato')
    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toMatch(/1113 removidos/)
      expect(screen.getByRole('alert').textContent).toMatch(/5400 lançamentos/)
    })
  })

  it('timeout do edge (504) mostra info de segundo plano, nao erro', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    apiPostMock.mockRejectedValueOnce({ response: { status: 504 } })
    render(<PageAdmin />)
    fireEvent.click(screen.getByRole('button', { name: /resync extrato grupo alt/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toMatch(/segundo plano/)
    })
  })

  it('erro real (403) mostra banner de falha com detail', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    apiPostMock.mockRejectedValueOnce({
      response: { status: 403, data: { detail: 'Sem permissão' } },
    })
    render(<PageAdmin />)
    fireEvent.click(screen.getByRole('button', { name: /resync extrato grupo alt/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toMatch(/falha ao iniciar resync/)
      expect(screen.getByRole('alert').textContent).toMatch(/Sem permissão/)
    })
  })
})
