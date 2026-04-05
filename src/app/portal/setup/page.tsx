'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { useEmpresaStore } from '@/store/empresaStore'
import api from '@/lib/api'
import {
  Building2, Key, CheckCircle, ArrowRight, ArrowLeft,
  Loader2, AlertTriangle, Wifi, WifiOff,
} from 'lucide-react'

type TestStatus = 'idle' | 'testing' | 'success' | 'error'

export default function SetupPage() {
  const router = useRouter()
  const { setAuth } = useAuthStore()
  const syncFromAuth = useEmpresaStore((s) => s.syncFromAuth)

  // Step state
  const [step, setStep] = useState(1)

  // Step 1 fields
  const [grupoNome, setGrupoNome] = useState('Grupo Principal')
  const [empresaNome, setEmpresaNome] = useState('')
  const [cnpj, setCnpj] = useState('')

  // Step 2 fields
  const [appKey, setAppKey] = useState('')
  const [appSecret, setAppSecret] = useState('')
  const [testStatus, setTestStatus] = useState<TestStatus>('idle')
  const [testMsg, setTestMsg] = useState('')
  const [testContas, setTestContas] = useState(0)

  // Step 3 / global
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [createdEmpresa, setCreatedEmpresa] = useState<{ id: number; nome: string } | null>(null)

  const canAdvanceStep1 = empresaNome.trim().length >= 2
  const canTest = appKey.trim().length > 0 && appSecret.trim().length > 0
  const canSubmit = testStatus === 'success'

  async function handleTestCredentials() {
    setTestStatus('testing')
    setTestMsg('')
    try {
      const res = await api.post('/admin/credenciais/testar', {
        app_key: appKey.trim(),
        app_secret: appSecret.trim(),
      })
      if (res.data.sucesso) {
        setTestStatus('success')
        setTestMsg(res.data.mensagem)
        setTestContas(res.data.contas_encontradas)
      } else {
        setTestStatus('error')
        setTestMsg(res.data.mensagem)
      }
    } catch (err: any) {
      setTestStatus('error')
      setTestMsg(err?.response?.data?.detail || 'Erro ao testar credenciais')
    }
  }

  async function handleSetup() {
    setSubmitting(true)
    setError('')
    try {
      const res = await api.post('/admin/setup', {
        grupo_nome: grupoNome.trim() || 'Grupo Principal',
        empresa_nome: empresaNome.trim(),
        cnpj: cnpj.trim() || null,
        app_key: appKey.trim(),
        app_secret: appSecret.trim(),
      })
      setCreatedEmpresa(res.data.empresa)

      // Refresh auth state
      const meRes = await api.get('/auth/me')
      const data = meRes.data
      setAuth(
        { id: data.id, nome: data.nome, email: data.email, is_admin: data.is_admin },
        data.empresas || [],
        data.grupos || [],
        data.permissoes || [],
      )
      setTimeout(() => syncFromAuth(), 0)

      setStep(3)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Erro ao configurar empresa')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <div className="w-full max-w-lg">
        {/* Progress bar */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all ${
                s < step ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                s === step ? 'bg-[#CCA000]/20 text-[#E0B82E] border border-[#CCA000]/30' :
                'bg-zinc-800 text-zinc-500 border border-zinc-700'
              }`}>
                {s < step ? <CheckCircle className="w-4 h-4" /> : s}
              </div>
              {s < 3 && (
                <div className={`flex-1 h-px mx-2 ${s < step ? 'bg-emerald-500/30' : 'bg-zinc-800'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Company Info */}
        {step === 1 && (
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#CCA000]/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-[#E0B82E]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Dados da Empresa</h2>
                <p className="text-xs text-zinc-500">Informacoes basicas para criar a empresa</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Nome do Grupo</label>
                <input
                  type="text"
                  value={grupoNome}
                  onChange={(e) => setGrupoNome(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#CCA000]/50 transition-colors"
                  placeholder="Ex: Grupo ALT"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Nome da Empresa *</label>
                <input
                  type="text"
                  value={empresaNome}
                  onChange={(e) => setEmpresaNome(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#CCA000]/50 transition-colors"
                  placeholder="Ex: Alt Max Transportes"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">CNPJ (opcional)</label>
                <input
                  type="text"
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#CCA000]/50 transition-colors font-mono"
                  placeholder="00.000.000/0000-00"
                />
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setStep(2)}
                disabled={!canAdvanceStep1}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-[#CCA000] hover:bg-[#E0B82E] text-zinc-900"
              >
                Proximo
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Omie Credentials */}
        {step === 2 && (
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Key className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Credenciais Omie</h2>
                <p className="text-xs text-zinc-500">Conecte com o ERP Omie da empresa</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">App Key</label>
                <input
                  type="text"
                  value={appKey}
                  onChange={(e) => { setAppKey(e.target.value); setTestStatus('idle') }}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500/50 transition-colors font-mono"
                  placeholder="Cole a App Key do Omie"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">App Secret</label>
                <input
                  type="password"
                  value={appSecret}
                  onChange={(e) => { setAppSecret(e.target.value); setTestStatus('idle') }}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500/50 transition-colors font-mono"
                  placeholder="Cole a App Secret do Omie"
                />
              </div>

              {/* Test button */}
              <button
                onClick={handleTestCredentials}
                disabled={!canTest || testStatus === 'testing'}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-zinc-800 border-zinc-700 hover:border-blue-500/40 text-zinc-200"
              >
                {testStatus === 'testing' ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Testando conexao...</>
                ) : (
                  <><Wifi className="w-4 h-4" /> Testar Conexao</>
                )}
              </button>

              {/* Test result */}
              {testStatus === 'success' && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-emerald-400 font-medium">Conexao OK</p>
                    <p className="text-xs text-emerald-400/70">{testMsg}</p>
                  </div>
                </div>
              )}

              {testStatus === 'error' && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                  <WifiOff className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-red-400 font-medium">Falha na conexao</p>
                    <p className="text-xs text-red-400/70">{testMsg}</p>
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                  <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}
            </div>

            <div className="flex justify-between mt-6">
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </button>
              <button
                onClick={handleSetup}
                disabled={!canSubmit || submitting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-[#CCA000] hover:bg-[#E0B82E] text-zinc-900"
              >
                {submitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Configurando...</>
                ) : (
                  <>Concluir Setup</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Success */}
        {step === 3 && (
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Setup concluido!</h2>
            <p className="text-sm text-zinc-400 mb-1">
              A empresa <span className="text-white font-medium">{createdEmpresa?.nome}</span> foi configurada com sucesso.
            </p>
            <p className="text-xs text-zinc-500 mb-6">
              Os dados da Omie ja estao disponiveis no portal.
            </p>

            <button
              onClick={() => router.push('/portal/grupo')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium bg-[#CCA000] hover:bg-[#E0B82E] text-zinc-900 transition-all"
            >
              Ir para o Dashboard
              <ArrowRight className="w-4 h-4" />
            </button>

            <p className="text-xs text-zinc-600 mt-4">
              Para adicionar mais empresas, acesse Administracao no menu lateral.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
