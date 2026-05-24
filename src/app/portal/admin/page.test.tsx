/* @vitest-environment jsdom */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import AdminPage from './page'

/**
 * Race condition restore de empresa (follow-up do PR #152).
 *
 * Antes: `restoringEmpresa: number | null` so suportava 1 restore
 * simultaneo. Mesmo bug latente do `/bi/financeiro/admin/usuarios`.
 *
 * Agora: `restoringEmpresaIds: Set<number>` permite multiplos
 * restores em paralelo, cada botao com seu proprio spinner.
 */


// ── Mocks ──────────────────────────────────────────────────────────────────

const apiGetMock = vi.fn()
const apiPostMock = vi.fn()

vi.mock('@/lib/api', () => ({
  default: {
    get: (...args: unknown[]) => apiGetMock(...args),
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


interface Deferred {
  promise: Promise<void>
  resolve: () => void
  reject: (err: unknown) => void
}

function makeDeferred(): Deferred {
  let resolve!: () => void
  let reject!: (err: unknown) => void
  const promise = new Promise<void>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const restoreDeferreds = new Map<number, Deferred>()

vi.mock('@/hooks/useAPI', () => ({
  restoreEmpresa: (id: number) => {
    const d = makeDeferred()
    restoreDeferreds.set(id, d)
    return d.promise
  },
}))


beforeEach(() => {
  restoreDeferreds.clear()
  apiGetMock.mockReset()
  apiPostMock.mockReset()

  // Mock /gestao/usuarios -> lista vazia
  // Mock /admin/empresas -> 2 empresas soft-deletadas
  apiGetMock.mockImplementation((url: string) => {
    if (url === '/gestao/usuarios') return Promise.resolve({ data: [] })
    if (url === '/admin/empresas') {
      return Promise.resolve({
        data: [
          {
            id: 10, nome: 'Empresa Alfa', cnpj: '11.111.111/0001-11',
            tem_credencial: true, deleted_at: '2026-05-24T10:00:00Z',
          },
          {
            id: 20, nome: 'Empresa Beta', cnpj: '22.222.222/0001-22',
            tem_credencial: false, deleted_at: '2026-05-24T11:00:00Z',
          },
        ],
      })
    }
    if (url.includes('/unidades')) return Promise.resolve({ data: [] })
    return Promise.resolve({ data: [] })
  })
})


describe('AdminPage portal — race condition restore empresa', () => {
  it('permite restaurar 2 empresas em paralelo (ambos spinners visiveis ao mesmo tempo)', async () => {
    render(<AdminPage />)

    // Espera loadData terminar (2 chamadas concorrentes)
    await waitFor(() => {
      expect(apiGetMock).toHaveBeenCalledWith('/gestao/usuarios')
      expect(apiGetMock).toHaveBeenCalledWith('/admin/empresas')
    })

    // Vai para aba Empresas
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^Empresas$/i }))
    })

    const btnAlfa = await screen.findByRole('button', { name: /Restaurar Empresa Alfa/i })
    const btnBeta = screen.getByRole('button', { name: /Restaurar Empresa Beta/i })

    // Clica Alfa primeiro
    await act(async () => {
      fireEvent.click(btnAlfa)
    })
    expect(btnAlfa.hasAttribute('disabled')).toBe(true)
    expect(btnBeta.hasAttribute('disabled')).toBe(false)

    // Clica Beta enquanto Alfa ainda esta processando
    await act(async () => {
      fireEvent.click(btnBeta)
    })
    expect(btnAlfa.hasAttribute('disabled')).toBe(true) // ← antes virava false
    expect(btnBeta.hasAttribute('disabled')).toBe(true)

    // Resolve Alfa primeiro
    await act(async () => {
      restoreDeferreds.get(10)!.resolve()
      await restoreDeferreds.get(10)!.promise
    })
    expect(btnAlfa.hasAttribute('disabled')).toBe(false)
    expect(btnBeta.hasAttribute('disabled')).toBe(true) // ← Beta mantem spinner

    // Resolve Beta
    await act(async () => {
      restoreDeferreds.get(20)!.resolve()
      await restoreDeferreds.get(20)!.promise
    })
    expect(btnBeta.hasAttribute('disabled')).toBe(false)
  })

  it('erro em um restore nao afeta o spinner do outro em paralelo', async () => {
    render(<AdminPage />)

    await waitFor(() => {
      expect(apiGetMock).toHaveBeenCalledWith('/admin/empresas')
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^Empresas$/i }))
    })

    const btnAlfa = await screen.findByRole('button', { name: /Restaurar Empresa Alfa/i })
    const btnBeta = screen.getByRole('button', { name: /Restaurar Empresa Beta/i })

    await act(async () => {
      fireEvent.click(btnAlfa)
    })
    await act(async () => {
      fireEvent.click(btnBeta)
    })

    // Alfa falha; Beta mantem spinner
    await act(async () => {
      restoreDeferreds.get(10)!.reject({
        response: { data: { detail: 'erro forcado' } },
      })
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(btnAlfa.hasAttribute('disabled')).toBe(false)
    expect(btnBeta.hasAttribute('disabled')).toBe(true)

    // Resolve Beta OK
    await act(async () => {
      restoreDeferreds.get(20)!.resolve()
      await restoreDeferreds.get(20)!.promise
    })
    expect(btnBeta.hasAttribute('disabled')).toBe(false)
  })
})
