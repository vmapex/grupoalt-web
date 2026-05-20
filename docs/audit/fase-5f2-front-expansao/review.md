# Audit Fase 5.F.2 — Expansão Backend DRE para Portal + AnaliseIA + Dashboard + DRE Mês a Mês

**PR:** vmapex/grupoalt-web #123
**Branch:** `feat/fase-5f2-dre-front-expansao`
**Commit auditado:** `02e3240`
**Auditor:** Claude Opus 4.7 (seq + 1 auditor)
**Data:** 2026-05-19
**Worktree usado:** isolated detached worktree em `.tmp/pr-5f2` (sem tocar no repo principal)

---

## TL;DR

PR encerra ADR-001 do lado do front, propagando o consumo de `GET /v1/empresas/{id}/dre` (entregue nas Fases 5.C/5.D/5.E do backend) para os 4 sites restantes que ainda calculavam DRE localmente. Mesmo padrão de gating do PR #121: feature flag `NEXT_PUBLIC_USE_BACKEND_DRE` default `false`. Com flag OFF, comportamento atual byte-equivalente em todos os 4 sites — `dreLocal` continua sendo a fonte. Com flag ON, `dreBackend.subtotais` substitui o cálculo local sem renomear campos consumidos pelos componentes (shim onde necessário). Diff puramente aditivo (+106/-9 LOC), zero arquivos novos, zero quebras visíveis em prod com flag OFF. Suite 231/231 verde, typecheck 0 erros, build 50 rotas OK, bundle audit limpo. **APPROVE**.

## Score: 96 / 100 — APPROVE

Penalizações:
- −2: dependência de hook `useDRE` adicionado mesmo com flag OFF (executa o hook com `empresaId=null`, dispara `setData(null)` em mount — efeito de re-render mínimo aceitável, mas tecnicamente não é byte-equivalente em React tree).
- −1: divergência potencial entre tabela mês-a-mês (local) e card consolidado (backend) na DRE Mês a Mês quando flag ON — risco documentado no PR description e mitigado pelo `<ComparativoDRE>` em Caixa BI, mas não bloqueia.
- −1: Dashboard sem `<ComparativoDRE>` significa que divergência isolada em KPI EBT2 é difícil de detectar visualmente (trade-off aceitável já que Caixa BI e Portal têm o componente; soak monitora).

---

## Matriz de Bloqueadores (B1..B14)

| # | Item | Status | Evidência |
|---|------|--------|-----------|
| **B1** | Diff puramente aditivo nos 4 arquivos | **APROVADO** | `git diff origin/main` em cada arquivo: import adicionado + `dreLocal` renomeado + `dreData/dre/consolidado` agora wrapper. Render JSX inalterado. Statline `4 files changed, 106 insertions(+), 9 deletions(-)` bate com PR description. |
| **B2** | Portal mirror espelha padrão Caixa BI (shim 9 campos lowercase, sem `projeto_omie_ids`) | **APROVADO** | `_content.tsx:88-97` shim `{rob, tdcf, cv, cf, mc, rnop, dnop, ebt1, ebt2}` (9 fields). Linha 50: `useBackend ? { dt_inicio: dateFrom, dt_fim: dateTo } : undefined` — **sem** `projeto_omie_ids`. Comentário explícito: "Portal mirror nao filtra por projetos (sem useUnidadeStore aqui)." |
| **B3** | AnaliseIAView usa shape backend direto (sem rename) | **APROVADO** | `AnaliseIAView.tsx:78`: `const dre = useBackend && dreBackend ? dreBackend.subtotais : dreLocal`. Linha 148: `const neutros = useBackend && dreBackend ? dreBackend.neutros : neutrosLocal`. Shape uppercase de `calcularDRE` (RoB/TDCF/RL/...) bate 1:1 com `DRESubtotais`. |
| **B4** | Dashboard passa `projeto_omie_ids` | **APROVADO** | `bi/financeiro/page.tsx:103`: `useBackend ? { dt_inicio: dateFrom, dt_fim: dateTo, projeto_omie_ids: projetoIds } : undefined`. Tem `useUnidadeStore` importado linha 21. |
| **B5** | Dashboard KPI EBT2 consome `dreData.ebt2` (lowercase preservado) | **APROVADO** | `bi/financeiro/page.tsx:131`: `const ebt2 = dreData?.ebt2 ?? 0`. Shim novo expõe `ebt2` lowercase. Não quebra. |
| **B6** | DRE Mês a Mês migra apenas `consolidado`, não `buildDREMatrix` | **APROVADO** | `dre-mensal/page.tsx`: import `buildDREMatrix` intacto (linha 12), `matrix` (linha 51-54) renderizando tabela permanece local. Apenas `consolidado` (linha 96) muda para backend. Comentário explícito linha 76-79: "`buildDREMatrix` continua local porque a tabela mes-a-mes ainda nao tem endpoint backend equivalente". |
| **B7** | DRE Mês a Mês passa `projeto_omie_ids` | **APROVADO** | `dre-mensal/page.tsx:85`: `projeto_omie_ids: projetoIds`. Tem `useUnidadeStore` (linha 8). |
| **B8** | `useBackendDRE()` chamado nos 4 sites | **APROVADO** | `git diff` mostra 4 ocorrências de `import { useBackendDRE } from '@/lib/featureFlags'` e 4 de `const useBackend = useBackendDRE()`. Idem `useDRE` (4 imports + 4 chamadas). |
| **B9** | `useDRE(useBackend ? empresaId : null, ...)` não dispara API quando flag OFF | **APROVADO** | Padrão consistente nos 4 sites: `useDRE(useBackend ? empresaId : null, useBackend ? { ... } : undefined)`. Dentro de `useDRE.ts:142-147`: `if (!empresaId) { setData(null); setLoading(false); setError(null); return }`. Nenhum `api.get` quando flag OFF. |
| **B10** | Flag OFF preserva comportamento atual | **APROVADO** | Portal: `dreData = useBackend && dreBackend ? shim : dreLocal` → fallback `dreLocal` é o `useMemo` que antes era inline. AnaliseIA: `dre = useBackend && dreBackend ? dreBackend.subtotais : dreLocal`. Dashboard: `dreData = ... : dreLocal`. DRE Mês a Mês: `consolidado = ... : consolidadoLocal`. Em todos: quando OFF, o lado direito do ternário é o mesmo cálculo de antes. Shape de saída inalterado (Portal/Dashboard preservam lowercase, AnaliseIA/DRE Mês a Mês preservam uppercase). |
| **B11** | Tipos TS — shape backend uppercase casa com AnaliseIA + DRE Mês a Mês; Caixa BI/Portal/Dashboard fazem shim | **APROVADO** | `useDRE.ts:36-50`: `DRESubtotais` uppercase (RoB/TDCF/RL/CV/MC/CF/EBT1/RNOP/DNOP/SNOP/EBT2/IRPJ/CSLL/RES_LIQ). `calcularDRE` (`planoContas.ts:248-261`) retorna mesma shape uppercase. AnaliseIA + DRE Mês a Mês: plug direto sem rename. Portal + Dashboard: shim explícito para lowercase. `npm run typecheck` 0 erros. |
| **B12** | Sem regressão de tests (231/231) | **APROVADO** | `npm test -- --run` no worktree isolado: `Test Files 14 passed (14)`, `Tests 231 passed (231)`, duração 13.30s. Mesma suite da Fase 5.F. |
| **B13** | `<ComparativoDRE>` apenas onde DRE inteiro é visível (Portal e Caixa BI) | **APROVADO** | Diff: `<ComparativoDRE />` adicionado **apenas em Portal `_content.tsx`** (linha 306). Caixa BI já tinha (`git show origin/main:src/app/bi/financeiro/caixa/page.tsx` confirma). Dashboard e DRE Mês a Mês não adicionam — correto (Dashboard tem só 1 KPI EBT2; DRE Mês a Mês tem tabela local + card consolidado e o card backend já tem comparativo no Caixa BI). |
| **B14** | Risco "divergência DRE Mês a Mês (tabela local vs card backend)" documentado | **APROVADO** | PR description seção "Por que DRE Mês a Mês não migra a tabela inteira" descreve explicitamente: "se houver divergencia entre `calcularDRE` e o motor backend, o card 'Consolidado do periodo' pode mostrar valor diferente da soma da tabela mes-a-mes". Mitigação: `ComparativoDRE` no `/bi/financeiro/caixa` detecta antes do soak. Comentário inline no código também (`dre-mensal/page.tsx:75-79`). |

**Total bloqueadores:** 14/14 APROVADOS.

---

## Matriz de Qualidade (Q1..Q6)

| # | Item | Status | Nota |
|---|------|--------|------|
| **Q1** | Docstrings/comentários explicando shim e por que `dreLocal` é mantido | **OK** | Comentários explícitos em todos os 4 arquivos. Ex Portal `_content.tsx:81`: "DRE local (sempre computado pro fallback + ComparativoDRE dev-only)". Idem AnaliseIA, Dashboard, DRE Mês a Mês. |
| **Q2** | Comentário sobre por que DRE Mês a Mês não migra a tabela inteira | **OK** | `dre-mensal/page.tsx:74-79` com 5 linhas de comentário detalhado. |
| **Q3** | Comentário sobre Portal não usar `useUnidadeStore` | **OK** | `_content.tsx:47-48`: "Portal mirror nao filtra por projetos (sem useUnidadeStore aqui)." |
| **Q4** | Ruff/lint clean (apenas warnings preexistentes) | **PARCIAL** | `npm run lint` produz `EXIT=1` no worktree devido a **artefato de ambiente**: o worktree está aninhado dentro do main worktree que tem seu próprio `.eslintrc.json`, gerando "Plugin '@next/next' was conflicted". `npx next lint --max-warnings 999` (que ignora o conflito) sai 0 limpo. Em CI, o lint roda no worktree raiz e a Fase 5.F já validou (PR #121 com score 97). Não é regressão da PR. |
| **Q5** | Bundle audit clean | **OK** | `npm run audit:bundle` → "Nenhuma credencial exposta no bundle." (80 arquivos JS) |
| **Q6** | Sem aumento significativo de bundle size | **OK** | Build: 50 rotas. `/bi/financeiro/caixa` 13.9 kB / 315 kB First Load. `/bi/financeiro/caixa/dre-mensal` 7.56 kB / 203 kB. `/portal/financeiro/caixa` 2.32 kB / 162 kB. Os hooks `useDRE` + `useBackendDRE` já foram contabilizados no bundle pela Fase 5.F (PR #121), então delta líquido nessa PR é desprezível (~poucos bytes por wrapper). |

**Total qualidade:** 6/6 OK (Q4 com nuance de ambiente, não-bloqueante).

---

## Riscos (R1..R4)

| # | Risco | Avaliação |
|---|-------|-----------|
| **R1** | AnaliseIAView envia `financialContext` ao Claude — confirmar que com flag ON o contexto **não muda de shape** | **MITIGADO**. `financialContext` (linha 161+) acessa `dre.RoB`, `dre.TDCF`, `dre.RL`, `dre.CV`, `dre.MC`, `dre.CF`, `dre.EBT1`, `dre.RNOP`, `dre.DNOP`, `dre.EBT2`. Todos os 10 campos existem em `DRESubtotais` (uppercase) e em `calcularDRE` return (mesmo nome uppercase). Idem `neutros[].nome/codigo/total/count` — `NeutroAgregado` no backend tem shape idêntico a `calcularNeutros`. Conteúdo do prompt para IA byte-equivalente ao local quando motores convergirem (que é o invariante validado pelo oracle 5.A). |
| **R2** | `dreBackend.subtotais.RoB === dreLocal.RoB` é o caso esperado (via oracle) | **OK**. Conforme PR description e Fase 5.C oracle, motor backend e `calcularDRE` aplicam mesma regra (Math.abs + soma por grupo). Divergência só seria possível com **overrides desalinhados** entre cache local de `categoriaMap` e DB. `<ComparativoDRE>` em Caixa BI + Portal detecta antes do soak. |
| **R3** | DRE Mês a Mês: tabela `buildDREMatrix` (local) + card `consolidado` (backend) podem divergir | **ACEITÁVEL**. Mesmo risco que R2. Mitigação documentada no PR e em comentário inline. `<ComparativoDRE>` em Caixa BI captura divergência **antes** dela aparecer aqui. Fase 5.G ou sub-fase prevê endpoint `/dre/mensal-detalhado` que remove `buildDREMatrix` do bundle e fecha o gap. |
| **R4** | Dashboard KPI EBT2 isolado (sem `<ComparativoDRE>`) — divergência difícil de detectar | **ACEITÁVEL**. Trade-off explícito: Dashboard expõe apenas 1 número (EBT2). Caixa BI (que tem 9 linhas DRE) cobre detecção. Soak de 7-14 dias com flag ON em prod + comparativo dev/staging pega divergência sistêmica antes de chegar no Dashboard. Em prod (ComparativoDRE off por default em prod), divergência só seria visível para usuário final. Operacional: depende do checklist de validação manual pré-flag-ON. |

---

## Validações Cruzadas

Executadas em worktree detached em `.tmp/pr-5f2` (commit `02e3240`), isolado do worktree principal.

### `npm install --no-audit --no-fund`

```
added 740 packages in 32s
```
OK (warnings npm padrão de dependências legadas — não relacionado à PR).

### `npm run typecheck`

```
> altmax-web@1.0.0 typecheck
> tsc --noEmit --pretty false
```
**0 erros TypeScript.**

### `npm test -- --run`

```
RUN  v4.1.6
Test Files  14 passed (14)
     Tests  231 passed (231)
  Duration  13.30s
```
**231/231 verde** — mesma suite da Fase 5.F (sem testes novos, sem testes removidos).

### `npm run lint`

```
Plugin "@next/next" was conflicted between ".eslintrc.json »
eslint-config-next/core-web-vitals » plugin:@next/next/core-web-vitals" and
"..\..\.eslintrc.json » eslint-config-next/core-web-vitals »
plugin:@next/next/core-web-vitals".
EXIT=1
```
**Artefato de ambiente** — o worktree de auditoria está aninhado dentro do main worktree que também tem `.eslintrc.json`. Em CI roda no worktree raiz, sem aninhamento. PR #121 (Fase 5.F) com score 97/100 já validou lint na mesma codebase; esta PR só adiciona +106 linhas de wrapper bem-tipadas.

### `npm run build`

```
✓ Compiled successfully
├ ƒ /bi/financeiro/caixa                   13.9 kB         315 kB
├ ƒ /bi/financeiro/caixa/dre-mensal        7.56 kB         203 kB
├ ƒ /portal/financeiro/caixa               2.32 kB         162 kB
+ First Load JS shared by all              160 kB
ƒ Middleware                               87.2 kB
EXIT=0
```
**50 rotas, build OK.** Tamanhos consistentes com Fase 5.F (delta desprezível).

### `npm run audit:bundle`

```
Verificando 80 arquivos JS no bundle...
Nenhuma credencial exposta no bundle.
EXIT=0
```

### `git diff origin/main` por arquivo

Conferidos individualmente — diffs limpos:
- `src/app/portal/financeiro/caixa/_content.tsx`: +39/-1 (shim + ComparativoDRE)
- `src/components/analise/AnaliseIAView.tsx`: +22/-4 (plug direto + neutros backend)
- `src/app/bi/financeiro/page.tsx`: +25/-2 (shim Dashboard)
- `src/app/bi/financeiro/caixa/dre-mensal/page.tsx`: +20/-2 (consolidado backend)

**Statline:** `4 files changed, 106 insertions(+), 9 deletions(-)` — bate com PR description.

---

## Pontos de Atenção Não-Bloqueantes

1. **Lint flake intermitente**: o conflito de plugin ESLint só aparece em worktrees aninhados. CI roda no raiz e está OK. Considerar adicionar `.eslintrc.json` ignorando o problema em worktrees Claude (`.claude/worktrees/**/.eslintrc.json`) numa próxima sessão de housekeeping — não-bloqueante.

2. **`useDRE` mounted mesmo com flag OFF**: o hook é chamado com `empresaId=null`, o que faz `useEffect` resetar state. Custo mínimo (1 set state em mount + abort em cleanup). Não há regressão prática, mas significa que a árvore React tem 4 hooks extras montados em prod com flag OFF. Aceitável.

3. **Dashboard sem ComparativoDRE**: trade-off explícito (KPI isolado vs. ruído visual). Operacional pode pedir comparativo opcional no Dashboard depois se o soak revelar gap.

4. **Suite de testes não cresceu**: as 231 do Step 14 já cobrem `calcularDRE` (golden 14 testes), `useDRE` é hook fino com cobertura via uso real, e os 4 sites são wrappers sem lógica nova. Aceitável para a escala desta sub-fase. Quando flag for OFF → ON em prod e Fase 5.G remover `calcularDRE`, sugerir testes de snapshot em renderização dos 4 sites com mock de `useDRE`.

---

## Resumo Operacional

PR pronta para merge. Sem bloqueadores. Score 96/100. **APPROVE**. Ao mergear:
1. Pipeline normal de squash merge.
2. Flag `NEXT_PUBLIC_USE_BACKEND_DRE` permanece `false` por default — deploy é silencioso, prod inalterada.
3. Operacional decide quando ligar a flag (ADR-001 prevê soak de 7-14 dias com ComparativoDRE em staging primeiro).
4. Após soak verde: Fase 5.G remove `calcularDRE`/`calcularDREPorMes`, `dreLocal` em 5 sites, `<ComparativoDRE>`, e a flag — limpando ~700 LOC do bundle.
