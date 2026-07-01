/* @vitest-environment node */
import { describe, expect, it } from 'vitest'
import { isBusinessDay, nextBusinessDay, fmtDateBR, FERIADOS } from './sla'

/**
 * sla.ts — consumidores ISO da conciliação (nextBusinessDay/fmtDateBR/
 * isBusinessDay leem `entry.date` que vem de transformConcilMovimento). O fix
 * P1-2 restaurou a chave/`date` em ISO justamente para alimentar estas
 * funções (todas fazem `key.split('-')`). Cobertura de regressão do contrato.
 *
 * Âncora de calendário: 2026-01-01 é QUINTA (Jan/1/2024=seg → +2 anos não
 * bissexto+bissexto → qui). Logo 01-02=sex, 01-03=sáb, 01-04=dom, 01-05=seg.
 */
describe('isBusinessDay', () => {
  it('dia útil comum é true', () => {
    expect(isBusinessDay(new Date(2026, 0, 5))).toBe(true) // segunda
  })
  it('sábado e domingo são false', () => {
    expect(isBusinessDay(new Date(2026, 0, 3))).toBe(false) // sábado
    expect(isBusinessDay(new Date(2026, 0, 4))).toBe(false) // domingo
  })
  it('feriado (mesmo em dia de semana) é false', () => {
    expect(FERIADOS.has('2026-01-01')).toBe(true)
    expect(isBusinessDay(new Date(2026, 0, 1))).toBe(false) // quinta, mas feriado
  })
})

describe('nextBusinessDay (D+1 útil, consome chave ISO)', () => {
  it('pula o fim de semana (sexta → segunda)', () => {
    const d = nextBusinessDay('2026-01-02') // sexta
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 0, 5]) // segunda
  })
  it('pula feriado BR (24/dez → 26/dez, pulando o Natal)', () => {
    const d = nextBusinessDay('2025-12-24')
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2025, 11, 26])
  })
  it('resultado é sempre um dia útil > entrada', () => {
    const base = new Date(2026, 0, 2)
    const d = nextBusinessDay('2026-01-02')
    expect(isBusinessDay(d)).toBe(true)
    expect(d.getTime()).toBeGreaterThan(base.getTime())
  })
})

describe('fmtDateBR (ISO → DD/MM/YYYY)', () => {
  it('formata chave ISO', () => {
    expect(fmtDateBR('2026-06-30')).toBe('30/06/2026')
    expect(fmtDateBR('2026-01-01')).toBe('01/01/2026')
  })
  it('vazio vira travessão', () => {
    expect(fmtDateBR('')).toBe('—')
  })
})
