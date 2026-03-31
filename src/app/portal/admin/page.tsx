'use client'

import { useEffect, useState } from 'react'
import { Users, Plus, Shield, Building2, MapPin, ChevronDown, ChevronUp, X } from 'lucide-react'
import api from '@/lib/api'

interface UserData {
  id: number
  nome: string
  email: string
  ativo: boolean
  is_admin: boolean
  empresas: { id: number; nome: string; role: string }[]
  permissoes: { id: number; modulo: string; acao: string; empresa_id: number | null }[]
  unidades: { id: number; nome: string; empresa_id: number }[]
}

interface EmpresaOption { id: number; nome: string; cnpj: string | null }

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

export default function AdminPage() {
  const [usuarios, setUsuarios] = useState<UserData[]>([])
  const [empresas, setEmpresas] = useState<EmpresaOption[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [expandedUser, setExpandedUser] = useState<number | null>(null)
  const [form, setForm] = useState({ nome: '', email: '', senha: '', is_admin: false })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const loadData = () => {
    Promise.all([
      api.get('/gestao/usuarios'),
      api.get('/gestao/empresas'),
    ]).then(([usersRes, empresasRes]) => {
      setUsuarios(usersRes.data)
      setEmpresas(empresasRes.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  const handleCreate = async () => {
    setSaving(true)
    setError('')
    try {
      await api.post('/gestao/usuarios', form)
      setShowCreate(false)
      setForm({ nome: '', email: '', senha: '', is_admin: false })
      loadData()
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Erro ao criar usuário')
    } finally {
      setSaving(false)
    }
  }

  const toggleEmpresa = async (userId: number, empresaId: number, currentlyLinked: boolean) => {
    if (currentlyLinked) {
      await api.delete(`/gestao/usuarios/${userId}/empresas/${empresaId}`)
    } else {
      await api.post(`/gestao/usuarios/${userId}/empresas`, { empresa_id: empresaId, role: 'viewer' })
    }
    loadData()
  }

  const updateRole = async (userId: number, empresaId: number, role: string) => {
    await api.post(`/gestao/usuarios/${userId}/empresas`, { empresa_id: empresaId, role })
    loadData()
  }

  const togglePermissao = async (userId: number, modulo: string, acao: string, has: boolean) => {
    const user = usuarios.find(u => u.id === userId)
    if (!user) return
    const newPerms = user.permissoes
      .filter(p => !(p.modulo === modulo && p.acao === acao))
      .map(p => ({ modulo: p.modulo, acao: p.acao, empresa_id: p.empresa_id }))
    if (!has) {
      newPerms.push({ modulo, acao, empresa_id: null })
    }
    await api.put(`/gestao/usuarios/${userId}/permissoes`, newPerms)
    loadData()
  }

  const toggleAtivo = async (userId: number, ativo: boolean) => {
    await api.patch(`/gestao/usuarios/${userId}`, { ativo: !ativo })
    loadData()
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><span className="text-zinc-500 text-sm">Carregando...</span></div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight mb-1">Administração</h1>
          <p className="text-sm text-zinc-400">Gerencie usuários, acessos e permissões</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-gradient-to-r from-[#CCA000] to-[#E0B82E] text-zinc-900 rounded-xl px-4 py-2.5 text-sm font-bold transition-all shadow-sm">
          <Plus className="w-4 h-4" /> Novo Usuário
        </button>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">Novo Usuário</h2>
              <button onClick={() => setShowCreate(false)} className="text-zinc-500 hover:text-zinc-300"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Nome completo</label>
                <input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#CCA000]" placeholder="João Silva" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">E-mail</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#CCA000]" placeholder="joao@grupoalt.com.br" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Senha</label>
                <input type="password" value={form.senha} onChange={e => setForm({ ...form, senha: e.target.value })} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#CCA000]" placeholder="••••••••" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_admin} onChange={e => setForm({ ...form, is_admin: e.target.checked })} className="w-4 h-4 rounded accent-[#CCA000]" />
                <span className="text-sm text-zinc-300">Administrador global</span>
              </label>
              {error && <p className="text-red-400 text-xs">{error}</p>}
              <button onClick={handleCreate} disabled={saving || !form.nome || !form.email || !form.senha} className="w-full bg-gradient-to-r from-[#CCA000] to-[#E0B82E] text-zinc-900 rounded-xl py-2.5 text-sm font-bold disabled:opacity-50 transition-all">
                {saving ? 'Criando...' : 'Criar Usuário'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Users List */}
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
                  {/* Status */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-300">Status</span>
                    <button onClick={() => toggleAtivo(user.id, user.ativo)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${user.ativo ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                      {user.ativo ? 'Ativo' : 'Inativo'} — clique para alternar
                    </button>
                  </div>

                  {/* Empresas */}
                  <div>
                    <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5" /> Acesso a Empresas
                    </h4>
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

                  {/* Permissões */}
                  <div>
                    <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5" /> Permissões por Módulo
                    </h4>
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
      </div>

      {usuarios.length === 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center">
          <Users className="w-10 h-10 text-zinc-600 mx-auto mb-4" />
          <p className="text-zinc-500">Nenhum usuário cadastrado</p>
        </div>
      )}
    </div>
  )
}
