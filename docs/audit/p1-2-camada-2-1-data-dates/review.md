# Review — Camada 2.1 P1-2: data_*_date paralelas

- **PR**: [#80](https://github.com/vmapex/grupoalt-api/pull/80) — `feat(db): Camada 2.1 P1-2 — colunas data_*_date paralelas (non-destructive)`
- **Branch**: `feat/p1-2-camada-2-1-data-date-additive` (commit `b24ebba`)
- **Base**: `main` (commit `da032b2` — pós P0-7 + follow-ups)
- **Data**: 2026-05-18
- **Auditor**: audit-agent Camada 2.1
- **Mergeable**: MERGEABLE
- **CI**: `Backend CI / lint-and-test` = **SUCCESS** (run #26049569928, concluído 17:32:41 UTC)

## TL;DR

PR aditivo limpo, escopo cirúrgico, executado conforme o plano dividido em 3 camadas
(2.1/2.2/2.3). 11 colunas `data_*_date` Date adicionadas paralelas às 11 strings
DD/MM/YYYY existentes em 4 tabelas; backfill PG-guarded com regex POSIX exato; sync
popula ambas as colunas em 4 sites de escrita; `parse_br_date` helper centralizado e
defensivo. Models batem 1:1 com a migration. Strings antigas preservadas, nenhum
reader migrado (Camada 2.2 fica para PR seguinte). Round-trip up→down→up validado.
17 testes novos, 173/173 verde local SQLite + CI verde no chain PG 0001→0005.
Risco operacional baixo (ADD COLUMN nullable em ~18.885 linhas é rápido em PG).

## Recomendação: **APPROVE_WITH_FOLLOWUPS**
## Score: **94/100**

---

## Matriz objetiva — bloqueadores

| Critério | Status | Notas |
|---|---|---|
| Migration adiciona 11 colunas certas | OK | `_COLS` lista 11 tuples (tabela, col_old, col_new). Bate 1:1 com `_EXPECTED_NEW_COLS` do teste e com models.py |
| Models sync com migration | OK | Inspeção dinâmica via `sqlalchemy.inspect`: 11 colunas presentes, todas `Date`, todas `nullable=True` |
| Downgrade limpo | OK | Drop em ordem reversa de `_COLS`. Exercitado em SQLite (`test_downgrade_para_0004_remove_11_colunas`) e round-trip (`test_round_trip_upgrade_downgrade_upgrade`) |
| Dialect-guard PG-only no backfill | OK | `if bind.dialect.name == 'postgresql':` antes do `TO_DATE`. SQLite não executa o UPDATE (sem TO_DATE no dialeto) |
| Regex / SQL injection safety | OK | Regex POSIX `^[0-9]{2}/[0-9]{2}/[0-9]{4}$` é constante de compilação; `{table}`, `{col_old}`, `{col_new}` vêm de literal Python `_COLS`, **nenhum input externo interpolado**. Sem risco |
| Sync popula ambas colunas — 4 sites | OK | LancamentoCC (linha 270/271), ContaPagar (404-407), ContaReceber (525-528), BaixaFinanceira (602). Variáveis `raw_data_*` extraídas antes pra evitar dupla chamada `item.get()` |
| ON CONFLICT inclui colunas novas | OK | `update_vals = {k: v for k, v in values.items() if k not in ("empresa_id", "omie_id")}` — captura naturalmente os campos `*_date` recém-adicionados ao `values` dict (LancamentoCC, ContaPagar, ContaReceber). BaixaFinanceira usa `delete + db.add` (re-insert por tipo), sem necessidade de ON CONFLICT |
| `parse_br_date` defensivo | OK | None/vazia/whitespace/inválido/data impossível/0000-00-00/bissexto não-bissexto/ano 2-dígitos → todos retornam None sem exceção. 12 testes cobrem |
| Nenhum reader migrado | OK | Grep `data_*_date` no diretório `app/` retorna **só** `app/models/models.py` e `app/services/sync_service.py`. Routers (`conciliacao.py`, `dashboard.py`, `cp_cr.py`, `fluxo_caixa.py`, `extrato.py`, `orbit_chat.py`, `alertas.py`) continuam usando `_parse_date` ou `strptime` nas strings antigas — escopo Camada 2.1 respeitado |
| Strings antigas preservadas | OK | Teste explícito `test_upgrade_head_preserva_strings_antigas` confirma. Diff de models.py mantém todos os `Mapped[str \| None] = mapped_column(String(10))` originais |
| CI verde | OK | `Backend CI / lint-and-test` SUCCESS no chain 0001→0002→0003→0004→0005 em PG fresh (workflow inclui step "Validate Alembic migrations (PostgreSQL)") |
| Ordem `ADD COLUMN` → `UPDATE` | OK | Loop 1 (`add_column`) roda antes do loop 2 (`UPDATE ... TO_DATE`). Sem tentativa de UPDATE em coluna inexistente |
| SQLite suporta `ADD COLUMN nullable` | OK | Todos os ADDs são nullable (não há `NOT NULL` + default), o que SQLite suporta nativamente desde sempre. Confirmado pelo round-trip passar em SQLite |

**Nenhum bloqueador identificado.**

---

## Matriz objetiva — qualidade

| Critério | Status | Notas |
|---|---|---|
| Testes adequados (17 novos) | OK | 12 unit (`parse_br_date`) + 5 migration (upgrade/downgrade/round-trip/preservação/INSERT). Cobertura forte pra um PR aditivo |
| Edge cases backfill | OK | Match exato DD/MM/YYYY descarta corrompidos (NULL); guarda `AND col_new IS NULL` torna UPDATE idempotente; valores NULL na coluna antiga ficam NULL na nova (TO_DATE não roda) |
| Idempotência | OK (parcial) | UPDATE idempotente via `AND col_new IS NULL`. ADD COLUMN não é idempotente em si, mas Alembic versiona — `upgrade head` quando revision já é 0005 é no-op |
| Naming consistente | OK | `0005_data_dates_additive.py` segue padrão `NNNN_descricao_kebab` das migrations anteriores. Sufixo `_date` consistente nas 11 colunas |
| Documentação inline | OK | Docstrings completas em `dates.py` (com exemplos), `0005_*.py` (com tabela markdown), `test_alembic_0005_*.py`. Comentários explicativos nos 4 sites de sync_service. Top do PR descreve plano 2.1/2.2/2.3 com clareza |
| Helper centralizado | OK | `parse_br_date` substitui 6+ ocorrências duplicadas. Migração dos consumidores antigos diferida para Camada 2.2 (junto com switch de leitura) — explicitado na docstring |
| Type hints | OK | `Mapped[date \| None]` nos models, `s: str \| None -> date \| None` no helper, alinhamento limpo |
| Lint | OK | `ruff check` clean nos 4 arquivos modificados |

---

## Matriz objetiva — risco

| Critério | Status | Notas |
|---|---|---|
| Rollback DROP COLUMN | OK | `op.drop_column` em ordem reversa. PG suporta `DROP COLUMN` em tabela com FKs (lancamentos_cc, contas_pagar, contas_receber, baixas_financeiras têm FK para empresas) sem efeitos colaterais — colunas date novas não têm FK nem indices |
| Race condition pré/pós migration | OK | Sync popula AMBAS as colunas no mesmo `INSERT/UPDATE`. Linha nova durante o backfill: `data_*_date` já preenchida pelo sync; `WHERE col_new IS NULL` no UPDATE descarta-a com segurança (não sobrescreve). Linha antiga pré-migration: backfill aplica `TO_DATE` |
| Lock window backfill | OK (estimativa) | ADD COLUMN nullable em PG 13+ é metadata-only (instantâneo). UPDATE em ~18.885 linhas (conforme handoff) é segundos. Lock RowExclusiveLock por tabela durante UPDATE — bloqueia INSERTs concorrentes, mas sync_lancamentos não roda concorrente com migrations (deploy + alembic upgrade antes do worker subir) |
| Data drift | OK | Cenário: sync escreve linha NOVA durante backfill em outra empresa → sync popula ambas via `parse_br_date`. Backfill só toca linhas com `col_new IS NULL`. Sem corrida possível |
| Backfill ignora YYYY-MM-DD | INTENCIONAL/RISCO BAIXO | Regex só aceita DD/MM/YYYY. Se houver linhas legadas em ISO no banco, ficam NULL e devem ser detectadas por comparação count(antigo NOT NULL) vs count(novo NOT NULL) durante Camada 2.2. **Acceptable** — Omie sempre retorna DD/MM/YYYY, então é uma defesa razoável contra dados sujos, não restrição funcional |
| Backup pré-migration | OK | Daily Schedule Railway 2h atrás (291 MB), documentado como cobertura suficiente pra mudança aditiva. Compatível com `docs/operations/backup-policy.md` (PR pós-3B) |

---

## Pontos positivos

1. **Escopo cirúrgico**. PR não toca readers, não renomeia colunas, não migra `_parse_date` antigo. Tudo o que está fora do escopo da Camada 2.1 fica fora — facilita revisão e reduz risco.
2. **Dialect-guard explícito + tabela de cobertura por DB**. SQLite tests não exercitam backfill (limitação documentada), mas o CI step "Validate Alembic migrations (PostgreSQL)" exercita o chain completo em PG fresh. Cobertura realmente prática.
3. **Regex POSIX defensiva**. Match exato `^[0-9]{2}/[0-9]{2}/[0-9]{4}$` antes do `TO_DATE` evita exceção em valores corrompidos no banco (mesmo se a hipótese de "Omie sempre devolve DD/MM/YYYY" falhar).
4. **`update_vals` propaga automaticamente**. Como `update_vals = {k: v for k, v in values.items() if k not in ("empresa_id", "omie_id")}`, as 11 colunas novas entram no ON CONFLICT DO UPDATE sem alteração da expressão — padrão saudável que se beneficiou da boa abstração já existente.
5. **`parse_br_date` super defensivo**. None/vazia/whitespace puro/whitespace em volta/data impossível/0000-00-00/separador errado/ano 2 dígitos — todos retornam None sem `try/except` no caller. Casa com a realidade de dados sujos do Omie.
6. **17 testes novos cobrindo o que importa**. Migration testa adição, preservação, remoção, round-trip e INSERT real. `parse_br_date` testa 12 casos incluindo bissexto.
7. **Doc inline explica a estratégia 2.1/2.2/2.3**. Quem ler o PR daqui 6 meses entende por que existem 11 colunas duplicadas e quando elas vão desaparecer.

---

## Pontos de atenção (follow-ups)

Nenhum **bloqueador**. Lista abaixo é menor que a do PR 3B; todos não-bloqueantes, podem ir em Camada 2.2 ou em PR separado.

### 1. (Hardening minor) `parse_br_date` crasha com input não-string

**Severidade**: minor / hardening defensivo.

**Comportamento atual**:
```python
parse_br_date(20260315)  # -> AttributeError: 'int' object has no attribute 'strip'
parse_br_date(date(2026, 3, 15))  # -> AttributeError
```

`parse_br_date(0)` e `parse_br_date(False)` funcionam (retornam None) porque `if not s` curto-circuita. Mas qualquer int positivo, float, ou objeto não-string que tenha valor truthy explode.

**Por que é minor**: o type hint `s: str | None` é explícito; consumidores em sync_service.py passam estritamente `item.get(...)` que para campos de data Omie retorna `str | None`. Não há call site identificado que passe int.

**Fix proposto (Camada 2.2 quando for migrar consumers)**:
```python
def parse_br_date(s: str | None) -> date | None:
    if not s or not isinstance(s, str):
        return None
    s = s.strip()
    ...
```

Adicionar 1 teste em `test_dates.py`:
```python
def test_input_nao_string_retorna_none(self):
    assert parse_br_date(20260315) is None  # type: ignore[arg-type]
    assert parse_br_date(123.45) is None    # type: ignore[arg-type]
```

### 2. (Observabilidade) Telemetria de backfill ausente

**Severidade**: nice-to-have.

A migration roda `UPDATE ... TO_DATE` em silêncio. Não há `logger.info(f"backfilled {n} rows in {table}.{col_new}")`. Pós-deploy não dá pra distinguir "0 linhas tinham dados corrompidos" de "regex falhou em 100% das linhas por algum bug".

**Fix proposto**: nada urgente. Validar manualmente pós-deploy via:
```sql
SELECT
  COUNT(*) FILTER (WHERE data_lancamento IS NOT NULL) AS old_filled,
  COUNT(*) FILTER (WHERE data_lancamento_date IS NOT NULL) AS new_filled
FROM lancamentos_cc;
```
Esperado: `new_filled <= old_filled` (idealmente igual; diferença = linhas com formato fora do padrão). Documentar query no follow-up de Camada 2.2.

### 3. (Documentação) Migration menciona "0006" mas ainda não existe

**Severidade**: cosmético.

Vários comentários referenciam "DROP COLUMN das strings em 0006/Camada 2.3", o que é correto como plano. Apenas vale lembrar que `down_revision = '0004'` está OK hoje; quando 0006 nascer, ele referenciará `down_revision = '0005'`. Nenhuma ação necessária neste PR.

### 4. (Camada 2.2 preview) Índices Fase 3C continuam em colunas string

O índice `ix_lancamento_empresa_data` da Fase 3C (PR #76) está em `(empresa_id, data_lancamento)` String. A Camada 2.2 (ou 2.3) precisará recriá-lo em `(empresa_id, data_lancamento_date)` para corrigir o "range semanticamente errado" mencionado no body do PR. Fora do escopo deste PR — apenas marcar no checklist da Camada 2.2.

---

## Validações executadas

```bash
# 1. CI status (executei no início e re-confirmei após o run completar)
gh pr view 80 --repo vmapex/grupoalt-api --json statusCheckRollup,state,mergeable
# -> mergeable=MERGEABLE, state=OPEN, Backend CI = SUCCESS (run 26049569928)

# 2. Checkout
git fetch origin pull/80/head:pr80-audit && git checkout pr80-audit
# HEAD: b24ebba8

# 3. Suite completa
python -m pytest --ignore=tests/test_integration.py -q
# -> 173 passed in 17.98s

# 4. Testes do PR especificamente
python -m pytest tests/test_dates.py tests/test_alembic_0005_data_dates.py -v
# -> 17 passed in 2.09s (12 parse_br_date + 5 migration)

# 5. Lint
python -m ruff check app/core/dates.py app/models/models.py \
  app/services/sync_service.py alembic/versions/0005_data_dates_additive.py \
  --select E,F,W --ignore E501,E712,E741
# -> All checks passed!

# 6. Grep paranoia — confirma que readers NAO foram migrados
grep -rn "data_lancamento_date|data_conciliacao_date|data_emissao_date|\
data_vencimento_date|data_previsao_date|data_pagamento_date" app/
# -> apenas app/models/models.py e app/services/sync_service.py

# 7. Confirmacao de modelo via SQLAlchemy inspect
DATABASE_URL="postgresql+asyncpg://x:y@localhost/test" python -c "..."
# -> 11/11 colunas DATE nullable=True nos 4 models

# 8. Defensividade do parse_br_date (alem dos 12 testes)
python -c "from app.core.dates import parse_br_date; ..."
# -> None/vazio/whitespace/whitespace-interno/inputs nao-string mapeados,
#    int positivo crasha (follow-up #1)
```

---

## Tempo gasto

**~22 min.** Dentro do time-box de 25 min target.

---

## Conclusão

PR limpo, com plano claro e execução fiel. Recomendo **APPROVE_WITH_FOLLOWUPS**:
mergear como está e capturar os 4 follow-ups (hardening do `parse_br_date`,
telemetria de backfill, regeração de índices da Fase 3C, recriação ISO 8601 do
regex de backfill se necessário) na Camada 2.2.

Score 94/100 — desconto de 6 pontos pelos 4 follow-ups menores. Sem bloqueadores.
