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
