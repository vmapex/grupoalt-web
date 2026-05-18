/* @vitest-environment node */
import { describe, expect, it } from 'vitest'
import { formatIsoToBr, parseIso, parseDMY } from './formatters'

describe('formatIsoToBr (P1-2 Camada 2.2b.2)', () => {
  it('converte ISO YYYY-MM-DD para DD/MM/YYYY', () => {
    expect(formatIsoToBr('2026-03-15')).toBe('15/03/2026')
    expect(formatIsoToBr('2026-01-01')).toBe('01/01/2026')
    expect(formatIsoToBr('2025-12-31')).toBe('31/12/2025')
  })

  it('aceita ISO datetime e pega so a parte de data', () => {
    expect(formatIsoToBr('2026-03-15T10:30:00Z')).toBe('15/03/2026')
    expect(formatIsoToBr('2026-03-15T00:00:00.000Z')).toBe('15/03/2026')
  })

  it('retorna string vazia para null/undefined/vazio', () => {
    expect(formatIsoToBr(null)).toBe('')
    expect(formatIsoToBr(undefined)).toBe('')
    expect(formatIsoToBr('')).toBe('')
  })

  it('retorna raw quando nao bate formato ISO (compat com legados)', () => {
    expect(formatIsoToBr('foo')).toBe('foo')
    expect(formatIsoToBr('15/03/2026')).toBe('15/03/2026')  // ja DD/MM/YYYY
  })

  it('idempotencia: aplicar 2x mantem DD/MM/YYYY', () => {
    const once = formatIsoToBr('2026-03-15')
    const twice = formatIsoToBr(once)
    expect(twice).toBe('15/03/2026')
  })
})

describe('parseIso (P1-2 Camada 2.2b.2)', () => {
  it('parseia ISO valido para Date', () => {
    const d = parseIso('2026-03-15')
    expect(d).not.toBeNull()
    expect(d!.getFullYear()).toBe(2026)
    expect(d!.getMonth()).toBe(2)  // 0-indexed
    expect(d!.getDate()).toBe(15)
  })

  it('retorna null para invalidos', () => {
    expect(parseIso(null)).toBeNull()
    expect(parseIso(undefined)).toBeNull()
    expect(parseIso('')).toBeNull()
    expect(parseIso('15/03/2026')).toBeNull()  // nao eh ISO
    expect(parseIso('foo')).toBeNull()
  })
})

describe('parseDMY (legado, pre-P1-2)', () => {
  it('continua parseando DD/MM/YYYY (compat com codigo nao migrado)', () => {
    const d = parseDMY('15/03/2026')
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(2)
    expect(d.getDate()).toBe(15)
  })
})
