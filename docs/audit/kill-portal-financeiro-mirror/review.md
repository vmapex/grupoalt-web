# Audit — PR #190: remove espelho `/portal/financeiro` (BI = única implementação)

- **PR**: vmapex/grupoalt-web #190 — branch `refactor/kill-portal-financeiro-mirror` — commit `a0aab74`
- **Tipo**: REFACTOR DESTRUTIVO (−2.247 LOC líquidas; +35 −2.282 em 13 arquivos; 7 rotas removidas)
- **Data**: 2026-07-14
- **Auditor**: Claude (auditor adversarial) — leitura de código nos dois lados do diff (origin/main vs HEAD) + validação automatizada + smoke funcional dos redirects em `next start` local.
- **Contexto**: a árvore `src/app/portal/financeiro/` era espelho 1:1 das telas BI (caixa, extrato, cp, cr, fluxo, conciliação), mantida em lockstep desde o Step 12. A Sidebar já apontava pra `/bi/financeiro`. O PR remove o espelho, encadeia redirects 308 em `next.config.js` (`/dashboard/*` → `/portal/financeiro/*` → `/bi/financeiro/*`), atualiza 6 links do `/portal/grupo`, remove 5 `PAGE_LABELS` do ChatPanel e troca 1 caso do `access.test.ts`.

---

## 1. Score final

**Score: 95/100 — APPROVE.** Nenhum CRITICAL/HIGH/MED confirmado. Remoção limpa: zero órfãos, zero referências residuais em `src/`, cadeia de redirects verificada regra a regra **e funcionalmente** (curl contra build de produção), RBAC inalterado, nenhum teste de lógica compartilhada perdido. 2 LOW (UX da aba CR + falta de suporte a `?tab=` no destino unificado) e observações não bloqueantes.

## 2. Recomendação

**APPROVE.** O espelho e o BI foram atualizados juntos até o último commit que os tocou (`806dce8`, PR #185) — nada exclusivo do espelho se perdeu. A única implementação restante (BI) é a canônica. Sugere-se follow-up pós-merge para `?tab=cr` na página `cp-cr` (L1).

## 3. Matriz de checklist (6 cenários exigidos)

| # | Cenário | Status | Evidência |
|---|---------|--------|-----------|
| C1 | **Órfãos** (componente/hook/lib usado SÓ pelos deletados) | OK — **zero órfãos** | Extraídos todos os imports dos 9 arquivos deletados via `git show origin/main`. Grep pós-deleção de **50 símbolos** (buildQuarterly/Monthly/Weekly, KPIStrip, DrillBar, ChartGrid, DRESidebar, DetailPanel, DREErrorBanner, SyncWatcher, ConcilBadge, useBaixas, useCP/CRResumo, useCPAll/useCRAll, useConcil*, transformExtrato/Saldos/CPCR/ConcilMovimento, ExportPDFButton, isBusinessDay/nextBusinessDay/fmtDateBR, parseDMY, fmtInt/fmtK, PagamentoDetalhe, ConcilEntry, CaixaLevelData, useFluxoCaixa, etc.) → **todos com ≥1 consumidor vivo** fora da definição. Os count-2 foram inspecionados um a um: o segundo arquivo é sempre uma página BI real (`bi/financeiro/{caixa,extrato,cp-cr,fluxo,conciliacao}/page.tsx`), nunca barrel/re-export. O espelho consumia **exclusivamente** código compartilhado com o BI — nada virou peso morto. |
| C2 | **Redirects** (ordem + encadeamento) | OK — **verificado funcionalmente** | Ordem correta: cp/cr específicas (regras 3-4) ANTES do catch-all `:path*` (regra 6) — Next avalia na ordem, primeira que casa vence. Encadeamento: cada 308 é seguido pelo browser (nova request, regras reavaliadas). Smoke com `next start` local: `/dashboard/cp` → 308 `/portal/financeiro/cp` → 308 `/bi/financeiro/cp-cr` → **200 final em 2 redirects**. `/portal/financeiro/cr` → `cp-cr` ✓; `/portal/financeiro/{caixa,extrato,fluxo,conciliacao}` → equivalentes BI existentes ✓; **query string preservada** (`?status=aberto` sobrevive à cadeia) ✓; `/portal/financeiro/caixa/dre-mensal` → `/bi/financeiro/caixa/dre-mensal` 200 (bônus: multi-segmento funciona) ✓. |
| C3 | **Referências vivas** a `/portal/financeiro` | OK — **zero em src/** | `grep -rn "portal/financeiro"` em `src/`, `src/middleware.ts`, testes e scripts → **0 matches** (únicas ocorrências: as próprias regras/comentários do `next.config.js`, intencionais). Sidebar já aponta `/bi/financeiro` (linha 39). `unidadeStore` usa `/gestao/` (fix da sessão 11/04 preservado). `ExportPDFButton` monta URL só de endpoint API, não de rota de página. `safeInternalRoute`/`ALLOWED_INTERNAL_ROUTE_PREFIXES` = `['/portal', '/bi/financeiro']` — links antigos `/portal/financeiro/*` vindos de notificações **continuam passando** na allowlist (prefixo `/portal`) e o redirect do Next os entrega no BI: degradação graciosa, sem quebra. Middleware/CSP intocados. |
| C4 | **PermissionGate/RBAC** | OK — **gating inalterado** | Card "BI Financeiro" do `/portal` home: `dashboardCards.ts` já apontava `/bi/financeiro` gated por `financeiro:ver` — não tocado. Os quickActions/cards do `/portal/grupo` **não eram gated** por `<PermissionGate>` antes nem depois (o espelho também não tinha gate client-side — `git show origin/main` dos wrappers deletados confirma: só `dynamic()` + loading). A autoridade é o backend (`RBAC_ENFORCE=true` em prod desde a Janela C): usuário sem `financeiro:ver` toma 403 nos dados nas duas encarnações. Nenhuma superfície nova exposta, nenhum gate perdido. |
| C5 | **ChatPanel** | OK | Fallback: `PAGE_LABELS[currentPage] \|\| 'Portal'` (linha 75). Quem passava `/portal/financeiro/*` como `currentPage` era o `portal/layout.tsx` via `usePathname()` — como as rotas não existem mais (redirect acontece no servidor antes de render), esses pathnames **nunca mais chegam** ao ChatPanel; remover os 5 labels é seguro. Todas as rotas BI vivas têm label (`/bi/financeiro/{,caixa,extrato,cp-cr,fluxo,conciliacao,admin}`). Exceção pré-existente: `/bi/financeiro/caixa/dre-mensal` cai em 'Portal' — já era assim em `main` (ver O3). |
| C6 | **Testes deletados** | OK — **nenhum teste perdido** | `git ls-tree origin/main` da árvore deletada: 9 arquivos, **zero `.test.`**. Único teste que referenciava o path era `access.test.ts` (caso `/portal/financeiro/cp` como rota válida) → trocado por `/portal/documentos`, que é rota real e mantém a semântica do teste (prefixo `/portal` na allowlist). A lógica compartilhada que o espelho exercitava (transformers, caixaBuilder, formatters, sla, hooks) tem suítes próprias — todas intactas: **378/378 verdes** (main tinha 368+; nenhum arquivo de teste removido). |

**Resultado:** 6/6 cenários OK.

## 4. Achados

| ID | Sev | Achado | Status |
|---|---|---|---|
| — | CRITICAL/HIGH/MED | nenhum confirmado | — |
| L1 | LOW | **Entradas "Contas a Receber" perdem o destino dedicado.** O card CR do `/portal/grupo`, o redirect `/portal/financeiro/cr` e a cadeia `/dashboard/cr` aterrissam todos em `/bi/financeiro/cp-cr`, cuja aba é **hardcoded `useState<'CP' \| 'CR'>('CP')`** (linha 88) sem leitura de `useSearchParams`. Usuário que clica "Contas a Receber" cai na aba CP e precisa de 1 clique extra. | Follow-up sugerido: suportar `?tab=cr` na página cp-cr e apontar card CR + redirect `/portal/financeiro/cr` para `/bi/financeiro/cp-cr?tab=cr`. Não bloqueia (feature nova no destino, não regressão de dado). |
| L2 | LOW | **308 permanente encadeado é cacheado pelo browser indefinidamente.** Se `/portal/financeiro/*` um dia voltar a ser rota real, clientes com cache do redirect não a verão. | Aceito: consistente com o precedente do Step 12 (`/dashboard` também é 308) e a intenção é remoção definitiva. Apenas registrar. |
| O1 | OBS | Regra 5 (`/portal/financeiro` exato → `/bi/financeiro`) é **redundante**: `:path*` da regra 6 casa zero segmentos e produziria o mesmo destino. | Harmless; explícito é até mais legível. Verificado funcionalmente (`/portal/financeiro` → 308 `/bi/financeiro`). |
| O2 | OBS | **Mudança de shell**: links antigos agora renderizam no shell BI (Navbar + sub-bar) em vez do shell Portal (Sidebar). Usuário de bookmark antigo perde a Sidebar. | Intencional — é o propósito do PR (a Sidebar já apontava pro BI). Zero impacto de dados. |
| O3 | OBS | `PAGE_LABELS` sem entrada para `/bi/financeiro/caixa/dre-mensal` (ChatPanel mostra 'Portal'). | **Pré-existente** em `main`, não introduzido por este PR. Opcional adicionar no follow-up de L1. |
| O4 | OBS | Nenhuma feature exclusiva do espelho se perdeu: `git log` mostra espelho e BI atualizados **no mesmo commit** até o fim (`806dce8` #185, inclusive o PR de números inteiros de 14/07). | Verificado par a par (caixa, extrato, cp, fluxo, conciliação). |
| E1 | ENV | `npm run lint` falha localmente (`ERR_PACKAGE_PATH_NOT_EXPORTED` — subpath `./config` do eslint) — `eslint.config.mjs` e `package.json` **não são tocados pelo PR** (flat config veio do #172). Problema de `node_modules` local, não do diff. | Reinstalar deps (`npm ci`) e/ou confiar no lint do CI. Não atribuível ao PR. |

## 5. Validação reproduzida

```
npm run typecheck    → exit 0 (0 erros)
npm test             → 378 passed / 28 files (~12s) — nenhum arquivo de teste removido
npm run build        → Compiled successfully; 37 rotas (44 − 7 removidas); middleware 87.2 kB
npm run audit:bundle → 0 credenciais (72 arquivos JS)
npm run lint         → falha ambiental local (E1), config não tocada pelo PR

grep "portal/financeiro" em src/ + middleware + testes → 0 matches (só next.config.js)
grep de 50 símbolos importados pelos arquivos deletados → todos com consumidor BI vivo

Smoke funcional (next start -p 3311, build de produção):
  /dashboard                      → 308 /portal/financeiro/caixa
  /dashboard/cp                   → 308 → 308 → 200 /bi/financeiro/cp-cr (2 redirects)
  /portal/financeiro              → 308 /bi/financeiro
  /portal/financeiro/cp           → 308 /bi/financeiro/cp-cr
  /portal/financeiro/cr           → 308 /bi/financeiro/cp-cr
  /portal/financeiro/caixa        → 308 /bi/financeiro/caixa
  /portal/financeiro/conciliacao  → 308 /bi/financeiro/conciliacao
  /portal/financeiro/cp?status=aberto → 308 /bi/financeiro/cp-cr?status=aberto (query preservada)
  /portal/financeiro/caixa/dre-mensal → 200 /bi/financeiro/caixa/dre-mensal
```

## 6. Pós-merge (operacional)

1. Smoke em produção: seguir 2-3 bookmarks antigos (`/dashboard/cp`, `/portal/financeiro/extrato`) → devem aterrissar no BI com 308s.
2. Clicar os 6 links atualizados do `/portal/grupo` logado com usuário `financeiro:ver`.
3. Backlog: **L1** (`?tab=cr` na cp-cr + repontar card/redirect de CR), O3 (label dre-mensal no ChatPanel).
4. Ambiente local: `npm ci` para sanar E1 antes da próxima sessão de lint local.
