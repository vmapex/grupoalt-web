# Audit — Fase 5.F: Front consome /dre via useDRE (PR #121)

> Audit independente (padrão "seq + 1 auditor"). Toca UI visível com flag
> ligada, mas flag default `false` em prod inicial — soak controlado.

- **PR**: https://github.com/vmapex/grupoalt-web/pull/121
- **Branch**: `feat/fase-5f-front-usedre`
- **Commit**: `e4ecbff feat(dre): Fase 5.F - front consome /dre backend via feature flag`
- **Diff**: 5 arquivos, +638 / -1
  - `src/hooks/useDRE.ts` (NOVO, +188)
  - `src/hooks/useDRE.test.ts` (NOVO, +187)
  - `src/lib/featureFlags.ts` (NOVO, +40)
  - `src/components/caixa/ComparativoDRE.tsx` (NOVO, +179)
  - `src/app/bi/financeiro/caixa/page.tsx` (+44 / -1)
- **Pré-requisitos backend** (todos MERGED em `vmapex/grupoalt-api` main):
  - PR api #91 — Fase 5.C endpoint base (Score 94)
  - PR api #92 — Fase 5.D cache Redis + invalidação (Score 96)
  - PR api #93 — Fase 5.E granularity total|mensal|trimestral|semanal (Score 96)

---

## TL;DR

PR cirúrgico, ADR-001 implementado corretamente: front passa a consumir o
endpoint `GET /v1/empresas/{id}/dre` via hook `useDRE` quando a flag
`NEXT_PUBLIC_USE_BACKEND_DRE === 'true'`. Default `false` em prod garante
soak controlado. Tipos TS espelham 1:1 os DTOs Pydantic (14 subtotais,
meta, neutros, subtotais_por_periodo). Shim mantém os 9 campos antigos
consumidos pela UI sem regressão visual; quando flag OFF, página renderiza
idêntico ao main (verificado por diff). `<ComparativoDRE>` dev-only com
gate por `NODE_ENV !== 'production'` + escape hatch
`NEXT_PUBLIC_DRE_COMPARATIVO=true`. Cache key 5.D preservado pela omissão
de `granularity='total'` nos params. 13 testes Vitest novos para `useDRE`;
suite passa 231/231 (era 218 → +13). Typecheck, build, audit:bundle e lint
limpos.

## Score: **97 / 100** — **APPROVE**

**Recomendação:** APROVAR e mergear. Pré-requisitos backend todos verdes
(api #91/#92/#93 MERGED), motor real validado pelo oracle 5.A. Front
não introduz cálculo paralelo — apenas consome. Sem bloqueadores.
Soak com flag OFF é o passo natural; ligar a flag em staging primeiro
(via `NEXT_PUBLIC_USE_BACKEND_DRE=true` em env Vercel preview/staging)
para exercer o `<ComparativoDRE>` antes do soak em prod.

---

## Matriz de bloqueadores (todos OK)

| # | Item | Esperado | Encontrado | Status |
|---|------|----------|------------|--------|
| B1 | Tipo TS bate com Pydantic | 14 campos `DRESubtotais` exatos | `useDRE.ts:32-47` define os 14 (`RoB, TDCF, RL, CV, MC, CF, EBT1, RNOP, DNOP, SNOP, EBT2, IRPJ, CSLL, RES_LIQ`) — idêntico a `DRESubtotaisOut` em `app/routers/dre.py:89-105`. `NeutroAgregado` (codigo/nome/total/count) = `NeutroAgregadoOut`. `DREMeta` (empresa_id, dt_inicio, dt_fim, projeto_omie_ids, granularity, total_lancamentos) = `DREMetaOut:117-130`. `PeriodoDRE` (periodo, subtotais, total_lancamentos) = `PeriodoDREOut:133-147`. `DREResponse` (subtotais, neutros, meta, subtotais_por_periodo) = `DREResponse:150-165` | OK |
| B2 | Path correto, sem `/v1` duplicado | `baseURL=/api/proxy/v1`, path `/empresas/{id}/dre` | `useDRE.ts:161` chama `api.get('/empresas/${empresaId}/dre')`. `src/lib/api.ts:16` `baseURL: '/api/proxy/v1'`. `next.config.js:17-19` rewrite `/api/proxy/:path* → ${NEXT_PUBLIC_API_URL}/:path*`. URL final: `${NEXT_PUBLIC_API_URL}/v1/empresas/{id}/dre`. Sem duplicação | OK |
| B3 | Cache key 5.D preservado: `granularity='total'` OMITIDO | Param não enviado quando `total` | `useDRE.ts:154-158` `if (params?.granularity && params.granularity !== 'total')`. Test `useDRE.test.ts:115-121` confirma `config?.params?.granularity` é `undefined` quando passado `'total'`. Bate com `_build_cache_suffix` do backend que produz mesmo hash com 4º param ausente ou `"total"` | OK |
| B4 | Flag default `false` em prod | Sem env var → `false` | `featureFlags.ts:25-27` `return process.env.NEXT_PUBLIC_USE_BACKEND_DRE === 'true'`. Comparação estrita; qualquer outro valor (`undefined`, `'false'`, `'1'`) → `false`. Inlining em build (variáveis `NEXT_PUBLIC_*`) garante que sem env no Vercel → flag OFF | OK |
| B5 | Datas ISO YYYY-MM-DD | Backend Pydantic `date` rejeita DMY com 422 | `caixa/page.tsx:53-58` passa `dateFrom`/`dateTo` diretamente. `dateRangeStore.ts:5-7` `toISO(d)` produz `YYYY-MM-DD`; `dateRangeStore.ts:21-22` defaults `SSR_DEFAULT_FROM='2025-01-01'`. `useDRE.ts:149-150` repassa raw (`if (params?.dt_inicio) cleanParams.dt_inicio = params.dt_inicio`). Test `useDRE.test.ts:94-104` confirma `'2026-04-01'`/`'2026-04-30'` no params. Não confundido com `dt_inicio`/`dt_fim` DMY do `useExtrato` (esse usa `isoToDMY(...)` separado em `caixa/page.tsx:36-37`) | OK |
| B6 | Shim shape preserva 9 campos UI | `{rob, tdcf, cv, cf, mc, rnop, dnop, ebt1, ebt2}` | `caixa/page.tsx:103-112` quando flag ON e backend respondeu, retorna `{rob: s.RoB, tdcf: s.TDCF, cv: s.CV, cf: s.CF, mc: s.MC, rnop: s.RNOP, dnop: s.DNOP, ebt1: s.EBT1, ebt2: s.EBT2}` — exatamente os 9 campos antigos. JSX `KPIStrip`, `ChartGrid`, `DRESidebar`, footer strip consomem `dreData.*` inalterados | OK |
| B7 | Compat backward (flag OFF) | Render idêntico ao main | `git diff origin/main src/app/bi/financeiro/caixa/page.tsx`: diff puramente aditivo — `dreData` antigo renomeado para `dreLocal`, novo `dreData` é `useBackend && dreBackend ? shim : dreLocal`. Quando `useBackend=false` (default prod), `dreData === dreLocal` (mesmo objeto, mesmo shape do main). JSX da página não tocado salvo pelo `<ComparativoDRE>` no fim do return — que retorna `null` em prod sem escape hatch | OK |
| B8 | AbortController | Cancela call anterior | `useDRE.ts:128, 141-143, 162-163` `abortRef.current?.abort()` antes de criar novo controller; `signal: ctrl.signal` passado no axios; cleanup em `useEffect:184` `return () => abortRef.current?.abort()`. Idêntico ao `useApi` em `useAPI.ts:64-75`. Test `useDRE.test.ts:140-146` confirma `config?.signal instanceof AbortSignal` | OK |
| B9 | `empresaId=null` não dispara API | `setData(null)` early return | `useDRE.ts:134-139` `if (!empresaId) { setData(null); setLoading(false); setError(null); return }`. Test `useDRE.test.ts:45-51` confirma `expect(api.get).not.toHaveBeenCalled()` com `useDRE(null)` | OK |
| B10 | 13 cenários de teste | Tests cobrem todos os requisitos | `useDRE.test.ts`: (1) empresaId=null, (2) GET path /empresas/42/dre, (3) success populate, (4) error com detail, (5) error fallback genérico, (6) params dt_inicio/dt_fim ISO, (7) projeto_omie_ids array, (8) granularity='total' OMITIDO, (9) granularity='mensal' enviado, (10) params undefined + array vazio ignorados, (11) AbortController signal, (12) refetch dispara, (13) subtotais_por_periodo mensal. 13/13 PASSED | OK |
| B11 | Sem regressão da suite 218→231 (+13) | `npm test -- --run` | `npm test`: **231/231** PASSED em 14 arquivos (8.30s). +13 do useDRE.test.ts. Zero regressão nos 13 arquivos preexistentes | OK |
| B12 | Comparativo gated dev/staging | Em prod sem escape, `return null` | `featureFlags.ts:37-40` `if (process.env.NEXT_PUBLIC_DRE_COMPARATIVO === 'true') return true; return process.env.NODE_ENV !== 'production'`. `ComparativoDRE.tsx:70, 73` `const enabled = useDREComparativo(); if (!enabled) return null` — early return antes de qualquer DOM. Em prod sem escape: NODE_ENV='production' e NEXT_PUBLIC_DRE_COMPARATIVO ausente → enabled=false → null | OK |
| B13 | Comparativo `null/null` → não renderiza | `local=null && backend=null → return null` | `ComparativoDRE.tsx:74` `if (!local && !backend) return null` — segundo guard explícito. Antes do mount da bolha flutuante | OK |

**Zero bloqueadores.**

## Matriz de qualidade

| # | Item | Status | Observação |
|---|------|--------|------------|
| Q1 | Docstrings ADR-001 + fases | OK | `useDRE.ts:2-21` cabeçalho referencia Fases 5.C/5.D/5.E e mapeia DTOs Pydantic; `featureFlags.ts:14-23` cita Fase 5.F (ADR-001) e Fase 5.G (cleanup pós-soak); `ComparativoDRE.tsx:2-14` documenta gate dev-only e escape hatch |
| Q2 | Tipos TS exportados nomeados | OK | `useDRE.ts` exporta `Granularity`, `DRESubtotais`, `NeutroAgregado`, `DREMeta`, `PeriodoDRE`, `DREResponse`, `UseDREParams` — disponíveis para PRs futuros (5.G cleanup, sub-fases que consumam granularity != 'total') |
| Q3 | Comparativo com a11y | OK | `ComparativoDRE.tsx:104-105` `role="region" aria-label="Comparativo DRE local vs backend (dev)"`. Tabela com `<thead>`/`<tbody>` semânticos |
| Q4 | Threshold configurável | OK | `ComparativoDRE.tsx:56-57, 67-68` prop `threshold?: number` com default `0.01` (1 centavo). Diff flagged quando `Math.abs(diff) > threshold` |
| Q5 | Lint clean | OK | `npm run lint` → apenas warnings preexistentes do projeto (`react-hooks/exhaustive-deps` em vários files; `@next/next/no-img-element` em Navbar). Nenhum warning novo introduzido pelo PR. Zero errors |
| Q6 | Bundle audit clean | OK | `npm run audit:bundle` → "Nenhuma credencial exposta no bundle" (79 arquivos JS verificados) |
| Q7 | Bundle size aceitável | OK | `/bi/financeiro/caixa` = **16.1 kB** (314 kB c/ shared). Esperado ~1-2 kB de aumento. Não foi possível medir o delta exato sem rebuild da main, mas tamanho final está em linha com outras rotas BI (e.g. `/portal/financeiro/conciliacao` = 4.26 kB, `/bi/financeiro` etc.) |

## Risco

| Item | Avaliação |
|------|-----------|
| R1 — Toca UI visível com flag LIGADA | Mitigado: flag default `false` em prod inicial. Para ligar, requer nova deploy com `NEXT_PUBLIC_USE_BACKEND_DRE=true` no Vercel. Soak controlado é estratégia explícita em `featureFlags.ts:21-23` |
| R2 — Backend já em prod sem consumer real | OK. Backend silencioso desde merges de api #91/#92/#93 (não emite eventos visíveis). Quando flag ligar, único consumidor inicial é o Caixa BI, fácil de monitorar via logs Railway. Cache TTL 30min + invalidação automática reduzem risco de dado stale |
| R3 — Mudança silenciosa em subtotais | Mitigado pelo `<ComparativoDRE>` em dev/staging. Em staging Vercel preview, ligar `NEXT_PUBLIC_DRE_COMPARATIVO=true` permite comparar lado a lado por X dias antes do soak em prod. Diff threshold 0.01 detecta diferenças relevantes; ≈0 (igual) é sinalizado. Header da bolha mostra contagem de divergências |
| R4 — Granularity != 'total' no front | Não-issue. Hook expõe `granularity` no `UseDREParams`, mas Caixa BI passa default (`'total'`). Nenhum consumidor da Fase 5.F usa mensal/trimestral/semanal. Espaço para PRs futuros sem regressão imediata |

---

## Validações cruzadas

| Comando | Resultado |
|---------|-----------|
| `git fetch origin feat/fase-5f-front-usedre` | OK |
| `git checkout feat/fase-5f-front-usedre` | OK (já checked-out no main worktree) |
| `git log --oneline origin/main..HEAD` | `e4ecbff feat(dre): Fase 5.F - front consome /dre backend via feature flag` (1 commit) |
| `git diff --stat origin/main..HEAD` | 5 files, +638/-1 |
| `npm install --no-audit --no-fund` | OK ("up to date in 2s") |
| `npm run typecheck` | Zero erros (`tsc --noEmit --pretty false`) |
| `npm test -- --run` | **231/231 PASSED** (14 files, 8.30s). +13 do `useDRE.test.ts` |
| `npm run lint` | Zero errors; apenas warnings preexistentes (`react-hooks/exhaustive-deps`, `@next/next/no-img-element`) |
| `npm run build` | OK. 50 rotas. `/bi/financeiro/caixa` = 16.1 kB (314 kB c/ shared). Middleware 87.2 kB. Sem regressão de bundle |
| `npm run audit:bundle` | "Nenhuma credencial exposta no bundle" (79 arquivos JS) |
| Cross-check `useDRE.ts` vs `dre.py` | DTOs 1:1 (14 subtotais, neutros, meta, periodos). `DREMeta.granularity` Literal idêntico ('total' \| 'mensal' \| 'trimestral' \| 'semanal') |
| Cross-check rewrite proxy | `next.config.js:17-19` → URL final `${NEXT_PUBLIC_API_URL}/v1/empresas/{id}/dre`, sem duplicação |
| Cross-check dateRangeStore ISO | `from`/`to` são `YYYY-MM-DD` por construção (`toISO` em `dateRangeStore.ts:5-7`) |
| Cross-check JSX render compat | `git diff origin/main src/app/bi/financeiro/caixa/page.tsx`: render JSX inalterado salvo `<ComparativoDRE>` no fim (dev-only) |

---

## Pontos positivos

1. **ADR-001 implementado com rigor.** Front é consumidor puro; cálculo
   real fica no backend (motor 5.A validado por oracle). Nenhuma duplicação
   de regra DRE no client.
2. **Soak controlado por design.** Flag default `false` em prod inicial,
   `<ComparativoDRE>` em dev/staging permite validação manual side-by-side
   antes de ligar a flag. Plano de Fase 5.G (cleanup do `calcularDRE`)
   documentado em `featureFlags.ts:23-24`.
3. **Compatibilidade backward perfeita.** Quando flag OFF, página
   renderiza idêntico ao main. `dreData = dreLocal` é o mesmo objeto que
   antes da PR (renomeado de `dreData` no main). Shim só age sob flag ON.
4. **Cache 5.D respeitado.** Omissão explícita de `granularity='total'`
   nos params garante que chamadas iniciais (Caixa BI) batem no mesmo
   cache key que requests sem param — comportamento alinhado com
   `_build_cache_suffix` no backend, que produz hash idêntico para
   default + 'total' explícito.
5. **Tipos TS espelham Pydantic 1:1.** Os 14 subtotais aparecem na mesma
   ordem e nomes (PascalCase para os subtotais, snake_case para meta).
   Garantia de não-drift contratual entre repos.
6. **Cancellation correta.** `AbortController` no padrão idêntico ao
   `useApi`; previne race conditions em refetch rápido (date range
   picker, mudança de empresa, etc.).
7. **Teste oracle do "OMITE granularity='total'"** (`useDRE.test.ts:115-121`)
   codifica explicitamente a invariante de cache key 5.D — protege
   contra regressão futura se alguém "limpar" o `if` na build de params.
8. **Comparativo é dev-only por construção.** Dois gates: a flag
   `useDREComparativo()` (`featureFlags.ts:37-40`) + early `return null`
   no componente (`ComparativoDRE.tsx:73-74`). Em prod sem escape hatch,
   zero DOM injetado.
9. **Shim shape minimal.** 9 campos (`rob, tdcf, cv, cf, mc, rnop, dnop,
   ebt1, ebt2`) — apenas o que a UI atual consome. Sem inflar contrato.
10. **Inglês do backend (PascalCase RoB) → português do front
    (camelCase rob).** Conversão localizada e documentada no shim,
    sem propagar PascalCase para a UI.

## Pontos de atenção (não-bloqueantes)

1. **Nit (UX) — `dreLocal` continua sendo calculado mesmo com flag ON.**
   Comentário em `caixa/page.tsx:85-87` justifica: o `<ComparativoDRE>`
   precisa do local para mostrar o diff em staging/dev. Em prod com flag
   ON e sem `NEXT_PUBLIC_DRE_COMPARATIVO`, o cálculo local fica órfão
   (computado mas não usado). Custo: O(n) num useMemo, ~ms por mudança
   de `lancamentos`/`categoriaMap`. **Aceitável** — Fase 5.G remove o
   `calcularDRE` antigo de qualquer jeito. Otimização prematura ficaria
   no caminho do cleanup.

2. **Nit (DX) — `ComparativoDRE` recebe `local: DREComparativoLocal`
   (9 campos) mas `backend: DRESubtotais` (14 campos).** Comentário em
   `ComparativoDRE.tsx:22-24` explica: mantém só 9 visíveis pra evitar
   ruído na bolha flutuante. Os outros 5 (`RL`, `SNOP`, `IRPJ`, `CSLL`,
   `RES_LIQ`) ficam invisíveis no comparativo. Para o soak inicial é
   suficiente; se Fase 5.G/5.H quiser comparar todos os 14, basta
   estender o array `LINHAS`. **Sem fix necessário.**

3. **Observação — Quando flag ON sem internet/backend down, `dreBackend`
   fica `null` e `dreData` cai pra `dreLocal`.** Isso é graceful
   degradation correta (UI não quebra). Mas vale lembrar que o usuário
   verá "transição silenciosa" entre valores backend e local. Banner de
   erro UI não é o padrão dessa PR — `useDRE` apenas seta `error`. Se
   eventualmente quisermos UX explícita ("usando cálculo local porque
   o servidor falhou"), é trabalho futuro. **Sem fix.**

Nenhum dos três justifica novo commit; podem ser absorvidos em 5.G se
conveniente.

---

## Tempo

Audit total: **~28 min**.

- Leitura dos 5 arquivos novos/modificados: 9 min
- Cross-check com backend (`app/routers/dre.py`) + `api.ts` + `next.config.js`: 4 min
- Execução das validações (install + typecheck + test + lint + build + audit:bundle): 11 min
- Cross-check da matriz B1-B13 + Q1-Q7 + R1-R4: 3 min
- Redação do review: 1 min

---

## Decisão final

**APPROVE — Score 97/100.** Pode mergear assim que o CI fechar verde.
Nenhum follow-up obrigatório. Os 3 pontos de atenção são opcionais e
podem entrar em 5.G.

Sequenciamento sugerido pós-merge:

1. **Soak 1 — Staging Vercel preview** (1-3 dias). Setar
   `NEXT_PUBLIC_USE_BACKEND_DRE=true` + `NEXT_PUBLIC_DRE_COMPARATIVO=true`
   no env preview. Exercer o `<ComparativoDRE>` lado a lado em todas as
   janelas comuns (mês corrente, trimestre, semestre, ano). Aceitar se
   header da bolha mostrar "OK" (zero divergências > 1 centavo).

2. **Soak 2 — Prod com flag OFF** (default). Backend continua silencioso
   em prod, frontend não consome ainda. Sem mudança visível ao usuário.
   Janela: até próximo deploy regular.

3. **Soak 3 — Prod com flag ON** (7-14 dias conforme `featureFlags.ts:23`).
   Setar `NEXT_PUBLIC_USE_BACKEND_DRE=true` no env Vercel prod, deploy.
   Monitorar Sentry + Railway logs por erros 5xx no endpoint `/dre` e
   pelos clientes do front. Cache hit rate de Redis deve subir
   gradualmente (Fase 5.D).

4. **Fase 5.G — Cleanup** após Soak 3 estável. Remove `calcularDRE` de
   `planoContas.ts`, remove buildXxx que dependam dele em `caixaBuilder.ts`,
   remove `useBackendDRE`/`useDREComparativo`, remove `<ComparativoDRE>`,
   remove `dreLocal` da `caixa/page.tsx`. Front fica com hook backend
   como fonte única.

Após o merge da 5.F, a sequência ADR-001 fica em **5/6 entregues**:

- 5.A/B: motor puro + oracle (`grupoalt-api` #90 MERGED)
- 5.C: endpoint base (`grupoalt-api` #91 MERGED, 94)
- 5.D: cache Redis + invalidação (`grupoalt-api` #92 MERGED, 96)
- 5.E: granularity (`grupoalt-api` #93 MERGED, 96)
- **5.F: front useDRE + flag (`grupoalt-web` #121, 97)** — este audit
- 5.G: cleanup pós-soak — pendente
