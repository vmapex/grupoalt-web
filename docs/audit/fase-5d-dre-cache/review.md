# Audit Review — Fase 5.D: Cache Redis no endpoint /dre

**PR**: https://github.com/vmapex/grupoalt-api/pull/92
**Branch**: `feat/fase-5d-dre-cache`
**Commit auditado**: `4be960f92f78c271bd869c3152940f55f6ca6994`
**Auditor**: audit-agent independente (worktree isolado)
**Data**: 2026-05-19
**Tempo gasto**: ~18 min

---

## TL;DR

PR pequeno, cirúrgico e bem testado. Adiciona cache Redis read-aside ao endpoint
`GET /v1/empresas/{id}/dre` (Fase 5.C) com sufixo determinístico (SHA-1 truncado
sobre `dt_inicio | dt_fim | projetos_ordenados`), invalidação propagada para os
5 sites pré-existentes que mutam `lancamentos_cc` ou `categorias_omie`, e
graceful degradation total se Redis cair. 13 testes Vitest-equivalentes pytest
novos, 278/278 verde, ruff clean, sem regressão em `test_dre_endpoint.py`.

Nenhum bloqueador encontrado. Recomendação: **APROVAR & MERGE**.

## Score: **96 / 100**

| Eixo                    | Peso | Nota  | Justificativa                                                                    |
|-------------------------|------|-------|----------------------------------------------------------------------------------|
| Correção funcional      | 30   | 30/30 | Read-aside correto, sufixo ordem-independente, cross-tenant via `_key()`.        |
| Segurança / isolamento  | 20   | 20/20 | `empresa_id` na chave Redis, sufixo não vaza por tenant; test explícito.         |
| Testes                  | 20   | 19/20 | 13 testes cobrindo build_suffix/hit/miss/isolation/graceful + sanity constantes. |
| Invalidação             | 15   | 15/15 | 5 sites cobertos com comentário "Fase 5.D" inline; decisão CP/CR defensável.     |
| Graceful degradation    |  5   |  5/5  | `try/except` em `cache_get` e `cache_set` com `logger.warning`.                  |
| Documentação            |  5   |  5/5  | Docstring do endpoint + módulo + helpers + comentários no commit detalhados.     |
| Aderência ao padrão     |  5   |  4/5  | Pequena divergência em relação ao `dashboard_v3` (vide Pontos de Atenção).       |

**Total: 96/100** → **APROVAR**.

---

## Matriz de Bloqueadores (qualquer = REJECT)

| # | Item                                                                                       | Status |
|---|--------------------------------------------------------------------------------------------|--------|
| 1 | Constantes `DRE_CACHE_NAMESPACE = "dre"` / `DRE_CACHE_TTL_SECONDS = 1800` exportadas        | OK     |
| 2 | `_build_cache_suffix` determinístico                                                       | OK     |
| 3 | `_build_cache_suffix` ordem-independente em `projeto_omie_ids` (via `sorted()`)            | OK     |
| 4 | `_build_cache_suffix` trata lista vazia == None (mesmo bucket)                              | OK     |
| 5 | Endpoint chama `cache_get` ANTES de tocar o DB                                              | OK     |
| 6 | `cache_set` após cálculo com `response.model_dump(mode="json")` (serializa `date`)         | OK     |
| 7 | `cache_get`/`cache_set` em `try/except` — falha não quebra endpoint                         | OK     |
| 8 | Cross-tenant: `empresa_id` faz parte da chave Redis via `_key()`                            | OK     |
| 9 | Invalidação em `app/services/sync_pipeline.py:83` — namespace "dre" presente                | OK     |
|10 | Invalidação em `app/services/sync_service.py:798` — namespace "dre" presente                | OK     |
|11 | Invalidação em `app/routers/webhook.py:87` (bloco extrato/lancamento/conciliad)             | OK     |
|12 | Invalidação em `app/routers/extrato.py:472, 515, 578` (sync/override/bulk-override)         | OK     |
|13 | CP/CR webhook NÃO invalida "dre" (escopo correto — endpoint só lê `LancamentoCC`)           | OK     |
|14 | `tests/test_dre_cache.py` com 13 testes em 5 classes                                        | OK     |
|15 | In-memory store via `unittest.mock.patch` com state persistente                             | OK     |
|16 | Test cross-tenant garante `key_a != key_b` mesmo com sufixo idêntico                        | OK     |
|17 | Test graceful confirma endpoint OK quando Redis dispara `RuntimeError`                      | OK     |

**Bloqueadores encontrados: 0**

---

## Matriz de Qualidade (warnings)

| # | Item                                                                                        | Status     |
|---|---------------------------------------------------------------------------------------------|------------|
| Q1 | Docstrings explicam estratégia (read-aside, TTL, invalidação, suffix)                       | OK         |
| Q2 | Comentários "Fase 5.D" inline em todos os 5 sites de invalidação                            | OK         |
| Q3 | TTL 30min razoável (TTL é safety net; invalidação automática é primária)                     | OK         |
| Q4 | `_build_cache_suffix` poderia migrar para `redis_client.py` se outros routers reutilizarem  | DEFERRED   |
| Q5 | Padrão de cache levemente diferente de `dashboard_v3` (que não tem try/except envolvendo)   | OK / melhor |

---

## Matriz de Risco

| Risco                                  | Severidade | Mitigação                                                                  |
|----------------------------------------|------------|----------------------------------------------------------------------------|
| Cache poisoning cross-tenant            | Alta       | Chave inclui `empresa_id` via `_key()`; teste explícito cobre.            |
| Staleness após mutação                  | Média      | 5 sites de invalidação + TTL 30min como safety net.                       |
| Invalidação faltando em algum site      | Média      | CP/CR não invalida — defensável (endpoint só lê `lancamentos_cc`).        |
| Concorrência: 2 requests no MISS        | Baixa      | Aceitável (ambos calculam e fazem `setex`; idempotente).                  |
| Performance do hash                     | Baixa      | SHA-1 de ~30 chars é O(1) e desprezível vs. query do DRE.                 |
| Serialização `date` → string            | Baixa      | `model_dump(mode="json")` garante `date.isoformat()` no Redis.            |
| Cluster sem Redis disponível           | Baixa      | Graceful degradation testada (endpoint continua respondendo).             |

---

## Pontos positivos

1. **Sufixo determinístico ordem-independente** — `sorted(projeto_omie_ids)` no
   suffix faz `?p=A&p=B` e `?p=B&p=A` cair na mesma chave. Test explícito
   (`test_ordem_projetos_compartilha_cache`).
2. **Cross-tenant isolation por construção** — comentário em `_build_cache_suffix`
   explicita que `empresa_id` é parte da chave via `_key()`, não do sufixo. Test
   `test_empresas_diferentes_chaves_diferentes` valida.
3. **Graceful degradation completa** — ambos `cache_get` e `cache_set` em
   `try/except`. Endpoint funciona com Redis offline. Test `test_cache_get_explode_endpoint_segue`
   exercita `RuntimeError`.
4. **Invalidação consistente e bem comentada** — 5 sites com comentário "Fase
   5.D: ..." inline explicando o porquê (lancamentos_cc / categorias_omie /
   override / bulk).
5. **Decisão CP/CR documentada e correta** — endpoint DRE atual lê apenas
   `LancamentoCC`, então eventos CP/CR não precisam invalidar "dre". Bem
   defendido no commit message.
6. **Constantes exportadas** — `DRE_CACHE_NAMESPACE` e `DRE_CACHE_TTL_SECONDS`
   tornam o test `test_dre_cache_constants` viável e abrem caminho para
   configuração futura (env var, settings).
7. **`model_dump(mode="json")`** — escolha correta para serializar `date` no
   Redis (vs. `model_dump()` cru que deixaria objetos `date` quebrarem o
   `json.dumps`).
8. **Padrão consistente com `dashboard_v3`** — mesma estrutura de cache
   read-aside; DRE adiciona graceful degradation que poderia ser retroportada
   para dashboard.

---

## Pontos de atenção (não-bloqueantes)

### A1. Lista vazia colide com None — documentado, OK

`test_lista_vazia_eh_diferente_de_none` na verdade testa que ambos produzem o
mesmo sufixo (nome do teste é levemente enganoso — o `assert a == b` está
correto). O comportamento é desejado (lista vazia == sem filtro), mas o nome
do test sugere o contrário do que ele afirma.

**Sugestão (não-bloqueante)**: renomear para `test_lista_vazia_compartilha_cache_com_none`.

### A2. `dashboard_v3` não tem `try/except` ao redor do `cache_get` / `cache_set`

A divergência é uma **melhoria** no DRE: se Redis estiver offline, dashboard
estoura 500, enquanto DRE responde normalmente. Vale considerar retroportar o
mesmo `try/except` para `dashboard.py` em sub-fase futura — fora do escopo
deste PR.

### A3. `_build_cache_suffix` poderia ser função reutilizável

Se Fase 5.E adicionar mais endpoints DRE (mensal/trimestral/semanal), o mesmo
suffix muito provavelmente vai ser reutilizado. Mover para `redis_client.py`
como `build_period_suffix(dt_inicio, dt_fim, projetos)` é trivial e elimina
duplicação futura. **Não-bloqueante**.

### A4. Sem teste de TTL real no Redis

`cache_set` é mockado, então o `DRE_CACHE_TTL_SECONDS=1800` nunca é exercitado
no Redis real. O sanity test cobre a constante. Aceitável — TTL real seria
teste de integração, fora de escopo aqui.

### A5. Sem invalidação seletiva por sufixo

`cache_invalidate(empresa_id, "dre")` apaga TODAS as chaves do namespace
`dre` para a empresa, mesmo as que não foram afetadas pela mutação. Para o
volume atual (DRE por período + projetos) o desperdício é desprezível;
arquitetura idêntica à dos outros namespaces. **Não-bloqueante**.

---

## Validações executadas

```
$ git log -1 --format=%H
4be960f92f78c271bd869c3152940f55f6ca6994

$ git show --stat HEAD
 6 files changed, 409 insertions(+), 6 deletions(-)
 app/routers/dre.py            |  88 +++++++++++-
 app/routers/extrato.py        |   9 +-
 app/routers/webhook.py        |   2 +
 app/services/sync_pipeline.py |   5 +-
 app/services/sync_service.py  |   3 +-
 tests/test_dre_cache.py       | 308 ++++++++++++++++++++++++++++++++++++++++++

$ gh pr view 92 --repo vmapex/grupoalt-api --json statusCheckRollup,state,mergeable
state=OPEN, mergeable=MERGEABLE, CI: Backend CI / lint-and-test IN_PROGRESS (no momento do audit)

$ grep -rn '"dre"' app/services app/routers
app/routers/dre.py:68:DRE_CACHE_NAMESPACE = "dre"
app/routers/extrato.py:472, 515, 578  (3 sites: sync_categorias, override individual, bulk-override)
app/routers/webhook.py:87              (bloco lancamento/contacorrente/conciliad)
app/services/sync_pipeline.py:83
app/services/sync_service.py:798
=> 5 sites de invalidação confirmados. CP/CR webhook NÃO invalida (correto).

$ python -m ruff check app/ --select E,F,W --ignore E501,E712,E741
All checks passed!

$ python -m pytest tests/test_dre_cache.py -v
13 passed in 2.06s
  - TestBuildCacheSuffix          7/7
  - TestDRECacheHitMiss           3/3
  - TestDRECacheIsolation         1/1
  - TestDRECacheGracefulDegradation 1/1
  - test_dre_cache_constants      1/1

$ python -m pytest tests/test_dre_endpoint.py -v
13 passed in 2.08s   # sem regressão na Fase 5.C

$ python -m pytest --ignore=tests/test_integration.py -q
278 passed in 24.81s  # 265 anteriores + 13 novos
```

---

## Recomendação final

**APROVAR e merge.**

- Bloqueadores: **0**
- Warnings: 1 (nome de teste levemente enganoso — A1)
- Diferimentos: 2 (A2 retroportar try/except para dashboard, A3 extrair helper para `redis_client.py`)
- Score: **96/100**

PR cumpre o escopo da Fase 5.D, mantém o JSON público inalterado, agrega
defesa em profundidade (TTL + invalidação por evento + graceful degradation),
e prepara o terreno para Fase 5.E (agregadores) sem dívida técnica nova.
