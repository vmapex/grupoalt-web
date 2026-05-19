# Audit — Fase 5.E: DRE Granularity (PR #93)

> Audit independente (padrão "seq + 1 auditor"). Toca contrato de response do
> endpoint DRE adicionando granularidade temporal.

- **PR**: https://github.com/vmapex/grupoalt-api/pull/93
- **Branch**: `feat/fase-5e-dre-granularity`
- **Commit**: `ff265af`
- **Diff**: `app/routers/dre.py` (+170 / -7) + `tests/test_dre_granularity.py` (+456) = 619 inserções, 7 deleções
- **Pré-requisitos**: Fase 5.A/B (#90 motor puro + oracle, MERGED), 5.C (#91 endpoint base, MERGED, Score 94), 5.D (#92 cache Redis, MERGED, Score 96)
- **CI**: `lint-and-test` IN_PROGRESS no momento do audit; `mergeable=MERGEABLE`, `state=OPEN`

---

## TL;DR

PR limpo, cirúrgico e bem testado. Adiciona `?granularity=total|mensal|trimestral|semanal`
ao endpoint `GET /v1/empresas/{id}/dre` particionando lançamentos por bucket
temporal e chamando o **motor puro 5.A inalterado** por bucket — invariante
"total = soma vertical dos buckets" vale por construção, mantém oracle válido.
Compatibilidade 5.C/5.D preservada (default `total` → response 1:1 com 5.C;
`_build_cache_suffix(...)` sem 4º param == `..., "total"` → não invalida cache
existente). 25 testes novos, todos verdes; 26 testes 5.C+5.D continuam verdes;
suite full **303/303** em ~22s. Ruff `app/` limpo.

## Score: **96 / 100** — **APPROVE**

**Recomendação:** APROVAR e aguardar `lint-and-test` no CI. Sem bloqueadores,
sem follow-ups obrigatórios. Apenas 2 nits opcionais.

---

## Matriz de auditoria

### Bloqueadores (todos OK)

| # | Item | Esperado | Encontrado | Status |
|---|------|----------|------------|--------|
| B1 | `GranularityType` | `Literal["total", "mensal", "trimestral", "semanal"]` | Idêntico, definido em `dre.py:72` | OK |
| B2 | `_bucket_key` mensal | `"YYYY-MM"` 2 dígitos | `f"{d.year:04d}-{d.month:02d}"` (`dre.py:185`) | OK |
| B3 | `_bucket_key` trimestral | `"YYYY-Qn"`, fórmula `((month-1)//3)+1`, Q1=jan-mar, Q4=out-dez | `quarter = ((d.month - 1) // 3) + 1` (`dre.py:187`); testes confirmam Q1-Q4 | OK |
| B4 | `_bucket_key` semanal | `d.isocalendar()` ISO 8601, virada de ano correta | `iso_year, iso_week, _ = d.isocalendar()` (`dre.py:190`); test `test_semanal_iso_week_virada_de_ano` valida 01/01/2026 (qui) → `2026-W01` e 31/12/2025 (qua) → `2026-W01` | OK |
| B5 | `_bucket_key` rejeita `'total'` e inválido | ValueError | `raise ValueError(...)` (`dre.py:192-195`); 2 testes confirmam | OK |
| B6 | `_split_by_granularity` rejeita `'total'` | ValueError | `dre.py:209-210`, test `test_split_total_levanta` | OK |
| B7 | `data_lancamento=None` no split | Dropado silenciosamente com log | `dre.py:213-225`; log único agregado com contador (não floods); test `test_split_data_none_eh_ignorada` confirma | OK |
| B8 | Retorno ordenado cronologicamente | dict ordenado por chave | `dict(sorted(buckets.items()))` (`dre.py:228`); test `test_split_ordenacao_cronologica` confirma | OK |
| B9 | `_build_cache_suffix(..., "total")` default mantém compat 5.D | Sem 4º param == 4º param `"total"` | Default `granularity: GranularityType = "total"` (`dre.py:235`); test `test_default_total_eh_mesma_que_explicit` confirma | OK |
| B10 | Granularidades diferentes geram chaves diferentes | total/mensal/trimestral/semanal → 4 sufixos distintos | `granularity` entra em `parts` (`dre.py:260`) antes do hash; test `test_granularity_afeta_sufixo` confirma `len({a,b,c,d}) == 4` | OK |
| B11 | `DREMetaOut.granularity` default `"total"` | Pydantic Field default | `granularity: GranularityType = Field("total", ...)` (`dre.py:124`) | OK |
| B12 | `DREResponse.subtotais_por_periodo` opcional, default `None` | `list[PeriodoDREOut] \| None = None` | `dre.py:165`; test `test_default_total_compat_fase_5c` confirma `null` no JSON quando granularity=`total` | OK |
| B13 | Endpoint reusa motor puro por bucket | `calcular_dre(...)` por bucket, sem duplicar regra | `dre.py:449-451`: itera `buckets.items()` e chama `calcular_dre(periodo_lancamentos, categoria_map=categoria_map)`. Conversor `Lancamento` é idêntico ao do total | OK |
| B14 | Invariante "total = soma vertical dos buckets" | Garantido por construção | Motor é abs+soma simples (sem mul/div); somar resultados de buckets disjuntos é matematicamente equivalente a rodar uma vez. Test `test_subtotais_total_eh_soma_dos_periodos` valida nas 3 granularidades | OK |
| B15 | Compat 5.C: response 1:1 sem `?granularity=` | `subtotais_por_periodo: null`, `meta.granularity: "total"` | Test `test_default_total_compat_fase_5c` confirma `body["subtotais_por_periodo"] is None`, `body["meta"]["granularity"] == "total"` | OK |
| B16 | Compat 5.D: cache hit funciona em qualquer granularity | Chave inclui granularity, hit/miss preservados | `cache_suffix` é construído com granularity e usado em `cache_get`/`cache_set` (`dre.py:387-395`, `dre.py:474-481`). Não há regressão em `tests/test_dre_cache.py` | OK |
| B17 | Tests cobrem ≥25 cenários | TestBucketKey(9) + TestSplitByGranularity(5) + TestCacheSuffix(2) + TestEndpoint(9) = 25 | Conferido: 9+5+2+9=25 (linhas 51-457) | OK |
| B18 | Test `test_subtotais_total_eh_soma_dos_periodos` em mensal/trimestral/semanal | Loop nas 3 granularidades | `for gran in ("mensal", "trimestral", "semanal"):` (`test_dre_granularity.py:368`) | OK |
| B19 | Test `test_lancamento_data_null_nao_aparece_em_periodos` | NULL conta no total, não nos buckets | Confirma `RoB total == 1999`, bucket único `"2026-04"` com `RoB == 1000` | OK |
| B20 | Test ISO week virada de ano | 01/01/2026 → 2026-W01 | `test_semanal_iso_week_virada_de_ano`; também sanity check `d.isoweekday() == 4` | OK |
| B21 | Test `test_granularity_invalida_eh_422` | Pydantic Literal rejeita | `?granularity=anual` → 422 | OK |
| B22 | Sem regressão 5.C (13 tests) | `tests/test_dre_endpoint.py` verde | 13/13 PASSED (rodado localmente) | OK |
| B23 | Sem regressão 5.D (13 tests) | `tests/test_dre_cache.py` verde | 13/13 PASSED (rodado localmente) | OK |

**Zero bloqueadores.**

### Qualidade (warnings, não-bloqueantes)

| # | Item | Status | Observação |
|---|------|--------|------------|
| Q1 | Docstrings explicando granularity, formato e edge cases | OK | `_bucket_key` documenta formato + nota sobre ISO week na virada de ano; `_split_by_granularity` documenta NULL drop; `DREResponse` documenta quando `subtotais_por_periodo` é `null` |
| Q2 | "Lexicográfica = cronológica" documentado | OK | Aparece nos 3 lugares relevantes: `_bucket_key` docstring (linha 174), `_split_by_granularity` docstring (linha 207) e comentário inline (linha 227) |
| Q3 | `DREResponse.subtotais_por_periodo` documentado como `null` quando granularity=`total` | OK | Docstring linha 153-160; também coberto pelo commit message |
| Q4 | Forward reference `"DRESubtotaisOut"` em `PeriodoDREOut.subtotais` | OK | Pydantic v2 resolve via `from __future__ import annotations` (presente em `dre.py:35`) e/ou rebuild automático. `DRESubtotaisOut` é definido ANTES de `PeriodoDREOut` no arquivo (linhas 89 vs 133), então a string aqui é só estilística — funciona tanto como tipo direto quanto como forward ref. Tests integration confirmam serialização correta |
| Q5 | Log para NULL drop é agregado (não floods) | OK | Contador `skipped_null_date` + 1 único log por chamada (`dre.py:221-225`) |
| Q6 | Ruff app/ limpo | OK | `python -m ruff check app/ --select E,F,W --ignore E501,E712,E741` → "All checks passed!" |

### Risco

| Item | Avaliação |
|------|-----------|
| **Performance** | Empresa com 10k lançamentos + granularity=semanal → ~50 buckets × `calcular_dre` cada. Motor é O(n) por bucket; lançamentos são disjuntos por bucket, então total é O(n) global + overhead constante por bucket. Construir `Lancamento` dataclass é refeito por bucket (duplicação trivial vs. agregar uma vez). **Aceitável.** Se virar gargalo em produção, micro-opt: converter `Lancamento` uma vez e agrupar pelos próprios dataclasses |
| **Cache** | Granularity adiciona dimensão (4× espaço de chaves potencial). TTL 30min limita acumulação. **Aceitável** — granularity total continua sendo a maioria das chamadas |
| **Quebra de cliente** | Não. `subtotais_por_periodo` é opcional (`\| None = None`); `meta.granularity` é campo novo opcional com default. Clientes que ignoram não quebram |
| **Mudança visível ao usuário** | Não — front migra em 5.F com feature flag `NEXT_PUBLIC_USE_BACKEND_DRE` |
| **Oracle 5.A continua válido** | Sim. O motor `calcular_dre` é inalterado; granularity é só "particiona o input em N pedaços disjuntos e chama N vezes" — matematicamente idêntico à chamada única para a soma vertical |
| **NULL handling** | NULL conta no `subtotais` total mas é dropado dos buckets. Documentado em 3 lugares (docstring helper, docstring endpoint, commit message) e testado explicitamente. Comportamento conservador correto (não há período para colocar) |
| **ISO week virada de ano** | 01/01/2026 (quinta) → semana ISO pertence a 2026 (correto por ISO 8601). 31/12/2025 (quarta) → mesma semana ISO → também `2026-W01`. Comentário no código alerta sobre o caso oposto (01/01 numa segunda/terça pode aparecer como `2025-W53`) |

---

## Pontos positivos

1. **Reuso máximo do motor puro 5.A.** Não há lógica de DRE duplicada — granularity é puramente um shim de particionamento na fronteira do endpoint. Oracle vale por construção e o test `test_subtotais_total_eh_soma_dos_periodos` exercita a invariante em prod (HTTP layer) nas 3 granularidades.
2. **Compatibilidade explícita 5.C + 5.D.** Default `total` mantém response 1:1; default no `_build_cache_suffix` preserva chaves existentes. Test `test_default_total_eh_mesma_que_explicit` codifica essa propriedade.
3. **Decisão "lexicográfica = cronológica" intencional e documentada.** Permite `sorted()` em vez de parsing/casting. `YYYY-MM`, `YYYY-Qn` e `YYYY-Www` todos obedecem (zero-padding nos meses/semanas, dígito 0-9 para Q1-Q4).
4. **ISO 8601 para semanas.** Não inventou semana custom. Documentação explícita sobre virada de ano (caso comum de bug).
5. **NULL drop logado, não silencioso.** Vigilância permite detectar dados sujos em produção sem quebrar a request.
6. **Empresa vazia com granularity≠`total` retorna `[]`, não `null`.** Teste explícito (`test_empresa_vazia_subtotais_por_periodo_eh_lista_vazia`). Discriminação semântica: `null` = "não pediu granularity"; `[]` = "pediu mas não tem dados".
7. **Pydantic `Literal` valida no schema.** Test `test_granularity_invalida_eh_422` confirma 422 sem tocar handler.
8. **Tests bem categorizados** em 4 classes (unit puro de helpers + integração endpoint). Fixture `seed_dre_multi_periodo` é compartilhada e cobre múltiplos meses/trimestres/semanas.
9. **Hash 16 chars + sort de projetos preservados.** Cache de 5.D não regredido; nova dimensão é adicionada sem mudar a base.

## Pontos de atenção (não-bloqueantes)

1. **Nit (Q4) — Forward reference desnecessária.** Em `PeriodoDREOut.subtotais: "DRESubtotaisOut"` (linha 146), `DRESubtotaisOut` já está definido linhas acima (89) e `from __future__ import annotations` está ativo, então o tipo poderia ser sem aspas. Funciona dos dois jeitos com Pydantic v2; é só estilística. **Não exige fix.**
2. **Nit (perf) — Conversão `Lancamento` duplicada.** O endpoint constrói `Lancamento` uma vez para o `dre` total (linha 417-426) e novamente por bucket (linha 440-448). Em uma empresa com 10k lançamentos a custo é desprezível (~50ms extra), mas refatorável para construir uma vez e particionar os dataclasses já convertidos. **Pode ficar para uma micro-otimização futura se aparecer no profiler.**

Nenhum dos dois itens justifica novo commit; podem ser absorvidos em 5.F/5.G se conveniente.

---

## Validações executadas

| Comando | Resultado |
|---------|-----------|
| `gh pr view 93 --json statusCheckRollup,state,mergeable` | `mergeable=MERGEABLE`, `state=OPEN`, CI `lint-and-test` IN_PROGRESS |
| `python -m pytest tests/test_dre_granularity.py -v` | **25/25 PASSED** (2.10s) |
| `python -m pytest tests/test_dre_endpoint.py tests/test_dre_cache.py -v` | **26/26 PASSED** (2.03s) — zero regressão 5.C/5.D |
| `python -m pytest --ignore=tests/test_integration.py -q` | **303/303 PASSED** (22.32s) — confere com mensagem do commit (278 → 303, +25) |
| `python -m ruff check app/ --select E,F,W --ignore E501,E712,E741` | "All checks passed!" |
| Sanity ISO week | `date(2026, 4, 15).isocalendar() == (2026, 16, 3)` — confirmado |
| Sanity bucket_key direto | `_bucket_key` retorna `2026-04` / `2026-Q2` / `2026-W16` para 15/04/2026 (verificado via tests integration) |

---

## Tempo

Audit total: **~22 min** (alvo 25min).

- Leitura do diff + tests: 8 min
- Execução das validações: 7 min
- Cross-check da matriz B1-B23 + Q1-Q6: 4 min
- Redação do review: 3 min

---

## Decisão final

**APPROVE — Score 96/100.** Pode mergear quando o `lint-and-test` do CI fechar verde. Nenhum follow-up obrigatório. Os 2 nits são opcionais e podem entrar em 5.F.

Após o merge, a Fase 5.E completa a entrega backend do ADR-001:
- 5.A/B: motor puro + oracle (#90 MERGED)
- 5.C: endpoint base (#91 MERGED, 94)
- 5.D: cache Redis + invalidação (#92 MERGED, 96)
- **5.E: granularity (#93, 96)** — este audit

Próximas sub-fases (front): 5.F `useDRE` + flag `NEXT_PUBLIC_USE_BACKEND_DRE`; 5.G cleanup do `calcularDRE` antigo após soak.
