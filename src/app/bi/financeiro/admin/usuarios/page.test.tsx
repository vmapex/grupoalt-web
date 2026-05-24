/* @vitest-environment jsdom */
import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import AdminUsuariosPage from './page'

/**
 * Race condition restore (sugestao deferida do audit #148).
 *
 * Antes: `restoringId: number | null` so suportava 1 restore simultaneo.
 * Clicar restore em user A e depois em user B antes do A terminar
 * sobrescrevia o id, fazendo o spinner do A sumir.
 *
 * Agora: `restoringIds: Set<number>` permite multiplos restores
 * em paralelo, cada botao com seu proprio spinner.
 */


// ── Mocks de stores e hooks ─────────────────────────────────────────────────

vi.mock('@/store/themeStore', () => ({
  useThemeStore: (selector: (s: { tokens: Record<string, string> }) => unknown) =>
    selector({
      tokens: {
        text: '#fff', textSec: '#ccc', muted: '#999',
        bg: '#000', surface: '#111', border: '#333',
        blue: '#3D8AD6', blueDim: '#0a1a2a',
        gold: '#e0b82e', goldDim: '#332a0a',
        red: '#f87171',
      },
    }),
}))

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: {
    empresas: Array<{ id: number; nome: string }>
    user: { id: number; nome: string; email: string; is_admin: boolean } | null
  }) => unknown) => selector({
    empresas: [{ id: 1, nome: 'Empresa Teste' }],
    user: { id: 99, nome: 'Admin', email: 'admin@x.com', is_admin: true },
  }),
}))

vi.mock('@/hooks/useRequireAdmin', () => ({
  useRequireAdmin: () => 'allowed' as const,
}))

vi.mock('@/components/AccessDenied', () => ({
  AccessDenied: () => <div>access denied</div>,
}))

vi.mock('@/components/admin/AdminSubNav', () => ({
  AdminSubNav: () => <nav>subnav</nav>,
}))

vi.mock('@/components/admin/DeleteUsuarioModal', () => ({
  DeleteUsuarioModal: () => null,
}))

// Hook mocks: useAdminUsuarios devolve 2 users soft-deletados; restaurarUsuario
// e controlado por promessas deferidas para podermos sincronizar os spinners.

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
const refetchMock = vi.fn()

vi.mock('@/hooks/api/useAdminPerfis', () => ({
  useAdminUsuarios: () => ({
    data: [
      { id: 1, nome: 'Ana', email: 'ana@x.com', ativo: true, is_admin: false, deleted_at: '2026-05-24T10:00:00Z' },
      { id: 2, nome: 'Bruno', email: 'bruno@x.com', ativo: true, is_admin: false, deleted_at: '2026-05-24T11:00:00Z' },
    ],
    loading: false,
    error: null,
    refetch: refetchMock,
  }),
  useAdminPerfis: () => ({ data: [], loading: false, error: null, refetch: vi.fn() }),
  useAdminUsuarioAtribuicoes: () => ({ data: [], loading: false, error: null, refetch: vi.fn() }),
  criarAtribuicaoPerfil: vi.fn(),
  removerAtribuicaoPerfil: vi.fn(),
  restaurarUsuario: (id: number) => {
    const d = makeDeferred()
    restoreDeferreds.set(id, d)
    return d.promise
  },
}))


beforeEach(() => {
  restoreDeferreds.clear()
  refetchMock.mockReset()
})


describe('AdminUsuariosPage — race condition restore', () => {
  it('permite restaurar 2 usuarios em paralelo (ambos spinners visiveis ao mesmo tempo)', async () => {
    render(<AdminUsuariosPage />)

    const btnAna = screen.getByRole('button', { name: /Restaurar Ana/i })
    const btnBruno = screen.getByRole('button', { name: /Restaurar Bruno/i })

    // Clica Ana primeiro
    await act(async () => {
      fireEvent.click(btnAna)
    })
    expect(btnAna.hasAttribute('disabled')).toBe(true)
    expect(btnBruno.hasAttribute('disabled')).toBe(false)

    // Clica Bruno enquanto Ana ainda esta processando
    await act(async () => {
      fireEvent.click(btnBruno)
    })
    expect(btnAna.hasAttribute('disabled')).toBe(true) // ← antes virava false
    expect(btnBruno.hasAttribute('disabled')).toBe(true)

    // Resolve Ana primeiro
    await act(async () => {
      restoreDeferreds.get(1)!.resolve()
      await restoreDeferreds.get(1)!.promise
    })
    expect(btnAna.hasAttribute('disabled')).toBe(false)
    expect(btnBruno.hasAttribute('disabled')).toBe(true) // ← Bruno mantem spinner

    // Resolve Bruno
    await act(async () => {
      restoreDeferreds.get(2)!.resolve()
      await restoreDeferreds.get(2)!.promise
    })
    expect(btnBruno.hasAttribute('disabled')).toBe(false)

    // Refetch foi chamado uma vez por restore (2x total)
    expect(refetchMock).toHaveBeenCalledTimes(2)
  })

  it('erro em um restore nao afeta o spinner do outro em paralelo', async () => {
    render(<AdminUsuariosPage />)

    const btnAna = screen.getByRole('button', { name: /Restaurar Ana/i })
    const btnBruno = screen.getByRole('button', { name: /Restaurar Bruno/i })

    await act(async () => {
      fireEvent.click(btnAna)
    })
    await act(async () => {
      fireEvent.click(btnBruno)
    })

    // Ana falha; Bruno deve manter spinner ate ele mesmo terminar
    await act(async () => {
      restoreDeferreds.get(1)!.reject({
        response: { data: { detail: 'erro forcado' } },
      })
      // flush microtasks
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(btnAna.hasAttribute('disabled')).toBe(false)
    expect(btnBruno.hasAttribute('disabled')).toBe(true)
    expect(screen.getByRole('alert')).toBeTruthy()

    // Resolve Bruno OK
    await act(async () => {
      restoreDeferreds.get(2)!.resolve()
      await restoreDeferreds.get(2)!.promise
    })
    expect(btnBruno.hasAttribute('disabled')).toBe(false)
  })
})
