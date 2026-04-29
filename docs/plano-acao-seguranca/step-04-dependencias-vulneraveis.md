# STEP 04 - Atualizacao Minima de Dependencias Vulneraveis

## Objetivo

Eliminar vulnerabilidades conhecidas de producao com a menor mudanca possivel, antes de mexer em auth, RBAC ou arquitetura.

## Por que este step vem agora

Dependencias vulneraveis, especialmente Next.js, sao risco transversal. Corrigir isso primeiro reduz superficie de ataque sem depender de refactors.

## Escopo

Atualizacao conservadora:

- `next` de `14.2.5` para patch seguro da linha 14, inicialmente `14.2.35`;
- `eslint-config-next` alinhado;
- `axios` para versao corrigida;
- `postcss`, se audit indicar;
- avaliar transitive dependencies:
  - `recharts -> lodash`;
  - `jspdf -> dompurify`;
  - `axios -> follow-redirects`.

Nao migrar para Next 16 neste step, a menos que nao exista caminho seguro na linha 14.

## Acoes Detalhadas

1. Criar branch especifica:

```powershell
git checkout -b hardening/deps-security-patch
```

2. Confirmar estado antes:

```powershell
git status --short --branch
npm audit --omit=dev
npm outdated --long
```

3. Atualizar Next dentro da linha 14:

```powershell
npm install next@14.2.35 eslint-config-next@14.2.35
```

4. Atualizar Axios:

```powershell
npm install axios@latest
```

5. Rodar audit novamente:

```powershell
npm audit --omit=dev
```

6. Se `lodash` continuar via `recharts`:
   - verificar se ha versao nova de `recharts` compativel;
   - avaliar `overrides` apenas se houver versao corrigida compativel de `lodash`;
   - se nao houver correcao segura, documentar risco aceito temporariamente e verificar se o app usa caminho vulneravel como `_.template`.

7. Se `dompurify` continuar via `jspdf`:
   - verificar se ha versao nova de `jspdf`;
   - avaliar `overrides` para `dompurify`;
   - validar exportacoes PDF.

8. Se o lockfile ficar inconsistente:

```powershell
Remove-Item -Recurse -Force node_modules
npm ci
```

9. Validar:

```powershell
npx tsc --noEmit --pretty false
npm run build
npm run audit:bundle
npm audit --omit=dev
```

10. Smoke test manual no preview:
   - login;
   - portal grupo;
   - BI financeiro;
   - extrato;
   - CP/CR;
   - admin, se usuario admin;
   - logout/refresh de sessao.

## Validacao

- Build passa.
- Typecheck passa.
- Audit nao tem critical/high sem justificativa.
- Lockfile atualizado de forma consistente.
- Nenhum comportamento funcional mudou intencionalmente.

## Criterio de Pronto

- PR pequeno apenas com dependencia/lockfile e ajustes minimos.
- Vulnerabilidades high/critical removidas ou formalmente justificadas.

## Rollback

Reverter o PR de dependencia. Como este step deve ser isolado, rollback deve ser simples.

## Prompt para Execucao

```text
Execute o STEP 04 do plano de acao do grupoalt-web: atualizacao minima de dependencias vulneraveis. Crie uma branch propria, atualize Next dentro da linha 14 para patch seguro, alinhe eslint-config-next, atualize axios e trate vulnerabilidades transientes com a menor mudanca possivel. Rode typecheck, build, audit:bundle e npm audit --omit=dev. Nao faca refactors nem corrija bugs funcionais neste PR.
```
