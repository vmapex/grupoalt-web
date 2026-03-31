'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import Sidebar from '@/components/Sidebar'
import { Bell, HelpCircle, ChevronRight, ChevronDown } from 'lucide-react'
import api from '@/lib/api'

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { token, user, setAuth } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [notifCount, setNotifCount] = useState(0)

  useEffect(() => {
    if (!token) {
      router.push('/login')
      return
    }

    Promise.all([
      api.get('/auth/me'),
      api.get('/notificacoes/contagem').catch(() => ({ data: { nao_lidas: 0 } })),
    ])
      .then(([meRes, notifRes]) => {
        const data = meRes.data
        if (!data || !data.id) throw new Error('Resposta inválida do /auth/me')
        setAuth(
          token,
          { id: data.id, nome: data.nome, email: data.email, is_admin: data.is_admin },
          data.empresas || [],
          data.grupos || [],
          data.permissoes || [],
        )
        setNotifCount(notifRes.data.nao_lidas || 0)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Portal auth failed:', err?.response?.status, err?.message)
        if (err?.response?.status === 401 || !err?.response) {
          router.push('/login')
        } else {
          setLoading(false)
        }
      })
  }, [])

  // Breadcrumb from pathname
  const breadcrumb = (() => {
    const parts = pathname.replace('/portal', '').split('/').filter(Boolean)
    const labels: Record<string, string> = {
      grupo: 'Grupo', estrutura: 'Estrutura', segmentacao: 'Segmentação',
      financeiro: 'Financeiro', caixa: 'Caixa', extrato: 'Extrato',
      cp: 'Contas a Pagar', cr: 'Contas a Receber', fluxo: 'Fluxo de Caixa',
      conciliacao: 'Conciliação', indicadores: 'Indicadores', documentos: 'Documentos',
      fechamento: 'Motor Fechamento', admin: 'Admin', permissoes: 'Permissões',
      processos: 'Processos', politicas: 'Políticas', planejamentos: 'Planejamento',
      faturamento: 'Faturamento', custos: 'Custos', contabil: 'Contábil',
      controladoria: 'Controladoria', operacoes: 'Operações',
      organograma: 'Organograma', mvv: 'Missão | Visão | Valores',
    }
    return parts.map(p => labels[p] || p)
  })()

  const userInitials = user?.nome
    ? user.nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-950">
        <div className="text-zinc-500 text-sm">Carregando portal...</div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden" style={{ fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-14 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-900/50 backdrop-blur-sm flex-shrink-0">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-zinc-500">Portal</span>
            {breadcrumb.map((part, i) => (
              <span key={i} className="flex items-center gap-2">
                <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
                <span className={i === breadcrumb.length - 1 ? 'text-zinc-100 font-medium' : 'text-zinc-500'}>
                  {part}
                </span>
              </span>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <button className="relative p-2 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-all">
              <Bell className="w-[18px] h-[18px]" />
              {notifCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-[#CCA000] text-zinc-900 text-[10px] font-bold rounded-full flex items-center justify-center">
                  {notifCount > 9 ? '9+' : notifCount}
                </span>
              )}
            </button>
            {/* Help */}
            <button className="p-2 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-all">
              <HelpCircle className="w-[18px] h-[18px]" />
            </button>

            <div className="w-px h-6 bg-zinc-800" />

            {/* User */}
            <button className="flex items-center gap-2.5 py-1.5 px-2 rounded-xl hover:bg-zinc-800 transition-all">
              <div className="w-8 h-8 bg-gradient-to-br from-[#CCA000] to-[#E0B82E] rounded-xl flex items-center justify-center text-zinc-900 text-xs font-bold shadow-sm">
                {userInitials}
              </div>
              <div className="text-left">
                <div className="text-sm font-medium text-zinc-200 leading-tight">{user?.nome?.split(' ').slice(0, 2).join(' ')}</div>
                <div className="text-xs text-zinc-500 leading-tight">{user?.is_admin ? 'Administrador' : 'Usuário'}</div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-zinc-950">
          {children}
        </main>
      </div>
    </div>
  )
}
