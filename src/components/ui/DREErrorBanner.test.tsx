/* @vitest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { DREErrorBanner } from './DREErrorBanner'

/**
 * DREErrorBanner — torna visivel a falha do `/dre` que, pos-Fase 5.G (PR-6,
 * remocao do calculo DRE local), apareceria como ZEROS silenciosos nas telas
 * (Dashboard / Caixa / DRE-mensal / Analise IA). Sem fallback local, um erro
 * do backend precisa ser explicito + recuperavel (retry).
 *
 * Sem jest-dom no setup do projeto → matchers puros (firstChild/getByRole).
 */

vi.mock('@/store/themeStore', () => ({
  useThemeStore: (selector: (s: { tokens: Record<string, string> }) => unknown) =>
    selector({
      tokens: {
        red: '#F18888',
        redDim: 'rgba(241,136,136,0.14)',
        textSec: 'rgba(255,255,255,0.70)',
      },
    }),
}))

describe('DREErrorBanner', () => {
  it('renderiza null quando nao ha erro', () => {
    const { container } = render(<DREErrorBanner error={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('renderiza null para string vazia (sem erro)', () => {
    const { container } = render(<DREErrorBanner error="" />)
    expect(container.firstChild).toBeNull()
  })

  it('renderiza um alert com headline e a mensagem do backend', () => {
    render(<DREErrorBanner error="HTTP 500 — backend indisponível" />)
    const alert = screen.getByRole('alert')
    expect(alert).toBeTruthy()
    expect(screen.getByText('Não foi possível carregar o DRE')).toBeTruthy()
    // a mensagem do hook aparece junto do aviso de zeros
    expect(screen.getByText(/HTTP 500 — backend indisponível/)).toBeTruthy()
  })

  it('mostra botao de retry e chama onRetry no clique', () => {
    const onRetry = vi.fn()
    render(<DREErrorBanner error="erro" onRetry={onRetry} />)
    fireEvent.click(screen.getByRole('button', { name: /tentar novamente/i }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('nao renderiza botao quando onRetry e ausente', () => {
    render(<DREErrorBanner error="erro" />)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('aplica a className de espacamento recebida', () => {
    render(<DREErrorBanner error="erro" className="mx-5 mt-3" />)
    const alert = screen.getByRole('alert')
    expect(alert.className).toContain('mx-5')
    expect(alert.className).toContain('mt-3')
  })
})
