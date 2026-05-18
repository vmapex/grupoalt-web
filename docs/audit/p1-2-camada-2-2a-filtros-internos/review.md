# Review — Camada 2.2a P1-2: filtros internos usam `data_*_date`

- **PR**: [#81](https://github.com/vmapex/grupoalt-api/pull/81)
- **Branch**: `feat/p1-2-camada-2-2a-filtros-internos` (commit `ea529ec`)
- **Data**: 2026-05-18
- **Auditor**: audit-agent Camada 2.2a (independente, padrao seq + 1)
- **Camada predecessora**: PR #80 (Camada 2.1, MERGED 2026-05-18, smoke 0 inconsistencias)
- **Camada sucessora**: 2.2b (JSON ISO + front) — fora deste PR

## TL;DR (<=10 linhas)

PR pequeno e cirurgico (+185/-115 LOC, 8 arquivos + 1 teste novo) que corrige
um bug semantico real e mensuravel — comparacao lexicografica `'31/01/2026'
< '01/02/2026'` retornava `FALSE` em vez de `TRUE` — substituindo leituras
de strings DD/MM/YYYY pelas colunas Date nativas (`data_*_date`) criadas
em paralelo na Camada 2.1. Escopo limitado a WHERE/ORDER BY/comparacoes
Python internas; **JSON response shape inalterado** (verificado endpoint
por endpoint). Bug fix observavel em `export.py` (`qtd_atrasado` no PDF de
CP/CR) era especialmente grave: contas vencendo de mar a abril/2026 eram
silenciosamente excluidas do total de atrasados em PDFs gerados em maio.
CI verde, suite local 179/179, ruff clean, helpers duplicados zerados.
Risco residual baixo: **(a)** indices da Fase 3C estao nas colunas string
antigas e nao cobrem as colunas Date — performance pode degradar em
ORDER BY/range sobre tabelas grandes; **(b)** linhas pre-2.1 inseridas
antes do backfill estao com `_date` NULL e serao excluidas de
filtros/order. Ambos enderecaveis em follow-up. Smoke pos-deploy proposto
no body do PR e suficiente.

## Recomendacao: APPROVE_WITH_FOLLOWUPS
## Score: 91/100

Score breakdown: +95 base (escopo correto, bug fix real, JSON intacto,
testes uteis, CI verde, ruff clean, sem duplicacao residual), -4 por falta
de indice acompanhando a migracao Date (follow-up #1), neutro nos demais
itens.

---

## Matriz objetiva — bloqueadores

| Item | Status | Evidencia |
|---|---|---|
| 8 consumidores migraram coluna correta | OK | Grep `data_.*_date` retorna match em `dashboard.py`, `conciliacao.py`, `extrato.py`, `cp_cr.py` (DTO mantido), `fluxo_caixa.py`, `export.py`, `alertas.py`, `orbit_chat.py`. Modelos `LancamentoCC`, `ContaPagar`, `ContaReceber`, `BaixaFinanceira` expoem as colunas (linhas 447-569 de `app/models/models.py`). |
| Filtros WHERE/order_by usam Date e aceitam NULL | OK | Filtros guardados com `if l_date and dt_start and dt_end` (`extrato.py:242`, `conciliacao.py:97`). Comparacoes diretas curto-circuitam `None` em Python (`if c.data_vencimento_date and c.data_vencimento_date < hoje_d`, padrao consistente em `export.py`, `alertas.py`, `orbit_chat.py`). |
| `.nulls_last()` em order_by quando aplicavel | OK | Aplicado em **todos** os order_by migrados: `conciliacao.py:85`, `extrato.py:214`, `export.py:80`, `export.py:141`, `export.py:213`, `orbit_chat.py:410`. |
| JSON response shape NAO alterado | OK | Endpoint-por-endpoint: dicts/DTOs continuam expondo `data_lancamento`, `data_conciliacao`, `data_vencimento`, `data_emissao`, `data_pagamento`, `data_vcto`, `data_previsao` lendo das strings originais. As colunas `_date` so aparecem em WHERE/ORDER BY e em comparacoes Python locais (variaveis `l_date`, `dt`, `_dt`). Detalhe abaixo. |
| Helpers `_parse_date` / `_parse_dmy` duplicados removidos | OK | `grep -rn "_parse_date\|_parse_dmy" app/` retorna apenas docstring em `app/core/dates.py:8` (referencia historica). Eliminado de `dashboard.py`, `conciliacao.py`, `extrato.py`, `cp_cr.py`, `alertas.py`, `orbit_chat.py`. |
| `parse_br_date` central usada onde dados vem de dict/DTO/query param | OK | `extrato.py:181` (`dt_inicio`/`dt_fim` query), `extrato.py:301` (dict transform sort), `conciliacao.py:185,296,335` (dict `l.get("data")` + path param), `cp_cr.py:91,98` (DTO `Lancamento`), `cp_cr.py:294,295,457,458` (resumos), `fluxo_caixa.py:48,144` (DTO + query). |
| Bug fix em `export.py` esta correto | OK | Antes: `hoje = ...strftime("%d/%m/%Y")` (string) + `c.data_vencimento < hoje` (string vs string, lex). Agora: `hoje_d = date.today()` + `c.data_vencimento_date < hoje_d` (date vs date). Aplicado em `qtd_atrasado` CP (linhas 153-156), CR (220-227) e nos flags `atrasado` linha-a-linha (161, 232). Curto-circuito `c.data_vencimento_date and ...` trata NULL corretamente (linha de coluna NULL nao mais flag como atrasada — semanticamente OK porque a info de vencimento ausente). |
| CI verde | OK | `gh pr checks 81` → `lint-and-test pass 1m38s` (workflow Backend CI, run `26052958366`). |
| Suite local nao regrediu | OK | `python -m pytest --ignore=tests/test_integration.py -q` no worktree do PR → **179 passed in 18.78s** (era 173 antes, +6 novos). |

**Nenhum bloqueador.**

---

## Matriz objetiva — qualidade

| Item | Status | Observacao |
|---|---|---|
| 6 testes novos cobrem cenarios relevantes | OK | `tests/test_filters_data_semantic.py` — testes puros (sem dependencia de DB) documentam o bug (cross-mes, cross-ano, intra-mes) e o fix (date sort + range BETWEEN + comparacao com hoje). Executados localmente: **6/6 PASS em 0.05s**. |
| Race condition: linhas pre-2.1 com `data_*_date` NULL | OBSERVADO | Linhas inseridas antes do backfill da Camada 2.1 ou com string Omie corrompida (que `parse_br_date` rejeita) ficam com `_date = NULL`. **Comportamento atual**: filtros `WHERE data_X_date >= ...` e `BETWEEN ...` **excluem** essas linhas; `order_by(...).nulls_last()` joga para o final. Smoke da Camada 2.1 reportou 0 inconsistencias em prod, entao a populacao deve ser ~100%. Aceitavel para Camada 2.2a, mas vale registrar como follow-up — Camada 2.3 (DROP COLUMN) precisa de NOT NULL constraint ou fail-safe. |
| `sync_service` Camada 2.1 popula AMBAS colunas em rows novas | OK | Grep em `app/services/sync_service.py` confirma 11 sitios populando `_date` paralelamente: `data_lancamento_date` (270), `data_conciliacao_date` (271), CP em `data_emissao_date`/`data_vencimento_date`/`data_previsao_date`/`data_pagamento_date` (404-407), CR idem (524-527), Baixa em `data_pagamento_date` (602). Linhas inseridas pos-2.1 tem ambas. |
| Naming consistente com migrations anteriores | OK | Sufixo `_date` consistente com `0005_data_dates_additive.py`. Comentarios "P1-2 Camada 2.2a" em todas as alteracoes. |
| Documentacao inline clara | OK | Cada mudanca tem comentario contextualizando: "P1-2 Camada 2.2a: usa coluna Date nativa (semantica de range correta)". Bug fix em `export.py` tem comentario explicito "BUG FIX -- antes `hoje` era string DD/MM/YYYY e comparado lexicograficamente". |
| Comportamento de `parse_br_date` central vs `_parse_date` antigo | OK | Ambos aceitavam DD/MM/YYYY e YYYY-MM-DD. `parse_br_date` adicionalmente faz `s.strip()` defensivo (`app/core/dates.py:44`) — mais permissivo, nao menos. Nenhuma regressao de comportamento. |
| `cp_cr.py` `_filtrar()` DTO consistency | OK | DTO `Lancamento` continua com strings (linhas 37-40), `_filtrar()` reparseia via `parse_br_date(l.data_previsao or l.data_vcto)` (linha 98). Sem mudanca semantica: o helper antigo `_parse_date` era equivalente. `_filtrar()` opera sobre lista in-memory (apos query), entao nao se beneficia diretamente do switch WHERE — mas a query upstream (resumo CP/CR, `_listar_cp`, `_listar_cr`) carrega tudo e o `_filtrar` faz cut em Python; aqui o ganho e so consolidacao do parser. |

---

## Matriz objetiva — risco

| Item | Status | Detalhe |
|---|---|---|
| Mudanca de behavior em ranges cross-mes/cross-ano: documentado/intencional | OK | Body do PR documenta explicitamente que **usuarios que dependiam do bug veem resultados diferentes — mas os corretos**. Testes 1-3 de `test_filters_data_semantic.py` capturam o cenario. Os tres consumidores mais expostos sao: (a) dashboard "proximos vencimentos" — sem regressao critica porque era 30d a partir de hoje; (b) extrato `BETWEEN dt_inicio AND dt_fim` — agora inclui rows que estavam fora silenciosamente; (c) PDF de CP/CR — `qtd_atrasado` agora bate com a percepcao do usuario. |
| JSON shape intacto endpoint por endpoint | OK | Verificacao por grep + leitura: |
| | | `dashboard.py:177` → `"data_vcto": r.data_vencimento or ""` (string original) |
| | | `conciliacao.py:102,106` → `"data": l.data_lancamento`, `"data_conciliacao": l.data_conciliacao` (strings originais) |
| | | `extrato.py:258,259` → `"data_lancamento": l.data_lancamento`, `"data_conciliacao": l.data_conciliacao` (strings originais) |
| | | `cp_cr.py:126-129, 156-159` → `data_emissao=r.data_emissao`, `data_vcto=r.data_vencimento`, `data_previsao=r.data_previsao or r.data_vencimento`, `data_pagamento=r.data_pagamento` (strings originais para o DTO `Lancamento`) |
| | | `cp_cr.py:191` → `"data": b.data_pagamento` (baixa, string) |
| | | `export.py:92,167,168,238,239` → templates do PDF leem `l.data_lancamento`, `c.data_vencimento`, `c.data_pagamento` (strings, formato BR preservado) |
| | | `fluxo_caixa.py:60-63, 80-83` → DTO `Lancamento` populado com strings originais |
| | | Conclusao: nenhuma chave/valor JSON mudou. Compativel com front atual sem deploy. |
| Rollback: revert PR limpo | OK | PR e puramente codigo (sem migration nova). `git revert ea529ec` restaura comportamento (e o bug). Camada 2.1 (PR #80) mantida — colunas Date continuam paralelas, sem impacto. |
| Edge case: `Lancamento` DTO cp_cr ainda strings | OK | `_filtrar()` reparseia via `parse_br_date`. Funcoes downstream (`fluxo_caixa._get_previsao_date`) tambem usam `parse_br_date`. Comportamento identico ao `_parse_date` antigo (ambos aceitam DD/MM/YYYY e YYYY-MM-DD). |
| Performance: order_by por `data_*_date` sem indice composto | RISCO MEDIO | Os indices da Fase 3C estao nas colunas STRING antigas: `ix_lancamento_empresa_data (empresa_id, data_lancamento)`, `ix_cp_empresa_vencimento (empresa_id, data_vencimento)`, `ix_cr_empresa_vencimento (empresa_id, data_vencimento)` — confirmado em `alembic/versions/0003_indices_compostos.py:53-60`. As novas consultas `WHERE empresa_id=X ORDER BY data_lancamento_date DESC NULLS LAST` provavelmente fazem **table scan + sort** ao inves de index scan. Em prod com tabelas grandes (LancamentoCC pode ter 10k+ rows por empresa), latencia pode subir. Endpoints potencialmente afetados: extrato (lista grande), export PDF (limit 500 mas ainda assim com ordenacao), orbit_chat (`_fetch_from_database`, limit 200). **Mitigacao**: a 2.2b ja preve recriar indices (mencionado no PR body, follow-up #4 do audit do PR #80). Aceitavel desde que monitorado em prod imediatamente pos-deploy. |
| Risco DB rollback | OK | Sem migration nova; rollback e puramente codigo. |

---

## Pontos positivos

1. **Bug fix observavel e mensuravel em prod**: `export.py qtd_atrasado` no PDF CP/CR. Antes, conta com `data_vencimento='19/03/2026'` em PDF gerado em `18/05/2026` (string '18/05/2026') nao era considerada atrasada porque lex-wise `"19/03/2026" > "18/05/2026"`. Agora corrigido. Isso afeta totais de atrasados, contagem e flag visual no PDF. Bug fix real, nao cosmetico.

2. **Escopo respeitado**: o PR limita-se a leituras internas. Nao toca DTO `Lancamento`, nao muda Pydantic models, nao altera nenhum dict de response. Front consome exatamente o mesmo JSON. Migracao incremental classica.

3. **Consolidacao do parse_br_date**: helper duplicado em 6+ lugares foi removido (`_parse_date` em dashboard/conciliacao/cp_cr; `_parse_dmy` em extrato/alertas/orbit_chat). Codigo mais limpo e single source of truth com 17 LOC documentadas em `app/core/dates.py`. Reducao liquida de 22 LOC.

4. **`.nulls_last()` aplicado consistentemente** em **todos** os order_by migrados (6 sitios). Decisao defensiva correta para uma migracao gradual: linhas com `_date = NULL` (legacy ou parse failure) nao poluem o topo da lista.

5. **6 testes documentais bem escritos**: nao testam apenas o caminho feliz — capturam o **bug** (cross-mes, cross-ano, intra-mes coincidente) e o **fix** lado a lado. Em particular `test_lex_sort_string_ddmmyyyy_eh_errado_no_cross_mes` documenta a peculiaridade lexicografica para auditoria futura.

6. **Comentarios inline padronizados** (`P1-2 Camada 2.2a: ...`) facilitam grep futuro para identificar mudancas relacionadas a migracao quando a 2.2b chegar.

7. **CI verde + ruff clean + suite full 179/179**: validacoes basicas em ordem.

---

## Pontos de atencao (com fix concreto)

### 1. (FOLLOW-UP, P1) Indices da Fase 3C nao cobrem `data_*_date`

`alembic/versions/0003_indices_compostos.py` cria:
- `ix_lancamento_empresa_data (empresa_id, data_lancamento)`
- `ix_cp_empresa_vencimento (empresa_id, data_vencimento)`
- `ix_cr_empresa_vencimento (empresa_id, data_vencimento)`

A partir deste PR, as queries usam `data_*_date`. PG provavelmente **nao
usa esses indices**. Em tabelas grandes, ORDER BY + range vai degradar.

**Fix sugerido para 2.2b** (ou PR follow-up dedicado):

```python
# nova migration alembic 0006_indices_data_date.py
op.create_index('ix_lancamento_empresa_data_date',
                'lancamentos_cc', ['empresa_id', 'data_lancamento_date'])
op.create_index('ix_cp_empresa_vencimento_date',
                'contas_pagar', ['empresa_id', 'data_vencimento_date'])
op.create_index('ix_cr_empresa_vencimento_date',
                'contas_receber', ['empresa_id', 'data_vencimento_date'])
```

Considerar `CREATE INDEX CONCURRENTLY` em prod (Alembic nao suporta nativamente — usar `op.execute("CREATE INDEX CONCURRENTLY ...")` fora de transaction com `op.execute("COMMIT")`).

**Monitorar pos-deploy**: latencia P95 de `GET /empresas/{id}/extrato`,
`GET /empresas/{id}/conciliacao/movimentacao`, exports PDF. Se >2x do
baseline, priorizar criacao dos indices.

### 2. (FOLLOW-UP, P2) Linhas com `data_*_date = NULL` sao silenciosamente excluidas de filtros

Comportamento atual em `extrato.py:242` e `conciliacao.py:97`:

```python
if l_date and dt_start and dt_end:
    if l_date < dt_start or l_date > dt_end:
        continue
```

Se `l.data_lancamento_date IS NULL` (parse failure ou row legado pre-backfill), a linha **passa** o filtro de range (porque o `if` superior falha curto-circuito) — vai aparecer na lista. Comparar com `extrato.py:233`:

```python
if cc_id and l.saldo_banco is not None and l_date and dt_start and l_date < dt_start:
    saldo_inicial_por_conta[cc_id] = l.saldo_banco
```

Aqui a linha NULL **nao** contribui pro saldo inicial. Em conjunto, comportamento e: linhas com data NULL **aparecem na lista mas nao contam saldo**. E uma assimetria sutil. Aceitavel se a populacao de NULL e zero (smoke da 2.1 dizia 0 inconsistencias), mas ideal documentar ou adicionar metrica defensiva. **Sugestao**: log warning em `_query_extrato_from_db` se algum lancamento retornar `data_lancamento_date is None`, para garantir vigilancia. Trivial em LOC, traz observabilidade.

### 3. (NICE-TO-HAVE, P3) Variavel `hoje` shadow em `export.py`

`export.py:148-149` mantem `hoje = hoje_d.strftime("%d/%m/%Y")` para o titulo do PDF. A coexistencia de `hoje` (string) e `hoje_d` (date) num escopo proximo de comparacoes corrigidas e levemente confusa. **Sugestao**: renomear a string para `hoje_str` (`hoje_str = hoje_d.strftime("%d/%m/%Y")`) para deixar a intencao obvia. Trivial, evita revisao confusa futura.

### 4. (NICE-TO-HAVE, P3) Smoke SQL no body cobre apenas LancamentoCC

O smoke pos-deploy proposto cobre `lancamentos_cc`. ContaPagar e ContaReceber tambem foram migrados (export.py, alertas.py, orbit_chat, dashboard, cp_cr). Sugestao: adicionar uma query similar para CP/CR:

```sql
-- 3. Confirmar consistencia em CP/CR
SELECT COUNT(*) FILTER (WHERE data_vencimento_date IS NULL) AS null_cp_date,
       COUNT(*) AS total_cp
FROM contas_pagar WHERE empresa_id = 1;
```

---

## Validacoes executadas

| Comando | Onde | Resultado |
|---|---|---|
| `gh pr view 81 --repo vmapex/grupoalt-api --json statusCheckRollup,state,mergeable` | local | `mergeable: MERGEABLE`, `state: OPEN`, ultima check `pass 1m38s` |
| `gh pr checks 81` | local | `lint-and-test pass` |
| `git show ea529ec --stat` | worktree audit | 9 arquivos, +185/-115 LOC, conforme PR body |
| `python -m pytest tests/test_filters_data_semantic.py -v` | worktree | **6/6 PASS** em 0.05s |
| `python -m pytest --ignore=tests/test_integration.py -q` | worktree | **179/179 PASS** em 18.78s |
| `python -m ruff check app/ --select E,F,W --ignore E501,E712,E741` | worktree | `All checks passed!` |
| `grep -rn "_parse_date\|_parse_dmy" app/` | worktree | 1 match (docstring historica em `app/core/dates.py:8`) |
| `grep -rn "data_.*_date" app/` (modelos + consumidores) | worktree | 8 arquivos: `models.py`, `sync_service.py` (write), 6 consumidores (read) |
| Verificacao endpoint por endpoint do JSON shape | leitura cirurgica | Todos os dicts/DTOs usam strings originais; colunas `_date` so em WHERE/ORDER/comparacoes Python |
| `grep ".nulls_last()"` | worktree | 6 sitios, todos os order_by migrados |
| Verificacao `app/services/sync_service.py` populando `_date` | grep | 11 sitios escrevendo `_date` paralelamente — rows novas tem ambas as colunas |
| Confirmar indices Fase 3C | `alembic/versions/0003_indices_compostos.py` | indices nas colunas STRING antigas → follow-up #1 |

---

## Tempo gasto

~22 min (dentro do target de 25 min).

- 4 min: setup, git fetch, statusCheckRollup
- 8 min: leitura completa de 9 diffs
- 5 min: verificacao endpoint por endpoint do JSON shape (a parte mais critica)
- 3 min: execucao local (pytest + ruff + greps de confirmacao)
- 2 min: escrita do review

---

## Anexo — mapa exato de mudancas por arquivo

| Arquivo | LOC | Mudanca chave | JSON afetado? |
|---|---|---|---|
| `app/routers/dashboard.py` | -10 | helper local removido; `r.data_vencimento_date` em filtro de proximos vencimentos | NAO (linha 177 ainda emite `r.data_vencimento`) |
| `app/routers/conciliacao.py` | +12/-17 | helper local removido; order_by `.nulls_last()`; filter `< dt_ini`; parse_br_date para dicts | NAO (linhas 102, 106 emitem strings originais) |
| `app/routers/extrato.py` | +12/-25 | helper local removido; order_by `.nulls_last()`; range BETWEEN; `_clamp_dt_fim` usa parse_br_date | NAO (linhas 258, 259 emitem strings originais) |
| `app/routers/cp_cr.py` | +9/-19 | helper local removido; `_filtrar` usa parse_br_date; resumos usam parse_br_date | NAO (DTO `Lancamento` Pydantic continua string) |
| `app/routers/fluxo_caixa.py` | +9/-4 | import de parse_br_date de `app.core.dates` (era de `cp_cr`); docstring | NAO (DTO repassado de cp_cr, identico) |
| `app/routers/export.py` | +28/-13 | **BUG FIX**: `c.data_vencimento_date < hoje_d` em qtd_atrasado e flag atrasado; filtros + order_by por Date | NAO (PDFs template usam `c.data_vencimento` original) |
| `app/services/alertas.py` | +8/-13 | helper local removido; 3 listas usam `data_vencimento_date` | NAO (alertas sao texto, sem campo data exposto diretamente) |
| `app/services/orbit_chat.py` | +5/-12 | helper local removido; order_by Date com `.nulls_last()`; comparacoes date vs date | NAO (contexto do Claude e texto livre) |
| `tests/test_filters_data_semantic.py` | +92 | 6 testes documentando bug + fix | N/A |

Total: **+175/-103 LOC** liquidos no codigo de producao (sem contar testes), +92 LOC em testes.
