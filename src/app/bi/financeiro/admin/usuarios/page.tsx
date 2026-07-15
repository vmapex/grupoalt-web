'use client'
/* ═══════════════════════════════════════════════════════════════
   /bi/financeiro/admin/usuarios — ROTA APOSENTADA (2026-07-15).

   A gestão de usuários (cadastro, perfis RBAC, Acesso ao Motor,
   exclusão/restauração) foi unificada em /portal/admin — o admin do
   BI ficou só com assuntos de BI (Empresas, Plano de Contas, Contas
   Bancárias, Orbit). Esta rota permanece como redirect pra não
   quebrar bookmarks e links antigos (ex.: instruções "Admin →
   Usuários → Acesso ao Motor" em banners de erro do SSO).
   ═══════════════════════════════════════════════════════════════ */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminUsuariosRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/portal/admin')
  }, [router])

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '60vh', color: 'rgba(255,255,255,0.55)', fontSize: 13,
      }}
    >
      A gestão de usuários mudou para a Administração do Portal. Redirecionando...
    </div>
  )
}
