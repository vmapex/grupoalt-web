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

## Política aplicada nesta etapa

```text
default-src 'self'
script-src  'self' 'unsafe-inline' 'unsafe-eval'
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

## Plano para Fase 3 — `unsafe-eval`

- `unsafe-eval` é necessário pelo runtime do webpack em modo dev e por algumas
  libs de animação client.
- Próximo passo (PR separado): rodar `next build` em produção e abrir o portal
  com `script-src 'self'` (sem `'unsafe-eval'`) num preview Vercel; capturar
  violações no console e classificar:
  - se webpack chunk loader → adicionar `wasm-unsafe-eval` em vez de `unsafe-eval`
    e/ou ajustar config.
  - se Recharts/animações → mapear e considerar substituição.
- Critério de aceite: console limpo no dashboard, caixa, fluxo, conciliação,
  análise IA, login, admin.

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
