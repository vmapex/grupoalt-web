# ADR-001 — Localização do motor de DRE (back vs front)

- **Status:** ✅ Aceito (2026-05-14)
- **Data proposta:** 2026-05-12
- **Data aceite:** 2026-05-14
- **Decisor:** Vinicius Menezes (validador financeiro do sistema + tech lead)
- **Áreas afetadas:** frontend (src/lib/), backend (app/), API

## Contexto

O DRE (Demonstrativo de Resultados do Exercício) — saída financeira
mais crítica do portal, número que o gestor lê todo dia — é
calculado **inteiro no frontend**:

- [`src/lib/planoContas.ts`](../../src/lib/planoContas.ts) (367 LOC):
  função `calcularDRE`, agregadores por grupo (RoB, TDCF, CV, CF,
  RNOP, DNOP), `getGrupoDRE` com fallback de prefixo.
- [`src/lib/caixaBuilder.ts`](../../src/lib/caixaBuilder.ts) (394 LOC):
  agregadores trimestrais (`buildQuarterly`), mensais (`buildMonthly`),
  semanais (`buildWeekly`) e breakdowns por categoria/favorecido.

O backend tem **override de grupo DRE por empresa** persistido em
`categorias_omie.grupo_dre_override`, mas a regra de **como** o
agregador soma esses overrides vive no cliente.

Existem **3 fontes para classificar uma categoria** (em ordem de
prioridade no front):

1. `categorias_omie.grupo_dre_override` (DB, por empresa).
2. API (`/empresas/{id}/categorias`).
3. `CATEGORIAS` estático em `planoContas.ts` (mapa hardcoded).
4. Fallback por prefixo do código Omie.

Um **bug conhecido** está documentado em
[`src/lib/planoContas.test.ts:42-43`](../../src/lib/planoContas.test.ts#L42-L43):
estornos com sinal contrário são tratados com `Math.abs(valor)` no
agregador, **inflando RoB e despesas** ao invés de compensá-los.
O teste captura o comportamento atual como baseline, com nota
explícita de que o comportamento esperado depende de validação com
o financeiro.

Sem ADR formal, qualquer refator (Fase 2 do handoff = oracle
financeiro; Fase 4 = corrigir Math.abs) fica refém de discussão de
último minuto.

## Opções consideradas

### Opção A — Manter no frontend

- **Vantagens:**
  - Cliente pode simular cenários hipotéticos (drill-down, what-if)
    sem hit no backend.
  - Bundle já existe e está estável (174 testes verdes hoje).
  - Sem custo de migração.
- **Desvantagens:**
  - Contábil/auditor não lê TypeScript — não há revisão financeira
    do algoritmo.
  - Mudança de regra exige deploy do front (Vercel) + cache busting.
  - Bug `Math.abs` em estornos afeta número visível (validado em
    teste). Sem oracle, qualquer correção é cega.
  - Duplicação real: BI e Portal usam o mesmo `calcularDRE`, mas
    isso é bypassável (qualquer nova tela pode reimplementar).
- **Custo de migração:** zero.

### Opção B — Mover para o backend

- **Vantagens:**
  - Fonte única de verdade, cacheável em Redis (já temos
    infraestrutura).
  - Endpoint dedicado `GET /v1/empresas/{id}/dre?...` testável com
    fixtures reais do financeiro.
  - Auditor consegue replicar a regra fora do código (SQL/planilha).
  - Trivial aplicar oracle financeiro como teste de regressão.
- **Desvantagens:**
  - Refactor grande: 761 LOC TS → Python + endpoint novo.
  - Quebra contrato API (front precisa adaptar 6 telas BI).
  - Latência: round-trip extra por filtro (mitigável com cache).
- **Custo de migração:** 7-10 dias (Fase 4 do handoff), depende
  da Fase 2 (oracle) estar pronta.

### Opção C — Híbrido: regra no back, simulação no front

- **Vantagens:**
  - Endpoint do back é a "verdade contábil" para DRE oficial.
  - Front mantém função leve para simulação/drill-down (não é a
    verdade, é exploração).
  - Compromisso: 80% do benefício da Opção B sem perder UX.
- **Desvantagens:**
  - Risco de divergência silenciosa entre back e front se o
    "front leve" derivar.
  - Exige convenção clara: front nunca pode mostrar número de
    simulação como "DRE oficial".
- **Custo de migração:** ~5 dias (versão simplificada da Opção B).

## Decisão

**✅ Opção B — Mover para o backend.**

Condições prévias satisfeitas:
- Fase 2 (oracle financeiro) concluída em 2026-05-13 (PR #92): 7
  fixtures `verdade-contabil` homologadas pelo validador financeiro
  formam o contrato do endpoint backend.
- Bloco C (regras de estorno, parcial, NEUTRO) homologado em
  2026-05-13. Math.abs reclassificado como tratamento defensivo
  intencional (PR #93), eliminando a "divergência conhecida" que
  preocupava no momento da proposta.

Razões finais:
1. Auditor/contábil consegue replicar a regra fora do código (SQL +
   docs/oracle-financeiro.md).
2. Mudanças de regra ficam num único ponto (backend), com cache
   Redis cross-usuário.
3. Bundle do front fica leve (367+394 LOC removidas).
4. Endpoint testável diretamente contra as fixtures do oracle.

Sobre simulação what-if no cliente (Opção C): não é caso de uso real
hoje. Se virar, abre-se ADR-004 específico.

## Consequências

### Positivas

- Resolve P1-17 do handoff.
- Remove duplicação latente entre BI e Portal (`bi/` e `portal/`).
- Permite cache Redis cross-usuário do DRE consolidado.
- Auditor/contábil replicável fora do código.

### Negativas / aceitas

- Deploy coordenado: back primeiro, front depois.
- Latência extra por hit no back (mitigada com cache).
- ~7-10 dias de refator (Fase 4 do roadmap).

### Mitigações

- Manter `calcularDRE` no front em modo "fallback" por 1 sprint após
  o switch (feature flag), removível após validação em prod.
- Suite oracle (`tests/oracle/fixtures/verdade-contabil/`) roda como
  contrato do endpoint no CI do backend antes do switch.
- Math.abs como tratamento defensivo já documentado (PR #93) — não
  vai haver "mudança silenciosa de número" pro gestor.

## Links

- Handoff: [docs/AUDITORIA_HANDOFF_PRODUCTION_READY.md](../AUDITORIA_HANDOFF_PRODUCTION_READY.md) §4 (P1-17), §5.6, §5.7
- Plano de ação Step 13 — Parte B (Math.abs)
- Issue de discussão: _criar antes da decisão_
- Código relacionado:
  - [`src/lib/planoContas.ts`](../../src/lib/planoContas.ts)
  - [`src/lib/caixaBuilder.ts`](../../src/lib/caixaBuilder.ts)
  - [`src/lib/planoContas.test.ts`](../../src/lib/planoContas.test.ts)
