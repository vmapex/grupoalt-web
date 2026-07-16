import { describe, expect, it, beforeEach, vi } from 'vitest'
import { useEmpresaStore } from './empresaStore'
import { useAuthStore } from './authStore'

/**
 * Step 14 — Suite de testes do empresaStore (fonte de verdade da empresa
 * ativa, definida no Step 11).
 *
 * Invariantes verificadas:
 *   1. activeId pertence a `auth.empresas` do usuario logado.
 *   2. activeId persistido invalido (de outra sessao) e descartado em syncFromAuth.
 *   3. logout (reset) limpa activeId, lista e localStorage.
 *   4. Sem fallback hardcoded para empresa "1".
 *   5. Logout/login nao vaza empresa anterior entre usuarios.
 */

beforeEach(() => {
  // Reseta os dois stores para um estado conhecido antes de cada teste.
  useAuthStore.setState({
    isAuthenticated: false,
    user: null,
    empresas: [],
    empresaAtiva: null,
    grupos: [],
    grupoAtivo: null,
    permissoes: [],
  })
  useEmpresaStore.setState({
    empresas: [],
    activeId: '',
    _synced: false,
  })
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem('altmax-empresa')
    } catch {
      /* jsdom sometimes doesn't expose localStorage cleanly */
    }
  }
})

describe('empresaStore.syncFromAuth', () => {
  it('cria lista de empresas a partir do authStore', () => {
    useAuthStore.setState({
      empresas: [
        { id: 1, nome: 'Empresa A', cnpj: '00.000.000/0001-00' },
        { id: 2, nome: 'Empresa B', cnpj: '00.000.000/0002-00' },
      ],
    })
    useEmpresaStore.getState().syncFromAuth()
    const state = useEmpresaStore.getState()
    expect(state.empresas).toHaveLength(2)
    expect(state.empresas[0]).toMatchObject({ id: '1', nome: 'Empresa A' })
    expect(state.empresas[1]).toMatchObject({ id: '2', nome: 'Empresa B' })
    expect(state._synced).toBe(true)
  })

  it('propaga logos persistidos no backend (logo_dark/logo_light → logoDark/logoLight)', () => {
    // 2026-07-15: logos deixaram de viver só no localStorage de quem fez
    // upload — o /auth/me entrega e o syncFromAuth mapeia.
    useAuthStore.setState({
      empresas: [
        {
          id: 1, nome: 'Com Logo', cnpj: '',
          logo_dark: 'data:image/png;base64,DARK',
          logo_light: 'data:image/png;base64,LIGHT',
        },
        { id: 2, nome: 'Sem Logo', cnpj: '' },
      ],
    })
    useEmpresaStore.getState().syncFromAuth()
    const [comLogo, semLogo] = useEmpresaStore.getState().empresas
    expect(comLogo.logoDark).toBe('data:image/png;base64,DARK')
    expect(comLogo.logoLight).toBe('data:image/png;base64,LIGHT')
    expect(semLogo.logoDark).toBeNull()
    expect(semLogo.logoLight).toBeNull()
  })

  it('atribui cor distinta para cada empresa', () => {
    useAuthStore.setState({
      empresas: [
        { id: 1, nome: 'A' },
        { id: 2, nome: 'B' },
      ],
    })
    useEmpresaStore.getState().syncFromAuth()
    const empresas = useEmpresaStore.getState().empresas
    expect(empresas[0].cor).not.toBe(empresas[1].cor)
  })

  it('mantem activeId persistido se ainda for valido (refresh)', () => {
    useEmpresaStore.setState({ activeId: '2' })
    useAuthStore.setState({
      empresas: [
        { id: 1, nome: 'A' },
        { id: 2, nome: 'B' },
        { id: 3, nome: 'C' },
      ],
    })
    useEmpresaStore.getState().syncFromAuth()
    expect(useEmpresaStore.getState().activeId).toBe('2')
  })

  it('descarta activeId persistido invalido (id que nao pertence ao usuario)', () => {
    useEmpresaStore.setState({ activeId: '99' })
    useAuthStore.setState({
      empresas: [
        { id: 1, nome: 'A' },
        { id: 2, nome: 'B' },
      ],
    })
    useEmpresaStore.getState().syncFromAuth()
    // Deve cair na primeira empresa real do usuario, NAO em "99" nem em "1" hardcoded
    expect(useEmpresaStore.getState().activeId).toBe('1')
  })

  it('limpa estado quando o usuario nao tem nenhuma empresa', () => {
    useEmpresaStore.setState({
      empresas: [{ id: '1', nome: 'X', cnpj: '', logoDark: null, logoLight: null, cor: '#000' }],
      activeId: '1',
    })
    useAuthStore.setState({ empresas: [] })
    useEmpresaStore.getState().syncFromAuth()
    const state = useEmpresaStore.getState()
    expect(state.empresas).toEqual([])
    expect(state.activeId).toBe('')
  })

  it('reflete empresaAtiva no authStore (espelho legado)', () => {
    useAuthStore.setState({
      empresas: [
        { id: 1, nome: 'A' },
        { id: 2, nome: 'B' },
      ],
    })
    useEmpresaStore.setState({ activeId: '2' })
    useEmpresaStore.getState().syncFromAuth()
    expect(useAuthStore.getState().empresaAtiva).toMatchObject({ id: 2, nome: 'B' })
  })
})

describe('empresaStore.setActive', () => {
  it('aceita id que pertence ao usuario logado', () => {
    useAuthStore.setState({
      empresas: [
        { id: 1, nome: 'A' },
        { id: 2, nome: 'B' },
      ],
    })
    useEmpresaStore.getState().syncFromAuth()
    useEmpresaStore.getState().setActive('2')
    expect(useEmpresaStore.getState().activeId).toBe('2')
  })

  it('rejeita id vazio (no-op)', () => {
    useEmpresaStore.setState({ activeId: '5' })
    useEmpresaStore.getState().setActive('')
    expect(useEmpresaStore.getState().activeId).toBe('5')
  })

  it('rejeita id que nao pertence ao usuario logado (loga warning)', () => {
    useAuthStore.setState({
      empresas: [{ id: 1, nome: 'A' }],
    })
    useEmpresaStore.setState({ activeId: '1' })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    useEmpresaStore.getState().setActive('99')
    expect(useEmpresaStore.getState().activeId).toBe('1')
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('aceita id quando authStore.empresas ainda nao foi populado (pre-login)', () => {
    useAuthStore.setState({ empresas: [] })
    useEmpresaStore.getState().setActive('5')
    expect(useEmpresaStore.getState().activeId).toBe('5')
  })

  it('reflete escolha no authStore.empresaAtiva', () => {
    useAuthStore.setState({
      empresas: [
        { id: 1, nome: 'A' },
        { id: 2, nome: 'B' },
      ],
    })
    useEmpresaStore.getState().syncFromAuth()
    useEmpresaStore.getState().setActive('2')
    expect(useAuthStore.getState().empresaAtiva).toMatchObject({ id: 2, nome: 'B' })
  })
})

describe('empresaStore.reset (logout)', () => {
  it('limpa empresas, activeId e _synced', () => {
    useEmpresaStore.setState({
      empresas: [{ id: '1', nome: 'X', cnpj: '', logoDark: null, logoLight: null, cor: '#000' }],
      activeId: '1',
      _synced: true,
    })
    useEmpresaStore.getState().reset()
    const state = useEmpresaStore.getState()
    expect(state.empresas).toEqual([])
    expect(state.activeId).toBe('')
    expect(state._synced).toBe(false)
  })

  it('remove altmax-empresa do localStorage', () => {
    window.localStorage.setItem(
      'altmax-empresa',
      JSON.stringify({ state: { activeId: '5' }, version: 0 }),
    )
    useEmpresaStore.getState().reset()
    expect(window.localStorage.getItem('altmax-empresa')).toBeNull()
  })
})

describe('empresaStore — isolamento entre sessoes (logout/login)', () => {
  it('logout do usuario A nao vaza activeId para o usuario B', () => {
    // Sessao A: usuario com empresas 1 e 2 ativa em 2
    useAuthStore.setState({
      empresas: [
        { id: 1, nome: 'A1' },
        { id: 2, nome: 'A2' },
      ],
    })
    useEmpresaStore.getState().syncFromAuth()
    useEmpresaStore.getState().setActive('2')
    expect(useEmpresaStore.getState().activeId).toBe('2')

    // Logout
    useEmpresaStore.getState().reset()

    // Sessao B: outro usuario com empresas 10 e 11
    useAuthStore.setState({
      empresas: [
        { id: 10, nome: 'B1' },
        { id: 11, nome: 'B2' },
      ],
    })
    useEmpresaStore.getState().syncFromAuth()

    // activeId deve cair na primeira empresa do B (10), nao em "2" nem hardcoded em "1"
    expect(useEmpresaStore.getState().activeId).toBe('10')
  })
})

describe('empresaStore — utilitarios', () => {
  it('getActive retorna empresa correspondente ao activeId', () => {
    useEmpresaStore.setState({
      empresas: [
        { id: '1', nome: 'A', cnpj: '', logoDark: null, logoLight: null, cor: '#000' },
        { id: '2', nome: 'B', cnpj: '', logoDark: null, logoLight: null, cor: '#111' },
      ],
      activeId: '2',
    })
    expect(useEmpresaStore.getState().getActive()?.nome).toBe('B')
  })

  it('getActive retorna primeira empresa se activeId nao bater', () => {
    useEmpresaStore.setState({
      empresas: [
        { id: '1', nome: 'A', cnpj: '', logoDark: null, logoLight: null, cor: '#000' },
      ],
      activeId: 'desconhecido',
    })
    expect(useEmpresaStore.getState().getActive()?.nome).toBe('A')
  })

  it('getActive retorna null quando nao ha empresas', () => {
    useEmpresaStore.setState({ empresas: [], activeId: '' })
    expect(useEmpresaStore.getState().getActive()).toBeNull()
  })
})
