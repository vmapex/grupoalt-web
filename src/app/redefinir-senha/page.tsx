'use client'
/* ═══════════════════════════════════════════════════════════════
   /redefinir-senha?token=...[&convite=1] — define a nova senha
   (2026-07-16, companion do api#151).

   Página pública que serve DOIS fluxos com o mesmo endpoint
   (POST /auth/redefinir-senha):
   - convite=1: primeiro acesso de usuário convidado ("Defina sua senha")
   - sem convite: redefinição via "Esqueci minha senha"

   Token é single-use com TTL — 400 do backend vira mensagem com CTA
   pra pedir um novo link.

   useSearchParams exige <Suspense> no App Router (build falha sem).
   ═══════════════════════════════════════════════════════════════ */

import { Suspense, useState } from 'react'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react'
import api from '@/lib/api'

const MIN_SENHA = 8

function RedefinirSenhaForm() {
  const params = useSearchParams()
  const token = params.get('token') || ''
  const isConvite = params.get('convite') === '1'

  const [senha, setSenha] = useState('')
  const [confirma, setConfirma] = useState('')
  const [mostrar, setMostrar] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [erro, setErro] = useState('')

  const titulo = isConvite ? 'Defina sua senha de acesso' : 'Escolha uma nova senha'
  const subtitulo = isConvite
    ? 'Bem-vindo ao Portal do Grupo ALT! Crie a senha que você usará para entrar.'
    : 'Digite a nova senha da sua conta do Portal.'

  const podeEnviar =
    !loading && senha.length >= MIN_SENHA && senha === confirma && token !== ''

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!podeEnviar) return
    setLoading(true)
    setErro('')
    try {
      await api.post('/auth/redefinir-senha', { token, nova_senha: senha })
      setSucesso(true)
    } catch (err: unknown) {
      const resp = (err as { response?: { status?: number; data?: { detail?: unknown } } })?.response
      const detail = typeof resp?.data?.detail === 'string' ? resp.data.detail : null
      setErro(
        detail ||
          (resp?.status === 429
            ? 'Muitas tentativas. Aguarde um minuto e tente de novo.'
            : 'Não foi possível redefinir agora. Tente novamente em instantes.'),
      )
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#F1F5F9',
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

        {sucesso ? (
          <div role="status">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
              style={{ background: 'rgba(132,196,135,0.14)' }}
            >
              <CheckCircle2 size={22} style={{ color: '#84C487' }} />
            </div>
            <h1 className="text-lg font-semibold text-[#F1F5F9] mb-2">Senha definida!</h1>
            <p className="text-sm text-[#94A3B8] leading-relaxed mb-6">
              Tudo certo. Agora é só entrar com o seu e-mail e a nova senha.
            </p>
            <a
              href="/login"
              className="block w-full text-center rounded-xl py-2.5 text-sm font-bold"
              style={{ background: 'linear-gradient(90deg, #CCA000, #E0B82E)', color: '#1A1718' }}
            >
              Ir para o login
            </a>
          </div>
        ) : !token ? (
          <div role="alert">
            <h1 className="text-lg font-semibold text-[#F1F5F9] mb-2">Link incompleto</h1>
            <p className="text-sm text-[#94A3B8] leading-relaxed mb-6">
              Este endereço não contém um código de redefinição. Abra o link exatamente
              como veio no e-mail — ou peça um novo em &quot;Esqueceu a senha?&quot;.
            </p>
            <a href="/esqueci-senha" className="text-sm font-semibold" style={{ color: '#E0B82E' }}>
              Pedir novo link
            </a>
          </div>
        ) : (
          <>
            <h1 className="text-lg font-semibold text-[#F1F5F9] mb-2">{titulo}</h1>
            <p className="text-sm text-[#94A3B8] mb-6 leading-relaxed">{subtitulo}</p>

            <form onSubmit={handleSubmit} noValidate>
              <label htmlFor="senha" className="block text-xs font-medium text-[#94A3B8] mb-1.5">
                Nova senha
              </label>
              <div className="relative mb-1">
                <input
                  id="senha"
                  type={mostrar ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className="w-full rounded-xl px-4 py-2.5 pr-11 text-sm focus:outline-none"
                  style={inputStyle}
                />
                <button
                  type="button"
                  onClick={() => setMostrar((v) => !v)}
                  aria-label={mostrar ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8]"
                >
                  {mostrar ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="text-[11px] text-[#64748B] mb-4">Mínimo de {MIN_SENHA} caracteres.</p>

              <label htmlFor="confirma" className="block text-xs font-medium text-[#94A3B8] mb-1.5">
                Confirmar senha
              </label>
              <input
                id="confirma"
                type={mostrar ? 'text' : 'password'}
                value={confirma}
                onChange={(e) => setConfirma(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="Repita a nova senha"
                className="w-full rounded-xl px-4 py-2.5 text-sm mb-2 focus:outline-none"
                style={inputStyle}
              />
              {confirma.length > 0 && confirma !== senha && (
                <p className="text-xs text-red-400 mb-2" role="alert">
                  As senhas não coincidem.
                </p>
              )}

              {erro && (
                <div role="alert" className="text-xs text-red-400 my-3 leading-relaxed">
                  {erro}
                  {!isConvite && (
                    <>
                      {' '}
                      <a href="/esqueci-senha" className="underline font-semibold" style={{ color: '#E0B82E' }}>
                        Pedir novo link
                      </a>
                    </>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={!podeEnviar}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold mt-2 transition-opacity disabled:opacity-50"
                style={{ background: 'linear-gradient(90deg, #CCA000, #E0B82E)', color: '#1A1718' }}
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                {loading ? 'Salvando...' : isConvite ? 'Definir senha e continuar' : 'Redefinir senha'}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  )
}

export default function RedefinirSenhaPage() {
  return (
    <Suspense fallback={null}>
      <RedefinirSenhaForm />
    </Suspense>
  )
}
