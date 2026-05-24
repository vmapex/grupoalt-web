/**
 * Apresentacao de erros consistente para todo o portal.
 *
 * Antes desta extracao: cada feature tinha seu proprio modelo de erro
 * (string em admin/usuarios e portal/admin, ErrorPresentation tipada em
 * chat/chatHelpers). Agora os tipos vivem aqui e cada feature escolhe se
 * usa o `describeAxiosError` generico ou um wrapper com mensagens
 * proprias (ex.: chatHelpers tem messages chat-y).
 */

export type ErrorKind =
  | 'rate_limited_burst'
  | 'rate_limited_daily'
  | 'forbidden'
  | 'not_found'
  | 'payload_too_large'
  | 'conflict'
  | 'unauthorized'
  | 'unavailable'
  | 'unknown'

export type ErrorSeverity = 'rate' | 'error' | 'warn' | 'info'

export interface ErrorPresentation {
  kind: ErrorKind
  message: string
  severity: ErrorSeverity
  /** Apenas para `rate_limited_burst` — segundos sugeridos pelo backend. */
  retryAfterSeconds?: number
}

export interface DescribeOptions {
  /**
   * Substantivo da entidade alvo (ex.: "usuario", "empresa", "categoria").
   * Usado para compor mensagens default tipo "Voce nao tem acesso a este
   * usuario." em 403 e "Usuario nao encontrado." em 404. Se omitido,
   * fallback generico ("este recurso").
   */
  entity?: string
  /**
   * Override por kind. Sobrescreve a mensagem default — util quando o
   * chamador tem texto especifico de contexto (ex.: chatHelpers usa
   * "Limite diario de tokens atingido. Tente novamente amanha." em
   * rate_limited_daily).
   */
  messages?: Partial<Record<ErrorKind, string>>
  /**
   * Prefixo aplicado a TODAS as mensagens (mesmo as `detail` do backend).
   * Util quando o erro ocorre numa acao sobre uma entidade especifica
   * que o usuario precisa identificar (ex.: "Falha ao restaurar Ana: ...").
   */
  prefix?: string
}

interface AxiosLike {
  response?: {
    status?: number
    data?: { detail?: string }
    headers?: Record<string, string>
  }
  message?: string
}

/**
 * Mapeia erro do axios para apresentacao consistente. Cobre todos os
 * status documentados na politica do Orbit + casos comuns dos fluxos
 * admin (409 conflict em restore, 403 RBAC).
 *
 * `unavailable` (5xx ou network) tem severidade `info` por design:
 * features que dependem dele devem **graceful degrade**, nao bloquear
 * a UI.
 */
export function describeAxiosError(
  err: unknown,
  opts: DescribeOptions = {},
): ErrorPresentation {
  const e = err as AxiosLike
  const status = e?.response?.status
  const detail = e?.response?.data?.detail
  const retryAfterRaw = e?.response?.headers?.['retry-after']
  const retryAfterSeconds = retryAfterRaw ? Number(retryAfterRaw) : undefined
  const entity = opts.entity ?? 'este recurso'
  const withPrefix = (msg: string) => (opts.prefix ? `${opts.prefix}: ${msg}` : msg)
  const override = (kind: ErrorKind) => opts.messages?.[kind]

  if (status === 401) {
    return {
      kind: 'unauthorized',
      message: withPrefix(override('unauthorized') ?? 'Sessao expirou. Faca login novamente.'),
      severity: 'warn',
    }
  }
  if (status === 403) {
    return {
      kind: 'forbidden',
      message: withPrefix(override('forbidden') ?? `Voce nao tem acesso a ${entity}.`),
      severity: 'error',
    }
  }
  if (status === 404) {
    return {
      kind: 'not_found',
      message: withPrefix(override('not_found') ?? `${capitalize(entity)} nao encontrado.`),
      severity: 'error',
    }
  }
  if (status === 409) {
    return {
      kind: 'conflict',
      message: withPrefix(override('conflict') ?? detail ?? 'Operacao em conflito com o estado atual.'),
      severity: 'error',
    }
  }
  if (status === 422) {
    return {
      kind: 'payload_too_large',
      message: withPrefix(override('payload_too_large') ?? detail ?? 'Dados invalidos.'),
      severity: 'error',
    }
  }
  if (status === 429) {
    if (retryAfterSeconds && retryAfterSeconds > 0) {
      return {
        kind: 'rate_limited_burst',
        message: withPrefix(
          override('rate_limited_burst') ??
            `Muitas requisicoes. Aguarde ${retryAfterSeconds}s antes de tentar de novo.`,
        ),
        severity: 'rate',
        retryAfterSeconds,
      }
    }
    return {
      kind: 'rate_limited_daily',
      message: withPrefix(
        override('rate_limited_daily') ?? detail ?? 'Limite diario atingido. Tente novamente amanha.',
      ),
      severity: 'rate',
    }
  }
  if (status && status >= 500) {
    return {
      kind: 'unavailable',
      message: withPrefix(
        override('unavailable') ?? 'Servico indisponivel no momento. Tente novamente em alguns instantes.',
      ),
      severity: 'info',
    }
  }
  if (!status) {
    return {
      kind: 'unavailable',
      message: withPrefix(
        override('unavailable') ?? 'Servico indisponivel no momento. Tente novamente em alguns instantes.',
      ),
      severity: 'info',
    }
  }
  return {
    kind: 'unknown',
    message: withPrefix(override('unknown') ?? detail ?? e?.message ?? 'Erro desconhecido.'),
    severity: 'error',
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
