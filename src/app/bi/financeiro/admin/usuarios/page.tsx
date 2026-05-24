'use client'
/* ═══════════════════════════════════════════════════════════════
   /bi/financeiro/admin/usuarios — Fase A PR 4 frontend (2026-05-22).

   UI admin pra atribuir/revogar perfis RBAC aos usuarios. Lista
   todos os users + tabela de atribuicoes por usuario com dropdowns
   de perfil e empresa.

   Acesso: somente admin global (useRequireAdmin).
   ═══════════════════════════════════════════════════════════════ */

import { useState, useMemo } from 'react'
import { Users, Trash2, Plus, Shield, Loader2, UserX, ArchiveRestore, X } from 'lucide-react'
import { useThemeStore } from '@/store/themeStore'
import { useAuthStore } from '@/store/authStore'
import { useRequireAdmin } from '@/hooks/useRequireAdmin'
import { AccessDenied } from '@/components/AccessDenied'
import { AdminSubNav } from '@/components/admin/AdminSubNav'
import { DeleteUsuarioModal } from '@/components/admin/DeleteUsuarioModal'
import { describeAxiosError, type ErrorPresentation } from '@/lib/errorPresentation'
import {
  useAdminUsuarios,
  useAdminPerfis,
  useAdminUsuarioAtribuicoes,
  criarAtribuicaoPerfil,
  removerAtribuicaoPerfil,
  restaurarUsuario,
  type AdminUsuarioListado,
  type AtribuicaoPerfil,
} from '@/hooks/api/useAdminPerfis'


// Mapeamento de severidade -> cores do banner (consistente com ChatPanel
// do Orbit). `rate` e `warn` usam ambar; `error` vermelho; `info` cinza
// (graceful degradation — feature continua usavel).
const SEVERITY_COLORS = {
  rate:  { fg: '#fde68a', bg: '#78350f22', border: '#fbbf2455' },
  warn:  { fg: '#fde68a', bg: '#78350f22', border: '#fbbf2455' },
  error: { fg: '#fca5a5', bg: '#7f1d1d22', border: '#f8717155' },
  info:  { fg: '#cbd5e1', bg: '#1e293b22', border: '#64748b55' },
} as const


export default function AdminUsuariosPage() {
  const adminAccess = useRequireAdmin()
  const t = useThemeStore((s) => s.tokens)
  const empresas = useAuthStore((s) => s.empresas)
  const currentUser = useAuthStore((s) => s.user)

  // F2 (2026-05-23): toggle "Mostrar deletados" controla include_deleted.
  // Quando ligado, lista mostra soft-deletados com badge + botao Restaurar.
  const [includeDeleted, setIncludeDeleted] = useState(false)
  const usuariosResult = useAdminUsuarios({ includeDeleted })
  const perfisResult = useAdminPerfis()

  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [busca, setBusca] = useState('')
  // Bug #4: alvo do soft delete. Null = modal fechado.
  const [deleteAlvo, setDeleteAlvo] = useState<AdminUsuarioListado | null>(null)
  // F2: ids em loading durante restore (botao mostra spinner).
  // Usa Set pra permitir restaurar varios users em paralelo sem que o
  // spinner do segundo apague o do primeiro (sugestao do audit #148).
  const [restoringIds, setRestoringIds] = useState<Set<number>>(() => new Set())
  const [restoreError, setRestoreError] = useState<ErrorPresentation | null>(null)

  async function handleRestore(u: AdminUsuarioListado) {
    setRestoringIds((prev) => {
      const next = new Set(prev)
      next.add(u.id)
      return next
    })
    setRestoreError(null)
    try {
      await restaurarUsuario(u.id)
      usuariosResult.refetch()
    } catch (err: unknown) {
      setRestoreError(
        describeAxiosError(err, { entity: 'usuario', prefix: `Falha ao restaurar ${u.nome}` }),
      )
    } finally {
      setRestoringIds((prev) => {
        if (!prev.has(u.id)) return prev
        const next = new Set(prev)
        next.delete(u.id)
        return next
      })
    }
  }

  // useRequireAdmin retorna AdminAccess = 'loading' | 'allowed' | 'denied'
  // (enum string). Tem que comparar explicitamente — `if (!access)` daria
  // sempre false (qualquer string nao-vazia eh truthy).
  if (adminAccess === 'loading') {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '60vh', color: t.muted, fontSize: 12,
      }}>
        Carregando...
      </div>
    )
  }
  if (adminAccess === 'denied') {
    return <AccessDenied message="A gestao de usuarios e restrita a administradores." />
  }

  const usuarios = usuariosResult.data ?? []
  const perfis = perfisResult.data ?? []
  const usuariosFiltrados = busca.trim()
    ? usuarios.filter((u) =>
        u.nome.toLowerCase().includes(busca.toLowerCase()) ||
        u.email.toLowerCase().includes(busca.toLowerCase()),
      )
    : usuarios

  const userSelecionado = usuariosFiltrados.find((u) => u.id === selectedUserId) ?? null

  return (
    <div style={{ padding: 24, color: t.text, fontFamily: 'var(--font-body)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <Users size={22} style={{ color: t.blue }} />
        <h1
          style={{
            fontSize: 20, fontWeight: 700, color: t.text, margin: 0,
            fontFamily: 'var(--font-display)',
          }}
        >
          Usuários e Perfis
        </h1>
      </div>
      <p style={{ fontSize: 13, color: t.muted, margin: '0 0 16px 0' }}>
        Atribua perfis RBAC aos usuários por empresa. Permissões efetivas =
        união dos perfis + overrides.
      </p>

      <AdminSubNav active="usuarios" />

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16 }}>
        {/* Coluna esquerda: lista de usuarios */}
        <div
          style={{
            background: t.surface,
            border: `1px solid ${t.border}`,
            borderRadius: 8,
            padding: 12,
            height: 'calc(100vh - 240px)',
            overflowY: 'auto',
          }}
        >
          <input
            type="search"
            placeholder="Buscar por nome ou email..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={{
              width: '100%', padding: '8px 10px', borderRadius: 6,
              background: t.bg, color: t.text,
              border: `1px solid ${t.border}`, fontSize: 12, marginBottom: 8,
            }}
          />

          {/* F2: toggle Mostrar deletados (UI de restore) */}
          <label
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 11, color: t.muted, marginBottom: 10,
              cursor: 'pointer', userSelect: 'none',
            }}
          >
            <input
              type="checkbox"
              checked={includeDeleted}
              onChange={(e) => setIncludeDeleted(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            Mostrar usuários deletados
          </label>

          {restoreError && (() => {
            const c = SEVERITY_COLORS[restoreError.severity]
            return (
              <div
                role="alert"
                data-severity={restoreError.severity}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 8,
                  color: c.fg, fontSize: 11, padding: 8, marginBottom: 8,
                  background: c.bg, border: `1px solid ${c.border}`,
                  borderRadius: 6,
                }}
              >
                <span style={{ flex: 1 }}>{restoreError.message}</span>
                <button
                  type="button"
                  onClick={() => setRestoreError(null)}
                  aria-label="Fechar mensagem de erro"
                  style={{
                    flexShrink: 0,
                    background: 'transparent', border: 'none',
                    color: c.fg, cursor: 'pointer', padding: 0,
                    display: 'flex', alignItems: 'center',
                  }}
                >
                  <X size={12} />
                </button>
              </div>
            )
          })()}

          {usuariosResult.loading && (
            <div style={{ color: t.muted, fontSize: 12, padding: 12, textAlign: 'center' }}>
              <Loader2 size={14} className="animate-spin" /> Carregando usuários...
            </div>
          )}

          {usuariosResult.error && (
            <div style={{ color: '#f87171', fontSize: 12, padding: 8 }}>
              Erro: {usuariosResult.error}
            </div>
          )}

          {!usuariosResult.loading && usuariosFiltrados.length === 0 && (
            <div style={{ color: t.muted, fontSize: 12, padding: 12, textAlign: 'center' }}>
              Nenhum usuário encontrado.
            </div>
          )}

          {usuariosFiltrados.map((u) => {
            const isDeleted = u.deleted_at != null
            const isRestoring = restoringIds.has(u.id)
            return (
              <div
                key={u.id}
                style={{
                  position: 'relative',
                  marginBottom: 4,
                  opacity: isDeleted ? 0.65 : 1,
                }}
              >
                <button
                  onClick={() => setSelectedUserId(u.id)}
                  disabled={isDeleted}
                  title={isDeleted
                    ? 'Usuário deletado — restaure para selecionar'
                    : undefined}
                  style={{
                    width: '100%',
                    display: 'flex', flexDirection: 'column', gap: 2,
                    padding: '8px 10px',
                    paddingRight: isDeleted ? 92 : 10,
                    borderRadius: 6, textAlign: 'left',
                    background: u.id === selectedUserId ? t.blueDim : 'transparent',
                    border: `1px solid ${u.id === selectedUserId ? t.blue + '66' : 'transparent'}`,
                    color: t.text,
                    cursor: isDeleted ? 'not-allowed' : 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      fontSize: 13, fontWeight: 500,
                      textDecoration: isDeleted ? 'line-through' : 'none',
                    }}>
                      {u.nome}
                    </span>
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      {u.is_admin && (
                        <span style={{
                          fontSize: 9, padding: '1px 6px', borderRadius: 4,
                          background: t.goldDim, color: t.gold, fontWeight: 600,
                          letterSpacing: '0.05em', textTransform: 'uppercase',
                        }}>
                          Admin
                        </span>
                      )}
                      {isDeleted && (
                        <span
                          aria-label="Usuário deletado"
                          style={{
                            fontSize: 9, padding: '1px 6px', borderRadius: 4,
                            background: '#7f1d1d44', color: '#fca5a5', fontWeight: 600,
                            letterSpacing: '0.05em', textTransform: 'uppercase',
                          }}
                        >
                          Deletado
                        </span>
                      )}
                    </div>
                  </div>
                  <span style={{ fontSize: 11, color: t.muted }}>{u.email}</span>
                </button>

                {/* F2: botao Restaurar sobreposto na borda direita do item */}
                {isDeleted && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRestore(u)
                    }}
                    disabled={isRestoring}
                    title={`Restaurar ${u.nome}`}
                    aria-label={`Restaurar ${u.nome}`}
                    style={{
                      position: 'absolute', right: 6, top: '50%',
                      transform: 'translateY(-50%)',
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '4px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                      background: t.surface,
                      color: isRestoring ? t.muted : t.blue,
                      border: `1px solid ${isRestoring ? t.border : t.blue + '55'}`,
                      cursor: isRestoring ? 'wait' : 'pointer',
                    }}
                  >
                    {isRestoring
                      ? <Loader2 size={10} className="animate-spin" />
                      : <ArchiveRestore size={10} />}
                    Restaurar
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* Coluna direita: detalhe + atribuicoes */}
        <div
          style={{
            background: t.surface,
            border: `1px solid ${t.border}`,
            borderRadius: 8,
            padding: 16,
            height: 'calc(100vh - 240px)',
            overflowY: 'auto',
          }}
        >
          {!userSelecionado ? (
            <EmptyDetalhe t={t} />
          ) : (
            <DetalheUsuario
              user={userSelecionado}
              perfis={perfis}
              empresas={empresas}
              t={t}
              isAutoDelete={currentUser?.id === userSelecionado.id}
              isSoftDeleted={userSelecionado.deleted_at != null}
              onRequestDelete={() => setDeleteAlvo(userSelecionado)}
            />
          )}
        </div>
      </div>

      {/* Bug #4: modal de soft delete. Renderiza em portal-like overlay */}
      <DeleteUsuarioModal
        usuario={deleteAlvo}
        onClose={() => setDeleteAlvo(null)}
        onSuccess={() => {
          // Refetch a lista pra remover o user soft-deletado (filtro padrao
          // do backend exclui). Se o user deletado era o selecionado,
          // deseleciona pra mostrar empty state.
          if (deleteAlvo && deleteAlvo.id === selectedUserId) {
            setSelectedUserId(null)
          }
          usuariosResult.refetch()
        }}
      />
    </div>
  )
}


function EmptyDetalhe({ t }: { t: ReturnType<typeof useThemeStore.getState>['tokens'] }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100%', gap: 12, color: t.muted,
    }}>
      <Shield size={40} style={{ opacity: 0.3 }} />
      <p style={{ fontSize: 13, margin: 0 }}>
        Selecione um usuário à esquerda para ver e editar atribuições de perfil.
      </p>
    </div>
  )
}


interface DetalheUsuarioProps {
  user: AdminUsuarioListado
  perfis: ReturnType<typeof useAdminPerfis>['data'] extends infer T
    ? T extends Array<infer E> ? E[] : never : never
  empresas: ReturnType<typeof useAuthStore.getState>['empresas']
  t: ReturnType<typeof useThemeStore.getState>['tokens']
  /** True quando o usuario selecionado eh o admin logado.
   *  Backend bloqueia auto-delete com 403, mas desabilitamos o botao
   *  em UI tambem pra evitar caminho de erro. */
  isAutoDelete: boolean
  /** F2 (2026-05-23): True quando o user ja esta soft-deletado.
   *  Em fluxo normal nao chega aqui (lista bloqueia selecao de deletado),
   *  mas defense in depth contra race (outro admin deletou em paralelo). */
  isSoftDeleted: boolean
  /** Callback pra abrir o modal de delete (state vive no parent). */
  onRequestDelete: () => void
}


function DetalheUsuario({ user, perfis, empresas, t, isAutoDelete, isSoftDeleted, onRequestDelete }: DetalheUsuarioProps) {
  const atribuicoesResult = useAdminUsuarioAtribuicoes(user.id)
  const atribuicoes: AtribuicaoPerfil[] = atribuicoesResult.data ?? []

  const [novaPerfilId, setNovaPerfilId] = useState<number | ''>('')
  const [novaEmpresaId, setNovaEmpresaId] = useState<number | ''>('')
  const [adicionando, setAdicionando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const empresasDisponiveis = useMemo(() => {
    // Filtra empresas onde o user ja NAO tem o perfil selecionado.
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
      await criarAtribuicaoPerfil(user.id, Number(novaPerfilId), Number(novaEmpresaId))
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
    try {
      await removerAtribuicaoPerfil(user.id, atribuicaoId)
      atribuicoesResult.refetch()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } }; message?: string }
      setErro(e?.response?.data?.detail || e?.message || 'Erro ao revogar perfil')
    }
  }

  return (
    <div>
      {/* Header do usuario */}
      <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: `1px solid ${t.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: t.text }}>
              {user.nome}
            </h2>
            <div style={{ fontSize: 12, color: t.muted, marginTop: 4 }}>
              {user.email}
              {user.is_admin && (
                <span style={{
                  marginLeft: 8, padding: '1px 6px', borderRadius: 4,
                  background: t.goldDim, color: t.gold, fontSize: 10, fontWeight: 600,
                  letterSpacing: '0.05em', textTransform: 'uppercase',
                }}>
                  Admin Global
                </span>
              )}
            </div>
          </div>
          {/* Bug #4: botao Excluir usuario (soft delete). Disabled em auto-delete
              ou se ja esta soft-deletado — backend rejeita com 403/409, evitamos
              caminho de erro em UI. */}
          {(() => {
            const deleteDisabled = isAutoDelete || isSoftDeleted
            const disabledReason = isAutoDelete
              ? 'Voce nao pode deletar a si mesmo. Peca a outro admin.'
              : isSoftDeleted
                ? 'Usuario ja esta soft-deletado. Use Restaurar antes.'
                : 'Soft delete deste usuario (reversivel via API)'
            return (
              <button
                onClick={onRequestDelete}
                disabled={deleteDisabled}
                title={disabledReason}
                style={{
                  flexShrink: 0,
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                  background: 'transparent',
                  color: deleteDisabled ? t.muted : t.red,
                  border: `1px solid ${deleteDisabled ? t.border : t.red + '55'}`,
                  cursor: deleteDisabled ? 'not-allowed' : 'pointer',
                  opacity: deleteDisabled ? 0.5 : 1,
                }}
              >
                <UserX size={12} /> Excluir usuario
              </button>
            )
          })()}
        </div>
        {user.is_admin && (
          <div style={{
            marginTop: 10, padding: 8, fontSize: 11,
            background: t.goldDim, border: `1px solid ${t.gold}33`,
            borderRadius: 6, color: t.gold,
          }}>
            Admin global tem bypass total no RBAC — as atribuições abaixo são
            efetivamente ignoradas até `is_admin` ser desligado.
          </div>
        )}
      </div>

      {/* Formulario adicionar */}
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, margin: '0 0 10px 0', color: t.text }}>
          Atribuir novo perfil
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8 }}>
          <select
            value={novaPerfilId}
            onChange={(e) => setNovaPerfilId(e.target.value ? Number(e.target.value) : '')}
            style={{
              padding: '8px 10px', borderRadius: 6, fontSize: 12,
              background: t.bg, color: t.text, border: `1px solid ${t.border}`,
            }}
          >
            <option value="">Selecione um perfil...</option>
            {perfis.map((p) => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
          <select
            value={novaEmpresaId}
            onChange={(e) => setNovaEmpresaId(e.target.value ? Number(e.target.value) : '')}
            style={{
              padding: '8px 10px', borderRadius: 6, fontSize: 12,
              background: t.bg, color: t.text, border: `1px solid ${t.border}`,
            }}
          >
            <option value="">Selecione uma empresa...</option>
            {empresasDisponiveis.map((e) => (
              <option key={e.id} value={e.id}>{e.nome}</option>
            ))}
          </select>
          <button
            onClick={handleAdicionar}
            disabled={!novaPerfilId || !novaEmpresaId || adicionando}
            style={{
              padding: '8px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
              background: t.blue, color: '#fff', border: 'none',
              cursor: !novaPerfilId || !novaEmpresaId || adicionando ? 'not-allowed' : 'pointer',
              opacity: !novaPerfilId || !novaEmpresaId || adicionando ? 0.5 : 1,
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {adicionando ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
            Atribuir
          </button>
        </div>
        {erro && (
          <div style={{
            marginTop: 8, padding: 8, fontSize: 11,
            background: '#7f1d1d22', border: '1px solid #f8717155',
            color: '#fca5a5', borderRadius: 6,
          }}>
            {erro}
          </div>
        )}
      </div>

      {/* Lista de atribuicoes atuais */}
      <div>
        <h3 style={{ fontSize: 13, fontWeight: 600, margin: '0 0 10px 0', color: t.text }}>
          Atribuições atuais ({atribuicoes.length})
        </h3>

        {atribuicoesResult.loading && (
          <div style={{ color: t.muted, fontSize: 12, padding: 12, textAlign: 'center' }}>
            <Loader2 size={14} className="animate-spin" /> Carregando atribuições...
          </div>
        )}

        {!atribuicoesResult.loading && atribuicoes.length === 0 && (
          <div style={{
            padding: 24, textAlign: 'center', color: t.muted, fontSize: 12,
            background: t.bg, border: `1px dashed ${t.border}`, borderRadius: 6,
          }}>
            Nenhum perfil atribuído. Use o formulário acima pra começar.
          </div>
        )}

        {atribuicoes.map((a) => {
          const perfil = perfis.find((p) => p.id === a.perfil_id)
          return (
            <div
              key={a.id}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 12px', marginBottom: 6,
                background: t.bg, border: `1px solid ${t.border}`, borderRadius: 6,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: t.text }}>
                    {a.perfil_nome}
                  </span>
                  {perfil?.exports_confidencial && (
                    <span style={{
                      fontSize: 9, padding: '1px 6px', borderRadius: 4,
                      background: '#7f1d1d44', color: '#fca5a5', fontWeight: 600,
                      letterSpacing: '0.05em', textTransform: 'uppercase',
                    }}>
                      Marca confidencial
                    </span>
                  )}
                </div>
                <span style={{ fontSize: 11, color: t.muted }}>
                  em <strong>{a.empresa_nome}</strong>
                  {' · '}
                  desde {new Date(a.criado_em).toLocaleDateString('pt-BR')}
                </span>
              </div>
              <button
                onClick={() => handleRemover(a.id)}
                style={{
                  padding: '6px 10px', borderRadius: 4, fontSize: 11,
                  background: 'transparent', color: '#f87171',
                  border: `1px solid #f8717133`, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}
                title="Revogar"
              >
                <Trash2 size={11} /> Revogar
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
