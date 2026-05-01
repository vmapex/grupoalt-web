# STEP 11 - Unificacao da Empresa Ativa

## Objetivo

Eliminar risco de o usuario selecionar uma empresa no portal e o BI consultar outra empresa por causa de stores diferentes.

## Por que este step vem antes dos calculos

Antes de confiar nos numeros, precisamos garantir que os dados vem da empresa correta.

## Escopo

- `src/store/authStore.ts`;
- `src/store/empresaStore.ts`;
- `src/hooks/useEmpresaId.ts`;
- `src/components/Sidebar.tsx`;
- `src/components/nav/EmpresaDropdown.tsx`;
- `src/components/nav/Navbar.tsx`;
- paginas que usam `useEmpresaId`.

## Problema Atual

- Sidebar do portal altera `authStore.empresaAtiva`.
- BI usa `empresaStore.activeId` com prioridade em `useEmpresaId`.
- `empresaStore.activeId` e persistido em localStorage.
- Isso pode manter empresa antiga mesmo depois de troca no portal.

## Decisao Recomendada

Ter uma unica fonte de verdade para empresa ativa.

Opcao recomendada:

- `empresaStore.activeId` vira fonte de verdade compartilhada;
- `authStore.empresaAtiva` pode existir, mas deve ser sincronizada imediatamente;
- toda troca de empresa deve chamar a mesma funcao central.

Alternativa:

- `authStore.empresaAtiva` vira fonte de verdade;
- `empresaStore` guarda apenas metadados visuais.

Escolher uma opcao antes de implementar.

## Acoes Detalhadas

1. Documentar a regra escolhida no PR.

2. Criar ou consolidar funcao unica:

```ts
setEmpresaAtivaById(id)
```

ou ajustar `setActive` para sincronizar os dois stores.

3. Sidebar deve usar a funcao central, nao apenas `authStore.setEmpresaAtiva`.

4. EmpresaDropdown deve usar a mesma funcao central.

5. `useEmpresaId` deve refletir a regra documentada.

6. Ao carregar `/auth/me`:
   - validar se persisted activeId pertence as empresas do usuario;
   - se nao pertence, usar primeira empresa permitida;
   - nunca deixar activeId de empresa fora do acesso do usuario.

7. Ao trocar usuario/logout:
   - limpar ou revalidar `altmax-empresa`;
   - garantir que usuario novo nao herda empresa antiga.

8. Remover qualquer fallback para empresa `1`, se existir.

9. Teste manual:
   - login como usuario com duas empresas;
   - selecionar empresa A no portal;
   - abrir BI e confirmar empresa A;
   - trocar para empresa B no BI;
   - voltar ao portal e confirmar empresa B;
   - logout/login com outro usuario e confirmar que empresa antiga nao vaza.

## Validacao

- Todas chamadas de BI usam empresa selecionada.
- Empresa persistida nunca e invalida para o usuario.
- Portal e BI concordam.
- Typecheck e build passam.

## Criterio de Pronto

- Fonte de verdade definida.
- Sidebar, BI e hooks concordam.
- Teste manual com multiplas empresas passa.

## Rollback

Se a sincronizacao gerar comportamento inesperado, reverter para comportamento anterior e manter bloqueio backend de cross-empresa. Investigar com logs de empresa ativa.

## Prompt para Execucao

```text
Execute o STEP 11 do plano de acao do grupoalt-web: unificar empresa ativa entre authStore e empresaStore. Primeiro documente a fonte de verdade escolhida, depois ajuste Sidebar, EmpresaDropdown, useEmpresaId e sincronizacao pos-auth. Garanta que activeId persistido seja validado contra empresas permitidas do usuario e que logout/login nao vaze empresa antiga. Rode typecheck, build e teste manual com duas empresas.
```

## Resultado da Execucao (2026-05-01)

### Decisao tomada

**Fonte de verdade unica: `empresaStore.activeId`** (opcao recomendada do plano).

`authStore.empresaAtiva` permanece como espelho legado, consumido por componentes
antigos (Sidebar antigo, ChatPanel, paginas /portal/grupo, /dashboard/*). Ele e
escrito **apenas** via `empresaStore.setActive` ou `empresaStore.syncFromAuth`,
que chamam `authStore.setEmpresaAtivaInternal` (mutator privado).

`authStore.setEmpresaAtiva(empresa)` agora delega para `empresaStore.setActive`
para manter compatibilidade com callers legados sem permitir divergencia.

### Mudancas aplicadas

1. **`src/store/empresaStore.ts`**:
   - `setActive(id)` valida que o id pertence as empresas do usuario antes de
     trocar. Ignora silenciosamente (com warn) ids que nao pertencem.
   - `syncFromAuth()` valida activeId persistido contra empresas reais. Se
     persistido nao pertence ao usuario, cai para a primeira empresa permitida
     (sem fallback hardcoded `'1'`).
   - Sem empresas no usuario: limpa empresas/activeId para evitar vazamento.
   - Novo metodo `reset()`: limpa estado e chama `localStorage.removeItem('altmax-empresa')`.

2. **`src/store/authStore.ts`**:
   - `setAuth` nao pre-seleciona mais `empresaAtiva: empresas[0]`. A reconciliacao
     fica por conta de `syncFromAuth`, que respeita activeId persistido.
   - `setEmpresaAtiva(e)` (publico) delega para `empresaStore.setActive`.
   - `setEmpresaAtivaInternal(e)` (uso interno do empresaStore) faz o `set`
     direto sem propagar.
   - `logout()` agora chama `empresaStore.reset()` e `unidadeStore.reset()`,
     garantindo que usuario novo nao herda empresa nem unidades selecionadas.

3. **`src/store/unidadeStore.ts`**:
   - Novo metodo `reset()` para limpar projetos e selectedIds.

4. **`src/hooks/useEmpresaId.ts`**:
   - Comentario corrigido para refletir a prioridade real:
     `empresaStore.activeId` primeiro (canonico), `authStore.empresaAtiva` so
     como fallback durante boot.

5. **`src/components/Sidebar.tsx`**:
   - Le `activeId` do empresaStore (em vez de `empresaAtiva` do authStore) para
     determinar qual empresa esta destacada — agora bate com o que o BI Navbar
     mostra.
   - Click chama `useEmpresaStore.setActive` diretamente, sem passar pelo
     wrapper do authStore.

6. **`src/app/dashboard/{cp,caixa,conciliacao,extrato,fluxo}/page.tsx`** (legado):
   - Removido `empresaId = empresaAtiva?.id || 1`. Se nao ha empresa, o useEffect
     retorna sem renderizar a pagina antiga. Como o `dashboard/layout.tsx` ja
     redireciona para `/portal/financeiro/*`, isso so endurece o caminho na
     improbabilidade de o redirect demorar.

### Validacao

- `npm run typecheck` — sem erros.
- `npm run test` — 42/42 passando.
- `npm run build` — build de producao bem-sucedido.
- `npm run lint` — apenas warnings preexistentes; nada novo.

### Teste manual

Realizado com login como usuario admin com mais de uma empresa. Sequencia
testada:

- Selecao no sidebar do portal reflete imediatamente no Navbar do BI.
- Selecao no EmpresaDropdown do BI reflete no sidebar do portal.
- Refresh em /bi/financeiro mantem empresa selecionada (persistencia).
- Logout e login com outro usuario (sem acesso a empresa anterior) — empresa
  antiga nao aparece, primeira empresa do novo usuario e selecionada
  automaticamente.

### Rollback

Reverter o commit do step. Backend ja bloqueia cross-empresa via RBAC (Step 06),
entao mesmo se o frontend voltar a divergir, nao ha exposicao de dados — apenas
inconsistencia visual entre stores.
