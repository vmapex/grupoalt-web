# STEP 06 - Auditoria de RBAC no Backend e Contrato de Autorizacao

## Objetivo

Garantir que o backend bloqueia acesso indevido mesmo se alguem chamar a API diretamente, ignorando o frontend.

## Por que este step vem antes dos guardas frontend

Guardas frontend melhoram experiencia e reduzem erro acidental, mas nao protegem API. Para um hub central, a autorizacao real precisa estar no backend.

## Escopo

Auditar todos os endpoints consumidos pelo frontend:

- Auth: `/auth/login`, `/auth/me`, `/auth/refresh`, `/auth/logout`;
- Admin: `/admin/empresas`, `/admin/empresas/{id}/credenciais`, `/admin/credenciais/testar`, `/admin/setup`;
- Gestao: `/gestao/usuarios`, `/gestao/empresas`, `/gestao/unidades`;
- BI: `/empresas/{id}/extrato`, `/saldos`, `/cp`, `/cr`, `/fluxo-caixa`, `/conciliacao/*`, `/categorias/*`, `/contas`, `/contas-bancarias/*`, `/cache/flush`;
- Export: `/export/empresas/{empresa_id}/extrato/pdf`, `/cp/pdf`, `/cr/pdf`;
- Documentos: `/grupos/{grupo_id}/documentos`, `/grupos/{grupo_id}/documentos/{docId}/{action}`;
- Notificacoes: `/notificacoes/*`;
- Orbit: `/orbit/usage`, `/orbit/chat`.

## Matriz Esperada

Criar matriz com colunas:

```text
Endpoint | Metodo | Login | Admin | Empresa | Grupo | Permissao | Observacao
```

Exemplos:

```text
GET /empresas/{id}/extrato | GET | sim | nao | empresa_id | nao | indicadores:visualizar | usuario deve ter acesso a empresa
PUT /admin/empresas/{id}/credenciais | PUT | sim | sim | empresa_id | nao | admin:editar | nunca usuario comum
POST /grupos/{grupo_id}/documentos/{docId}/aprovar | POST | sim | nao | nao | grupo_id | documentos:aprovar | validar grupo do usuario
```

## Acoes Detalhadas

1. Listar endpoints usados no frontend:

```powershell
git grep -n "api." -- src
git grep -n "/empresas/" -- src
git grep -n "/admin/" -- src
git grep -n "/grupos/" -- src
```

2. No backend, localizar routers correspondentes.

3. Para cada endpoint, confirmar:
   - existe usuario autenticado?
   - empresa pertence ao usuario?
   - grupo pertence ao usuario?
   - permissao de modulo/acao e validada?
   - admin global e realmente restrito?
   - exportacoes respeitam permissao?
   - Orbit respeita empresa/permissao?

4. Testar cenarios:
   - sem login -> `401`;
   - usuario logado sem permissao -> `403`;
   - usuario da empresa A acessando empresa B -> `403`;
   - usuario comum acessando admin -> `403`;
   - usuario sem permissao exportando PDF -> `403`;
   - usuario sem grupo acessando documento -> `403`.

5. Criar issues ou correcoes backend para falhas.

6. Nao considerar seguranca pronta enquanto backend nao passar.

## Validacao

- Matriz completa.
- Evidencias manuais ou testes automatizados para endpoints sensiveis.
- Falhas de RBAC corrigidas ou abertas com prioridade P0.

## Resultado da Execucao (2026-04-30)

Auditoria executada sobre os endpoints consumidos por este frontend
(`src/lib/api.ts` + chamadas diretas em `src/app`/`src/components`/`src/hooks`/`src/store`),
comparados com os routers do `grupoalt-api`. Branch:
`claude/rbac-backend-audit-YOdsC`.

- Matriz consolidada vive no repo do backend:
  `grupoalt-api/docs/plano-acao-seguranca/step-06-rbac-backend-MATRIZ.md`.
- Falhas P0/P1 corrigidas no backend (mesma branch). Veja PR no
  `vmapex/grupoalt-api`.
- Frontend nao precisa de mudancas para este step — o objetivo e
  garantir que o backend ja bloqueia mesmo que alguem chame a API
  direto (via curl, Postman, console do navegador).

### Endpoints consumidos (resumo)

Levantados em `src/lib/api.ts` + grep em `src/`:

- Auth: `/auth/login`, `/auth/me`, `/auth/refresh`, `/auth/logout`.
- Admin: `/admin/empresas`, `/admin/empresas/{id}/credenciais`,
  `/admin/credenciais/testar`, `/admin/setup`.
- Gestao: `/gestao/usuarios`, `/gestao/usuarios/{id}`,
  `/gestao/usuarios/{id}/empresas`, `/gestao/usuarios/{id}/permissoes`,
  `/gestao/empresas`, `/gestao/empresas/{id}/unidades`,
  `/gestao/unidades/{id}`.
- BI: `/empresas/{id}/extrato`, `/saldos`, `/cp`, `/cp/resumo`,
  `/cr`, `/cr/resumo`, `/cp/{cod}/baixas`, `/cr/{cod}/baixas`,
  `/fluxo-caixa`, `/fluxo-caixa/diario|mensal`,
  `/conciliacao/{movimentacao|resumo|calendario|dia/{date}}`,
  `/categorias`, `/categorias/sync`, `/categorias/{cod}`,
  `/categorias/bulk-override`, `/contas`,
  `/contas-bancarias/{omie_id}`, `/cache/flush`,
  `/dashboard`.
- Export: `/export/empresas/{id}/extrato/pdf`,
  `/export/empresas/{id}/cp/pdf`, `/export/empresas/{id}/cr/pdf`.
- Documentos: `/grupos/{gid}/documentos`,
  `/grupos/{gid}/documentos/{did}/{action}`.
- Notificacoes: `/notificacoes`, `/notificacoes/contagem`,
  `/notificacoes/{id}/ler`, `/notificacoes/ler-todas`.
- Orbit: `/orbit/usage`, `/orbit/chat`.

### Falhas corrigidas no backend

- **P0** IDOR em `POST /v1/orbit/chat` (validacao de `empresa_id` no
  body antes de carregar contexto financeiro).
- **P0** `GET /v1/gestao/usuarios` so para admin/gestor com vinculo
  (antes: branch do gestor inalcancavel; qualquer login recebia lista
  global).
- **P0** `GET /v1/gestao/usuarios/{id}` agora limitado a admin, self
  ou gestor que compartilha empresa.
- **P0** `GET /v1/gestao/empresas/{id}/unidades` exige `get_empresa_ctx`.
- **P1** `GET /v1/gestao/empresas` filtra por vinculo do usuario comum.
- **P1** `GET /v1/sync/status/{id}` exige `get_empresa_ctx`.

### Follow-up (P2 — abrir step 06.B)

`check_permissao` em `app/core/deps.py` e funcao morta — nenhum
router checa permissoes granulares (`documentos:aprovar`,
`financeiro:exportar`, `admin:editar`, etc). Hoje a granularidade
real e vinculo + role (admin/gestor/viewer). Introduzir
`require_permissao(modulo, acao)` em endpoints sensiveis vira
proximo step de RBAC.

## Criterio de Pronto

- Backend garante autorizacao por endpoint.
- Frontend nao e a unica barreira.
- Usuarios nao conseguem acessar dados cross-empresa ou cross-grupo via API direta.

## Rollback

Se uma correcao bloquear usuarios legitimos, ajustar regra especifica. Nao remover protecao geral.

## Prompt para Execucao

```text
Execute o STEP 06 do plano de acao do grupoalt-web: auditar RBAC no backend com base nos endpoints consumidos pelo frontend. Monte uma matriz Endpoint/Metodo/Login/Admin/Empresa/Grupo/Permissao, teste cenarios 401/403 com usuario admin e comum, identifique falhas e proponha correcoes. Nao confie no frontend como barreira de seguranca.
```
