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
 *
 * Lifecycle de usuarios (restaurar + apagar definitivo):
 *   - toggle "Mostrar usuarios deletados" (default oculta, client-side)
 *   - deletado mostra Restaurar + Apagar definitivo; ativo mostra Excluir
 *   - guard de auto-delete (sem botoes de acao para o proprio admin)
 *   - restore com spinner, toast de sucesso/erro e reload
 *   - hard delete via ConfirmDeleteModal (alvo, onConfirm, mapa de erros 409)
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

vi.mock('@/hooks/api/useAdminEmpresas', () => ({
  restoreEmpresa: (id: number) => {
    const d = makeDeferred()
    restoreDeferreds.set(id, d)
    return d.promise
  },
}))

// ── Mocks do lifecycle de usuarios ─────────────────────────────────────────

const usuarioRestoreDeferreds = new Map<number, Deferred>()
const permanentDeleteMock = vi.fn()

vi.mock('@/hooks/api/useAdminPerfis', () => ({
  restaurarUsuario: (id: number) => {
    const d = makeDeferred()
    usuarioRestoreDeferreds.set(id, d)
    return d.promise
  },
  permanentDeleteUsuario: (...args: unknown[]) => permanentDeleteMock(...args),
}))

// Admin logado tem id 999 — usado pelo guard de auto-delete da pagina.
vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: { user: { id: number } }) => unknown) =>
    selector({ user: { id: 999 } }),
}))

const deleteUsuarioModalProps = vi.fn()
vi.mock('@/components/admin/DeleteUsuarioModal', () => ({
  DeleteUsuarioModal: (props: { usuario: { nome: string } | null }) => {
    deleteUsuarioModalProps(props)
    if (!props.usuario) return null
    return <div data-testid="delete-usuario-modal">{props.usuario.nome}</div>
  },
}))

interface ConfirmDeleteModalMockProps {
  target: { nome: string } | null
  title: string
  errorMessages?: Record<number, string>
  onConfirm: (...args: unknown[]) => unknown
  onSuccess: () => void
}

const confirmDeleteModalProps = vi.fn()
vi.mock('@/components/admin/ConfirmDeleteModal', () => ({
  ConfirmDeleteModal: (props: ConfirmDeleteModalMockProps) => {
    confirmDeleteModalProps(props)
    if (!props.target) return null
    return (
      <div data-testid="confirm-delete-modal">
        <span>{props.target.nome}</span>
        <button onClick={props.onSuccess}>confirma-hard-delete</button>
      </div>
    )
  },
}))


beforeEach(() => {
  restoreDeferreds.clear()
  usuarioRestoreDeferreds.clear()
  permanentDeleteMock.mockReset()
  deleteUsuarioModalProps.mockReset()
  confirmDeleteModalProps.mockReset()
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


// ── Lifecycle de usuarios (restaurar + apagar definitivo) ──────────────────

const baseUser = { ativo: true, is_admin: false, empresas: [], permissoes: [], unidades: [] }

describe('AdminPage portal — lifecycle de usuarios', () => {
  beforeEach(() => {
    apiGetMock.mockImplementation((url: string) => {
      if (url === '/gestao/usuarios') {
        return Promise.resolve({
          data: [
            { ...baseUser, id: 1, nome: 'Ana Ativa', email: 'ana@x.com', deleted_at: null },
            { ...baseUser, id: 2, nome: 'Bruno Deletado', email: 'bruno@x.com', deleted_at: '2026-06-01T12:00:00Z' },
            { ...baseUser, id: 999, nome: 'Admin Logado', email: 'admin@x.com', is_admin: true, deleted_at: null },
          ],
        })
      }
      if (url === '/admin/empresas') return Promise.resolve({ data: [] })
      return Promise.resolve({ data: [] })
    })
  })

  async function renderComUsuarios() {
    render(<AdminPage />)
    await screen.findByText('Ana Ativa')
  }

  async function ligarToggleDeletados() {
    const toggle = screen.getByRole('checkbox', { name: /Mostrar usuários deletados \(1\)/i })
    await act(async () => {
      fireEvent.click(toggle)
    })
  }

  it('oculta deletados por padrao; toggle com contador os exibe com badge', async () => {
    await renderComUsuarios()

    expect(screen.queryByText('Bruno Deletado')).toBeNull()

    await ligarToggleDeletados()

    expect(screen.getByText('Bruno Deletado')).toBeTruthy()
    expect(screen.getByText(/^DELETADO/)).toBeTruthy()
  })

  it('deletado mostra Restaurar + Apagar definitivo; ativo mostra so Excluir', async () => {
    await renderComUsuarios()
    await ligarToggleDeletados()

    expect(screen.getByRole('button', { name: /Restaurar Bruno Deletado/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Apagar Bruno Deletado em definitivo/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Excluir Ana Ativa/i })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /^Excluir Bruno Deletado$/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /Restaurar Ana Ativa/i })).toBeNull()
  })

  it('guard de auto-delete: nenhum botao de acao para o proprio admin', async () => {
    await renderComUsuarios()

    expect(screen.getByText('Admin Logado')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Excluir Admin Logado/i })).toBeNull()
  })

  it('Restaurar: spinner enquanto pende, toast de sucesso e reload da lista', async () => {
    await renderComUsuarios()
    await ligarToggleDeletados()

    const btn = screen.getByRole('button', { name: /Restaurar Bruno Deletado/i })
    await act(async () => {
      fireEvent.click(btn)
    })
    expect(btn.hasAttribute('disabled')).toBe(true)

    apiGetMock.mockClear()
    await act(async () => {
      usuarioRestoreDeferreds.get(2)!.resolve()
      await usuarioRestoreDeferreds.get(2)!.promise
    })

    expect(screen.getByText(/Usuário "Bruno Deletado" restaurado/i)).toBeTruthy()
    expect(apiGetMock).toHaveBeenCalledWith('/gestao/usuarios')
  })

  it('falha no restore mostra toast de erro com prefixo e libera o botao', async () => {
    await renderComUsuarios()
    await ligarToggleDeletados()

    const btn = screen.getByRole('button', { name: /Restaurar Bruno Deletado/i })
    await act(async () => {
      fireEvent.click(btn)
    })

    await act(async () => {
      usuarioRestoreDeferreds.get(2)!.reject({
        response: { status: 409, data: { detail: 'Usuario nao esta deletado' } },
      })
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(screen.getByText(/Falha ao restaurar "Bruno Deletado"/i)).toBeTruthy()
    expect(btn.hasAttribute('disabled')).toBe(false)
  })

  it('Apagar definitivo: abre ConfirmDeleteModal com alvo, onConfirm e mapa 409; sucesso mostra toast', async () => {
    await renderComUsuarios()
    await ligarToggleDeletados()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Apagar Bruno Deletado em definitivo/i }))
    })

    const modal = screen.getByTestId('confirm-delete-modal')
    expect(modal.textContent).toContain('Bruno Deletado')

    const props = confirmDeleteModalProps.mock.calls.at(-1)![0] as ConfirmDeleteModalMockProps
    expect(props.title).toMatch(/definitivo/i)
    expect(props.errorMessages?.[409]).toMatch(/soft-delete/i)

    // onConfirm da pagina e o permanentDeleteUsuario do hook
    props.onConfirm(2, 'senha', 'Bruno Deletado')
    expect(permanentDeleteMock).toHaveBeenCalledWith(2, 'senha', 'Bruno Deletado')

    await act(async () => {
      fireEvent.click(screen.getByText('confirma-hard-delete'))
    })
    expect(screen.getByText(/apagado em definitivo/i)).toBeTruthy()
  })

  it('Excluir (soft) abre DeleteUsuarioModal com o alvo', async () => {
    await renderComUsuarios()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Excluir Ana Ativa/i }))
    })

    expect(screen.getByTestId('delete-usuario-modal').textContent).toContain('Ana Ativa')
  })
})
