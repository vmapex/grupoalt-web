# STEP 14 - Suite de Testes de Dominio e Stores

## Objetivo

Criar uma rede minima de testes automatizados para impedir regressao nas regras mais sensiveis.

## Por que este step vem depois das correcoes de calculo

Alguns testes devem consolidar comportamento corrigido. Fazer antes pode gerar retrabalho se a regra final ainda estiver em decisao.

## Escopo

Testes de dominio puro:

- `src/lib/planoContas.ts`;
- `src/lib/caixaBuilder.ts`;
- `src/lib/formatters.ts`;
- `src/lib/transformers.ts`.

Testes de estado:

- `src/store/authStore.ts`;
- `src/store/empresaStore.ts`;
- `src/hooks/useEmpresaId.ts`, se viavel.

## Ferramenta Recomendada

Vitest para testes unitarios.

## Acoes Detalhadas

1. Instalar Vitest:

```powershell
npm install -D vitest
```

2. Adicionar scripts:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

3. Criar arquivos:

```text
src/lib/planoContas.test.ts
src/lib/caixaBuilder.test.ts
src/lib/transformers.test.ts
src/store/empresaStore.test.ts
```

4. Casos minimos para `planoContas`:
   - `1.01.*` entra em RoB;
   - `2.03.*` entra em CV;
   - `NEUTRO` e excluido;
   - override vindo da API tem prioridade;
   - categoria desconhecida retorna null ou fallback esperado.

5. Casos minimos para `caixaBuilder`:
   - agrupa por mes;
   - agrupa por trimestre;
   - inclui semana 5;
   - ignora data invalida;
   - exclui NEUTRO.

6. Casos minimos para `transformers`:
   - CP/CR convertem status corretamente;
   - datas invalidas nao quebram;
   - valores numericos sao preservados.

7. Casos minimos para empresa ativa:
   - activeId persistido valido e mantido;
   - activeId persistido invalido e descartado;
   - logout/login nao vaza empresa anterior.

8. Rodar:

```powershell
npm test
npm run typecheck
npm run build
```

## Validacao

- Testes passam localmente.
- Testes rodam em CI.
- Testes cobrem regras criticas.
- Build e typecheck continuam passando.

## Criterio de Pronto

- Existe suite minima.
- Regras de DRE e empresa ativa estao protegidas.
- CI pode evoluir para bloquear testes.

## Prompt para Execucao

```text
Execute o STEP 14 do plano de acao do grupoalt-web: adicionar suite minima de testes de dominio e stores com Vitest. Cubra planoContas, caixaBuilder, transformers e selecao de empresa ativa. Inclua casos para NEUTRO, overrides, semana 5, datas invalidas e activeId persistido invalido. Rode npm test, typecheck e build.
```
