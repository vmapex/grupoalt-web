'use client'

import { useState, useRef, type ChangeEvent } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Settings, Upload, Trash2, Pencil, Plus, X, RefreshCw } from 'lucide-react'
import api from '@/lib/api'
import { useThemeStore } from '@/store/themeStore'
import { useEmpresaStore, type Empresa } from '@/store/empresaStore'
import { useRequireAdmin } from '@/hooks/useRequireAdmin'
import { AccessDenied } from '@/components/AccessDenied'
import { AdminSubNav } from '@/components/admin/AdminSubNav'
import { DeleteEmpresaModal } from '@/components/admin/DeleteEmpresaModal'

/* ------------------------------------------------------------------ */
/*  LogoUploadBox                                                      */
/* ------------------------------------------------------------------ */

interface LogoUploadBoxProps {
  label: string
  previewBg: string
  logoSrc: string | null
  onUpload: (base64: string) => void
  onRemove: () => void
  borderColor: string
  mutedColor: string
  surfaceColor: string
  redColor: string
}

function LogoUploadBox({
  label,
  previewBg,
  logoSrc,
  onUpload,
  onRemove,
  borderColor,
  mutedColor,
  surfaceColor,
  redColor,
}: LogoUploadBoxProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') onUpload(reader.result)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  return (
    <div style={{ flex: 1, minWidth: 160 }}>
      <div
        style={{
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: 1,
          color: mutedColor,
          marginBottom: 6,
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        {label}
      </div>
      <div
        style={{
          background: previewBg,
          border: `1px solid ${borderColor}`,
          borderRadius: 8,
          height: 80,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {logoSrc ? (
          <>
            {/* P1-27: logoSrc eh base64 (data:image/...) ou URL externa.
                Usamos `unoptimized` -- next/image nao consegue otimizar
                base64; ganho continua sendo lazy + tag semantica. */}
            <Image
              src={logoSrc}
              alt={label}
              width={120}
              height={48}
              unoptimized
              style={{ maxHeight: 48, maxWidth: '80%', width: 'auto', objectFit: 'contain' }}
            />
            <button
              onClick={onRemove}
              aria-label={`Remover logo ${label}`}
              style={{
                position: 'absolute',
                top: 4,
                right: 4,
                background: redColor,
                border: 'none',
                borderRadius: '50%',
                width: 20,
                height: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#fff',
              }}
            >
              <X size={12} />
            </button>
          </>
        ) : (
          <button
            onClick={() => inputRef.current?.click()}
            aria-label={`Upload logo ${label}`}
            style={{
              background: surfaceColor,
              border: `1px dashed ${borderColor}`,
              borderRadius: 6,
              padding: '10px 16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: mutedColor,
              fontSize: 11,
            }}
          >
            <Upload size={14} />
            Upload
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.svg,.webp"
          onChange={handleFile}
          style={{ display: 'none' }}
        />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  PageAdmin                                                          */
/* ------------------------------------------------------------------ */

interface EditFormData {
  nome: string
  cnpj: string
  cor: string
}

export default function PageAdmin() {
  const t = useThemeStore((s) => s.tokens)
  const adminAccess = useRequireAdmin()
  const empresas = useEmpresaStore((s) => s.empresas)
  const updateEmpresa = useEmpresaStore((s) => s.updateEmpresa)
  const addEmpresa = useEmpresaStore((s) => s.addEmpresa)
  const removeEmpresa = useEmpresaStore((s) => s.removeEmpresa)
  // removeEmpresa do Zustand e usado APENAS no onSuccess do modal pra refletir
  // imediatamente o soft delete no estado local. Backend ja persistiu via API.

  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditFormData>({ nome: '', cnpj: '', cor: '' })
  const [deletingEmpresa, setDeletingEmpresa] = useState<{ id: number; nome: string } | null>(null)
  // Resync extrato: Set permite disparos em empresas diferentes sem que o
  // spinner de uma apague o da outra (mesmo pattern do restore de usuarios).
  const [resyncingIds, setResyncingIds] = useState<Set<string>>(() => new Set())
  const [resyncMsg, setResyncMsg] = useState<{ kind: 'ok' | 'info' | 'error'; text: string } | null>(null)

  const handleResync = async (emp: Empresa) => {
    const aviso =
      `Resync do extrato de ${emp.nome}:\n\n` +
      'APAGA todos os lançamentos bancários e re-baixa ~2 anos da Omie. ' +
      'O processo leva de 10 a 20 minutos e o BI mostra dados parciais ' +
      'enquanto roda (o Dashboard exibe o progresso).\n\nContinuar?'
    if (!confirm(aviso)) return
    setResyncingIds((prev) => new Set(prev).add(emp.id))
    setResyncMsg(null)
    try {
      const { data } = await api.post(`/sync/empresas/${Number(emp.id)}/resync-extrato`)
      setResyncMsg({
        kind: 'ok',
        text: `${emp.nome}: resync concluído — ${data?.deleted ?? '?'} removidos, ` +
          `${data?.lancamentos_synced ?? '?'} lançamentos re-sincronizados.`,
      })
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      // O endpoint e sincrono e demorado: timeout do edge (504) ou queda de
      // rede NAO significam falha — o servidor continua processando.
      if (!status || status === 502 || status === 504) {
        setResyncMsg({
          kind: 'info',
          text: `${emp.nome}: a chamada excedeu o tempo de resposta, mas o resync ` +
            'continua em segundo plano. Acompanhe o progresso no Dashboard (~10-20 min).',
        })
      } else {
        const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        setResyncMsg({ kind: 'error', text: `${emp.nome}: falha ao iniciar resync — ${detail || `HTTP ${status}`}` })
      }
    } finally {
      setResyncingIds((prev) => {
        const next = new Set(prev)
        next.delete(emp.id)
        return next
      })
    }
  }

  if (adminAccess === 'loading') {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="text-[12px]" style={{ color: t.muted }}>Carregando...</span>
      </div>
    )
  }
  if (adminAccess === 'denied') {
    return <AccessDenied message="As configuracoes do BI sao restritas a administradores." />
  }

  const startEdit = (emp: Empresa) => {
    setEditId(emp.id)
    setEditForm({ nome: emp.nome, cnpj: emp.cnpj, cor: emp.cor })
  }

  const saveEdit = () => {
    if (!editId) return
    updateEmpresa(editId, editForm)
    setEditId(null)
  }

  const cancelEdit = () => setEditId(null)

  return (
    <div style={{ padding: '28px 32px', maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <Settings size={22} style={{ color: t.blue }} />
        <h1
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: t.text,
            margin: 0,
            fontFamily: "'DM Sans', system-ui, sans-serif",
          }}
        >
          Configurações
        </h1>
      </div>
      <p style={{ fontSize: 13, color: t.textSec, margin: '0 0 16px 0' }}>
        Gerencie as empresas cadastradas, logos e informações.
      </p>

      <AdminSubNav active="empresas" />

      {/* Add button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button
          onClick={addEmpresa}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: t.blueDim,
            color: t.blue,
            border: `1px solid ${t.blue}33`,
            borderRadius: 8,
            padding: '8px 16px',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Plus size={16} />
          Adicionar Empresa
        </button>
      </div>

      {/* Resultado do resync (ok = verde, info = ambar, error = vermelho) */}
      {resyncMsg && (
        <div
          role="alert"
          style={{
            display: 'flex', alignItems: 'flex-start', gap: 8,
            marginBottom: 16, padding: '10px 14px', borderRadius: 8, fontSize: 12,
            background: resyncMsg.kind === 'ok' ? t.greenDim : resyncMsg.kind === 'info' ? t.amberDim : t.redDim,
            border: `1px solid ${resyncMsg.kind === 'ok' ? t.green : resyncMsg.kind === 'info' ? t.amber : t.red}33`,
            color: resyncMsg.kind === 'ok' ? t.green : resyncMsg.kind === 'info' ? t.amber : t.red,
          }}
        >
          <span style={{ flex: 1 }}>{resyncMsg.text}</span>
          <button
            onClick={() => setResyncMsg(null)}
            aria-label="Fechar mensagem"
            style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, display: 'flex' }}
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* Company cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {empresas.map((emp) => {
          const isEditing = editId === emp.id
          return (
            <div
              key={emp.id}
              style={{
                background: t.surface,
                border: `1px solid ${t.border}`,
                borderRadius: 12,
                padding: 20,
              }}
            >
              {/* Logo uploads row */}
              <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                <LogoUploadBox
                  label="Logo Dark"
                  previewBg="#0A0F1E"
                  logoSrc={emp.logoDark}
                  onUpload={(b64) => updateEmpresa(emp.id, { logoDark: b64 })}
                  onRemove={() => updateEmpresa(emp.id, { logoDark: null })}
                  borderColor={t.border}
                  mutedColor={t.muted}
                  surfaceColor={t.surface}
                  redColor={t.red}
                />
                <LogoUploadBox
                  label="Logo Light"
                  previewBg="#F0F2F5"
                  logoSrc={emp.logoLight}
                  onUpload={(b64) => updateEmpresa(emp.id, { logoLight: b64 })}
                  onRemove={() => updateEmpresa(emp.id, { logoLight: null })}
                  borderColor={t.border}
                  mutedColor={t.muted}
                  surfaceColor={t.surface}
                  redColor={t.red}
                />
              </div>

              {/* Company info + actions */}
              {isEditing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <input
                      type="text"
                      value={editForm.nome}
                      onChange={(e) => setEditForm((f) => ({ ...f, nome: e.target.value }))}
                      placeholder="Nome da empresa"
                      style={{
                        flex: 1,
                        background: t.surfaceHover,
                        border: `1px solid ${t.borderHover}`,
                        borderRadius: 6,
                        padding: '8px 12px',
                        fontSize: 14,
                        color: t.text,
                        outline: 'none',
                      }}
                    />
                    <input
                      type="text"
                      value={editForm.cnpj}
                      onChange={(e) => setEditForm((f) => ({ ...f, cnpj: e.target.value }))}
                      placeholder="CNPJ"
                      style={{
                        width: 200,
                        background: t.surfaceHover,
                        border: `1px solid ${t.borderHover}`,
                        borderRadius: 6,
                        padding: '8px 12px',
                        fontSize: 14,
                        color: t.text,
                        fontFamily: "'JetBrains Mono', monospace",
                        outline: 'none',
                      }}
                    />
                    <input
                      type="color"
                      value={editForm.cor}
                      onChange={(e) => setEditForm((f) => ({ ...f, cor: e.target.value }))}
                      title="Cor da empresa"
                      style={{
                        width: 36,
                        height: 36,
                        border: `1px solid ${t.border}`,
                        borderRadius: 6,
                        cursor: 'pointer',
                        background: 'transparent',
                        padding: 2,
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button
                      onClick={cancelEdit}
                      style={{
                        background: t.surface,
                        border: `1px solid ${t.border}`,
                        borderRadius: 6,
                        padding: '6px 14px',
                        fontSize: 12,
                        color: t.textSec,
                        cursor: 'pointer',
                      }}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={saveEdit}
                      style={{
                        background: t.blueDim,
                        border: `1px solid ${t.blue}33`,
                        borderRadius: 6,
                        padding: '6px 14px',
                        fontSize: 12,
                        fontWeight: 600,
                        color: t.blue,
                        cursor: 'pointer',
                      }}
                    >
                      Salvar
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: emp.cor,
                        flexShrink: 0,
                      }}
                    />
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: t.text }}>{emp.nome}</div>
                      <div
                        style={{
                          fontSize: 12,
                          color: t.muted,
                          fontFamily: "'JetBrains Mono', monospace",
                          marginTop: 2,
                        }}
                      >
                        {emp.cnpj}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {(() => {
                      const resyncing = resyncingIds.has(emp.id)
                      return (
                        <button
                          onClick={() => handleResync(emp)}
                          disabled={resyncing}
                          aria-label={`Resync extrato ${emp.nome}`}
                          title="Apaga e re-sincroniza todos os lançamentos bancários da Omie (~10-20 min)"
                          style={{
                            background: t.surface,
                            border: `1px solid ${t.border}`,
                            borderRadius: 6,
                            padding: '6px 10px',
                            cursor: resyncing ? 'wait' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            color: resyncing ? t.muted : t.amber,
                            fontSize: 12,
                          }}
                        >
                          <RefreshCw size={14} className={resyncing ? 'animate-spin' : undefined} />
                          {resyncing ? 'Sincronizando...' : 'Resync extrato'}
                        </button>
                      )
                    })()}
                    <button
                      onClick={() => startEdit(emp)}
                      aria-label={`Editar ${emp.nome}`}
                      style={{
                        background: t.surface,
                        border: `1px solid ${t.border}`,
                        borderRadius: 6,
                        padding: '6px 10px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        color: t.textSec,
                        fontSize: 12,
                      }}
                    >
                      <Pencil size={14} />
                      Editar
                    </button>
                    {empresas.length > 1 && (
                      <button
                        onClick={() => setDeletingEmpresa({ id: Number(emp.id), nome: emp.nome })}
                        aria-label={`Excluir ${emp.nome}`}
                        style={{
                          background: t.redDim,
                          border: `1px solid ${t.red}33`,
                          borderRadius: 6,
                          padding: '6px 10px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          color: t.red,
                          fontSize: 12,
                        }}
                      >
                        <Trash2 size={14} />
                        Excluir
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Info box */}
      <div
        style={{
          marginTop: 24,
          background: t.blueDim,
          border: `1px solid ${t.blue}22`,
          borderRadius: 10,
          padding: 16,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, color: t.blue, marginBottom: 6 }}>
          Instruções
        </div>
        <ul
          style={{
            margin: 0,
            paddingLeft: 18,
            fontSize: 12,
            color: t.textSec,
            lineHeight: 1.7,
          }}
        >
          <li>Cada empresa pode ter duas variantes de logo: uma para o tema escuro e outra para o tema claro.</li>
          <li>Formatos aceitos: PNG, JPG, SVG e WebP. Recomenda-se fundo transparente.</li>
          <li>O logo escuro (Dark) aparece sobre o fundo navy do tema escuro; o logo claro (Light) sobre o fundo cinza claro.</li>
          <li>Caso apenas uma variante seja enviada, ela será usada em ambos os temas como fallback.</li>
          <li>A cor da empresa e usada como acento visual na navbar e em indicadores.</li>
          <li>E necessario manter pelo menos uma empresa cadastrada.</li>
          <li>
            Empresas excluidas podem ser restauradas na pagina{' '}
            <Link href="/portal/admin" style={{ color: t.blue }}>Portal &gt; Administracao &gt; Empresas</Link>.
          </li>
        </ul>
      </div>

      {/* Modal de soft delete (P0-7) */}
      <DeleteEmpresaModal
        empresa={deletingEmpresa}
        onClose={() => setDeletingEmpresa(null)}
        onSuccess={() => {
          if (deletingEmpresa) {
            // Reflete imediatamente no store local. Proximo /auth/me confirma
            // (backend filtra soft-deletadas pra users user-facing).
            removeEmpresa(String(deletingEmpresa.id))
          }
        }}
      />
    </div>
  )
}
