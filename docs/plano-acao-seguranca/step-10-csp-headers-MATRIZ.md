# STEP 10 — Inventário de Origens e Plano de CSP

> Auditoria executada em 2026-04-30 sobre `grupoalt-web` para fundamentar o
> hardening controlado de CSP do Step 10. Branch: `claude/step-10-6gzI0`.

## Inventário de origens realmente usadas

| Tipo | Origem | Onde aparece | Diretiva CSP | Ação |
|---|---|---|---|---|
| API (client-side) | `'self'` via `/api/proxy/*` (rewrite Next) | `src/lib/api.ts` | `connect-src` | manter `'self'` |
| API (host canônico, fallback) | `https://api.grupoalt.agr.br` | `vercel.json` (`NEXT_PUBLIC_API_URL`) | `connect-src` | listar explicitamente |
| API (staging futuro) | `https://api-staging.grupoalt.agr.br` | `docs/STAGING_DEPLOY_SEGURO.md` | `connect-src` | listar para quando subir |
| Fontes CSS | `https://fonts.googleapis.com` | `src/app/globals.css` (`@import`) | `style-src` | manter |
| Fontes WOFF | `https://fonts.gstatic.com` | derivado do CSS acima | `font-src` | manter |
| Logo do Grupo ALT | `'self'` (`/logo_grupo_alt.png`) | `src/app/login/page.tsx` | `img-src` | manter `'self'` |
| Logo da empresa | `data:` (FileReader → base64, persistido no Zustand) | `src/app/bi/financeiro/admin/page.tsx` | `img-src` | manter `data:` |
| Avatares/screenshots arbitrários | nenhum | — | `img-src` | **dropar `https:` aberto** |
| Bootstrap de tema inline | `<script>themeBootstrap…</script>` | `src/app/layout.tsx` | `script-src` | manter `'unsafe-inline'` (Phase 4) |
| `eval` em libs client | webpack runtime / Recharts | bundle | `script-src` | manter `'unsafe-eval'` (Phase 3) |
| `*.railway.app` | histórico — DNS atual aponta para `api.grupoalt.agr.br` | — | — | **remover** |
| `*.vercel.app` | nenhum connect direto saindo do client para Vercel | — | — | **remover** |
| `cdnjs.cloudflare.com` / `unpkg.com` | iframes `/dashboard/*` (rotas legadas) | `src/app/dashboard/*/page.tsx` | `script-src`, `style-src`, `font-src` | **NÃO listar** (Step 12 vai remover essas rotas) |

## Política aplicada (Fases 1-4)

```text
default-src 'self'
script-src  'self' 'nonce-<valor por request>'   # 'unsafe-eval' em dev, removido em prod
style-src   'self' 'unsafe-inline' https://fonts.googleapis.com
font-src    'self' https://fonts.gstatic.com
img-src     'self' data: blob:
connect-src 'self' https://api.grupoalt.agr.br https://api-staging.grupoalt.agr.br
frame-ancestors 'none'
base-uri 'self'
form-action 'self'
object-src 'none'
```

A política passa a ser **emitida pelo middleware** (`src/middleware.ts`),
não mais pelo `headers()` estático do `next.config.js`.

### Mudanças vs. estado anterior

| Diretiva | Antes | Depois | Motivo |
|---|---|---|---|
| `connect-src` | `'self' https://*.railway.app https://*.vercel.app https://*.grupoalt.agr.br` | `'self' https://api.grupoalt.agr.br https://api-staging.grupoalt.agr.br` | client só fala com `self` (proxy) e com a API canônica; wildcards de Railway/Vercel/grupoalt eram desnecessariamente amplos |
| `img-src` | `'self' data: blob: https:` | `'self' data: blob:` | logos vêm como `data:` ou de `/public`; nenhum domínio externo de imagem é usado |
| `base-uri` | (ausente) | `'self'` | bloqueia `<base href>` injetado |
| `form-action` | (ausente) | `'self'` | bloqueia exfiltração via `<form action>` para terceiros |
| `object-src` | (default = `default-src 'self'`) | `'none'` | redundância explícita contra `<object>`/`<embed>`/Flash legado |
| `script-src` (Fase 3) | `'self' 'unsafe-inline' 'unsafe-eval'` | `'self' 'unsafe-inline'` | ver Fase 3 abaixo — `unsafe-eval` removido |
| `script-src` (Fase 4) | `'self' 'unsafe-inline'` (estático) | `'self' 'nonce-<valor>'` (dinâmico via middleware) | ver Fase 4 abaixo — `unsafe-inline` removido com nonce por request |
| **Onde mora o CSP** | `next.config.js → headers()` (estático) | `src/middleware.ts` (dinâmico) | nonce não pode ser estático; `next.config.js` deixa de emitir o header CSP |

## Fase 3 — `unsafe-eval` removido (✅ DONE)

### Auditoria do bundle

`grep` em `.next/static/chunks/*.js` (build de produção) achou **dois** lugares
que referenciam o construtor `Function`:

1. `webpack-*.js` — runtime do webpack:
   ```js
   if (typeof globalThis === "object") return globalThis;
   try { return this || Function("return this")(); }
   catch (e) { if (typeof window === "object") return window; }
   ```
   - Em browsers evergreen, `globalThis` é objeto → retorna direto, **nunca**
     entra no `try`.
   - Mesmo se entrar, a chamada bloqueada por CSP cai no `catch` e devolve
     `window`.

2. `5497-*.js` — vendor chunk (lodash-style global):
   ```js
   var i = n || o || Function("return this")();
   ```
   - `n` (`globalThis`) e `o` (`window`/`self`) são truthy em qualquer
     browser moderno — `||` curto-circuita antes de chamar `Function(...)`.

### Decisão

`unsafe-eval` removido. Os dois call-sites identificados são fallbacks para
ambientes pré-`globalThis` (IE11 etc.), que o Next 14 não suporta.

### Validação local

- `npm run build` passa (49 páginas estáticas geradas).
- `npm run typecheck` limpo.
- `npm run test` 42/42 verde.
- `grep -E "[^a-zA-Z_\$\.\?]Function\s*\(" .next/static/chunks/*.js` →
  só os dois fallbacks acima, ambos em código não executado.

### Pós-deploy (a fazer no preview Vercel)

- Login, portal, BI Dashboard, Análise IA, Caixa, Extrato, CP/CR, Fluxo,
  Conciliação, Orbit, export PDF, troca de tema.
- DevTools console deve ficar limpo (sem `Refused to evaluate a string as
  JavaScript because 'unsafe-eval' is not an allowed source`).
- Se aparecer violação real, rollback é só re-incluir `'unsafe-eval'`.

## Fase 4 — `unsafe-inline` removido com nonce dinâmico (✅ DONE)

### Por que hash CSP fixo não resolve

A auditoria inicial identificou apenas o `themeBootstrap` em
`src/app/layout.tsx` como script inline. Auditoria posterior do HTML
compilado revelou que o **App Router do Next 14 injeta múltiplos
`<script>` inline** com dados de hidratação:

```html
<script>(self.__next_f=self.__next_f||[]).push([0]);self.__next_f.push([2,null])</script>
<script>self.__next_f.push([1,"1:HL[\"/_next/static/css/<hash>.css\",\"style\"]\n"])</script>
<!-- + chunks variáveis por rota/build/dados -->
```

O conteúdo desses scripts varia por rota e por dados → hash CSP estático
não cobre. A solução padrão é **nonce por request**.

### Implementação

- **`src/middleware.ts`** (NOVO):
  - Gera `nonce` com `crypto.getRandomValues(new Uint8Array(16))` +
    `btoa()` (Edge-runtime safe; sem `Buffer`/Node).
  - Monta o `Content-Security-Policy` dinamicamente com
    `script-src 'self' 'nonce-<valor>'`. Em dev acrescenta
    `'unsafe-eval'` para HMR/source-maps; em prod fica sem.
  - Escreve o nonce em `x-nonce` no request header → o Next 14 detecta
    e aplica `nonce={...}` automaticamente em todos os scripts internos
    do App Router (incluindo `__next_f.push(...)`).
  - Duplica o `Content-Security-Policy` em request header e response.
  - Matcher exclui `api`, `_next/static`, `_next/image`, `favicon.ico`
    e prefetches do App Router (sem renderização nova → sem nonce
    novo).

- **`src/app/layout.tsx`**:
  - `import { headers } from 'next/headers'`.
  - `const nonce = headers().get('x-nonce') ?? undefined`.
  - `<script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeBootstrap }} />`.

- **`next.config.js`**:
  - Removido apenas o item `Content-Security-Policy` do `headers()`.
  - HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy e
    Permissions-Policy permanecem inalterados.
  - Evita CSP duplicado (header estático + dinâmico).

### Trade-offs

- **Rotas viram dinâmicas**: usar `headers()` no `RootLayout` força todas
  as rotas a serem renderizadas a cada request (sem prerender estático).
  Aceitável aqui — é um portal autenticado/admin/BI cujo HTML quase
  nunca seria cacheável de qualquer forma.
- **Latência incremental**: o middleware roda em todo request não-API.
  Custo adicional ~ms (geração de 16 bytes random + concatenação de
  string CSP). Imperceptível.
- **Cache CDN do HTML**: deixa de existir. Os assets `_next/static/*`
  (com hash imutável no path) continuam cacheados normalmente, então
  a maior parte do bundle continua entregue do edge.
- **`'unsafe-eval'` em dev**: necessário para o webpack runtime do Next
  em modo dev (HMR/source-maps eval-source-map). Não vai pra prod.

### Validação

- `npm run typecheck` — limpo.
- `npm run test` — 42/42 verde.
- `npm run build` — compila; rotas listadas como `ƒ (Dynamic)` (esperado).
- `curl -I http://localhost:3000/login` (após `npm run start`):
  - status 200;
  - header `Content-Security-Policy` presente, contendo `script-src
    'self' 'nonce-<valor>'`;
  - **sem** `'unsafe-inline'` em `script-src`.
- `curl -s http://localhost:3000/login | grep -oE 'nonce="[^"]+"'`:
  - todos os scripts inline (`__next_f.push(...)` + bootstrap de tema)
    têm o **mesmo** valor de nonce, igual ao do header `Content-Security-Policy`.
- Duas requests consecutivas → nonces **diferentes** (confirmação de que
  é por request, não fixo).

## Resumo do Step 10

| Fase | Status | Onde mora a mudança |
|---|---|---|
| Inventário de origens | ✅ DONE | matriz |
| Fase 1 — `connect-src` restrito | ✅ DONE | `next.config.js` (mergeado) |
| Fase 2 — `img-src` restrito | ✅ DONE | `next.config.js` (mergeado) |
| Fase 3 — remover `'unsafe-eval'` | ✅ DONE | `next.config.js` (mergeado) |
| Fase 4 — remover `'unsafe-inline'` em `script-src` | ✅ DONE | `src/middleware.ts` (este PR) |
| Validação manual em preview Vercel | 🟡 a fazer pós-merge | — |

## Rollback

- **Reverter este PR** restaura o CSP estático com `'unsafe-inline'`. As
  rotas voltam a ser estáticas. Deploy imediato em caso de regressão
  (login/BI/Orbit quebrados, hidratação falhando).
- Sintomas que indicam rollback: console com `Refused to execute inline
  script because it violates the following Content Security Policy
  directive` ou tela em branco logo após o login.
