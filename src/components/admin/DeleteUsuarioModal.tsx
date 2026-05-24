'use client'

/* ═══════════════════════════════════════════════════════════════
   DeleteUsuarioModal — wrapper fino sobre <ConfirmDeleteModal>
   (refatorado em E2 do roadmap pos-Fase B, 2026-05-24).

   API publica mantida — `usuario: { id, nome, email } | null`,
   `onClose`, `onSuccess`. Tests existentes (DeleteUsuarioModal.test.tsx)
   continuam validos sem mudanca.
   ═══════════════════════════════════════════════════════════════ */

import { useThemeStore } from '@/store/themeStore'
import { deleteUsuario } from '@/hooks/api/useAdminPerfis'
import { ConfirmDeleteModal } from './ConfirmDeleteModal'


export interface DeleteUsuarioModalProps {
  /** Usuario alvo do soft delete. Modal so renderiza se nao for null. */
  usuario: { id: number; nome: string; email: string } | null
  /** Fechar sem deletar (cancelar ou apos sucesso). */
  onClose: () => void
  /** Chamado apos delete bem-sucedido. Use para refetch da listagem. */
  onSuccess: () => void
}


/** Modal de confirmacao do soft delete de usuario (Bug #4). Exige
 *  confirmacao tripla: senha do admin + nome exato do usuario + clique
 *  explicito no botao Excluir. Acao reversivel via UI de restore
 *  (toggle "Mostrar deletados" + botao Restaurar no /admin/usuarios). */
export function DeleteUsuarioModal({ usuario, onClose, onSuccess }: DeleteUsuarioModalProps) {
  const t = useThemeStore((s) => s.tokens)

  return (
    <ConfirmDeleteModal
      target={usuario}
      title="Excluir usuario"
      idPrefix="delete-usuario"
      warningContent={
        usuario ? (
          <>
            Esta acao marca o usuario <strong style={{ color: t.text }}>{usuario.nome}</strong>{' '}
            (<span style={{ color: t.text }}>{usuario.email}</span>) como deletado.
            Atribuicoes de perfil RBAC e historico de auditoria ficam preservados.
            O usuario nao consegue mais logar, mas a acao pode ser{' '}
            <strong style={{ color: t.text }}>revertida</strong> via UI de restore
            (toggle &quot;Mostrar deletados&quot; em /admin/usuarios) ou
            POST /admin/usuarios/{usuario.id}/restore.
          </>
        ) : null
      }
      onConfirm={deleteUsuario}
      errorMessages={{
        404: 'Usuario nao encontrado (pode ter sido removido).',
        409: 'Usuario ja esta soft-deletado.',
      }}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  )
}
