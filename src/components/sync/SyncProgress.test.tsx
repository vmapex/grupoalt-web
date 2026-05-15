/* @vitest-environment jsdom */
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { SyncProgress } from './SyncProgress'
import type { SyncStatus } from '@/hooks/useSyncStatus'

// O componente lê tokens do themeStore (Zustand). Para o teste, mockamos
// um conjunto mínimo de tokens — não estamos validando cores, só shape.
vi.mock('@/store/themeStore', () => ({
  useThemeStore: (selector: (s: { tokens: Record<string, string | boolean> }) => unknown) =>
    selector({
      tokens: {
        bg: '#000', surface: '#111', surface3: '#222', border: '#333',
        text: '#fff', textSec: '#ccc', muted: '#999',
        amber: '#e0b82e', amberDim: '#221c0a',
        red: '#f18888', redDim: '#3a1818',
        green: '#84c487', greenDim: '#1a2e1c',
        gold: '#e0b82e', isDark: true,
      },
    }),
}))

function makeStatus(overrides: Partial<SyncStatus> = {}): SyncStatus {
  return {
    empresa_id: 1,
    in_progress: true,
    stage: 'lancamentos',
    stage_label: 'Extrato bancário',
    stages_completed: ['contas_correntes', 'unidades'],
    stages_failed: [],
    progress: { current: 3, total: 7 },
    started_at: new Date().toISOString(),
    last_completed_at: null,
    ultima_sync: null,
    registros: { lancamentos: 0, contas_pagar: 0, contas_receber: 0 },
    stage_labels: {
      contas_correntes: 'Contas bancárias',
      unidades: 'Unidades',
      lancamentos: 'Extrato bancário',
      cp: 'Contas a pagar',
      cr: 'Contas a receber',
      baixas: 'Pagamentos e recebimentos',
      categorias: 'Plano de contas',
    },
    ...overrides,
  }
}

describe('<SyncProgress />', () => {
  it('renderiza estado in_progress com label da etapa e progress bar', () => {
    render(<SyncProgress status={makeStatus()} />)
    expect(screen.getByText(/Sincronizando dados da Omie/)).toBeTruthy()
    expect(screen.getByText('Extrato bancário')).toBeTruthy()
    expect(screen.getByText(/etapa 3 de 7/)).toBeTruthy()
    const bar = screen.getByRole('progressbar')
    expect(bar.getAttribute('aria-valuenow')).toBe('43')
  })

  it('renderiza estado concluído sem barra de progresso', () => {
    const status = makeStatus({
      in_progress: false,
      stage: null,
      stage_label: null,
      progress: { current: 7, total: 7 },
      stages_completed: ['contas_correntes', 'unidades', 'lancamentos', 'cp', 'cr', 'baixas', 'categorias'],
    })
    render(<SyncProgress status={status} />)
    expect(screen.getByText(/Sincronização concluída$/)).toBeTruthy()
    expect(screen.queryByRole('progressbar')).toBeNull()
  })

  it('exibe seção de etapas com aviso quando há failures', () => {
    const status = makeStatus({
      in_progress: false,
      stage: null,
      stages_failed: [{ stage: 'categorias', error: 'timeout Omie' }],
    })
    render(<SyncProgress status={status} />)
    expect(screen.getByText(/Sincronização concluída com avisos/)).toBeTruthy()
    expect(screen.getByText('Plano de contas')).toBeTruthy()
    expect(screen.getByText(/timeout Omie/)).toBeTruthy()
  })

  it('exibe mensagem de timeout e botão de retry', () => {
    const onRetry = vi.fn()
    render(<SyncProgress status={makeStatus()} timedOut onRetry={onRetry} />)
    expect(screen.getByText(/demorou mais que o esperado/)).toBeTruthy()
    const btn = screen.getByRole('button', { name: /Tentar novamente/ })
    expect(btn).toBeTruthy()
    btn.click()
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('renderiza variant compact com label inline', () => {
    render(<SyncProgress status={makeStatus()} variant="compact" />)
    expect(screen.getByText(/Sincronizando: Extrato bancário/)).toBeTruthy()
    expect(screen.getByText('3/7')).toBeTruthy()
  })

  it('retorna null quando não há status, erro nem timeout', () => {
    const { container } = render(<SyncProgress status={null} />)
    expect(container.firstChild).toBeNull()
  })
})
