'use client'

/* ═══════════════════════════════════════════════════════════════
   UserMenu — botao do header com dropdown contendo info do user
   e acao de logoff (2026-05-23).

   Resolve o bug pre-existente onde o avatar do usuario no header
   do Portal mostrava chevron mas nao abria nada e nao oferecia
   logoff (forcava limpar localStorage manual pra sair).

   Comportamento:
   - Click no botao -> abre/fecha dropdown.
   - Click fora ou ESC -> fecha.
   - Click em "Sair" -> useAuthStore.logout() + router.push('/login').

   Acessibilidade:
   - aria-expanded, aria-haspopup, role="menu", role="menuitem".
   - ESC fecha. Focus management minimo (botao principal mantem foco).
   ═══════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, LogOut } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'


export function UserMenu() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const t = useThemeStore((s) => s.tokens)

  const [open, setOpen] = useState(false)
  const [hover, setHover] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  // Close on click outside
  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  // Close on ESC
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const userInitials = user?.nome
    ? user.nome.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  const displayName = user?.nome?.split(' ').slice(0, 2).join(' ') ?? 'Usuário'
  const role = user?.is_admin ? 'Administrador' : 'Usuário'

  function handleLogout() {
    setOpen(false)
    logout()
    router.push('/login')
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Abrir menu do usuário"
        className="flex items-center gap-2.5 py-1.5 px-2 rounded-xl transition-all"
        style={{
          background: open || hover ? t.surfaceHover : 'transparent',
          border: `1px solid ${open || hover ? t.border : 'transparent'}`,
        }}
      >
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold"
          style={{
            background: `linear-gradient(135deg, ${t.gold}, ${t.goldSoft})`,
            color: '#1A1718',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.04em',
            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.3), 0 4px 10px ${t.goldDim}`,
            border: `1px solid ${t.borderGold}`,
          }}
        >
          {userInitials}
        </div>
        <div className="text-left">
          <div
            className="text-sm font-medium leading-tight"
            style={{
              color: t.text,
              fontFamily: 'var(--font-display)',
              letterSpacing: '-0.005em',
            }}
          >
            {displayName}
          </div>
          <div
            className="text-[10px] leading-tight"
            style={{
              color: t.muted,
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              marginTop: 2,
            }}
          >
            {role}
          </div>
        </div>
        <ChevronDown
          className="w-3.5 h-3.5 transition-transform"
          style={{
            color: t.muted,
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Menu do usuário"
          className="absolute right-0 mt-2 rounded-xl overflow-hidden z-50"
          style={{
            minWidth: 260,
            background: t.surfaceElevated,
            border: `1px solid ${t.border}`,
            boxShadow: '0 10px 32px rgba(0,0,0,0.45), 0 2px 6px rgba(0,0,0,0.25)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
        >
          {/* Header: nome + email */}
          <div className="px-4 py-3" style={{ borderBottom: `1px solid ${t.border}` }}>
            <div
              className="text-sm font-medium"
              style={{
                color: t.text,
                fontFamily: 'var(--font-display)',
                letterSpacing: '-0.005em',
              }}
            >
              {user?.nome ?? 'Usuário'}
            </div>
            {user?.email && (
              <div
                className="text-[11px] mt-0.5 truncate"
                style={{ color: t.muted }}
                title={user.email}
              >
                {user.email}
              </div>
            )}
          </div>

          {/* Sair */}
          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-4 py-2.5 text-left transition-colors"
            style={{
              color: t.text,
              background: 'transparent',
              fontSize: 13,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = t.surfaceHover
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
            }}
          >
            <LogOut size={14} style={{ color: t.muted }} />
            <span>Sair</span>
          </button>
        </div>
      )}
    </div>
  )
}
