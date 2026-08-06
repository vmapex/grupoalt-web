/* @vitest-environment jsdom */
import { renderHook, act } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { usePagedRows } from './usePagedRows'
import { useDebouncedValue } from './useDebouncedValue'

/**
 * Perf das tabelas grandes (CP/CR e Extrato, 2026-08-06). Invariantes:
 * só a fatia da página vai pro DOM; troca de conjunto (filtro/busca/
 * sort geram array NOVO) volta pra página 1; página nunca aponta fora
 * do total quando o conjunto encolhe.
 */

const rows = (n: number) => Array.from({ length: n }, (_, i) => i + 1)

describe('usePagedRows', () => {
  it('fatia a página corrente e navega', () => {
    // Identidade estável entre renders (as páginas reais memoizam o
    // conjunto) — inline aqui dispararia o reset a cada render.
    const estavel = rows(250)
    const { result } = renderHook(() => usePagedRows(estavel, 100))
    expect(result.current.paged).toHaveLength(100)
    expect(result.current.paged[0]).toBe(1)
    expect(result.current.totalPages).toBe(3)
    expect(result.current.total).toBe(250)

    act(() => result.current.setPage(2))
    expect(result.current.paged).toHaveLength(50)
    expect(result.current.paged[0]).toBe(201)
  })

  it('conjunto novo (novo filtro/sort) reseta para a página 1', () => {
    const { result, rerender } = renderHook(({ r }) => usePagedRows(r, 100), {
      initialProps: { r: rows(250) },
    })
    act(() => result.current.setPage(2))
    expect(result.current.page).toBe(2)

    rerender({ r: rows(250) }) // MESMO conteúdo, identidade nova — reseta
    expect(result.current.page).toBe(0)
  })

  it('conjunto que encolhe clampa a página (nunca fica vazia)', () => {
    const { result, rerender } = renderHook(({ r }) => usePagedRows(r, 100), {
      initialProps: { r: rows(500) },
    })
    act(() => result.current.setPage(4))
    // encolheu antes do effect de reset rodar — o clamp segura
    rerender({ r: rows(30) })
    expect(result.current.page).toBe(0)
    expect(result.current.paged).toHaveLength(30)
  })

  it('conjunto vazio: 1 página, fatia vazia', () => {
    const { result } = renderHook(() => usePagedRows([], 100))
    expect(result.current.totalPages).toBe(1)
    expect(result.current.paged).toEqual([])
  })
})

describe('useDebouncedValue', () => {
  it('só propaga depois do atraso e colapsa teclas em sequência', () => {
    vi.useFakeTimers()
    const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, 250), {
      initialProps: { v: 'a' },
    })
    rerender({ v: 'ab' })
    rerender({ v: 'abc' })
    expect(result.current).toBe('a')

    act(() => { vi.advanceTimersByTime(250) })
    expect(result.current).toBe('abc')
    vi.useRealTimers()
  })
})
