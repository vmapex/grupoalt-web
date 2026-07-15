/* @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { MotorAcessoSection } from './MotorAcessoSection'
import { useThemeStore } from '@/store/themeStore'

/**
 * Seção "Acesso ao Motor" do detalhe de usuário admin.
 * Cobre: 503 (integração off → linha informativa), conceder (cria),
 * adoção (vincular existente por email), revogar com confirm.
 */

const getMotorAcessoMock = vi.fn()
const concederMock = vi.fn()
const atualizarMock = vi.fn()
const revogarMock = vi.fn()

vi.mock('@/hooks/api/useMotorAcesso', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/hooks/api/useMotorAcesso')>()
  return {
    ...original,
    getMotorAcesso: (...a: unknown[]) => getMotorAcessoMock(...a),
    concederMotorAcesso: (...a: unknown[]) => concederMock(...a),
    atualizarMotorAcesso: (...a: unknown[]) => atualizarMock(...a),
    revogarMotorAcesso: (...a: unknown[]) => revogarMock(...a),
    useMotorUnidades: () => ({
      data: [{ id: 1, nome: 'Araguaína', cidade: 'Araguaína', uf: 'TO' }],
      loading: false,
      error: null,
      refetch: vi.fn(),
    }),
  }
})

const SEM_ACESSO = {
  provisionado: false, ativo: null, motor_user_id: null, perfil_motor: null,
  unidade_ids: null, motor_estado: null, motor_existente_por_email: null,
  perfil_sugerido: 'OPERADOR',
}

function renderSection() {
  const t = useThemeStore.getState().tokens
  return render(<MotorAcessoSection usuarioId={7} usuarioNome="Fulano" t={t} />)
}

beforeEach(() => {
  getMotorAcessoMock.mockReset()
  concederMock.mockReset()
  atualizarMock.mockReset()
  revogarMock.mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('MotorAcessoSection', () => {
  it('503: mostra "não configurada" e nenhum formulário', async () => {
    getMotorAcessoMock.mockRejectedValueOnce({ response: { status: 503 } })
    renderSection()
    await waitFor(() => {
      expect(screen.getByText(/não configurada/i)).toBeTruthy()
    })
    expect(screen.queryByRole('button', { name: /conceder/i })).toBeNull()
  })

  it('sem acesso: pré-seleciona perfil sugerido e concede com unidades marcadas', async () => {
    getMotorAcessoMock.mockResolvedValueOnce(SEM_ACESSO)
    concederMock.mockResolvedValueOnce({ ...SEM_ACESSO, provisionado: true, ativo: true })
    getMotorAcessoMock.mockResolvedValueOnce({
      ...SEM_ACESSO, provisionado: true, ativo: true, motor_user_id: 10,
      perfil_motor: 'OPERADOR', unidade_ids: [1],
    })
    renderSection()

    const select = await screen.findByLabelText<HTMLSelectElement>(/perfil no motor/i)
    expect(select.value).toBe('OPERADOR') // perfil_sugerido

    fireEvent.click(screen.getByRole('checkbox', { name: /araguaína/i }))
    fireEvent.click(screen.getByRole('button', { name: /conceder acesso/i }))

    await waitFor(() => {
      expect(concederMock).toHaveBeenCalledWith(7, 'OPERADOR', [1])
    })
    expect(await screen.findByText(/acesso ativo/i)).toBeTruthy()
  })

  it('adoção: usuário existente por email vira "Vincular usuário existente"', async () => {
    getMotorAcessoMock.mockResolvedValueOnce({
      ...SEM_ACESSO,
      motor_existente_por_email: {
        id: 42, nome: 'Fulano Motor', email: 'f@alt.co',
        perfil: 'EMISSOR_CTE', unidade_ids: [1], ativo: true,
      },
      perfil_sugerido: null,
    })
    renderSection()

    expect(await screen.findByText(/já existe usuário no motor/i)).toBeTruthy()
    const botao = screen.getByRole('button', { name: /vincular usuário existente/i })
    const select = screen.getByLabelText<HTMLSelectElement>(/perfil no motor/i)
    expect(select.value).toBe('EMISSOR_CTE') // herdado do existente

    concederMock.mockResolvedValueOnce({})
    getMotorAcessoMock.mockResolvedValueOnce({
      ...SEM_ACESSO, provisionado: true, ativo: true, motor_user_id: 42,
      perfil_motor: 'EMISSOR_CTE', unidade_ids: [1],
    })
    fireEvent.click(botao)
    await waitFor(() => {
      expect(concederMock).toHaveBeenCalledWith(7, 'EMISSOR_CTE', [1])
    })
  })

  it('revogar: exige confirm e chama a API', async () => {
    getMotorAcessoMock.mockResolvedValueOnce({
      ...SEM_ACESSO, provisionado: true, ativo: true, motor_user_id: 5,
      perfil_motor: 'ANALISTA', unidade_ids: [],
    })
    renderSection()
    const botao = await screen.findByRole('button', { name: /revogar acesso/i })

    vi.spyOn(window, 'confirm').mockReturnValueOnce(false)
    fireEvent.click(botao)
    expect(revogarMock).not.toHaveBeenCalled()

    vi.spyOn(window, 'confirm').mockReturnValueOnce(true)
    revogarMock.mockResolvedValueOnce(undefined)
    getMotorAcessoMock.mockResolvedValueOnce({
      ...SEM_ACESSO, provisionado: true, ativo: false, motor_user_id: 5,
      perfil_motor: 'ANALISTA', unidade_ids: [],
    })
    fireEvent.click(botao)
    await waitFor(() => {
      expect(revogarMock).toHaveBeenCalledWith(7)
    })
    expect(await screen.findByText(/acesso revogado/i)).toBeTruthy()
  })
})
