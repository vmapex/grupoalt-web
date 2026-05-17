# Review — P0-7: soft delete empresa + restore + hard delete protegido

- **PR**: [#77 — feat(admin): P0-7 soft delete empresa + restore + hard delete protegido](https://github.com/vmapex/grupoalt-api/pull/77)
- **Branch**: `feat/p0-7-soft-delete-empresa` (commit `21e8502`)
- **Data do review**: 2026-05-17
- **Auditor**: audit-agent P0-7

---

## TL;DR

PR fecha o último P0 do handoff de auditoria e troca um endpoint
catastroficamente perigoso (`DELETE /admin/empresas/{id}` com body trivial
`{confirmar: true}` disparava hard delete em cascade) por um modelo de 3 camadas
de defesa em profundidade: soft delete reversível, restore explícito e hard
delete real isolado em `/permanent` que exige soft prévio. A migration 0004 é
ADD COLUMN nullable não-destrutiva, o models.py sincroniza, 8 queries
user-facing filtraram `deleted_at IS NULL` (admin paths intencionalmente não
filtram para permitir restore), 15 testes novos passam local (11 E2E + 4 da
migration) e o CI `lint-and-test` está SUCCESS no remote. Encontrei uma
assimetria menor de observabilidade (`/permanent` nome-errado não registra
audit log, enquanto soft delete nome-errado registra) e uma query no admin path
do `routers/notificacoes.py::gerar_alertas` que não filtra soft-deletadas
(mitigada downstream em `gerar_alertas_empresa` que agora retorna 0 — apenas
ineficiência, não vulnerabilidade). Não há blockers.

---

## Recomendação: **APPROVE**

## Score: **94/100**

- −3 pela assimetria de audit log em `/permanent` (nome errado não registra,
  diferente do soft delete) — bug de observabilidade fácil de fechar em
  follow-up de 1 linha.
- −2 pelo admin path em `routers/notificacoes.py::gerar_alertas` (admin
  branch) que não filtra `deleted_at IS NULL` ao montar a lista de empresas
  para gerar alertas. Mitigado pelo skip em `gerar_alertas_empresa` (early
  return 0), então não vaza dado nem dispara IO, só processa um loop a mais
  por empresa soft-deletada. Vale fechar.
- −1 pelas docstrings em PT-BR sem acento (ex.: "Empresa nao encontrada") por
  preferência pessoal — não é regressão, segue o padrão de outras partes do
  módulo, mas merece harmonização futura.

---

## Matriz objetiva — bloqueadores

| # | Critério | Status | Observação |
|---|---|---|---|
| 1 | Migration 0004 cobre `empresas.deleted_at` nullable `DateTime(timezone=True)` com upgrade/downgrade limpos | OK | `op.add_column('empresas', sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True))` no upgrade; `op.drop_column` no downgrade. `revision='0004', down_revision='0003'` — chain bate. |
| 2 | `models.py::Empresa` declara `deleted_at: Mapped[datetime \| None] = mapped_column(DateTime(timezone=True), nullable=True)` | OK | Sincronizado com a migration. Comentário inline contextualiza P0-7 e a semântica (NULL = ativa). |
| 3 | `DELETE /admin/empresas/{id}` (soft) — body `{senha_admin, nome_empresa}`, bcrypt verify, match exato de nome, marca `deleted_at = NOW(tz=utc)`, audit log de sucesso e falhas, 409 se já soft-deletada | OK | Tudo presente. `verify_password(body.senha_admin, admin.senha_hash)` registra `empresa_delete_senha_errada` ao falhar; nome != real registra `empresa_delete_nome_errado`. Sucesso registra `empresa_soft_delete`. Já deletada → 409 com mensagem orientando uso de `/restore` ou `/permanent`. |
| 4 | `POST /admin/empresas/{id}/restore` — zera `deleted_at = None`, 404 se não existe, 409 se não está soft-deletada, audit log com `deleted_at_antes` | OK | Implementação completa. `deleted_at_antes` capturado antes do reset e serializado no detalhe da auditoria. Retorna 200 com mensagem amigável. |
| 5 | `DELETE /admin/empresas/{id}/permanent` — exige soft prévio (409), mesma validação senha + nome, hard delete real (Permissao, UsuarioEmpresa, OmieCredencial, Empresa), audit log | OK | Hard delete em ordem topológica correta. Snapshot de `nome`/`slug` antes do cascade preserva metadados para auditoria. **Assimetria menor**: o branch de nome errado NÃO registra audit log (linha `if body.nome_empresa != empresa.nome` em `admin.py:357-358` só levanta 403). Soft delete trata isso; permanent não. Não bloqueador (senha errada antes já registra), mas inconsistente. |
| 6 | 8 queries user-facing filtraram `deleted_at IS NULL`; admin paths intencionalmente não filtraram | MOSTLY OK | Verificado: `core/deps.py::get_empresa_ctx` ✓, `routers/auth.py:205` ✓, `routers/gestao.py` admin+user paths ✓ (ambos filtram, conforme spec), `routers/grupo.py` (árvore + flat) ✓ (2 queries), `routers/orbit.py:53-55` ✓, `services/orbit_chat.py:255` ✓ (early return string vazia), `services/alertas.py:55-57` ✓ (skip retorna 0), `main.py:225` ✓ (scheduler). **Ponto de atenção**: `routers/notificacoes.py::gerar_alertas` admin branch (linhas 102-107) lista empresas com `OmieCredencial` join sem filtrar `deleted_at IS NULL`. Não vaza dados pq `gerar_alertas_empresa` agora skipa, mas processa loop a mais. |
| 7 | CI verde no PR #77 | OK | `gh pr view 77 --json statusCheckRollup` → CheckRun `lint-and-test` SUCCESS (conclu​ído 15:05:15Z), `state: OPEN`, `mergeable: MERGEABLE`. Step "Validate Alembic migrations (PostgreSQL)" exercita chain `0001→0002→0003→0004` em PG fresh + downgrade base + re-upgrade. |

---

## Matriz objetiva — qualidade

| # | Critério | Status | Observação |
|---|---|---|---|
| 8 | Testes cobrem casos críticos (happy + error paths) | OK | 11 E2E em `test_admin_soft_delete_empresa.py`: success soft, senha errada 403, nome errado 403, já deletada 409, inexistente 404, restore happy, restore-de-ativa 409, permanent-sem-soft 409, permanent-success 204, permanent-senha-errada 403, gestao não-lista soft. 4 da migration: upgrade-adiciona, downgrade-remove, round-trip, default-NULL. 15/15 passam local. |
| 9 | Isolamento entre testes via fixture `empresa_p07` | OK | UUID slug por teste (`f"p07_{uuid.uuid4().hex[:8]}"`) garante zero leak. Cada teste mexe numa empresa diferente; não depende de ordem. |
| 10 | Imports limpos nos arquivos novos | OK | `ruff check` em `0004_empresa_soft_delete.py` + ambos os tests novos → "All checks passed!". Sem `Float` órfão ou `Usuario` não usado. |
| 11 | Audit log estruturado em todas as tentativas | MOSTLY OK | Soft delete: sucesso, senha errada e nome errado — todos registram. Restore: sucesso registra com `deleted_at_antes`. Permanent: sucesso registra; senha errada registra; **nome errado NÃO registra** (vide #5). |
| 12 | Naming consistency com 0001-0003 | OK | Migration 0004 segue padrão `00NN_<slug>.py`, `revision = 'NNNN'`. Endpoint `/permanent` é universalmente entendido; o projeto não tinha padrão prévio. Nome `restore` é canônico. Variável `deleted_at` é o nome industry-standard pra soft delete (vs `is_deleted`/`removed_at`). |

---

## Matriz objetiva — risco

| # | Critério | Status | Observação |
|---|---|---|---|
| 13 | Migration não-destrutiva | OK | `ADD COLUMN` nullable. Em ~4 linhas de prod (estimativa do autor) lock é milisegundos. Sem ALTER COLUMN TYPE (vs 3B que tinha lock por segundos). Reversível via `DROP COLUMN`. |
| 14 | Backward compat — clientes antigos com `{confirmar: true}` recebem 422 | OK | Concordo com o trade-off. Pydantic v2 rejeita schema antigo (422 Unprocessable Entity). Comportamento intencional do PR: a UX migration é menor que o ganho de segurança. **Recomendação**: avisar admin antes do deploy (release notes ou banner no Portal Admin). PR body já documenta o smoke pós-deploy. |
| 15 | Race condition (2 admins simultâneos no soft delete) | OK | Aceitável. O primeiro commit ganha; o segundo recebe 409 idempotente (cobre pelo teste `test_soft_delete_ja_deletada_409`). Sem necessidade de `SELECT FOR UPDATE` ou advisory lock — o estado é binário (NULL vs setado) e a transição é monotônica entre soft e restore. |
| 16 | Hard delete pós-soft com perda de dados | OK | `/permanent` apaga `Permissao` + `UsuarioEmpresa` + `OmieCredencial` + `Empresa` em cascade. PR description orienta snapshot Railway manual antes (vide `docs/operations/backup-policy.md`). Suficiente — o snapshot é a malha de segurança real; o soft delete prévio é a guarda procedural; senha + nome são gates anti-acidente. Defesa em profundidade adequada. |

---

## Pontos positivos

1. **Modelo de 3 endpoints separa intenção** — soft (rev), restore, permanent.
   Cada um tem semântica única e pré-requisitos próprios. Evita o anti-padrão
   "DELETE com query param `?force=true`" comum em APIs ruins.
2. **Defesa em profundidade explícita** — `/permanent` exige (a) soft prévio,
   (b) senha bcrypt, (c) nome exato. Cada gate é ortogonal ao outro: senha
   protege contra session-hijacking, nome contra mistargeting, soft prévio
   contra impulso. Triple gate.
3. **Audit log com detalhes suficientes** — registros incluem `nome_alvo` (em
   senha errada), `nome_enviado` + `nome_real` (em nome errado),
   `deleted_at_antes` (em restore). Investigação pós-incidente fica rica.
4. **Filtragem user-facing centralizada em `get_empresa_ctx`** — qualquer
   endpoint que use o dep injection herda o filtro gratuitamente. Os 7
   routers que usam `Depends(get_empresa_ctx)` (`sync.py`, `cp_cr.py`,
   `dashboard.py`, `extrato.py`, `fluxo_caixa.py`, `conciliacao.py`,
   `export.py`) ganham isolamento de empresas soft-deletadas sem mudança.
5. **Testes negativos generosos** — 11 E2E cobrem todos os branches
   relevantes. Especialmente bom o `test_gestao_lista_nao_inclui_soft_deletada`
   que valida o contrato user-facing E2E, não só unitariamente.
6. **Migration mínima e reversível** — 41 linhas, ADD COLUMN, DROP COLUMN,
   sem dependências exóticas (ENUMs, FKs, índices). Risco operacional
   mínimo.
7. **CI exercita a chain inteira em PG fresh** — step "Validate Alembic
   migrations (PostgreSQL)" usa o ID dinâmico capturado por regex
   (consequência do hotfix `fb2fda2` da Fase 3B), então o CI já está pronto
   pra reconhecer 0004 como head sem mudança no workflow.

---

## Pontos de atenção

1. **Assimetria de audit log no `/permanent` nome-errado** (linha 357-358 de
   `admin.py`). Fix de 1 linha:
   ```python
   if body.nome_empresa != empresa.nome:
       await registrar_auditoria(
           db, usuario_id=admin.id, acao="empresa_permanent_delete_nome_errado",
           entidade="empresa", entidade_id=empresa_id,
           detalhes={"nome_enviado": body.nome_empresa, "nome_real": empresa.nome},
           ip=get_client_ip(request),
       )
       await db.commit()
       raise HTTPException(403, f"...")
   ```
   Follow-up no próximo PR cosmético, não bloqueia.
2. **`routers/notificacoes.py::gerar_alertas` admin branch** não filtra
   `deleted_at IS NULL` ao montar a lista de empresas com credencial. Mitigado
   downstream pelo `gerar_alertas_empresa` (early return 0). Vale fechar pela
   consistência com `main.py:225` (scheduler) que já tem o filtro. Fix:
   ```python
   stmt = (
       select(Empresa.id)
       .join(OmieCredencial, OmieCredencial.empresa_id == Empresa.id)
       .where(Empresa.ativa == True, Empresa.deleted_at.is_(None))
   )
   ```
3. **Pré-existente E712/E741 lint debt** em `app/routers/admin.py`,
   `gestao.py`, `auth.py`, `grupo.py`. O PR adiciona `Empresa.ativa == True`
   em alguns lugares novos (consistente com o padrão local) mas o pattern
   já existia antes. Não introduz regressão.
4. **PR description menciona "~4 linhas de prod"** mas o exemplo do drill de
   backup 2026-05-16 cita 18.885 linhas em outras tabelas. `empresas`
   geralmente é tabela pequena, então OK; só registrar pra futuras
   migrations que toquem outras tabelas usar a métrica empírica.
5. **Smoke pós-deploy crítico**: confirmar
   `SELECT version_num FROM alembic_version` == `0004` e
   `\d empresas` lista `deleted_at` — está no PR description, garantir que
   é executado. Recomendar também smoke do soft delete contra empresa de
   homologação (não prod) com snapshot Railway prévio.

---

## Validações executadas

```bash
python -m pytest tests/test_admin_soft_delete_empresa.py tests/test_alembic_0004_soft_delete.py -v
# 15 passed in 5.72s

python -m pytest --ignore=tests/test_integration.py -q
# 155 passed in 13.11s

python -m ruff check alembic/versions/0004_empresa_soft_delete.py \
                     tests/test_admin_soft_delete_empresa.py \
                     tests/test_alembic_0004_soft_delete.py
# All checks passed!

gh pr view 77 --repo vmapex/grupoalt-api --json statusCheckRollup,state,mergeable
# state=OPEN, mergeable=MERGEABLE, lint-and-test=SUCCESS
```

### Grep paranoia (queries lendo `Empresa` sem filtro user-facing)

Revisado `app/` inteiro. Resultado:

- **Admin paths (intencionais sem filtro)**: `admin.py:143` (`GET /admin/empresas` lista todas, incluindo soft-deletadas — necessário pra UX de restore), `admin.py:190/241/294/337/391/442/699` (lookup por id/slug em endpoints admin — OK).
- **User-facing filtrando corretamente**: `core/deps.py:86`, `auth.py:205`, `gestao.py:487/493`, `grupo.py:116/173`, `orbit.py:53`, `services/orbit_chat.py:255`, `services/alertas.py:55-57`, `main.py:225` (scheduler).
- **Gap encontrado**: `notificacoes.py:103-107` admin branch — vide #2 acima.
- **Routers que usam `Depends(get_empresa_ctx)`** (filtro herdado, OK):
  `sync.py`, `cp_cr.py`, `dashboard.py`, `extrato.py`, `fluxo_caixa.py`,
  `conciliacao.py`, `export.py`. Total 7 routers cobertos sem mudança.

### Docstring vs comportamento

| Endpoint | Docstring promete | Implementação faz | Match? |
|---|---|---|---|
| `DELETE /admin/empresas/{id}` | Soft delete, reversível via /restore, exige senha+nome, audit em falhas | ✓ idem | OK |
| `POST /admin/empresas/{id}/restore` | Zera `deleted_at`, volta a aparecer em queries user-facing | ✓ idem (não precisa senha pois restore é benigno) | OK |
| `DELETE /admin/empresas/{id}/permanent` | Hard delete, irreversível, exige (1) soft prévio (2) senha (3) nome match | ✓ idem, mas nome errado não loga | Quase OK |

---

## Tempo gasto

~22 minutos (dentro do time-box de 30 minutos; complexidade entre 3B e 3C
conforme esperado dado os 8 queries + 3 endpoints + 15 testes novos).
