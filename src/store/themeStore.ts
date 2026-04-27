'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * GRUPO ALT — Design tokens
 *
 * The token names below are intentionally backwards-compatible with
 * earlier sessions (blue/green/red/amber/purple/orange) so existing
 * pages keep working. New properties (gold, accent, ink) bring the
 * Cinematic / Daylight identity from the design system.
 */
export interface ThemeTokens {
  // Surfaces
  bg: string
  surface: string
  surfaceHover: string
  surfaceElevated: string
  // Stratified surfaces (design system: surface-0..3)
  surface0: string
  surface1: string
  surface2: string
  surface3: string
  // Borders
  border: string
  borderHover: string
  borderStrong: string
  borderGold: string
  // Accents
  blue: string;    blueDim: string
  green: string;   greenDim: string
  red: string;     redDim: string
  amber: string;   amberDim: string
  purple: string;  purpleDim: string
  orange: string;  orangeDim: string
  // Gold (brand accent)
  gold: string
  goldSoft: string
  goldText: string
  goldDim: string
  goldGlow: string
  // Text
  text: string
  textSec: string
  muted: string
  mutedDim: string
  // Ink scale (high → low contrast)
  ink900: string; ink800: string; ink700: string; ink600: string; ink500: string; ink400: string; ink300: string
  // Misc
  gridLine: string
  scrollTrack: string
  scrollThumb: string
  scrollHover: string
  tooltipShadow: string
  isDark: boolean
}

const DARK: ThemeTokens = {
  bg: '#050A14',
  surface: 'rgba(255,255,255,0.035)',
  surfaceHover: 'rgba(255,255,255,0.06)',
  surfaceElevated: 'rgba(10,20,38,0.92)',
  surface0: '#050A14',
  surface1: '#0A1426',
  surface2: '#0F1E3D',
  surface3: '#142A54',
  border: 'rgba(255,255,255,0.07)',
  borderHover: 'rgba(255,255,255,0.14)',
  borderStrong: 'rgba(255,255,255,0.16)',
  borderGold: 'rgba(224,184,46,0.30)',
  // Brand-tuned accent palette
  blue: '#3D8AD6',  blueDim: 'rgba(61,138,214,0.14)',
  green: '#84C487', greenDim: 'rgba(132,196,135,0.14)',
  red: '#F18888',   redDim: 'rgba(241,136,136,0.14)',
  amber: '#E0B82E', amberDim: 'rgba(224,184,46,0.16)',
  purple: '#B59BE6', purpleDim: 'rgba(181,155,230,0.14)',
  orange: '#DBAA82', orangeDim: 'rgba(219,170,130,0.14)',
  gold: '#E0B82E',
  goldSoft: '#EBCF5C',
  goldText: '#EBCF5C',
  goldDim: 'rgba(224,184,46,0.12)',
  goldGlow: '0 0 32px rgba(224,184,46,0.28)',
  text: 'rgba(255,255,255,0.94)',
  textSec: 'rgba(255,255,255,0.70)',
  muted: 'rgba(255,255,255,0.55)',
  mutedDim: 'rgba(255,255,255,0.30)',
  ink900: '#F8FAFC',
  ink800: 'rgba(255,255,255,0.94)',
  ink700: 'rgba(255,255,255,0.82)',
  ink600: 'rgba(255,255,255,0.70)',
  ink500: 'rgba(255,255,255,0.55)',
  ink400: 'rgba(255,255,255,0.42)',
  ink300: 'rgba(255,255,255,0.30)',
  gridLine: 'rgba(255,255,255,0.025)',
  scrollTrack: 'rgba(255,255,255,0.03)',
  scrollThumb: 'rgba(255,255,255,0.14)',
  scrollHover: 'rgba(224,184,46,0.45)',
  tooltipShadow: '0 12px 40px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.35)',
  isDark: true,
}

const LIGHT: ThemeTokens = {
  bg: '#F7F6F5',
  surface: '#FFFFFF',
  surfaceHover: '#FDFCFB',
  surfaceElevated: '#FFFFFF',
  surface0: '#F7F6F5',
  surface1: '#FFFFFF',
  surface2: '#FDFCFB',
  surface3: '#F0EEEF',
  border: 'rgba(26,23,24,0.08)',
  borderHover: 'rgba(26,23,24,0.16)',
  borderStrong: 'rgba(26,23,24,0.16)',
  borderGold: 'rgba(204,160,0,0.32)',
  // Light-mode tuned accent palette (deeper/richer for legibility)
  blue: '#045199',  blueDim: 'rgba(4,81,153,0.10)',
  green: '#2F6633', greenDim: 'rgba(47,102,51,0.10)',
  red: '#C62828',   redDim: 'rgba(198,40,40,0.10)',
  amber: '#CCA000', amberDim: 'rgba(204,160,0,0.12)',
  purple: '#6F4FB6', purpleDim: 'rgba(111,79,182,0.10)',
  orange: '#B87040', orangeDim: 'rgba(184,112,64,0.10)',
  gold: '#CCA000',
  goldSoft: '#E0B82E',
  goldText: '#8C6B00',
  goldDim: 'rgba(204,160,0,0.10)',
  goldGlow: '0 0 24px rgba(204,160,0,0.18)',
  text: '#232021',
  textSec: '#524D4E',
  muted: '#706A6B',
  mutedDim: '#948F90',
  ink900: '#1A1718',
  ink800: '#232021',
  ink700: '#2E2A2B',
  ink600: '#3D3839',
  ink500: '#524D4E',
  ink400: '#706A6B',
  ink300: '#948F90',
  gridLine: 'rgba(26,23,24,0.05)',
  scrollTrack: 'rgba(26,23,24,0.03)',
  scrollThumb: 'rgba(26,23,24,0.16)',
  scrollHover: 'rgba(26,23,24,0.28)',
  tooltipShadow: '0 12px 32px rgba(15,23,42,0.10), 0 2px 8px rgba(15,23,42,0.06)',
  isDark: false,
}

interface ThemeState {
  mode: 'dark' | 'light'
  tokens: ThemeTokens
  toggle: () => void
  setMode: (mode: 'dark' | 'light') => void
}

/** Sync the `dark` class on <html> so Tailwind dark variants react to the store. */
function applyDomMode(mode: 'dark' | 'light') {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (mode === 'dark') root.classList.add('dark')
  else root.classList.remove('dark')
  root.style.colorScheme = mode
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'dark',
      tokens: DARK,
      toggle: () => {
        const next = get().mode === 'dark' ? 'light' : 'dark'
        applyDomMode(next)
        set({ mode: next, tokens: next === 'dark' ? DARK : LIGHT })
      },
      setMode: (mode) => {
        applyDomMode(mode)
        set({ mode, tokens: mode === 'dark' ? DARK : LIGHT })
      },
    }),
    {
      name: 'altmax-theme',
      partialize: (s) => ({ mode: s.mode }),
      // Skip auto-hydration during the first render to avoid mismatches
      // between SSR (always dark) and client (whatever localStorage had).
      // We rehydrate manually from a top-level client effect (see ThemeHydrator).
      skipHydration: true,
      onRehydrateStorage: () => (state) => {
        if (!state) return
        applyDomMode(state.mode)
        state.tokens = state.mode === 'dark' ? DARK : LIGHT
      },
    }
  )
)

export { DARK, LIGHT }
