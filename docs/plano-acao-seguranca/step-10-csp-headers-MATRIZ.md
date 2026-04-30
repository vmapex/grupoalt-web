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

## Política aplicada (Fases 1-3)

```text
default-src 'self'
script-src  'self' 'unsafe-inline'
style-src   'self' 'unsafe-inline' https://fonts.googleapis.com
font-src    'self' https://fonts.gstatic.com
img-src     'self' data: blob:
connect-src 'self' https://api.grupoalt.agr.br https://api-staging.grupoalt.agr.br
frame-ancestors 'none'
base-uri 'self'
form-action 'self'
object-src 'none'
```

### Mudanças vs. estado anterior

| Diretiva | Antes | Depois | Motivo |
|---|---|---|---|
| `connect-src` | `'self' https://*.railway.app https://*.vercel.app https://*.grupoalt.agr.br` | `'self' https://api.grupoalt.agr.br https://api-staging.grupoalt.agr.br` | client só fala com `self` (proxy) e com a API canônica; wildcards de Railway/Vercel/grupoalt eram desnecessariamente amplos |
| `img-src` | `'self' data: blob: https:` | `'self' data: blob:` | logos vêm como `data:` ou de `/public`; nenhum domínio externo de imagem é usado |
| `base-uri` | (ausente) | `'self'` | bloqueia `<base href>` injetado |
| `form-action` | (ausente) | `'self'` | bloqueia exfiltração via `<form action>` para terceiros |
| `object-src` | (default = `default-src 'self'`) | `'none'` | redundância explícita contra `<object>`/`<embed>`/Flash legado |
| `script-src` (Fase 3) | `'self' 'unsafe-inline' 'unsafe-eval'` | `'self' 'unsafe-inline'` | ver Fase 3 abaixo — `unsafe-eval` removido |

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

## Fase 4 — `unsafe-inline` em `script-src` (⏸ DEFERIDA)

### Achado

A auditoria inicial assumiu que `themeBootstrap` em `src/app/layout.tsx`
era o único `<script>` inline. Auditoria do HTML compilado
(`.next/server/app/login.html`) revelou outros 5+ scripts inline
**injetados pelo Next 14 (App Router)** para streaming SSR:

```html
<script>(self.__next_f=self.__next_f||[]).push([0]);self.__next_f.push([2,null])</script>
<script>self.__next_f.push([1,"1:HL[\"/_next/static/css/444e128ebad9d710.css\",\"style\"]\n"])</script>
<!-- + chunks de hidratação variáveis por rota/build -->
```

Esses scripts têm conteúdo **dinâmico** (rota, hash de CSS, dados de
hidratação), então hash CSP estático **não cobre** todos.

### Estratégia válida (não aplicada nesta entrega)

Implementar **nonce-based CSP via Next middleware** (`src/middleware.ts`):

1. Middleware gera nonce aleatório por request.
2. Define header `Content-Security-Policy` com `'nonce-<valor>'` em
   `script-src` (substituindo `'unsafe-inline'`).
3. Define header `x-nonce` para o `layout.tsx` ler via `headers()`.
4. Next 14 aplica o nonce automaticamente em todos os scripts dele
   (`__next_f`, polyfills, chunks).
5. `layout.tsx` passa o nonce para o `<script>` do `themeBootstrap`.

Referência: <https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy>

### Decisão

**DEFERIDA.** Migrar para nonce middleware é um refactor arquitetural
(CSP sai de header estático no `next.config.js` e vira middleware
dinâmico) e foi explicitamente marcado pela spec do step como "fazer
em PR separado se necessário".

Estado atual mitiga XSS via:
- `script-src 'self'` (sem hosts externos permitidos);
- `unsafe-eval` removido (Fase 3);
- `base-uri 'self'`, `form-action 'self'`, `object-src 'none'`,
  `frame-ancestors 'none'`.

`unsafe-inline` continua presente para permitir o streaming do App
Router. Fica como **débito técnico documentado** para um Step futuro
(candidato natural: Step 15 — CI bloqueante e audit, ou um
"Step 10b" dedicado).

## Validação aplicada (Fases 1-3)

1. `npm run build` — passa sem erros novos (49 páginas estáticas).
2. `npm run typecheck` — limpo.
3. `npm run test` — 42/42 verde.
4. Inspeção do CSP composto: 10 diretivas, todas explícitas.
5. Auditoria do bundle: `Function("return this")` só em fallbacks
   protegidos por short-circuit `globalThis`/`window`.
6. Próximas validações em preview (após deploy):
   - `curl -I https://<preview>.vercel.app` mostra os 6 headers + CSP.
   - DevTools sem violações CSP críticas em login, portal, BI, Orbit, export
     PDF, troca de tema.
   - Rotas legadas `/dashboard/*` ficam órfãs até Step 12; não há link interno
     apontando para elas.

## Resumo do Step 10

| Fase | Status | PR |
|---|---|---|
| Inventário de origens | ✅ DONE | #42 |
| Fase 1 — `connect-src` restrito | ✅ DONE | #42 |
| Fase 2 — `img-src` restrito | ✅ DONE | #42 |
| Fase 3 — remover `'unsafe-eval'` | ✅ DONE | #43 |
| Fase 4 — remover `'unsafe-inline'` em `script-src` | ⏸ DEFERIDA | — |
| Validação manual em preview Vercel | 🟡 a fazer | — |
| `curl -I` em produção | 🟡 a fazer | — |

## Rollback

Reverter apenas `next.config.js` se CSP bloquear produção. Branch original
mantém o CSP antigo até o merge. Deploy de rollback é só `git revert` do PR
de Step 10 + redeploy Vercel.
