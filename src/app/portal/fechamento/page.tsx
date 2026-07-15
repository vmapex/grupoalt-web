'use client'
/* ═══════════════════════════════════════════════════════════════
   Motor de Fechamento — entrada via SSO (integração 2026-07).

   O Motor é um sistema separado (React/Vite + Fastify). O botão pede um
   ticket de SSO ao portal (`GET /motor/sso-ticket`) e abre a UI do Motor
   já autenticada em NOVA ABA.

   Anti popup-blocker: `window.open('', '_blank')` roda SÍNCRONO dentro do
   handler do clique (Chrome/Safari bloqueiam window.open pós-await); a aba
   nasce em "about:blank" e recebe a URL quando o ticket chega. Em erro, a
   aba é fechada e o banner explica.

   O gate real é do backend: 403 (sem fechamento:ver na empresa-âncora),
   409 (sem acesso provisionado — pedir ao admin), 503 (integração não
   configurada). A UI só apresenta.
   ═══════════════════════════════════════════════════════════════ */

import { useState } from 'react'
import { ExternalLink, GitCompare, Loader2, ShieldAlert, X } from 'lucide-react'
import { getSsoTicket } from '@/hooks/api/useMotorAcesso'

type Banner = { kind: 'info' | 'error'; text: string }

function describeSsoError(status: number | undefined, detail: string | undefined): Banner {
  if (status === 409) {
    return {
      kind: 'info',
      text:
        detail ||
        'Você ainda não tem acesso provisionado ao Motor. Peça a um administrador ' +
          'em Admin → Usuários → Acesso ao Motor.',
    }
  }
  if (status === 403) {
    return {
      kind: 'info',
      text: 'Seu perfil não tem a permissão de fechamento necessária para acessar o Motor.',
    }
  }
  if (status === 503) {
    return {
      kind: 'info',
      text: 'A integração com o Motor não está configurada neste ambiente.',
    }
  }
  return {
    kind: 'error',
    text: detail || 'Falha ao conectar com o Motor. Tente novamente em instantes.',
  }
}

export default function FechamentoPage() {
  const [abrindo, setAbrindo] = useState(false)
  const [banner, setBanner] = useState<Banner | null>(null)

  const abrirMotor = async () => {
    if (abrindo) return
    setAbrindo(true)
    setBanner(null)
    // SÍNCRONO no clique — depois do await o popup-blocker mataria a aba.
    const aba = window.open('', '_blank')
    try {
      const { url } = await getSsoTicket()
      if (aba) {
        aba.location.href = url
      } else {
        // Popup bloqueado mesmo assim — navega a própria aba como fallback.
        window.location.href = url
      }
    } catch (err: unknown) {
      aba?.close()
      const e = err as { response?: { status?: number; data?: { detail?: string } } }
      setBanner(describeSsoError(e?.response?.status, e?.response?.data?.detail))
    } finally {
      setAbrindo(false)
    }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-[#F1F5F9] mb-6">Motor de Fechamento</h1>

      {banner && (
        <div
          role="alert"
          className={`flex items-start gap-2 rounded-lg border p-3 mb-4 text-sm ${
            banner.kind === 'error'
              ? 'border-red-500/40 bg-red-500/10 text-red-300'
              : 'border-amber-500/40 bg-amber-500/10 text-amber-300'
          }`}
        >
          <ShieldAlert size={16} className="mt-0.5 shrink-0" />
          <span className="flex-1">{banner.text}</span>
          <button
            onClick={() => setBanner(null)}
            aria-label="Fechar mensagem"
            className="shrink-0 opacity-70 hover:opacity-100"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="bg-white/[0.034] border border-white/[0.07] rounded-lg p-8 text-center">
        <GitCompare size={40} className="text-[#CCA000] mx-auto mb-4" />
        <p className="text-[#F1F5F9] font-medium mb-1">Gestão de fretes da ALT Transportes</p>
        <p className="text-[#64748B] text-sm mb-6">
          Viagens, escala, abastecimentos, fechamento de período e relatórios — no
          sistema Motor de Fechamento, com o seu login do portal (sem nova senha).
        </p>
        <button
          onClick={abrirMotor}
          disabled={abrindo}
          className="inline-flex items-center gap-2 rounded-lg bg-[#CCA000] px-5 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
        >
          {abrindo ? <Loader2 size={16} className="animate-spin" /> : <ExternalLink size={16} />}
          {abrindo ? 'Conectando...' : 'Abrir Motor de Fechamento'}
        </button>
        <p className="text-[#64748B] text-xs mt-4">Abre em nova aba, já autenticado.</p>
      </div>
    </div>
  )
}
