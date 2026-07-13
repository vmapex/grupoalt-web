/* @vitest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

/**
 * AnaliseIAView — guarda de robustez da Fase 5.G (PR-6).
 *
 * O backend `/dre` (via `useDRE`) e a fonte unica do DRE; nao ha mais
 * calculo local. A view usa `EMPTY_DRE` como guarda enquanto a resposta
 * nao chega, entao `dreBackend=null` NAO pode crashar (acessos diretos
 * `dre.RoB` etc.). E quando o `/dre` FALHA, o erro precisa ficar visivel
 * (DREErrorBanner) em vez de zeros silenciosos.
 *
 * Mocka todos os hooks de dados + ChatPanel (rede) e o themeStore; deixa
 * DREErrorBanner/GlowLine renderizarem de verdade (sao puros).
 */

// Resultado mutavel do useDRE — sobrescrito por teste antes do render.
let mockDre: { data: unknown; loading: boolean; error: string | null; refetch: () => void } = {
  data: null,
  loading: false,
  error: null,
  refetch: vi.fn(),
}

vi.mock('@/hooks/useDRE', () => ({
  useDRE: () => mockDre,
}))
vi.mock('@/hooks/api/useExtrato', () => ({ useExtrato: () => ({ data: null }) }))
vi.mock('@/hooks/api/useCPCR', () => ({
  useCPAll: () => ({ data: null }),
  useCRAll: () => ({ data: null }),
}))
vi.mock('@/hooks/api/useFluxo', () => ({ useFluxoCaixa: () => ({ data: null }) }))
vi.mock('@/hooks/useEmpresaId', () => ({ useEmpresaId: () => 1 }))
vi.mock('@/store/dateRangeStore', () => ({
  useDateRangeStore: (selector: (s: { from: string; to: string }) => unknown) =>
    selector({ from: '2026-06-01', to: '2026-06-30' }),
}))
vi.mock('@/store/themeStore', () => {
  // Proxy: qualquer token => cor placeholder; isDark => boolean real.
  const tokens = new Proxy({ isDark: true } as Record<string, unknown>, {
    get: (o, k) => (k in o ? o[k as string] : '#888'),
  })
  return {
    useThemeStore: (selector: (s: { tokens: Record<string, unknown> }) => unknown) =>
      selector({ tokens }),
  }
})
// ChatPanel faz chamadas de rede/uso — stub.
vi.mock('@/components/chat/ChatPanel', () => ({ ChatPanel: () => null }))

import { AnaliseIAView } from './AnaliseIAView'

describe('AnaliseIAView — guarda dreBackend=null / erro (Fase 5.G)', () => {
  beforeEach(() => {
    mockDre = { data: null, loading: false, error: null, refetch: vi.fn() }
  })

  it('renderiza sem crashar quando o DRE backend ainda nao respondeu (data=null)', () => {
    render(<AnaliseIAView />)
    // KPI label sempre presente — prova que EMPTY_DRE evitou o crash.
    expect(screen.getByText('Receita Bruta')).toBeTruthy()
    // Sem erro => sem banner.
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('mostra o banner de erro quando o /dre falha (nao deixa zeros mudos)', () => {
    const retry = vi.fn()
    mockDre = {
      data: null,
      loading: false,
      error: 'HTTP 500 — backend indisponível',
      refetch: retry,
    }
    render(<AnaliseIAView />)
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(screen.getByText(/HTTP 500/)).toBeTruthy()
    // A view continua renderizando (EMPTY_DRE) — KPI ainda presente.
    expect(screen.getByText('Receita Bruta')).toBeTruthy()
    // Integração consumidor→hook: "Tentar novamente" chama o refetch do useDRE
    // (não o refetch de outro hook). Fecha a regressão muda de wire errado.
    fireEvent.click(screen.getByRole('button', { name: /tentar novamente/i }))
    expect(retry).toHaveBeenCalledTimes(1)
  })
})
