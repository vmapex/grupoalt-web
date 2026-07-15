/* @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import FechamentoPage from './page'

/**
 * Página de entrada do Motor de Fechamento via SSO (integração 2026-07).
 *
 * Cobre o padrão anti popup-blocker (window.open SÍNCRONO no clique,
 * URL setada depois do await) e a apresentação dos gates do backend:
 * 409 (sem acesso — pedir ao admin), 403 (sem permissão), 503
 * (integração desconfigurada) e erro genérico.
 */

const getSsoTicketMock = vi.fn()

vi.mock('@/hooks/api/useMotorAcesso', () => ({
  getSsoTicket: (...args: unknown[]) => getSsoTicketMock(...args),
}))

interface FakeWindow {
  location: { href: string }
  close: ReturnType<typeof vi.fn>
}

let janela: FakeWindow

beforeEach(() => {
  getSsoTicketMock.mockReset()
  janela = { location: { href: '' }, close: vi.fn() }
  vi.stubGlobal('open', vi.fn(() => janela))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('FechamentoPage — SSO', () => {
  it('abre a aba SINCRONAMENTE no clique e navega quando o ticket chega', async () => {
    getSsoTicketMock.mockResolvedValueOnce({
      url: 'https://motor.test/auth/sso?ticket=abc',
      expira_em_segundos: 60,
    })
    render(<FechamentoPage />)

    fireEvent.click(screen.getByRole('button', { name: /abrir motor de fechamento/i }))

    // window.open já foi chamado ANTES do await resolver (anti popup-blocker)
    expect(window.open).toHaveBeenCalledWith('', '_blank')

    await waitFor(() => {
      expect(janela.location.href).toBe('https://motor.test/auth/sso?ticket=abc')
    })
    expect(janela.close).not.toHaveBeenCalled()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('409 (sem acesso provisionado): fecha a aba e orienta pedir ao admin', async () => {
    getSsoTicketMock.mockRejectedValueOnce({
      response: { status: 409, data: { detail: 'Usuário sem acesso provisionado ao Motor.' } },
    })
    render(<FechamentoPage />)
    fireEvent.click(screen.getByRole('button', { name: /abrir motor/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toMatch(/sem acesso provisionado/i)
    })
    expect(janela.close).toHaveBeenCalled()
  })

  it('403: mensagem de permissão', async () => {
    getSsoTicketMock.mockRejectedValueOnce({ response: { status: 403 } })
    render(<FechamentoPage />)
    fireEvent.click(screen.getByRole('button', { name: /abrir motor/i }))
    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toMatch(/permissão/i)
    })
  })

  it('503: integração desconfigurada', async () => {
    getSsoTicketMock.mockRejectedValueOnce({ response: { status: 503 } })
    render(<FechamentoPage />)
    fireEvent.click(screen.getByRole('button', { name: /abrir motor/i }))
    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toMatch(/não está configurada/i)
    })
  })

  it('erro de rede: banner de erro genérico', async () => {
    getSsoTicketMock.mockRejectedValueOnce(new Error('Network Error'))
    render(<FechamentoPage />)
    fireEvent.click(screen.getByRole('button', { name: /abrir motor/i }))
    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toMatch(/falha ao conectar/i)
    })
    expect(janela.close).toHaveBeenCalled()
  })

  it('popup bloqueado (open retorna null): usa a própria aba como fallback', async () => {
    vi.stubGlobal('open', vi.fn(() => null))
    const originalLocation = window.location
    // jsdom não permite atribuir location.href diretamente sem stub
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...originalLocation, href: 'http://portal.test/portal/fechamento' },
    })
    getSsoTicketMock.mockResolvedValueOnce({
      url: 'https://motor.test/auth/sso?ticket=xyz', expira_em_segundos: 60,
    })
    render(<FechamentoPage />)
    fireEvent.click(screen.getByRole('button', { name: /abrir motor/i }))
    await waitFor(() => {
      expect(window.location.href).toBe('https://motor.test/auth/sso?ticket=xyz')
    })
    Object.defineProperty(window, 'location', { writable: true, value: originalLocation })
  })
})
