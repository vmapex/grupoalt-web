'use client'

/* ═══════════════════════════════════════════════════════════════
   DeleteEmpresaModal — wrapper fino sobre <ConfirmDeleteModal>
   (refatorado em E2 do roadmap pos-Fase B, 2026-05-24).

   API publica mantida — `empresa: { id, nome } | null`, `onClose`,
   `onSuccess`. Tests existentes (DeleteEmpresaModal.test.tsx)
   continuam validos sem mudanca.
   ═══════════════════════════════════════════════════════════════ */

import { useThemeStore } from '@/store/themeStore'
import { deleteEmpresa } from '@/hooks/useAPI'
import { ConfirmDeleteModal } from './ConfirmDeleteModal'


export interface DeleteEmpresaModalProps {
  /** Empresa alvo do soft delete. Modal so renderiza se nao for null. */
  empresa: { id: number; nome: string } | null
  /** Fechar sem deletar (cancelar ou apos sucesso). */
  onClose: () => void
  /** Chamado apos delete bem-sucedido. Use para refetch da listagem. */
  onSuccess: () => void
}


/** Modal de confirmacao do soft delete de empresa (P0-7). Exige
 *  confirmacao tripla: senha do admin + nome exato da empresa + clique
 *  explicito no botao Excluir. Acao reversivel via
 *  POST /admin/empresas/{id}/restore. */
export function DeleteEmpresaModal({ empresa, onClose, onSuccess }: DeleteEmpresaModalProps) {
  const t = useThemeStore((s) => s.tokens)

  return (
    <ConfirmDeleteModal
      target={empresa}
      title="Excluir empresa"
      idPrefix="delete-empresa"
      warningContent={
        empresa ? (
          <>
            Esta acao marca a empresa <strong style={{ color: t.text }}>{empresa.nome}</strong> como
            deletada. Os dados sao preservados e a acao pode ser{' '}
            <strong style={{ color: t.text }}>revertida</strong> via &quot;Restaurar&quot; enquanto a empresa
            aparecer na lista.
          </>
        ) : null
      }
      onConfirm={deleteEmpresa}
      errorMessages={{
        // Mensagem original do P0-7 preservada: se o backend nao devolver
        // `detail` em 403 (improvavel — sempre devolve), cai aqui.
        403: 'Senha ou nome nao confere.',
        404: 'Empresa nao encontrada (pode ter sido removida).',
        409: 'Empresa ja esta soft-deletada.',
      }}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  )
}
