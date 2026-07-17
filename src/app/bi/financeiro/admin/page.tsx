'use client'
/* ═══════════════════════════════════════════════════════════════
   /bi/financeiro/admin — ROTA APOSENTADA (2026-07-17, F1 unificação).

   A configuração de empresas (dados cadastrais, logos, resync do
   extrato) foi unificada na aba Empresas do /portal/admin — o admin
   do BI ficou só com assuntos de BI (Plano de Contas, Contas
   Bancárias, Orbit). De quebra, o antigo "Salvar" desta tela só
   gravava no zustand (nome/cnpj sumiam no F5); o formulário novo
   persiste via PATCH /admin/empresas/{id}. Esta rota permanece como
   redirect pra não quebrar bookmarks e links antigos.
   ═══════════════════════════════════════════════════════════════ */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminConfiguracoesRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/portal/admin?tab=empresas')
  }, [router])

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '60vh', color: 'rgba(255,255,255,0.55)', fontSize: 13,
      }}
    >
      As configurações de empresa mudaram para a Administração do Portal. Redirecionando...
    </div>
  )
}
