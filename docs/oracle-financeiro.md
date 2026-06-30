# Oracle financeiro — protocolo e estado

> **O que é:** suite parametrizada de fixtures que confronta o motor
> de cálculo do DRE (`src/lib/planoContas.ts::calcularDRE`) com
> valores esperados versionados.
>
> **Por que existe:** §5.6 e §5.8 do
> [handoff](AUDITORIA_HANDOFF_PRODUCTION_READY.md) declaram que
> **qualquer mudança no motor de cálculo é cega sem oracle**.
> Esta suite é o pré-requisito da Fase 4 (mover DRE para o backend).
>
> **Status (2026-05-13):** 🟢 baseline aprovado pelo validador
> financeiro do sistema. 11 cenários cobertos (4 synthetic + 7
> verdade-contabil), **zero divergências conhecidas**. Decisões de
> regra (estorno, parcial, NEUTRO) homologadas — ver §"Bloco C
> respondido" abaixo.

## Onde mora

| Onde | O que tem |
|---|---|
| [tests/oracle/types.ts](../tests/oracle/types.ts) | `FixtureKind`, `FixtureMeta`, `FixtureInput`, `FixtureExpected` |
| [tests/oracle/loader.ts](../tests/oracle/loader.ts) | varredura automática de `fixtures/<grupo>/<id>/` |
| [tests/oracle/oracle.test.ts](../tests/oracle/oracle.test.ts) | runner Vitest parametrizado |
| [tests/oracle/fixtures/](../tests/oracle/fixtures/) | cenários em JSON, agrupados por `kind` |
| [tests/oracle/README.md](../tests/oracle/README.md) | quickstart para adicionar cenário novo |

## Bloco C respondido (2026-05-13)

Decisões do validador financeiro do sistema (`vmenezestreinamentos@gmail.com`,
papel: validador financeiro do Grupo ALT).

### Pergunta 1 — Estornos

> "Não existe lançamento negativo para categoria de entrada
> (valores positivos). Nesse caso o -200 deveria ser classificado
> com alguma categoria de saída."

**Regra:** estornos NÃO usam sinal negativo numa categoria de entrada.
Estornos têm **categoria própria**:

- Estorno de venda (devolução ao cliente, saída de caixa)
  → `2.14.99 (-)ESTORNO` em **DNOP** (positivo na categoria).
- Estorno de despesa (devolução de fornecedor, entrada de caixa)
  → `1.02.99 (+)ESTORNO` em **RNOP** (positivo na categoria).

**Implicação para `Math.abs` em [planoContas.ts:225](../src/lib/planoContas.ts#L225):**
é **tratamento defensivo contra erro de classificação no input**,
não bug. Se aparecer `-200` em `1.01.01` (RoB), isso é um erro do
financeiro a sinalizar, não um cálculo a fazer. O sistema mascara o
erro (somando o módulo) para evitar números absurdos na DRE — não
o consagra como dado válido.

> ~~**Pendência menor:** docstring/teste desalinhados com a decisão.~~
> **Resolvida** em `bffcf3b` (docs(planoContas): Math.abs é tratamento
> defensivo, não limitação) — docstring de `calcularDRE` e nome do
> teste já refletem a decisão homologada.

### Pergunta 2 — Parciais (PARCIAL)

**Regra:** regime de caixa. Pagamentos parciais entram na DRE pelo
`valor_pago` (3 baixas de R$ 100 → DRE consome R$ 300). O saldo
em aberto fica em CP/CR e **não** aparece na DRE até ser efetivamente
pago.

**Implicação no código:** `calcularDRE` consome `lancamentos` do
extrato (que são baixas efetivas), então **o sistema já trabalha em
regime de caixa por construção**. Sem mudança a fazer. Cenário S11
documenta o comportamento desejado para impedir regressão futura
("alguém tentar incluir CP aberto na DRE").

### Pergunta 3 — NEUTRO

**Regra:** repasses intra-grupo / transferências internas marcados
como `NEUTRO`:

- ❌ **Não constam** em RoB, TDCF, CV, CF, RNOP, DNOP, IRPJ, CSLL,
  RES_LIQ.
- ✅ **Constam** em extrato bancário e conciliação (para auditoria).

**Implicação no código:** comportamento atual confirmado. Sem mudança.

## Os modos de fixture

### `verdade-contabil`

Origem aprovada pelo validador financeiro do sistema. `meta.approvedBy`
e `meta.approvedAt` obrigatórios. Falha = regressão real do motor.

> **Hoje:** **7 cenários** (S05..S11) — todos homologados em
> 2026-05-13.

### `synthetic`

Cenários fabricados para validar a aritmética da cadeia DRE.
Não representam dado contábil real, mas garantem que a fórmula
(`RL = RoB - TDCF`, `MC = RL - CV`, etc.) está correta.

> **Hoje:** 4 cenários (S01..S04).

### `regression-baseline`

Snapshot do output atual quando o financeiro ainda não validou. Pode
existir entre uma feature de cálculo nova e a homologação contábil
correspondente.

> **Hoje:** 0 cenários (todos foram promovidos a `verdade-contabil`
> em 2026-05-13).

### `known-divergence`

Caso onde a expectativa contábil claramente difere do output atual.
`expected.json` mantém todos os subtotais `null` até o financeiro
liberar o valor "correto". O runner detecta automaticamente e
converte em `it.todo`.

> **Hoje:** **0 cenários**. O caso anterior (S10 com lançamento
> negativo em 1.01.01) foi removido porque o financeiro confirmou
> que esse input é anti-padrão, não verdade contábil.

## Cenários cobertos

| ID | Kind | Cobertura |
|---|---|---|
| [S01-cadeia-dre-completa](../tests/oracle/fixtures/synthetic/S01-cadeia-dre-completa/meta.json) | synthetic | Fórmula completa RoB→RES_LIQ |
| [S02-valor-zero-e-nulo](../tests/oracle/fixtures/synthetic/S02-valor-zero-e-nulo/meta.json) | synthetic | Robustez: valores 0 e categoria null |
| [S03-categoria-sem-mapeamento](../tests/oracle/fixtures/synthetic/S03-categoria-sem-mapeamento/meta.json) | synthetic | Códigos desconhecidos são descartados |
| [S04-fallback-prefixo](../tests/oracle/fixtures/synthetic/S04-fallback-prefixo/meta.json) | synthetic | Sufixo desconhecido cai em fallback por prefixo |
| [S05-receita-bruta-mes](../tests/oracle/fixtures/verdade-contabil/S05-receita-bruta-mes/meta.json) | **verdade-contabil** | Agregador puro de RoB com várias categorias `1.01.x` |
| [S06-dre-completa-mes-tipico](../tests/oracle/fixtures/verdade-contabil/S06-dre-completa-mes-tipico/meta.json) | **verdade-contabil** | Mês típico de PME com todos os grupos (exceto NOP) |
| [S07-neutro-via-map](../tests/oracle/fixtures/verdade-contabil/S07-neutro-via-map/meta.json) | **verdade-contabil** | NEUTRO via `categoriaMap` exclui do agregador (regra confirmada) |
| [S08-override-empresa-cv-vira-neutro](../tests/oracle/fixtures/verdade-contabil/S08-override-empresa-cv-vira-neutro/meta.json) | **verdade-contabil** | Override por empresa vence CATEGORIAS estático |
| [S09-multi-grupo-com-snop](../tests/oracle/fixtures/verdade-contabil/S09-multi-grupo-com-snop/meta.json) | **verdade-contabil** | Cadeia EBT1→SNOP→EBT2→RES_LIQ com NOP + IRPJ/CSLL |
| [S10-estorno-via-categoria-propria](../tests/oracle/fixtures/verdade-contabil/S10-estorno-via-categoria-propria/meta.json) | **verdade-contabil** | Modelo correto de estorno: venda 1.01.01 + estorno 2.14.99 → SNOP=-200 |
| [S11-parcial-regime-caixa](../tests/oracle/fixtures/verdade-contabil/S11-parcial-regime-caixa/meta.json) | **verdade-contabil** | 3 baixas de R$ 100 de um CP de R$ 1000 → DRE consome R$ 300 |

## Tabela de divergências conhecidas

> **Nenhuma.** Após a homologação do Bloco C em 2026-05-13, todos os
> cenários cobertos passam contra `calcularDRE` atual.

Discrepâncias futuras que apareçam (ex: ao adicionar fixture com
dado real de mês fechado) devem entrar nesta tabela com:
- ID do cenário
- Saída atual
- Saída esperada
- Causa provável
- PR de correção

## Documentação desalinhada (RESOLVIDA)

Corrigida em `bffcf3b` — `docs(planoContas): Math.abs é tratamento
defensivo, não limitação`:

- [planoContas.ts:198-215](../src/lib/planoContas.ts#L198-L215) — docstring de `calcularDRE` documenta a regra de sinal homologada (estornos via categoria própria; `Math.abs` como tratamento defensivo contra anti-padrão de input).
- [planoContas.test.ts:44](../src/lib/planoContas.test.ts#L44) — teste renomeado para `'valor negativo em receita e somado em modulo (tratamento defensivo)'`.

## Tolerâncias

Por padrão, asserções são **exatas** (`expect(actual).toBe(expected)`).
Para cenários com arredondamento (centavos vindos de planilha
financeira), use `expected.tolerance`:

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

Recomendação ao adotar cenário com dado real:

- **±R$ 0,01 por subtotal** quando a planilha do financeiro mantém
  precisão de centavo.
- **±R$ 1,00 por subtotal** quando truncar centavo.
- Sem tolerância (exato) em cenários sintéticos.

A tolerância acordada deve ser registrada em `meta.notes`.

## Como adicionar um cenário novo

1. Criar `tests/oracle/fixtures/<grupo>/<id>/` (ver `kind` em
   `types.ts`).
2. Escrever `meta.json` com `id`, `kind`, `source`, `description`.
3. Escrever `input.json` com lançamentos (formato
   `FixtureLancamento`).
4. Escrever `expected.json` (todos os subtotais que o cenário cobre).
5. Rodar `npm test -- tests/oracle` para confirmar que o runner pega.
6. Commit em PR pequeno (≤ 300 linhas), com link para esta tabela.

## Como homologar um cenário novo

> Para quando aparecer mês real (lançamentos vindos da Omie) ou
> regra de negócio nova.

1. **Insumo:** lançamentos crus de um mês fechado (extrato + CP +
   CR + baixas), exportável em CSV/JSON.
2. **Verdade contábil:** DRE consolidado do mesmo mês com os
   subtotais (RoB, TDCF, CV, CF, RNOP, DNOP, IRPJ, CSLL, RES_LIQ) —
   pode vir de planilha do validador ou da contabilidade.
3. **Tolerância acordada:** ±R$ X por subtotal (centavo vs real).
4. **Aprovação:** nome + cargo + data, gravados em
   `meta.approvedBy` / `meta.approvedAt`.

Estrutura sugerida:

```
tests/oracle/fixtures/verdade-contabil/<empresa>-<YYYYMM>/
├── meta.json
├── input.json
└── expected.json
```

Quando montar um mês real em Excel para fixture: 1 mês fechado é
suficiente para um cenário, mas 3-6 meses dão maior cobertura
estatística (capturam variações sazonais e edge cases). Pode ser
incremental — fixturar 1 mês primeiro, observar 1 sprint, adicionar
os próximos.

## Bloqueios respeitados nesta entrega

- ❌ **Não alterei** `src/lib/planoContas.ts`.
- ❌ **Não alterei** `src/lib/caixaBuilder.ts`.
- ❌ **Não alterei** `src/lib/planoContas.test.ts`.
- ❌ **Não migrei** tipos do banco.
- ❌ **Não toquei** em produção, Railway, Vercel ou banco real.
- ✅ Adicionei `tests/**/*.test.ts` ao `vitest.config.ts` para
  habilitar a suite fora de `src/`.

## Links

- [Handoff §5.6 — Necessidade de oracle financeiro](AUDITORIA_HANDOFF_PRODUCTION_READY.md)
- [Handoff §5.7 — Motor de cálculo sem fonte única](AUDITORIA_HANDOFF_PRODUCTION_READY.md)
- [ADR-001 — Localização do motor de DRE](adr/001-dre-localizacao.md)
- [planoContas.ts:198-215 — docstring da regra de sinal (atualizada em bffcf3b)](../src/lib/planoContas.ts#L198-L215)
- [planoContas.test.ts:44 — teste do tratamento defensivo](../src/lib/planoContas.test.ts#L44)
