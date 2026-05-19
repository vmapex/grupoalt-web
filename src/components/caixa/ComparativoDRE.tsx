'use client'
/* ═══════════════════════════════════════════════════════════════
   ComparativoDRE — Fase 5.F

   Componente DEV-ONLY que renderiza lado a lado o DRE calculado
   localmente (`calcularDRE` em `planoContas.ts`) e o DRE vindo
   do endpoint backend (`useDRE`), com diff numerico.

   Aparece automaticamente em NODE_ENV != 'production'. Pode ser
   forcado em staging via `NEXT_PUBLIC_DRE_COMPARATIVO=true`.

   Esconde quando ambos sao null. Esconde tambem em prod sem o
   escape hatch (gated pelo `featureFlags.useDREComparativo`).
   ═══════════════════════════════════════════════════════════════ */

import { useState } from 'react'
import { useThemeStore } from '@/store/themeStore'
import { fmtK } from '@/lib/formatters'
import type { DRESubtotais } from '@/hooks/useDRE'
import { useDREComparativo } from '@/lib/featureFlags'

/** Subset de campos usados pelo Caixa BI executivo. Mantemos
 *  apenas os 9 que aparecem no DRESidebar/footer pra evitar
 *  ruido visual. */
const LINHAS: Array<{ key: keyof DRESubtotais; label: string }> = [
  { key: 'RoB', label: 'RoB' },
  { key: 'TDCF', label: 'TDCF' },
  { key: 'CV', label: 'CV' },
  { key: 'MC', label: 'MC' },
  { key: 'CF', label: 'CF' },
  { key: 'EBT1', label: 'EBT1' },
  { key: 'RNOP', label: 'RNOP' },
  { key: 'DNOP', label: 'DNOP' },
  { key: 'EBT2', label: 'EBT2' },
]

export interface DREComparativoLocal {
  RoB: number
  TDCF: number
  CV: number
  MC: number
  CF: number
  EBT1: number
  RNOP: number
  DNOP: number
  EBT2: number
}

interface ComparativoDREProps {
  /** DRE calculado localmente (subset do shape do `calcularDRE`).
   *  Use o mesmo objeto `dreData` ja consumido pelas paginas. */
  local: DREComparativoLocal | null
  /** DRE vindo do backend. `subtotais` do `useDRE`. */
  backend: DRESubtotais | null
  /** Threshold absoluto pra destacar diff. Default 0.01 (1 centavo). */
  threshold?: number
}

/** Comparativo dev-only de DRE local vs backend.
 *
 *  Render como bolha flutuante no canto inferior direito da viewport.
 *  Pode ser minimizado/expandido. Em prod (sem escape hatch) retorna
 *  null sem ocupar DOM. */
export function ComparativoDRE({
  local,
  backend,
  threshold = 0.01,
}: ComparativoDREProps) {
  const t = useThemeStore((s) => s.tokens)
  const enabled = useDREComparativo()
  const [collapsed, setCollapsed] = useState(false)

  if (!enabled) return null
  if (!local && !backend) return null

  const diffs = LINHAS.map(({ key, label }) => {
    const localVal = local ? (local as unknown as Record<string, number>)[key] : null
    const backendVal = backend ? backend[key] : null
    const diff =
      localVal !== null && backendVal !== null ? backendVal - localVal : null
    const flagged = diff !== null && Math.abs(diff) > threshold
    return { key, label, localVal, backendVal, diff, flagged }
  })

  const totalFlagged = diffs.filter((d) => d.flagged).length
  const headerColor = totalFlagged > 0 ? t.red : t.green

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 12,
        right: 12,
        zIndex: 9999,
        background: t.surface,
        border: `1px solid ${headerColor}`,
        borderRadius: 8,
        boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
        fontFamily: 'monospace',
        fontSize: 11,
        minWidth: collapsed ? 0 : 320,
        maxWidth: 380,
      }}
      role="region"
      aria-label="Comparativo DRE local vs backend (dev)"
    >
      <div
        onClick={() => setCollapsed((c) => !c)}
        style={{
          padding: '6px 10px',
          cursor: 'pointer',
          background: `${headerColor}22`,
          color: headerColor,
          fontWeight: 'bold',
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span>
          DRE local vs backend
          {totalFlagged > 0
            ? ` — ${totalFlagged} divergencia${totalFlagged > 1 ? 's' : ''}`
            : ' — OK'}
        </span>
        <span style={{ fontSize: 14 }}>{collapsed ? '▸' : '▾'}</span>
      </div>

      {!collapsed && (
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            color: t.text,
          }}
        >
          <thead>
            <tr style={{ color: t.muted, fontSize: 9, textTransform: 'uppercase' }}>
              <th style={{ textAlign: 'left', padding: '4px 8px' }}>Linha</th>
              <th style={{ textAlign: 'right', padding: '4px 8px' }}>Local</th>
              <th style={{ textAlign: 'right', padding: '4px 8px' }}>Backend</th>
              <th style={{ textAlign: 'right', padding: '4px 8px' }}>Δ</th>
            </tr>
          </thead>
          <tbody>
            {diffs.map((d) => (
              <tr
                key={d.key}
                style={{
                  borderTop: `1px solid ${t.border}`,
                  background: d.flagged ? `${t.red}11` : 'transparent',
                  color: d.flagged ? t.red : t.text,
                }}
              >
                <td style={{ padding: '3px 8px' }}>{d.label}</td>
                <td style={{ textAlign: 'right', padding: '3px 8px' }}>
                  {d.localVal === null ? '—' : fmtK(d.localVal)}
                </td>
                <td style={{ textAlign: 'right', padding: '3px 8px' }}>
                  {d.backendVal === null ? '—' : fmtK(d.backendVal)}
                </td>
                <td style={{ textAlign: 'right', padding: '3px 8px' }}>
                  {d.diff === null
                    ? '—'
                    : d.flagged
                      ? fmtK(d.diff)
                      : '≈0'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
