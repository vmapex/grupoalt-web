/* @vitest-environment jsdom */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

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

const permanentDeleteEmpresaMock = vi.fn()
const updateEmpresaDadosMock = vi.fn()
const updateEmpresaLogosMock = vi.fn()

vi.mock('@/hooks/api/useAdminEmpresas', () => ({
  restoreEmpresa: (id: number) => {
    const d = makeDeferred()
    restoreDeferreds.set(id, d)
    return d.promise
  },
  permanentDeleteEmpresa: (...args: unknown[]) => permanentDeleteEmpresaMock(...args),
  updateEmpresaDados: (...args: unknown[]) => updateEmpresaDadosMock(...args),
  updateEmpresaLogos: (...args: unknown[]) => updateEmpresaLogosMock(...args),
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

// ── Stubs das seções de gestão migradas do BI (2026-07-15) ──────────────────
// Cada seção tem teste próprio (PerfisRBACSection.test / MotorAcessoSection
// .test); aqui só interessa QUANDO a página as renderiza e com quais props.

const perfisSectionProps = vi.fn()
vi.mock('@/components/admin/PerfisRBACSection', () => ({
  PerfisRBACSection: (props: { usuarioId: number; isAdmin: boolean }) => {
    perfisSectionProps(props)
    return <div data-testid="perfis-rbac-section">perfis-{props.usuarioId}</div>
  },
}))

const motorSectionProps = vi.fn()
vi.mock('@/components/admin/MotorAcessoSection', () => ({
  MotorAcessoSection: (props: { usuarioId: number; usuarioNome: string }) => {
    motorSectionProps(props)
    return <div data-testid="motor-acesso-section">motor-{props.usuarioId}</div>
  },
}))

interface ConfirmDeleteModalMockProps {
  target: { nome: string } | null
  title: string
  idPrefix: string
  confirmLabel?: string
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
  permanentDeleteEmpresaMock.mockReset()
  updateEmpresaDadosMock.mockReset()
  updateEmpresaLogosMock.mockReset()
  deleteUsuarioModalProps.mockReset()
  confirmDeleteModalProps.mockReset()
  perfisSectionProps.mockReset()
  motorSectionProps.mockReset()
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
    // findByRole (com retry) — getByRole sincrono flakava no CI: o waitFor
    // acima so garante a CHAMADA a API, nao o re-render pos-loading que
    // monta a barra de abas (falhou no run 29280030222 do PR #184).
    const tabEmpresas = await screen.findByRole('button', { name: /^Empresas$/i })
    await act(async () => {
      fireEvent.click(tabEmpresas)
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

    // findByRole (com retry) — getByRole sincrono flakava no CI: o waitFor
    // acima so garante a CHAMADA a API, nao o re-render pos-loading que
    // monta a barra de abas (falhou no run 29280030222 do PR #184).
    const tabEmpresas = await screen.findByRole('button', { name: /^Empresas$/i })
    await act(async () => {
      fireEvent.click(tabEmpresas)
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
    expect(screen.queryByRole('button', { name: /Apagar Ana Ativa em definitivo/i })).toBeNull()
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

    // Filtra por idPrefix: a pagina agora renderiza DOIS ConfirmDeleteModal
    // (usuario + empresa) — o .at(-1) cru pegava o da empresa.
    const usuarioCalls = confirmDeleteModalProps.mock.calls
      .map((c) => c[0] as ConfirmDeleteModalMockProps)
      .filter((p) => p.idPrefix === 'permanent-delete-usuario' && p.target)
    const props = usuarioCalls[usuarioCalls.length - 1]
    expect(props.title).toMatch(/definitivo/i)
    expect(props.idPrefix).toBe('permanent-delete-usuario')
    expect(props.confirmLabel).toBe('Apagar definitivo')
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


// ── Hard delete de EMPRESA (paridade com usuarios; follow-up TESTE/SMOKE) ───

describe('AdminPage portal — apagar empresa em definitivo', () => {
  it('empresa soft-deletada mostra Restaurar + Apagar definitivo', async () => {
    render(<AdminPage />)
    const tabEmpresas = await screen.findByRole('button', { name: /^Empresas$/i })
    await act(async () => {
      fireEvent.click(tabEmpresas)
    })

    expect(await screen.findByRole('button', { name: /Restaurar Empresa Alfa/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Apagar Empresa Alfa em definitivo/i })).toBeTruthy()
  })

  it('clique abre ConfirmDeleteModal com alvo, onConfirm e mapa 409; sucesso mostra toast', async () => {
    render(<AdminPage />)
    const tabEmpresas = await screen.findByRole('button', { name: /^Empresas$/i })
    await act(async () => {
      fireEvent.click(tabEmpresas)
    })

    const btn = await screen.findByRole('button', { name: /Apagar Empresa Alfa em definitivo/i })
    await act(async () => {
      fireEvent.click(btn)
    })

    // Ultima chamada do mock com target preenchido e idPrefix de empresa
    const calls = confirmDeleteModalProps.mock.calls
      .map((c) => c[0] as ConfirmDeleteModalMockProps)
      .filter((p) => p.idPrefix === 'permanent-delete-empresa' && p.target)
    expect(calls.length).toBeGreaterThan(0)
    const props = calls[calls.length - 1]
    expect(props.target!.nome).toBe('Empresa Alfa')
    expect(props.title).toMatch(/definitivo/i)
    expect(props.confirmLabel).toBe('Apagar definitivo')
    expect(props.errorMessages?.[409]).toMatch(/soft-delete/i)

    // onConfirm do modal e o helper permanentDeleteEmpresa
    props.onConfirm(10, 'senha', 'Empresa Alfa')
    expect(permanentDeleteEmpresaMock).toHaveBeenCalledWith(10, 'senha', 'Empresa Alfa')

    // onSuccess mostra toast
    await act(async () => {
      props.onSuccess()
    })
    expect(screen.getByText(/apagada em definitivo/i)).toBeTruthy()
  })
})


// ── Gestão migrada do BI: Perfis RBAC + Acesso ao Motor (2026-07-15) ────────

describe('AdminPage portal — seções Perfis RBAC e Acesso ao Motor', () => {
  beforeEach(() => {
    apiGetMock.mockImplementation((url: string) => {
      if (url === '/gestao/usuarios') {
        return Promise.resolve({
          data: [
            { ...baseUser, id: 1, nome: 'Ana Ativa', email: 'ana@x.com', deleted_at: null },
            { ...baseUser, id: 2, nome: 'Bruno Deletado', email: 'bruno@x.com', deleted_at: '2026-06-01T12:00:00Z' },
          ],
        })
      }
      if (url === '/admin/empresas') {
        return Promise.resolve({
          data: [
            { id: 10, nome: 'Empresa Alfa', cnpj: null, deleted_at: null },
            { id: 20, nome: 'Empresa Beta', cnpj: null, deleted_at: '2026-05-24T11:00:00Z' },
          ],
        })
      }
      return Promise.resolve({ data: [] })
    })
  })

  it('expandir usuário ativo renderiza PerfisRBACSection (só empresas ativas) e MotorAcessoSection', async () => {
    render(<AdminPage />)
    await screen.findByText('Ana Ativa')

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Expandir Ana Ativa/i }))
    })

    expect(screen.getByTestId('perfis-rbac-section')).toBeTruthy()
    expect(screen.getByTestId('motor-acesso-section')).toBeTruthy()

    const perfisProps = perfisSectionProps.mock.calls.at(-1)![0]
    expect(perfisProps.usuarioId).toBe(1)
    expect(perfisProps.isAdmin).toBe(false)
    // Empresa soft-deletada não entra no dropdown de atribuição
    expect(perfisProps.empresas).toEqual([
      { id: 10, nome: 'Empresa Alfa', cnpj: null, deleted_at: null },
    ])

    const motorProps = motorSectionProps.mock.calls.at(-1)![0]
    expect(motorProps.usuarioId).toBe(1)
    expect(motorProps.usuarioNome).toBe('Ana Ativa')
  })

  it('usuário soft-deletado expandido NÃO renderiza as seções (restaurar antes)', async () => {
    render(<AdminPage />)
    await screen.findByText('Ana Ativa')

    await act(async () => {
      fireEvent.click(screen.getByRole('checkbox', { name: /Mostrar usuários deletados/i }))
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Expandir Bruno Deletado/i }))
    })

    expect(screen.queryByTestId('perfis-rbac-section')).toBeNull()
    expect(screen.queryByTestId('motor-acesso-section')).toBeNull()
  })

  it('busca por nome/email filtra a lista de usuários', async () => {
    render(<AdminPage />)
    await screen.findByText('Ana Ativa')

    const busca = screen.getByRole('searchbox', { name: /Buscar usuário por nome ou email/i })
    await act(async () => {
      fireEvent.change(busca, { target: { value: 'bruno@x.com' } })
    })
    // Bruno existe mas está oculto (deletado, toggle off) — lista fica vazia
    expect(screen.queryByText('Ana Ativa')).toBeNull()

    await act(async () => {
      fireEvent.change(busca, { target: { value: 'ana' } })
    })
    expect(screen.getByText('Ana Ativa')).toBeTruthy()
  })
})


// ── Convite por e-mail no cadastro + reenvio (2026-07-16) ───────────────────

describe('AdminPage portal — convite por e-mail', () => {
  beforeEach(() => {
    apiGetMock.mockImplementation((url: string) => {
      if (url === '/gestao/usuarios') {
        return Promise.resolve({
          data: [
            { ...baseUser, id: 1, nome: 'Ana Ativa', email: 'ana@x.com', deleted_at: null },
          ],
        })
      }
      return Promise.resolve({ data: [] })
    })
  })

  async function abrirModalNovoUsuario() {
    render(<AdminPage />)
    await screen.findByText('Ana Ativa')
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Novo Usuário/i }))
    })
  }

  it('padrão é convite: sem campo de senha, POST sem senha e toast de convite', async () => {
    apiPostMock.mockResolvedValue({
      data: { id: 9, nome: 'Novo User', email: 'novo@x.com', convite_enviado: true },
    })
    await abrirModalNovoUsuario()

    // Aviso do fluxo de convite visível; campo de senha oculto
    expect(screen.getByText(/convite por e-mail/i)).toBeTruthy()
    expect(screen.queryByPlaceholderText('••••••••')).toBeNull()

    fireEvent.change(screen.getByPlaceholderText('João Silva'), { target: { value: 'Novo User' } })
    fireEvent.change(screen.getByPlaceholderText('joao@grupoalt.com.br'), { target: { value: 'novo@x.com' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^Criar$/i }))
    })

    expect(apiPostMock).toHaveBeenCalledWith('/gestao/usuarios', {
      nome: 'Novo User', email: 'novo@x.com', is_admin: false,
    })
    expect(screen.getByText(/Convite enviado para novo@x.com/i)).toBeTruthy()
  })

  it('marcar "senha manual" mostra o campo e envia a senha no payload', async () => {
    apiPostMock.mockResolvedValue({
      data: { id: 9, nome: 'Manual User', email: 'manual@x.com', convite_enviado: false },
    })
    await abrirModalNovoUsuario()

    await act(async () => {
      fireEvent.click(screen.getByRole('checkbox', { name: /Definir senha manualmente/i }))
    })
    fireEvent.change(screen.getByPlaceholderText('João Silva'), { target: { value: 'Manual User' } })
    fireEvent.change(screen.getByPlaceholderText('joao@grupoalt.com.br'), { target: { value: 'manual@x.com' } })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'senha-manual-1' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^Criar$/i }))
    })

    expect(apiPostMock).toHaveBeenCalledWith('/gestao/usuarios', {
      nome: 'Manual User', email: 'manual@x.com', is_admin: false, senha: 'senha-manual-1',
    })
  })

  it('convite que falhou no envio mostra o aviso do backend', async () => {
    apiPostMock.mockResolvedValue({
      data: {
        id: 9, nome: 'X', email: 'x@x.com', convite_enviado: false,
        aviso: "Usuário criado, mas o e-mail de convite FALHOU. Use 'Reenviar convite' para tentar de novo.",
      },
    })
    await abrirModalNovoUsuario()
    fireEvent.change(screen.getByPlaceholderText('João Silva'), { target: { value: 'X' } })
    fireEvent.change(screen.getByPlaceholderText('joao@grupoalt.com.br'), { target: { value: 'x@x.com' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^Criar$/i }))
    })
    expect(screen.getByText(/convite FALHOU/i)).toBeTruthy()
  })

  it('Reenviar convite no detalhe expandido chama o endpoint e mostra toast', async () => {
    apiPostMock.mockResolvedValue({ data: { message: 'Convite enviado para ana@x.com' } })
    render(<AdminPage />)
    await screen.findByText('Ana Ativa')

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Expandir Ana Ativa/i }))
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Reenviar convite para Ana Ativa/i }))
    })

    expect(apiPostMock).toHaveBeenCalledWith('/gestao/usuarios/1/reenviar-convite')
    expect(screen.getByText(/Convite enviado para ana@x.com/i)).toBeTruthy()
  })
})


// ── Config de empresa na aba Empresas (F1 da unificação, 2026-07-17) ────────
// Dados cadastrais (fix do bug do saveEdit do BI: agora persiste via
// PATCH /admin/empresas/{id}), resync de extrato (testes portados do
// antigo /bi/financeiro/admin) e deep-link ?tab= dos redirects.

describe('AdminPage portal — config de empresa (F1 unificação)', () => {
  beforeEach(() => {
    apiGetMock.mockImplementation((url: string) => {
      if (url === '/gestao/usuarios') return Promise.resolve({ data: [] })
      if (url === '/admin/empresas') {
        return Promise.resolve({
          data: [
            {
              id: 30, nome: 'GRUPO ALT', cnpj: '00.000.000/0001-00',
              tem_credencial: true, deleted_at: null,
            },
          ],
        })
      }
      return Promise.resolve({ data: [] })
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  async function expandirEmpresa() {
    render(<AdminPage />)
    const tabEmpresas = await screen.findByRole('button', { name: /^Empresas$/i })
    await act(async () => {
      fireEvent.click(tabEmpresas)
    })
    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: /Expandir GRUPO ALT/i }))
    })
  }

  it('form de dados vem preenchido e Salvar persiste via PATCH + toast', async () => {
    updateEmpresaDadosMock.mockResolvedValue({})
    await expandirEmpresa()

    const nomeInput = screen.getByRole('textbox', { name: /Nome da empresa GRUPO ALT/i }) as HTMLInputElement
    const cnpjInput = screen.getByRole('textbox', { name: /CNPJ da empresa GRUPO ALT/i }) as HTMLInputElement
    expect(nomeInput.value).toBe('GRUPO ALT')
    expect(cnpjInput.value).toBe('00.000.000/0001-00')

    fireEvent.change(nomeInput, { target: { value: 'ALT MAX' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Salvar dados de GRUPO ALT/i }))
    })

    expect(updateEmpresaDadosMock).toHaveBeenCalledWith(30, {
      nome: 'ALT MAX', cnpj: '00.000.000/0001-00',
    })
    expect(screen.getByRole('alert').textContent).toMatch(/Empresa "ALT MAX" atualizada/)
  })

  it('nome vazio bloqueia o save com toast de erro e sem chamada', async () => {
    await expandirEmpresa()

    fireEvent.change(screen.getByRole('textbox', { name: /Nome da empresa GRUPO ALT/i }), {
      target: { value: '   ' },
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Salvar dados de GRUPO ALT/i }))
    })

    expect(updateEmpresaDadosMock).not.toHaveBeenCalled()
    expect(screen.getByRole('alert').textContent).toMatch(/obrigatório/i)
  })

  it('resync: confirm cancelado nao chama a API', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    await expandirEmpresa()

    fireEvent.click(screen.getByRole('button', { name: /Resync extrato GRUPO ALT/i }))
    expect(apiPostMock).not.toHaveBeenCalled()
  })

  it('resync confirmado: POST no endpoint certo + toast de sucesso com contadores', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    apiPostMock.mockResolvedValueOnce({
      data: { status: 'ok', deleted: 1113, lancamentos_synced: 5400 },
    })
    await expandirEmpresa()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Resync extrato GRUPO ALT/i }))
    })

    expect(apiPostMock).toHaveBeenCalledWith('/sync/empresas/30/resync-extrato')
    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toMatch(/1113 removidos/)
      expect(screen.getByRole('alert').textContent).toMatch(/5400 lançamentos/)
    })
  })

  it('resync com timeout do edge (504) mostra info de segundo plano, nao erro', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    apiPostMock.mockRejectedValueOnce({ response: { status: 504 } })
    await expandirEmpresa()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Resync extrato GRUPO ALT/i }))
    })

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toMatch(/segundo plano/)
    })
  })

  it('resync com erro real (403) mostra toast de falha com detail', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    apiPostMock.mockRejectedValueOnce({
      response: { status: 403, data: { detail: 'Sem permissão' } },
    })
    await expandirEmpresa()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Resync extrato GRUPO ALT/i }))
    })

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toMatch(/falha ao iniciar resync/i)
      expect(screen.getByRole('alert').textContent).toMatch(/Sem permissão/)
    })
  })

  it('deep-link ?tab=empresas abre direto na aba Empresas (redirect do BI)', async () => {
    window.history.replaceState({}, '', '/portal/admin?tab=empresas')
    try {
      render(<AdminPage />)
      // Conteúdo da aba Empresas visível sem clicar na aba
      expect(await screen.findByRole('button', { name: /Expandir GRUPO ALT/i })).toBeTruthy()
    } finally {
      window.history.replaceState({}, '', '/')
    }
  })
})
