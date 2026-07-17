'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Users, Plus, Shield, Building2, MapPin, ChevronDown, ChevronUp, X, Trash2, Wifi, Loader2, CheckCircle, XCircle, RotateCcw, MailPlus, RefreshCw, Info } from 'lucide-react'
import api from '@/lib/api'
import { useRequireAdmin } from '@/hooks/useRequireAdmin'
import { AccessDenied } from '@/components/AccessDenied'
import { DeleteEmpresaModal } from '@/components/admin/DeleteEmpresaModal'
import { DeleteUsuarioModal } from '@/components/admin/DeleteUsuarioModal'
import { LogoUploadBox } from '@/components/admin/LogoUploadBox'
import { restoreEmpresa, permanentDeleteEmpresa, updateEmpresaDados, updateEmpresaLogos } from '@/hooks/api/useAdminEmpresas'
import { describeAxiosError } from '@/lib/errorPresentation'
import { useAuthStore } from '@/store/authStore'
import { useEmpresaStore } from '@/store/empresaStore'
import { ConfirmDeleteModal } from '@/components/admin/ConfirmDeleteModal'
import { restaurarUsuario, permanentDeleteUsuario } from '@/hooks/api/useAdminPerfis'
import { PerfisRBACSection } from '@/components/admin/PerfisRBACSection'
import { MotorAcessoSection } from '@/components/admin/MotorAcessoSection'
import { DARK } from '@/store/themeStore'

interface UserData {
  id: number; nome: string; email: string; ativo: boolean; is_admin: boolean
  /** ISO 8601 quando soft-deletado; null/undefined quando ativo. */
  deleted_at?: string | null
  empresas: { id: number; nome: string; role: string }[]
  permissoes: { id: number; modulo: string; acao: string; empresa_id: number | null }[]
  unidades: { id: number; nome: string; empresa_id: number }[]
}
interface EmpresaOption {
  id: number
  nome: string
  cnpj: string | null
  tem_credencial?: boolean
  /** ISO 8601 quando soft-deletada, null quando ativa. P0-7. */
  deleted_at?: string | null
}
interface UnidadeData { id: number; nome: string; codigo: string | null; ativa: boolean }

const MODULOS: Record<string, string[]> = {
  indicadores: ['visualizar', 'exportar'],
  documentos: ['visualizar', 'editar', 'aprovar'],
  fechamento: ['visualizar', 'editar', 'aprovar'],
  grupo: ['visualizar', 'editar'],
  admin: ['visualizar', 'editar'],
}
const ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'gestor', label: 'Gestor' },
  { value: 'viewer', label: 'Visualizador' },
]
const TABS = ['Usuários', 'Empresas', 'Unidades'] as const

export default function AdminPage() {
  const adminAccess = useRequireAdmin()
  const currentUserId = useAuthStore((s) => s.user?.id)
  const [tab, setTab] = useState<typeof TABS[number]>('Usuários')
  const [usuarios, setUsuarios] = useState<UserData[]>([])
  const [empresas, setEmpresas] = useState<EmpresaOption[]>([])
  const [unidades, setUnidades] = useState<UnidadeData[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedUser, setExpandedUser] = useState<number | null>(null)
  const [expandedEmpresa, setExpandedEmpresa] = useState<number | null>(null)
  const [showModal, setShowModal] = useState<'user' | 'empresa' | 'unidade' | null>(null)
  const [selectedEmpresa, setSelectedEmpresa] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [testResults, setTestResults] = useState<Record<number, { sucesso: boolean; mensagem: string } | null>>({})
  const [testing, setTesting] = useState<number | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; msg: string } | null>(null)
  const [deletingEmpresa, setDeletingEmpresa] = useState<{ id: number; nome: string } | null>(null)
  const [deletingUsuario, setDeletingUsuario] = useState<{ id: number; nome: string; email: string } | null>(null)
  const [permanentDeletingUsuario, setPermanentDeletingUsuario] = useState<{ id: number; nome: string; email: string } | null>(null)
  const [permanentDeletingEmpresa, setPermanentDeletingEmpresa] = useState<{ id: number; nome: string } | null>(null)
  // /gestao/usuarios sempre inclui soft-deletados (deleted_at preenchido);
  // o filtro é client-side. Default oculta — mesmo espírito do toggle F2
  // do /bi/financeiro/admin/usuarios, sem refetch.
  const [showDeleted, setShowDeleted] = useState(false)
  // Busca client-side por nome/email (paridade com a antiga tela de
  // usuários do BI, aposentada em favor desta).
  const [buscaUsuario, setBuscaUsuario] = useState('')
  const [restoringUsuarioIds, setRestoringUsuarioIds] = useState<Set<number>>(() => new Set())
  // Usa Set pra permitir restaurar varias empresas em paralelo sem que
  // o spinner do segundo apague o do primeiro. Mesmo pattern do
  // /bi/financeiro/admin/usuarios (PR #152).
  const [restoringEmpresaIds, setRestoringEmpresaIds] = useState<Set<number>>(() => new Set())
  // sticky: resultado de operação longa (ex.: resync) fica na tela até o
  // admin fechar no X — 4s não bastam pra ler contadores.
  const showToast = (type: 'success' | 'error' | 'info', msg: string, opts?: { sticky?: boolean }) => {
    setToast({ type, msg })
    if (!opts?.sticky) setTimeout(() => setToast(null), 4000)
  }

  // ── Config de empresa (F1 da unificação, 2026-07-17) ──────────────────
  // Dados cadastrais, logos e resync migraram do /bi/financeiro/admin.
  // Logos: a fonte do preview é o empresaStore (sincronizado do /auth/me),
  // mesma fonte que a antiga tela do BI usava.
  const storeEmpresas = useEmpresaStore((s) => s.empresas)
  const updateEmpresaStore = useEmpresaStore((s) => s.updateEmpresa)
  const [empresaEdit, setEmpresaEdit] = useState({ nome: '', cnpj: '' })
  const [savingEmpresa, setSavingEmpresa] = useState(false)
  // Set permite resyncs em empresas diferentes sem que o spinner de uma
  // apague o da outra (mesmo pattern do restore).
  const [resyncingIds, setResyncingIds] = useState<Set<number>>(() => new Set())

  const handleSaveEmpresaDados = async (emp: EmpresaOption) => {
    const nome = empresaEdit.nome.trim()
    const cnpj = empresaEdit.cnpj.trim()
    if (!nome) {
      showToast('error', 'O nome da empresa é obrigatório')
      return
    }
    setSavingEmpresa(true)
    try {
      // PATCH parcial: cnpj vazio é omitido (o endpoint não limpa campo).
      await updateEmpresaDados(emp.id, { nome, ...(cnpj ? { cnpj } : {}) })
      // Reflete nos pickers (EmpresaSelector/Navbar) sem exigir F5.
      if (storeEmpresas.some((se) => se.id === String(emp.id))) {
        updateEmpresaStore(String(emp.id), { nome, ...(cnpj ? { cnpj } : {}) })
      }
      showToast('success', `Empresa "${nome}" atualizada`)
      loadData()
    } catch (err: unknown) {
      const presentation = describeAxiosError(err, {
        entity: 'empresa',
        prefix: `Falha ao salvar "${emp.nome}"`,
      })
      showToast('error', presentation.message)
    } finally {
      setSavingEmpresa(false)
    }
  }

  const handleResyncExtrato = async (emp: EmpresaOption) => {
    const aviso =
      `Resync do extrato de ${emp.nome}:\n\n` +
      'APAGA todos os lançamentos bancários e re-baixa ~2 anos da Omie. ' +
      'O processo leva de 10 a 20 minutos e o BI mostra dados parciais ' +
      'enquanto roda (o Dashboard exibe o progresso).\n\nContinuar?'
    if (!confirm(aviso)) return
    setResyncingIds((prev) => new Set(prev).add(emp.id))
    try {
      const { data } = await api.post(`/sync/empresas/${emp.id}/resync-extrato`)
      showToast(
        'success',
        `${emp.nome}: resync concluído — ${data?.deleted ?? '?'} removidos, ` +
          `${data?.lancamentos_synced ?? '?'} lançamentos re-sincronizados.`,
        { sticky: true },
      )
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      // O endpoint e sincrono e demorado: timeout do edge (504) ou queda de
      // rede NAO significam falha — o servidor continua processando.
      if (!status || status === 502 || status === 504) {
        showToast(
          'info',
          `${emp.nome}: a chamada excedeu o tempo de resposta, mas o resync ` +
            'continua em segundo plano. Acompanhe o progresso no Dashboard (~10-20 min).',
          { sticky: true },
        )
      } else {
        const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        showToast('error', `${emp.nome}: falha ao iniciar resync — ${detail || `HTTP ${status}`}`, { sticky: true })
      }
    } finally {
      setResyncingIds((prev) => {
        const next = new Set(prev)
        next.delete(emp.id)
        return next
      })
    }
  }

  // Upload/remoção de logo: otimista no store local (preview imediato) +
  // persistência no backend (api 0012). Falha na API reverte o preview.
  const persistLogo = async (
    empresaId: number,
    campo: 'logoDark' | 'logoLight',
    valor: string | null,
  ) => {
    const storeEmp = storeEmpresas.find((se) => se.id === String(empresaId))
    if (!storeEmp) return
    const anterior = storeEmp[campo]
    updateEmpresaStore(storeEmp.id, { [campo]: valor })
    try {
      await updateEmpresaLogos(empresaId, {
        [campo === 'logoDark' ? 'logo_dark' : 'logo_light']: valor,
      })
      showToast('success', `Logo ${valor ? 'salvo' : 'removido'} — ${storeEmp.nome}. Visível para todos os usuários.`)
    } catch (err: unknown) {
      updateEmpresaStore(storeEmp.id, { [campo]: anterior })
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      showToast('error', typeof detail === 'string' ? detail : `Falha ao salvar o logo de ${storeEmp.nome}. Tente novamente.`)
    }
  }

  const handleRestoreEmpresa = async (emp: EmpresaOption) => {
    setRestoringEmpresaIds((prev) => {
      const next = new Set(prev)
      next.add(emp.id)
      return next
    })
    try {
      await restoreEmpresa(emp.id)
      showToast('success', `Empresa "${emp.nome}" restaurada`)
      loadData()
    } catch (err: unknown) {
      // Usa describeAxiosError para cobrir 409 (ja restaurada), 403 (RBAC),
      // 429 (rate limit), 5xx (unavailable) com mensagens consistentes.
      const presentation = describeAxiosError(err, {
        entity: 'empresa',
        prefix: `Falha ao restaurar "${emp.nome}"`,
      })
      showToast('error', presentation.message)
    } finally {
      setRestoringEmpresaIds((prev) => {
        if (!prev.has(emp.id)) return prev
        const next = new Set(prev)
        next.delete(emp.id)
        return next
      })
    }
  }

  const handleRestoreUsuario = async (user: UserData) => {
    setRestoringUsuarioIds((prev) => {
      const next = new Set(prev)
      next.add(user.id)
      return next
    })
    try {
      await restaurarUsuario(user.id)
      showToast('success', `Usuário "${user.nome}" restaurado`)
      loadData()
    } catch (err: unknown) {
      const presentation = describeAxiosError(err, {
        entity: 'usuário',
        prefix: `Falha ao restaurar "${user.nome}"`,
      })
      showToast('error', presentation.message)
    } finally {
      setRestoringUsuarioIds((prev) => {
        if (!prev.has(user.id)) return prev
        const next = new Set(prev)
        next.delete(user.id)
        return next
      })
    }
  }

  // Forms
  const [userForm, setUserForm] = useState({ nome: '', email: '', senha: '', is_admin: false })
  // Convite por padrão (2026-07-16): sem senha, o backend cria o usuário e
  // envia e-mail com link pra ele definir a própria. Senha manual = exceção.
  const [senhaManual, setSenhaManual] = useState(false)
  const [reenviandoConviteId, setReenviandoConviteId] = useState<number | null>(null)
  const [empresaForm, setEmpresaForm] = useState({ nome: '', cnpj: '', slug: '', app_key: '', app_secret: '' })
  const [unidadeForm, setUnidadeForm] = useState({ nome: '', codigo: '' })

  const loadData = async () => {
    try {
      const [usersRes, empresasRes] = await Promise.all([
        api.get('/gestao/usuarios'),
        api.get('/admin/empresas').catch(() => api.get('/gestao/empresas')),
      ])
      setUsuarios(usersRes.data)
      setEmpresas(empresasRes.data)
      if (empresasRes.data.length > 0 && !selectedEmpresa) {
        setSelectedEmpresa(empresasRes.data[0].id)
      }
    } catch {}
    setLoading(false)
  }

  const loadUnidades = async (empId: number) => {
    try {
      const res = await api.get(`/gestao/empresas/${empId}/unidades`)
      setUnidades(res.data)
    } catch { setUnidades([]) }
  }

  useEffect(() => {
    if (adminAccess === 'allowed') loadData()
  }, [adminAccess])
  // Deep-link de aba (?tab=empresas|unidades) — usado pelos redirects das
  // rotas aposentadas do BI admin. Lido no mount via window pra não puxar
  // useSearchParams (exigiria Suspense na página inteira).
  useEffect(() => {
    const tabParam = new URLSearchParams(window.location.search).get('tab')
    if (tabParam === 'empresas') setTab('Empresas')
    else if (tabParam === 'unidades') setTab('Unidades')
  }, [])
  useEffect(() => { if (selectedEmpresa) loadUnidades(selectedEmpresa) }, [selectedEmpresa])

  // User actions
  const handleCreateUser = async () => {
    setSaving(true); setError('')
    try {
      // Sem senha no payload = convite por e-mail (backend gera o link).
      const payload: Record<string, unknown> = {
        nome: userForm.nome, email: userForm.email, is_admin: userForm.is_admin,
      }
      if (senhaManual) payload.senha = userForm.senha
      const res = await api.post('/gestao/usuarios', payload)
      setShowModal(null)
      setUserForm({ nome: '', email: '', senha: '', is_admin: false })
      setSenhaManual(false)
      loadData()
      if (senhaManual) {
        showToast('success', `Usuário "${res.data.nome}" criado com senha manual`)
      } else if (res.data.convite_enviado) {
        showToast('success', `Convite enviado para ${res.data.email}`)
      } else {
        showToast('error', res.data.aviso || 'Usuário criado, mas o convite não foi enviado — use "Reenviar convite".')
      }
    } catch (err: any) { setError(err?.response?.data?.detail || 'Erro') }
    finally { setSaving(false) }
  }

  const handleReenviarConvite = async (user: UserData) => {
    setReenviandoConviteId(user.id)
    try {
      const res = await api.post(`/gestao/usuarios/${user.id}/reenviar-convite`)
      showToast('success', res.data.message || `Convite enviado para ${user.email}`)
    } catch (err: any) {
      showToast('error', err?.response?.data?.detail || `Falha ao enviar o convite para ${user.email}`)
    } finally {
      setReenviandoConviteId(null)
    }
  }
  const toggleEmpresa = async (userId: number, empresaId: number, linked: boolean) => {
    if (linked) await api.delete(`/gestao/usuarios/${userId}/empresas/${empresaId}`)
    else await api.post(`/gestao/usuarios/${userId}/empresas`, { empresa_id: empresaId, role: 'viewer' })
    loadData()
  }
  const updateRole = async (userId: number, empresaId: number, role: string) => {
    await api.post(`/gestao/usuarios/${userId}/empresas`, { empresa_id: empresaId, role }); loadData()
  }
  const togglePermissao = async (userId: number, modulo: string, acao: string, has: boolean) => {
    const user = usuarios.find(u => u.id === userId)
    if (!user) return
    const newPerms = user.permissoes.filter(p => !(p.modulo === modulo && p.acao === acao)).map(p => ({ modulo: p.modulo, acao: p.acao, empresa_id: p.empresa_id }))
    if (!has) newPerms.push({ modulo, acao, empresa_id: null })
    await api.put(`/gestao/usuarios/${userId}/permissoes`, newPerms); loadData()
  }
  const toggleAtivo = async (userId: number, ativo: boolean) => {
    await api.patch(`/gestao/usuarios/${userId}`, { ativo: !ativo }); loadData()
  }

  // Empresa actions
  const handleCreateEmpresa = async () => {
    setSaving(true); setError('')
    try {
      const { app_key, app_secret, ...empresaData } = empresaForm
      const res = await api.post('/admin/empresas', empresaData)
      const empresaId = res.data.id

      // Se credenciais Omie foram preenchidas, salvar
      if (app_key && app_secret && empresaId) {
        await api.put(`/admin/empresas/${empresaId}/credenciais`, { app_key, app_secret })
      }

      setShowModal(null); setEmpresaForm({ nome: '', cnpj: '', slug: '', app_key: '', app_secret: '' }); loadData()
    } catch (err: any) { setError(err?.response?.data?.detail || 'Erro') }
    finally { setSaving(false) }
  }

  // Salvar credenciais para empresa existente
  const saveCredenciais = async (empresaId: number, appKey: string, appSecret: string) => {
    try {
      await api.put(`/admin/empresas/${empresaId}/credenciais`, { app_key: appKey, app_secret: appSecret })
      showToast('success', 'Credenciais salvas com sucesso!')
      loadData()
    } catch (err: any) { showToast('error', err?.response?.data?.detail || 'Erro ao salvar credenciais') }
  }

  // Testar credenciais Omie
  const testarCredenciais = async (empresaId: number, appKey: string, appSecret: string) => {
    setTesting(empresaId)
    setTestResults(prev => ({ ...prev, [empresaId]: null }))
    try {
      const res = await api.post('/admin/credenciais/testar', { app_key: appKey, app_secret: appSecret })
      setTestResults(prev => ({ ...prev, [empresaId]: res.data }))
    } catch (err: any) {
      setTestResults(prev => ({ ...prev, [empresaId]: { sucesso: false, mensagem: err?.response?.data?.detail || 'Erro de conexao' } }))
    }
    setTesting(null)
  }

  // Unidade actions
  const handleCreateUnidade = async () => {
    if (!selectedEmpresa) return
    setSaving(true); setError('')
    try {
      await api.post(`/gestao/empresas/${selectedEmpresa}/unidades`, unidadeForm)
      setShowModal(null); setUnidadeForm({ nome: '', codigo: '' }); loadUnidades(selectedEmpresa)
    } catch (err: any) { setError(err?.response?.data?.detail || 'Erro') }
    finally { setSaving(false) }
  }
  const deleteUnidade = async (id: number) => {
    await api.delete(`/gestao/unidades/${id}`)
    if (selectedEmpresa) loadUnidades(selectedEmpresa)
  }

  if (adminAccess === 'loading') return <div className="flex items-center justify-center h-64"><span className="text-zinc-500 text-sm">Carregando...</span></div>
  if (adminAccess === 'denied') return <AccessDenied message="Esta area e restrita a administradores." />

  if (loading) return <div className="flex items-center justify-center h-64"><span className="text-zinc-500 text-sm">Carregando...</span></div>

  return (
    <div>
      {/* Toast notification — via portal pro <body>: o <main> do layout tem
          relative z-0 (fix #194), então um fixed z-50 AQUI DENTRO fica preso
          nesse stacking context e o header (z-20) pinta por cima — a mensagem
          ficava ilegível atrás da barra superior. */}
      {toast && typeof document !== 'undefined' && createPortal(
        <div role="alert" className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm flex items-center gap-2 transition-all max-w-md ${
          toast.type === 'success'
            ? 'bg-emerald-900/90 text-emerald-200 border border-emerald-700/50'
            : toast.type === 'info'
              ? 'bg-amber-900/90 text-amber-200 border border-amber-700/50'
              : 'bg-red-900/90 text-red-200 border border-red-700/50'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : toast.type === 'info' ? <Info size={16} /> : <XCircle size={16} />}
          {toast.msg}
          <button onClick={() => setToast(null)} className="ml-2 opacity-60 hover:opacity-100">
            <X size={14} />
          </button>
        </div>,
        document.body,
      )}
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight mb-1">Administração</h1>
          <p className="text-sm text-zinc-400">Gerencie usuários, empresas, unidades e permissões</p>
        </div>
        <button onClick={() => setShowModal(tab === 'Usuários' ? 'user' : tab === 'Empresas' ? 'empresa' : 'unidade')} className="flex items-center gap-2 bg-gradient-to-r from-[#CCA000] to-[#E0B82E] text-zinc-900 rounded-xl px-4 py-2.5 text-sm font-bold transition-all shadow-sm">
          <Plus className="w-4 h-4" /> {tab === 'Usuários' ? 'Novo Usuário' : tab === 'Empresas' ? 'Nova Empresa' : 'Nova Unidade'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-zinc-900 border border-zinc-800 rounded-xl p-1 w-fit">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* ═══ TAB: USUÁRIOS ═══ */}
      {tab === 'Usuários' && (
        <div className="space-y-3">
          <input
            type="search"
            value={buscaUsuario}
            onChange={e => setBuscaUsuario(e.target.value)}
            placeholder="Buscar por nome ou email..."
            aria-label="Buscar usuário por nome ou email"
            className="w-full max-w-sm bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#CCA000]"
          />
          {usuarios.some(u => !!u.deleted_at) && (
            <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer select-none w-fit">
              <input
                type="checkbox"
                checked={showDeleted}
                onChange={e => setShowDeleted(e.target.checked)}
                className="w-3.5 h-3.5 rounded accent-[#CCA000] cursor-pointer"
              />
              Mostrar usuários deletados ({usuarios.filter(u => !!u.deleted_at).length})
            </label>
          )}
          {usuarios
            .filter(u => showDeleted || !u.deleted_at)
            .filter(u => {
              const q = buscaUsuario.trim().toLowerCase()
              if (!q) return true
              return u.nome.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
            })
            .map(user => {
            const isExpanded = expandedUser === user.id
            const isSoftDeleted = !!user.deleted_at
            const deletedAtLabel = user.deleted_at
              ? new Date(user.deleted_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
              : null
            const isRestoring = restoringUsuarioIds.has(user.id)
            return (
              <div key={user.id} className={`bg-zinc-900 border rounded-2xl overflow-hidden ${isSoftDeleted ? 'border-red-900/40 opacity-70' : 'border-zinc-800'}`}>
                <div className="flex items-center gap-2 p-5 hover:bg-zinc-800/50 transition-colors">
                  <button
                    onClick={() => setExpandedUser(isExpanded ? null : user.id)}
                    className="flex-1 flex items-center gap-4 text-left min-w-0"
                    aria-expanded={isExpanded}
                    aria-label={`${isExpanded ? 'Recolher' : 'Expandir'} ${user.nome}`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#CCA000] to-[#E0B82E] flex items-center justify-center text-zinc-900 text-xs font-bold flex-shrink-0">
                      {user.nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">{user.nome}</span>
                        {user.is_admin && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#CCA000]/20 text-[#E0B82E] font-medium">ADMIN</span>}
                        {!user.ativo && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-medium">INATIVO</span>}
                        {isSoftDeleted && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-medium whitespace-nowrap">DELETADO{deletedAtLabel ? ` ${deletedAtLabel}` : ''}</span>}
                      </div>
                      <span className="text-xs text-zinc-500">{user.email}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-zinc-500">
                      <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{user.empresas.length}</span>
                      <span className="flex items-center gap-1"><Shield className="w-3.5 h-3.5" />{user.permissoes.length}</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{user.unidades.length}</span>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
                  </button>
                  {currentUserId != null && currentUserId !== user.id && (
                    isSoftDeleted ? (
                      <>
                        <button
                          onClick={() => handleRestoreUsuario(user)}
                          disabled={isRestoring}
                          aria-label={`Restaurar ${user.nome}`}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                        >
                          {isRestoring ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                          Restaurar
                        </button>
                        <button
                          onClick={() => setPermanentDeletingUsuario({ id: user.id, nome: user.nome, email: user.email })}
                          aria-label={`Apagar ${user.nome} em definitivo`}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-red-600/20 border border-red-600/40 text-red-300 hover:bg-red-600/30 transition-all flex-shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Apagar definitivo
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setDeletingUsuario({ id: user.id, nome: user.nome, email: user.email })}
                        aria-label={`Excluir ${user.nome}`}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all flex-shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Excluir
                      </button>
                    )
                  )}
                </div>
                {isExpanded && (
                  <div className="border-t border-zinc-800 p-5 space-y-6">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-300">Status</span>
                      <button onClick={() => toggleAtivo(user.id, user.ativo)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${user.ativo ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                        {user.ativo ? 'Ativo' : 'Inativo'} — clique para alternar
                      </button>
                    </div>
                    {!isSoftDeleted && user.ativo && (
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <span className="text-sm text-zinc-300 block">Convite / redefinição de senha</span>
                          <span className="text-xs text-zinc-500">Envia um novo link por e-mail para o usuário definir a senha (invalida links anteriores).</span>
                        </div>
                        <button
                          onClick={() => handleReenviarConvite(user)}
                          disabled={reenviandoConviteId === user.id}
                          aria-label={`Reenviar convite para ${user.nome}`}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-[#CCA000]/10 border border-[#CCA000]/30 text-[#E0B82E] hover:bg-[#CCA000]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                        >
                          {reenviandoConviteId === user.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <MailPlus className="w-3.5 h-3.5" />}
                          Reenviar convite
                        </button>
                      </div>
                    )}
                    <div>
                      <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2"><Building2 className="w-3.5 h-3.5" /> Acesso a Empresas</h4>
                      <div className="space-y-2">
                        {empresas.map(emp => {
                          const linked = user.empresas.find(ue => ue.id === emp.id)
                          return (
                            <div key={emp.id} className="flex items-center justify-between py-2 px-3 rounded-xl bg-zinc-800/50">
                              <label className="flex items-center gap-3 cursor-pointer">
                                <input type="checkbox" checked={!!linked} onChange={() => toggleEmpresa(user.id, emp.id, !!linked)} className="w-4 h-4 rounded accent-[#CCA000]" />
                                <span className="text-sm text-zinc-200">{emp.nome}</span>
                              </label>
                              {linked && (
                                <select value={linked.role} onChange={e => updateRole(user.id, emp.id, e.target.value)} className="bg-zinc-700 border border-zinc-600 rounded-lg px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-[#CCA000]">
                                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                                </select>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2"><Shield className="w-3.5 h-3.5" /> Permissões por Módulo</h4>
                      <div className="space-y-3">
                        {Object.entries(MODULOS).map(([modulo, acoes]) => (
                          <div key={modulo} className="py-2 px-3 rounded-xl bg-zinc-800/50">
                            <span className="text-xs font-medium text-zinc-300 capitalize mb-2 block">{modulo}</span>
                            <div className="flex flex-wrap gap-2">
                              {acoes.map(acao => {
                                const has = user.permissoes.some(p => p.modulo === modulo && p.acao === acao)
                                return (
                                  <button key={acao} onClick={() => togglePermissao(user.id, modulo, acao, has)} className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${has ? 'bg-[#CCA000]/20 text-[#E0B82E] border border-[#CCA000]/30' : 'bg-zinc-700/50 text-zinc-500 border border-zinc-700 hover:border-zinc-600'}`}>
                                    {acao}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Perfis RBAC + Acesso ao Motor (2026-07-15): antes viviam
                        só em /bi/financeiro/admin/usuarios; a gestão de usuários
                        agora é toda aqui. Não renderiza pra soft-deletado —
                        o fluxo exige restaurar antes. */}
                    {!isSoftDeleted && (
                      <>
                        <div className="pt-2">
                          <PerfisRBACSection
                            usuarioId={user.id}
                            isAdmin={user.is_admin}
                            empresas={empresas.filter(e => !e.deleted_at)}
                          />
                        </div>
                        <MotorAcessoSection usuarioId={user.id} usuarioNome={user.nome} t={DARK} />
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}
          {usuarios.length === 0 && <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center"><Users className="w-10 h-10 text-zinc-600 mx-auto mb-4" /><p className="text-zinc-500">Nenhum usuário cadastrado</p></div>}
        </div>
      )}

      {/* ═══ TAB: EMPRESAS ═══ */}
      {tab === 'Empresas' && (
        <div className="space-y-3">
          {empresas.map(emp => {
            const isExp = expandedEmpresa === emp.id
            const isSoftDeleted = !!emp.deleted_at
            const deletedAtLabel = emp.deleted_at
              ? new Date(emp.deleted_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
              : null
            return (
              <div
                key={emp.id}
                className={`bg-zinc-900 border rounded-2xl overflow-hidden ${
                  isSoftDeleted ? 'border-red-900/40 opacity-70' : 'border-zinc-800'
                }`}
              >
                <div className="flex items-center gap-2 p-5 hover:bg-zinc-800/50 transition-colors">
                  <button
                    onClick={() => {
                      const next = isExp ? null : emp.id
                      setExpandedEmpresa(next)
                      // Form de dados cadastrais parte do valor atual da API.
                      if (next !== null) setEmpresaEdit({ nome: emp.nome, cnpj: emp.cnpj ?? '' })
                    }}
                    className="flex-1 flex items-center gap-4 text-left min-w-0"
                    aria-expanded={isExp}
                    aria-label={`${isExp ? 'Recolher' : 'Expandir'} ${emp.nome}`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 text-[#CCA000]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-white truncate">{emp.nome}</span>
                        {isSoftDeleted && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-medium whitespace-nowrap">
                            DELETADA{deletedAtLabel ? ` ${deletedAtLabel}` : ''}
                          </span>
                        )}
                      </div>
                      {emp.cnpj && <div className="text-xs text-zinc-500 font-mono">{emp.cnpj}</div>}
                    </div>
                    <div className="flex items-center gap-2">
                      {emp.tem_credencial ? (
                        <span className="w-2 h-2 rounded-full bg-emerald-400" title="Credenciais configuradas" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-amber-400" title="Sem credenciais" />
                      )}
                      <span className="text-xs text-zinc-500">ID: {emp.id}</span>
                    </div>
                    {isExp ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
                  </button>
                  {/* Action: restore + apagar definitivo (se soft-deletada) ou delete */}
                  {isSoftDeleted ? (
                    <>
                      <button
                        onClick={() => handleRestoreEmpresa(emp)}
                        disabled={restoringEmpresaIds.has(emp.id)}
                        aria-label={`Restaurar ${emp.nome}`}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                      >
                        {restoringEmpresaIds.has(emp.id) ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="w-3.5 h-3.5" />
                        )}
                        Restaurar
                      </button>
                      <button
                        onClick={() => setPermanentDeletingEmpresa({ id: emp.id, nome: emp.nome })}
                        aria-label={`Apagar ${emp.nome} em definitivo`}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-red-600/20 border border-red-600/40 text-red-300 hover:bg-red-600/30 transition-all flex-shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Apagar definitivo
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setDeletingEmpresa({ id: emp.id, nome: emp.nome })}
                      aria-label={`Excluir ${emp.nome}`}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Excluir
                    </button>
                  )}
                </div>
                {isExp && (
                  <div className="border-t border-zinc-800 p-5 space-y-6">
                    {/* Dados cadastrais + logos + resync (F1 da unificação):
                        migrados do /bi/financeiro/admin. Soft-deletada só
                        mostra credenciais — restaure antes de editar. */}
                    {!isSoftDeleted && (
                      <div>
                        <h4 className="text-xs font-medium text-[#CCA000] uppercase tracking-wider mb-3">Dados da Empresa</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Nome</label>
                            <input
                              value={empresaEdit.nome}
                              onChange={e => setEmpresaEdit(f => ({ ...f, nome: e.target.value }))}
                              aria-label={`Nome da empresa ${emp.nome}`}
                              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#CCA000]"
                              placeholder="Nome da empresa"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1.5">CNPJ</label>
                            <input
                              value={empresaEdit.cnpj}
                              onChange={e => setEmpresaEdit(f => ({ ...f, cnpj: e.target.value }))}
                              aria-label={`CNPJ da empresa ${emp.nome}`}
                              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#CCA000] font-mono"
                              placeholder="00.000.000/0001-00"
                            />
                          </div>
                        </div>
                        <button
                          onClick={() => handleSaveEmpresaDados(emp)}
                          disabled={savingEmpresa}
                          aria-label={`Salvar dados de ${emp.nome}`}
                          className="mt-3 bg-gradient-to-r from-[#CCA000] to-[#E0B82E] text-zinc-900 rounded-xl px-4 py-2 text-sm font-bold transition-all disabled:opacity-50"
                        >
                          {savingEmpresa ? 'Salvando...' : 'Salvar Dados'}
                        </button>
                      </div>
                    )}
                    {!isSoftDeleted && (() => {
                      const storeEmp = storeEmpresas.find(se => se.id === String(emp.id))
                      return (
                        <div>
                          <h4 className="text-xs font-medium text-[#CCA000] uppercase tracking-wider mb-3">Logos</h4>
                          {storeEmp ? (
                            <div className="flex gap-4 flex-wrap">
                              <LogoUploadBox
                                label="Logo Dark"
                                previewBg="#0A0F1E"
                                logoSrc={storeEmp.logoDark}
                                onUpload={b64 => persistLogo(emp.id, 'logoDark', b64)}
                                onRemove={() => persistLogo(emp.id, 'logoDark', null)}
                                borderColor={DARK.border}
                                mutedColor={DARK.muted}
                                surfaceColor={DARK.surface}
                                redColor={DARK.red}
                              />
                              <LogoUploadBox
                                label="Logo Light"
                                previewBg="#F0F2F5"
                                logoSrc={storeEmp.logoLight}
                                onUpload={b64 => persistLogo(emp.id, 'logoLight', b64)}
                                onRemove={() => persistLogo(emp.id, 'logoLight', null)}
                                borderColor={DARK.border}
                                mutedColor={DARK.muted}
                                surfaceColor={DARK.surface}
                                redColor={DARK.red}
                              />
                            </div>
                          ) : (
                            <p className="text-xs text-zinc-500">
                              O preview dos logos usa as empresas do seu acesso — vincule seu usuário a esta empresa para gerenciá-los.
                            </p>
                          )}
                        </div>
                      )
                    })()}
                    {!isSoftDeleted && (
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <span className="text-sm text-zinc-300 block">Resync do extrato</span>
                          <span className="text-xs text-zinc-500">Apaga e re-sincroniza todos os lançamentos bancários da Omie (~10-20 min).</span>
                        </div>
                        <button
                          onClick={() => handleResyncExtrato(emp)}
                          disabled={resyncingIds.has(emp.id)}
                          aria-label={`Resync extrato ${emp.nome}`}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 transition-all disabled:opacity-50 disabled:cursor-wait flex-shrink-0"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${resyncingIds.has(emp.id) ? 'animate-spin' : ''}`} />
                          {resyncingIds.has(emp.id) ? 'Sincronizando...' : 'Resync extrato'}
                        </button>
                      </div>
                    )}
                    <div>
                    <h4 className="text-xs font-medium text-[#CCA000] uppercase tracking-wider mb-3">Credenciais Omie</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1.5">App Key</label>
                        <input
                          id={`appkey-${emp.id}`}
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#CCA000] font-mono"
                          placeholder="Insira o App Key da Omie"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1.5">App Secret</label>
                        <input
                          id={`appsecret-${emp.id}`}
                          type="password"
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#CCA000] font-mono"
                          placeholder="Insira o App Secret da Omie"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            const key = (document.getElementById(`appkey-${emp.id}`) as HTMLInputElement)?.value
                            const secret = (document.getElementById(`appsecret-${emp.id}`) as HTMLInputElement)?.value
                            if (key && secret) testarCredenciais(emp.id, key, secret)
                            else showToast('error', 'Preencha App Key e App Secret')
                          }}
                          disabled={testing === emp.id}
                          className="flex items-center gap-2 border border-zinc-700 hover:border-blue-500/40 text-zinc-200 rounded-xl px-4 py-2 text-sm font-medium transition-all disabled:opacity-50"
                        >
                          {testing === emp.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wifi className="w-3.5 h-3.5" />}
                          Testar Conexao
                        </button>
                        <button
                          onClick={() => {
                            const key = (document.getElementById(`appkey-${emp.id}`) as HTMLInputElement)?.value
                            const secret = (document.getElementById(`appsecret-${emp.id}`) as HTMLInputElement)?.value
                            if (key && secret) saveCredenciais(emp.id, key, secret)
                            else showToast('error', 'Preencha App Key e App Secret')
                          }}
                          className="bg-gradient-to-r from-[#CCA000] to-[#E0B82E] text-zinc-900 rounded-xl px-4 py-2 text-sm font-bold transition-all"
                        >
                          Salvar Credenciais
                        </button>
                      </div>
                      {testResults[emp.id] && (
                        <div className={`flex items-center gap-2 mt-2 text-xs font-medium ${testResults[emp.id]!.sucesso ? 'text-emerald-400' : 'text-red-400'}`}>
                          {testResults[emp.id]!.sucesso ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                          {testResults[emp.id]!.mensagem}
                        </div>
                      )}
                    </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
          {empresas.length === 0 && <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center"><Building2 className="w-10 h-10 text-zinc-600 mx-auto mb-4" /><p className="text-zinc-500">Nenhuma empresa cadastrada</p></div>}
        </div>
      )}

      {/* ═══ TAB: UNIDADES ═══ */}
      {tab === 'Unidades' && (
        <div>
          {/* Empresa selector */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Empresa</label>
            <select value={selectedEmpresa || ''} onChange={e => setSelectedEmpresa(Number(e.target.value))} className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#CCA000] w-full max-w-xs">
              {empresas.map(emp => <option key={emp.id} value={emp.id}>{emp.nome}</option>)}
            </select>
          </div>
          <div className="space-y-3">
            {unidades.map(uni => (
              <div key={uni.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-white">{uni.nome}</div>
                  {uni.codigo && <div className="text-xs text-zinc-500 font-mono">{uni.codigo}</div>}
                </div>
                <button onClick={() => deleteUnidade(uni.id)} className="p-2 rounded-lg hover:bg-red-500/10 text-zinc-500 hover:text-red-400 transition-all">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {unidades.length === 0 && <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center"><MapPin className="w-10 h-10 text-zinc-600 mx-auto mb-4" /><p className="text-zinc-500">Nenhuma unidade cadastrada para esta empresa</p></div>}
          </div>
        </div>
      )}

      {/* ═══ MODAIS ═══ */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">
                {showModal === 'user' ? 'Novo Usuário' : showModal === 'empresa' ? 'Nova Empresa' : 'Nova Unidade'}
              </h2>
              <button onClick={() => { setShowModal(null); setError('') }} className="text-zinc-500 hover:text-zinc-300"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              {showModal === 'user' && <>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Nome completo</label>
                  <input value={userForm.nome} onChange={e => setUserForm({ ...userForm, nome: e.target.value })} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#CCA000]" placeholder="João Silva" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">E-mail</label>
                  <input type="email" value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#CCA000]" placeholder="joao@grupoalt.com.br" />
                </div>
                {!senhaManual && (
                  <p className="text-xs text-zinc-400 leading-relaxed rounded-xl px-3 py-2.5 bg-[#CCA000]/10 border border-[#CCA000]/25">
                    O usuário receberá um <strong className="text-[#E0B82E]">convite por e-mail</strong> com
                    um link (válido por 7 dias) para definir a própria senha.
                  </p>
                )}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={senhaManual} onChange={e => setSenhaManual(e.target.checked)} className="w-4 h-4 rounded accent-[#CCA000]" />
                  <span className="text-sm text-zinc-300">Definir senha manualmente (sem convite)</span>
                </label>
                {senhaManual && (
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">Senha</label>
                    <input type="password" value={userForm.senha} onChange={e => setUserForm({ ...userForm, senha: e.target.value })} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#CCA000]" placeholder="••••••••" />
                  </div>
                )}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={userForm.is_admin} onChange={e => setUserForm({ ...userForm, is_admin: e.target.checked })} className="w-4 h-4 rounded accent-[#CCA000]" />
                  <span className="text-sm text-zinc-300">Administrador global</span>
                </label>
              </>}

              {showModal === 'empresa' && <>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Nome da empresa</label>
                  <input value={empresaForm.nome} onChange={e => setEmpresaForm({ ...empresaForm, nome: e.target.value })} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#CCA000]" placeholder="ALT Transportes" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">CNPJ</label>
                  <input value={empresaForm.cnpj} onChange={e => setEmpresaForm({ ...empresaForm, cnpj: e.target.value })} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#CCA000]" placeholder="00.000.000/0001-00" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Slug (identificador único)</label>
                  <input value={empresaForm.slug} onChange={e => setEmpresaForm({ ...empresaForm, slug: e.target.value })} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#CCA000]" placeholder="alt_transportes" />
                  <p className="text-[11px] text-zinc-500 mt-1">Usado para identificação interna. Sem espaços ou acentos.</p>
                </div>
                <div className="pt-2 border-t border-zinc-800">
                  <p className="text-xs font-medium text-[#CCA000] mb-3">Credenciais Omie (opcional)</p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1.5">App Key</label>
                      <input value={empresaForm.app_key} onChange={e => setEmpresaForm({ ...empresaForm, app_key: e.target.value })} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#CCA000] font-mono" placeholder="1234567890" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1.5">App Secret</label>
                      <input type="password" value={empresaForm.app_secret} onChange={e => setEmpresaForm({ ...empresaForm, app_secret: e.target.value })} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#CCA000] font-mono" placeholder="••••••••••••••••" />
                    </div>
                  </div>
                </div>
              </>}

              {showModal === 'unidade' && <>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Nome da unidade</label>
                  <input value={unidadeForm.nome} onChange={e => setUnidadeForm({ ...unidadeForm, nome: e.target.value })} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#CCA000]" placeholder="Frota SP" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Código (opcional)</label>
                  <input value={unidadeForm.codigo} onChange={e => setUnidadeForm({ ...unidadeForm, codigo: e.target.value })} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#CCA000]" placeholder="FSP" />
                </div>
              </>}

              {error && <p className="text-red-400 text-xs">{error}</p>}
              <button
                onClick={showModal === 'user' ? handleCreateUser : showModal === 'empresa' ? handleCreateEmpresa : handleCreateUnidade}
                disabled={saving}
                className="w-full bg-gradient-to-r from-[#CCA000] to-[#E0B82E] text-zinc-900 rounded-xl py-2.5 text-sm font-bold disabled:opacity-50 transition-all"
              >
                {saving ? 'Salvando...' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de soft delete (P0-7) */}
      <DeleteEmpresaModal
        empresa={deletingEmpresa}
        onClose={() => setDeletingEmpresa(null)}
        onSuccess={() => {
          showToast('success', `Empresa "${deletingEmpresa?.nome}" marcada como deletada`)
          loadData()
        }}
      />

      {/* Modal de soft delete de usuario (Bug #4) — triple-confirm via /admin/usuarios/{id} */}
      <DeleteUsuarioModal
        usuario={deletingUsuario}
        onClose={() => setDeletingUsuario(null)}
        onSuccess={() => {
          showToast('success', `Usuário "${deletingUsuario?.nome}" marcado como deletado`)
          loadData()
        }}
      />

      {/* Modal de hard delete (apagar em definitivo) — IRREVERSIVEL, exige soft-delete previo */}
      <ConfirmDeleteModal
        target={permanentDeletingUsuario}
        title="Apagar usuário em definitivo"
        confirmLabel="Apagar definitivo"
        idPrefix="permanent-delete-usuario"
        warningContent={
          permanentDeletingUsuario ? (
            <>
              Esta ação <strong>APAGA PERMANENTEMENTE</strong> o usuário{' '}
              <strong>{permanentDeletingUsuario.nome}</strong> ({permanentDeletingUsuario.email}){' '}
              e todos os seus vínculos, perfis e permissões. <strong>NÃO pode ser desfeita.</strong>{' '}
              Os logs de auditoria são preservados (sem o vínculo ao usuário).
            </>
          ) : null
        }
        onConfirm={permanentDeleteUsuario}
        errorMessages={{
          404: 'Usuário não encontrado (pode já ter sido apagado).',
          409: 'O apagar definitivo exige soft-delete prévio (use Excluir antes).',
        }}
        onClose={() => setPermanentDeletingUsuario(null)}
        onSuccess={() => {
          showToast('success', `Usuário "${permanentDeletingUsuario?.nome}" apagado em definitivo`)
          loadData()
        }}
      />

      {/* Modal de hard delete de EMPRESA — IRREVERSIVEL, cascade em credenciais,
          vinculos, permissoes e TODOS os dados financeiros. Exige soft-delete
          previo (409) + senha do admin + nome exato (403). */}
      <ConfirmDeleteModal
        target={permanentDeletingEmpresa}
        title="Apagar empresa em definitivo"
        confirmLabel="Apagar definitivo"
        idPrefix="permanent-delete-empresa"
        warningContent={
          permanentDeletingEmpresa ? (
            <>
              Esta ação <strong>APAGA PERMANENTEMENTE</strong> a empresa{' '}
              <strong>{permanentDeletingEmpresa.nome}</strong> e, em cascata,{' '}
              credenciais Omie, vínculos, permissões e <strong>todos os dados
              financeiros</strong> (lançamentos, CP/CR, baixas).{' '}
              <strong>NÃO pode ser desfeita.</strong> Recomenda-se snapshot do
              banco antes (Railway).
            </>
          ) : null
        }
        onConfirm={permanentDeleteEmpresa}
        errorMessages={{
          404: 'Empresa não encontrada (pode já ter sido apagada).',
          409: 'O apagar definitivo exige soft-delete prévio (use Excluir antes).',
        }}
        onClose={() => setPermanentDeletingEmpresa(null)}
        onSuccess={() => {
          showToast('success', `Empresa "${permanentDeletingEmpresa?.nome}" apagada em definitivo`)
          loadData()
        }}
      />
    </div>
  )
}
