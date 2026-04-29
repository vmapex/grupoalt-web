# STEP 07 - Correcao do Interceptor de Auth e Comportamento de Sessao

## Objetivo

Corrigir risco de requests pendentes ficarem em loading infinito e padronizar comportamento em falha de refresh.

## Por que este step vem antes dos guardas frontend

Guardas de rota vao depender de chamadas confiaveis para `/auth/me`. Se o interceptor falha mal, toda a experiencia de sessao fica instavel.

## Escopo

Arquivo principal:

```text
src/lib/api.ts
```

## Problema Atual

- Requests concorrentes aguardam refresh.
- Em falha de refresh, `pendingRequests` e limpo.
- As promises pendentes nao recebem reject explicitamente.
- Pode haver loading infinito.
- `window.location.href = '/login'` e chamado direto no interceptor.

## Acoes Detalhadas

1. Redesenhar fila de pending requests para guardar `resolve` e `reject`.

2. Em sucesso do refresh:
   - reexecutar requests pendentes;
   - resolver promises;
   - limpar fila;
   - retornar request original.

3. Em falha do refresh:
   - rejeitar todas as promises pendentes;
   - limpar fila;
   - limpar estado local de auth, se aplicavel;
   - redirecionar para `/login` somente no browser;
   - evitar multiplos redirects simultaneos.

4. Proteger `window`:

```ts
if (typeof window !== 'undefined') {
  window.location.href = '/login'
}
```

5. Evitar interceptar:
   - `/auth/login`;
   - `/auth/refresh`;
   - `/auth/logout`, se fizer sentido.

6. Garantir que `_retry` seja respeitado para evitar loop infinito.

7. Testar manualmente:
   - duas requests recebem `401`;
   - uma dispara refresh;
   - se refresh passa, as duas continuam;
   - se refresh falha, as duas rejeitam e UI sai do loading.

8. Validar login e logout.

## Validacao

```powershell
npm run typecheck
npm run build
```

Teste manual:

- Expirar cookie ou simular 401;
- abrir duas telas que fazem chamadas simultaneas;
- confirmar ausencia de loading infinito;
- confirmar redirect para login em falha.

## Criterio de Pronto

- Fila de requests sempre resolve ou rejeita.
- Falha de refresh leva para login sem travar UI.
- Nao ha loop infinito de refresh.

## Rollback

Reverter apenas `src/lib/api.ts`. Como o step e isolado, rollback deve ser simples.

## Prompt para Execucao

```text
Execute o STEP 07 do plano de acao do grupoalt-web: corrigir o interceptor de auth em src/lib/api.ts. A fila de pending requests deve resolver em sucesso de refresh e rejeitar explicitamente em falha. Proteja uso de window, evite loops em auth/refresh e valide login, refresh, logout, typecheck e build. Nao altere outras areas.
```
