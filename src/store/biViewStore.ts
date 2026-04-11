import { create } from 'zustand'

interface BiViewState {
  view: 'dashboard' | 'analise'
  setView: (v: 'dashboard' | 'analise') => void
}

export const useBiViewStore = create<BiViewState>((set) => ({
  view: 'dashboard',
  setView: (v) => set({ view: v }),
}))
