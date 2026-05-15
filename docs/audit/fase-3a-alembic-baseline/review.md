# Audit Review — PR #73: Fase 3A Alembic baseline

- **PR**: https://github.com/vmapex/grupoalt-api/pull/73
- **Título**: feat(db): Fase 3A — Alembic baseline gerenciando schema (P0-4)
- **Branch**: `feat/fase-3a-alembic-baseline` → `main`
- **Autor**: VinnyMMHH
- **Auditor**: Audit Agent Fase 3A
- **Data**: 2026-05-15
- **Recomendação**: **REQUEST_CHANGES**
- **Score**: **70 / 100**

---

## TL;DR

PR muito bem estruturado, com runner programático, política de stamp para DB
legado e testes pytest dedicados — mas tem **um bloqueador real**: o
`downgrade base` em PostgreSQL deixa **tipos ENUM órfãos** (`tipoempresaenum`,
`tipooperacao`, `categoriadocumento`, `statusdocumento`, `roleenum`). Isso é
exatamente o que o novo CI step `Validate Alembic migrations (PostgreSQL)`
captura — e que **está vermelho** agora (`psycopg2.errors.DuplicateObject:
type "tipoempresaenum" already exists` no segundo `upgrade head`).

Em SQLite o bug é invisível (não tem ENUM types nativos). Em PG é fatal pro
rollback.

---

## Matriz objetiva — bloqueadores

| # | Item | Resultado | Detalhe |
|---|---|---|---|
| 1 | `alembic upgrade head` em DB vazio | OK | Validado local em SQLite: cria todas as tabelas, sai limpo. |
| 2 | `alembic downgrade base` reverte limpo | **PARCIAL → BLOQUEADOR em PG** | SQLite: apenas `alembic_version` permanece (OK). PostgreSQL: tabelas dropam mas **5 tipos ENUM ficam órfãos** (`tipoempresaenum`, `tipooperacao`, `categoriadocumento`, `statusdocumento`, `roleenum`). |
| 3 | Schema bate com `Base.metadata` | OK | Teste `test_baseline_match_com_base_metadata` passa local (4/4 verde). |
| 4 | `apply_migrations()` faz stamp em DB legado | OK | Lógica em `app/core/alembic_runner.py:78-97` cobre os 3 casos (vazio, legado, normal). Teste `test_apply_migrations_em_db_legado_faz_stamp_sem_recriar` passa. |
| 5 | Nenhum ALTER inline sobrou em `app/main.py` | OK | `migrate_empresa_columns` removida; lifespan chama `apply_migrations()` em vez de `Base.metadata.create_all`. Confirmado via `git diff main..pr-73-audit -- app/main.py`. |
| 6 | CI tem step Alembic em PostgreSQL | OK (existe) | `.github/workflows/ci.yml:77-87` roda `upgrade → downgrade → upgrade`. |
| 7 | conftest.py preserva comportamento | OK | `tests/conftest.py:201` continua com `Base.metadata.create_all`. Justificativa na PR description (10× mais rápido). |
| 8 | Migration tem `downgrade()` | OK (parcial — ver item 2) | `0001_baseline.py:387-428` tem 27 `drop_table`. Falta `Enum.drop()` para os 5 tipos. |
| 9 | **CI passou** | **NÃO — BLOQUEADOR** | Run 25938895561 falhou no step `Validate Alembic migrations (PostgreSQL)` com `DuplicateObject: type "tipoempresaenum" already exists`. |

**Itens NÃO atendidos**: #2 (parcialmente), #9. Ambos sintomas da mesma raiz.

---

## Causa raiz do bloqueador

`op.drop_table(...)` no PostgreSQL **não drop os tipos ENUM** criados
automaticamente por `sa.Enum('a','b', name='tipoempresaenum')` em
`op.create_table()`. O CreateEnumType DDL roda como side-effect do
`before_create` do tipo na primeira table que usa o ENUM; já o `drop_table`
não dispara o `DropEnumType` equivalente porque outras tabelas no metadata
poderiam estar referenciando-o.

Pra resolver, o `downgrade()` precisa explicitamente:

```python
def downgrade() -> None:
    # drop tables (as 27 já existentes)
    ...
    # drop ENUM types (PostgreSQL — no-op em SQLite via bind.dialect)
    bind = op.get_bind()
    if bind.dialect.name == 'postgresql':
        sa.Enum(name='tipoempresaenum').drop(bind, checkfirst=True)
        sa.Enum(name='tipooperacao').drop(bind, checkfirst=True)
        sa.Enum(name='categoriadocumento').drop(bind, checkfirst=True)
        sa.Enum(name='statusdocumento').drop(bind, checkfirst=True)
        sa.Enum(name='roleenum').drop(bind, checkfirst=True)
```

Sem isso o `upgrade → downgrade → upgrade` (caminho clássico de validação CI
e de rollback humano) quebra em PG.

---

## Validações locais executadas

```
$ DATABASE_URL="sqlite+aiosqlite:///./_audit_test.db" SECRET_KEY=... FERNET_KEY=... \
    python -m alembic upgrade head
INFO  [alembic.runtime.migration] Running upgrade  -> 0001, baseline ...

$ python -m alembic downgrade base
INFO  [alembic.runtime.migration] Running downgrade 0001 -> , baseline ...

$ sqlite3 _audit_test.db ".tables"
alembic_version            # OK em SQLite

$ python -m pytest tests/test_alembic_baseline.py -v
4 passed in 0.85s
```

Tudo verde em SQLite — o bug só se manifesta em PG (vide log do CI).

---

## Matriz objetiva — qualidade

| # | Item | Resultado | Detalhe |
|---|---|---|---|
| 10 | `env.py` respeita URL via Config | OK | `alembic/env.py:48-52` lê `config.get_main_option("sqlalchemy.url")` e só usa `settings.db_url` como fallback. Tests dependem disso. |
| 11 | `compare_type=True` e `compare_server_default=True` | OK | `env.py:72-73` (offline) e `env.py:92-93` (online). Crítico pra Fase 3B captar Float→Numeric no autogenerate. |
| 12 | `psycopg2-binary` com comentário explicativo | OK | `requirements.txt:6-8`: "psycopg2-binary é usado APENAS pelo Alembic (driver síncrono pra DDL transacional). Runtime do app continua em asyncpg." |
| 13 | Política de stamp documentada no docstring | OK | `app/core/alembic_runner.py:1-15` tem docstring detalhado com 3 cenários. |
| 14 | PR description menciona política de primeiro boot | OK | Seção "Risk" descreve stamp em DB legado + concorrência via lock interno do Alembic. |
| 15 | Migration tem comentário "baseline" | OK | `0001_baseline.py:1-16` explica "snapshot do schema atual de produção (Fase 3A)" + uso esperado. |
| 16 | `.gitignore` cobre tmp DBs | OK (parcial) | `.gitignore:26` adiciona `_alembic_*.db`. Mas o teste usa `alembic_test_*.db` (prefixo `alembic_test_`, sem underscore inicial) via `tempfile.mkstemp` no tmpdir do sistema (não polui repo). Sugestão de qualidade: alinhar prefixo ou remover o entry — atual é cosmetic. |
| 17 | Nomenclatura `0001_baseline.py` | OK | `alembic.ini:10` define `file_template = %%(rev)s_%%(slug)s`. Próximas migrations seguirão `0002_*`, `0003_*` automaticamente. |

**Sub-issue qualidade 16**: pattern `_alembic_*.db` no `.gitignore` não bate
com o pattern real dos testes (`alembic_test_*.db` via `tempfile.mkstemp`).
Tests usam tmpdir do SO, então não polui o repo de qualquer jeito —
cosmetic. **Não baixa score**.

---

## Matriz objetiva — migrations destrutivas

| # | Item | Resultado | Detalhe |
|---|---|---|---|
| 18 | Baseline NÃO drop tabelas existentes no upgrade | OK | `upgrade()` só usa `op.create_table` e `op.create_index`. Zero `drop_table`. |
| 19 | `op.execute()` com SQL custom comentado | N/A | Não há `op.execute` na baseline. |
| 20 | Schema bate com state consolidado de prod | **OK — auditado** | Cruzei coluna por coluna baseline × `git show e2616df:app/main.py` (ALTERs históricos). Todas as 26 ALTERs estão refletidas. Detalhamento abaixo. |

### Item 20 — checklist coluna por coluna

| Coluna histórica (ALTER) | Existe na baseline? | Linha |
|---|---|---|
| `empresas.slug VARCHAR(50) UNIQUE` | OK | 56, 67 |
| `empresas.grupo_id INTEGER FK→grupos_empresariais` | OK | 59, 64 |
| `empresas.empresa_pai_id INTEGER FK→empresas` | OK | 60, 63 |
| `empresas.tipo` (Enum tipoempresaenum) | OK | 61 |
| `empresas.ordem INTEGER` | OK | 62 |
| `lancamentos_cc.favorecido VARCHAR(300)` | OK | 257 |
| `lancamentos_cc.saldo_banco DOUBLE PRECISION` | OK | 258 |
| `lancamentos_cc.descricao VARCHAR(2000)` | OK | 250 |
| `lancamentos_cc.projeto_omie_id VARCHAR(50)` | OK | 259 |
| `contas_pagar.valor_aberto / status / codigo_cliente_fornecedor / numero_parcela / projeto_omie_id` | OK | 167-173 |
| `contas_receber.valor_aberto / status / codigo_cliente_fornecedor / numero_parcela / projeto_omie_id` | OK | 191-197 |
| `categorias_omie.grupo_dre_override VARCHAR(10)` | OK | 135 |
| `contas_correntes.incluir_bi BOOLEAN NOT NULL DEFAULT TRUE` | OK | 148 (server_default='true') |
| `contas_correntes.is_projecao BOOLEAN NOT NULL DEFAULT FALSE` | OK | 149 (server_default='false') |
| `baixas_financeiras.lancamento_omie_id BIGINT` | OK | 117 |
| Índices `orbit_audit_log` (user, empresa, request) | OK | 297-299 |

Schema **fiel ao state consolidado de prod**. Confirma o que a PR description
afirma ("snapshot autogerado contra models.py após acumular todas as ALTER
TABLE evolutivas").

---

## Score breakdown

| Categoria | Peso | Encontrado |
|---|---|---|
| Bloqueadores (item 9 — CI vermelho) | -20 | **-20** |
| Bloqueador (item 2 — downgrade quebrado em PG, mesma raiz do #9) | -20 | **-0** (mesma causa raiz — não dobrar) |
| Qualidade (gitignore pattern desalinhado) | -5 | **-0** (cosmetic, não conta) |
| Destrutivas | -10 cada | **-10** (downgrade incompleto vaza tipos ENUM = artefato pós-rollback) |

**Score: 100 − 20 − 10 = 70 / 100**

A causa raiz é única (faltam 5 `Enum.drop()` no downgrade), mas atinge dois
critérios distintos da matriz: o CI (bloqueador) e o estado "destrutivo
incompleto" pós-downgrade.

---

## Recomendação

**REQUEST_CHANGES**

A correção é cirúrgica e segura — adicionar 5 linhas no fim da função
`downgrade()` em `alembic/versions/0001_baseline.py`:

```python
def downgrade() -> None:
    # ...drop_tables existentes...
    op.drop_table('grupos_empresariais')

    # PostgreSQL guarda ENUM types como objetos separados — drop_table
    # não os remove. SQLite ignora (não tem ENUM nativo).
    bind = op.get_bind()
    if bind.dialect.name == 'postgresql':
        for enum_name in ('tipoempresaenum', 'tipooperacao',
                          'categoriadocumento', 'statusdocumento',
                          'roleenum'):
            sa.Enum(name=enum_name).drop(bind, checkfirst=True)
```

Depois disso, basta um push para o CI revalidar — deve passar.

### Considerações pós-merge

1. **Smoke E2E em prod**: o autor já marcou como TODO na PR description.
   Crítico: deve aparecer `alembic: banco legado detectado ... marcando
   baseline 0001 como aplicada via stamp` no primeiro boot pós-deploy.

2. **Fase 3B (Numeric)** fica destravada **mesmo com o downgrade quebrado**
   — mas é melhor fechar isso agora antes de empilhar migrations em cima.

3. **psycopg2-binary** é wheel-only (sem build local) — não há risco de
   travamento de build em Railway.

4. **Testes pytest passam em SQLite** porque SQLite não tem ENUM nativos.
   Considerar adicionar um teste opcional que rode `upgrade → downgrade
   → upgrade` no PostgreSQL de CI, espelhando o step Bash atual em pytest
   (`fixture_pg` se já existir). Não bloqueante.

---

## Pontos positivos a destacar

- Runner programático bem desenhado: 3 casos cobertos (vazio, legado, normal)
  com docstring claríssimo.
- Política de stamp em DB legado evita o desastre clássico ("baseline
  rodada em prod recriaria tabelas").
- `compare_type=True` + `compare_server_default=True` já no env.py — pronto
  pra autogenerate da Fase 3B (Float → Numeric).
- CI step novo é exatamente o que pega esse bug — funcionou como esperado.
- Cross-reference 1:1 entre baseline e ALTERs históricos sem omissão.
- 4 testes pytest dedicados cobrem os cenários críticos.

---

## Tempo gasto

~22 minutos (dentro do time-box de 30').
