'use client'

/* ═══════════════════════════════════════════════════════════════
   AdminSubNav — sub-navegacao compartilhada das 5 paginas admin
   (2026-05-24, refactor E1 do roadmap pos-Fase B).

   Antes: 5 implementacoes diferentes da mesma sub-nav espalhadas em
   admin/{page,categorias,contas-bancarias,orbit,usuarios}/page.tsx
   - 3 com blocos <Link> inline verbosos
   - 1 com helper SubNavLink interno
   - 1 com array + map (a "mais limpa", virou o template)

   Agora: 1 componente unico consumido pelas 5 paginas. Mudar a ordem
   ou adicionar um item novo (ex: futura "Documentos admin") vira
   edicao em 1 lugar.
   ═══════════════════════════════════════════════════════════════ */

import Link from 'next/link'
import { Settings, Tag, Landmark, Sparkles } from 'lucide-react'
import { useThemeStore } from '@/store/themeStore'


export type AdminSubNavKey =
  | 'empresas'
  | 'categorias'
  | 'contas'
  | 'orbit'


interface AdminSubNavItem {
  key: AdminSubNavKey
  label: string
  href: string
  icon: React.ReactNode
}


// Lista canonica das paginas admin do BI. Adicionar nova entrada aqui
// propaga para todas as paginas automaticamente.
// "Usuários" saiu em 2026-07-15: gestão de usuários (perfis RBAC +
// Acesso ao Motor) agora vive em /portal/admin — admin do BI é só de BI.
const ITEMS: readonly AdminSubNavItem[] = [
  { key: 'empresas',   label: 'Empresas',         href: '/bi/financeiro/admin',                  icon: <Settings size={12} /> },
  { key: 'categorias', label: 'Plano de Contas',  href: '/bi/financeiro/admin/categorias',       icon: <Tag size={12} /> },
  { key: 'contas',     label: 'Contas Bancárias', href: '/bi/financeiro/admin/contas-bancarias', icon: <Landmark size={12} /> },
  { key: 'orbit',      label: 'Orbit IA',         href: '/bi/financeiro/admin/orbit',            icon: <Sparkles size={12} /> },
] as const


export function AdminSubNav({ active }: { active: AdminSubNavKey }) {
  const t = useThemeStore((s) => s.tokens)
  return (
    <nav
      aria-label="Administração"
      style={{
        display: 'flex', gap: 8, marginBottom: 24,
        borderBottom: `1px solid ${t.border}`, paddingBottom: 12,
      }}
    >
      {ITEMS.map((item) => {
        const isActive = item.key === active
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 6,
              fontSize: 11, fontWeight: 600,
              color: isActive ? t.blue : t.muted,
              background: isActive ? t.blueDim : 'transparent',
              border: `1px solid ${isActive ? t.blue + '33' : t.border}`,
              textDecoration: 'none',
            }}
          >
            {item.icon} {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
