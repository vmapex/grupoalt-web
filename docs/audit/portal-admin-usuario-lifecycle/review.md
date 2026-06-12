# Audit — PR frontend: UI de lifecycle de usuários no Portal Admin

- **Branch:** `feat/portal-admin-usuario-lifecycle` · **Commits auditados:** `621d6fa` + `0b7db43` (+ adendo sobre o commit de fixes do audit)
- **Base:** `origin/main` · **Diff:** +401/−22 (4 arquivos) + fixes do adendo
- **Auditor:** audit-agent independente (read-only) · **Data:** 2026-06-12
- **Companion backend:** `grupoalt-api` PR #132 (auditado, 98/100 APPROVE)

## TL;DR

- **Score:** 95/100 → **97/100 após adendo** (MED-1, LOW-1 e parte do LOW-4 aplicados no próprio PR)
- **Recomendação:** **APPROVE** — sem bloqueadores. Merge condicionado à **validação manual de UX no Preview** (roteiro obrigatório na Seção 7, incluindo a verificação O2 do DELETE com body via rewrite da Vercel) e ao **deploy do api PR #132 antes**.
- Checklist C1..C10: 10/10 OK. Wiring dos modais correto e travado por teste, guard de auto-delete efetivo, Set imutável no restore, zero regressão no fluxo de empresas.

## Validações automatizadas

| Check | Resultado |
|---|---|
| `npx vitest run` (suíte completa) | **357/357** em 25 arquivos — sem regressão |
| `npx tsc --noEmit` | exit 0 |
| Testes do PR | 21/21 (9 página + 12 hook) |

## Matriz do checklist (resumo)

| # | Critério | Status |
|---|---|---|
| C1 | Wiring dos modais (props/tipos do ConfirmDeleteModal; ordem `onSuccess→onClose` garante toast antes do estado virar null; DeleteUsuarioModal intacto) | OK |
| C2 | Guard auto-delete esconde as 3 ações; `currentUserId === undefined` não alcançável (useRequireAdmin early-return); backend barra de qualquer forma | OK (LOW-1 aplicado) |
| C3 | Loading: Set imutável (pattern PR #152); loading do hard delete vive no modal (inputs/Cancelar/X desabilitados, Loader2, backdrop travado) | OK |
| C4 | Toggle: filtro/contador/visibilidade consistentes; edge case "todos deletados sem empty state" é LOW-2 (cenário quase impossível) | OK |
| C5 | Erros: describeAxiosError com prefix (padrão do projeto); 404/409 via errorMessages batem com o contrato do backend; 403 tratado no modal com detail humanizado | OK |
| C6 | Badge `DELETADO dd/mm/aaaa`: parsing ISO ok; UTC→local idêntico ao badge de empresas (LOW-3 aceito por consistência) | OK |
| C7 | Testes travam wiring real (path `/permanent`, body em `{ data }`, chaves `senha_admin`/`nome_usuario`, onConfirm === hook); teste do toggle falharia sem o fix | OK |
| C8 | A11y: estrutura nova evita nested buttons (era inválido); aria-expanded + aria-labels específicos | OK (melhoria) |
| C9 | Regressões: aba Empresas/credenciais/Unidades intactas; suíte completa verde | OK |
| C10 | Roteiro UX manual registrado (Seção 7) | OK |

## Achados

| ID | Sev | Achado | Status |
|---|---|---|---|
| — | CRITICAL/HIGH | nenhum | — |
| MED-1 | MED | Botão de confirmação do hard delete dizia "Excluir" (igual ao soft) — reforço fraco no ponto de commit da ação irreversível | **APLICADO**: prop `confirmLabel` no ConfirmDeleteModal (default `'Excluir'`, API pública preservada — 11 testes existentes passam sem mudança) + `confirmLabel="Apagar definitivo"` no caller + assert |
| LOW-1 | LOW | Guard dependia da invariante implícita `adminAccess==='allowed' ⇒ user!=null` | **APLICADO**: `currentUserId != null && currentUserId !== user.id` |
| LOW-2 | LOW | Todos deletados + toggle off → lista vazia sem empty state (condição usa `usuarios.length`) | ACEITO (admin logado nunca está deletado → sempre ≥1 visível; toggle com contador é a pista) |
| LOW-3 | LOW | Data do badge UTC→local pode exibir dia anterior perto da meia-noite UTC | ACEITO (idêntico ao badge de empresas em produção; consistência > precisão) |
| LOW-4 | LOW | Gaps de teste: ausência de "Apagar definitivo" pra ativo; idPrefix/confirmLabel não assertados | **APLICADO** (asserts adicionados); `warningContent` segue sem assert (OBS) |
| OBS-1 | OBS | 403/409 priorizam `detail` do backend sobre `errorMessages` — em produção o texto do 409 será o do backend | Registrado |
| OBS-2/3 | OBS | hover na linha inteira / área de expandir menor (trade-off correto anti-nested-buttons) | Cosmético |
| OBS-4 | OBS | "Apagar definitivo" clicável durante restore em voo → 409 gracioso | Sem mudança |
| OBS-5 | OBS | `loadData()` não awaited pós-ação (padrão do fluxo de empresas) | Sem mudança |

## Seção 7 — Roteiro de validação UX manual (OBRIGATÓRIO pré-merge, no Preview)

Pré-requisito: **api PR #132 deployado** no ambiente que o Preview consome. Usar usuário descartável (ex.: criar "Teste Lifecycle" na própria tela). Nunca usar usuário real.

1. **Toggle default** — `/portal/admin` aba Usuários: nenhum deletado aparece; checkbox "Mostrar usuários deletados (N)" só existe se houver ≥1 deletado.
2. **Soft delete** — Excluir "Teste Lifecycle" → modal pede senha + nome exato; errar a senha de propósito (banner 403 do backend); acertar → toast "marcado como deletado" + some da lista.
3. **Badge + contador** — Ligar o toggle: reaparece com badge `DELETADO dd/mm/aaaa`, borda avermelhada, contador correto.
4. **Restore** — Restaurar: spinner, toast, badge some. (Opcional: 2 usuários em sequência rápida — spinners coexistem.)
5. **Estado ativo** — usuário ativo NÃO tem botão "Apagar definitivo" (só Excluir). Soft-deletar de novo para prosseguir.
6. **Verificação O2 (DELETE com body via rewrite Vercel)** — DevTools → Network: Apagar definitivo com senha + nome corretos. A request `DELETE /api/proxy/v1/admin/usuarios/{id}/permanent` deve levar o body `{ senha_admin, nome_usuario }` e responder **204**. Se vier 403 "senha não confere" COM senha correta = sintoma de body descartado pelo proxy → **reportar antes do merge** (risco O2 do audit backend).
7. **Mapeamentos de erro** — senha errada → banner 403 com detail; usuário já apagado em outra aba → mensagem de 404.
8. **Guard auto-delete** — a SUA linha não tem nenhum botão de ação.
9. **Regressão empresas** — aba Empresas: excluir + restaurar empresa de teste funciona (modal, badge DELETADA, Restaurar).
10. **Pós-hard-delete** — apagado não volta nem com toggle ligado; login dele falha.

## Veredicto

**APPROVE — 97/100** (95 do audit principal; +2 após MED-1/LOW-1/LOW-4 aplicados, validados pela suíte completa 357/357 + tsc limpo, com a API pública do ConfirmDeleteModal preservada).

Condições de merge: (1) roteiro da Seção 7 executado no Preview com atenção ao item 6 (O2); (2) api PR #132 deployado antes da web (sem ele a feature degrada graciosamente — toggle e ações de deletado não aparecem).
