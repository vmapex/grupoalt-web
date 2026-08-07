/* ═══════════════════════════════════════════════════════════════
   Filtros da tela CP/CR — helpers puros.

   Filtro por categoria (2026-08-07): client-side, como busca e status —
   a tela já carrega o período inteiro (Step 13), então filtrar aqui faz
   KPIs, aging e rankings acompanharem pelo mesmo caminho.
   ═══════════════════════════════════════════════════════════════ */
import type { ContaPagarReceber } from '@/lib/mocks/cpcrData'

export interface CategoriaOpt {
  /** Código do plano de contas (valor do <option>). */
  codigo: string
  /** Descrição resolvida pelo plano dinâmico; cai no código se não houver. */
  nome: string
}

/**
 * Opções do filtro de categoria: só as categorias PRESENTES nas linhas
 * (não o plano inteiro — evita oferecer categoria que daria zero),
 * deduplicadas por código, com nome resolvido e ordem alfabética pt-BR
 * (acentos comparados corretamente: "Água" antes de "Aluguel").
 */
export function buildCategoriaOpts(
  rows: ContaPagarReceber[],
  getNome: (codigo: string) => string,
): CategoriaOpt[] {
  const vistos = new Map<string, string>()
  for (const r of rows) {
    if (!r.cat || vistos.has(r.cat)) continue
    vistos.set(r.cat, getNome(r.cat) || r.cat)
  }
  return [...vistos.entries()]
    .map(([codigo, nome]) => ({ codigo, nome }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
}
