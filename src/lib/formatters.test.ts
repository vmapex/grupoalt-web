/* @vitest-environment node */
import { describe, expect, it } from 'vitest'
import { formatIsoToBr, parseIso, parseDMY, parseApiDate } from './formatters'

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

describe('parseApiDate (fonte unica de data crua — P1-2)', () => {
  const ymd = (d: Date) => [d.getFullYear(), d.getMonth(), d.getDate()]

  it('parseia ISO YYYY-MM-DD', () => {
    expect(ymd(parseApiDate('2026-06-30')!)).toEqual([2026, 5, 30])
    expect(ymd(parseApiDate('2026-01-01')!)).toEqual([2026, 0, 1])
  })

  it('parseia ISO com componente de hora (slice 10)', () => {
    expect(ymd(parseApiDate('2026-06-30T12:00:00Z')!)).toEqual([2026, 5, 30])
    expect(ymd(parseApiDate('2026-06-30T00:00:00.000Z')!)).toEqual([2026, 5, 30])
  })

  it('parseia o legado DD/MM/YYYY', () => {
    expect(ymd(parseApiDate('30/06/2026')!)).toEqual([2026, 5, 30])
  })

  it('ISO e DMY do mesmo dia produzem a mesma Date', () => {
    expect(parseApiDate('2026-06-30')!.getTime()).toBe(parseApiDate('30/06/2026')!.getTime())
  })

  it('retorna null para null/undefined/vazio', () => {
    expect(parseApiDate(null)).toBeNull()
    expect(parseApiDate(undefined)).toBeNull()
    expect(parseApiDate('')).toBeNull()
  })

  it('rejeita mes fora de 1-12 (sem rollover do new Date)', () => {
    // Regressao: new Date(2026,12,15) rolaria pra Jan/2027 silenciosamente.
    expect(parseApiDate('2026-13-15')).toBeNull()
    expect(parseApiDate('2026-00-15')).toBeNull()
    expect(parseApiDate('15/13/2026')).toBeNull()
  })

  it('rejeita dia fora de 1-31 (sem rollover do new Date)', () => {
    expect(parseApiDate('2026-06-32')).toBeNull()
    expect(parseApiDate('2026-06-00')).toBeNull()
  })

  it('rejeita lixo / formato invalido', () => {
    expect(parseApiDate('foo')).toBeNull()
    expect(parseApiDate('2026-ab-cd')).toBeNull()
    expect(parseApiDate('XX/YY/ZZZZ')).toBeNull()
  })
})
