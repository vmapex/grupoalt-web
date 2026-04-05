'use client'
import { useThemeStore } from '@/store/themeStore'

interface SortHeaderProps {
  label: string
  field: string
  sort: { field: string; dir: string }
  onSort: (field: string) => void
  align?: 'left' | 'right' | 'center'
}

export function SortHeader({ label, field, sort, onSort, align = 'left' }: SortHeaderProps) {
  const t = useThemeStore((s) => s.tokens)
  const active = sort.field === field
  const arrow = active ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''
  return (
    <th
      scope="col"
      role="columnheader"
      aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      onClick={() => onSort(field)}
      className="cursor-pointer select-none whitespace-nowrap font-mono transition-colors"
      style={{
        padding: '10px 14px',
        textAlign: align,
        fontSize: 9,
        fontWeight: 600,
        color: active ? t.blue : t.muted,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        borderBottom: `1px solid ${active ? `${t.blue}44` : t.border}`,
      }}
    >
      {label}
      {arrow && (
        <span className="ml-0.5 text-[7px] opacity-80">{arrow}</span>
      )}
    </th>
  )
}
