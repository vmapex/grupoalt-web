# AUDIT BASELINE — grupoalt-web

Data: 2026-04-29
Step: 01 — Baseline tecnico e trilha de decisao
Modo: somente leitura (nenhum arquivo funcional alterado)

Este documento e a fotografia tecnica de referencia antes da execucao do plano
de acao. Comparar com auditorias futuras para medir regressoes.

---

## 1. Branch e worktree

```
git status --short --branch
## claude/review-action-plan-9i9uq

git log -1 --oneline
db67400 docs: add security action plan
```

- Worktree limpo no momento do baseline.
- Branch alinhada ao plano (`claude/review-action-plan-9i9uq`).

## 2. Versoes principais

```
node --version    -> v22.22.2
npm  --version    -> 10.9.7
```

`npm ls` (apos `npm ci`):

```
altmax-web@1.0.0
+-- axios@1.13.6
+-- jspdf@4.2.1
+-- next@14.2.5
+-- react-dom@18.3.1
+-- react@18.3.1
`-- recharts@2.15.4
```

Totais (de `npm audit --omit=dev --json`):
- prod: 104
- dev: 368
- optional: 46
- total: 491

Avisos de deprecacao observados durante `npm ci` (relevantes para Step 04):
- `next@14.2.5` — security vulnerability (advisory de 2025-12-11)
- `eslint@8.57.1` — versao nao mais suportada
- `glob@7.2.3`, `glob@10.3.10`, `rimraf@3.0.2`, `inflight@1.0.6`,
  `@humanwhocodes/config-array@0.13.0`, `@humanwhocodes/object-schema@2.0.3`

## 3. Typecheck

```
npx tsc --noEmit --pretty false
```

Resultado: **PASSOU** (0 erros, 0 saida).

## 4. Build de producao

```
npm run build
```

Resultado: **PASSOU**.

- Next.js 14.2.5
- "Compiled successfully"
- 49 paginas estaticas + 1 dinamica (`/portal/documentos/[id]`)
- First Load JS shared: 87.6 kB
- Maiores rotas: `/bi/financeiro` (240 kB), `/bi/financeiro/caixa` (245 kB),
  `/bi/financeiro/cp-cr` (235 kB), `/bi/financeiro/fluxo` (228 kB)
- Sem warnings de compilacao.

## 5. Bundle secrets audit

```
npm run audit:bundle
```

Resultado: **PASSOU**.

- Script: `scripts/check-bundle-secrets.js`
- 81 arquivos JS verificados no bundle
- Nenhuma credencial exposta detectada.

## 6. npm audit (producao)

```
npm audit --omit=dev
```

Resultado: **6 vulnerabilidades** (1 critical, 1 high, 4 moderate).

| Severidade | Pacote | Resumo | Onde |
|---|---|---|---|
| **CRITICAL** | `next` `>=0.9.9` | Multiplos CVEs (cache poisoning, auth bypass, SSRF, DoS, content injection, race condition, image disk cache, request smuggling, etc.) | `node_modules/next` |
| **HIGH** | `lodash` `<=4.17.23` | Code injection via `_.template`, prototype pollution em `_.unset`/`_.omit` | `node_modules/lodash` |
| **MODERATE** | `follow-redirects` | Vaza Authorization headers em redirect cross-domain | `node_modules/follow-redirects` |
| **MODERATE** | `postcss` `<8.5.10` | XSS via `</style>` nao escapado | `node_modules/next/node_modules/postcss` |
| **MODERATE** | (mais 2 da mesma cadeia next/postcss) | — | — |

Fix proposto pelo npm:
- `npm audit fix` resolve `follow-redirects` e `lodash` sem alterar majors.
- `npm audit fix --force` instala `next@14.2.35` (fora do range declarado).

> Tratamento: **Step 04** (atualizar deps vulneraveis em PR isolado, com
> regressao em build/typecheck e validacao manual das rotas).

## 7. Lint (estado atual)

```
npm run lint
```

Resultado: **INTERATIVO — bloqueador conhecido**.

Saida:

```
> next lint
? How would you like to configure ESLint? https://nextjs.org/docs/basic-features/eslint
> Strict (recommended)
  Base
  Cancel
```

- `.eslintrc*` nao existe na raiz do repo.
- `eslint-config-next@14.2.5` esta nas devDependencies, mas nao foi inicializado.
- `next lint` abre prompt em CI/dev sempre que e invocado.

> Tratamento: **Step 05** (configurar ESLint sem CI bloqueante inicial) e
> **Step 15** (subir ESLint para bloqueio em CI).

## 8. Rotas existentes

Total: **47 paginas (`page.tsx`)**, **4 layouts (`layout.tsx`)**,
**0 API routes** (`route.ts/route.tsx`). Backend e consumido via rewrite
`/api/proxy/:path*` -> `NEXT_PUBLIC_API_URL`.

### Por area

**`/` (root)** — `src/app/page.tsx`, `src/app/login/page.tsx`

**`/bi/financeiro/*`** (12 paginas, area BI):
- `page.tsx` (dashboard executivo)
- `caixa/page.tsx`, `caixa/dre-mensal/page.tsx`
- `extrato/page.tsx`
- `cp-cr/page.tsx`
- `fluxo/page.tsx`
- `conciliacao/page.tsx`
- `admin/page.tsx`, `admin/categorias/page.tsx`, `admin/contas-bancarias/page.tsx`

**`/dashboard/*`** (7 paginas — **legado / sera tratado no Step 12**):
- `page.tsx`, `caixa`, `cp`, `cr`, `extrato`, `fluxo`, `conciliacao`

**`/portal/*`** (26 paginas — hub):
- root: `page.tsx`, `setup`, `fechamento`
- `admin/*`: `page`, `permissoes`
- `documentos/*`: `page`, `mvv`, `organograma`, `planejamentos`, `politicas`,
  `processos`, `[id]` (dinamica)
- `financeiro/*`: `caixa`, `cp`, `cr`, `extrato`, `fluxo`, `conciliacao`
- `grupo/*`: `page`, `estrutura`, `segmentacao`
- `indicadores/*`: `page`, `contabil`, `controladoria`, `custos`,
  `faturamento`, `financeiro`, `operacoes`

### Sensiveis (alvo de RBAC backend — Step 06)

- `/portal/admin`, `/portal/admin/permissoes` — administracao do hub
- `/bi/financeiro/admin/*` — admin financeiro (empresas, plano de contas,
  contas bancarias)
- `/portal/setup` — configuracao inicial
- `/portal/fechamento` — fechamento contabil

## 9. Variaveis publicas e ambiente

`.env.example`:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

`.env.local` presente (89 bytes, conteudo nao registrado no baseline).
`next.config.js` declara apenas `NEXT_PUBLIC_API_URL` como env publica.

## 10. Cabecalhos de seguranca em `next.config.js`

Aplicados em todas as rotas (`source: '/(.*)'`):

| Header | Valor | Comentario |
|---|---|---|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | OK |
| `X-Frame-Options` | `DENY` | OK |
| `X-Content-Type-Options` | `nosniff` | OK |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | OK |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | OK |
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https://*.railway.app https://*.vercel.app https://*.grupoalt.agr.br; frame-ancestors 'none'` | **`unsafe-inline` + `unsafe-eval` em `script-src`** |

> Tratamento: **Step 10** (CSP com nonce/hash, remover `unsafe-eval`).

## 11. Riscos ja identificados (entrada para os proximos steps)

1. **next 14.2.5 com 1 critical + multiplas vulnerabilidades de auth/cache/DoS** -> Step 04.
2. **lodash legado e vulneravel** -> Step 04.
3. **ESLint nunca foi inicializado** (`next lint` interativo) -> Step 05.
4. **Sem testes automatizados** (nenhum framework configurado, sem `npm test`) -> Steps 05 e 14.
5. **Sem CI bloqueante** (sem `.github/workflows`, sem audit/test gates) -> Step 15.
6. **CSP permissivo** (`unsafe-inline`/`unsafe-eval` em script-src) -> Step 10.
7. **Rotas `/dashboard/*` legadas convivem com `/bi/financeiro/*`** (duplicacao) -> Step 12.
8. **Plano de contas dinamico ja propagado**, mas calculos de DRE
   ainda usam `Math.abs` em pontos sensiveis -> Step 13.
9. **Frontend tem rotas administrativas** (`/portal/admin`, `/bi/financeiro/admin/*`,
   `/portal/setup`) — RBAC backend precisa ser auditada -> Step 06.
10. **Apenas `.env.example` documenta variaveis publicas**, nao ha checklist
    de secrets vs publicas -> Step 03.

## 12. Resumo objetivo

| Item | Status | Observacao |
|---|---|---|
| `git status` limpo | OK | Branch `claude/review-action-plan-9i9uq` |
| `npx tsc --noEmit` | OK | 0 erros |
| `npm run build` | OK | 49 paginas, sem warnings |
| `npm run audit:bundle` | OK | 81 JS, 0 credenciais expostas |
| `npm audit --omit=dev` | **6 vulns** | 1 critical (next), 1 high (lodash), 4 moderate |
| `npm run lint` | **INTERATIVO** | ESLint nao configurado |
| Rotas mapeadas | OK | 47 paginas, 4 layouts, 0 API routes |
| Headers basicos | OK | CSP precisa endurecer (Step 10) |

Nenhum arquivo funcional foi alterado neste step. Apenas leitura, registro
e `npm ci` para popular `node_modules` (necessario para typecheck/build).
