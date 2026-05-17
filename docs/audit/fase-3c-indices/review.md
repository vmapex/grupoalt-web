# Review — Fase 3C: 9 índices compostos em tabelas financeiras (P0-6)

- **PR**: [#76 — feat(db): Fase 3C — 9 índices compostos](https://github.com/vmapex/grupoalt-api/pull/76)
- **Branch**: `feat/fase-3c-indices` (commit `f86d90e`)
- **Data do review**: 2026-05-17
- **Auditor**: audit-agent Fase 3C

---

## TL;DR

PR cirúrgico, bem documentado e de baixo risco. Adiciona 9 índices compostos em
`(empresa_id, X)` nas 3 tabelas financeiras (`lancamentos_cc`, `contas_pagar`,
`contas_receber`) cobrindo exatamente os padrões de query usados pelos routers
de BI (extrato, conciliação, dashboard, CP/CR, export). Migration manual
espelha 1:1 as entradas `Index()` em `__table_args__` em `models.py`, os 9
nomes não colidem com a baseline 0001, os 4 testes dedicados passam local (com
upgrade→downgrade→upgrade round-trip) e o CI `lint-and-test` está SUCCESS no
remote. A docstring é exemplar: contextualiza P0-6, explica a escolha de
`CREATE INDEX` regular vs `CONCURRENTLY` justificando pelo tamanho real das
tabelas (≤18.885 linhas em prod), e marca explicitamente o débito P1-2
(String→Date) como follow-up. Não há blockers.

---

## Recomendação: **APPROVE**

## Score: **96/100**

- −2 pelos índices em colunas `data_lancamento`/`data_vencimento` que ainda
  são `String(10) DD/MM/YYYY` — net positive como o autor reconhece, mas o
  benefício real só vem após P1-2.
- −2 pela ausência de gap analysis explícito: não há índice candidato
  `(empresa_id, status, data_vencimento)` para o caso CP/CR aging combinado;
  nice-to-have, não bloqueador.

---

## Matriz objetiva — bloqueadores

| # | Critério | Status | Observação |
|---|---|---|---|
| 1 | `models.py` ↔ migration sincronizados (9 entradas batem 1:1) | OK | Os 9 `Index(...)` em `__table_args__` (3 em `LancamentoCC`, 3 em `ContaPagar`, 3 em `ContaReceber`) batem nome, tabela e colunas com `NEW_INDEXES` da migration. Verificado linha-a-linha. |
| 2 | `upgrade()` cria 9 e `downgrade()` remove 9 (ordem reversa) | OK | `upgrade()` itera `NEW_INDEXES`; `downgrade()` itera `reversed(NEW_INDEXES)` com `drop_index(..., table_name=table)`. |
| 3 | Compatibilidade dual-dialect (sem `postgresql_*` kwargs) | OK | `grep postgresql_` na migration → nenhuma ocorrência. Forma simples `op.create_index(name, table, columns)` é portável SQLite/PG. |
| 4 | Testes dedicados validam comportamento (4 testes) | OK | `tests/test_alembic_0003_indices.py` cobre: (a) índices existem pós-upgrade, (b) somem pós-downgrade 0002, (c) round-trip upgrade→base→upgrade, (d) índices únicos da baseline 0001 intactos. **4 passed em 1.57s** local. |
| 5 | CI verde no PR #76 | OK | `gh pr view 76 --json statusCheckRollup` → CheckRun `lint-and-test` SUCCESS (concluído 13:59:46Z), `state: OPEN`, `mergeable: MERGEABLE`. |
| 6 | Sem regressão na suite | OK | `pytest --ignore=tests/test_integration.py` → **140 passed em 8.50s**. |
| 7 | Nenhuma colisão de nome com baseline 0001 | OK | Baseline 0001 cria apenas `ix_lancamento_empresa_omie`, `ix_cp_empresa_omie`, `ix_cr_empresa_omie` (unique). Os 9 novos usam sufixos diferentes (`_data`, `_conta`, `_projeto`, `_status`, `_vencimento`). Zero colisão. |

---

## Matriz objetiva — qualidade

| # | Critério | Status | Observação |
|---|---|---|---|
| 8 | Naming consistency `ix_{tabela_short}_{cols_short}` | OK | Padrão consistente: `ix_lancamento_empresa_{data\|conta\|projeto}`, `ix_cp_empresa_{status\|vencimento\|projeto}`, `ix_cr_empresa_{status\|vencimento\|projeto}`. Mesma convenção da baseline. |
| 9 | Docstring explica o "por quê" | OK | Docstring excepcional: referencia P0-6, tabela markdown com cada índice e onde ajuda, justifica `CREATE INDEX` regular (lock <1s em 18.885 linhas), e flag explícito sobre o débito P1-2 (String→Date) com explicação de por que o índice ainda é net positive. |
| 10 | Comentário em `models.py` contextualizando "Fase 3C" | OK | Cada bloco de 3 `Index()` novos tem comentário `# Fase 3C: indices compostos para filtros frequentes do BI (...)` antes das declarações. |
| 11 | Revision chain `revision='0003', down_revision='0002'` | OK | Bate exatamente; nomenclatura segue padrão 3A/3B. |

---

## Matriz objetiva — risco

| # | Critério | Status | Observação |
|---|---|---|---|
| 12 | Operação não-destrutiva | OK | `CREATE INDEX` puro, sem mudança de dados, sem alteração de coluna. Lock window estimado em <1s para a maior tabela (drill de backup 2026-05-16 confirmou 18.885 linhas). Sem necessidade de `CONCURRENTLY` para essa escala. |
| 13 | Performance check empírico (EXPLAIN ANALYZE) | FOLLOW-UP | Não executado neste audit. Recomendado smoke pós-deploy: rodar `EXPLAIN ANALYZE` em queries-chave (extrato por período, CP aberto por empresa, CR top clientes) na Railway PG para confirmar que o planner escolhe os índices novos vs Seq Scan. SQLite tem heurísticas diferentes — confirmar especificamente em PG. |
| 14 | Cobertura vs gap | MOSTLY OK | Os 9 índices cobrem os padrões de query observados em `extrato.py` (`LancamentoCC.conta_omie_id`, `data_lancamento`), `cp_cr.py` (`status`, `data_vencimento`), `dashboard.py`, `conciliacao.py`, `export.py`. **Gap nice-to-have**: índice composto de 3 colunas `(empresa_id, status, data_vencimento)` em CP/CR aceleraria aging analysis com filtro combinado (status='ABERTO' AND data_vencimento >= X). Postgres pode usar bitmap-and dos dois índices separados, então não é blocker — registrar como follow-up para revisar se prod mostrar query lenta. |

---

## Pontos positivos

1. **Docstring é referência de qualidade** — tabela markdown clarifica cada
   índice e seu caso de uso. A nota sobre `String(10) DD/MM/YYYY` antecipa a
   pergunta óbvia ("por que indexar coluna textual de data?") e responde com
   precisão: PG usa o índice em equality e prefix-match, e o índice fica
   pronto pra colher o ganho semântico completo após P1-2.
2. **Lista canônica `NEW_INDEXES` única** — fonte de verdade para `upgrade()`
   e `downgrade()` ao mesmo tempo. Reduz risco de drift na ordem reversa.
   Mesmo padrão dos testes (`EXPECTED_INDEXES`), facilitando audit.
3. **Justificativa de `CREATE INDEX` vs `CONCURRENTLY` baseada em dado real**
   (18.885 linhas, drill de backup 2026-05-16). Não é decisão por intuição.
4. **Testes inclui sanity check** dos índices únicos pré-existentes (caso 4 do
   teste) — garante que a migration 0003 não afeta o que a baseline 0001
   criou. Defesa em profundidade.
5. **CI passou no remote** — workflow `Backend CI / lint-and-test` SUCCESS,
   confirmando que o step "Validate Alembic migrations (PostgreSQL)" valida
   a cadeia `0001→0002→0003` em PG fresh.
6. **Naming consistency** entre baseline 0001 (`ix_lancamento_empresa_omie`)
   e os novos (`ix_lancamento_empresa_data`, etc) — qualquer dev lendo
   `pg_indexes` reconhece imediatamente o padrão por tabela.

---

## Pontos de atenção

1. **Índices em String(10) DD/MM/YYYY** (P1-2 separado). O autor sinaliza
   isso na docstring. Conforme P1-2 for endereçado (String→Date), validar se
   o índice precisa ser recriado ou se Alembic detecta o tipo novo
   automaticamente. Registrar como item de checklist do P1-2.
2. **Gap nice-to-have**: composto `(empresa_id, status, data_vencimento)` em
   CP/CR. Postgres consegue combinar os dois índices via bitmap-and, então o
   ganho seria marginal e nem sempre escolhido pelo planner. Não bloqueador.
3. **Smoke pós-deploy recomendado**: rodar `EXPLAIN ANALYZE` em prod nas
   queries-alvo das telas de Dashboard, Extrato e CP/CR depois do deploy
   para confirmar o planner usa os índices. Não exige rollback se não
   acelerar — só sinalizaria que alguma query precisa de ajuste de hint
   ou ordem de filtros.
4. **Ruff lint** acusa 79 erros pré-existentes no repo (não introduzidos por
   este PR — os arquivos novos `0003_indices_compostos.py` e
   `test_alembic_0003_indices.py` passam clean). Item de hygiene não
   relacionado a 3C.

---

## Validações executadas

```bash
python -m pytest tests/test_alembic_0003_indices.py -v
# 4 passed in 1.57s

python -m pytest --ignore=tests/test_integration.py -q
# 140 passed in 8.50s

python -m ruff check alembic/versions/0003_indices_compostos.py \
                     tests/test_alembic_0003_indices.py app/models/models.py
# All checks passed!

gh pr view 76 --repo vmapex/grupoalt-api --json statusCheckRollup,state,mergeable
# state=OPEN, mergeable=MERGEABLE, lint-and-test=SUCCESS
```

---

## Tempo gasto

~15 minutos (dentro do time-box de 25 minutos, escopo bem delimitado da PR).
