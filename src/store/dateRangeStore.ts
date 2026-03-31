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

const now = new Date()
const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1)

export const useDateRangeStore = create<DateRangeState>()(
  persist(
    (set, get) => ({
      from: toISO(sixMonthsAgo),
      to: toISO(now),

      setRange: (from, to) => set({ from, to }),

      days: () => {
        const { from, to } = get()
        return Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000)
      },
    }),
    {
      name: 'altmax-date-range',
    }
  )
)
