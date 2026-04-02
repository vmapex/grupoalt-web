'use client'

import { useState, useMemo } from 'react'
import { Calendar, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { useThemeStore } from '@/store/themeStore'
import type { ThemeTokens } from '@/store/themeStore'
import { SortHeader } from '@/components/ui/SortHeader'
import { KPICard } from '@/components/ui/KPICard'
import { fmtBRL, fmtK, toggleSort, sortRows, type SortState } from '@/lib/formatters'
import { nextBusinessDay, fmtDateBR, isBusinessDay } from '@/lib/sla'
import type { ConcilEntry } from '@/lib/mocks/concilData'
import { useConcilCalendario, useConcilResumo, useConcilMovimentacao, useConcilDia } from '@/hooks/useAPI'
import { useEmpresaId } from '@/hooks/useEmpresaId'
import { transformConcilMovimento } from '@/lib/transformers'

// ---------- constants ----------
const TODAY = new Date()
const TODAY_KEY = `${TODAY.getFullYear()}-${String(TODAY.getMonth() + 1).padStart(2, '0')}-${String(TODAY.getDate()).padStart(2, '0')}`

// Generate 6 months ending at current month
const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const MONTHS: { year: number; month: number; label: string }[] = (() => {
  const result: { year: number; month: number; label: string }[] = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    result.push({
      year: d.getFullYear(),
      month: d.getMonth(),
      label: `${MONTH_NAMES[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`,
    })
  }
  return result
})()

const DOW_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom']

const BANK_FILTERS = ['Todos', 'Itau', 'Banco do Brasil', 'Bradesco', 'Santander'] as const

// ---------- CalendarMonth component ----------
interface CalendarMonthProps {
  year: number
  month: number
  label: string
  entries: Record<string, ConcilEntry>
  selectedDay: string | null
  onDayClick: (key: string) => void
  t: ThemeTokens
}

function CalendarMonth({ year, month, label, entries, selectedDay, onDayClick, t }: CalendarMonthProps) {
  const firstDay = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  // Monday=0 ... Sunday=6
  let startOffset = firstDay.getDay() - 1
  if (startOffset < 0) startOffset = 6

  const cells: (number | null)[] = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ background: t.surface, border: `1px solid ${t.border}` }}
    >
      <div
        className="text-center text-[10px] font-semibold uppercase tracking-wider py-2"
        style={{ color: t.textSec, borderBottom: `1px solid ${t.border}` }}
      >
        {label}
      </div>
      <div className="grid grid-cols-7 gap-px px-1.5 pt-1 pb-0.5">
        {DOW_LABELS.map((d) => (
          <div
            key={d}
            className="text-center text-[7px] uppercase tracking-wide py-0.5"
            style={{ color: t.muted }}
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px px-1.5 pb-1.5">
        {cells.map((day, idx) => {
          if (day === null) return <div key={idx} className="w-full aspect-square" />

          const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const entry = entries[key]
          const isToday = key === TODAY_KEY
          const isSelected = key === selectedDay
          const isFuture = new Date(year, month, day) > TODAY
          const isWeekend = new Date(year, month, day).getDay() === 0 || new Date(year, month, day).getDay() === 6

          let bg = 'transparent'
          let textColor = t.muted

          if (isWeekend || isFuture) {
            textColor = `${t.muted}66`
          } else if (entry) {
            if (entry.conciliado) {
              bg = `${t.green}28`
              textColor = t.green
            } else {
              // Check SLA
              const slaDate = nextBusinessDay(key)
              const isOutSLA = TODAY > slaDate
              if (isOutSLA) {
                bg = `${t.red}28`
                textColor = t.red
              } else {
                bg = `${t.amber}28`
                textColor = t.amber
              }
            }
          }

          return (
            <button
              key={idx}
              onClick={() => entry ? onDayClick(key) : undefined}
              className="w-full aspect-square rounded text-[9px] font-mono font-medium flex items-center justify-center transition-all"
              style={{
                background: isSelected ? `${t.blue}35` : bg,
                color: isSelected ? t.blue : textColor,
                cursor: entry ? 'pointer' : 'default',
                outline: isToday ? `1.5px solid ${t.blue}` : 'none',
                outlineOffset: -1,
              }}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ---------- Main page ----------
export default function PageConciliacao() {
  const t = useThemeStore((s) => s.tokens)
  const empresaId = useEmpresaId()
  const [bankFilter, setBankFilter] = useState<string>('Todos')
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [sort, setSort] = useState<SortState>({ field: 'date', dir: 'desc' })

  // API calls
  const { data: concilAPI, loading: loadingConcil } = useConcilMovimentacao(empresaId)
  const { data: resumoAPI } = useConcilResumo(empresaId)
  const { data: diaAPI } = useConcilDia(empresaId, selectedDay)

  // Use API data or fallback to mock
  const baseData: Record<string, ConcilEntry> = useMemo(() => {
    if (concilAPI?.length) return transformConcilMovimento(concilAPI)
    return {}
  }, [concilAPI])

  // --- filtered entries by bank ---
  const filteredEntries = useMemo(() => {
    if (bankFilter === 'Todos') return baseData
    const out: Record<string, ConcilEntry> = {}
    for (const [k, v] of Object.entries(baseData)) {
      if (v.banco === bankFilter) out[k] = v
    }
    return out
  }, [bankFilter, baseData])

  // --- all entries as sorted array for table ---
  const allEntries = useMemo(() => Object.values(filteredEntries), [filteredEntries])

  const sortedEntries = useMemo(
    () =>
      sortRows(allEntries, sort, (r, f) => {
        if (f === 'date') return r.date
        if (f === 'extrato') return r.extrato
        if (f === 'saldoBanco') return r.saldoBanco
        if (f === 'dif') return Math.abs(r.dif)
        if (f === 'status') return r.conciliado ? 1 : 0
        return 0
      }),
    [allEntries, sort],
  )

  // --- stats (use API resumo when available) ---
  const stats = useMemo(() => {
    if (resumoAPI) {
      // streak still computed locally
      let streak = 0
      const cur = new Date(TODAY)
      for (let i = 0; i < 90; i++) {
        const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`
        if (isBusinessDay(cur)) {
          const e = filteredEntries[key]
          if (e && !e.conciliado) streak++
          else if (e && e.conciliado) break
        }
        cur.setDate(cur.getDate() - 1)
      }
      return {
        pctConcil: resumoAPI.percentual_conciliado,
        sumDif: resumoAPI.total_divergencias,
        maiorDif: resumoAPI.maior_diferenca,
        streak: resumoAPI.dias_sem_conciliar ?? streak,
        mediaExtrato: resumoAPI.media_diaria_extrato,
      }
    }
    const entries = allEntries.filter((e) => new Date(e.date) <= TODAY)
    const total = entries.length
    const conciliados = entries.filter((e) => e.conciliado).length
    const pctConcil = total > 0 ? (conciliados / total) * 100 : 0

    const abertos = entries.filter((e) => !e.conciliado)
    const sumDif = abertos.reduce((s, e) => s + Math.abs(e.dif), 0)
    const maiorDif = abertos.length > 0 ? Math.max(...abertos.map((e) => Math.abs(e.dif))) : 0

    let streak = 0
    const cur = new Date(TODAY)
    for (let i = 0; i < 90; i++) {
      const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`
      if (isBusinessDay(cur)) {
        const e = filteredEntries[key]
        if (e && !e.conciliado) streak++
        else if (e && e.conciliado) break
      }
      cur.setDate(cur.getDate() - 1)
    }

    const mediaExtrato = total > 0 ? entries.reduce((s, e) => s + Math.abs(e.extrato), 0) / total : 0

    return { pctConcil, sumDif, maiorDif, streak, mediaExtrato }
  }, [allEntries, filteredEntries, resumoAPI])

  // --- SLA analysis for footer ---
  const slaInfo = useMemo(() => {
    const entries = allEntries.filter((e) => new Date(e.date) <= TODAY)
    const pendentes = entries.filter((e) => !e.conciliado)
    let foraSLA = 0
    let emDia = 0
    for (const e of pendentes) {
      const slaDate = nextBusinessDay(e.date)
      if (TODAY > slaDate) foraSLA++
      else emDia++
    }

    // ultimo conciliado
    const concilDates = entries.filter((e) => e.conciliado).map((e) => e.date).sort()
    const ultimoConcil = concilDates.length > 0 ? concilDates[concilDates.length - 1] : null

    // movimentacao total
    const movTotal = entries.reduce((s, e) => s + Math.abs(e.extrato), 0)

    // dias sem movimento (backwards from today)
    let diasSemMov = 0
    const cur = new Date(TODAY)
    for (let i = 0; i < 90; i++) {
      const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`
      if (isBusinessDay(cur)) {
        if (!filteredEntries[key]) {
          diasSemMov++
        } else {
          break
        }
      }
      cur.setDate(cur.getDate() - 1)
    }

    return { foraSLA, emDia, ultimoConcil, movTotal, diasSemMov }
  }, [allEntries, filteredEntries])

  // --- day entries for left table (API or mock) ---
  const dayEntries = useMemo(() => {
    if (!selectedDay) return []
    // Use API day detail when available
    if (diaAPI?.lancamentos?.length) {
      return diaAPI.lancamentos.map((l) => ({
        hora: '',
        desc: l.descricao,
        valor: l.valor,
      }))
    }
    return []
  }, [selectedDay, diaAPI])

  const handleSort = (field: string) => setSort((s) => toggleSort(s, field))

  // ---------- render ----------
  return (
    <div className="flex flex-col min-h-full">
      {/* KPI Strip */}
      <div className="grid grid-cols-5 shrink-0" style={{ borderBottom: `1px solid ${t.border}` }}>
        <KPICard
          label="% Conciliacao"
          value={`${stats.pctConcil.toFixed(1).replace('.', ',')}%`}
          color={stats.pctConcil >= 80 ? t.green : stats.pctConcil >= 60 ? t.amber : t.red}
          accent={stats.pctConcil >= 80 ? t.green : stats.pctConcil >= 60 ? t.amber : t.red}
          sub={`${Math.round(stats.pctConcil)}% dos dias conciliados`}
        />
        <KPICard
          label="Diferencas Abertas"
          value={`R$ ${fmtK(stats.sumDif)}`}
          color={t.red}
          accent={t.red}
          sub="Soma absoluta pendentes"
        />
        <KPICard
          label="Maior Diferenca"
          value={`R$ ${fmtK(stats.maiorDif)}`}
          color={t.amber}
          accent={t.amber}
        />
        <KPICard
          label="Dias s/ Conciliar"
          value={`${stats.streak}d`}
          color={stats.streak > 3 ? t.red : stats.streak > 0 ? t.amber : t.green}
          accent={stats.streak > 3 ? t.red : t.amber}
          sub="Streak consecutivo"
        />
        <KPICard
          label="Media Diaria Extrato"
          value={`R$ ${fmtK(stats.mediaExtrato)}`}
          color={t.blue}
          accent={t.blue}
          borderRight={false}
        />
      </div>

      {/* Filter bar */}
      <div
        className="flex items-center gap-3 px-5 py-2.5 shrink-0 flex-wrap"
        style={{ borderBottom: `1px solid ${t.border}`, background: `${t.bg}88` }}
      >
        {/* Bank buttons */}
        <div className="flex items-center gap-1.5">
          {BANK_FILTERS.map((b) => (
            <button
              key={b}
              onClick={() => setBankFilter(b)}
              className="px-3 py-1 rounded text-[10px] font-medium transition-all"
              style={{
                background: bankFilter === b ? t.blueDim : t.surface,
                color: bankFilter === b ? t.blue : t.textSec,
                border: `1px solid ${bankFilter === b ? `${t.blue}44` : t.border}`,
              }}
            >
              {b === 'Banco do Brasil' ? 'BB' : b}
            </button>
          ))}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Legend */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: `${t.green}55` }} />
            <span className="text-[9px]" style={{ color: t.muted }}>DIF=0</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: `${t.amber}55` }} />
            <span className="text-[9px]" style={{ color: t.muted }}>Pendente no prazo</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: `${t.red}55` }} />
            <span className="text-[9px]" style={{ color: t.muted }}>Fora SLA</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ outline: `1.5px solid ${t.blue}`, outlineOffset: -1 }} />
            <span className="text-[9px]" style={{ color: t.muted }}>Hoje</span>
          </div>
        </div>

        {/* Formula pill */}
        <div
          className="px-2.5 py-1 rounded text-[9px] font-mono"
          style={{ background: t.surface, color: t.muted, border: `1px solid ${t.border}` }}
        >
          DIF = Extrato &minus; SaldoBanco + Ajuste &rarr; DIF=0 conciliado
        </div>
      </div>

      {/* Calendar heatmap */}
      <div
        className="px-5 py-4 shrink-0"
        style={{ borderBottom: `1px solid ${t.border}` }}
      >
        <div className="grid grid-cols-6 gap-3">
          {MONTHS.map((m) => (
            <CalendarMonth
              key={m.label}
              year={m.year}
              month={m.month}
              label={m.label}
              entries={filteredEntries}
              selectedDay={selectedDay}
              onDayClick={setSelectedDay}
              t={t}
            />
          ))}
        </div>
      </div>

      {/* Two tables side by side */}
      <div className="flex-1 grid" style={{ gridTemplateColumns: '1fr 1fr', minHeight: 420 }}>
        {/* Left: Lancamentos do Dia */}
        <div
          className="flex flex-col min-h-0"
          style={{ borderRight: `1px solid ${t.border}` }}
        >
          <div
            className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider shrink-0"
            style={{ color: t.textSec, borderBottom: `1px solid ${t.border}` }}
          >
            Lancamentos do Dia
            {selectedDay && (
              <span className="ml-2 font-mono" style={{ color: t.blue }}>
                {fmtDateBR(selectedDay)}
              </span>
            )}
          </div>
          {!selectedDay || dayEntries.length === 0 ? (
            <div className="flex-1 flex items-center justify-center" style={{ color: t.muted }}>
              <div className="text-center">
                <Calendar size={32} className="mx-auto mb-3 opacity-30" />
                <div className="text-[11px]">Selecione um dia no calendario</div>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th
                      className="text-left text-[9px] uppercase tracking-wider font-mono font-semibold px-4 py-2.5"
                      style={{ color: t.muted, borderBottom: `1px solid ${t.border}` }}
                    >
                      Hora
                    </th>
                    <th
                      className="text-left text-[9px] uppercase tracking-wider font-mono font-semibold px-4 py-2.5"
                      style={{ color: t.muted, borderBottom: `1px solid ${t.border}` }}
                    >
                      Descricao
                    </th>
                    <th
                      className="text-right text-[9px] uppercase tracking-wider font-mono font-semibold px-4 py-2.5"
                      style={{ color: t.muted, borderBottom: `1px solid ${t.border}` }}
                    >
                      Valor
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {dayEntries.map((e, i) => (
                    <tr
                      key={i}
                      className="transition-colors"
                      style={{ borderBottom: `1px solid ${t.border}` }}
                    >
                      <td
                        className="px-4 py-2 text-[11px] font-mono"
                        style={{ color: t.muted }}
                      >
                        {e.hora}
                      </td>
                      <td
                        className="px-4 py-2 text-[11px]"
                        style={{ color: t.text }}
                      >
                        {e.desc}
                      </td>
                      <td
                        className="px-4 py-2 text-[11px] font-mono text-right"
                        style={{ color: e.valor >= 0 ? t.green : t.red }}
                      >
                        {e.valor >= 0 ? '+' : '\u2212'}R$ {fmtBRL(e.valor)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right: Conciliacao Diaria sortable table */}
        <div className="flex flex-col min-h-0">
          <div
            className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider shrink-0 flex items-center justify-between"
            style={{ color: t.textSec, borderBottom: `1px solid ${t.border}` }}
          >
            <span>Conciliacao Diaria</span>
            <span className="font-mono text-[9px]" style={{ color: t.muted }}>
              {sortedEntries.length} registros
            </span>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full">
              <thead className="sticky top-0" style={{ background: t.bg }}>
                <tr>
                  <th style={{ width: 4 }} />
                  <SortHeader label="Data" field="date" sort={sort} onSort={handleSort} />
                  <SortHeader label="Extrato" field="extrato" sort={sort} onSort={handleSort} align="right" />
                  <SortHeader label="Saldo Bancos" field="saldoBanco" sort={sort} onSort={handleSort} align="right" />
                  <SortHeader label="DIF" field="dif" sort={sort} onSort={handleSort} align="right" />
                  <SortHeader label="ST" field="status" sort={sort} onSort={handleSort} align="center" />
                </tr>
              </thead>
              <tbody>
                {sortedEntries.map((entry) => {
                  const isOutSLA = !entry.conciliado && TODAY > nextBusinessDay(entry.date)
                  const isPendSLA = !entry.conciliado && !isOutSLA
                  const barColor = entry.conciliado ? t.green : isOutSLA ? t.red : t.amber

                  // days of delay for out-SLA entries
                  let diasAtraso = 0
                  if (isOutSLA) {
                    const slaDate = nextBusinessDay(entry.date)
                    diasAtraso = Math.round((TODAY.getTime() - slaDate.getTime()) / 86400000)
                  }

                  return (
                    <tr
                      key={entry.date}
                      className="transition-colors group"
                      style={{ borderBottom: `1px solid ${t.border}` }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = t.surfaceHover
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent'
                      }}
                    >
                      {/* Color bar */}
                      <td style={{ width: 4, padding: 0 }}>
                        <div className="h-full w-1" style={{ background: barColor, minHeight: 32 }} />
                      </td>
                      <td className="px-3 py-2 text-[11px] font-mono" style={{ color: t.text }}>
                        {fmtDateBR(entry.date)}
                      </td>
                      <td className="px-3 py-2 text-[11px] font-mono text-right" style={{ color: t.textSec }}>
                        R$ {fmtBRL(entry.extrato)}
                      </td>
                      <td className="px-3 py-2 text-[11px] font-mono text-right" style={{ color: t.textSec }}>
                        R$ {fmtBRL(entry.saldoBanco)}
                      </td>
                      <td
                        className="px-3 py-2 text-[11px] font-mono text-right font-semibold"
                        style={{
                          color: entry.conciliado ? t.green : t.red,
                        }}
                      >
                        {entry.conciliado ? '0,00' : fmtBRL(entry.dif)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {entry.conciliado ? (
                          <CheckCircle2 size={14} style={{ color: t.green }} className="inline-block" />
                        ) : (
                          <span className="inline-flex items-center gap-1">
                            <XCircle size={14} style={{ color: isOutSLA ? t.red : t.amber }} />
                            {isOutSLA && (
                              <span className="text-[9px] font-mono font-semibold" style={{ color: t.red }}>
                                {diasAtraso}d
                              </span>
                            )}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Footer strip */}
      <div
        className="grid grid-cols-5 shrink-0"
        style={{ borderTop: `1px solid ${t.border}`, background: t.surface }}
      >
        <FooterMetric
          label="Ultimo Conciliado"
          value={slaInfo.ultimoConcil ? fmtDateBR(slaInfo.ultimoConcil) : '\u2014'}
          color={t.green}
          t={t}
        />
        <FooterMetric
          label="SLA D+1 Util"
          value={slaInfo.foraSLA > 0 ? `${slaInfo.foraSLA} fora` : 'Em dia'}
          color={slaInfo.foraSLA > 0 ? t.red : t.green}
          t={t}
          sub={slaInfo.foraSLA > 0 ? `${slaInfo.emDia} em dia` : undefined}
        />
        <FooterMetric
          label="Movimentacao Total"
          value={`R$ ${fmtK(slaInfo.movTotal)}`}
          color={t.blue}
          t={t}
        />
        <FooterMetric
          label="Dias s/ Movimento"
          value={`${slaInfo.diasSemMov}d`}
          color={slaInfo.diasSemMov > 2 ? t.amber : t.green}
          t={t}
        />
        <FooterMetric
          label="Regra SLA"
          value="D+1 Util"
          color={t.muted}
          t={t}
          sub="Feriados BR incluidos"
          borderRight={false}
        />
      </div>
    </div>
  )
}

// ---------- Footer metric component ----------
interface FooterMetricProps {
  label: string
  value: string
  color: string
  t: ThemeTokens
  sub?: string
  borderRight?: boolean
}

function FooterMetric({ label, value, color, t, sub, borderRight = true }: FooterMetricProps) {
  return (
    <div
      className="px-4 py-2.5"
      style={{ borderRight: borderRight ? `1px solid ${t.border}` : 'none' }}
    >
      <div className="text-[8px] uppercase tracking-wider mb-0.5" style={{ color: t.muted }}>
        {label}
      </div>
      <div className="text-[12px] font-mono font-semibold" style={{ color }}>
        {value}
      </div>
      {sub && (
        <div className="text-[8px] mt-0.5" style={{ color: t.muted }}>
          {sub}
        </div>
      )}
    </div>
  )
}
