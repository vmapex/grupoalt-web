# Audit Fase 3B — Numeric(15,2) em colunas monetárias

- **PR:** [vmapex/grupoalt-api#75](https://github.com/vmapex/grupoalt-api/pull/75)
- **Branch:** `feat/fase-3b-numeric-monetario`
- **Commit auditado:** `dbf0d1a feat(db): Fase 3B — Numeric(15,2) em colunas monetárias (P1-1)`
- **Data:** 2026-05-17
- **Auditor:** audit-agent (independente do autor do PR)

## TL;DR

A migration `0002_numeric_monetary` e a mudança em `app/models/models.py` cobrem **as 11 colunas certas, nas 4 tabelas certas**, com simetria upgrade/downgrade, `postgresql_using` correto para os dois sentidos da conversão, `batch_alter_table` para compat SQLite/PG, `existing_nullable` consistente (`saldo_banco=True`, demais 10=`False`) e 4 testes dedicados — todos passam local (SQLite). Modelos passaram de `Float` → `Numeric(15,2)` 1:1, `decimal.Decimal` importado, `Float` removido por completo do pacote `app/`. CI rodou o upgrade em PG real com sucesso, **mas falhou num check stale de Fase 3A** (`alembic current | grep -q "0001"` em `.github/workflows/ci.yml:83`) que ainda assume head=`0001`. É um bug de roteamento do CI, não da migration — mas como **bloqueia o merge automático**, precisa ser ajustado neste mesmo PR (`grep -q "0002"` ou `grep -qE "0001|0002"` ou `grep -Eq "(head|0002)"`). Fora isso, o trabalho está limpo.

## Recomendação

**REQUEST_CHANGES** — única mudança bloqueante: corrigir o assert hardcoded `0001` em `.github/workflows/ci.yml:83`. É 1 linha. Sem isso, o PR fica vermelho indefinidamente e não merge.

Se o autor preferir abrir um PR de hotfix separado pra atualizar o workflow primeiro (ou ajustar via `grep -q head`), o 0002 em si está aprovado pra mergear assim que o CI ficar verde.

## Score

**88/100**

- −10 pelo CI vermelho por check stale (não é falha da migration, mas continua bloqueando merge e foi missed pelo autor).
- −2 pela falta de teste/check que **falhe** se alguém adicionar uma coluna `Float` nova em `models.py` no futuro (linter ou guard test seria nice-to-have, não bloqueante).

## Matriz objetiva — bloqueadores

| # | Item | Status | Nota |
|---|---|---|---|
| 1 | Cobertura das 11 colunas | OK | Lista `NUMERIC_COLUMNS` na migration bate exatamente: `lancamentos_cc` (valor, saldo_banco), `contas_pagar` (valor, valor_pago, valor_aberto), `contas_receber` (valor, valor_recebido, valor_aberto), `baixas_financeiras` (valor, desconto, juros, multa). Nem sobra nem falta. |
| 2 | Sync models.py ↔ migration | OK | `git diff origin/main app/models/models.py` mostra as mesmas 11 linhas mudando para `Mapped[Decimal] = mapped_column(Numeric(15, 2), ...)`. 1:1 sem desalinhamento. |
| 3 | USING cast no PG | OK | `upgrade()` injeta `postgresql_using=f"{col_name}::numeric(15,2)"`. `downgrade()` injeta `postgresql_using=f"{col_name}::double precision"`. Sem isso PG rejeita o ALTER, e o downgrade também não é trivial (Numeric→double precision sem USING falha pra colunas NOT NULL). |
| 4 | Nullable preservado | OK | Lista `NUMERIC_COLUMNS` marca `('saldo_banco', True)` e o resto `False`. `existing_nullable` é propagado tanto no upgrade quanto no downgrade. |
| 5 | Round-trip seguro | OK | `test_round_trip_upgrade_downgrade_upgrade_nao_quebra` roda `upgrade head → downgrade base → upgrade head` — passa em SQLite. Step CI da Fase 3A faz o mesmo em PG (e essa parte do CI passou — o que falhou foi o assert stale `grep -q "0001"`, ver bloqueador CI). |
| 6 | Tests validam efeito real | OK | 4 testes: (a) tipos `NUMERIC` após upgrade head, (b) tipos `FLOAT/REAL/DOUBLE` após downgrade 0001, (c) round-trip, (d) dados preservados (insere 2 linhas com `1234.56` e `-789.12` em SQLite Float, upgrade, lê de volta como Decimal e compara). |
| 7 | CI passa | **FALHA** | `gh pr view 75 → conclusion=FAILURE`. Logs em `actions/runs/25979883296`: o `alembic upgrade head` rodou OK (`Running upgrade 0001 -> 0002, numeric_monetary ...`), mas a linha seguinte do step (`alembic current \| grep -q "0001"`) saiu com exit 1 porque o head agora é `0002`. **Está em `.github/workflows/ci.yml:83`** — herança do Fase 3A. Bloqueia o merge. |
| 8 | Imports limpos | OK | `Float` foi removido do import em `models.py` e `from decimal import Decimal` foi adicionado. `Grep \bFloat\b app/` retorna **zero matches**. Nenhum import órfão. |

## Matriz objetiva — qualidade

| # | Item | Status | Nota |
|---|---|---|---|
| 9 | batch_alter_table dual-dialect | OK | `with op.batch_alter_table(table) as batch_op:` em ambos `upgrade()` e `downgrade()`. SQLite recria a tabela; PG faz ALTER direto. Compat sem código duplicado. |
| 10 | Docstring | OK | Docstring de 30+ linhas no topo do arquivo: explica IEEE 754 vs NUMERIC, lista as 11 colunas, justifica ALTER COLUMN TYPE atômico vs coluna paralela (tamanho das tabelas), inclui contagens de prod (drill 2026-05-16), nota a duração esperada do lock (~segundos por tabela), e documenta a estratégia dual-dialect. Excelente nível. |
| 11 | Audit Python (grep mixing) | OK | Greps independentes confirmam zero `model.valor [+-*/] literal_float` no `app/`. `app/services/sync_service.py` lê Omie como `float(item.get(...))`, faz aritmética em float, aplica `round(..., 2)` no boundary e atribui ao model — SQLAlchemy converte para Decimal no write. Sem mixing direto em colunas do model. Pydantic schemas com `valor: float` (em `app/routers/cp_cr.py`, `dashboard.py`, `export.py`) NÃO contam — auto-conversão Decimal→float na serialização. |
| 12 | Naming consistency com 0001 | OK | `revision: str = '0002'`, `down_revision: Union[str, None] = '0001'`, `branch_labels`, `depends_on`, header de docstring tudo idêntico ao estilo do 0001. |

## Matriz objetiva — risco

| # | Item | Status | Nota |
|---|---|---|---|
| 13 | Migration destrutiva mas reversível | OK | Risco mitigado: tabelas pequenas (~18k linhas máx), lock <1s por tabela, backup diário + drill validado (PR #74), downgrade testado nos 4 cenários (incluindo round-trip), e cast explícito IEEE 754 → NUMERIC é exato pros valores monetários típicos (até ~15 dígitos significativos). |
| 14 | JSON serialization na API | OK | Pydantic v2 auto-converte `Decimal → float` na serialização JSON quando o schema declara `valor: float`. Verificado em `app/routers/cp_cr.py:26,40`, `dashboard.py:37`, `export.py:31`. Endpoints continuam retornando JSON com floats. Nenhum schema precisa mudar. |
| 15 | Hidden state em sync_service.py | OK (com follow-up sugerido) | `sync_service.py` lê Omie como `float`, faz aritmética com `round(..., 2)`, atribui ao model. SQLAlchemy converte float→Decimal no write. Nenhum side-effect novo: o arredondamento que já acontecia continua acontecendo, agora persistido em Decimal exato (vs Float aproximado). Follow-up (não-bloqueante): migrar `sync_service.py` para `Decimal` ponta-a-ponta numa Fase 3C/3D pra eliminar a janela `float → round → Decimal` que ainda existe no ingest. |

## Pontos positivos

1. **Docstring exemplar** na migration — explica o "porquê" (IEEE 754 vs NUMERIC), o "como" (batch_alter_table dual-dialect, USING clauses), o "tamanho do raio de explosão" (18.885 linhas máx, lock <1s) e a "matriz tabela×coluna" inteira. Serve de referência pro próximo dev.
2. **Estrutura de dados (`NUMERIC_COLUMNS`) reusada** entre `upgrade()` e `downgrade()` — single source of truth, impossível desalinhar os dois sentidos.
3. **4 testes cobrindo cada quadrante** (tipos pós-upgrade, tipos pós-downgrade, round-trip, dados sobrevivem) — nenhum redundante, nenhum gap óbvio.
4. **Audit do código já feito antes do PR** — o autor verificou (e documentou na descrição) que não tem aritmética mixing Float-literal com colunas. Reduziu meu trabalho.
5. **`Float` totalmente removido do `app/`** — `grep -r '\bFloat\b' app/` retorna zero. Sem zumbis.
6. **Smoke plan pós-deploy explícito na PR description** — `SELECT SUM(valor) FROM ...` antes/depois pra validar zero divergência. Operacionalmente sólido.

## Pontos de atenção

1. **CI vermelho por assert stale (bloqueador, mas trivial)**. Em `.github/workflows/ci.yml:83`: `alembic current | grep -q "0001"`. Esse check foi escrito assumindo head=`0001` (Fase 3A). Agora que head=`0002`, ele falha. Soluções aceitáveis em ordem de preferência:
   - **Recomendada:** `alembic current | grep -qE "(0001|0002)"` ou simplesmente checar que `current` produz alguma saída não-vazia + comparar com `alembic heads`. Algo como:
     ```bash
     CURRENT=$(alembic current 2>/dev/null | head -1 | awk '{print $1}')
     HEADS=$(alembic heads 2>/dev/null | head -1 | awk '{print $1}')
     test "$CURRENT" = "$HEADS"
     ```
   - **Quick fix:** trocar `"0001"` por `"0002"`. Funciona, mas vai quebrar de novo na Fase 3C. Pelo histórico recente, aceitável só se o time topar atualizar a cada PR de migration.
   - **Mais simples e duradouro:** remover essa linha por completo — `alembic upgrade head` já falha se algo der errado, e os tests Python já validam que o estado tá certo.
2. **Follow-up não-bloqueante:** `app/services/sync_service.py` ainda ingere Omie em `float` e aplica `round(x, 2)` antes do write. Funciona (SQLAlchemy converte pro Decimal exato), mas continua exposto ao erro IEEE 754 dentro da janela de cálculo (`val_pago + existing["valor_pago"]` na linha 100 é float-arith). Para eliminar o último ponto cego, agendar Fase 3C: `Decimal(str(item.get(...)))` no ingest + remover `round()` redundantes. Não bloqueia 3B porque não regride nada — o estado anterior já tinha o mesmo problema.
3. **Sem guard test pra novas colunas Float**. Se um futuro PR adicionar `desconto_legal: Mapped[float] = mapped_column(Float)` em alguma nova tabela financeira, nada vai pegar. Sugestão (futura): teste introspectivo que falhe se qualquer coluna com nome casando `valor*|preco*|saldo*|desconto*|juros*|multa*` for `Float`. Não é gating de 3B.
4. **`existing_type=sa.Float()` no `alter_column` é correto, mas a doc Alembic recomenda `existing_type=postgresql.DOUBLE_PRECISION()` quando o tipo real em PG é `DOUBLE PRECISION`** (Float→`REAL` ou `DOUBLE` depende do `precision` arg). Na prática `Float()` SQLAlchemy mapeia pra `FLOAT` genérico que o PG resolve, então funciona em ambos os dialects — e os testes provam. Cosmético; não ajustar.

## Validações executadas

| Comando | Resultado |
|---|---|
| `pytest tests/test_alembic_0002_numeric_monetary.py -v` | 4/4 PASSED em 1.99s (SQLite) |
| `pytest` (suite inteira) | 151 PASSED, 3 FAILED (`xhtml2pdf` missing, pré-existente) em 12.68s |
| `gh pr view 75 --json statusCheckRollup` | `state=OPEN`, `mergeable=MERGEABLE`, mas check `lint-and-test` = **FAILURE** |
| `gh run view 25979883296 --log-failed` | Falha em `alembic current \| grep -q "0001"` (workflow stale, não código) |
| `Grep '\bFloat\b' app/` | Zero matches (Float removido limpo) |
| `Grep '\.valor[a-z_]* [+-*/] [0-9]+'` em `app/` | Zero matches (no Float-literal mixing) |
| `Grep 'valor\s*:\s*(float\|Decimal)'` em `app/` | 5 matches em routers/services — todos Pydantic ou ingest, sem risco |
| Compare line-by-line `models.py` vs migration | 11 colunas batem 1:1 |

## Tempo gasto na auditoria

~25 minutos (dentro do time-box de 30).
