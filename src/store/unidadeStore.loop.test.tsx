/* @vitest-environment jsdom */
import { render, screen } from '@testing-library/react'
import { describe, expect, it, beforeEach } from 'vitest'
import { useUnidadeStore, useProjetoIds } from './unidadeStore'

/**
 * Regressão do incidente de produção 2026-08-06: filtrar por unidade
 * derrubava a aba ("This page couldn't load") em TODAS as telas do BI.
 *
 * Causa: as páginas liam `useUnidadeStore((s) => s.getSelectedCodigos())`.
 * Esse seletor devolve `undefined` sem filtro (referência estável — por
 * isso o bug ficou escondido) e um ARRAY NOVO a cada chamada quando há
 * unidade selecionada. Zustand v5 usa `useSyncExternalStore`, que compara
 * o snapshot entre render e commit: referência sempre nova ⇒ re-render
 * infinito ⇒ "Maximum update depth exceeded" ⇒ renderer morre.
 *
 * `useProjetoIds` assina só estado bruto e deriva em `useMemo`.
 */

const PROJETOS = [
  { id: '1', nome: 'ARAGUAINA', codigo: '77' },
  { id: '2', nome: 'IMPERATRIZ', codigo: '88' },
  { id: '3', nome: 'SEM CODIGO', codigo: '' },
]

let renders = 0

function Consumidor() {
  renders++
  const projetoIds = useProjetoIds()
  // Estoura ANTES do limite do React para falhar com mensagem clara.
  if (renders > 50) throw new Error(`loop de render: ${renders} renders`)
  return <div data-testid="out">{projetoIds ? projetoIds.join(',') : 'TODAS'}</div>
}

beforeEach(() => {
  renders = 0
  useUnidadeStore.setState({ projetos: PROJETOS, selectedIds: [], loading: false })
})

describe('useProjetoIds — referência estável (anti-loop)', () => {
  it('COM filtro ativo: renderiza sem loop (o crash de 2026-08-06)', () => {
    useUnidadeStore.setState({ selectedIds: ['1'] })
    render(<Consumidor />)
    expect(screen.getByTestId('out').textContent).toBe('77')
    expect(renders).toBeLessThan(5)
  })

  it('múltiplas unidades: códigos na ordem dos projetos', () => {
    useUnidadeStore.setState({ selectedIds: ['2', '1'] })
    render(<Consumidor />)
    expect(screen.getByTestId('out').textContent).toBe('77,88')
    expect(renders).toBeLessThan(5)
  })

  it('sem filtro: undefined ("todas as unidades") — contrato preservado', () => {
    render(<Consumidor />)
    expect(screen.getByTestId('out').textContent).toBe('TODAS')
  })

  it('projeto sem código Omie é descartado (contrato do getSelectedCodigos)', () => {
    useUnidadeStore.setState({ selectedIds: ['3'] })
    render(<Consumidor />)
    expect(screen.getByTestId('out').textContent).toBe('')
  })

  it('re-render do pai não recria a referência (estabilidade real)', () => {
    useUnidadeStore.setState({ selectedIds: ['1'] })
    const vistos: Array<string[] | undefined> = []
    function Pai({ n }: { n: number }) {
      const ids = useProjetoIds()
      vistos.push(ids)
      return <span>{n}</span>
    }
    const { rerender } = render(<Pai n={1} />)
    rerender(<Pai n={2} />)
    rerender(<Pai n={3} />)
    expect(vistos).toHaveLength(3)
    // MESMA referência entre renders — é isso que quebrava o Zustand v5.
    expect(vistos[0]).toBe(vistos[1])
    expect(vistos[1]).toBe(vistos[2])
  })

  it('o seletor legado ainda serve para uso IMPERATIVO (fora do render)', () => {
    useUnidadeStore.setState({ selectedIds: ['1', '2'] })
    expect(useUnidadeStore.getState().getSelectedCodigos()).toEqual(['77', '88'])
  })
})
