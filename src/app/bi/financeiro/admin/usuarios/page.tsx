'use client'
/* ═══════════════════════════════════════════════════════════════
   /bi/financeiro/admin/usuarios — Fase A PR 4 frontend (2026-05-22).

   UI admin pra atribuir/revogar perfis RBAC aos usuarios. Lista
   todos os users + tabela de atribuicoes por usuario com dropdowns
   de perfil e empresa.

   Acesso: somente admin global (useRequireAdmin).
   ═══════════════════════════════════════════════════════════════ */

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Settings, Tag, Landmark, Sparkles, Users, Trash2, Plus, Shield, Loader2 } from 'lucide-react'
import { useThemeStore } from '@/store/themeStore'
import { useAuthStore } from '@/store/authStore'
import { useRequireAdmin } from '@/hooks/useRequireAdmin'
import { AccessDenied } from '@/components/AccessDenied'
import {
  useAdminUsuarios,
  useAdminPerfis,
  useAdminUsuarioAtribuicoes,
  criarAtribuicaoPerfil,
  removerAtribuicaoPerfil,
  type AdminUsuarioListado,
  type AtribuicaoPerfil,
} from '@/hooks/api/useAdminPerfis'


export default function AdminUsuariosPage() {
  const allowed = useRequireAdmin()
  const t = useThemeStore((s) => s.tokens)
  const empresas = useAuthStore((s) => s.empresas)

  const usuariosResult = useAdminUsuarios()
  const perfisResult = useAdminPerfis()

  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [busca, setBusca] = useState('')

  if (!allowed) return <AccessDenied />

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

      {/* Sub-navigation */}
      <SubNav active="usuarios" t={t} />

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
              border: `1px solid ${t.border}`, fontSize: 12, marginBottom: 10,
            }}
          />

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

          {usuariosFiltrados.map((u) => (
            <button
              key={u.id}
              onClick={() => setSelectedUserId(u.id)}
              style={{
                width: '100%',
                display: 'flex', flexDirection: 'column', gap: 2,
                padding: '8px 10px', marginBottom: 4,
                borderRadius: 6, textAlign: 'left',
                background: u.id === selectedUserId ? t.blueDim : 'transparent',
                border: `1px solid ${u.id === selectedUserId ? t.blue + '66' : 'transparent'}`,
                color: t.text, cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{u.nome}</span>
                {u.is_admin && (
                  <span style={{
                    fontSize: 9, padding: '1px 6px', borderRadius: 4,
                    background: t.goldDim, color: t.gold, fontWeight: 600,
                    letterSpacing: '0.05em', textTransform: 'uppercase',
                  }}>
                    Admin
                  </span>
                )}
              </div>
              <span style={{ fontSize: 11, color: t.muted }}>{u.email}</span>
            </button>
          ))}
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
            />
          )}
        </div>
      </div>
    </div>
  )
}


function SubNav({ active, t }: { active: string; t: ReturnType<typeof useThemeStore.getState>['tokens'] }) {
  const items = [
    { key: 'empresas', label: 'Empresas', href: '/bi/financeiro/admin', icon: <Settings size={12} /> },
    { key: 'categorias', label: 'Plano de Contas', href: '/bi/financeiro/admin/categorias', icon: <Tag size={12} /> },
    { key: 'contas', label: 'Contas Bancárias', href: '/bi/financeiro/admin/contas-bancarias', icon: <Landmark size={12} /> },
    { key: 'orbit', label: 'Orbit IA', href: '/bi/financeiro/admin/orbit', icon: <Sparkles size={12} /> },
    { key: 'usuarios', label: 'Usuários', href: '/bi/financeiro/admin/usuarios', icon: <Users size={12} /> },
  ]
  return (
    <div style={{
      display: 'flex', gap: 8, marginBottom: 24,
      borderBottom: `1px solid ${t.border}`, paddingBottom: 12,
    }}>
      {items.map((item) => {
        const isActive = item.key === active
        return (
          <Link
            key={item.key}
            href={item.href}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 6,
              fontSize: 11, fontWeight: 600,
              color: isActive ? t.blue : t.muted,
              background: isActive ? t.blueDim : 'transparent',
              border: `1px solid ${isActive ? t.blue + '33' : t.border}`,
              textDecoration: 'none',
            }}
          >
            {item.icon} {item.label}
          </Link>
        )
      })}
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
}


function DetalheUsuario({ user, perfis, empresas, t }: DetalheUsuarioProps) {
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
