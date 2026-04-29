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
