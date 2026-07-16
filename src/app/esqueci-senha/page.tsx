'use client'
/* ═══════════════════════════════════════════════════════════════
   /esqueci-senha — solicita o link de redefinição por e-mail
   (2026-07-16, companion do api#151).

   Página pública. O backend responde SEMPRE 200 com mensagem genérica
   (anti-enumeração) — a UI reflete isso: depois do envio, mostra a
   mesma confirmação exista o e-mail ou não.
   ═══════════════════════════════════════════════════════════════ */

import { useState } from 'react'
import Image from 'next/image'
import { ArrowLeft, Loader2, MailCheck } from 'lucide-react'
import api from '@/lib/api'

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [erro, setErro] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading || !email.trim()) return
    setLoading(true)
    setErro('')
    try {
      await api.post('/auth/esqueci-senha', { email: email.trim() })
      setEnviado(true)
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      setErro(
        status === 429
          ? 'Muitas tentativas. Aguarde um minuto e tente de novo.'
          : 'Não foi possível processar agora. Tente novamente em instantes.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6" style={{ background: '#050A14' }}>
      <div
        className="w-full max-w-md rounded-2xl p-8"
        style={{
          background: 'rgba(10,20,38,0.92)',
          border: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}
      >
        <Image src="/logo_grupo_alt.png" alt="Grupo ALT" width={180} height={48} className="mb-6" />

        {enviado ? (
          <div role="status">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
              style={{ background: 'rgba(132,196,135,0.14)' }}
            >
              <MailCheck size={22} style={{ color: '#84C487' }} />
            </div>
            <h1 className="text-lg font-semibold text-[#F1F5F9] mb-2">Verifique seu e-mail</h1>
            <p className="text-sm text-[#94A3B8] leading-relaxed">
              Se <strong className="text-[#CBD5E1]">{email.trim()}</strong> estiver cadastrado,
              você receberá as instruções de redefinição em instantes. O link vale por{' '}
              <strong className="text-[#CBD5E1]">60 minutos</strong>.
            </p>
            <a
              href="/login"
              className="inline-flex items-center gap-2 mt-6 text-sm font-semibold"
              style={{ color: '#E0B82E' }}
            >
              <ArrowLeft size={14} /> Voltar ao login
            </a>
          </div>
        ) : (
          <>
            <h1 className="text-lg font-semibold text-[#F1F5F9] mb-2">Esqueceu sua senha?</h1>
            <p className="text-sm text-[#94A3B8] mb-6 leading-relaxed">
              Informe o e-mail cadastrado e enviaremos um link para você escolher uma nova senha.
            </p>

            <form onSubmit={handleSubmit} noValidate>
              <label htmlFor="email" className="block text-xs font-medium text-[#94A3B8] mb-1.5">
                E-mail corporativo
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="seu.nome@grupoalt.agr.br"
                className="w-full rounded-xl px-4 py-2.5 text-sm mb-4 focus:outline-none"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#F1F5F9',
                }}
              />

              {erro && (
                <div role="alert" className="text-xs text-red-400 mb-4">
                  {erro}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-opacity disabled:opacity-50"
                style={{ background: 'linear-gradient(90deg, #CCA000, #E0B82E)', color: '#1A1718' }}
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                {loading ? 'Enviando...' : 'Enviar link de redefinição'}
              </button>
            </form>

            <a
              href="/login"
              className="inline-flex items-center gap-2 mt-6 text-sm font-semibold"
              style={{ color: '#8C6B00' }}
            >
              <ArrowLeft size={14} /> Voltar ao login
            </a>
          </>
        )}
      </div>
    </main>
  )
}
