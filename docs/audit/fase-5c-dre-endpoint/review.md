# Review — Fase 5.C: endpoint GET /v1/empresas/{id}/dre

- PR: #91 (https://github.com/vmapex/grupoalt-api/pull/91)
- Branch: feat/fase-5c-dre-endpoint (commit 6223c42)
- Data: 2026-05-19
- Auditor: audit-agent Fase 5.C (independente, padrao seq + 1)
- Repo: vmapex/grupoalt-api

## TL;DR (<=10 linhas)

PR entrega o primeiro endpoint backend do DRE (ADR-001) consumindo o motor puro
ja homologado em 5.A/5.B (oracle). Codigo limpo, bem documentado, com 13 testes
novos cobrindo helper, RBAC (401), happy path com bate-com-oracle exato em S06
(RoB 150k, RES_LIQ 33500), NEUTRO via override, multi-projeto e edge cases.
RBAC delegado para `get_empresa_ctx` (404 invisivel + 403 cross-tenant), filtros
SQL nao vazam entre tenants, NEUTRO preservado no map, codigo desconhecido
silenciosamente ignorado (paridade com `buildCategoriasFromAPI` do front).
Endpoint registrado em `main.py` no slot correto (apos conciliacao, antes do
webhook), mounting `/v1` correto via `include()`. 265/265 testes verde, ruff
clean, CI green (1/1). Nao consumido pelo front ainda (vira em 5.F).

## Recomendacao: APPROVE

## Score: 94/100

## Matriz objetiva — bloqueadores

| # | Item | Status | Evidencia |
|---|------|--------|-----------|
| 1 | Endpoint declarado em `/empresas/{empresa_id}/dre` com `response_model=DREResponse` | OK | `app/routers/dre.py:171` |
| 2 | `Depends(get_empresa_ctx)` garante RBAC (admin OR vinculo, 404 invisivel, 403 cross-tenant) | OK | `app/routers/dre.py:172` + `app/core/deps.py:69-95` |
| 3 | DTOs Pydantic coerentes com `DRESubtotais` (14 campos float exatos) | OK | `DRESubtotaisOut` espelha `DRESubtotais.as_dict()` 1:1 |
| 4 | `meta.projeto_omie_ids` vira `None` quando vazio (nao `[]`) | OK | `projeto_omie_ids or None` (linha 242) |
| 5 | `float(r.valor or 0)` seguro para motor puro | OK | Motor faz so `abs(float(v))` + soma; sem mul/div. Comentario inline explicita o invariante (linha 217-218). |
| 6 | `data_lancamento.isoformat()` benigno (motor nao usa) | OK | `Lancamento.data_lancamento` eh metadata; `calcular_dre` so consome `valor` + `categoria`. Conversao defensiva. |
| 7 | `_carregar_categoria_map` filtra por `empresa_id` (sem vazamento) | OK | `where(CategoriaOmie.empresa_id == empresa_id)` (linha 121); test `test_isolamento_por_empresa` confirma |
| 8 | `grupo_dre_override or get_grupo_dre(codigo)` na ordem certa (override prioritario) | OK | Linha 132; test `test_override_sobrescreve_inferencia` confirma |
| 9 | Override `NEUTRO` preservado no map (nao filtrado pelo `if not grupo`) | OK | "NEUTRO" eh truthy; passa o gate. Test `test_neutro_aparece_em_neutros_e_nao_em_subtotais` confirma comportamento end-to-end. |
| 10 | Codigos com grupo nulo (sem override e sem prefix) silenciosamente ignorados | OK | `if not grupo: continue` (linha 134); test `test_codigo_completamente_desconhecido_eh_ignorado` |
| 11 | `op` derivado corretamente (`+` para RoB/RNOP, `-` demais) | OK | `op = "+" if grupo in ("RoB", "RNOP") else "-"` (linha 137); test do prefixo CV confirma `op="-"` |
| 12 | `CategoriaInfo` recebe `nivel1`/`nivel2` non-None (com fallback `""`) | OK | `cat.nivel2 or ""` (linha 141-142); modelo permite None mas dataclass nao |
| 13 | Filtro `dt_inicio is not None` (nao falsy) | OK | Linha 204 |
| 14 | Filtro `dt_fim is not None` aplicado como `<=` (inclusive) | OK | Linha 207 |
| 15 | `if projeto_omie_ids:` evita `IN ()` SQL com lista vazia | OK | Linha 208; o teste indireto `test_dre_filtro_projeto_isolado` cobre lista nao-vazia |
| 16 | Tests cobrem cenarios criticos (13 testes) | OK | 5 helper + 1 auth + 4 happy + 1 neutro + 2 edge = 13 |
| 17 | `TestCarregarCategoriaMap` recebe `test_app` para criar tabelas | OK | Todas as 5 funcoes da classe declaram `test_app` como dep (linhas 110, 126, 143, 162, 180 dos testes) |
| 18 | Test bate-com-oracle S06 EXATO (RoB 150k, RES_LIQ 33500) | OK | `test_dre_filtro_periodo_abril_bate_com_oracle_S06_exato` valida 14 subtotais |
| 19 | Test `test_isolamento_por_empresa` valida cross-tenant em helper | OK | Cria "Outra" empresa + categoria, valida que nao vaza |
| 20 | Router DRE registrado via `include(dre_router, "DRE")` em `main.py` | OK | Linhas 476-481 do `main.py` |
| 21 | Posicionamento do router: depois de conciliacao, antes de webhook | OK | Linhas 472-481 |
| 22 | Import dentro de try/except (padrao do projeto) | OK | Linhas 476-481 segue `try: ... except Exception: logger.error(...)` igual aos outros routers |
| 23 | Endpoint efetivamente registrado em `/v1/empresas/{id}/dre` | OK | Sanity check: `[r.path for r in app.routes if 'dre' in r.path]` -> `['/v1/empresas/{empresa_id}/dre']` |

**Conclusao bloqueadores: 23/23 OK. Sem bloqueadores.**

## Matriz objetiva — qualidade

| # | Item | Status | Observacao |
|---|------|--------|------------|
| Q1 | Docstrings claros (modulo + funcao + helper) | OK | Docstring do modulo explica contrato e ADR-001; `_carregar_categoria_map` explica prioridade override > prefix + caso NEUTRO; `get_dre` explica ordem de filtros e semantica de NULL |
| Q2 | Comentarios inline em pontos nao-obvios | OK | Linhas 134 (ignorar codigo desconhecido), 218 (Decimal->float safe), 95 (NEUTRO precisa entrar no map) |
| Q3 | Pydantic `Field` com description em pelo menos um campo | OK | `total_lancamentos` (linha 87) tem description; `dt_inicio`/`dt_fim`/`projeto_omie_ids` na query tambem |
| Q4 | Naming consistente (`get_dre`, `_carregar_categoria_map`) | OK | Snake_case, prefix `_` para helper privado |
| Q5 | Estilo do router (prefix no construtor ou inline) consistente com algum existente | OK | Estilo "tags only + path completo no decorator" segue `app/routers/extrato.py`; co-existe com `prefix="/empresas"` (dashboard/conciliacao) |
| Q6 | 401 testado, 403 cross-tenant HTTP NAO testado | PARCIAL | Cross-tenant testado no helper (`test_isolamento_por_empresa`), nao no endpoint via HTTP. `get_empresa_ctx` ja tem cobertura propria em outros routers; risco baixo. Anotado como followup. |
| Q7 | Edge case: `?projeto_omie_ids=` (empty string) viraria `[""]`, gera `IN ('')` | NIT | Improvavel em uso real; `IN ('')` retorna 0 rows (nao quebra). Sem impacto pratico, anotado. |
| Q8 | Migrar response_model_exclude_none ou semelhante para reduzir payload | NIT | Resposta tem 14 floats fixos; meta tem 5 campos. Payload pequeno, sem necessidade. |
| Q9 | Tests sem `_h(token)` -> `headers=` repetitivo | NIT | Padrao consistente com outros routers; aceitavel |

## Matriz objetiva — risco

| # | Risco | Avaliacao |
|---|-------|-----------|
| R1 | Mudanca visivel ao cliente | NAO. Endpoint novo, sem consumidor (front migra em 5.F). |
| R2 | Performance: query usa indice composto? | OK. `(empresa_id, data_lancamento)` cobre filtro `WHERE empresa_id = ? AND data_lancamento BETWEEN ? AND ?` via `ix_lancamento_empresa_data` (Fase 3C). `projeto_omie_id` tem indice proprio `ix_lancamento_empresa_projeto`; planner usa o melhor. |
| R3 | Vaza dado cross-tenant | NAO. Defesa em profundidade: (a) `get_empresa_ctx` valida vinculo antes do handler executar; (b) `_carregar_categoria_map` filtra por `empresa_id`; (c) query de `LancamentoCC` filtra por `empresa_id = empresa.id`. Tres barreiras. |
| R4 | Memory: query sem `.limit()` | ACEITAVEL MVP. Para empresa com 100k+ lancamentos, response pode ser pesado (mas o motor faz so soma agregada, nao paginacao). Mitigacao prevista em 5.D (cache Redis). Para o MVP, o filtro de periodo serve como bound natural. |
| R5 | Decimal -> float em valores grandes (>15 digitos significativos) | ACEITAVEL. Valor `Numeric(15,2)` cobre ate 9.999.999.999.999,99 — abaixo do limite de precisao do `float64` (52 bits mantissa, ~15-16 digitos). Comentario inline tras esse invariante. |
| R6 | Lancamento com `categoria=NULL` quebra motor? | OK. `_resolver_grupo(None, ...)` retorna None; motor pula. Documentado. |
| R7 | Override NEUTRO em codigo sem prefix conhecido (ex. "9.99.99" + override NEUTRO) entra no map? | OK. `cat.grupo_dre_override or get_grupo_dre()` => NEUTRO eh truthy, passa o gate; codigo entra no map e o motor filtra como NEUTRO. Comentario do helper na linha 95-97 documenta o caso. (Nao testado explicitamente, mas comportamento seguro por inspecao.) |
| R8 | Pydantic `list[str] | None` rejeita query com `?projeto_omie_ids=A&projeto_omie_ids=B`? | OK. `Query(None, ...)` aceita multi-value; test `test_multi_projeto_acumula` confirma. |

## Pontos positivos

1. **Bate exato com o oracle.** O test `test_dre_filtro_periodo_abril_bate_com_oracle_S06_exato`
   planta no SQLite os mesmos 19 lancamentos da fixture S06 do oracle e valida
   os 14 subtotais com `==`. Isso garante que toda a cadeia (query SQL ->
   motor puro -> serializacao) chega no mesmo numero do contrato homologado.
2. **Defesa em profundidade no RBAC.** `get_empresa_ctx` ja faz o filtro de
   acesso (admin OR vinculo); o helper `_carregar_categoria_map` AINDA filtra
   por `empresa_id` no SQL. Sem chance de vazamento mesmo se o endpoint for
   chamado direto (ex. tests sem `get_empresa_ctx`).
3. **Override > inferencia > nada.** A ordem `grupo_dre_override or
   get_grupo_dre(cat.codigo)` reproduz fielmente o front
   (`buildCategoriasFromAPI` do `planoContas.ts`).
4. **Tests cobrem todos os caminhos do helper.** Map vazio, fallback prefix,
   override sobrescreve, codigo desconhecido ignorado, isolamento cross-empresa.
5. **NEUTRO preservado corretamente.** O caso "categoria seria CF mas tem
   override NEUTRO" funciona: vai pra `neutros[]` e some do CF.
6. **Documentacao do contrato no docstring do modulo.** Quem ler o arquivo
   primeiro entende o JSON antes do codigo.
7. **Sub-fases futuras documentadas inline** (5.D cache, 5.E granularity,
   5.F front, 5.G cleanup) — facilita planejamento.
8. **Codigo idiomatico:** `from __future__ import annotations`, `select()` 2.0
   style, sessao async, type hints em todos lugares.

## Pontos de atencao (com fix concreto)

### 1. [LOW] Faltou test de 403 cross-tenant via HTTP

`_carregar_categoria_map` tem isolamento testado, mas o endpoint nao tem
um teste cobrindo "user com vinculo so em empresa A acessando
empresa B". O `get_empresa_ctx` ja garante isso, mas adicionar um teste
fecha o ciclo.

**Fix concreto:**
```python
class TestDREEndpointAuth:
    @pytest.mark.asyncio
    async def test_403_cross_tenant(
        self,
        client: AsyncClient,
        seed_empresa: Empresa,
        db_session: AsyncSession,
    ):
        # cria user nao-admin sem vinculo com seed_empresa
        user = Usuario(
            nome="User B", email="userb@test.com",
            senha_hash=hash_password("x"), ativo=True, is_admin=False,
        )
        db_session.add(user)
        await db_session.flush()
        token = create_access_token(user.id)
        resp = await client.get(
            f"/v1/empresas/{seed_empresa.id}/dre",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 403
```

Bom pra Fase 5.D ou em fix posterior — nao bloqueia o merge porque
`get_empresa_ctx` ja tem cobertura compartilhada com 10+ routers.

### 2. [NIT] `?projeto_omie_ids=` vira `[""]`

Se um cliente passa `?projeto_omie_ids=` (sem valor), o Pydantic converte
para `[""]` (lista com string vazia). O check `if projeto_omie_ids:` eh
truthy (`[""]` nao eh vazio), entao aplica `WHERE projeto_omie_id IN ('')`
— retorna 0 rows, nao quebra. Improvavel em uso real (front nao vai mandar
isso), mas vale uma sanitizacao:

**Fix concreto (opcional):**
```python
# Filtra valores vazios da lista
projeto_omie_ids = [p for p in (projeto_omie_ids or []) if p]
if projeto_omie_ids:
    stmt = stmt.where(LancamentoCC.projeto_omie_id.in_(projeto_omie_ids))
```

Ou: deixar como esta. Comportamento atual eh defensivo (lista vazia
== filtra tudo). Anotado pra discussao em followup.

### 3. [NIT] Sanity test do `data_lancamento` NULL

O codigo trata `r.data_lancamento.isoformat() if r.data_lancamento else None`,
mas nenhum teste especifico valida isso. O comportamento esta correto
(NULL fica fora do filtro de range), mas seria bom ter um teste que insere
um lancamento com `data_lancamento=None` e (a) sem filtros, valida que entra;
(b) com filtro de periodo, valida que sai.

**Fix concreto:** adicionar teste em `TestDREEndpointEdgeCases`.

## Validacoes executadas

```
[OK] git show 6223c42 --stat
     -> +741 linhas (app/main.py +7, app/routers/dre.py +245, tests/test_dre_endpoint.py +489)

[OK] gh pr view 91 --repo vmapex/grupoalt-api
     -> state: OPEN
     -> mergeable: MERGEABLE
     -> CI: 1/1 SUCCESS (Backend CI lint-and-test)

[OK] python -m pytest tests/test_dre_endpoint.py -v
     -> 13/13 PASSED (2.07s)

[OK] python -m pytest --ignore=tests/test_integration.py -q
     -> 265/265 PASSED (25.74s)
     -> Confirma o salto 252 -> 265 anunciado no commit msg.

[OK] python -m pytest -q  (full suite incluindo integration)
     -> 280 passed, 3 failed
     -> Os 3 fails sao pre-existentes (test_integration.py::TestExportPDF —
        modulo xhtml2pdf ausente no env local). Nao tocados por esta PR.

[OK] python -m ruff check app/ --select E,F,W --ignore E501,E712,E741
     -> "All checks passed!"

[OK] Sanity routes:
     -> python -c "from app.main import app; print(...)"
     -> DRE routes: ['/v1/empresas/{empresa_id}/dre']

[OK] Sanity DTOs:
     -> DRESubtotaisOut() -> 14 floats zerados, ordem RoB..RES_LIQ
     -> NeutroAgregadoOut fields: codigo, nome, total, count
     -> DREMetaOut fields: empresa_id, dt_inicio, dt_fim, projeto_omie_ids, total_lancamentos
     -> DREResponse fields: subtotais, neutros, meta
     -> Bate 1:1 com `DRESubtotais.as_dict()` do motor.

[OK] Indices verificados:
     -> ix_lancamento_empresa_data (empresa_id, data_lancamento) — Fase 3C
     -> ix_lancamento_empresa_projeto (empresa_id, projeto_omie_id) — Fase 3C
     -> ix_cat_omie_empresa_codigo (empresa_id, codigo) UNIQUE

[OK] RBAC tracing:
     -> get_empresa_ctx (app/core/deps.py:73-95):
        404 invisivel se nao-existe/inativa/deleted_at
        admin global passa direto
        nao-admin precisa de UsuarioEmpresa vinculo
        403 se sem vinculo
```

## Tempo gasto

~30 min (alvo: 25).

Distribuicao aproximada:
- 5 min: setup do worktree, descobrir que git worktree esta locked, fazer
  `git checkout 6223c42 -- .` para trazer os files.
- 8 min: leitura do diff (dre.py + main.py + test_dre_endpoint.py) e dos
  modulos referenciados (deps.py, models.py, dre.py do dominio, conftest.py,
  routers existentes pra comparacao de padrao).
- 10 min: rodar testes (DRE -> 13, full -> 265, integration full -> 280),
  ruff, sanity check de DTOs/routes.
- 7 min: redacao do review.

## Comentarios finais

PR exemplar para um endpoint novo. O motor puro ja estava validado pelo
oracle em 5.B, entao 5.C precisava apenas "plugar" — e fez exatamente isso,
sem inventar regra. Test `test_dre_filtro_periodo_abril_bate_com_oracle_S06_exato`
eh particularmente forte: prova que a integracao (SQL + motor + DTOs) chega
no mesmo numero do oracle.

Os 3 nits acima sao todos coverage gaps (nao bugs) e podem ser fechados em
followup. Recomendo APPROVE direto, com followup tracker pra (1) test 403
cross-tenant via HTTP e (2) sanitizacao de `projeto_omie_ids=""`.

Score 94/100 reflete a alta qualidade tecnica — o desconto eh apenas pelos
gaps de teste pontuados acima.
