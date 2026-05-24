'use client'

/* ═══════════════════════════════════════════════════════════════
   ConfirmDeleteModal — base compartilhada de modais de soft delete
   (E2 do roadmap pos-Fase B, 2026-05-24).

   Antes: DeleteEmpresaModal (P0-7) e DeleteUsuarioModal (Bug #4 web)
   eram ~85% identicos — mesmo layout, mesmos 2 inputs (senha + nome),
   mesma logica de validacao client-side, mesmo mapeamento de erros.
   Manter 2 copias risca divergencia silenciosa.

   Agora: 1 componente base parametrizado. Os 2 wrappers viram funcoes
   thin (~15 LOC cada) que so injetam title + warningContent + onConfirm.

   API publica dos wrappers (DeleteEmpresaModal, DeleteUsuarioModal)
   nao muda — tests existentes continuam validos.
   ═══════════════════════════════════════════════════════════════ */

import { useState, useEffect } from 'react'
import { AlertTriangle, X, Loader2 } from 'lucide-react'
import { useThemeStore } from '@/store/themeStore'


export interface ConfirmDeleteModalProps {
  /** Alvo do delete. Null = modal fechado. Quando truthy, dialog renderiza. */
  target: { id: number; nome: string } | null
  /** Titulo do modal (ex: "Excluir empresa", "Excluir usuario"). */
  title: string
  /** Prefixo dos IDs gerados (htmlFor + aria-labelledby). Tem que ser unico
   *  por instancia pra co-existencia de dois modais no mesmo DOM funcionar. */
  idPrefix: string
  /** Bloco de aviso visivel acima dos inputs. Em geral menciona o alvo +
   *  caminho de restore. Vem como ReactNode pra cada caller customizar
   *  mensagem (empresa fala de "Restaurar", usuario fala de endpoint). */
  warningContent: React.ReactNode
  /** Funcao async injetada pelo caller. Recebe (id, senha, nome).
   *  Sucesso -> fecha modal + dispara onSuccess; falha -> mapeada via banner. */
  onConfirm: (id: number, senha: string, nome: string) => Promise<void>
  /** Override opcional de mensagens por status code do backend. Default
   *  cobre 403/404/409 + fallback generico. */
  errorMessages?: {
    /** 403: senha errada, nome errado, auto-delete, ou ultimo admin (usuario). */
    403?: string
    /** 404: alvo nao encontrado (pode ter sido removido em outra aba). */
    404?: string
    /** 409: ja soft-deletado. */
    409?: string
  }
  onClose: () => void
  onSuccess: () => void
}


export function ConfirmDeleteModal({
  target,
  title,
  idPrefix,
  warningContent,
  onConfirm,
  errorMessages,
  onClose,
  onSuccess,
}: ConfirmDeleteModalProps) {
  const t = useThemeStore((s) => s.tokens)
  const [senha, setSenha] = useState('')
  const [nomeDigitado, setNomeDigitado] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Reset quando target muda (incluindo abrir/fechar).
  useEffect(() => {
    setSenha('')
    setNomeDigitado('')
    setError(null)
    setLoading(false)
  }, [target?.id])

  if (!target) return null

  const podeConfirmar =
    senha.trim() !== '' && nomeDigitado === target.nome && !loading

  const handleSubmit = async () => {
    if (!podeConfirmar) return
    setLoading(true)
    setError(null)
    try {
      await onConfirm(target.id, senha, nomeDigitado)
      onSuccess()
      onClose()
    } catch (err: unknown) {
      const resp = (err as { response?: { status?: number; data?: { detail?: string } } })
        ?.response
      if (resp?.status === 403) {
        setError(resp.data?.detail || errorMessages?.[403] || 'Acao nao autorizada.')
      } else if (resp?.status === 409) {
        setError(resp.data?.detail || errorMessages?.[409] || 'Alvo ja esta soft-deletado.')
      } else if (resp?.status === 404) {
        setError(errorMessages?.[404] || 'Alvo nao encontrado (pode ter sido removido).')
      } else {
        setError(resp?.data?.detail || 'Erro ao excluir. Tente novamente.')
      }
      setLoading(false)
    }
  }

  const titleId = `${idPrefix}-title`
  const senhaId = `${idPrefix}-senha`
  const nomeId = `${idPrefix}-nome`

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
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
              id={titleId}
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: t.text,
                margin: 0,
                fontFamily: "'DM Sans', system-ui, sans-serif",
              }}
            >
              {title}
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

        {/* Aviso de reversibilidade — customizado pelo caller */}
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
          {warningContent}
        </div>

        {/* Inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
          <div>
            <label
              htmlFor={senhaId}
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
              id={senhaId}
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
              htmlFor={nomeId}
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
                {target.nome}
              </span>
            </label>
            <input
              id={nomeId}
              type="text"
              value={nomeDigitado}
              onChange={(e) => setNomeDigitado(e.target.value)}
              disabled={loading}
              autoComplete="off"
              placeholder={target.nome}
              style={{
                width: '100%',
                background: t.surfaceHover,
                border: `1px solid ${
                  nomeDigitado && nomeDigitado !== target.nome ? t.red : t.border
                }`,
                borderRadius: 6,
                padding: '8px 12px',
                fontSize: 13,
                color: t.text,
                outline: 'none',
              }}
            />
            {nomeDigitado && nomeDigitado !== target.nome && (
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
            disabled={!podeConfirmar}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: podeConfirmar ? t.red : t.surfaceHover,
              border: `1px solid ${podeConfirmar ? t.red : t.border}`,
              borderRadius: 6,
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 600,
              color: podeConfirmar ? '#fff' : t.muted,
              cursor: podeConfirmar ? 'pointer' : 'not-allowed',
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
