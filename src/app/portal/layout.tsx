'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import Sidebar from '@/components/Sidebar'
import { Bell } from 'lucide-react'
import api from '@/lib/api'

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { token, user, setAuth } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [notifCount, setNotifCount] = useState(0)

  useEffect(() => {
    if (!token) {
      router.push('/login')
      return
    }

    // Carregar dados do usuário
    api.get('/auth/me')
      .then(res => {
        const data = res.data
        setAuth(
          token,
          { id: data.id, nome: data.nome, email: data.email, is_admin: data.is_admin },
          data.empresas || [],
          data.grupos || [],
          data.permissoes || [],
        )
        setLoading(false)
      })
      .catch(() => {
        router.push('/login')
      })

    // Carregar contagem de notificações
    api.get('/notificacoes/contagem')
      .then(res => setNotifCount(res.data.nao_lidas || 0))
      .catch(() => {})
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#05091A]">
        <div className="text-[#64748B] text-sm">Carregando portal...</div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-[#05091A]">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-14 border-b border-white/[0.07] flex items-center justify-between px-6">
          <div />
          <div className="flex items-center gap-4">
            {/* Notification Bell */}
            <button className="relative p-2 rounded hover:bg-white/[0.05] text-[#64748B] hover:text-[#F1F5F9]">
              <Bell size={18} />
              {notifCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-[#F87171] text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {notifCount > 9 ? '9+' : notifCount}
                </span>
              )}
            </button>
            {/* User */}
            <span className="text-xs text-[#64748B]">{user?.nome}</span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
