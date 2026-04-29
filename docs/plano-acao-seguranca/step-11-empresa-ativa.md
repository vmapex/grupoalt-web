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
