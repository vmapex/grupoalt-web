'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import Cookies from 'js-cookie'
import { useAuthStore } from '@/store/authStore'

export default function LoginPage() {
  const router = useRouter()
  const { setAuth } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const form = new URLSearchParams()
      form.append('username', email)
      form.append('password', password)
      const { data } = await api.post('/auth/login', form, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      })

      // Login retorna apenas tokens. Salvar token e carregar dados via /auth/me
      const token = data.access_token
      Cookies.set('access_token', token, { expires: 1 })

      // Carregar dados completos do usuário
      const meRes = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const me = meRes.data

      setAuth(
        token,
        { id: me.id, nome: me.nome, email: me.email, is_admin: me.is_admin },
        me.empresas || [],
        me.grupos || [],
        me.permissoes || [],
      )
      router.push('/portal')
    } catch (err: any) {
      if (err?.response?.status === 400 || err?.response?.status === 401) {
        setError('Email ou senha inválidos.')
      } else if (err?.code === 'ERR_NETWORK') {
        setError('Erro de conexão com o servidor. Verifique se o servidor está online ou se há bloqueio de CORS.')
      } else {
        const detail = err?.response?.data?.detail || err?.message || 'Erro desconhecido'
        setError(`Erro ao fazer login: ${detail}`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-900"
         style={{backgroundImage:'linear-gradient(rgba(56,189,248,0.025)1px,transparent 1px),linear-gradient(90deg,rgba(56,189,248,0.025)1px,transparent 1px)',backgroundSize:'48px 48px'}}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="font-mono text-white tracking-[4px] text-sm">ALT MAX</p>
          <p className="text-[#38BDF8] text-[9px] tracking-[5px] mt-1">PORTAL FINANCEIRO</p>
        </div>
        <form onSubmit={handleLogin}
              className="bg-white/5 border border-white/10 rounded-xl p-8 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#38BDF8] transition-colors"/>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Senha</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#38BDF8] transition-colors"/>
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button type="submit" disabled={loading}
            className="mt-2 bg-[#38BDF8] hover:bg-[#0ea5e9] text-navy-900 font-semibold text-sm py-2.5 rounded-lg transition-colors disabled:opacity-50">
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
