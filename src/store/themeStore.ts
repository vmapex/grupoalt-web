'use client'
import { create } from 'zustand'

export interface ThemeTokens {
  bg: string
  surface: string
  surfaceHover: string
  surfaceElevated: string
  border: string
  borderHover: string
  blue: string
  blueDim: string
  green: string
  greenDim: string
  red: string
  redDim: string
  amber: string
  amberDim: string
  purple: string
  purpleDim: string
  orange: string
  orangeDim: string
  text: string
  textSec: string
  muted: string
  mutedDim: string
  gridLine: string
  scrollTrack: string
  scrollThumb: string
  scrollHover: string
  tooltipShadow: string
  isDark: boolean
}

const DARK: ThemeTokens = {
  bg: '#05091A',
  surface: 'rgba(255,255,255,0.034)',
  surfaceHover: 'rgba(255,255,255,0.055)',
  surfaceElevated: 'rgba(8,14,38,0.95)',
  border: 'rgba(255,255,255,0.07)',
  borderHover: 'rgba(255,255,255,0.12)',
  blue: '#38BDF8', blueDim: 'rgba(56,189,248,0.12)',
  green: '#34D399', greenDim: 'rgba(52,211,153,0.12)',
  red: '#F87171', redDim: 'rgba(248,113,113,0.12)',
  amber: '#FBBF24', amberDim: 'rgba(251,191,36,0.12)',
  purple: '#C084FC', purpleDim: 'rgba(192,132,252,0.12)',
  orange: '#FB923C', orangeDim: 'rgba(251,146,60,0.12)',
  text: '#F1F5F9', textSec: '#94A3B8', muted: '#64748B', mutedDim: '#475569',
  gridLine: 'rgba(56,189,248,0.018)',
  scrollTrack: 'rgba(255,255,255,0.02)', scrollThumb: 'rgba(255,255,255,0.12)', scrollHover: 'rgba(255,255,255,0.22)',
  tooltipShadow: '0 8px 32px rgba(0,0,0,0.5)',
  isDark: true,
}

const LIGHT: ThemeTokens = {
  bg: '#F4F6F8',
  surface: 'rgba(0,0,0,0.028)',
  surfaceHover: 'rgba(0,0,0,0.05)',
  surfaceElevated: 'rgba(255,255,255,0.97)',
  border: 'rgba(0,0,0,0.09)',
  borderHover: 'rgba(0,0,0,0.16)',
  blue: '#0284C7', blueDim: 'rgba(2,132,199,0.09)',
  green: '#059669', greenDim: 'rgba(5,150,105,0.09)',
  red: '#DC2626', redDim: 'rgba(220,38,38,0.09)',
  amber: '#D97706', amberDim: 'rgba(217,119,6,0.09)',
  purple: '#9333EA', purpleDim: 'rgba(147,51,234,0.09)',
  orange: '#EA580C', orangeDim: 'rgba(234,88,12,0.09)',
  text: '#0F172A', textSec: '#475569', muted: '#64748B', mutedDim: '#94A3B8',
  gridLine: 'rgba(0,0,0,0.035)',
  scrollTrack: 'rgba(0,0,0,0.03)', scrollThumb: 'rgba(0,0,0,0.12)', scrollHover: 'rgba(0,0,0,0.24)',
  tooltipShadow: '0 8px 24px rgba(0,0,0,0.12)',
  isDark: false,
}

interface ThemeState {
  mode: 'dark' | 'light'
  tokens: ThemeTokens
  toggle: () => void
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode: 'dark',
  tokens: DARK,
  toggle: () =>
    set((s) => ({
      mode: s.mode === 'dark' ? 'light' : 'dark',
      tokens: s.mode === 'dark' ? LIGHT : DARK,
    })),
}))

export { DARK, LIGHT }
