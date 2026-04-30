'use client'

import Link from 'next/link'
import { ShieldAlert } from 'lucide-react'
import { useThemeStore } from '@/store/themeStore'

interface AccessDeniedProps {
  /** Texto principal. Default: mensagem generica. */
  message?: string
  /** Onde levar o usuario quando ele clicar em "Voltar". Default: /portal/grupo. */
  homeHref?: string
  /** Texto do botao. Default: "Voltar para o portal". */
  homeLabel?: string
}

export function AccessDenied({
  message = 'Voce nao tem permissao para acessar esta area.',
  homeHref = '/portal/grupo',
  homeLabel = 'Voltar para o portal',
}: AccessDeniedProps) {
  const t = useThemeStore((s) => s.tokens)

  return (
    <div
      className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center"
      role="alert"
      aria-live="polite"
    >
      <div
        className="flex items-center justify-center rounded-2xl mb-5"
        style={{
          width: 64,
          height: 64,
          background: t.surface,
          border: `1px solid ${t.border}`,
          color: t.gold,
        }}
      >
        <ShieldAlert size={28} />
      </div>
      <div
        className="text-[10px] mb-2"
        style={{
          color: t.gold,
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
        }}
      >
        403 — Acesso negado
      </div>
      <h1
        className="text-lg mb-2"
        style={{
          color: t.text,
          fontFamily: 'var(--font-display)',
          letterSpacing: '-0.01em',
        }}
      >
        {message}
      </h1>
      <p className="text-[12px] mb-6 max-w-md" style={{ color: t.muted }}>
        Se voce acredita que isso e um engano, fale com o administrador da sua
        empresa para revisar suas permissoes.
      </p>
      <Link
        href={homeHref}
        className="px-4 py-2 rounded-xl text-[12px] no-underline transition-all"
        style={{
          background: t.surface,
          border: `1px solid ${t.border}`,
          color: t.text,
        }}
      >
        {homeLabel}
      </Link>
    </div>
  )
}
