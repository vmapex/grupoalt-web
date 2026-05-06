/**
 * Helpers do ChatPanel — Step 16 Fase B.
 *
 * Mantem em modulo proprio (puro, sem React) para que sejam testaveis
 * diretamente via Vitest sem montar o componente. Espelha os limites do
 * backend definidos em `docs/plano-acao-seguranca/orbit-policy.md`
 * (no repo grupoalt-api):
 *
 *  - max 4000 chars por mensagem (`content`)
 *  - max 20 mensagens por request (`messages`)
 *  - 429 com `Retry-After` = rate limit por minuto (burst)
 *  - 429 sem `Retry-After` = limite diario de tokens
 */

export const MAX_MSG_CHARS = 4000
export const MAX_MESSAGES = 20

export interface ChatMessageLike {
  role: 'user' | 'assistant'
  content: string
}

/**
 * Mantem as `MAX_MESSAGES` mais recentes do historico e garante que a
 * sequencia comece com `user` — o backend rejeita historico que comece
 * com `assistant` (e o LLM se confunde com isso).
 */
export function trimHistoryForApi(messages: ChatMessageLike[]): ChatMessageLike[] {
  const tail = messages.slice(-MAX_MESSAGES)
  while (tail.length > 0 && tail[0].role !== 'user') {
    tail.shift()
  }
  return tail
}

export type ValidationReason = 'empty' | 'too_long'

export interface ValidationOk {
  ok: true
}
export interface ValidationFail {
  ok: false
  reason: ValidationReason
  message: string
}
export type ValidationResult = ValidationOk | ValidationFail

/**
 * Valida o texto antes de enviar ao backend. Retorna `{ ok: false, ... }`
 * com mensagem amigavel quando passa de 4000 chars ou quando esta vazio
 * (para que o ChatPanel mostre na UI sem precisar de round trip).
 */
export function validateOutgoing(text: string): ValidationResult {
  const trimmed = text.trim()
  if (!trimmed) {
    return { ok: false, reason: 'empty', message: 'Digite uma mensagem.' }
  }
  if (trimmed.length > MAX_MSG_CHARS) {
    return {
      ok: false,
      reason: 'too_long',
      message: `Mensagem muito longa (${trimmed.length}/${MAX_MSG_CHARS} caracteres). Reduza o texto antes de enviar.`,
    }
  }
  return { ok: true }
}

export type ErrorKind =
  | 'rate_limited_burst'
  | 'rate_limited_daily'
  | 'forbidden'
  | 'not_found'
  | 'payload_too_large'
  | 'unauthorized'
  | 'unavailable'
  | 'unknown'

export type ErrorSeverity = 'rate' | 'error' | 'warn' | 'info'

export interface ErrorPresentation {
  kind: ErrorKind
  message: string
  severity: ErrorSeverity
  retryAfterSeconds?: number
}

/**
 * Mapeia um erro do axios para uma apresentacao consistente — texto pronto
 * para exibir e severidade que controla cor do banner. Cobre todos os
 * status documentados na politica do Orbit (orbit-policy.md secao 8).
 *
 * Status `unavailable` (network error ou 5xx) e' a chave da "graceful
 * degradation": o portal continua funcionando se o Orbit cair.
 */
export function describeAxiosError(err: unknown): ErrorPresentation {
  // Acessar campos de forma segura sem dependencia direta de tipos do axios.
  const e = err as {
    response?: {
      status?: number
      data?: { detail?: string }
      headers?: Record<string, string>
    }
  }
  const status = e?.response?.status
  const detail = e?.response?.data?.detail
  const retryAfterRaw = e?.response?.headers?.['retry-after']
  const retryAfterSeconds = retryAfterRaw ? Number(retryAfterRaw) : undefined

  if (status === 401) {
    return {
      kind: 'unauthorized',
      message: 'Sessao expirou. Faca login novamente.',
      severity: 'warn',
    }
  }
  if (status === 403) {
    return {
      kind: 'forbidden',
      message: 'Voce nao tem acesso aos dados desta empresa.',
      severity: 'error',
    }
  }
  if (status === 404) {
    return {
      kind: 'not_found',
      message: 'Empresa nao encontrada.',
      severity: 'error',
    }
  }
  if (status === 422) {
    return {
      kind: 'payload_too_large',
      message: detail || 'Mensagem invalida ou muito longa.',
      severity: 'error',
    }
  }
  if (status === 429) {
    // Backend distingue: rate-limit-burst usa header Retry-After; limite
    // diario nao usa. (orbit-policy.md sec. 5)
    if (retryAfterSeconds && retryAfterSeconds > 0) {
      return {
        kind: 'rate_limited_burst',
        message: `Muitas perguntas. Aguarde ${retryAfterSeconds}s antes de tentar de novo.`,
        severity: 'rate',
        retryAfterSeconds,
      }
    }
    return {
      kind: 'rate_limited_daily',
      message: detail || 'Limite diario de tokens atingido. Tente novamente amanha.',
      severity: 'rate',
    }
  }
  if (status && status >= 500) {
    return {
      kind: 'unavailable',
      message: 'Orbit indisponivel no momento. O portal continua funcionando normalmente.',
      severity: 'info',
    }
  }
  if (!status) {
    return {
      kind: 'unavailable',
      message: 'Orbit indisponivel no momento. O portal continua funcionando normalmente.',
      severity: 'info',
    }
  }
  return {
    kind: 'unknown',
    message: detail || 'Erro ao enviar mensagem.',
    severity: 'error',
  }
}
