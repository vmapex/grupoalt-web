'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'

/**
 * Backward-compatibility: redireciona /dashboard/* para /portal/financeiro/*
 * O dashboard antigo foi migrado para o novo portal.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const sub = pathname.replace('/dashboard', '')
    if (sub === '' || sub === '/') {
      router.replace('/portal/financeiro/caixa')
    } else {
      router.replace(`/portal/financeiro${sub}`)
    }
  }, [pathname, router])

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#05091A', color: '#64748B', fontSize: 12 }}>
      Redirecionando para o portal...
    </div>
  )
}
