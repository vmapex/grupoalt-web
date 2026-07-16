/* @vitest-environment jsdom */
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import PortalHomePage from './page'
import { DASHBOARD_CARDS } from './dashboardCards'
import type { PermissoesEmpresa } from '@/store/permissoesStore'

/**
 * Fase B (2026-05-23) — testes do dashboard inicial gated.
 *
 * Cobre:
 *   - skeleton quando permissoes ainda nao carregaram
 *   - empty state quando user sem permissoes (nao-admin)
 *   - grid de cards respeitando PermissionGate
 *   - admin global ve todos os cards
 *   - saudacao usa primeiro nome do usuario
 */


vi.mock('@/store/themeStore', () => ({
  useThemeStore: (selector: (s: { tokens: Record<string, string> }) => unknown) =>
    selector({
      tokens: {
        bg: '#000', surface: '#111', surfaceElevated: '#0a0a0a',
        surfaceHover: '#222', border: '#333', borderGold: '#553',
        text: '#fff', textSec: '#ccc', muted: '#999',
        gold: '#e0b82e', goldDim: '#332a0a', goldGlow: 'none',
      },
    }),
}))

vi.mock('@/store/authStore', () => ({
  useAuthStore: (selector: (s: { user: { nome: string } | null }) => unknown) =>
    selector({ user: authUserMock }),
}))

vi.mock('@/store/empresaStore', () => ({
  useEmpresaStore: (selector: (s: { getActive: () => { nome: string } | null }) => unknown) =>
    selector({ getActive: () => empresaAtivaMock }),
}))

vi.mock('@/hooks/usePermission', () => ({
  usePermissoesAtivas: () => permsAtivasMock,
  usePermission: (modulo: string, acao: string) => {
    if (!permsAtivasMock) return false
    if (permsAtivasMock.is_admin_global) return true
    return permsAtivasMock.permissoes.some(
      (p) => p.modulo === modulo && p.acao === acao,
    )
  },
}))


let authUserMock: { nome: string; id: number; email: string; is_admin: boolean } | null = null
let empresaAtivaMock: { nome: string } | null = null
let permsAtivasMock: PermissoesEmpresa | undefined = undefined


function mkPerms(overrides: Partial<PermissoesEmpresa> = {}): PermissoesEmpresa {
  return {
    empresa_id: 1,
    is_admin_global: false,
    exports_confidencial: false,
    perfis: [],
    permissoes: [],
    fetched_at: Date.now(),
    ...overrides,
  }
}


beforeEach(() => {
  authUserMock = { nome: 'Vinicius Menezes', id: 1, email: 'v@x', is_admin: false }
  empresaAtivaMock = { nome: 'ALT Transportes' }
  permsAtivasMock = undefined
})


describe('<PortalHomePage />', () => {
  // ── Saudacao + chrome ──────────────────────────────────────────────────────

  it('mostra primeiro nome do usuario na saudacao', () => {
    permsAtivasMock = mkPerms({ is_admin_global: true })
    render(<PortalHomePage />)
    expect(screen.getByText('Olá, Vinicius')).toBeTruthy()
  })

  it('fallback "Bem-vindo" se user.nome ausente', () => {
    authUserMock = null
    permsAtivasMock = mkPerms({ is_admin_global: true })
    render(<PortalHomePage />)
    expect(screen.getByText('Olá, Bem-vindo')).toBeTruthy()
  })

  it('mostra nome da empresa ativa no header', () => {
    permsAtivasMock = mkPerms({ is_admin_global: true })
    render(<PortalHomePage />)
    expect(screen.getByText('ALT Transportes')).toBeTruthy()
  })

  it('fallback "Grupo ALT" se empresa ausente', () => {
    empresaAtivaMock = null
    permsAtivasMock = mkPerms({ is_admin_global: true })
    render(<PortalHomePage />)
    expect(screen.getByText('Grupo ALT')).toBeTruthy()
  })


  // ── Estado: loading ────────────────────────────────────────────────────────

  it('renderiza skeleton quando perms === undefined', () => {
    permsAtivasMock = undefined
    render(<PortalHomePage />)
    const section = screen.getByLabelText('Carregando módulos')
    expect(section).toBeTruthy()
    expect(section.getAttribute('aria-busy')).toBe('true')
  })


  // ── Estado: empty ──────────────────────────────────────────────────────────

  it('renderiza empty state quando user sem permissoes e nao-admin', () => {
    permsAtivasMock = mkPerms({ permissoes: [], is_admin_global: false })
    render(<PortalHomePage />)
    expect(screen.getByRole('status')).toBeTruthy()
    expect(screen.getByText(/Sem módulos disponíveis/i)).toBeTruthy()
    expect(screen.queryByLabelText('Módulos disponíveis')).toBeNull()
  })

  it('admin global SEM perfis seeded ainda ve grid (nao empty)', () => {
    permsAtivasMock = mkPerms({ permissoes: [], is_admin_global: true })
    render(<PortalHomePage />)
    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.getByLabelText('Módulos disponíveis')).toBeTruthy()
  })


  // ── Estado: grid com cards gated ───────────────────────────────────────────

  it('admin global ve TODOS os cards', () => {
    permsAtivasMock = mkPerms({ is_admin_global: true })
    render(<PortalHomePage />)
    for (const card of DASHBOARD_CARDS) {
      expect(screen.getByText(card.title)).toBeTruthy()
    }
  })

  it('Faturista (so fechamento) ve apenas card Motor de Fechamento', () => {
    permsAtivasMock = mkPerms({
      permissoes: [
        { modulo: 'fechamento', acao: 'ver', empresa_id: 1 },
        { modulo: 'fechamento', acao: 'editar', empresa_id: 1 },
      ],
    })
    render(<PortalHomePage />)
    expect(screen.getByText('Motor de Fechamento')).toBeTruthy()
    expect(screen.queryByText('BI Financeiro')).toBeNull()
    expect(screen.queryByText('Indicadores Operacionais')).toBeNull()
    expect(screen.queryByText('Controladoria')).toBeNull()
    expect(screen.queryByText('Estrutura do Grupo')).toBeNull()
    expect(screen.queryByText('Documentos')).toBeNull()
  })

  it('Financeiro (sem fechamento) ve cards Financeiro/Indicadores/Grupo/Orbit', () => {
    permsAtivasMock = mkPerms({
      permissoes: [
        { modulo: 'financeiro', acao: 'ver', empresa_id: 1 },
        { modulo: 'financeiro', acao: 'editar', empresa_id: 1 },
        { modulo: 'financeiro', acao: 'exportar', empresa_id: 1 },
        { modulo: 'indicadores', acao: 'ver', empresa_id: 1 },
        { modulo: 'grupo', acao: 'ver', empresa_id: 1 },
        { modulo: 'orbit', acao: 'ver', empresa_id: 1 },
      ],
    })
    render(<PortalHomePage />)
    expect(screen.getByText('BI Financeiro')).toBeTruthy()
    // indicadores:ver -> Operacionais; Controladoria exige financeiro:ver
    // (2026-07-15) e este perfil tem os dois.
    expect(screen.getByText('Indicadores Operacionais')).toBeTruthy()
    expect(screen.getByText('Controladoria')).toBeTruthy()
    expect(screen.getByText('Estrutura do Grupo')).toBeTruthy()
    // sem fechamento
    expect(screen.queryByText('Motor de Fechamento')).toBeNull()
    // sem documentos
    expect(screen.queryByText('Documentos')).toBeNull()
  })

  it('Operacional (indicadores:ver SEM financeiro:ver) NAO ve Controladoria', () => {
    // Ressalva da validação 2026-07-15: Controladoria expõe visão
    // financeira — perfil operacional vê só Indicadores Operacionais.
    permsAtivasMock = mkPerms({
      permissoes: [
        { modulo: 'fechamento', acao: 'ver', empresa_id: 1 },
        { modulo: 'indicadores', acao: 'ver', empresa_id: 1 },
      ],
    })
    render(<PortalHomePage />)
    expect(screen.getByText('Indicadores Operacionais')).toBeTruthy()
    expect(screen.queryByText('Controladoria')).toBeNull()
    expect(screen.queryByText('BI Financeiro')).toBeNull()
  })

  it('cards apontam para os href esperados', () => {
    permsAtivasMock = mkPerms({ is_admin_global: true })
    render(<PortalHomePage />)
    const links = screen
      .getAllByRole('link')
      .map((el) => el.getAttribute('href'))
    expect(links).toContain('/bi/financeiro')
    expect(links).toContain('/portal/fechamento')
    expect(links).toContain('/portal/indicadores/operacoes')
    expect(links).toContain('/portal/indicadores/controladoria')
    expect(links).toContain('/portal/grupo/estrutura')
    expect(links).toContain('/portal/documentos')
  })
})


// ── Sanity: DASHBOARD_CARDS estrutural ───────────────────────────────────────

describe('DASHBOARD_CARDS', () => {
  it('toda permissao usa vocabulario modulo:acao do RBAC', () => {
    const MODULOS_VALIDOS = new Set([
      'financeiro', 'fechamento', 'indicadores', 'grupo', 'documentos', 'orbit',
      'admin_categorias', 'admin_empresas', 'admin_contas_bancarias',
      'admin_usuarios', 'admin_orbit',
    ])
    const ACOES_VALIDAS = new Set(['ver', 'editar', 'exportar', 'executar'])
    for (const card of DASHBOARD_CARDS) {
      const [modulo, acao] = card.require.split(':')
      expect(MODULOS_VALIDOS.has(modulo)).toBe(true)
      expect(ACOES_VALIDAS.has(acao)).toBe(true)
    }
  })

  it('todo card tem href absoluto comecando com /', () => {
    for (const card of DASHBOARD_CARDS) {
      expect(card.href.startsWith('/')).toBe(true)
    }
  })

  it('href de cada card eh unico (sem duplicatas)', () => {
    const hrefs = DASHBOARD_CARDS.map((c) => c.href)
    expect(new Set(hrefs).size).toBe(hrefs.length)
  })
})
