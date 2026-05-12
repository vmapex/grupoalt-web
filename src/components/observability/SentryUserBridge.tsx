'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import { useAuthStore } from '@/store/authStore'
import { useEmpresaStore } from '@/store/empresaStore'

/**
 * Propaga `user` (auth) e `empresa_id` (empresa ativa) como contexto
 * Sentry — permite filtrar erros por usuário e empresa no painel.
 *
 * Se NEXT_PUBLIC_SENTRY_DSN não estiver configurado, Sentry.setUser /
 * Sentry.setTag são no-op. Não há custo de runtime fora isso.
 *
 * Decisão de PII: enviamos APENAS `id` e `username` (nome). O `email`
 * é deliberadamente omitido — para identificar usuário em incidente,
 * basta o id (lookup em DB pelo admin). Mantém compromisso de
 * `sendDefaultPii=false` configurado em `sentry.client.config.ts`.
 */
export function SentryUserBridge() {
  const user = useAuthStore((s) => s.user)
  const activeId = useEmpresaStore((s) => s.activeId)

  useEffect(() => {
    if (user) {
      Sentry.setUser({
        id: String(user.id),
        username: user.nome,
      })
    } else {
      Sentry.setUser(null)
    }
  }, [user])

  useEffect(() => {
    if (activeId) {
      Sentry.setTag('empresa_id', activeId)
    } else {
      // Limpa a tag se a empresa for desativada (logout, troca, etc).
      Sentry.setTag('empresa_id', undefined as unknown as string)
    }
  }, [activeId])

  return null
}
