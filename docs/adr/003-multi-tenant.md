# ADR-003 — Multi-tenant: `empresa_id` vs schema per-empresa

- **Status:** ✅ Aceito (2026-05-14)
- **Data proposta:** 2026-05-12
- **Data aceite:** 2026-05-14
- **Decisor:** Vinicius Menezes (tech lead, decisão técnica; LGPD/jurídico aceito como portal interno)
- **Áreas afetadas:** backend (app/models/, app/services/schema_manager.py)

## Contexto

O backend **co-existe com dois modelos de multi-tenant** incompatíveis,
e isso é um débito técnico identificado pelo handoff (P1-13):

### Modelo em uso

- [app/models/models.py](../../../grupoalt-api/app/models/models.py)
  define 22 tabelas no **schema `public`** com `empresa_id` como
  discriminador.
- 100% dos routers usam esse modelo.

### Modelo declarado mas não consumido

- [app/models/empresa_models.py](../../../grupoalt-api/app/models/empresa_models.py)
  define tabelas no **schema `per_empresa`**, traduzido em runtime
  para `emp_{slug}` por
  [app/services/schema_manager.py](../../../grupoalt-api/app/services/schema_manager.py).
- Nenhum router consome.
- [app/main.py:setup_empresa_schemas](../../../grupoalt-api/app/main.py)
  cria os schemas físicos no boot via DDL inline (que **diverge**
  dos modelos SQLAlchemy).
- Schemas existem fisicamente mas estão vazios.

Resultado: drift silencioso entre dois universos. Quem adicionar
coluna em uma das tabelas, sem percebermos, pode esquecer da outra.

## Opções consideradas

### Opção A — Manter `empresa_id` (deletar `empresa_models.py`)

- **Vantagens:**
  - Simplifica o mental model — uma única fonte de verdade.
  - Remove ~300 LOC mortas + DDL inline.
  - Performance: queries cross-empresa (relatórios consolidados de
    grupo empresarial) são triviais.
- **Desvantagens:**
  - Vazamento por `WHERE empresa_id = X` esquecido é um único bug
    distante de catastrófico (já temos testes RBAC + middleware
    `get_empresa_ctx`).
  - LGPD: pode ser questionável em auditoria — dados de empresas
    diferentes no mesmo schema. Aceitável com criptografia +
    audit log + RBAC, mas exige documentação explícita.
- **Custo de migração:** 1 dia (deletar arquivos + remover boot
  `setup_empresa_schemas`).

### Opção B — Migrar para `emp_{slug}` (schema-per-empresa)

- **Vantagens:**
  - Isolamento físico: vazamento entre empresas exige bug de
    `SET search_path` (mais raro).
  - LGPD/auditoria: argumento mais forte de isolamento.
  - Drop empresa = drop schema (limpa de uma vez).
- **Desvantagens:**
  - Refator brutal: todos os routers precisam usar
    `schema_translate_map` ou prefixo dinâmico.
  - Migração de dados: copiar 22 tabelas × N empresas para schemas
    novos com lock.
  - Queries cross-empresa (consolidado de grupo) ficam caras
    (UNION ALL N schemas).
  - Operacional: backup/restore por empresa fica mais granular
    mas mais complexo.
- **Custo de migração:** 4-6 semanas + validação financeira.

### Opção C — Manter ambos com plano de extinção

- **Vantagens:**
  - Zero esforço imediato.
- **Desvantagens:**
  - Acumula débito — drift continua a aumentar conforme `models.py`
    evolui.
  - Sinaliza "estamos pensando" sem decidir.
- **Custo de migração:** zero hoje, alto amanhã.

## Decisão

**✅ Opção A — Manter `empresa_id` (deletar `empresa_models.py`).**

Razões finais:
1. Portal interno do Grupo ALT — não é SaaS público multi-cliente
   onde isolamento físico é exigência regulatória forte.
2. RBAC já existe (29 testes em `lib/access.ts` + middleware
   `get_empresa_ctx`). Criptografia de credenciais Omie via Fernet.
   Audit log estruturado (`LogAuditoria`, `OrbitAuditLog`).
3. Custo da Opção B (4-6 semanas + risco operacional + complexidade
   de relatórios consolidados) supera benefício marginal de
   isolamento físico para este contexto.
4. Drift atual (`models.py` em uso vs `empresa_models.py` órfão) é
   débito visível — eliminá-lo simplifica mental model.

LGPD: aceito como portal interno. Política explícita a ser registrada
em `docs/plano-acao-seguranca/lgpd-multi-tenant.md` (não bloqueia
esta decisão; pode ser PR separado).

## Consequências

### Positivas

- Resolve P1-13 do handoff.
- Remove ~300 LOC mortas.
- Simplifica `setup_empresa_schemas` no boot.
- Mantém performance de relatórios consolidados.

### Negativas / aceitas

- Reforçar testes RBAC para todo endpoint novo.
- Documentar política LGPD explícita em
  `docs/plano-acao-seguranca/lgpd-multi-tenant.md` (próximo).
- Operacional: `WHERE empresa_id = ?` esquecido vira bug de RBAC —
  já mitigado por testes mas exige disciplina constante.

### Mitigações

- Linter custom ou code review checklist que rejeite queries sem
  `WHERE empresa_id = ?` ou sem dep `get_empresa_ctx`.
- Suite RBAC (`tests/test_rbac.py` — 26 testes hoje) cobre
  cross-empresa em endpoints críticos.
- Cleanup: 1 PR pequeno deleta `empresa_models.py` +
  `schema_manager._create_tables_in_schema` + chamada em `main.py`.

## Links

- Handoff: [docs/AUDITORIA_HANDOFF_PRODUCTION_READY.md](../AUDITORIA_HANDOFF_PRODUCTION_READY.md) §4 (P1-13), Anexo C
- Issue de discussão: _criar antes da decisão_
- Código relacionado:
  - [app/models/models.py](../../../grupoalt-api/app/models/models.py)
  - [app/models/empresa_models.py](../../../grupoalt-api/app/models/empresa_models.py)
  - [app/services/schema_manager.py](../../../grupoalt-api/app/services/schema_manager.py)
