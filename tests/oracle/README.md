# Oracle financeiro — fixtures versionadas

> **Nota (PR-6 / Fase 5.G, 2026-06-29):** o motor DRE local (`calcularDRE`) foi
> removido do front (o backend `/dre` é a fonte única — ADR-001), e o harness TS
> desta suíte (`oracle.test.ts`, `loader.ts`, `types.ts`) saiu junto. **As fixtures
> abaixo permanecem como FONTE DE VERDADE** — sincronizadas para o oracle do backend
> via `grupoalt-api/scripts/sync_oracle_fixtures.py` (CI roda `--dry-run`), que valida
> `app/domain/financeiro/dre.py::calcular_dre` contra estes mesmos cenários.

As fixtures (`verdade-contabil`, `regression-baseline`, `known-divergence`)
documentam a verdade contábil homologada. Protocolo completo em
[../../docs/oracle-financeiro.md](../../docs/oracle-financeiro.md).

## Para adicionar um cenário

```
tests/oracle/fixtures/<grupo>/<id>/
├── meta.json       # FixtureMeta — id, kind, source, description, approvedBy
├── input.json      # FixtureInput — lancamentos + categoriaMap opcional
└── expected.json   # FixtureExpected — subtotais (null = TODO)
```

O oracle do backend descobre fixturas automaticamente via seu loader.
Pastas sem os três JSONs são silenciosamente puladas (úteis como
placeholders enquanto se espera dado do financeiro).

## Para promover known-divergence → verdade-contabil

1. Financeiro fornece o valor "correto" assinado.
2. Preencha `expected.json` com os subtotais.
3. Mude `meta.kind` para `verdade-contabil` e adicione
   `approvedBy` + `approvedAt`.
4. O runner sai de `it.todo` automaticamente.

## Para rodar só esta suite

```bash
npm test -- tests/oracle
```
