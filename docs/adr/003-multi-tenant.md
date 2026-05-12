# ADR-003 — Multi-tenant: `empresa_id` vs schema per-empresa

- **Status:** Proposta
- **Data:** 2026-05-12
- **Decisores:** _pendente_ (tech lead + LGPD/jurídico)
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

_Pendente._ Recomendação atual do autor:

**Opção A**. O isolamento físico da B não compensa o custo de
migração e o risco operacional. RBAC + audit log + criptografia
+ revisão LGPD documentada são suficientes para o nível de
compliance esperado (portal interno, não SaaS público multi-cliente).

Antes da decisão final, precisamos confirmar com jurídico/LGPD
que multi-tenant via `empresa_id` é aceitável.

## Consequências

### Positivas (se Opção A)

- Resolve P1-13 do handoff.
- Remove ~300 LOC mortas.
- Simplifica `setup_empresa_schemas` no boot.
- Mantém performance de relatórios consolidados.

### Negativas / aceitas (se Opção A)

- Reforçar testes RBAC para todo endpoint novo.
- Documentar política LGPD explícita
  (`docs/plano-acao-seguranca/lgpd-multi-tenant.md`).

### Mitigações

- Linter custom ou code review que rejeite queries sem
  `WHERE empresa_id = ?` ou sem dep `get_empresa_ctx`.

## Links

- Handoff: [docs/AUDITORIA_HANDOFF_PRODUCTION_READY.md](../AUDITORIA_HANDOFF_PRODUCTION_READY.md) §4 (P1-13), Anexo C
- Issue de discussão: _criar antes da decisão_
- Código relacionado:
  - [app/models/models.py](../../../grupoalt-api/app/models/models.py)
  - [app/models/empresa_models.py](../../../grupoalt-api/app/models/empresa_models.py)
  - [app/services/schema_manager.py](../../../grupoalt-api/app/services/schema_manager.py)
