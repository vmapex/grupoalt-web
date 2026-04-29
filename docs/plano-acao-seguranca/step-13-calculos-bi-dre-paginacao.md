# STEP 13 - Correcao de Calculos BI/DRE e Paginacao

## Objetivo

Garantir que indicadores financeiros nao fiquem incorretos por bug de agrupamento, truncamento de dados ou regra contabil mal validada.

## Por que este step vem depois de rotas e empresa ativa

Primeiro garantimos que o usuario esta na empresa certa e na rota certa. Depois corrigimos numeros.

## Escopo

- `src/lib/planoContas.ts`;
- `src/lib/caixaBuilder.ts`;
- `src/lib/transformers.ts`;
- `src/app/bi/financeiro/page.tsx`;
- `src/app/bi/financeiro/fluxo/page.tsx`;
- `src/app/bi/financeiro/cp-cr/page.tsx`;
- equivalentes em `/portal/financeiro/*`, se ainda forem mantidos.

## Problemas Identificados

1. Semana 5 omitida:
   - `buildWeekly` calcula semana via `Math.ceil(dt.getDate() / 7)`;
   - dias 29, 30 e 31 viram `S5`;
   - retorno atual so inclui `S1` a `S4`.

2. `Math.abs` no DRE:
   - valores de receitas/despesas sao somados como absolutos;
   - pode ser correto se grupo define sinal;
   - pode ser incorreto para estornos, devolucoes ou ajustes.

3. `registros: 500`:
   - CP/CR podem ter mais de 500 registros;
   - KPIs podem truncar total.

4. Fluxo 30d:
   - ha TODO indicando que backend deveria ignorar `data_fim` para retornar sempre 30d.

## Acoes Detalhadas

### Parte A - Semana 5

1. Criar teste que reproduz o problema:
   - lancamento no dia 31;
   - agrupamento semanal;
   - expectativa: valor aparece em `S5`.

2. Ajustar `buildWeekly` para gerar semanas dinamicas.

3. Garantir que meses com 28 dias continuam com S1-S4.

4. Validar meses com 29, 30 e 31 dias.

### Parte B - DRE e Math.abs

1. Reunir exemplos reais com financeiro/controladoria:
   - receita normal;
   - despesa normal;
   - estorno de receita;
   - estorno de despesa;
   - mutuo marcado como NEUTRO.

2. Definir regra:
   - se extrato da API vem com sinal confiavel, usar sinal;
   - se categoria define sinal e API vem inconsistente, manter abs;
   - se origem/categoria indica estorno, tratar explicitamente.

3. Criar testes antes de alterar regra.

4. Aplicar alteracao somente depois de validada com negocio.

### Parte C - Paginacao CP/CR

1. Entender contrato da API:
   - `pagina`;
   - `registros`;
   - total de registros;
   - campos de paginacao.

2. Para KPIs, preferir endpoints agregados:
   - `/cp/resumo`;
   - `/cr/resumo`.

3. Para listas, manter paginação visual.

4. Para calculos que precisam de todos os dados:
   - buscar todas as paginas; ou
   - criar endpoint backend agregado especifico.

5. Evitar carregar milhares de linhas no cliente sem necessidade.

### Parte D - Fluxo 30d

1. Decidir contrato:
   - frontend envia horizonte; ou
   - backend sempre retorna 30d.

2. Se enviar horizonte, preferir:

```text
horizonte_dias=30
```

3. Se nao puder alterar backend agora, documentar comportamento atual.

## Validacao

- Testes de semana 5 passam.
- Casos DRE aprovados pelo negocio.
- KPIs nao dependem de lista truncada.
- Typecheck e build passam.

## Criterio de Pronto

- Numeros financeiros principais sao confiaveis.
- Regras de DRE estao testadas.
- Nao ha truncamento silencioso em KPI.

## Rollback

Se alteracao de DRE mudar numeros inesperadamente, reverter somente a regra e manter testes/casos como evidencia para nova decisao com financeiro.

## Prompt para Execucao

```text
Execute o STEP 13 do plano de acao do grupoalt-web: corrigir calculos BI/DRE e paginacao. Comece por teste e correcao da semana 5 em caixaBuilder. Depois avalie DRE com exemplos reais antes de mudar Math.abs. Revise usos de registros: 500 e substitua KPIs por endpoints agregados ou busca paginada segura. Rode testes, typecheck e build.
```
