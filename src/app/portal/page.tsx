'use client'

/* ═══════════════════════════════════════════════════════════════
   Dashboard inicial do Portal — Fase B (2026-05-23).

   Substitui o antigo `redirect('/portal/grupo')`. Renderiza grid
   de cards condicionados por RBAC granular via <PermissionGate>.

   Estados:
   - perms === undefined         -> skeleton de 6 cards
   - perms.permissoes.length=0
       && !is_admin_global        -> empty state
   - default                     -> grid (cada card gated)

   Layout aproveita PortalLayout (sidebar + header + breadcrumb).
   ═══════════════════════════════════════════════════════════════ */

import Link from 'next/link'
import { ChevronRight, AlertCircle } from 'lucide-react'
import { PermissionGate } from '@/components/auth/PermissionGate'
import { useAuthStore } from '@/store/authStore'
import { useEmpresaStore } from '@/store/empresaStore'
import { useThemeStore } from '@/store/themeStore'
import { usePermissoesAtivas } from '@/hooks/usePermission'
import { DASHBOARD_CARDS, type DashboardCard } from './dashboardCards'


export default function PortalHomePage() {
  const user = useAuthStore((s) => s.user)
  const empresa = useEmpresaStore((s) => s.getActive())
  const perms = usePermissoesAtivas()
  const t = useThemeStore((s) => s.tokens)

  const isLoading = perms === undefined
  const isEmpty =
    perms !== undefined
    && !perms.is_admin_global
    && perms.permissoes.length === 0

  const firstName = user?.nome?.split(' ')[0] ?? 'Bem-vindo'

  return (
    <div className="max-w-7xl mx-auto">
      {/* Greeting */}
      <header className="mb-8">
        <div
          className="text-[10px] mb-2"
          style={{
            color: t.gold,
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
          }}
        >
          {empresa?.nome ?? 'Grupo ALT'}
        </div>
        <h1
          className="text-2xl md:text-3xl mb-2"
          style={{
            color: t.text,
            fontFamily: 'var(--font-display)',
            fontWeight: 400,
            letterSpacing: '-0.015em',
          }}
        >
          Olá, {firstName}
        </h1>
        <p className="text-sm" style={{ color: t.muted }}>
          Selecione um módulo para começar.
        </p>
      </header>

      {/* States */}
      {isLoading && <DashboardSkeleton />}
      {!isLoading && isEmpty && <EmptyState />}
      {!isLoading && !isEmpty && (
        <section
          aria-label="Módulos disponíveis"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {DASHBOARD_CARDS.map((card) => (
            <PermissionGate key={card.href} require={card.require}>
              <DashboardCardLink card={card} />
            </PermissionGate>
          ))}
        </section>
      )}
    </div>
  )
}


function DashboardCardLink({ card }: { card: DashboardCard }) {
  const t = useThemeStore((s) => s.tokens)
  const Icon = card.icon

  return (
    <Link
      href={card.href}
      className="group relative block rounded-2xl p-5 transition-all overflow-hidden"
      style={{
        background: t.surfaceElevated,
        border: `1px solid ${t.border}`,
        textDecoration: 'none',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = t.borderGold
        e.currentTarget.style.boxShadow = `0 4px 16px ${t.goldDim}`
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = t.border
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg, ${t.goldDim}, transparent)`,
            border: `1px solid ${t.borderGold}`,
            color: t.gold,
          }}
        >
          <Icon className="w-5 h-5" />
        </div>
        <ChevronRight
          className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
          style={{ color: t.muted }}
        />
      </div>
      <h2
        className="text-base mb-1"
        style={{
          color: t.text,
          fontFamily: 'var(--font-display)',
          fontWeight: 500,
          letterSpacing: '-0.005em',
        }}
      >
        {card.title}
      </h2>
      <p className="text-[13px] leading-relaxed" style={{ color: t.muted }}>
        {card.desc}
      </p>
    </Link>
  )
}


function DashboardSkeleton() {
  const t = useThemeStore((s) => s.tokens)
  return (
    <section
      aria-label="Carregando módulos"
      aria-busy="true"
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl p-5 animate-pulse"
          style={{
            background: t.surfaceElevated,
            border: `1px solid ${t.border}`,
            minHeight: 140,
          }}
        >
          <div
            className="w-10 h-10 rounded-xl mb-4"
            style={{ background: t.surface }}
          />
          <div
            className="h-4 rounded mb-2"
            style={{ background: t.surface, width: '60%' }}
          />
          <div
            className="h-3 rounded"
            style={{ background: t.surface, width: '90%' }}
          />
        </div>
      ))}
    </section>
  )
}


function EmptyState() {
  const t = useThemeStore((s) => s.tokens)
  return (
    <div
      role="status"
      className="rounded-2xl p-8 text-center"
      style={{
        background: t.surfaceElevated,
        border: `1px solid ${t.border}`,
      }}
    >
      <div
        className="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center"
        style={{
          background: t.surface,
          border: `1px solid ${t.border}`,
          color: t.muted,
        }}
      >
        <AlertCircle className="w-6 h-6" />
      </div>
      <h2
        className="text-base mb-2"
        style={{
          color: t.text,
          fontFamily: 'var(--font-display)',
          fontWeight: 500,
        }}
      >
        Sem módulos disponíveis nesta empresa
      </h2>
      <p
        className="text-sm max-w-md mx-auto"
        style={{ color: t.muted, lineHeight: 1.55 }}
      >
        Sua conta ainda não tem permissões atribuídas. Procure o
        administrador para receber um perfil de acesso.
      </p>
    </div>
  )
}
