'use client'
import { create } from 'zustand'

function fmtDMY(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface DateRangeState {
  from: string // YYYY-MM-DD
  to: string   // YYYY-MM-DD
  setRange: (from: string, to: string) => void
  /** Retorna datas no formato DD/MM/YYYY para a API */
  getApiDates: () => { dt_inicio: string; dt_fim: string }
  /** Dias no intervalo */
  days: () => number
}

const now = new Date()
const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1)

export const useDateRangeStore = create<DateRangeState>((set, get) => ({
  from: toISO(sixMonthsAgo),
  to: toISO(now),

  setRange: (from, to) => set({ from, to }),

  getApiDates: () => {
    const { from, to } = get()
    const [fy, fm, fd] = from.split('-')
    const [ty, tm, td] = to.split('-')
    return {
      dt_inicio: `${fd}/${fm}/${fy}`,
      dt_fim: `${td}/${tm}/${ty}`,
    }
  },

  days: () => {
    const { from, to } = get()
    return Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000)
  },
}))
