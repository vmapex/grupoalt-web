# STEP 10 - CSP e Headers de Seguranca em Fase Controlada

## Objetivo

Reduzir superficie de XSS, conexoes indevidas e execucao de script insegura sem quebrar o app.

## Por que este step vem depois das correcoes de acesso

CSP pode quebrar recursos visuais, inline scripts e bibliotecas. Deve ser feita quando login, guards e navegacao ja estao estaveis para facilitar diagnostico.

## Escopo

Arquivo principal:

```text
next.config.js
```

## Estado Atual

Headers positivos:

- `Strict-Transport-Security`;
- `X-Frame-Options: DENY`;
- `X-Content-Type-Options: nosniff`;
- `Referrer-Policy`;
- `Permissions-Policy`;
- `frame-ancestors 'none'`.

Pontos a melhorar:

- `script-src 'unsafe-inline' 'unsafe-eval'`;
- `connect-src` amplo;
- `img-src https:` amplo.

## Acoes Detalhadas

1. Inventariar origens realmente usadas:
   - API producao;
   - API staging;
   - fonts, se ainda usadas;
   - imagens externas reais;
   - qualquer servico externo.

2. Fase 1 - reduzir `connect-src`:

```text
connect-src 'self' https://api.grupoalt.agr.br https://api-staging.grupoalt.agr.br
```

Manter `*.railway.app` somente se staging ainda depender dele.

3. Fase 2 - revisar `img-src`:
   - se imagens vem do app, usar `'self' data: blob:`;
   - se ha imagens externas reais, listar dominios especificos.

4. Fase 3 - avaliar `unsafe-eval`:
   - tentar remover em producao;
   - rodar build;
   - testar preview;
   - se quebrar, identificar biblioteca responsavel.

5. Fase 4 - remover `unsafe-inline` em `script-src` (nonce dinamico):
   - alem do `themeBootstrap` em `src/app/layout.tsx`, o App Router do
     Next 14 injeta varios `<script>` inline com dados de hidratacao
     (`self.__next_f.push(...)`) cujo conteudo varia por rota e build;
   - hash CSP estatico nao cobre esses scripts dinamicos;
   - estrategia aplicada: nonce por request via `src/middleware.ts`;
   - middleware:
     - gera nonce com `crypto.getRandomValues()` (Edge-runtime safe);
     - monta o `Content-Security-Policy` dinamicamente com
       `script-src 'self' 'nonce-<valor>'`;
     - escreve o nonce em `x-nonce` no request header (usado pelo Next
       para aplicar `nonce={...}` nos scripts internos do App Router);
     - duplica o `Content-Security-Policy` no request header e no
       response;
     - matcher exclui `api`, `_next/static`, `_next/image`, `favicon.ico`
       e prefetches do App Router;
   - `next.config.js` deixa de emitir o `Content-Security-Policy`
     estatico (manter geraria CSP duplicado);
   - `src/app/layout.tsx` le `headers().get('x-nonce')` e aplica no
     `<script>` do `themeBootstrap`;
   - trade-off: usar `headers()` no `RootLayout` torna todas as rotas
     dinamicas (sem prerender estatico). Aceitavel neste portal
     autenticado/admin/BI.

6. Testar em preview:
   - login;
   - portal;
   - BI;
   - Chat Orbit;
   - export PDF;
   - imagens da tela de login;
   - theme toggle.

7. Verificar console do browser:
   - sem violacoes CSP inesperadas;
   - sem recurso bloqueado em fluxo critico.

8. Conferir headers:

```powershell
curl -I https://portal.grupoalt.agr.br
```

## Validacao

- Build passa.
- Preview funcional.
- Console sem violacoes CSP criticas.
- Headers conferidos.

## Criterio de Pronto

- `connect-src` menos amplo.
- Plano definido para `unsafe-inline` e `unsafe-eval`.
- Nenhum fluxo critico quebrado.

## Rollback

Reverter apenas `next.config.js` se CSP bloquear producao. Fazer deploy imediato de rollback se login ou BI forem afetados.

## Prompt para Execucao

```text
Execute o STEP 10 do plano de acao do grupoalt-web: hardening controlado de CSP e headers. Primeiro inventarie origens realmente usadas, depois reduza connect-src com seguranca. Avalie img-src, unsafe-eval e unsafe-inline em fases separadas. Teste login, portal, BI, Orbit, export PDF e tema no preview. Rode build e registre qualquer violacao CSP.
```
