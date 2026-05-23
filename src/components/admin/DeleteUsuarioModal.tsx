'use client'

/* ═══════════════════════════════════════════════════════════════
   DeleteUsuarioModal — modal de confirmacao do soft delete de
   usuario (Bug #4 do roadmap pos-Fase B, 2026-05-23).

   Clone do padrao DeleteEmpresaModal (P0-7) adaptado:
   - alvo eh `usuario` em vez de `empresa`
   - chama `deleteUsuario(id, senha, nome)` do useAdminPerfis
   - mapeamento de erros considera 403 com sub-tipo (senha/nome/
     auto-delete/ultimo admin) — UI nao precisa diferenciar, o
     `detail` do backend ja eh humano

   Exige confirmacao tripla:
   - senha do admin atual (validada via bcrypt no backend)
   - nome exato do usuario (case-sensitive)
   - clique explicito no botao Excluir

   Acao eh REVERSIVEL via POST /admin/usuarios/{id}/restore. Aviso
   laranja deixa isso explicito pro admin.
   ═══════════════════════════════════════════════════════════════ */

import { useState, useEffect } from 'react'
import { AlertTriangle, X, Loader2 } from 'lucide-react'
import { useThemeStore } from '@/store/themeStore'
import { deleteUsuario } from '@/hooks/api/useAdminPerfis'


export interface DeleteUsuarioModalProps {
  /** Usuario alvo do soft delete. Modal so renderiza se nao for null. */
  usuario: { id: number; nome: string; email: string } | null
  /** Fechar sem deletar (cancelar ou apos sucesso). */
  onClose: () => void
  /** Chamado apos delete bem-sucedido. Use para refetch da listagem. */
  onSuccess: () => void
}


export function DeleteUsuarioModal({ usuario, onClose, onSuccess }: DeleteUsuarioModalProps) {
  const t = useThemeStore((s) => s.tokens)
  const [senha, setSenha] = useState('')
  const [nomeDigitado, setNomeDigitado] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Reset quando usuario muda (incluindo abrir/fechar).
  useEffect(() => {
    setSenha('')
    setNomeDigitado('')
    setError(null)
    setLoading(false)
  }, [usuario?.id])

  if (!usuario) return null

  const podeExcluir =
    senha.trim() !== '' && nomeDigitado === usuario.nome && !loading

  const handleSubmit = async () => {
    if (!podeExcluir) return
    setLoading(true)
    setError(null)
    try {
      await deleteUsuario(usuario.id, senha, nomeDigitado)
      onSuccess()
      onClose()
    } catch (err: unknown) {
      const resp = (err as { response?: { status?: number; data?: { detail?: string } } })
        ?.response
      if (resp?.status === 403) {
        // Inclui: senha errada, nome errado, auto-delete, ultimo admin
        setError(resp.data?.detail || 'Acao nao autorizada.')
      } else if (resp?.status === 409) {
        setError(resp.data?.detail || 'Usuario ja esta soft-deletado.')
      } else if (resp?.status === 404) {
        setError('Usuario nao encontrado (pode ter sido removido).')
      } else {
        setError(resp?.data?.detail || 'Erro ao excluir. Tente novamente.')
      }
      setLoading(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-usuario-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose()
      }}
    >
      <div
        style={{
          background: t.surface,
          border: `1px solid ${t.border}`,
          borderRadius: 12,
          padding: 24,
          width: '100%',
          maxWidth: 480,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: t.redDim,
                border: `1px solid ${t.red}33`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: t.red,
              }}
            >
              <AlertTriangle size={18} />
            </div>
            <h2
              id="delete-usuario-title"
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: t.text,
                margin: 0,
                fontFamily: "'DM Sans', system-ui, sans-serif",
              }}
            >
              Excluir usuario
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            aria-label="Fechar"
            style={{
              background: 'transparent',
              border: 'none',
              color: t.muted,
              cursor: loading ? 'not-allowed' : 'pointer',
              padding: 4,
              opacity: loading ? 0.5 : 1,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Aviso de reversibilidade */}
        <div
          style={{
            background: t.surfaceHover,
            border: `1px solid ${t.border}`,
            borderRadius: 8,
            padding: 12,
            marginBottom: 16,
            fontSize: 12,
            color: t.textSec,
            lineHeight: 1.5,
          }}
        >
          Esta acao marca o usuario <strong style={{ color: t.text }}>{usuario.nome}</strong>{' '}
          (<span style={{ color: t.text }}>{usuario.email}</span>) como deletado.
          Atribuicoes de perfil RBAC e historico de auditoria ficam preservados.
          O usuario nao consegue mais logar, mas a acao pode ser{' '}
          <strong style={{ color: t.text }}>revertida</strong> via API
          (POST /admin/usuarios/{usuario.id}/restore).
        </div>

        {/* Inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
          <div>
            <label
              htmlFor="delete-usuario-senha"
              style={{
                display: 'block',
                fontSize: 11,
                fontWeight: 600,
                color: t.muted,
                marginBottom: 6,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              Senha do admin
            </label>
            <input
              id="delete-usuario-senha"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              disabled={loading}
              autoComplete="current-password"
              autoFocus
              placeholder="Sua senha"
              style={{
                width: '100%',
                background: t.surfaceHover,
                border: `1px solid ${t.border}`,
                borderRadius: 6,
                padding: '8px 12px',
                fontSize: 13,
                color: t.text,
                outline: 'none',
                fontFamily: "'JetBrains Mono', monospace",
              }}
            />
          </div>

          <div>
            <label
              htmlFor="delete-usuario-nome"
              style={{
                display: 'block',
                fontSize: 11,
                fontWeight: 600,
                color: t.muted,
                marginBottom: 6,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              Digite o nome exato:{' '}
              <span style={{ color: t.text, textTransform: 'none', fontFamily: 'monospace' }}>
                {usuario.nome}
              </span>
            </label>
            <input
              id="delete-usuario-nome"
              type="text"
              value={nomeDigitado}
              onChange={(e) => setNomeDigitado(e.target.value)}
              disabled={loading}
              autoComplete="off"
              placeholder={usuario.nome}
              style={{
                width: '100%',
                background: t.surfaceHover,
                border: `1px solid ${
                  nomeDigitado && nomeDigitado !== usuario.nome ? t.red : t.border
                }`,
                borderRadius: 6,
                padding: '8px 12px',
                fontSize: 13,
                color: t.text,
                outline: 'none',
              }}
            />
            {nomeDigitado && nomeDigitado !== usuario.nome && (
              <div style={{ marginTop: 4, fontSize: 11, color: t.red }}>
                Nome nao bate exatamente.
              </div>
            )}
          </div>
        </div>

        {/* Erro */}
        {error && (
          <div
            role="alert"
            style={{
              background: t.redDim,
              border: `1px solid ${t.red}33`,
              borderRadius: 6,
              padding: 10,
              marginBottom: 16,
              fontSize: 12,
              color: t.red,
            }}
          >
            {error}
          </div>
        )}

        {/* Botoes */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              background: t.surface,
              border: `1px solid ${t.border}`,
              borderRadius: 6,
              padding: '8px 16px',
              fontSize: 13,
              color: t.textSec,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1,
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!podeExcluir}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: podeExcluir ? t.red : t.surfaceHover,
              border: `1px solid ${podeExcluir ? t.red : t.border}`,
              borderRadius: 6,
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 600,
              color: podeExcluir ? '#fff' : t.muted,
              cursor: podeExcluir ? 'pointer' : 'not-allowed',
            }}
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : null}
            Excluir
          </button>
        </div>
      </div>
    </div>
  )
}
