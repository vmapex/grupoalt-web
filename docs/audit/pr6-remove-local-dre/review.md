# Audit — PR-6 (Fase 5.G): remove cálculo DRE local (backend = fonte única)

- **PR**: vmapex/grupoalt-web — branch `chore/pr6-remove-local-dre` — commit `f592df6`
- **Tipo**: REFACTOR DESTRUTIVO (−894 LOC líquidas; +89 −983 em 14 arquivos)
- **Data**: 2026-06-29
- **Auditor**: Claude (Opus 4.8) — workflow adversarial (5 revisores por dimensão → verificação adversarial dos MED+ → síntese sênior; 11 agentes). Mesma esteira dos audits anteriores.
- **Contexto**: pós-soak do DRE backend (D=2026-06-18 → D+11=2026-06-29). O `/dre` foi validado como **fonte de verdade** (bate com o banco); o cálculo local subcontava ~0,2% em CV na GRUPO ALT (artefato do `ComparativoDRE` dev-only, não bug de backend). PR-6 remove o motor DRE local e a flag de fallback, fechando a Fase 5 (ADR-001).

---

## 1. Score final

**Score: 97/100 — APPROVE.** Nenhum CRITICAL/HIGH/MED confirmado. Os achados "HIGH" dos sub-revisores referem-se **todos** ao mesmo item — `buildDREMatrix` permanecer local — reclassificado pela verificação adversarial como **OBS/intencional** (pendência documentada no ADR-001, não-regressão, sem endpoint backend).

## 2. Recomendação

**APPROVE.** Refactor destrutivo **limpo e completo**: grep zero-órfãos, 5 call sites null-safe, `caixaBuilder.ts`/`useCategoriasMap`/`fixtures/` intocados, exports load-bearing preservados, typecheck exit 0, 335 testes verdes, ADR-001 + oracle README atualizados.

## 3. Matriz de checklist (7 critérios)

| # | Critério | Status | Evidência |
|---|----------|--------|-----------|
| C1 | **Completude / órfãos** | OK | `grep` em `src/` dos 8 símbolos removidos (calcularDRE/calcularDREPorMes/calcularNeutros/useBackendDRE/useDREComparativo/ComparativoDRE/featureFlags/DREComparativoLocal) → **0 matches** (reproduzido). Diff = exatamente 14 arquivos. |
| C2 | **Null-safety / resiliência** | OK | 5 call sites inspecionados linha-a-linha. Dashboard/Caixa BI/Portal: `useMemo → if(!dreBackend) return null` + ternários `dreData ? ... : ...`. DRE mês-a-mês: `?? null` + guard. AnaliseIA: `EMPTY_DRE` (14 campos completos) → acessos diretos a `dre.X` nunca crasham no loading. Migração de `neutros` → `dreBackend?.neutros ?? []` sem órfão. |
| C3 | **Escopo / load-bearing** | OK | `planoContas.ts` mantém CATEGORIAS, ESTRUTURA_DRE, getGrupoDRE, getCategoriaInfo, buildCategoriasFromAPI. `caixaBuilder.ts` **untouched** (só removeu o import não usado). `buildDREMatrix` intacta. `useCategoriasMap`/admin/ChartGrid/DRESidebar/`useDRE` não tocados. |
| C4 | **Oracle fixtures intactas** | OK | `git diff tests/oracle/fixtures/` → **vazio**. Só `README.md` + harness TS (`oracle.test.ts`/`loader.ts`/`types.ts`) tocados. README documenta o novo papel: fixtures = fonte de verdade sincronizada p/ o oracle do backend (`sync_oracle_fixtures.py`, CI `--dry-run`). **Não quebra o CI do backend.** |
| C5 | **Paridade de comportamento (backend-only == prod)** | OK | `NEXT_PUBLIC_USE_BACKEND_DRE=true` já ativa em prod (Janela A) → remover o fallback = remover dead code, **zero mudança p/ usuário de produção**. ADR-001 §143-167 documenta. |
| C6 | **Testes** | OK | `npm test` → **335 passed / 24 files**. `planoContas.test.ts` manteve testes dos helpers; só blocos das 3 funções removidos. `caixaBuilder.test.ts`/`useDRE.test.ts` intactos. |
| C7 | **Validação automatizada** | OK | typecheck exit 0; build 44 rotas; audit:bundle 0 credenciais (85 JS); lint warnings-only. |

**Resultado:** 7 OK. Nenhum critério reprovado.

## 4. Achados (todos OBS/LOW — nenhum bloqueante)

| ID | Sev | Achado | Status |
|---|---|---|---|
| — | CRITICAL/HIGH/MED | nenhum confirmado | — |
| O1 | OBS | `buildDREMatrix` (DRE mês-a-mês N2/N3) permanece local — micro-divergência ~0,2% entre tabela (local) e card consolidado (backend). | Intencional, documentado (ADR-001 §164-166 + inline `dre-mensal/page.tsx`). Pré-existente, não-regressão. Sem endpoint backend p/ esse breakdown. |
| O2 | OBS | Loading/erro do `/dre` → telas mostram zeros (graceful), não crash/white-screen. | Verificado nos 5 sites + `EMPTY_DRE`. Comportamento aceito. |
| L1 | LOW | Dev/preview agora exigem backend acessível (sem fallback local). | Trade-off intencional da Opção B (ADR-001 §128-132). |
| L2 | LOW | `useDRE` expõe `error`, mas os consumidores só lêem `data` → falha de `/dre` aparece como "loading" silencioso (zeros sem causa visível). | **Follow-up pós-merge:** banner/toast de erro + log Sentry no DRE 5xx. Não bloqueia. |
| L3 | OBS | Sem teste de render da AnaliseIA com `dreBackend=null` (caminho `EMPTY_DRE`). | **Follow-up:** teste de loading. Implementação já correta. |

## 5. Validação reproduzida

```
npm run typecheck   → exit 0 (0 erros)
npm test            → 335 passed / 24 files
npm run build       → 44 rotas, Compiled successfully
npm run audit:bundle→ 0 credenciais (85 JS)
npm run lint        → warnings-only (react-hooks/exhaustive-deps, no-img-element)
grep (src/) dos 8 símbolos removidos → 0 matches
git diff tests/oracle/fixtures/ + caixaBuilder.ts (lógica) → vazio/intacto
```

## 6. Pós-merge (operacional) — **NÃO mergear nesta sessão (janela do usuário)**

1. Mergear em janela própria (fora de horário) → deploy Vercel.
2. **Remover do Vercel (env Production)** as vars `NEXT_PUBLIC_USE_BACKEND_DRE` e `NEXT_PUBLIC_DRE_COMPARATIVO` (não são mais lidas; limpeza).
3. Smoke: Caixa BI, DRE Mês-a-Mês, Portal Caixa, Dashboard e Análise IA com empresa real → DRE renderiza (backend), sem tela branca, AnaliseIA não crasha no loading.
4. Backlog: L2 (toast de erro do `useDRE`), L3 (teste de loading da AnaliseIA), e endpoint backend p/ DRE mês-a-mês N2/N3 (remove o `buildDREMatrix` local — O1).
