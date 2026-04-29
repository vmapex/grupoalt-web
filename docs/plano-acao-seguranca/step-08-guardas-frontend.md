# STEP 08 - Guardas Frontend para Admin, Modulos e Permissoes

## Objetivo

Impedir que usuarios sem permissao vejam ou interajam com telas administrativas e acoes sensiveis no frontend.

## Por que este step vem depois do RBAC backend

O frontend deve refletir a seguranca real do backend. Primeiro confirma-se o contrato de permissao; depois a UI segue esse contrato.

## Escopo

Rotas e componentes:

- `src/app/portal/layout.tsx`;
- `src/app/portal/admin/page.tsx`;
- `src/app/portal/setup/page.tsx`;
- `src/app/bi/financeiro/layout.tsx`;
- `src/app/bi/financeiro/admin/page.tsx`;
- `src/app/bi/financeiro/admin/categorias/page.tsx`;
- `src/app/bi/financeiro/admin/contas-bancarias/page.tsx`;
- `src/components/Sidebar.tsx`;
- `src/components/nav/Navbar.tsx`;
- `src/store/authStore.ts`.

## Acoes Detalhadas

1. Definir helper central:

```ts
canAccessAdmin(user)
canAccessModule(modulo, acao, empresaId?)
```

2. Rotas admin:
   - usuario nao autenticado -> `/login`;
   - usuario autenticado sem permissao -> tela `403` ou redirect seguro para `/portal/grupo`.

3. `/portal/setup`:
   - permitir admin sem empresas;
   - bloquear usuario comum;
   - bloquear acesso quando setup nao for necessario, se aplicavel.

4. `/portal/admin`:
   - exigir `user.is_admin === true` ou permissao `admin:visualizar`, conforme contrato final;
   - acoes de edicao exigem `admin:editar`.

5. `/bi/financeiro/admin/*`:
   - paginas que alteram backend devem exigir permissao admin/financeiro-admin;
   - configuracoes local-only precisam ser renomeadas ou isoladas para nao parecer admin real.

6. Sidebar:
   - esconder modulos sem permissao;
   - admin aparece somente para usuario autorizado;
   - nao depender apenas de esconder link.

7. Navbar BI:
   - botao de configuracoes aparece somente com permissao;
   - cache flush aparece somente com permissao adequada.

8. Criar componente simples de acesso negado:

```text
Voce nao tem permissao para acessar esta area.
```

9. Testar com:
   - admin global;
   - usuario comum;
   - usuario sem permissao de documentos;
   - usuario com permissao de visualizar mas nao editar.

## Validacao

- Usuario comum nao acessa `/portal/admin`.
- Usuario comum nao acessa `/bi/financeiro/admin/categorias`.
- Usuario comum nao ve links admin.
- Backend continua retornando `403` em chamada direta.

## Criterio de Pronto

- UI respeita permissoes.
- API tambem respeita permissoes.
- Nao ha tela sensivel acessivel por URL direta.

## Rollback

Se bloquear usuarios legitimos, ajustar matriz de permissao e guards. Nao remover protecao de backend.

## Prompt para Execucao

```text
Execute o STEP 08 do plano de acao do grupoalt-web: implementar guardas frontend para admin, setup, BI admin e modulos/permissoes. Use o contrato de RBAC validado no backend, esconda links indevidos e bloqueie acesso direto por URL. Teste com usuario admin e usuario comum. Rode typecheck e build.
```
