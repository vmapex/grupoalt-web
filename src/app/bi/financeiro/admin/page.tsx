'use client'

import { useState, useRef, type ChangeEvent } from 'react'
import Link from 'next/link'
import { Settings, Upload, Trash2, Pencil, Plus, X, Tag, Landmark } from 'lucide-react'
import { useThemeStore } from '@/store/themeStore'
import { useEmpresaStore, type Empresa } from '@/store/empresaStore'

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
            <img
              src={logoSrc}
              alt={label}
              style={{ maxHeight: 48, maxWidth: '80%', objectFit: 'contain' }}
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
  const empresas = useEmpresaStore((s) => s.empresas)
  const updateEmpresa = useEmpresaStore((s) => s.updateEmpresa)
  const addEmpresa = useEmpresaStore((s) => s.addEmpresa)
  const removeEmpresa = useEmpresaStore((s) => s.removeEmpresa)

  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditFormData>({ nome: '', cnpj: '', cor: '' })

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

      {/* Sub-navigation tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: `1px solid ${t.border}`, paddingBottom: 12 }}>
        <Link
          href="/bi/financeiro/admin"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 600,
            color: t.blue,
            background: t.blueDim,
            border: `1px solid ${t.blue}33`,
            textDecoration: 'none',
          }}
        >
          <Settings size={12} />
          Empresas
        </Link>
        <Link
          href="/bi/financeiro/admin/categorias"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 600,
            color: t.muted,
            background: 'transparent',
            border: `1px solid ${t.border}`,
            textDecoration: 'none',
          }}
        >
          <Tag size={12} />
          Plano de Contas
        </Link>
        <Link
          href="/bi/financeiro/admin/contas-bancarias"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 600,
            color: t.muted,
            background: 'transparent',
            border: `1px solid ${t.border}`,
            textDecoration: 'none',
          }}
        >
          <Landmark size={12} />
          Contas Bancárias
        </Link>
      </div>

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
                        onClick={() => removeEmpresa(emp.id)}
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
        </ul>
      </div>
    </div>
  )
}
