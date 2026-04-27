'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface DateRangeState {
  from: string // YYYY-MM-DD
  to: string   // YYYY-MM-DD
  setRange: (from: string, to: string) => void
  days: () => number
}

/**
 * Use a deterministic SSR-safe default. The real "now-based" range is
 * applied after hydration via the rehydrate effect — this avoids any
 * SSR vs client date drift that would trigger React error #418/425.
 */
const SSR_DEFAULT_FROM = '2025-01-01'
const SSR_DEFAULT_TO = '2026-12-31'

export const useDateRangeStore = create<DateRangeState>()(
  persist(
    (set, get) => ({
      from: SSR_DEFAULT_FROM,
      to: SSR_DEFAULT_TO,

      setRange: (from, to) => set({ from, to }),

      days: () => {
        const { from, to } = get()
        return Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000)
      },
    }),
    {
      name: 'altmax-date-range',
      // Defer rehydration to client after React hydrates
      skipHydration: true,
      onRehydrateStorage: () => (state) => {
        // If localStorage didn't have a value, use a now-based default
        if (!state) return
        if (state.from === SSR_DEFAULT_FROM && state.to === SSR_DEFAULT_TO) {
          const now = new Date()
          const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1)
          state.from = toISO(sixMonthsAgo)
          state.to = toISO(now)
        }
      },
    }
  )
)
