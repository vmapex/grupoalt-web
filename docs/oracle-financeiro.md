# Oracle financeiro — protocolo e estado

> **O que é:** suite parametrizada de fixtures que confronta o motor
> de cálculo do DRE (`src/lib/planoContas.ts::calcularDRE`) com
> valores esperados versionados.
>
> **Por que existe:** §5.6 e §5.8 do
> [handoff](AUDITORIA_HANDOFF_PRODUCTION_READY.md) declaram que
> **qualquer mudança no motor de cálculo é cega sem oracle**.
> Esta suite é o pré-requisito da Fase 4 (mover DRE para o backend)
> e da correção do bug `Math.abs` em estornos.
>
> **Status (2026-05-13):** 🟡 baseline aberta sem dado contábil real.
> 10 cenários cobertos, 1 deles `it.todo` aguardando aval do
> financeiro do Grupo ALT. Nenhum cenário tem hoje o selo
> `verdade-contabil`.

## Onde mora

| Onde | O que tem |
|---|---|
| [tests/oracle/types.ts](../tests/oracle/types.ts) | `FixtureKind`, `FixtureMeta`, `FixtureInput`, `FixtureExpected` |
| [tests/oracle/loader.ts](../tests/oracle/loader.ts) | varredura automática de `fixtures/<grupo>/<id>/` |
| [tests/oracle/oracle.test.ts](../tests/oracle/oracle.test.ts) | runner Vitest parametrizado |
| [tests/oracle/fixtures/](../tests/oracle/fixtures/) | cenários em JSON, agrupados por `kind` |
| [tests/oracle/README.md](../tests/oracle/README.md) | quickstart para adicionar cenário novo |

## Os três modos de fixture

### `verdade-contabil`

Origem aprovada pelo financeiro. `meta.approvedBy` e `meta.approvedAt`
obrigatórios. Falha = regressão real do motor.

> **Hoje:** 0 cenários. Aguarda planilha-mãe do financeiro do Grupo ALT.

### `regression-baseline`

Captura do output ATUAL do `calcularDRE` no commit corrente. Os
números esperados foram derivados manualmente do código, não vêm de
homologação externa.

- **Falha = mudança não justificada do motor.** Ainda detecta bugs
  futuros (alguém apaga uma categoria do `CATEGORIAS`, alguém troca
  o sinal num grupo).
- **NÃO certifica** que a regra está contábilmente correta. Se hoje
  o `Math.abs` está enviesando o número, o snapshot está enviesado
  junto.
- Devem migrar para `verdade-contabil` assim que o financeiro
  homologar o cenário.

> **Hoje:** 5 cenários (S05..S09).

### `known-divergence`

Caso onde a expectativa contábil claramente difere do output atual.
`expected.json` mantém todos os subtotais `null` — porque não temos
ainda o valor "correto" homologado. O runner detecta automaticamente
e converte em `it.todo`.

- Documenta visivelmente o débito contábil.
- Quando o financeiro fornecer o número correto, basta preencher
  `expected.json` e o cenário sai do limbo.

> **Hoje:** 1 cenário (S10 — estorno de receita, bug Math.abs).

### `synthetic`

Cenários fabricados para validar a aritmética da cadeia DRE (não
representam dado real). Servem como sanity check do agregador.

> **Hoje:** 4 cenários (S01..S04).

## Cenários cobertos

| ID | Kind | Cobertura |
|---|---|---|
| [S01-cadeia-dre-completa](../tests/oracle/fixtures/synthetic/S01-cadeia-dre-completa/meta.json) | synthetic | Fórmula completa RoB→RES_LIQ |
| [S02-valor-zero-e-nulo](../tests/oracle/fixtures/synthetic/S02-valor-zero-e-nulo/meta.json) | synthetic | Robustez: valores 0 e categoria null |
| [S03-categoria-sem-mapeamento](../tests/oracle/fixtures/synthetic/S03-categoria-sem-mapeamento/meta.json) | synthetic | Códigos desconhecidos são descartados |
| [S04-fallback-prefixo](../tests/oracle/fixtures/synthetic/S04-fallback-prefixo/meta.json) | synthetic | Sufixo desconhecido cai em fallback por prefixo |
| [S05-receita-bruta-mes](../tests/oracle/fixtures/regression-baseline/S05-receita-bruta-mes/meta.json) | regression-baseline | Agregador puro de RoB com várias categorias `1.01.x` |
| [S06-dre-completa-mes-tipico](../tests/oracle/fixtures/regression-baseline/S06-dre-completa-mes-tipico/meta.json) | regression-baseline | Mês típico de PME com todos os grupos (exceto NOP) |
| [S07-neutro-via-map](../tests/oracle/fixtures/regression-baseline/S07-neutro-via-map/meta.json) | regression-baseline | NEUTRO via `categoriaMap` exclui do agregador |
| [S08-override-empresa-cv-vira-neutro](../tests/oracle/fixtures/regression-baseline/S08-override-empresa-cv-vira-neutro/meta.json) | regression-baseline | Override por empresa vence CATEGORIAS estático |
| [S09-multi-grupo-com-snop](../tests/oracle/fixtures/regression-baseline/S09-multi-grupo-com-snop/meta.json) | regression-baseline | Cadeia EBT1→SNOP→EBT2→RES_LIQ com NOP + IRPJ/CSLL |
| [S10-estorno-receita](../tests/oracle/fixtures/known-divergence/S10-estorno-receita/meta.json) | **known-divergence** | Bug `Math.abs` em estorno de receita — `it.todo` |

## Tabela de divergências conhecidas

| ID | Cenário | Saída atual | Saída esperada | Motivo da divergência | Decisão pendente |
|---|---|---|---|---|---|
| S10 | `1.01.01` com +1000 e -200 | RoB=1200 | RoB=800 *(provável)* | `calcularDRE` usa `Math.abs(r.valor)` no agregador ([planoContas.ts:225](../src/lib/planoContas.ts#L225)) — estorno é tratado como nova receita | Financeiro precisa decidir: estornos devem compensar o lançamento original? (Bloco C, pergunta 1 do prompt de Fase 2.) |

Outras divergências em potencial (não cobertas como fixture ainda
porque o ASSERT esperado depende da decisão do financeiro):

- Devolução de despesa lançada como valor positivo na mesma
  categoria — soma em vez de compensar. Cobertura parcial em
  `planoContas.test.ts:52-60`.
- Parcial (`PARCIAL`) com `valor_pago > 0` e `valor_pago < valor`
  — entra no DRE pelo `valor_pago` (regime de caixa) ou pelo `valor`
  cheio (regime de competência)? Decisão do financeiro (Bloco C,
  pergunta 2).

## Tolerâncias

Por padrão, asserções são **exatas** (`expect(actual).toBe(expected)`).
Para cenários reais com arredondamento (centavos), use
`expected.tolerance`:

```json
{
  "RoB": 150000.0,
  "tolerance": { "perField": 1.0 }
}
```

ou por subtotal:

```json
{
  "RoB": 150000.0,
  "CV": 50000.0,
  "tolerance": { "perSubtotal": { "RoB": 0.50, "CV": 0.10 } }
}
```

Recomendação ao adotar `verdade-contabil` real:

- **±R$ 0,01 por subtotal** quando o financeiro aprovar com
  precisão de centavo.
- **±R$ 1,00 por subtotal** quando o financeiro aprovar com
  precisão de real (planilha que truncou centavo).
- Sem tolerância (exato) em cenários sintéticos.

A tolerância acordada deve ser registrada em `meta.notes`.

## Como adicionar um cenário novo

1. Criar `tests/oracle/fixtures/<grupo>/<id>/` (ver `kind` em
   `types.ts`).
2. Escrever `meta.json` com `id`, `kind`, `source`, `description`.
3. Escrever `input.json` com lançamentos (formato
   `FixtureLancamento`).
4. Escrever `expected.json`:
   - `verdade-contabil` / `regression-baseline`: todos os subtotais
     que o cenário cobre.
   - `synthetic`: subtotais relevantes (campos omitidos não são
     checados).
   - `known-divergence`: todos os subtotais `null` até financeiro
     liberar.
5. Rodar `npm test -- tests/oracle` para confirmar que o runner pega.
6. Commit em PR pequeno (≤ 300 linhas), com link para esta tabela.

## Como o financeiro deve homologar um cenário

> Idealmente para a Fase 2 do plano de auditoria.

1. **Insumo:** lançamentos crus de um mês fechado (extrato + CP +
   CR + baixas), exportável em CSV/JSON.
2. **Verdade contábil:** DRE consolidado do mesmo mês com os
   subtotais (RoB, TDCF, CV, CF, RNOP, DNOP, IRPJ, CSLL, RES_LIQ).
3. **Tolerância acordada:** ±R$ X por subtotal (negociar).
4. **Decisões de regra contábil** (Bloco C do prompt):
   - Estornos compensam ou somam?
   - Parciais entram por caixa ou competência?
   - NEUTRO inclui o quê?
5. **Aprovação:** nome + cargo + data, gravados em
   `meta.approvedBy` / `meta.approvedAt`.

Procedimento de import:

```bash
# 1. Estruturar fixture
mkdir -p tests/oracle/fixtures/verdade-contabil/<empresa>-<YYYYMM>/
# 2. Converter CSV do financeiro para input.json (script em backlog)
# 3. Preencher expected.json com a DRE homologada
# 4. PR de revisão
```

## Bloqueios respeitados nesta entrega

- ❌ **Não alterei** `src/lib/planoContas.ts`.
- ❌ **Não alterei** `src/lib/caixaBuilder.ts`.
- ❌ **Não migrei** tipos do banco.
- ❌ **Não toquei** em produção, Railway, Vercel ou banco real.
- ✅ Adicionei `tests/**/*.test.ts` ao `vitest.config.ts` para
  habilitar a suite fora de `src/` — única mudança fora de
  arquivos novos.

## Links

- [Handoff §5.6 — Necessidade de oracle financeiro](AUDITORIA_HANDOFF_PRODUCTION_READY.md)
- [Handoff §5.7 — Motor de cálculo sem fonte única](AUDITORIA_HANDOFF_PRODUCTION_READY.md)
- [ADR-001 — Localização do motor de DRE](adr/001-dre-localizacao.md)
- [planoContas.ts:198-205 — docstring do bug Math.abs](../src/lib/planoContas.ts#L198-L205)
- [planoContas.test.ts:42-43 — baseline do bug](../src/lib/planoContas.test.ts#L42-L43)
