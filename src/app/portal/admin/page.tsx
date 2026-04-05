'use client'

import { useEffect, useState } from 'react'
import { Users, Plus, Shield, Building2, MapPin, ChevronDown, ChevronUp, X, Trash2, Wifi, Loader2, CheckCircle, XCircle } from 'lucide-react'
import api from '@/lib/api'

interface UserData {
  id: number; nome: string; email: string; ativo: boolean; is_admin: boolean
  empresas: { id: number; nome: string; role: string }[]
  permissoes: { id: number; modulo: string; acao: string; empresa_id: number | null }[]
  unidades: { id: number; nome: string; empresa_id: number }[]
}
interface EmpresaOption { id: number; nome: string; cnpj: string | null; tem_credencial?: boolean }
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
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 4000)
  }

  // Forms
  const [userForm, setUserForm] = useState({ nome: '', email: '', senha: '', is_admin: false })
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

  useEffect(() => { loadData() }, [])
  useEffect(() => { if (selectedEmpresa) loadUnidades(selectedEmpresa) }, [selectedEmpresa])

  // User actions
  const handleCreateUser = async () => {
    setSaving(true); setError('')
    try {
      await api.post('/gestao/usuarios', userForm)
      setShowModal(null); setUserForm({ nome: '', email: '', senha: '', is_admin: false }); loadData()
    } catch (err: any) { setError(err?.response?.data?.detail || 'Erro') }
    finally { setSaving(false) }
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

  if (loading) return <div className="flex items-center justify-center h-64"><span className="text-zinc-500 text-sm">Carregando...</span></div>

  return (
    <div>
      {/* Toast notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm flex items-center gap-2 transition-all ${
          toast.type === 'success'
            ? 'bg-emerald-900/90 text-emerald-200 border border-emerald-700/50'
            : 'bg-red-900/90 text-red-200 border border-red-700/50'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}
          {toast.msg}
          <button onClick={() => setToast(null)} className="ml-2 opacity-60 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
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
          {usuarios.map(user => {
            const isExpanded = expandedUser === user.id
            return (
              <div key={user.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                <button onClick={() => setExpandedUser(isExpanded ? null : user.id)} className="w-full flex items-center gap-4 p-5 hover:bg-zinc-800/50 transition-colors text-left">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#CCA000] to-[#E0B82E] flex items-center justify-center text-zinc-900 text-xs font-bold flex-shrink-0">
                    {user.nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{user.nome}</span>
                      {user.is_admin && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#CCA000]/20 text-[#E0B82E] font-medium">ADMIN</span>}
                      {!user.ativo && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-medium">INATIVO</span>}
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
                {isExpanded && (
                  <div className="border-t border-zinc-800 p-5 space-y-6">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-300">Status</span>
                      <button onClick={() => toggleAtivo(user.id, user.ativo)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${user.ativo ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                        {user.ativo ? 'Ativo' : 'Inativo'} — clique para alternar
                      </button>
                    </div>
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
            return (
              <div key={emp.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                <button onClick={() => setExpandedEmpresa(isExp ? null : emp.id)} className="w-full flex items-center gap-4 p-5 hover:bg-zinc-800/50 transition-colors text-left">
                  <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-[#CCA000]" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white">{emp.nome}</div>
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
                {isExp && (
                  <div className="border-t border-zinc-800 p-5">
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
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Senha</label>
                  <input type="password" value={userForm.senha} onChange={e => setUserForm({ ...userForm, senha: e.target.value })} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#CCA000]" placeholder="••••••••" />
                </div>
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
    </div>
  )
}
