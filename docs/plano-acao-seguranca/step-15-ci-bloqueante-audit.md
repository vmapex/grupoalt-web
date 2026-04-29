# STEP 15 - CI Bloqueante e Politica de Audit

## Objetivo

Fazer o CI impedir regressao de build, typecheck, lint, testes e vulnerabilidades de alta severidade.

## Por que este step vem depois de lint/testes

Nao se deve tornar bloqueante aquilo que ainda nao esta configurado ou estabilizado.

## Escopo

Arquivo:

```text
.github/workflows/ci.yml
```

Scripts:

- `lint`;
- `typecheck`;
- `test`;
- `build`;
- `audit:bundle`;
- `audit`.

## Acoes Detalhadas

1. Remover `continue-on-error: true` do lint quando lint estiver estavel.

2. Adicionar ou usar script:

```powershell
npm run typecheck
```

3. Garantir ordem do CI:

```text
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npm run audit:bundle
npm audit --omit=dev --audit-level=high
```

4. Politica sugerida:
   - critical/high em producao bloqueia merge;
   - moderate gera alerta e issue, exceto se for exploravel no app;
   - low/info documenta.

5. Se `npm audit --audit-level=high` falhar por falso positivo:
   - documentar excecao;
   - definir dono;
   - definir data de revisao;
   - criar issue para remover excecao.

6. Garantir que testes rodem sempre que a suite existir.

7. Se ainda nao houver testes, manter condicional temporaria ate STEP 14 estar concluido.

8. Validar workflow em PR.

## Validacao

- PR falha se build/typecheck/lint/test falhar.
- PR falha com vulnerabilidade high/critical nao aceita.
- CI nao depende de prompts interativos.

## Criterio de Pronto

- CI e confiavel e bloqueante.
- Time sabe politica de vulnerabilidade.
- Excecoes sao raras, documentadas e com prazo.

## Rollback

Se CI bloquear todo o fluxo por backlog conhecido, relaxar apenas a etapa especifica temporariamente e abrir issue com dono e prazo.

## Prompt para Execucao

```text
Execute o STEP 15 do plano de acao do grupoalt-web: tornar CI bloqueante para typecheck, lint, testes, build, audit:bundle e npm audit de high/critical. Remova continue-on-error do lint somente se lint estiver estavel. Defina politica de excecao para vulnerabilidades e valide o workflow em PR.
```
