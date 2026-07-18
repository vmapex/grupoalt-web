/* @vitest-environment jsdom */
import { describe, expect, it } from 'vitest'

import { filterNavSections, NAV_SECTIONS } from './Sidebar'
import { hasPermissionIn, type PermissoesEmpresa } from '@/store/permissoesStore'

/**
 * filterNavSections (2026-07-15) — gate POR ITEM da sidebar do portal.
 *
 * Contexto: a seção Indicadores era gateada só por `indicadores:ver`, e os
 * itens "Financeiro" (link pro BI inteiro) e "Controladoria" vazavam pra
 * perfil operacional. Agora esses itens exigem `financeiro:ver`.
 */

type Has = (modulo: string, acao: string) => boolean

const grants = (...perms: string[]): Has => {
  const set = new Set(perms)
  return (m, a) => set.has(`${m}:${a}`)
}

const labelsOf = (sections: ReturnType<typeof filterNavSections>) =>
  Object.fromEntries(sections.map((s) => [s.id, s.children.map((c) => c.label)]))

describe('filterNavSections', () => {
  it('admin vê tudo, incluindo Financeiro e Controladoria', () => {
    const vis = labelsOf(filterNavSections(NAV_SECTIONS, true, () => false))
    expect(vis.indicadores).toEqual(['Financeiro', 'Operações', 'Controladoria'])
  })

  it('perfil operacional (Thiago-like): Indicadores só com Operações — sem Financeiro/Controladoria', () => {
    const has = grants(
      'indicadores:ver', 'fechamento:ver', 'grupo:ver', 'documentos:ver',
    )
    const vis = labelsOf(filterNavSections(NAV_SECTIONS, false, has))
    expect(vis.indicadores).toEqual(['Operações'])
    expect(vis.motor).toEqual(['Motor Fechamento v2.0'])
  })

  it('perfil financeiro vê Financeiro e Controladoria', () => {
    const has = grants('indicadores:ver', 'financeiro:ver')
    const vis = labelsOf(filterNavSections(NAV_SECTIONS, false, has))
    expect(vis.indicadores).toEqual(['Financeiro', 'Operações', 'Controladoria'])
  })

  it('sem indicadores:ver a seção inteira some, mesmo com financeiro:ver', () => {
    const has = grants('financeiro:ver')
    const vis = labelsOf(filterNavSections(NAV_SECTIONS, false, has))
    expect(vis.indicadores).toBeUndefined()
  })

  it('seção sem modulo (Principal) sempre aparece', () => {
    const vis = labelsOf(filterNavSections(NAV_SECTIONS, false, () => false))
    expect(vis.principal).toEqual(['Início'])
  })

  it('seção que ficar sem itens visíveis some inteira', () => {
    // Seção sintética onde TODOS os itens têm require não atendido.
    const sintetica = [{
      id: 'x', label: 'X', modulo: 'indicadores',
      children: [{ label: 'Só Fin', href: '/x', require: 'financeiro:ver' as const }],
    }]
    const vis = filterNavSections(sintetica, false, grants('indicadores:ver'))
    expect(vis).toEqual([])
  })
})


/**
 * F2 da unificação (2026-07-17): o Sidebar passou a compor o filtro com
 * `hasPermissionIn` sobre as permissões RBAC EFETIVAS da empresa ativa
 * (permissoesStore ← GET /auth/me/permissoes/{id}), no lugar do
 * `hasPermissao` legado do authStore (que lia o /auth/me com vocabulário
 * 'visualizar' — inerte no backend). Estes testes exercitam a composição
 * exata usada no componente.
 */
describe('filterNavSections × hasPermissionIn (fonte RBAC)', () => {
  const rbacPerms = (perms: Array<[string, string]>, isAdminGlobal = false): PermissoesEmpresa => ({
    empresa_id: 1,
    is_admin_global: isAdminGlobal,
    exports_confidencial: false,
    perfis: [],
    permissoes: perms.map(([modulo, acao]) => ({ modulo, acao, empresa_id: 1 })),
    fetched_at: 0,
  })

  it('não-admin com financeiro:ver no RBAC vê "Financeiro" (bug latente do gate legado)', () => {
    const perms = rbacPerms([['indicadores', 'ver'], ['financeiro', 'ver']])
    const vis = labelsOf(filterNavSections(NAV_SECTIONS, false, (m, a) => hasPermissionIn(perms, m, a)))
    expect(vis.indicadores).toEqual(['Financeiro', 'Operações', 'Controladoria'])
  })

  it('perms undefined (fetch em voo) = fail-closed: só seções sem gate', () => {
    const vis = labelsOf(filterNavSections(NAV_SECTIONS, false, (m, a) => hasPermissionIn(undefined, m, a)))
    expect(Object.keys(vis)).toEqual(['principal'])
  })

  it('is_admin_global no RBAC libera tudo mesmo sem tuplas', () => {
    const perms = rbacPerms([], true)
    const vis = labelsOf(filterNavSections(NAV_SECTIONS, false, (m, a) => hasPermissionIn(perms, m, a)))
    expect(vis.indicadores).toEqual(['Financeiro', 'Operações', 'Controladoria'])
    expect(vis.grupo).toEqual(['Estrutura', 'Segmentação'])
  })
})
