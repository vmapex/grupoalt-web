'use client'
/* ═══════════════════════════════════════════════════════════════
   PermissionGate — Fase A PR 3 (2026-05-22).

   Renderiza children se o usuario tem (modulo, acao) na empresa ativa.
   Caso contrario, renderiza `fallback` (default: null = esconde).

   Uso tipico (esconder botao "Exportar PDF"):
       <PermissionGate require="financeiro:exportar">
         <ExportPDFButton ... />
       </PermissionGate>

   Multiple gates (AND logico — todas as permissoes necessarias):
       <PermissionGate requireAll={["financeiro:ver", "financeiro:editar"]}>
         ...
       </PermissionGate>

   Modo "fallback visivel" (ex: pagina inteira gated):
       <PermissionGate
         require="admin_categorias:editar"
         fallback={<AccessDenied />}
       >
         <PaginaCategorias />
       </PermissionGate>
   ═══════════════════════════════════════════════════════════════ */

import type { ReactNode } from 'react'
import { usePermission } from '@/hooks/usePermission'


type Permission = `${string}:${string}`


interface PermissionGateProps {
  /** Permissao unica "modulo:acao" (ex: "financeiro:ver"). */
  require?: Permission
  /** Multiple permissoes (AND logico — todas necessarias). */
  requireAll?: Permission[]
  /** Multiple permissoes (OR logico — qualquer uma basta). */
  requireAny?: Permission[]
  /** Renderizado quando NAO autorizado. Default: null (esconde). */
  fallback?: ReactNode
  children: ReactNode
}


function parsePerm(p: Permission): [string, string] {
  const idx = p.indexOf(':')
  if (idx < 0) throw new Error(`Permissao mal formada: '${p}'. Esperado 'modulo:acao'.`)
  return [p.slice(0, idx), p.slice(idx + 1)]
}


/** Componente gate sem React.memo (eh leve e queremos re-render quando
 *  o store muda). */
export function PermissionGate({
  require,
  requireAll,
  requireAny,
  fallback = null,
  children,
}: PermissionGateProps) {
  // Quantas formas de require foram passadas? Exatamente uma deveria
  // estar definida — multiplas geram comportamento ambiguo, entao
  // priorizamos `require` > `requireAll` > `requireAny` (declarado).
  const allowed = useGateDecision({ require, requireAll, requireAny })
  return allowed ? <>{children}</> : <>{fallback}</>
}


function useGateDecision(props: {
  require?: Permission
  requireAll?: Permission[]
  requireAny?: Permission[]
}): boolean {
  // IMPORTANT: hooks devem ser chamados na MESMA ordem em cada render.
  // Por isso resolvemos `useGateDecisionSingle` SEMPRE, mesmo quando nao
  // ha `require`. Quando nao ha, passa permissao "dummy" que retorna false
  // (mas ai a logica final decide via requireAll/Any).

  // Caso 1: `require` simples
  const reqSingle = useSinglePermission(props.require)

  // Caso 2: `requireAll`
  const allFlags = useMultiplePermissions(props.requireAll)
  const allAllowed = allFlags.length > 0 ? allFlags.every(Boolean) : null

  // Caso 3: `requireAny`
  const anyFlags = useMultiplePermissions(props.requireAny)
  const anyAllowed = anyFlags.length > 0 ? anyFlags.some(Boolean) : null

  if (props.require) return reqSingle
  if (allAllowed !== null) return allAllowed
  if (anyAllowed !== null) return anyAllowed

  // Nada foi pedido — fail closed (defensivo).
  return false
}


function useSinglePermission(p: Permission | undefined): boolean {
  // Stub quando p === undefined: nao podemos pular o hook (regra do
  // React), entao chamamos com strings vazias que nunca casam.
  const [modulo, acao] = p ? parsePerm(p) : ['', '']
  return usePermission(modulo, acao)
}


/** Chama usePermission para cada permissao da lista. ATENCAO: ordem das
 *  permissoes deve ser estavel entre renders (mesmo array length, mesma
 *  ordem). Senao o React vai reclamar de "hooks chamados em ordem diferente". */
function useMultiplePermissions(perms: Permission[] | undefined): boolean[] {
  const list = perms ?? []
  // Limit fixo: 10 permissoes (cobre 99% dos casos). Se voce precisa
  // mais, divida em multiplos PermissionGate aninhados.
  const MAX = 10
  if (list.length > MAX) {
    throw new Error(
      `PermissionGate suporta no maximo ${MAX} permissoes em requireAll/Any. ` +
      `Recebido: ${list.length}. Use PermissionGates aninhados.`,
    )
  }
  // Slot por posicao — chamamos `usePermission` `MAX` vezes pra ordem
  // estavel. As posicoes nao usadas pegam strings vazias.
  const slot0 = useSinglePermission(list[0])
  const slot1 = useSinglePermission(list[1])
  const slot2 = useSinglePermission(list[2])
  const slot3 = useSinglePermission(list[3])
  const slot4 = useSinglePermission(list[4])
  const slot5 = useSinglePermission(list[5])
  const slot6 = useSinglePermission(list[6])
  const slot7 = useSinglePermission(list[7])
  const slot8 = useSinglePermission(list[8])
  const slot9 = useSinglePermission(list[9])
  const allSlots = [slot0, slot1, slot2, slot3, slot4, slot5, slot6, slot7, slot8, slot9]
  return allSlots.slice(0, list.length)
}
