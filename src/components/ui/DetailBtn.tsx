'use client'
import { useState } from 'react'

interface DetailBtnProps {
  onClick: () => void
  color: string
}

export function DetailBtn({ onClick, color }: DetailBtnProps) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[8px] font-mono tracking-wide cursor-pointer transition-all mt-1.5"
      style={{
        background: hovered ? `${color}22` : `${color}10`,
        border: `1px solid ${hovered ? `${color}55` : `${color}30`}`,
        color,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      Detalhar →
    </button>
  )
}
