'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useAuthStore } from './authStore'

export interface Empresa {
  id: string
  nome: string
  cnpj: string
  logoDark: string | null
  logoLight: string | null
  cor: string
}

const CORES = ['#38BDF8', '#34D399', '#FBBF24', '#F87171', '#C084FC', '#FB923C']

/**
 * STEP 11 — Fonte de verdade da "empresa ativa".
 *
 * Decisão (ver docs/plano-acao-seguranca/step-11-empresa-ativa.md):
 *   `empresaStore.activeId` é a ÚNICA fonte de verdade.
 *   `authStore.empresaAtiva` é mantida como espelho legado e só pode ser
 *   alterada via `setActive`/`syncFromAuth` deste store. Componentes não
 *   devem chamar `authStore.setEmpresaAtiva` diretamente — o método existe
 *   só por compatibilidade e delega para `setActive` aqui.
 *
 * Invariantes:
 *   1. activeId pertence a `auth.empresas` do usuário logado, ou é "".
 *   2. Após `/auth/me`, `syncFromAuth` valida activeId persistido e
 *      reseta para a primeira empresa do usuário se o id não pertence.
 *   3. Em logout, `reset()` limpa activeId e localStorage `altmax-empresa`.
 *   4. Nada de fallback hardcoded para empresa `1`.
 */

interface EmpresaState {
  empresas: Empresa[]
  activeId: string
  _synced: boolean
  /** Mutator central: troca empresa ativa e propaga para authStore. */
  setActive: (id: string) => void
  getActive: () => Empresa | null
  /** Reconcilia a partir de authStore após /auth/me. */
  syncFromAuth: () => void
  /** Limpa estado e persistência (chamado pelo logout do authStore). */
  reset: () => void
  updateEmpresa: (id: string, data: Partial<Empresa>) => void
  addEmpresa: () => void
  removeEmpresa: (id: string) => void
}

export const useEmpresaStore = create<EmpresaState>()(
  persist(
    (set, get) => ({
      empresas: [],
      activeId: '',
      _synced: false,

      setActive: (id) => {
        // Não aceita id vazio nem id que o usuário não tem acesso.
        if (!id) return
        const auth = useAuthStore.getState()
        const authEmp = auth.empresas.find((e) => String(e.id) === id)
        if (auth.empresas.length > 0 && !authEmp) {
          console.warn('[empresaStore] setActive ignorado: empresa', id, 'nao pertence ao usuario')
          return
        }
        set({ activeId: id })
        if (authEmp) auth.setEmpresaAtivaInternal(authEmp)
      },

      getActive: () => {
        const state = get()
        return state.empresas.find((e) => e.id === state.activeId) || state.empresas[0] || null
      },

      syncFromAuth: () => {
        const auth = useAuthStore.getState()
        if (!auth.empresas.length) {
          // Usuário sem empresas: limpa para evitar vazamento entre sessões.
          set({ empresas: [], activeId: '', _synced: true })
          return
        }

        const empresas: Empresa[] = auth.empresas.map((e, i) => ({
          id: String(e.id),
          nome: e.nome,
          cnpj: e.cnpj || '',
          logoDark: null,
          logoLight: null,
          cor: CORES[i % CORES.length],
        }))

        // Aceita activeId persistido apenas se pertencer ao usuário atual.
        const persistedId = get().activeId
        const isPersistedValid = persistedId && empresas.some((e) => e.id === persistedId)
        const activeId = isPersistedValid
          ? persistedId
          : empresas[0]?.id || ''

        set({ empresas, activeId, _synced: true })

        // Reflete no authStore (espelho legado) sem reentrar em setActive.
        const authEmp = auth.empresas.find((e) => String(e.id) === activeId)
        if (authEmp) auth.setEmpresaAtivaInternal(authEmp)
        else auth.setEmpresaAtivaInternal(null)
      },

      reset: () => {
        set({ empresas: [], activeId: '', _synced: false })
        if (typeof window !== 'undefined') {
          try { window.localStorage.removeItem('altmax-empresa') } catch {}
        }
      },

      updateEmpresa: (id, data) =>
        set((s) => ({
          empresas: s.empresas.map((e) => (e.id === id ? { ...e, ...data } : e)),
        })),

      addEmpresa: () =>
        set((s) => {
          const newId = String(Date.now())
          return {
            empresas: [
              ...s.empresas,
              {
                id: newId,
                nome: 'Nova Empresa',
                cnpj: '00.000.000/0000-00',
                logoDark: null,
                logoLight: null,
                cor: '#38BDF8',
              },
            ],
          }
        }),

      removeEmpresa: (id) =>
        set((s) => {
          if (s.empresas.length <= 1) return s
          const filtered = s.empresas.filter((e) => e.id !== id)
          const activeId = s.activeId === id ? filtered[0].id : s.activeId
          return { empresas: filtered, activeId }
        }),
    }),
    {
      name: 'altmax-empresa',
      partialize: (state) => ({ activeId: state.activeId }),
      // Defer rehydration until after React hydrates (see ThemeHydrator)
      skipHydration: true,
    }
  )
)

export function getLogo(emp: Empresa | null, isDark: boolean): string | null {
  if (!emp) return null
  if (isDark) return emp.logoDark || emp.logoLight
  return emp.logoLight || emp.logoDark
}
