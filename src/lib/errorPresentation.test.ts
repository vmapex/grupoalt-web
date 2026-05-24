import { describe, expect, it } from 'vitest'
import { describeAxiosError, type ErrorPresentation } from './errorPresentation'

/**
 * Lib compartilhado de apresentacao de erros (extraido de chatHelpers
 * em 2026-05-24). Tests cobrem o mapeamento de cada status -> kind +
 * severity + message, alem das opcoes (`entity`, `prefix`, `messages`).
 *
 * Equivalencia com chatHelpers.describeAxiosError eh garantida pelos
 * 24 testes existentes em chatHelpers.test.ts (que continuam verde
 * apos a extracao por o tipo eh re-exportado).
 */

function makeErr(status: number, detail?: string, headers?: Record<string, string>) {
  return {
    response: { status, data: detail ? { detail } : {}, headers: headers ?? {} },
  }
}

describe('describeAxiosError', () => {
  it('401 -> unauthorized + severity warn', () => {
    const r = describeAxiosError(makeErr(401))
    expect(r.kind).toBe('unauthorized')
    expect(r.severity).toBe('warn')
    expect(r.message).toContain('Sessao expirou')
  })

  it('403 -> forbidden + severity error, usa `entity` no fallback', () => {
    const r = describeAxiosError(makeErr(403), { entity: 'usuario' })
    expect(r.kind).toBe('forbidden')
    expect(r.severity).toBe('error')
    expect(r.message).toBe('Voce nao tem acesso a usuario.')
  })

  it('403 com entity default -> "este recurso"', () => {
    const r = describeAxiosError(makeErr(403))
    expect(r.message).toBe('Voce nao tem acesso a este recurso.')
  })

  it('404 -> not_found + capitaliza entity', () => {
    const r = describeAxiosError(makeErr(404), { entity: 'empresa' })
    expect(r.kind).toBe('not_found')
    expect(r.message).toBe('Empresa nao encontrado.')
  })

  it('409 -> conflict + usa detail do backend', () => {
    const r = describeAxiosError(makeErr(409, 'Usuario ja foi restaurado'))
    expect(r.kind).toBe('conflict')
    expect(r.severity).toBe('error')
    expect(r.message).toBe('Usuario ja foi restaurado')
  })

  it('409 sem detail -> fallback generico', () => {
    const r = describeAxiosError(makeErr(409))
    expect(r.message).toBe('Operacao em conflito com o estado atual.')
  })

  it('422 -> payload_too_large + usa detail', () => {
    const r = describeAxiosError(makeErr(422, 'Mensagem muito longa'))
    expect(r.kind).toBe('payload_too_large')
    expect(r.message).toBe('Mensagem muito longa')
  })

  it('429 COM Retry-After -> rate_limited_burst + segundos', () => {
    const r = describeAxiosError(makeErr(429, undefined, { 'retry-after': '30' }))
    expect(r.kind).toBe('rate_limited_burst')
    expect(r.severity).toBe('rate')
    expect(r.retryAfterSeconds).toBe(30)
    expect(r.message).toContain('Aguarde 30s')
  })

  it('429 SEM Retry-After -> rate_limited_daily', () => {
    const r = describeAxiosError(makeErr(429))
    expect(r.kind).toBe('rate_limited_daily')
    expect(r.severity).toBe('rate')
    expect(r.retryAfterSeconds).toBeUndefined()
  })

  it('500 -> unavailable + severity info (graceful degrade)', () => {
    const r = describeAxiosError(makeErr(500))
    expect(r.kind).toBe('unavailable')
    expect(r.severity).toBe('info')
  })

  it('503 -> unavailable + severity info', () => {
    const r = describeAxiosError(makeErr(503))
    expect(r.kind).toBe('unavailable')
    expect(r.severity).toBe('info')
  })

  it('network error (sem response) -> unavailable + info', () => {
    const r = describeAxiosError({ message: 'Network Error' })
    expect(r.kind).toBe('unavailable')
    expect(r.severity).toBe('info')
  })

  it('status desconhecido (418) -> unknown + usa detail', () => {
    const r = describeAxiosError(makeErr(418, 'Sou um bule'))
    expect(r.kind).toBe('unknown')
    expect(r.severity).toBe('error')
    expect(r.message).toBe('Sou um bule')
  })

  it('status desconhecido sem detail -> fallback err.message', () => {
    const r = describeAxiosError({
      response: { status: 418, data: {} },
      message: 'fallback msg',
    })
    expect(r.message).toBe('fallback msg')
  })

  // ─── Options ────────────────────────────────────────────────────────────

  it('prefix prepende a mensagem com separador ": "', () => {
    const r = describeAxiosError(makeErr(404), {
      entity: 'usuario',
      prefix: 'Falha ao restaurar Ana',
    })
    expect(r.message).toBe('Falha ao restaurar Ana: Usuario nao encontrado.')
  })

  it('messages override sobrescreve a mensagem default por kind', () => {
    const r = describeAxiosError(makeErr(429, undefined, { 'retry-after': '60' }), {
      messages: { rate_limited_burst: 'Calma, doutor.' },
    })
    expect(r.kind).toBe('rate_limited_burst')
    expect(r.message).toBe('Calma, doutor.')
    expect(r.retryAfterSeconds).toBe(60)
  })

  it('messages override + prefix combinam', () => {
    const r = describeAxiosError(makeErr(403), {
      prefix: 'Operacao bloqueada',
      messages: { forbidden: 'admin requer aprovacao' },
    })
    expect(r.message).toBe('Operacao bloqueada: admin requer aprovacao')
  })

  it('null/undefined err nao quebra (cai em unavailable)', () => {
    const a = describeAxiosError(null)
    expect(a.kind).toBe('unavailable')
    const b = describeAxiosError(undefined)
    expect(b.kind).toBe('unavailable')
  })

  // Type-level sanity: retorno satisfaz ErrorPresentation
  it('retorno sempre tem kind, message, severity', () => {
    const cases = [makeErr(401), makeErr(403), makeErr(409), makeErr(500), null]
    for (const c of cases) {
      const r: ErrorPresentation = describeAxiosError(c)
      expect(r.kind).toBeTruthy()
      expect(r.message).toBeTruthy()
      expect(r.severity).toBeTruthy()
    }
  })
})
