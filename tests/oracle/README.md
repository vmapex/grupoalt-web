# Oracle financeiro — fixtures versionadas

Suite parametrizada que valida `src/lib/planoContas.ts::calcularDRE`
contra três modos de fixture: `verdade-contabil`, `regression-baseline`
e `known-divergence`. Protocolo completo em
[../../docs/oracle-financeiro.md](../../docs/oracle-financeiro.md).

## Para adicionar um cenário

```
tests/oracle/fixtures/<grupo>/<id>/
├── meta.json       # FixtureMeta — id, kind, source, description, approvedBy
├── input.json      # FixtureInput — lancamentos + categoriaMap opcional
└── expected.json   # FixtureExpected — subtotais (null = TODO)
```

O `oracle.test.ts` descobre fixturas automaticamente via `loader.ts`.
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
