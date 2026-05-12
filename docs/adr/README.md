# Architecture Decision Records (ADRs)

Este diretório registra **decisões arquiteturais** do Portal Financeiro
Grupo ALT. Cada ADR é um documento curto e imutável capturando:

- O contexto que motivou a decisão.
- As opções consideradas e seus trade-offs.
- A decisão escolhida e o porquê.
- As consequências (positivas e negativas) que aceitamos.

## Formato

Cada ADR segue o template em [template.md](template.md). Numeração
sequencial (`001-`, `002-`, ...). Status possíveis:

- **Proposta** — em discussão; não decidida.
- **Aceita** — em vigor.
- **Substituída** — superada por outro ADR (referenciar o sucessor).
- **Rejeitada** — discutida e descartada (manter para histórico).

## Por que escrever ADR?

Decisões arquiteturais têm consequências de longo prazo (custo de
mudança alto). Sem ADR, o **porquê** se perde e o time refaz a
discussão a cada nova geração. Com ADR, o histórico é auditável e
revisões futuras partem de premissas claras.

## ADRs ativos

| # | Título | Status |
|---|---|---|
| [001](001-dre-localizacao.md) | Localização do motor de DRE (back vs front) | Proposta |
| [002](002-sync-omie-async.md) | Sync Omie síncrono vs assíncrono | Proposta |
| [003](003-multi-tenant.md) | Multi-tenant: `empresa_id` vs schema per-empresa | Proposta |

## Onde a decisão acontece

ADRs em "Proposta" devem ser discutidos em Issue dedicada (uma issue
por ADR, label `adr`) ou em sessão presencial com stakeholders. A
decisão final é registrada **no próprio ADR** + reflexo em commit
seguinte que implementa.
