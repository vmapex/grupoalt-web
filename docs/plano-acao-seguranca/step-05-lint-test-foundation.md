# STEP 05 - Infraestrutura Minima de Lint e Testes Sem Bloqueio Inicial

## Objetivo

Fazer `npm run lint` executar sem prompt interativo e preparar o terreno para testes, sem ainda quebrar o fluxo do time com um backlog grande de lint.

## Por que este step vem depois das dependencias

O lint depende de `eslint-config-next`. Atualizar Next primeiro reduz retrabalho de configuracao.

## Escopo

- Configuracao ESLint;
- scripts de `lint` e `typecheck`;
- base para testes;
- CI ainda pode continuar permissivo neste momento.

## Acoes Detalhadas

1. Criar branch:

```powershell
git checkout -b hardening/lint-test-foundation
```

2. Criar `.eslintrc.json`:

```json
{
  "extends": ["next/core-web-vitals"]
}
```

3. Ajustar scripts no `package.json`:

```json
{
  "scripts": {
    "lint": "next lint",
    "typecheck": "tsc --noEmit --pretty false"
  }
}
```

4. Rodar:

```powershell
npm run lint
npm run typecheck
npm run build
```

5. Se surgirem muitos problemas:
   - corrigir apenas problemas triviais e seguros;
   - nao fazer refactor visual;
   - nao mudar regra de negocio;
   - registrar backlog para etapa posterior.

6. Avaliar ferramenta de testes:
   - Vitest para dominio puro;
   - Testing Library para componentes, em etapa futura.

7. Se instalar Vitest neste step:
   - criar apenas configuracao minima;
   - criar teste smoke simples;
   - nao tentar cobrir toda regra de DRE ainda.

8. Manter CI com `continue-on-error` temporariamente se lint ainda tiver backlog.

## Validacao

- `npm run lint` nao abre prompt.
- `npm run typecheck` passa.
- `npm run build` passa.
- Configuracao nao altera runtime.

## Criterio de Pronto

- Lint executa de forma reprodutivel.
- Existe base para testes ou decisao registrada.
- CI ainda nao bloqueia o time antes da suite estar estabilizada.

## Rollback

Reverter configuracao ESLint e scripts. Nao deve afetar producao.

## Prompt para Execucao

```text
Execute o STEP 05 do plano de acao do grupoalt-web: configurar infraestrutura minima de lint e testes. Faca o npm run lint rodar sem prompt interativo, adicione script typecheck se necessario e prepare a base de testes sem refactor funcional. Rode lint, typecheck e build. Se aparecerem muitos avisos, corrija apenas o essencial e documente o restante.
```
