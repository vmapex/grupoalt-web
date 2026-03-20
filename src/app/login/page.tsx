'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
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
      const { data } = await api.post('/auth/login', { email, password })
      setAuth(data.access_token, data.user, data.empresas || [])
      router.push('/dashboard')
    } catch {
      setError('Email ou senha inválidos.')
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
