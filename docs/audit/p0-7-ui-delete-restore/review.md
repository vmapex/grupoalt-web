# Review — P0-7 UI: soft delete + restore de empresa

- **PR**: [#113 — feat(admin): UI de soft delete + restore de empresa (P0-7 UI)](https://github.com/vmapex/grupoalt-web/pull/113)
- **Branch**: `feat/p0-7-ui-delete-restore` (commit `c8d388d`)
- **Data do review**: 2026-05-18
- **Auditor**: audit-agent P0-7 UI

---

## TL;DR

PR fecha o gap de UI deixado pelo P0-7 backend (api #77, score 94/100) e
pela extensão de contrato do api #79 (campo `deleted_at` em
`EmpresaResponse`). Adiciona um `DeleteEmpresaModal` reutilizável que pede
senha + nome exato batendo 1:1 o contrato `{senha_admin, nome_empresa}` do
backend, refatora o card de empresas do `/portal/admin` para suportar
badge "DELETADA {data}" + botão Restaurar (chamada direta sem modal — ação
benígna), e troca o `removeEmpresa(Zustand)` órfão do `/bi/financeiro/admin`
pelo modal real com hint pro Portal para restore. 10 testes novos cobrem
happy path, gates (senha+nome), erros 403/409, reset entre empresas e
cancelamento; suite total 210 verde, typecheck limpo, CI `Frontend CI`
SUCCESS, Vercel preview ok. Encontrei 3 follow-ups não bloqueantes
(distinção visual senha-errada vs nome-errado depende só do texto do
backend; restore sem modal carece de "undo toast"; bi/admin opera no
`empresaStore.empresas` que é populado por `/auth/me` — não vê empresas
soft-deletadas, então não dá pra restaurar de lá, ok porque a UI já
direciona pra `/portal/admin`). Não há blockers.

---

## Recomendação: **APPROVE**

## Score: **93/100**

- −3 pela ausência de testes E2E/integration que exercitem o fluxo a partir
  da página real (`/portal/admin`) — todos os 10 testes são unit do modal
  isolado. Não bloqueia (modal é puro, página é display), mas falta
  cobertura do `handleRestoreEmpresa` e do badge "DELETADA".
- −2 por o badge de "DELETADA" no `/portal/admin` não ser visualmente
  distinguível além de um border e um chip — sem CTA evidente "esta
  empresa foi excluída, clique em Restaurar pra reativar" ou ordem
  visual (poderia ficar no rodapé da lista). Ergonomia menor.
- −2 pelo `restoreEmpresa` ser chamado sem confirmação. Backend permite
  (intencional — restore é benígno), mas a action é silenciosa: 1 clique
  + toast. Em frotas pequenas onde N empresas têm nomes parecidos, um
  clique acidental restaura sem chance de undo. Toast já avisa, mas não
  expõe um "Desfazer" — ficaria 5min de trabalho.

---

## Matriz objetiva — bloqueadores

| # | Critério | Status | Observação |
|---|---|---|---|
| 1 | Contrato `deleteEmpresa(id, senha, nome)` envia exatamente `{senha_admin, nome_empresa}` (snake_case) ao backend | OK | `useAPI.ts:686-694`: `api.delete('/admin/empresas/${id}', { data: { senha_admin, nome_empresa } })`. Bate 1:1 com `DeleteEmpresaBody(senha_admin, nome_empresa)` em `app/routers/admin.py:221-225`. |
| 2 | `restoreEmpresa(id)` faz POST `/admin/empresas/{id}/restore` sem body | OK | `useAPI.ts:701-704`: `api.post('/admin/empresas/${id}/restore')`. Backend `routers/admin.py:291-319` não aceita body — só dep injection de `get_current_admin`. Retorna `{message}`. |
| 3 | Tipo `AdminEmpresaAPI.deleted_at` cobre o contrato do api #79 | OK | `useAPI.ts:664-676`: `deleted_at: string \| None`. Bate com `EmpresaResponse.deleted_at: datetime \| None` em `app/routers/admin.py:127`. Comentário explicita ISO 8601. |
| 4 | Modal trata 403 (senha ou nome errado), 409 (já deletada), 404 (não existe) | OK | `DeleteEmpresaModal.tsx:53-66`: switch em `resp.status` cobre 403/404/409 + fallback `detail`. Backend emite 403 separado pra senha vs nome com mensagens distintas — UI consolida no `setError(detail)`, então usuário vê texto cru do backend (ex: "Senha do admin nao confere" vs "Nome enviado nao bate..."). Distinção fica no detalhe textual, não numa cor/icon diferente. Aceitável; documentado em #19. |
| 5 | A11y do modal: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` apontando pro título, botão X com `aria-label="Fechar"` | OK | `DeleteEmpresaModal.tsx:69-77`. Título `<h2 id="delete-empresa-title">` linka via `aria-labelledby`. Inputs com `<label htmlFor>`. Erro com `role="alert"`. |
| 6 | Senha não vaza em logs, state global ou error responses | OK | Senha vive em `useState` local do modal; reset on `empresa?.id` change (`useEffect` linha 33-38). Sem `console.log`. Backend nunca ecoa `senha_admin` em `detail` (verificado em `admin.py:264` — emite só "Senha do admin nao confere"). Axios não loga body por default. |
| 7 | XSS impossível via `empresa.nome` (controla input no DB, mas defense-in-depth) | OK | Todos os usos de `empresa.nome` no modal são text content React (`{empresa.nome}` em JSX, `placeholder=`, `id=`). Sem `dangerouslySetInnerHTML`. React escapa automaticamente. |
| 8 | Reset de inputs entre operações (abre modal pra empresa A, fecha, abre pra B) | OK | `useEffect(() => {...}, [empresa?.id])` reseta `senha`, `nomeDigitado`, `error`, `loading` quando `empresa.id` muda. Coberto pelo teste `reseta inputs ao trocar de empresa`. |
| 9 | CI verde no PR #113 | OK | `gh pr view 113 --json statusCheckRollup`: `Frontend CI` CheckRun SUCCESS (16:42:15Z), `Vercel` deployment SUCCESS, `mergeable: MERGEABLE`. |
| 10 | Suite local não regrediu | OK | `npx vitest run` → 210 testes em 12 arquivos, 100% verde. 200 anteriores + 10 novos do `DeleteEmpresaModal.test.tsx`. `npx tsc --noEmit` → exit 0. |

---

## Matriz objetiva — qualidade

| # | Critério | Status | Observação |
|---|---|---|---|
| 11 | Testes cobrem cenários críticos | OK | 10/10: null-empresa skip, render title + nome, botão Excluir disabled inicial, disabled com nome errado, habilita com senha+nome match, click chama `deleteEmpresa(42, 'admin123', 'ALT Transportes')` exato + `onSuccess` + `onClose`, erro 403 → banner sem `onSuccess`, erro 409 → banner, click Cancelar chama `onClose`, reset on `empresa.id` change. |
| 12 | Testes faltando — sugestões | MINOR | (a) 404 não tem teste explícito (mas a logica é a mesma do 403/409 — mock genérico); (b) erro de rede (sem `response`) cai no `else` final — não testado; (c) integração `/portal/admin` (badge "DELETADA" rendering + botão Restaurar enabled state) não tem testes. Nada disso é blocker. |
| 13 | Mock `vi.mock('@/hooks/useAPI', ...)` exporta só `deleteEmpresa` | OK | Modal importa só `deleteEmpresa` desse módulo. Vitest mock factory replace o módulo inteiro, mas o consumidor sob teste não toca em mais nada → não quebra. Confirmado pelo run dos 10 testes em 696ms sem warnings. Typecheck também passa porque o mock é em runtime, não TS-checked. |
| 14 | Imports limpos | OK | Modal: 4 imports usados todos (React, lucide-react Icons, themeStore, deleteEmpresa). Test: 5 imports usados todos. Page `/portal/admin`: 11 lucide icons, todos referenciados; `restoreEmpresa` usado uma vez. Page `/bi/financeiro/admin`: `DeleteEmpresaModal` usado uma vez, `Link` usado pro hint. |
| 15 | Naming consistente | OK | `DeleteEmpresaModal`, `deletingEmpresa` (state local), `setDeletingEmpresa`, `restoringEmpresa` (loading id), `onSuccess`/`onClose` (convenção React modal). Bate com a convenção do projeto (`EmpresaUpdate`, `useEmpresaStore`). |
| 16 | Backward-compat com card existente | OK | Card antigo era `<button>` outer com hover state; novo é `<div flex>` com 2 `<button>` siblings. Hover-bg movido pro container `<div>`. `aria-expanded` adicionado no toggle. Click areas separadas: toggle pega expand, action pega delete/restore. Sem regressão visual significativa (mesmo padding, mesmo gap). |
| 17 | Sub-nav consistency em `/bi/financeiro/admin` | OK | A pagina já tinha as 4 abas (Empresas/Plano de Contas/Contas Bancárias/Orbit IA) — não foi tocada nesse PR. O hint "podem ser restauradas em Portal > Administracao > Empresas" é uma `<Link>` pro `/portal/admin`. Pragmático. |

---

## Matriz objetiva — risco

| # | Critério | Status | Observação |
|---|---|---|---|
| 18 | Rollback simples se algo der errado em prod | OK | Modal é componente isolado, page changes são aditivos (badge + 2 botões). Reverter via `git revert c8d388d` recompila em ~30s, deploy Vercel em <2min. Endpoints backend (api #77 + #79) continuam funcionando sem essa UI — quem quiser delete via curl ainda pode. |
| 19 | Race condition: dois admins soft-deletam mesma empresa simultaneamente | OK | Primeiro request ganha (deleted_at = NOW()), segundo recebe 409 do backend (`admin.py:252-253`), modal renderiza "Empresa ja esta soft-deletada." e admin entende. Idempotência server-side resolve. |
| 20 | State pollution: Zustand `removeEmpresa` vs API truth | OK | `empresaStore.partialize` persiste só `activeId` — `empresas` é re-hidratado por `syncFromAuth` no /auth/me. Backend filtra `deleted_at IS NULL` em paths user-facing, então `/auth/me` não retorna a soft-deletada. F5 reconcilia. O `removeEmpresa` local serve só pra remover o flash visual entre o `onSuccess` e o próximo `/auth/me`. Sem leak de longo prazo. |
| 21 | Tab `/bi/financeiro/admin` opera em `empresaStore.empresas` (user-facing, filtrado) — não vê deletadas | OK (intencional) | Pela arquitetura atual, esta tab vê só as empresas que o user tem acesso. Soft-deletadas somem do `/auth/me`. Portanto, restore só é possível via `/portal/admin` que usa o endpoint admin `/admin/empresas` (sem filtro). O PR documenta isso no info-box ("Empresas excluidas podem ser restauradas na pagina Portal > Administracao > Empresas"). Aceitável trade-off — separar concerns BI (visual) vs Admin (raw). |
| 22 | CSP não bloqueia `style={{ backdropFilter: 'blur(4px)' }}` inline no modal | OK | `src/middleware.ts:42`: `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`. Inline styles continuam permitidos no Step 10. CSP só removeu `unsafe-inline` de `script-src`. Sem regressão. |
| 23 | Mensagem de erro 403 não distingue visualmente "senha errada" de "nome errado" | MINOR | Backend emite mensagens diferentes (`admin.py:264, 275`) — "Senha do admin nao confere" vs "Nome enviado nao bate com a empresa. Esperado exatamente: '...'". UI exibe o `detail` cru no banner. Funciona, mas não enfatiza qual campo precisa correção. Fix sugerido: detectar substring e destacar o input correspondente em vermelho. Não bloqueador. |
| 24 | Botão Restaurar sem modal de confirmação | INFO | Backend não exige (restore é benígno). UI atual: 1 clique + toast de sucesso. Risco real: admin restaura empresa errada porque clicou no card vizinho. Mitigação atual: toast com nome. Sugestão de follow-up: toast com botão "Desfazer" (5min trabalho, troca o `restoreEmpresa` por `deleteEmpresa` se o user clicar). Não bloqueador. |
| 25 | Refresh do store após delete em `/bi/financeiro/admin` — pode aparecer fantasma se F5 antes de `/auth/me` | OK | `removeEmpresa(Zustand)` é síncrono local. F5 → `skipHydration: true` no persist + `syncFromAuth` no auth login carrega de novo do `/auth/me`. Backend já filtrou. Janela de fantasma = zero, porque a página espera `/auth/me` antes de renderizar. |

---

## Pontos positivos

1. **Contrato com backend é exato** — `{senha_admin, nome_empresa}` em
   snake_case, casamento de tipos `string`/`string`, status codes 403/404/409
   tratados explicitamente. Zero impedance mismatch.
2. **Modal reutilizável** — exposto por `empresa: {id, nome} | null` controlado
   pelo pai. Mesmo componente serve `/portal/admin` (com `loadData()`
   onSuccess) e `/bi/financeiro/admin` (com `removeEmpresa(store)` onSuccess).
   Sem duplicação.
3. **Reset de estado entre empresas** — `useEffect([empresa?.id])` garante que
   abrir o modal para empresa B depois de digitar a senha para A não vaza nada.
   Coberto por teste explícito.
4. **A11y completa** — `role="dialog"`, `aria-modal`, `aria-labelledby`,
   `aria-expanded` no toggle do card, `aria-label` nos botões Excluir/Restaurar
   com nome da empresa, banner de erro com `role="alert"`. Inputs com
   `htmlFor` linkando labels. Backdrop click fecha exceto quando `loading`.
5. **Banner de erro contextualiza pelo status code** — 403 → mensagem do
   backend, 409 → "ja esta soft-deletada", 404 → "pode ter sido removida".
   Não joga JSON cru pro user.
6. **Botão Excluir disabled enquanto a triple gate não é satisfeita** —
   senha não vazia + nome exato + `!loading`. Feedback visual instantâneo
   (input com border vermelha + texto "Nome nao bate") sem round-trip
   pro servidor.
7. **CI + Vercel preview verde** — `Frontend CI` SUCCESS, Vercel preview
   deployment SUCCESS, mergeable. Sem warning extra além dos pre-existentes.

---

## Pontos de atenção

1. **Distinção visual senha-errada vs nome-errado** (item #23). Backend já
   emite mensagens diferentes; UI mostra o `detail` cru no banner. Fix
   sugerido (~5min):
   ```ts
   if (resp?.status === 403) {
     const detail = resp.data?.detail || ''
     if (/senha/i.test(detail)) {
       setSenhaError(true)
       setError(detail)
     } else if (/nome/i.test(detail)) {
       setNomeError(true)
       setError(detail)
     } else { setError(detail) }
   }
   ```
   E pintar o border do input correspondente em vermelho. Não bloqueador
   porque o texto já é claro.

2. **Restore sem confirmação + sem undo** (item #24). Caso queira reforçar:
   ```tsx
   showToast('success', `"${emp.nome}" restaurada`, {
     action: { label: 'Desfazer', onClick: () => softDeleteSemSenha(emp.id) }
   })
   ```
   Implica adicionar suporte a action no `showToast` atual. Trade-off:
   admin acidentou clique → 4s pra desfazer. Se preferir manter simples,
   fica como está.

3. **Tab `/bi/financeiro/admin` não vê soft-deletadas** (item #21). Não é
   um bug — é decisão arquitetural válida. Mas vale ficar atento: usuário
   que delete empresa pelo BI Admin e queira restaurar tem que sair do BI e
   ir pro Portal Admin. O info-box no rodapé documenta. Alternativa
   futura: migrar `/bi/financeiro/admin` para consumir `useAdminEmpresas()`
   (admin endpoint) ao invés de `empresaStore`. Trade-off: BI Admin passa
   a ver TODAS as empresas, não só as do user logado.

4. **Faltam testes E2E pra `/portal/admin`** (item #12 + #11). A página
   tem lógica não trivial: refator do card (button outer → div com 2
   buttons), badge "DELETADA {data}" conditional, botão Restaurar com
   loading state, toast. Nada disso tem teste. Cobertura é só backend
   (api #77 — 11 testes pytest E2E + 4 da migration). Sugestão:
   adicionar testes RTL em `src/app/portal/admin/admin.test.tsx` cobrindo
   renderização do badge e habilitação do botão Restaurar. Não bloqueador
   porque o componente é principalmente display.

5. **`Number(emp.id)` no `/bi/financeiro/admin`** (linha 486). `empresaStore`
   guarda `id: string`. Se a empresa veio de `addEmpresa()` (placeholder
   local), `id = String(Date.now())` — 13 dígitos. `Number(...)` retorna
   um número grande, backend retorna 404 → modal mostra "Empresa nao
   encontrada (pode ter sido removida)." Funciona, mas é meio sujo. Em
   teoria `addEmpresa()` deveria ser desabilitado até persistir no
   backend. Bug pré-existente, não regressão deste PR.

6. **Hint de Portal Admin é texto, não breadcrumb/CTA** — o aviso em
   `bi/financeiro/admin` é uma linha no `<ul>` de instruções. Quem
   acabou de deletar uma empresa e quer restaurar precisa ler até o fim
   do info-box. Sugestão: após `onSuccess` do delete, mostrar toast com
   link inline "Restaurar em Portal Admin". Não bloqueador.

---

## Validações executadas

```bash
# CI status do PR
gh pr view 113 --repo vmapex/grupoalt-web --json statusCheckRollup,state,mergeable
# Frontend CI = SUCCESS, Vercel = SUCCESS, mergeable = MERGEABLE

# Testes do modal isoladamente
npx vitest run src/components/admin/DeleteEmpresaModal.test.tsx
# 10/10 PASS, 696ms

# Suite completa (regressão)
npx vitest run
# 210/210 PASS em 12 arquivos, 8.38s

# Typecheck
npx tsc --noEmit
# Exit 0

# Inspeção dos arquivos do PR (sem checkout no worktree)
git show c8d388d:src/components/admin/DeleteEmpresaModal.tsx       # 303 LOC
git show c8d388d:src/components/admin/DeleteEmpresaModal.test.tsx  # 156 LOC
git show c8d388d:src/hooks/useAPI.ts                                # +50 LOC final
git show c8d388d:src/app/portal/admin/page.tsx                      # +103/-22 LOC
git show c8d388d:src/app/bi/financeiro/admin/page.tsx               # +22/-1 LOC

# Backend contract (grupoalt-api)
# Lido app/routers/admin.py:115-127 (EmpresaResponse + deleted_at),
#       app/routers/admin.py:221-289 (DeleteEmpresaBody + soft delete + audit),
#       app/routers/admin.py:291-319 (restore happy + 409)
# Body exato: {senha_admin: str, nome_empresa: str}
# Status: 204 sucesso, 403 senha/nome errado, 404 inexistente, 409 já deletada
# Lido tests/test_admin_soft_delete_empresa.py para confirmar status codes esperados
```

---

## Tempo gasto

~28 minutos
