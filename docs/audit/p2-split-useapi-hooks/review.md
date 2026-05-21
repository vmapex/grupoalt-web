# Audit PR #130 — P2: split `useAPI.ts` por dominio

Branch auditada: `refactor/p2-split-useapi-hooks`
Commit: `259f784 refactor(hooks): P2 - quebra useAPI.ts (696 LOC) por dominio em src/hooks/api/`
Auditor: agente independente isolado (worktree `agent-a19ba51956dc7ca43`)
Data: 2026-05-21

---

## TL;DR

Refactor 100% mecanico do monolito `src/hooks/useAPI.ts` (695 LOC, 11 dominios
misturados) em 11 arquivos focados sob `src/hooks/api/` (`_core.ts` + 10
hooks por dominio). O arquivo `src/hooks/useAPI.ts` foi reduzido a 90 LOC e
mantido como **barrel re-export**, preservando 100% da surface publica
(41 simbolos exportados, inclusive 9 `interface` publicas) — todos os
19 call sites de producao continuam funcionando **sem mudanca de import**.

Diff cirurgico: 12 arquivos tocados, 100% dentro de `src/hooks/`. Zero
mudanca de logica (a infra `fetchAllPages` preserva exatamente o ADR-002 com
`sync_pending`/`sync_status` da primeira pagina + defesa contra loop em
pagina vazia). Tests 231/231 verde, typecheck limpo, build sem regressao,
audit:bundle clean (81 arquivos JS, 0 credenciais). Os 4 warnings de lint
em `_core.ts` sao os MESMOS que existiam no antigo `useAPI.ts` (linhas 88
e 192 do monolito viraram 73 e 172 do `_core.ts`).

Recomendacao: **APPROVE**.

## Score: 100 / 100 — APPROVE

Refactor exemplar: surface 100% preservada, diff mecanico auditavel,
barrel padronizado, zero risco de typo em 19 call sites, comentario claro
no topo do barrel indicando preferencia de import direto pra novo codigo
(migracao gradual habilitada). Nao identifiquei nada para descontar.

---

## Matriz de bloqueadores

| # | Item | Esperado | Resultado | Status |
|---|---|---|---|---|
| B1 | Surface preservada (40+ simbolos) | 100% identico | 41 simbolos exportados no monolito = 41 simbolos exportados no barrel (set-equal) | OK |
| B2 | Cada um dos 11 arquivos em `src/hooks/api/` compila autonomo | `'use client'` topo + imports minimos | Todos 11 com `'use client'` no topo; cada um importa so o que usa (`useApi`/`useApiPaginatedAll` de `./_core`, types de `@/lib/types`, `api` de `@/lib/api` quando faz mutator); nenhum import morto | OK |
| B3 | `_core.ts` infra preserva ADR-002 byte-perfect | `sync_pending`/`sync_status` da 1a pagina + break em `dados.length === 0` | `fetchAllPages` lines 96-126 de `_core.ts` = copia literal das lines 113-141 do monolito antigo (mesmo `while`, mesmo `if (pagina === 1)`, mesmo break, mesmo retorno final) | OK |
| B4 | `useAPI.test.ts` funciona sem modificacao | barrel re-exporta `fetchAllPages` e `PAGINATED_ALL_PAGE_SIZE` | Barrel linha 14: `export { fetchAllPages, PAGINATED_ALL_PAGE_SIZE } from './api/_core'`; `npm test -- useAPI.test.ts --run` -> 5/5 verde em 1.29s | OK |
| B5 | Call sites intocados | 19 arquivos em `src/` continuam com `from '@/hooks/useAPI'` | Grep retorna exatos 19 matches; `git diff --name-only 6707190..refactor/p2-split-useapi-hooks` -> 12 arquivos (11 novos em `src/hooks/api/` + 1 modificado em `src/hooks/useAPI.ts`), ZERO fora de `src/hooks/` | OK |
| B6 | Typecheck verde | sem erros TS | `npm run typecheck` -> sem output (exit 0) | OK |
| B7 | Tests 231/231 verde | 231 tests, 14 arquivos | `Test Files 14 passed (14)`, `Tests 231 passed (231)`, 8.29s | OK exato |
| B8 | Build sem regressao | Compiled successfully | `Compiled successfully`, 42 rotas + middleware (Note: commit msg cita "50 rotas" — herdado de CLAUDE.md, mas refactor nao afeta route count; build atual e baseline atual sao identicos), shared 160 kB exato | OK |
| B9 | Bundle sem credenciais | 81 arquivos JS, 0 credenciais | "Verificando 81 arquivos JS no bundle... Nenhuma credencial exposta no bundle." | OK exato |
| B10 | `useCategoriasMap.ts` NAO tocado | sem diff | `git diff 6707190..refactor/p2-split-useapi-hooks -- src/hooks/useCategoriasMap.ts` -> vazio | OK |
| B11 | Lint sem erros novos | warnings pre-existentes apenas | Lint exit 0; os 4 warnings em `_core.ts` (linhas 73 e 172, missing dep `params` + complex expression `JSON.stringify(params)`) sao os mesmos que existiam no monolito antigo nas linhas 88 e 192 | OK |
| B12 | Types exports preservados | `export type` no barrel | Barrel exporta `CategoriaAPIItem` (linha 60), `ContaBancariaAPIItem` (linha 67), 7 types Orbit (linhas 74-82), `AdminEmpresaAPI` (linha 89) via `export type { ... } from ...` — todos os 10 types do monolito antigo presentes | OK |

**Resumo bloqueadores:** 12/12 OK.

## Matriz de qualidade

| # | Item | Resultado | Status |
|---|---|---|---|
| Q1 | Comentario no topo do barrel explicando o split | Barrel linhas 2-12: explica que conteudo foi quebrado por dominio, indica que arquivo eh entry point para preservar call sites, e sugere import direto `import { useExtrato } from '@/hooks/api/useExtrato'` pra novo codigo | OK |
| Q2 | Naming dos arquivos consistente (camelCase, prefixo `use` quando hook) | `_core.ts` (infra, prefixo underscore intencional), `useExtrato.ts`, `useSaldos.ts`, `useCPCR.ts`, `useFluxo.ts`, `useConciliacao.ts`, `useNotificacoes.ts`, `useCategoriasAPI.ts`, `useContasBancarias.ts`, `useOrbitAudit.ts`, `useAdminEmpresas.ts` — todos camelCase com prefixo `use` (excecao `_core.ts` que eh infra) | OK |
| Q3 | Estrutura `src/hooks/api/` separa infra (`_core`) com prefixo underscore | Convencao `_core.ts` deixa claro que eh modulo interno; separa visualmente da lista alfabetica de hooks por dominio | OK |
| Q4 | Refactor e DIFF MECANICO (mesma logica, sem melhorias sub-reptices) | Confirmado: codigo de cada hook eh recorte literal do monolito antigo. `fetchAllPages`, `useApi`, `useApiPaginatedAll`, `buildCleanParams` preservam linha-por-linha. Comentarios JSDoc preservados. Inclusive a interface `UseApiResult` privada do monolito virou `export interface UseApiResult` em `_core.ts` (so promovida pra public para reuso interno entre dominios — surface publica nao afetada porque continua nao re-exportada pelo barrel) | OK |
| Q5 | Commit message detalhado | Lista antes/depois com LOC, lista 11 arquivos com responsabilidades, lista 19 call sites preservados, lista validacoes (typecheck/test/lint/build/audit), justifica decisao de barrel vs migrar 19 call sites | OK |

**Resumo qualidade:** 5/5 OK.

## Matriz de risco / atencao

| # | Risco | Avaliacao |
|---|---|---|
| R1 | Quebra silenciosa de algum simbolo nao re-exportado pelo barrel | Mitigado por verificacao set-equal de 41 simbolos antigo == 41 simbolos novo. Os types publicos (`CategoriaAPIItem`, `ContaBancariaAPIItem`, 7 tipos Orbit, `AdminEmpresaAPI`) usam `export type { ... }` (TS-only re-export), o que evita "isolated modules" issue caso o build use `verbatimModuleSyntax`. Confirmado por typecheck verde. |
| R2 | `useApi` / `useApiPaginatedAll` divergirem futuramente entre `_core.ts` e algum dominio | Nao se aplica: ambos vivem APENAS em `_core.ts` e sao importados de la pelos dominios. Sem duplicacao de codigo. |
| R3 | Migracao gradual incentivada poder criar 2 paths concorrentes (barrel vs direto) | Aceitavel: ambos resolvem o mesmo modulo. O custo eh um nivel de indirecao. O comentario no barrel deixa explicita a direcao desejada. Para fechar 100% futuramente, basta um codemod de `@/hooks/useAPI` -> `@/hooks/api/<dominio>` por simbolo. |
| R4 | Os 4 warnings de `react-hooks/exhaustive-deps` em `_core.ts` aparecerem como "novos" no CI | Sao 100% identicos aos do monolito antigo (mesmo pattern `useCallback` + `[url, JSON.stringify(params)]`, simplesmente reposicionados). CI do Step 15 nao quebra em warnings. |
| R5 | `UseApiResult` virou `export interface` em `_core.ts` (era privado no monolito) | Cosmetico: foi necessario porque `useApi` retorna esse tipo e e' usado por dominios externos. Como nao foi re-exportado pelo barrel, NAO afeta surface publica (consumers externos nunca importaram esse tipo). Se algum dia o codigo do dominio precisar tipar a saida explicitamente, basta importar de `./_core` localmente. |

---

## Validacoes cruzadas

```
$ git log refactor/p2-split-useapi-hooks -1 --oneline
259f784 refactor(hooks): P2 - quebra useAPI.ts (696 LOC) por dominio em src/hooks/api/

$ git diff --name-only 6707190..refactor/p2-split-useapi-hooks
src/hooks/api/_core.ts
src/hooks/api/useAdminEmpresas.ts
src/hooks/api/useCPCR.ts
src/hooks/api/useCategoriasAPI.ts
src/hooks/api/useConciliacao.ts
src/hooks/api/useContasBancarias.ts
src/hooks/api/useExtrato.ts
src/hooks/api/useFluxo.ts
src/hooks/api/useNotificacoes.ts
src/hooks/api/useOrbitAudit.ts
src/hooks/api/useSaldos.ts
src/hooks/useAPI.ts

$ git show refactor/p2-split-useapi-hooks --stat | tail -15
 src/hooks/api/_core.ts              | 180 +++++++++
 src/hooks/api/useAdminEmpresas.ts   |  51 +++
 src/hooks/api/useCPCR.ts            | 154 +++++++
 src/hooks/api/useCategoriasAPI.ts   |  52 +++
 src/hooks/api/useConciliacao.ts     |  36 ++
 src/hooks/api/useContasBancarias.ts |  32 ++
 src/hooks/api/useExtrato.ts         |  21 +
 src/hooks/api/useFluxo.ts           |  34 ++
 src/hooks/api/useNotificacoes.ts    |  20 +
 src/hooks/api/useOrbitAudit.ts      |  91 +++++
 src/hooks/api/useSaldos.ts          |  21 +
 src/hooks/useAPI.ts                 | 775 ++++--------------------------------
 12 files changed, 777 insertions(+), 690 deletions(-)

# B1 — set-equal exports antigo vs novo (41 simbolos cada lado)
$ diff <(git show 6707190:src/hooks/useAPI.ts | node -e "...extract symbols...") \
       <(git show refactor/p2-split-useapi-hooks:src/hooks/useAPI.ts | node -e "...extract barrel symbols...")
(0 diffs — listas identicas)

# B5 — 19 call sites de producao
$ rg -l "from '@/hooks/useAPI'" src/ | wc -l
19

$ rg -l "from \"@/hooks/useAPI\"" src/ | wc -l
0 (todos usam aspas simples)

# B10 — useCategoriasMap.ts intocado
$ git diff 6707190..refactor/p2-split-useapi-hooks -- src/hooks/useCategoriasMap.ts
(vazio)

# B6 — typecheck
$ npm run typecheck
> tsc --noEmit --pretty false
(0 erros, exit 0)

# B4 — useAPI.test.ts dedicado
$ npm test -- useAPI.test.ts --run
 Test Files  1 passed (1)
      Tests  5 passed (5)
   Duration  1.29s

# B7 — suite completa
$ npm test
 Test Files  14 passed (14)
      Tests  231 passed (231)
   Duration  8.29s

# B8 — build
$ npm run build
 ✓ Compiled successfully
 ✓ Generating static pages (43/43)
Route (app)                                Size     First Load JS
┌ ƒ /                                      316 B           160 kB
├ ƒ /bi/financeiro                         12.3 kB         317 kB
├ ƒ /bi/financeiro/admin                   4.28 kB         204 kB
... (42 app routes total)
+ First Load JS shared by all              160 kB
ƒ Middleware                               87.2 kB
ƒ  (Dynamic)  server-rendered on demand

# B9 — bundle clean
$ npm run audit:bundle
Verificando 81 arquivos JS no bundle...
Nenhuma credencial exposta no bundle.

# B11 — lint warnings (zero erros)
$ npm run lint 2>&1 | grep -iE "error" | wc -l
0
$ npm run lint 2>&1 | grep "_core.ts" | head -5
./src/hooks/api/_core.ts
73:6  Warning: React Hook useCallback has a missing dependency: 'params'. ...
73:12 Warning: React Hook useCallback has a complex expression in the dependency array. ...
172:6 Warning: React Hook useCallback has a missing dependency: 'params'. ...
172:12 Warning: React Hook useCallback has a complex expression in the dependency array. ...

# Verificacao de continuidade: mesmos warnings existiam no monolito antigo
$ git show 6707190:src/hooks/useAPI.ts | grep -n "JSON.stringify(params)"
88:  }, [url, JSON.stringify(params)])
192:  }, [url, JSON.stringify(params)])

(Os warnings 73/172 do `_core.ts` correspondem aos antigos 88/192 do
`useAPI.ts` — simplesmente realocados, nao novos.)
```

---

## Observacoes nao-bloqueantes

1. **Discrepancia "50 rotas" vs 42**: O commit message e o `CLAUDE.md`
   citam "50 rotas" como baseline historica de validacao de build. O build
   atual produz 42 rotas no `Route (app)` + 1 middleware. Isso NAO eh
   regressao do refactor (a contagem ja era assim antes do PR — refactor
   nao adiciona/remove rotas), apenas a baseline cited e estale. Vale
   atualizar a documentacao na proxima sessao. Refactor NAO afeta route
   count por construcao.

2. **`UseApiResult` promovido a `export`**: Para que `useApi` e
   `useApiPaginatedAll` pudessem ser consumidos por dominios externos
   ainda tipando seu retorno explicitamente, `UseApiResult` virou `export
   interface` em `_core.ts`. NAO foi re-exportado pelo barrel, entao a
   surface publica nao mudou. Cosmetico.

3. **Migracao gradual habilitada**: Comentario no topo do barrel sugere
   `import { useExtrato } from '@/hooks/api/useExtrato'` para codigo novo.
   Isso permite ir migrando os 19 call sites organicamente sem PR de
   "rename massivo". Estrategia correta para um refactor cirurgico — fica
   a foundation pra deprecar o barrel no futuro.

4. **`_core.ts` exporta `useApiPaginatedAll`, `buildCleanParams`,
   `ApiParamValue`, `UseApiResult`**: alem dos 2 simbolos do barrel
   (`fetchAllPages` + `PAGINATED_ALL_PAGE_SIZE`). Esses 4 extras sao
   considerados "infra interna" do diretorio `src/hooks/api/` e nao
   tem motivo para vazar pelo barrel publico. Decisao correta.

---

## Decisao final

**APPROVE** com score **100/100**.

Refactor textbook: surface preservada bit-a-bit, diff 100% mecanico
auditavel, zero risco em 19 call sites (intocados), barrel re-export
preserva 100% dos 41 simbolos (inclusive types publicos), infra de
paginacao byte-perfect com ADR-002 preservado, lint sem erros novos,
tests 231/231 verde, typecheck limpo, build sem regressao, audit:bundle
clean. Foundation correta pra deprecacao gradual do barrel no futuro
via codemod simples.
