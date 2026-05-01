# STEP 12 - Correcao de Navegacao e Legado /dashboard

## Objetivo

Reduzir confusao entre rotas antigas e novas, corrigir links quebrados e diminuir superficie legada.

## Por que este step vem depois da empresa ativa

Com empresa ativa correta, podemos validar navegacao entre portal e BI sem misturar bug de estado com bug de rota.

## Escopo

- `src/app/bi/financeiro/page.tsx`;
- `src/app/dashboard/*`;
- `src/app/portal/financeiro/*`;
- `src/app/bi/financeiro/*`;
- `next.config.js`, se for usar redirect server-side.

## Problemas Identificados

- Link em BI aponta para `/portal/extrato`, que parece nao existir.
- `/dashboard` tem layout de redirect, mas paginas antigas continuam no build.
- Existem duas experiencias financeiras: `/portal/financeiro/*` e `/bi/financeiro/*`.

## Acoes Detalhadas

1. Corrigir link quebrado:
   - de `/portal/extrato`;
   - para `/bi/financeiro/extrato` ou `/portal/financeiro/extrato`, conforme experiencia canonica.

2. Decidir experiencia canonica.

Recomendacao:

```text
/bi/financeiro = experiencia canonica de BI financeiro
/portal/financeiro/* = wrappers ou redirects para BI, se ainda necessarios
/dashboard/* = legado redirecionado server-side ou removido
```

3. Para `/dashboard`:
   - preferir redirect server-side em `next.config.js`, se possivel;
   - manter compatibilidade de URLs antigas;
   - evitar renderizacao de `iframe/srcdoc`.

4. Se remover paginas antigas:
   - garantir que nenhum link aponta para `/dashboard`;
   - garantir redirects para URLs antigas;
   - rodar build e verificar lista de rotas.

5. Se manter paginas antigas temporariamente:
   - garantir que layout de redirect impede renderizacao real;
   - documentar como legado;
   - abrir tarefa para remocao futura.

6. Testes:
   - acessar `/dashboard`;
   - acessar `/dashboard/extrato`;
   - acessar `/dashboard/cp`;
   - confirmar redirect para rota nova;
   - testar links do dashboard BI;
   - testar botao "voltar ao portal".

## Validacao

- Nenhum link quebrado conhecido.
- `/dashboard/*` nao expoe UI antiga.
- Build passa.
- Typecheck passa.

## Criterio de Pronto

- Experiencia canonica definida.
- Rotas legadas tratadas de forma previsivel.
- Usuarios antigos nao caem em tela quebrada.

## Rollback

Se redirects quebrarem navegacao, reverter redirect e manter layout atual temporariamente. Corrigir links em PR separado.

## Prompt para Execucao

```text
Execute o STEP 12 do plano de acao do grupoalt-web: corrigir navegacao e tratar legado /dashboard. Corrija o link quebrado para extrato, defina ou aplique a experiencia canonica para financeiro, implemente redirects seguros para /dashboard/* e valide que paginas antigas nao renderizam UI legada. Rode typecheck, build e teste as rotas antigas e novas.
```

## Resultado (2026-05-01)

### Decisao de experiencia canonica

- `/portal/financeiro/*` continua sendo a experiencia canonica para usuarios
  finais (CP, CR, Extrato, Caixa, Fluxo, Conciliacao). Eh para onde
  `portal/grupo/page.tsx` aponta os Quick Actions e o link de "Contas
  Bancarias > Ver extrato completo".
- `/bi/financeiro/*` permanece como experiencia BI executiva (Dashboard
  Executivo + Analise IA + sub-telas Caixa/Extrato/CP-CR/Fluxo/Conciliacao).
  Links internos do BI ficam dentro do BI.
- `/dashboard/*` eh legado. Mantido apenas como rota de compatibilidade
  para URLs antigas via redirect 308; nao renderiza UI alguma.

### Mudancas aplicadas

1. **Link quebrado corrigido em `src/app/bi/financeiro/page.tsx`** (card
   "Ultimas Movimentacoes"):
   - Antes: `href="/portal/extrato"` (rota inexistente).
   - Depois: `href="/bi/financeiro/extrato"` (mantem o usuario no BI, que
     eh o contexto onde o card aparece).

2. **Redirects server-side em `next.config.js`** — novo `redirects()`
   gera 308 (`Permanent Redirect`) para URLs legadas:
   ```
   /dashboard            -> /portal/financeiro/caixa
   /dashboard/:path*     -> /portal/financeiro/:path*
   ```
   Server-side elimina o flash da tela "Redirecionando para o portal..."
   que existia no layout client-side anterior.

3. **Remocao de `src/app/dashboard/*`**: as 8 paginas/layouts legados
   (`page.tsx`, `layout.tsx`, `caixa/`, `cp/`, `cr/`, `extrato/`,
   `fluxo/`, `conciliacao/`) foram removidas. O conteudo nao era mais
   alcancavel (o layout client-side bloqueava `{children}`), mas o
   chunk de `dashboard/extrato/page.tsx` (24 KB) ainda era empacotado.
   Removendo as pastas reduz superficie e tamanho do bundle.

### Validacao executada

| | |
|---|---|
| `npm run typecheck` | sem erros |
| `npm run test` | 42/42 passando (`access.test.ts`, `api.test.ts`) |
| `npm run build` | 42 rotas geradas; nenhuma `/dashboard/*` aparece |
| `curl -sI http://localhost:3030/dashboard` | `308` -> `/portal/financeiro/caixa` |
| `curl -sI http://localhost:3030/dashboard/extrato` | `308` -> `/portal/financeiro/extrato` |
| `curl -sI http://localhost:3030/dashboard/caixa` | `308` -> `/portal/financeiro/caixa` |
| `curl -sI http://localhost:3030/dashboard/cp` | `308` -> `/portal/financeiro/cp` |
| `curl -sI http://localhost:3030/dashboard/cr` | `308` -> `/portal/financeiro/cr` |
| `curl -sI http://localhost:3030/dashboard/fluxo` | `308` -> `/portal/financeiro/fluxo` |
| `curl -sI http://localhost:3030/dashboard/conciliacao` | `308` -> `/portal/financeiro/conciliacao` |
| `curl -sI http://localhost:3030/bi/financeiro/extrato` | `200` (destino do link corrigido) |

### Test plan pos-merge

- [ ] Em preview Vercel: clicar em "Ver extrato" no card Ultimas
      Movimentacoes do BI Dashboard -> deve abrir
      `/bi/financeiro/extrato` (e nao mais URL inexistente).
- [ ] `curl -sI https://<preview>.vercel.app/dashboard/extrato` ->
      308 para `/portal/financeiro/extrato`.
- [ ] Bookmarks antigos de usuarios em `/dashboard/*` continuam
      funcionando (resolvem para o portal novo).
- [ ] Devtools console limpo (sem warnings de React Hook por uso de
      `useEffect` em layout removido).

### Rollback

`git revert` deste PR restaura:
- Link quebrado.
- Pastas `src/app/dashboard/*` (re-aparecem como rotas no build).
- Redirect client-side via `useEffect` no layout.

Bookmarks antigos continuariam funcionando porque a redirect-chain
client-side ainda redirecionava (apenas com flash). Sintoma que
indicaria rollback necessario: `404` em alguma URL legada de
`/dashboard/*` em producao (improvavel — todas as URLs originais estao
cobertas pelo `:path*`).
