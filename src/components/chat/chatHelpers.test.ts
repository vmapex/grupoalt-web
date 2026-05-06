import { describe, expect, it } from 'vitest'
import {
  MAX_MESSAGES,
  MAX_MSG_CHARS,
  describeAxiosError,
  trimHistoryForApi,
  validateOutgoing,
} from './chatHelpers'

describe('trimHistoryForApi', () => {
  it('mantem listas curtas inalteradas', () => {
    const msgs = [
      { role: 'user' as const, content: 'oi' },
      { role: 'assistant' as const, content: 'ola' },
      { role: 'user' as const, content: 'tudo bem?' },
    ]
    expect(trimHistoryForApi(msgs)).toEqual(msgs)
  })

  it('corta para as ultimas MAX_MESSAGES quando excede', () => {
    const msgs = Array.from({ length: 25 }, (_, i) => ({
      role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
      content: `m${i}`,
    }))
    const trimmed = trimHistoryForApi(msgs)
    // Slice de 20 (25-20=5..24) comeca com m5 (assistant, indice impar).
    // O guard descarta a assistant orfa -> sobra m6..m24 = 19 itens.
    expect(trimmed.length).toBeLessThanOrEqual(MAX_MESSAGES)
    expect(trimmed).toHaveLength(19)
    expect(trimmed[0]).toMatchObject({ role: 'user', content: 'm6' })
    expect(trimmed[trimmed.length - 1]).toMatchObject({ content: 'm24' })
  })

  it('corta para exatamente MAX_MESSAGES quando o slice ja comeca com user', () => {
    // 24 itens, slice(-20) = 4..23. Indice 4 e par -> user. Nao remove.
    const msgs = Array.from({ length: 24 }, (_, i) => ({
      role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
      content: `m${i}`,
    }))
    const trimmed = trimHistoryForApi(msgs)
    expect(trimmed).toHaveLength(MAX_MESSAGES)
    expect(trimmed[0]).toMatchObject({ role: 'user', content: 'm4' })
  })

  it('descarta assistant orfa no inicio apos corte', () => {
    // Constroi historico cuja janela de 20 comeca com assistant (orfa).
    const msgs: { role: 'user' | 'assistant'; content: string }[] = []
    for (let i = 0; i < 22; i++) {
      msgs.push({ role: i % 2 === 0 ? 'user' : 'assistant', content: `m${i}` })
    }
    const trimmed = trimHistoryForApi(msgs)
    expect(trimmed[0].role).toBe('user')
    expect(trimmed.length).toBeLessThanOrEqual(MAX_MESSAGES)
  })

  it('retorna lista vazia se todas as mensagens forem assistant', () => {
    const msgs = Array.from({ length: 3 }, (_, i) => ({
      role: 'assistant' as const,
      content: `a${i}`,
    }))
    expect(trimHistoryForApi(msgs)).toEqual([])
  })

  it('preserva ordem cronologica dos itens mantidos', () => {
    const msgs = [
      { role: 'user' as const, content: 'primeiro' },
      { role: 'assistant' as const, content: 'segundo' },
      { role: 'user' as const, content: 'terceiro' },
    ]
    expect(trimHistoryForApi(msgs).map((m) => m.content)).toEqual([
      'primeiro',
      'segundo',
      'terceiro',
    ])
  })
})

describe('validateOutgoing', () => {
  it('aceita texto simples', () => {
    expect(validateOutgoing('qual o saldo?')).toEqual({ ok: true })
  })

  it('rejeita string vazia', () => {
    expect(validateOutgoing('')).toMatchObject({ ok: false, reason: 'empty' })
  })

  it('rejeita whitespace puro', () => {
    expect(validateOutgoing('   \n\t  ')).toMatchObject({ ok: false, reason: 'empty' })
  })

  it('aceita exatamente MAX_MSG_CHARS chars (limite inclusivo)', () => {
    const text = 'a'.repeat(MAX_MSG_CHARS)
    expect(validateOutgoing(text)).toEqual({ ok: true })
  })

  it('rejeita 1 char a mais que MAX_MSG_CHARS', () => {
    const text = 'a'.repeat(MAX_MSG_CHARS + 1)
    const r = validateOutgoing(text)
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.reason).toBe('too_long')
      expect(r.message).toContain(`${MAX_MSG_CHARS}`)
    }
  })

  it('considera trim antes de medir comprimento', () => {
    const text = '  ' + 'a'.repeat(MAX_MSG_CHARS) + '  '
    expect(validateOutgoing(text)).toEqual({ ok: true })
  })
})

// Helpers para construir erros do axios sem importar a lib.
function axiosLikeError({
  status,
  detail,
  retryAfter,
}: {
  status?: number
  detail?: string
  retryAfter?: string
}): unknown {
  return {
    response: {
      status,
      data: detail ? { detail } : undefined,
      headers: retryAfter ? { 'retry-after': retryAfter } : {},
    },
  }
}

describe('describeAxiosError', () => {
  it('mapeia 401 para unauthorized', () => {
    const err = axiosLikeError({ status: 401 })
    expect(describeAxiosError(err)).toMatchObject({
      kind: 'unauthorized',
      severity: 'warn',
    })
  })

  it('mapeia 403 para forbidden com mensagem clara', () => {
    const err = axiosLikeError({ status: 403, detail: 'Sem acesso' })
    const out = describeAxiosError(err)
    expect(out.kind).toBe('forbidden')
    expect(out.severity).toBe('error')
    expect(out.message).toContain('acesso')
  })

  it('mapeia 404 para not_found', () => {
    expect(describeAxiosError(axiosLikeError({ status: 404 })).kind).toBe('not_found')
  })

  it('mapeia 422 para payload_too_large com detail do servidor', () => {
    const out = describeAxiosError(
      axiosLikeError({ status: 422, detail: 'Mensagem muito longa.' }),
    )
    expect(out.kind).toBe('payload_too_large')
    expect(out.message).toBe('Mensagem muito longa.')
  })

  it('mapeia 429 com Retry-After para rate_limited_burst', () => {
    const out = describeAxiosError(
      axiosLikeError({ status: 429, retryAfter: '42', detail: 'Muitas tentativas' }),
    )
    expect(out.kind).toBe('rate_limited_burst')
    expect(out.severity).toBe('rate')
    expect(out.retryAfterSeconds).toBe(42)
    expect(out.message).toContain('42s')
  })

  it('mapeia 429 sem Retry-After para rate_limited_daily', () => {
    const out = describeAxiosError(
      axiosLikeError({
        status: 429,
        detail: 'Limite diario de tokens atingido (5000 tokens/dia). Tente novamente amanha.',
      }),
    )
    expect(out.kind).toBe('rate_limited_daily')
    expect(out.severity).toBe('rate')
    expect(out.message).toContain('Limite diario')
  })

  it('mapeia 500 para unavailable (graceful degradation)', () => {
    const out = describeAxiosError(axiosLikeError({ status: 500, detail: 'oops' }))
    expect(out.kind).toBe('unavailable')
    expect(out.severity).toBe('info')
    expect(out.message).toContain('Orbit indisponivel')
  })

  it('mapeia 502/503/504 para unavailable', () => {
    expect(describeAxiosError(axiosLikeError({ status: 502 })).kind).toBe('unavailable')
    expect(describeAxiosError(axiosLikeError({ status: 503 })).kind).toBe('unavailable')
    expect(describeAxiosError(axiosLikeError({ status: 504 })).kind).toBe('unavailable')
  })

  it('mapeia network error (sem response) para unavailable', () => {
    expect(describeAxiosError({ message: 'Network Error' }).kind).toBe('unavailable')
    expect(describeAxiosError(undefined).kind).toBe('unavailable')
    expect(describeAxiosError(null).kind).toBe('unavailable')
  })

  it('Retry-After=0 nao e tratado como burst', () => {
    // Retry-After: 0 nao faz sentido pratico — caimos no caminho daily.
    const out = describeAxiosError(
      axiosLikeError({ status: 429, retryAfter: '0', detail: 'Limite diario' }),
    )
    expect(out.kind).toBe('rate_limited_daily')
  })

  it('mapeia status desconhecido (418) para unknown com detail', () => {
    const out = describeAxiosError(
      axiosLikeError({ status: 418, detail: 'sou um bule de cha' }),
    )
    expect(out.kind).toBe('unknown')
    expect(out.severity).toBe('error')
    expect(out.message).toBe('sou um bule de cha')
  })

  it('fallback de mensagem quando nao ha detail', () => {
    const out = describeAxiosError(axiosLikeError({ status: 418 }))
    expect(out.message).toBe('Erro ao enviar mensagem.')
  })
})
