'use client'
/* ═══════════════════════════════════════════════════════════════
   Seção "Perfis RBAC" do detalhe de usuário em /portal/admin
   (2026-07-15 — gestão de usuários unificada na Administração).

   Mesma funcionalidade da antiga tela /bi/financeiro/admin/usuarios
   (Fase A PR 4): atribuir/revogar perfis canônicos por empresa via
   /admin/perfis + /admin/usuarios/{id}/atribuicoes. Com RBAC_ENFORCE
   ligado em produção, usuário não-admin SEM perfil recebe 403 em todo
   o BI — esta seção é o caminho de provisionamento.

   Estilizada em Tailwind (zinc) pra casar com o visual fixo dark do
   /portal/admin, diferente do original que usava ThemeTokens do BI.
   ═══════════════════════════════════════════════════════════════ */

import { useMemo, useState } from 'react'
import { Loader2, Plus, Shield, Trash2 } from 'lucide-react'
import {
  useAdminPerfis,
  useAdminUsuarioAtribuicoes,
  criarAtribuicaoPerfil,
  removerAtribuicaoPerfil,
  type AtribuicaoPerfil,
} from '@/hooks/api/useAdminPerfis'

interface EmpresaOpcao {
  id: number
  nome: string
}

interface Props {
  usuarioId: number
  isAdmin: boolean
  empresas: EmpresaOpcao[]
}

export function PerfisRBACSection({ usuarioId, isAdmin, empresas }: Props) {
  const perfisResult = useAdminPerfis()
  const atribuicoesResult = useAdminUsuarioAtribuicoes(usuarioId)
  const perfis = perfisResult.data ?? []
  const atribuicoesData = atribuicoesResult.data
  // Estabiliza a referência pro useMemo abaixo (o `?? []` inline criaria
  // um array novo a cada render).
  const atribuicoes: AtribuicaoPerfil[] = useMemo(
    () => atribuicoesData ?? [],
    [atribuicoesData],
  )

  const [novaPerfilId, setNovaPerfilId] = useState<number | ''>('')
  const [novaEmpresaId, setNovaEmpresaId] = useState<number | ''>('')
  const [adicionando, setAdicionando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const empresasDisponiveis = useMemo(() => {
    // Filtra empresas onde o user já NÃO tem o perfil selecionado.
    if (!novaPerfilId) return empresas
    const jaAtribuidas = atribuicoes
      .filter((a) => a.perfil_id === novaPerfilId)
      .map((a) => String(a.empresa_id))
    return empresas.filter((e) => !jaAtribuidas.includes(String(e.id)))
  }, [empresas, atribuicoes, novaPerfilId])

  const handleAdicionar = async () => {
    if (!novaPerfilId || !novaEmpresaId) return
    setAdicionando(true)
    setErro(null)
    try {
      await criarAtribuicaoPerfil(usuarioId, Number(novaPerfilId), Number(novaEmpresaId))
      atribuicoesResult.refetch()
      setNovaPerfilId('')
      setNovaEmpresaId('')
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } }; message?: string }
      setErro(e?.response?.data?.detail || e?.message || 'Erro ao atribuir perfil')
    } finally {
      setAdicionando(false)
    }
  }

  const handleRemover = async (atribuicaoId: number) => {
    if (!confirm('Revogar este perfil deste usuário nesta empresa?')) return
    setErro(null)
    try {
      await removerAtribuicaoPerfil(usuarioId, atribuicaoId)
      atribuicoesResult.refetch()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } }; message?: string }
      setErro(e?.response?.data?.detail || e?.message || 'Erro ao revogar perfil')
    }
  }

  return (
    <div>
      <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
        <Shield className="w-3.5 h-3.5" /> Perfis RBAC (BI)
      </h4>

      {isAdmin && (
        <div className="mb-3 px-3 py-2 rounded-xl bg-[#CCA000]/10 border border-[#CCA000]/25 text-xs text-[#E0B82E]">
          Admin global tem bypass total no RBAC — as atribuições abaixo são
          efetivamente ignoradas até o flag de admin ser desligado.
        </div>
      )}

      {/* Formulário atribuir */}
      <div className="flex flex-wrap gap-2 mb-3">
        <select
          value={novaPerfilId}
          onChange={(e) => setNovaPerfilId(e.target.value ? Number(e.target.value) : '')}
          aria-label="Perfil RBAC"
          className="flex-1 min-w-[160px] bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-[#CCA000]"
        >
          <option value="">Selecione um perfil...</option>
          {perfis.map((p) => (
            <option key={p.id} value={p.id}>{p.nome}</option>
          ))}
        </select>
        <select
          value={novaEmpresaId}
          onChange={(e) => setNovaEmpresaId(e.target.value ? Number(e.target.value) : '')}
          aria-label="Empresa do perfil"
          className="flex-1 min-w-[160px] bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-[#CCA000]"
        >
          <option value="">Selecione uma empresa...</option>
          {empresasDisponiveis.map((e) => (
            <option key={e.id} value={e.id}>{e.nome}</option>
          ))}
        </select>
        <button
          onClick={handleAdicionar}
          disabled={!novaPerfilId || !novaEmpresaId || adicionando}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-[#CCA000] to-[#E0B82E] text-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {adicionando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          Atribuir
        </button>
      </div>

      {erro && (
        <div role="alert" className="mb-3 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
          {erro}
        </div>
      )}

      {/* Lista de atribuições */}
      {atribuicoesResult.loading && (
        <div className="flex items-center gap-2 text-xs text-zinc-500 px-3 py-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Carregando atribuições...
        </div>
      )}

      {!atribuicoesResult.loading && atribuicoes.length === 0 && (
        <div className="px-3 py-4 rounded-xl border border-dashed border-zinc-700 text-xs text-zinc-500 text-center">
          Nenhum perfil atribuído. Sem perfil, usuário não-admin recebe 403 no BI.
        </div>
      )}

      <div className="space-y-2">
        {atribuicoes.map((a) => {
          const perfil = perfis.find((p) => p.id === a.perfil_id)
          return (
            <div key={a.id} className="flex items-center justify-between py-2 px-3 rounded-xl bg-zinc-800/50">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-zinc-200">{a.perfil_nome}</span>
                  {perfil?.exports_confidencial && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-medium uppercase">
                      Marca confidencial
                    </span>
                  )}
                </div>
                <span className="text-xs text-zinc-500">
                  em <strong className="text-zinc-400">{a.empresa_nome}</strong>
                  {' · '}desde {new Date(a.criado_em).toLocaleDateString('pt-BR')}
                </span>
              </div>
              <button
                onClick={() => handleRemover(a.id)}
                aria-label={`Revogar ${a.perfil_nome} em ${a.empresa_nome}`}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all flex-shrink-0"
              >
                <Trash2 className="w-3 h-3" /> Revogar
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
