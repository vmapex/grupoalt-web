import { describe, expect, it } from 'vitest'
import { buildCategoriaOpts } from './cpcrFiltros'
import type { ContaPagarReceber } from '@/lib/mocks/cpcrData'

/**
 * Opções do filtro de categoria da tela CP/CR (2026-08-07). Regras:
 * só categorias presentes nas linhas, deduplicadas por código, nome
 * resolvido pelo plano dinâmico (com o código como fallback) e ordem
 * alfabética pt-BR (acento não pode jogar "Água" pro fim).
 */

const linha = (cat: string): ContaPagarReceber =>
  ({ cat } as unknown as ContaPagarReceber)

const PLANO: Record<string, string> = {
  '2.01': 'Postos',
  '2.02': 'Agregados',
  '2.03': 'Água e esgoto',
  '2.04': 'Aluguel',
}
const getNome = (c: string) => PLANO[c] ?? ''

describe('buildCategoriaOpts', () => {
  it('só categorias presentes, sem duplicar, ordenadas por nome', () => {
    const opts = buildCategoriaOpts(
      [linha('2.01'), linha('2.02'), linha('2.01'), linha('2.02')],
      getNome,
    )
    expect(opts).toEqual([
      { codigo: '2.02', nome: 'Agregados' },
      { codigo: '2.01', nome: 'Postos' },
    ])
  })

  it('ordena com acento pelo locale pt-BR ("Água" antes de "Aluguel")', () => {
    const opts = buildCategoriaOpts([linha('2.04'), linha('2.03')], getNome)
    expect(opts.map((o) => o.nome)).toEqual(['Água e esgoto', 'Aluguel'])
  })

  it('categoria fora do plano cai no próprio código (não vira vazio)', () => {
    const opts = buildCategoriaOpts([linha('9.99')], getNome)
    expect(opts).toEqual([{ codigo: '9.99', nome: '9.99' }])
  })

  it('linha sem categoria é ignorada (não gera opção em branco)', () => {
    const opts = buildCategoriaOpts([linha(''), linha('2.01')], getNome)
    expect(opts).toEqual([{ codigo: '2.01', nome: 'Postos' }])
  })

  it('filtro facetado: base já filtrada por status só oferece o que existe', () => {
    // Cenário do usuário (2026-08-07): status "Atrasado" ativo. As opções
    // vêm das linhas que JÁ passaram por busca+status — categoria sem
    // atrasado não pode aparecer na lista.
    const atrasados = [linha('2.01')] // só Postos tem atrasado
    expect(buildCategoriaOpts(atrasados, getNome)).toEqual([
      { codigo: '2.01', nome: 'Postos' },
    ])
  })

  it('lista vazia devolve nenhuma opção', () => {
    expect(buildCategoriaOpts([], getNome)).toEqual([])
  })
})
