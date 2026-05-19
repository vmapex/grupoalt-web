# Review — Camada 2.3 P1-2: DROP strings + RENAME _date canonico

- PR: #89
- Branch: feat/p1-2-camada-2-3-destructive-cleanup (commit 97354ff)
- Data: 2026-05-18
- Auditor: audit-agent Camada 2.3 (independente, padrao seq + 1)

## TL;DR (<=10 linhas)

Migration 0007 destrutiva fecha a campanha P1-2 com cirurgia limpa: dropa
3 indices Fase 3C que apontavam para colunas string, dropa 11 colunas
String(10) DD/MM/YYYY em 4 tabelas, renomeia 11 colunas `data_*_date`
para o nome canonico `data_*`, e renomeia os 3 indices da Camada 2.2b.0
para o nome canonico da Fase 3C. Estrategia dual-dialect bem aplicada
(PG ALTER INDEX nativo, SQLite batch + drop/create). Downgrade simetrico
com backfill `TO_CHAR` em PG e split em 2 batches no SQLite para evitar
`CircularDependencyError`. Models, sync_service (11 sites) e 7 consumidores
estao consistentes com o novo nome canonico (0 refs a `_date` em `app/`).
Tests novos cobrem upgrade, downgrade, round-trip, indices renomeados,
6 indices Fase 3C preservados e INSERT nativo. Os tests de 0005 e 0006
foram corretamente refatorados para `command.upgrade(cfg, "0005"/"0006")`
explicito. Suite 191/191 verde, ruff limpo, CI SUCCESS, mergeable.
JSON publico nao muda (Camada 2.2b.1 ja entregou ISO 8601).

## Recomendacao: APPROVE
## Score: 96/100

## Matriz objetiva — bloqueadores

| Item | Status | Evidencia |
|---|---|---|
| Tabelas/colunas da migration batem com 0005 | OK | `DROP_AND_RENAME` em `0007_drop_string_dates.py:88-124` lista 11 strings + 11 renames espalhadas nas 4 tabelas certas (lancamentos_cc:2, contas_pagar:4, contas_receber:4, baixas_financeiras:1) |
| Ordem DROP -> RENAME para liberar nome canonico | OK | `batch_alter_table` aplica `drop_column` antes do `alter_column(new_column_name=...)` no mesmo batch (linhas 153-158) |
| 3 indices Fase 3C que apontam para string dropados explicitamente | OK | `OLD_STR_INDEXES` + loop `drop_index` em 0007.py:79-83 e 147-148 |
| 6 indices Fase 3C nao tocados (status, conta_omie_id, projeto_omie_id) | OK | Nao aparecem em `OLD_STR_INDEXES` nem em `RENAME_INDEXES`; test `test_upgrade_head_preserva_6_indices_fase_3c` valida |
| ALTER INDEX RENAME TO em PG | OK | `op.execute(f"ALTER INDEX {old_idx} RENAME TO {new_idx}")` em 0007.py:166 |
| Estrategia dual-dialect SQLite vs PG | OK | `is_pg = bind.dialect.name == 'postgresql'`; SQLite fallback faz drop+create do indice |
| Downgrade simetrico | OK | Reverse `DROP_AND_RENAME`, rename canonico->_date, re-adiciona String(10), backfill PG `TO_CHAR(...)`, ALTER INDEX inverso, recria 3 Fase 3C |
| Downgrade em 2 batches no SQLite | OK | Justificado em comment 176-179: alter_column rename + add_column do mesmo nome no mesmo batch dispara `CircularDependencyError` do SQLAlchemy |
| models.py: 11 cols viraram `Mapped[date \| None]` Date nativo | OK | LancamentoCC:445-446, ContaPagar:481-484, ContaReceber:518-521, BaixaFinanceira:558 — todos com `Date, nullable=True` |
| Imports models.py: `date` importado de `datetime` | OK | linha 19 `from datetime import date, datetime, timezone` |
| Indices `_date` duplicados removidos do models | OK | `__table_args__` so tem nomes canonicos (`ix_lancamento_empresa_data`, `ix_cp_empresa_vencimento`, `ix_cr_empresa_vencimento`) |
| sync_service: parou de popular ambas | OK | `grep -c "parse_br_date" sync_service.py` = 12 (1 import + 11 sites). Comments "P1-2 Camada 2.3" em cada bloco |
| 11 sites distribuidos corretamente | OK | LancamentoCC: 2 (linhas 267-268); ContaPagar: 4 (397-400); ContaReceber: 4 (513-516); BaixaFinanceira: 1 (590) |
| 0 referencias a `data_*_date` em `app/` | OK | `grep -rn "data_\w*_date" app/` -> sem resultados |
| Renomeacao em 7 consumidores | OK | conciliacao.py, cp_cr.py, dashboard.py, export.py, extrato.py, alertas.py, orbit_chat.py — todos referenciam `data_*` canonico |
| Semantica `not c.data_pagamento` em export.py | OK | Date None continua falsy em Python (`bool(date(2026,1,1))` = True, `bool(None)` = False); semantica inalterada vs string anterior. Linhas 154,155,163 (CP) e 228,229,237 (CR) corretas |
| Test 0007: 8 testes, cobertura completa | OK | upgrade dropa colunas string + nao deixa `_date`; renomeia indices; preserva 6 Fase 3C; downgrade restaura strings; downgrade recria indices Fase 3C; round-trip; INSERT Date nativo |
| Test 0005/0006 ajustados | OK | `command.upgrade(cfg, "0005")` / `"0006"` explicito nos asserts de estado intermediario; `"head"` mantido so no round-trip (que vai ate 0007 destrutivo agora) |
| CI green | OK | gh pr view: `"conclusion":"SUCCESS"`, `"state":"OPEN"`, `"mergeable":"MERGEABLE"` |
| Suite local | OK | `pytest --ignore=tests/test_integration.py -q` -> 191 passed em 22.42s (era 183, +8 do 0007) |
| Ruff | OK | `ruff check app/ --select E,F,W --ignore E501,E712,E741` -> All checks passed! |

## Matriz objetiva — qualidade

| Item | Status | Comentario |
|---|---|---|
| Docstring no inicio da migration | OK | 60+ linhas de documentacao, tabela das 4 tabelas afetadas, estrategia dual-dialect, pre-requisitos, semantica do downgrade |
| Comentarios inline | OK | "Ordem critica: drop antes do rename libera o nome canonico" (152); "Dividido em dois batches porque misturar alter_column..." (177-179) |
| Naming consistente | OK | `_COLS`/`_INDEXES` em uppercase para constantes, snake_case nas funcoes; consistente com migrations anteriores |
| Comments "P1-2 Camada 2.3" no codigo | OK | models.py e sync_service.py marcam claramente os pontos alterados |
| Test docstrings explicam o "por que" | OK | "REGRESSAO: indice da Fase 3C nao tocado..." em test_upgrade_head_preserva_6_indices_fase_3c |
| Round-trip via "base" | OK | `test_round_trip_upgrade_downgrade_upgrade` faz `command.downgrade(cfg, "base")` — exercita TODAS migrations 0001..0007 |
| Backfill PG-only no downgrade documentado | OK | Comments na funcao explicam que SQLite recria via fixtures |

## Matriz objetiva — risco

| Risco | Avaliacao | Mitigacao |
|---|---|---|
| Mudanca visivel ao cliente | NAO | JSON publico ja eh ISO 8601 desde Camada 2.2b.1; so muda nome interno da coluna |
| Performance dos indices renomeados | OK | PG mantem ref via OID apos ALTER INDEX RENAME TO; SQLite recria em batch (single tx). Index Scan continua funcionando |
| Janela de lock em prod | OK | Tabelas ~10k-19k rows; cada ALTER atomico em <1s; backup manual confirmado pelo user |
| Rollback | OK | `alembic downgrade 0006` reverte; backfill `TO_CHAR(date, 'DD/MM/YYYY')` preserva strings; linhas com Date NULL ficam string NULL (tolerável: smoke 2.1 reportou 0 inconsistencias) |
| Cobertura de testes do path PG-only | PARCIAL | Backfill `TO_CHAR(...)` no downgrade so roda em PG; SQLite skip por dialect-guard. CI Backend roda Alembic em PG fresh ("Validate Alembic migrations (PostgreSQL)"), que exercita o upgrade. Downgrade-em-PG nao tem teste automatizado — confiamos no smoke pre-prod |
| `_calcular_status` em sync_service.py recebe strings | OK | Parametros `dt_pagamento`/`dt_vencimento` continuam strings raw da Omie (linhas 28-66); coluna Date `data_*` é alimentada via `parse_br_date(raw)` separadamente. Sem ambiguidade |

## Pontos positivos

1. **Estrategia dual-dialect madura**. PG usa `ALTER INDEX RENAME TO` nativo
   (rapido, preserva OID); SQLite faz drop+create dentro do `batch_alter_table`
   (recria a tabela, mas em uma transacao). Cada caminho esta isolado por
   `is_pg = bind.dialect.name == 'postgresql'`.

2. **Downgrade simetrico e documentado**. Split em 2 batches no SQLite tem
   comentario explicito de por que (`CircularDependencyError` do SQLAlchemy
   quando se mistura alter_column rename + add_column do mesmo nome). Backfill
   `TO_CHAR(date, 'DD/MM/YYYY')` em PG preserva o formato original.

3. **Refactor dos tests de 0005/0006 para "0005"/"0006" explicito**. Sem isso,
   esses tests quebrariam silenciosamente porque "head" agora vai ate 0007.
   O round-trip via "base"/"head" continua exercitando a cadeia completa.

4. **0 referencias residuais a `_date`**. `grep -rn "data_\w*_date" app/` retorna
   vazio. Limpeza completa em routers + services.

5. **Indices Fase 3C preservados explicitamente**. Test
   `test_upgrade_head_preserva_6_indices_fase_3c` itera 6 indices nao tocados
   (status, conta_omie_id, projeto_omie_id) e assert que existem pos-upgrade.
   Funciona como teste de REGRESSAO contra escorregar e dropar demais.

6. **Comentarios em codigo apontam a Camada certa**. models.py e sync_service.py
   tem `# P1-2 Camada 2.3` nas linhas alteradas, formando uma trilha rastreavel
   alinhada com o plano de seguranca.

## Pontos de atencao (com fix concreto)

Nenhum bloqueador. Tres observacoes nao-bloqueantes (followups opcionais):

### F-01 (nice-to-have) — Test downgrade-em-PG do backfill `TO_CHAR`

Hoje o downgrade so eh exercitado em SQLite via fixture (sem dados reais).
O backfill PG-only `UPDATE ... SET col_str = TO_CHAR(col_date, 'DD/MM/YYYY')`
nao tem teste automatizado. Risco baixo porque a expressao SQL eh trivial,
mas seria bom ter um teste isolado em PG (CI ja tem postgres service).
Fix sugerido: criar `test_alembic_0007_downgrade_postgres.py` rodando so com
`pytest.importorskip("psycopg2")` ou via marker que so liga em PG. Defer pra
followup.

### F-02 (cosmetico) — Tipagem do `is_pg` em ambas funcoes

Pequeno: `is_pg = bind.dialect.name == 'postgresql'` repete em `upgrade` e
`downgrade`. Aceitavel, mas extrair pra constante module-level dentro de
helper `_is_postgres(bind)` reduziria duplicacao. Nao-bloqueante.

### F-03 (informacional) — `_calcular_status` em sync_service.py

A funcao recebe `dt_pagamento`/`dt_vencimento` como strings (raw da Omie),
nao Date. Nao eh bug — eh um helper interno que usa `strptime` na linha 61.
Mas o nome do parametro pode causar confusao para quem ler depois. Sugiro
renomear pra `dt_pagamento_raw` em followup separado (sem impacto em prod).

## Validacoes executadas

```
gh pr view 89 --repo vmapex/grupoalt-api --json statusCheckRollup,state,mergeable
-> {"mergeable":"MERGEABLE","state":"OPEN","statusCheckRollup":[{"conclusion":"SUCCESS",...}]}

python -m pytest --ignore=tests/test_integration.py -q
-> 191 passed in 22.42s

python -m pytest tests/test_alembic_0007_destructive.py -v
-> 8 passed in 3.62s
   (test_upgrade_head_dropa_colunas_string, test_upgrade_head_remove_colunas_intermediarias_date,
    test_upgrade_head_indices_renomeados_para_canonico, test_upgrade_head_preserva_6_indices_fase_3c,
    test_downgrade_para_0006_restaura_colunas_string,
    test_downgrade_para_0006_restaura_indices_fase_3c_em_string,
    test_round_trip_upgrade_downgrade_upgrade, test_insert_via_model_funciona_com_date_nativo)

python -m ruff check app/ --select E,F,W --ignore E501,E712,E741
-> All checks passed!

grep -c "parse_br_date" app/services/sync_service.py
-> 12  (1 import + 11 sites, era 22 antes)

grep -rn "data_\w*_date" app/
-> sem resultados (0 refs residuais)

grep -E "data_\w+:.*String\(10\)" app/models/models.py
-> sem resultados (0 strings em colunas de data)
```

## Tempo gasto

~22 min (leitura do PR + checagem cruzada models/migration/sync/consumidores
+ rodar suite + ruff + gh pr view + redacao).
