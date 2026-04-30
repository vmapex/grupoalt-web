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

## Plano para Fase 4 — `unsafe-inline` em `script-src`

- Há um único script inline conhecido: o `themeBootstrap` em
  `src/app/layout.tsx`, que aplica o tema antes do primeiro paint.
- Estratégia preferida: hash CSP (`'sha256-…'`) — o conteúdo é estático e
  pequeno, então um hash fixo no `next.config.js` resolve sem nonce dinâmico.
- Alternativa: extrair para `public/theme-bootstrap.js` e referenciar com
  `<script src="…">` (perde o "antes do primeiro paint" se for `defer`).
- Critério de aceite: nenhum `unsafe-inline` em `script-src`, sem flash de
  tema errado em hard reload.

## Validação aplicada nesta entrega

1. `npm run build` — passa sem erros novos.
2. Inspeção do CSP composto: 10 diretivas, todas explícitas.
3. Próximas validações em preview (após deploy):
   - `curl -I https://<preview>.vercel.app` mostra os 6 headers + CSP.
   - DevTools sem violações CSP críticas em login, portal, BI, Orbit, export
     PDF, troca de tema.
   - Rotas legadas `/dashboard/*` ficam órfãs até Step 12; não há link interno
     apontando para elas.

## Rollback

Reverter apenas `next.config.js` se CSP bloquear produção. Branch original
mantém o CSP antigo até o merge. Deploy de rollback é só `git revert` do PR
de Step 10 + redeploy Vercel.
