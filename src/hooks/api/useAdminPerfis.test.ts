/* @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

import {
  useAdminUsuarios,
  deleteUsuario,
  restaurarUsuario,
  type AdminUsuarioListado,
} from './useAdminPerfis'

/**
 * F2 (2026-05-23) — testes dos hooks de admin de usuarios.
 *
 * Foco:
 *   - useAdminUsuarios({ includeDeleted }) passa `include_deleted=true`
 *     como query param quando ativado.
 *   - AdminUsuarioListado.deleted_at carrega ISO 8601 ou null.
 *   - deleteUsuario chama DELETE /admin/usuarios/{id} com body correto.
 *   - restaurarUsuario chama POST /admin/usuarios/{id}/restore.
 */


const apiGetMock = vi.fn()
const apiPostMock = vi.fn()
const apiDeleteMock = vi.fn()

vi.mock('@/lib/api', () => ({
  default: {
    get: (...args: unknown[]) => apiGetMock(...args),
    post: (...args: unknown[]) => apiPostMock(...args),
    delete: (...args: unknown[]) => apiDeleteMock(...args),
  },
}))


beforeEach(() => {
  apiGetMock.mockReset()
  apiPostMock.mockReset()
  apiDeleteMock.mockReset()
})


describe('useAdminUsuarios', () => {
  it('chama GET /admin/usuarios sem query params por padrao', async () => {
    apiGetMock.mockResolvedValueOnce({ data: [] })
    const { result } = renderHook(() => useAdminUsuarios())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(apiGetMock).toHaveBeenCalledWith('/admin/usuarios', expect.objectContaining({
      params: {},
    }))
  })

  it('chama GET /admin/usuarios?include_deleted=true quando includeDeleted=true', async () => {
    apiGetMock.mockResolvedValueOnce({ data: [] })
    const { result } = renderHook(() => useAdminUsuarios({ includeDeleted: true }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(apiGetMock).toHaveBeenCalledWith('/admin/usuarios', expect.objectContaining({
      params: { include_deleted: 'true' },
    }))
  })

  it('quando includeDeleted=false, NAO passa o param (igual ao default)', async () => {
    apiGetMock.mockResolvedValueOnce({ data: [] })
    const { result } = renderHook(() => useAdminUsuarios({ includeDeleted: false }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(apiGetMock).toHaveBeenCalledWith('/admin/usuarios', expect.objectContaining({
      params: {},
    }))
  })

  it('expoe deleted_at no tipo retornado', async () => {
    const usuarioAtivo: AdminUsuarioListado = {
      id: 1, nome: 'Ana', email: 'ana@x.com',
      ativo: true, is_admin: false, deleted_at: null,
    }
    const usuarioDeletado: AdminUsuarioListado = {
      id: 2, nome: 'Bruno', email: 'bruno@x.com',
      ativo: true, is_admin: false, deleted_at: '2026-05-23T10:00:00Z',
    }
    apiGetMock.mockResolvedValueOnce({ data: [usuarioAtivo, usuarioDeletado] })

    const { result } = renderHook(() => useAdminUsuarios({ includeDeleted: true }))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.data).toHaveLength(2)
    expect(result.current.data?.[0].deleted_at).toBeNull()
    expect(result.current.data?.[1].deleted_at).toBe('2026-05-23T10:00:00Z')
  })
})


describe('deleteUsuario', () => {
  it('chama DELETE /admin/usuarios/{id} com body senha_admin + nome_usuario', async () => {
    apiDeleteMock.mockResolvedValueOnce({ status: 204 })
    await deleteUsuario(42, 'minhaSenha', 'Maria da Silva')
    expect(apiDeleteMock).toHaveBeenCalledWith(
      '/admin/usuarios/42',
      { data: { senha_admin: 'minhaSenha', nome_usuario: 'Maria da Silva' } },
    )
  })

  it('propaga erro do backend (sem swallow)', async () => {
    const err = { response: { status: 403, data: { detail: 'Senha incorreta' } } }
    apiDeleteMock.mockRejectedValueOnce(err)
    await expect(deleteUsuario(1, 'x', 'Y')).rejects.toEqual(err)
  })
})


describe('restaurarUsuario', () => {
  it('chama POST /admin/usuarios/{id}/restore sem body', async () => {
    apiPostMock.mockResolvedValueOnce({ data: { message: 'Restaurado' } })
    await restaurarUsuario(42)
    expect(apiPostMock).toHaveBeenCalledWith('/admin/usuarios/42/restore')
  })

  it('propaga erro 409 (nao deletado)', async () => {
    const err = { response: { status: 409, data: { detail: 'Nao esta soft-deletado' } } }
    apiPostMock.mockRejectedValueOnce(err)
    await expect(restaurarUsuario(1)).rejects.toEqual(err)
  })

  it('propaga erro 404 (nao existe)', async () => {
    const err = { response: { status: 404, data: {} } }
    apiPostMock.mockRejectedValueOnce(err)
    await expect(restaurarUsuario(9999)).rejects.toEqual(err)
  })
})
