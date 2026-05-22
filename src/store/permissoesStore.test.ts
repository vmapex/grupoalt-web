import { describe, expect, it, beforeEach, vi } from 'vitest'
import {
  hasPermissionIn,
  usePermissoesStore,
  type PermissoesEmpresa,
} from './permissoesStore'

/**
 * Fase A PR 3 — testes do store de permissoes RBAC.
 *
 * Cobre:
 *   - `hasPermissionIn` helper puro: admin bypass, set vazio, lookup
 *   - Store `fetch`: cache hit/miss, idempotencia, refetch forca, error path
 *   - Reset limpa cache
 */

// Mock do api client (axios)
vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
  },
}))

import api from '@/lib/api'

const mockedGet = api.get as ReturnType<typeof vi.fn>


function mkResponse(overrides: Partial<PermissoesEmpresa> = {}): PermissoesEmpresa {
  return {
    empresa_id: 1,
    is_admin_global: false,
    exports_confidencial: false,
    perfis: [],
    permissoes: [
      { modulo: 'financeiro', acao: 'ver', empresa_id: 1 },
    ],
    fetched_at: 0,
    ...overrides,
  }
}


beforeEach(() => {
  usePermissoesStore.setState({ porEmpresa: {}, loading: {}, errors: {} })
  mockedGet.mockReset()
})


// ── hasPermissionIn (puro) ───────────────────────────────────────────────────


describe('hasPermissionIn', () => {
  it('retorna false quando perms undefined', () => {
    expect(hasPermissionIn(undefined, 'financeiro', 'ver')).toBe(false)
  })

  it('admin global bypassa qualquer (modulo, acao)', () => {
    const perms = mkResponse({ is_admin_global: true, permissoes: [] })
    expect(hasPermissionIn(perms, 'admin_empresas', 'editar')).toBe(true)
    expect(hasPermissionIn(perms, 'qualquer', 'coisa')).toBe(true)
  })

  it('lookup exato em permissoes', () => {
    const perms = mkResponse({
      permissoes: [
        { modulo: 'financeiro', acao: 'ver', empresa_id: 1 },
        { modulo: 'financeiro', acao: 'exportar', empresa_id: 1 },
      ],
    })
    expect(hasPermissionIn(perms, 'financeiro', 'ver')).toBe(true)
    expect(hasPermissionIn(perms, 'financeiro', 'exportar')).toBe(true)
    expect(hasPermissionIn(perms, 'financeiro', 'editar')).toBe(false)
    expect(hasPermissionIn(perms, 'fechamento', 'ver')).toBe(false)
  })

  it('set vazio retorna sempre false (excepto admin)', () => {
    const perms = mkResponse({ permissoes: [] })
    expect(hasPermissionIn(perms, 'financeiro', 'ver')).toBe(false)
  })
})


// ── Store: fetch ─────────────────────────────────────────────────────────────


describe('permissoesStore.fetch', () => {
  it('chama API e popula cache em sucesso', async () => {
    mockedGet.mockResolvedValueOnce({
      data: { ...mkResponse(), fetched_at: undefined },
    })
    await usePermissoesStore.getState().fetch(1)
    expect(mockedGet).toHaveBeenCalledWith('/auth/me/permissoes/1')
    const cached = usePermissoesStore.getState().porEmpresa[1]
    expect(cached).toBeDefined()
    expect(cached?.empresa_id).toBe(1)
    expect(cached?.fetched_at).toBeGreaterThan(0)
  })

  it('idempotente: segunda chamada com cache nao chama API', async () => {
    mockedGet.mockResolvedValueOnce({ data: mkResponse() })
    await usePermissoesStore.getState().fetch(1)
    await usePermissoesStore.getState().fetch(1)
    expect(mockedGet).toHaveBeenCalledTimes(1)
  })

  it('idempotente: chamada paralela enquanto loading nao chama API duas vezes', async () => {
    let resolveFn: (() => void) | null = null
    const block = new Promise<void>((r) => { resolveFn = r })
    mockedGet.mockImplementationOnce(async () => {
      await block
      return { data: mkResponse() }
    })

    const p1 = usePermissoesStore.getState().fetch(1)
    const p2 = usePermissoesStore.getState().fetch(1)
    // Libera o mock
    resolveFn!()
    await Promise.all([p1, p2])

    expect(mockedGet).toHaveBeenCalledTimes(1)
  })

  it('refetch forca nova chamada mesmo com cache', async () => {
    mockedGet.mockResolvedValueOnce({ data: mkResponse() })
    await usePermissoesStore.getState().fetch(1)
    expect(mockedGet).toHaveBeenCalledTimes(1)

    mockedGet.mockResolvedValueOnce({
      data: mkResponse({ permissoes: [{ modulo: 'orbit', acao: 'ver', empresa_id: 1 }] }),
    })
    await usePermissoesStore.getState().refetch(1)
    expect(mockedGet).toHaveBeenCalledTimes(2)
    const cached = usePermissoesStore.getState().porEmpresa[1]
    expect(cached?.permissoes[0].modulo).toBe('orbit')
  })

  it('em erro de API armazena mensagem em errors[]', async () => {
    mockedGet.mockRejectedValueOnce({
      response: { data: { detail: 'Sem acesso' } },
    })
    await usePermissoesStore.getState().fetch(1)
    expect(usePermissoesStore.getState().errors[1]).toBe('Sem acesso')
    expect(usePermissoesStore.getState().loading[1]).toBe(false)
    expect(usePermissoesStore.getState().porEmpresa[1]).toBeUndefined()
  })

  it('em erro sem response.detail, usa message', async () => {
    mockedGet.mockRejectedValueOnce(new Error('Network down'))
    await usePermissoesStore.getState().fetch(1)
    expect(usePermissoesStore.getState().errors[1]).toBe('Network down')
  })

  it('cacheia por empresa_id (multiplas empresas coexistem)', async () => {
    mockedGet.mockResolvedValueOnce({ data: mkResponse({ empresa_id: 1 }) })
    mockedGet.mockResolvedValueOnce({ data: mkResponse({ empresa_id: 2 }) })
    await usePermissoesStore.getState().fetch(1)
    await usePermissoesStore.getState().fetch(2)
    expect(usePermissoesStore.getState().porEmpresa[1]?.empresa_id).toBe(1)
    expect(usePermissoesStore.getState().porEmpresa[2]?.empresa_id).toBe(2)
  })

  it('reset limpa todo o cache', async () => {
    mockedGet.mockResolvedValueOnce({ data: mkResponse() })
    await usePermissoesStore.getState().fetch(1)
    expect(usePermissoesStore.getState().porEmpresa[1]).toBeDefined()
    usePermissoesStore.getState().reset()
    expect(usePermissoesStore.getState().porEmpresa).toEqual({})
    expect(usePermissoesStore.getState().loading).toEqual({})
    expect(usePermissoesStore.getState().errors).toEqual({})
  })
})
