'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import Sidebar from '@/components/Sidebar'
import { Bell, HelpCircle, ChevronDown, ChevronRight } from 'lucide-react'
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-950" style={{ fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}>
        <div className="text-zinc-500 text-sm">Carregando portal...</div>
      </div>
    )
  }

  const initials = user?.nome
    ? user.nome.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase()
    : '??'

  return (
    <div
      className="flex h-screen bg-zinc-950 text-zinc-100 antialiased"
      style={{ fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}
    >
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-14 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-900/50 backdrop-blur-sm flex-shrink-0">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-zinc-500">Portal</span>
            <ChevronRight size={14} className="text-zinc-600" />
            <span className="text-zinc-100 font-medium">Dashboard</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <button className="relative p-2 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-all">
              <Bell size={18} />
              {notifCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-[#CCA000] text-zinc-900 text-[10px] font-bold rounded-full flex items-center justify-center">
                  {notifCount > 9 ? '9+' : notifCount}
                </span>
              )}
            </button>
            {/* Help */}
            <button className="p-2 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-all">
              <HelpCircle size={18} />
            </button>

            {/* Divider */}
            <div className="w-px h-6 bg-zinc-800" />

            {/* User */}
            <button className="flex items-center gap-2.5 py-1.5 px-2 rounded-xl hover:bg-zinc-800 transition-all">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-zinc-900"
                style={{ background: 'linear-gradient(135deg, #CCA000, #E0B82E)' }}>
                {initials}
              </div>
              <div className="text-left">
                <div className="text-sm font-medium text-zinc-200 leading-tight">{user?.nome}</div>
                {user?.is_admin && (
                  <div className="text-xs text-zinc-500 leading-tight">Administrador</div>
                )}
              </div>
              <ChevronDown size={14} className="text-zinc-500" />
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6 bg-zinc-950">
          {children}
        </main>
      </div>
    </div>
  )
}
