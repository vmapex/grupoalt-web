'use client'

/* ═══════════════════════════════════════════════════════════════
   LogoUploadBox — upload/preview de logo (dark ou light) por empresa.

   Extraído de /bi/financeiro/admin/page.tsx na F1 da unificação
   (2026-07-17): a config de empresa migrou pro /portal/admin e o
   componente virou compartilhado. Cores vêm por props porque o
   consumidor pode estar no shell do portal (DARK fixo) ou em telas
   theme-aware do BI.
   ═══════════════════════════════════════════════════════════════ */

import { useRef, type ChangeEvent } from 'react'
import Image from 'next/image'
import { Upload, X } from 'lucide-react'

export interface LogoUploadBoxProps {
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

export function LogoUploadBox({
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
