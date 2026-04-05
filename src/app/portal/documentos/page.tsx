'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/api'
import {
  FileText, Plus, Upload, Eye, CheckCircle, XCircle,
  Loader2, Search, Filter, Clock, Send, Archive,
} from 'lucide-react'

interface Documento {
  id: number
  titulo: string
  descricao: string | null
  categoria: string
  status: string
  versao_atual: number
  empresa_id: number | null
  criado_por_id: number | null
  criado_em: string | null
  atualizado_em: string | null
}

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  rascunho: { bg: 'rgba(100,116,139,0.15)', text: '#94A3B8', label: 'Rascunho' },
  em_revisao: { bg: 'rgba(251,191,36,0.15)', text: '#FBBF24', label: 'Em Revisão' },
  aprovado: { bg: 'rgba(52,211,153,0.15)', text: '#34D399', label: 'Aprovado' },
  publicado: { bg: 'rgba(56,189,248,0.15)', text: '#38BDF8', label: 'Publicado' },
  arquivado: { bg: 'rgba(100,116,139,0.1)', text: '#64748B', label: 'Arquivado' },
}

const CATEGORIAS = [
  { value: '', label: 'Todas' },
  { value: 'processo', label: 'Processos' },
  { value: 'politica', label: 'Políticas' },
  { value: 'planejamento', label: 'Planejamentos' },
]

export default function DocumentosPage() {
  const grupoAtivo = useAuthStore((s) => s.grupoAtivo)
  const [docs, setDocs] = useState<Documento[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ titulo: '', descricao: '', categoria: 'processo' })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 4000)
  }

  const loadDocs = useCallback(async () => {
    if (!grupoAtivo) return
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (catFilter) params.categoria = catFilter
      const res = await api.get(`/grupos/${grupoAtivo.id}/documentos`, { params })
      setDocs(res.data)
    } catch {
      showToast('error', 'Erro ao carregar documentos')
    } finally {
      setLoading(false)
    }
  }, [grupoAtivo, catFilter])

  useEffect(() => { loadDocs() }, [loadDocs])

  const createDoc = async () => {
    if (!grupoAtivo || !form.titulo.trim()) return
    setSaving(true)
    try {
      await api.post(`/grupos/${grupoAtivo.id}/documentos`, {
        titulo: form.titulo,
        descricao: form.descricao || null,
        categoria: form.categoria,
      })
      showToast('success', 'Documento criado')
      setShowModal(false)
      setForm({ titulo: '', descricao: '', categoria: 'processo' })
      loadDocs()
    } catch (err: any) {
      showToast('error', err?.response?.data?.detail || 'Erro ao criar documento')
    } finally {
      setSaving(false)
    }
  }

  const doAction = async (docId: number, action: string) => {
    if (!grupoAtivo) return
    try {
      await api.post(`/grupos/${grupoAtivo.id}/documentos/${docId}/${action}`)
      showToast('success', `Ação '${action}' realizada`)
      loadDocs()
    } catch (err: any) {
      showToast('error', err?.response?.data?.detail || `Erro: ${action}`)
    }
  }

  const filtered = docs.filter((d) => {
    if (search && !d.titulo.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const fmtDate = (iso: string | null) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  if (!grupoAtivo) {
    return (
      <div className="flex items-center justify-center h-64" style={{ color: 'var(--muted)' }}>
        <p className="text-sm">Selecione um grupo para ver documentos</p>
      </div>
    )
  }

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm flex items-center gap-2 ${
          toast.type === 'success'
            ? 'bg-emerald-900/90 text-emerald-200 border border-emerald-700/50'
            : 'bg-red-900/90 text-red-200 border border-red-700/50'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>Documentação Institucional</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>{filtered.length} documentos</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
          style={{ background: 'var(--blue-dim, rgba(56,189,248,0.12))', color: 'var(--blue)', border: '1px solid rgba(56,189,248,0.2)' }}
        >
          <Plus size={16} /> Novo Documento
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título..."
            className="w-full pl-9 pr-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
          />
        </div>
        <div className="flex gap-1.5">
          {CATEGORIAS.map((c) => (
            <button
              key={c.value}
              onClick={() => setCatFilter(c.value)}
              className="px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-all"
              style={{
                border: `1px solid ${catFilter === c.value ? 'var(--blue)' : 'var(--border)'}`,
                background: catFilter === c.value ? 'var(--blue-dim, rgba(56,189,248,0.12))' : 'transparent',
                color: catFilter === c.value ? 'var(--blue)' : 'var(--muted)',
                fontWeight: catFilter === c.value ? 600 : 400,
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-48 gap-2">
          <Loader2 size={18} className="animate-spin" style={{ color: 'var(--blue)' }} />
          <span className="text-sm" style={{ color: 'var(--muted)' }}>Carregando...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-2">
          <FileText size={32} style={{ color: 'var(--muted)' }} />
          <span className="text-sm" style={{ color: 'var(--muted)' }}>Nenhum documento encontrado</span>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid var(--border)' }}>
          <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--surface)' }}>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Título</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Categoria</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Versão</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Atualizado</th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((doc) => {
                const st = STATUS_COLORS[doc.status] || STATUS_COLORS.rascunho
                return (
                  <tr key={doc.id} className="transition-colors hover:bg-white/[0.02]" style={{ borderTop: '1px solid var(--border)' }}>
                    <td className="px-4 py-3">
                      <div className="font-medium" style={{ color: 'var(--text)' }}>{doc.titulo}</div>
                      {doc.descricao && <div className="text-xs mt-0.5 truncate max-w-[300px]" style={{ color: 'var(--muted)' }}>{doc.descricao}</div>}
                    </td>
                    <td className="px-4 py-3 text-xs capitalize" style={{ color: 'var(--muted)' }}>{doc.categoria}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: st.bg, color: st.text }}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--muted)' }}>v{doc.versao_atual}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--muted)' }}>{fmtDate(doc.atualizado_em)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {doc.status === 'rascunho' && (
                          <button onClick={() => doAction(doc.id, 'submeter')} title="Submeter para revisão" className="p-1.5 rounded-md hover:bg-white/[0.05]" style={{ color: 'var(--blue)' }}>
                            <Send size={14} />
                          </button>
                        )}
                        {doc.status === 'em_revisao' && (
                          <>
                            <button onClick={() => doAction(doc.id, 'aprovar')} title="Aprovar" className="p-1.5 rounded-md hover:bg-white/[0.05]" style={{ color: 'var(--green)' }}>
                              <CheckCircle size={14} />
                            </button>
                            <button onClick={() => doAction(doc.id, 'rejeitar')} title="Rejeitar" className="p-1.5 rounded-md hover:bg-white/[0.05]" style={{ color: 'var(--red)' }}>
                              <XCircle size={14} />
                            </button>
                          </>
                        )}
                        {doc.status === 'aprovado' && (
                          <button onClick={() => doAction(doc.id, 'publicar')} title="Publicar" className="p-1.5 rounded-md hover:bg-white/[0.05]" style={{ color: 'var(--green)' }}>
                            <Eye size={14} />
                          </button>
                        )}
                        <button onClick={() => doAction(doc.id, 'arquivar')} title="Arquivar" className="p-1.5 rounded-md hover:bg-white/[0.05]" style={{ color: 'var(--muted)' }}>
                          <Archive size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl p-6" style={{ background: 'var(--surface-elevated, #0A0F1E)', border: '1px solid var(--border)' }}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text)' }}>Novo Documento</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--muted)' }}>Título</label>
                <input
                  value={form.titulo}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  placeholder="Nome do documento"
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--muted)' }}>Descrição</label>
                <textarea
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none h-20"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  placeholder="Descrição opcional"
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--muted)' }}>Categoria</label>
                <select
                  value={form.categoria}
                  onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
                >
                  <option value="processo">Processo</option>
                  <option value="politica">Política</option>
                  <option value="planejamento">Planejamento</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg text-sm"
                style={{ color: 'var(--muted)', border: '1px solid var(--border)' }}
              >
                Cancelar
              </button>
              <button
                onClick={createDoc}
                disabled={saving || !form.titulo.trim()}
                className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                style={{ background: 'var(--blue)', color: '#fff' }}
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                Criar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
