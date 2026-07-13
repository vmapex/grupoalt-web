# PR-4 — Upgrade Next 16 + React 19 + ESLint 9 (Flat Config) — Authoritative Migration Plan

> Branch: `chore/upgrade-next-16-eslint-9`
> Repo: `grupoalt-web` (Next.js App Router, TS, Tailwind, Zustand, Recharts) — Vercel `portal.grupoalt.agr.br`
> Status of this doc: synthesized from 5 investigation streams (A/B/C/D/E), cross-checked against the live repo and the npm registry on 2026-06-19. **Merge is deferred to "Janela D"** per CLAUDE.md (never merge during the DRE soak / Janela A).

---

## 1. Executive summary + go/no-go verdict

This is a **coordinated, single-atomic-PR** upgrade. The five streams converge unanimously on the root cause and the shape of the fix; the only material correction made during verification concerns the **ESLint version pin** (see "Resolved contradictions" below).

**Is recharts 2 → 3 forced?** **No.** `recharts@2.15.4` already declares React 19 in its peer range (`react: ^16 || ^17 || ^18 || ^19` — verified via `npm view`). Recharts 3.x is a full Redux-based internal rewrite (adds react-redux/@reduxjs/toolkit/immer/victory-vendor, removes `CategoricalChartState`, internally-cloned `points`/`payload`/`activeIndex`, `alwaysShow`, `isFront`). **Keep recharts 2.15.4.** Defer any v3 move to its own PR.

**Is React 19 forced?** **Effectively yes.** By peer *contract*, `next@16.2.9` accepts `react@^18.2.0 || ^19.0.0` (verified). But the Next 16 App Router runs the React 19.2 canary internally, the official upgrade path is `react@latest react-dom@latest`, and React 18 is the untested-against config. **Ship React 19.2 with Next 16; do not ship Next 16 on React 18.**

**Overall risk: LOW–MEDIUM, with HIGH confidence.** The app's React-19 / async-API surface is exceptionally small:
- **Exactly ONE** hard code blocker: `src/app/layout.tsx:39` calls `headers()` synchronously (must become `async` + `await`).
- **Zero** React-19 legacy-API usage in `src/` (no `propTypes`, `defaultProps`, `forwardRef`, string refs, `ReactDOM.render/hydrate`, `react-test-renderer`, `react-dom/test-utils`, argless `useRef()`, global `JSX.Element` decl).
- **Zero** route handlers, server `params`/`searchParams` consumers, `cookies()`/`draftMode()`, `next/font`, parallel routes, AMP, removed `next.config` keys, fetch-caching surface.
- The test toolchain (RTL 16, vitest 4, @vitejs/plugin-react 6, jsdom) is already React-19-ready.

The **root cause of the failed Vercel dependabot builds (#164, #171)** is fully explained and is *not* a Next-runtime mismatch: `eslint-config-next@16.2.9` peer-depends on `eslint >=9.0.0` (verified), but the repo pins `eslint ^8`. Bumping *only* `eslint-config-next` to 16 left an unsatisfiable peer graph (`eslint 8 < required >=9`) → `npm ci` ERESOLVE → Vercel build ERROR. Independently, Next 16 *removes* `next lint` entirely, so the `"lint": "next lint"` script and the legacy `.eslintrc.json` must migrate to the ESLint flat config (`eslint.config.mjs`) + `eslint .` CLI in the **same** PR.

**Verdict: GO** — proceed in an isolated worktree; validate fully on a Vercel Preview; merge only in Janela D. Two MEDIUM watch-items to clear on Preview: (a) Turbopack-default build composing cleanly with `withSentryConfig`; (b) `audit:bundle` still finds `.next/static` chunks after a Turbopack build.

### Resolved contradictions between streams

| # | Contradiction | Resolution (re-checked) |
|---|---|---|
| 1 | All streams say "bump `eslint` to `^9`". But `npm view eslint version` = **10.5.0** (latest); 9.39.4 is the `maintenance` tag. | **Pin `"eslint": "^9"` exactly (not `^10`, not `latest`).** `eslint-config-next@16.2.9` bundles `eslint-plugin-react-hooks@^7.0.0`, whose **earliest 7.x releases peer-allow only `^9.0.0`** (ESLint 10 not listed until later 7.x). `eslint-config-next` peer is the permissive `>=9.0.0`, so it *would* accept 10, but the bundled react-hooks plugin is the real floor. `"^9"` resolves to **9.39.4** — safe and within every transitive peer. Writing `latest`/`^10` risks an ERESOLVE on the react-hooks plugin. ESLint 10 is a future, separate PR. |
| 2 | Streams A/D/E emit `eslint.config.mjs` using **FlatCompat** (`@eslint/eslintrc`); Stream C proves `eslint-config-next@16` ships **native flat-config arrays** (`./core-web-vitals`, `./typescript`) and recommends native spread (no FlatCompat). | **Verified:** `npm view eslint-config-next@16.2.9 dependencies` lists `typescript-eslint`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, `eslint-plugin-import`, `eslint-plugin-jsx-a11y`, `globals` as direct deps. **Ship the native spread** (`...nextVitals`, `...nextTs`) — no extra `@eslint/eslintrc` dependency. FlatCompat form documented as fallback only. |
| 3 | Stream B/D pin `react ^19` loosely; A/E pin `^19.2.0`. | **Pin `^19.2.0`** to match the React 19.2 canary the App Router runs (latest stable is 19.2.7 — verified). `@types/react`/`@types/react-dom` → `^19` (latest 19.2.17 / 19.2.3). |
| 4 | Streams disagree on whether `@sentry/nextjs` must be bumped. | **Optional.** 10.53.1 already peer-accepts `next ^16.0.0-0` (verified). **Recommend bumping to `^10.58.0`** (latest, verified) for best Turbopack source-map handling — but it is not a peer-satisfaction gate. |
| 5 | Stream E flags a lockfile drift (`@vitejs/plugin-react` 5.2.0 vs declared `^6.0.2`; `vitest` 4.1.6 vs `^4.1.8`). | Reconcile via a clean `npm install` (regenerate lockfile) then `npm ci`. No `package.json` change needed for these. |

---

## 2. Exact `package.json` diff (every dependency, from → to, why)

> The lesson from #164/#171 is **bump together**. Every line below ships in **one** commit; `package-lock.json` is regenerated once and committed.

```diff
   "dependencies": {
-    "@sentry/nextjs": "^10.53.1",
+    "@sentry/nextjs": "^10.58.0",
     "axios": "^1.16.1",
     "clsx": "^2.1.1",
     "js-cookie": "^3.0.8",
     "lucide-react": "^1.17.0",
-    "next": "^14.2.35",
+    "next": "^16.2.9",
-    "react": "^18",
+    "react": "^19.2.0",
-    "react-dom": "^18",
+    "react-dom": "^19.2.0",
     "react-hot-toast": "^2.4.1",
     "recharts": "^2.15.4",
     "tailwind-merge": "^3.6.0",
     "zustand": "^5.0.14"
   },
   "devDependencies": {
     "@testing-library/dom": "^10.4.1",
     "@testing-library/react": "^16.3.2",
     "@types/js-cookie": "^3.0.6",
     "@types/node": "^25",
-    "@types/react": "^18",
+    "@types/react": "^19",
-    "@types/react-dom": "^18",
+    "@types/react-dom": "^19",
     "@vitejs/plugin-react": "^6.0.2",
     "autoprefixer": "^10.5.0",
     "axios-mock-adapter": "^2.1.0",
-    "eslint": "^8",
+    "eslint": "^9",
-    "eslint-config-next": "^14.2.35",
+    "eslint-config-next": "^16.2.9",
     "jsdom": "^29.1.1",
     "postcss": "^8.5.15",
     "tailwindcss": "^3.4.13",
     "typescript": "^5",
     "vitest": "^4.1.8"
   },
+  "engines": {
+    "node": ">=20.9.0"
+  }
```

### Why each bump

| Package | From | To | Forced? | Reason (peer-dep chain) |
|---|---|---|---|---|
| `next` | ^14.2.35 | **^16.2.9** | **FORCED (the upgrade)** | Target. Closes EXC-001 / issue #56. `engines.node >=20.9.0` (verified). |
| `react` | ^18 | **^19.2.0** | **FORCED (practical)** | App Router runs React 19.2 canary; official path installs `react@latest`. Peer *contract* allows 18.2+, but 19 is the only tested config. |
| `react-dom` | ^18 | **^19.2.0** | **FORCED** | Lockstep with `react`. |
| `@types/react` | ^18 | **^19** | **FORCED** | Must match React 19 runtime or `tsc --noEmit` fails on ref-as-prop / `ReactElement` prop shape changes. Latest 19.2.17. |
| `@types/react-dom` | ^18 | **^19** | **FORCED** | Lockstep with `@types/react`. Latest 19.2.3. |
| `eslint` | ^8 | **^9** | **FORCED (root cause)** | `eslint-config-next@16` peer = `eslint >=9.0.0`. `^9` resolves **9.39.4** — within every transitive peer. **Do NOT write `^10`/`latest`** (bundled `eslint-plugin-react-hooks@^7` early releases cap at `^9`). |
| `eslint-config-next` | ^14.2.35 | **^16.2.9** | **FORCED** | Must track Next major; ships native flat-config + ESLint-9 plugins. Never bump alone (that broke #164/#171). |
| `@sentry/nextjs` | ^10.53.1 | **^10.58.0** | Optional (recommended) | 10.53.1 already peer-accepts `next ^16.0.0-0`. Bump to 10.58.0 (latest) for Turbopack build-plugin / source-map handling. |
| `recharts` | ^2.15.4 | **unchanged** | No | Already React-19-compatible. v3 = breaking rewrite → separate PR. |
| `lucide-react`, `react-hot-toast`, `zustand` | — | **unchanged** | No | All already peer-accept React 19 (verified). Optional routine minor bumps, not gated by this PR. |
| `@testing-library/react` 16, `@testing-library/dom` 10, `@vitejs/plugin-react` 6, `vitest` 4, `jsdom`, `tailwindcss` 3.4, `postcss`, `autoprefixer`, `typescript` ^5, `@types/node` ^25 | — | **unchanged** | No | React-19/Next-16-ready as-is. TS ^5 satisfies the ≥5.1 floor. Tailwind 4 / TS 6 are explicitly out of scope. |
| `engines.node` | (absent) | **`>=20.9.0`** | New | Makes the Node floor explicit (Next 16 drops Node 18). Dev box Node 24.16 OK. |

---

## 3. Config file changes (full final contents / precise diffs)

### 3.1 `eslint.config.mjs` (NEW — native flat config, NO FlatCompat)

Place at repo root. Native spread of the arrays `eslint-config-next@16` exports, then the custom rule object **last** (flat config = later objects override). The `no-restricted-imports` rule and its Portuguese message are copied **byte-for-byte** from `.eslintrc.json`.

```js
// eslint.config.mjs
import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Mantém o comportamento atual: exhaustive-deps fica em 'warn'
      // (a baseline tem ~20 warnings; CI NÃO falha em warnings).
      'react-hooks/exhaustive-deps': 'warn',
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@/hooks/useAPI',
                '@/hooks/useAPI/*',
                '**/hooks/useAPI',
                '**/hooks/useAPI/*',
              ],
              message:
                'O barrel @/hooks/useAPI foi removido em 2026-05-24 (PR #154). Importe direto do dominio em @/hooks/api/<modulo> (useExtrato, useCPCR, useFluxo, useConciliacao, useNotificacoes, useCategoriasAPI, useContasBancarias, useOrbitAudit, useAdminEmpresas, _core, useSaldos).',
            },
          ],
        },
      ],
    },
  },
  globalIgnores([
    '.next/**',
    '.next/dev/**',
    'out/**',
    'build/**',
    'coverage/**',
    'next-env.d.ts',
  ]),
])

export default eslintConfig
```

Notes:
- `...nextVitals` = `eslint-config-next/core-web-vitals` (Next + React + react-hooks base, CWV warn→error). `...nextTs` = `eslint-config-next/typescript` (typescript-eslint recommended). Both are needed for this TS-heavy repo and mirror what `create-next-app --typescript` emits on Next 16.
- `react-hooks/exhaustive-deps: 'warn'` is **explicit** so the ~20 existing warnings stay non-fatal even if `eslint-plugin-react-hooks@7` recommended config would otherwise relocate/promote them. `rules-of-hooks` remains `error` (inherited).
- `.next/dev/**` is added because Next 16 dev output moves under `.next/dev`.
- **`globalIgnores` / `defineConfig` are imported from `eslint/config`** — available in ESLint 9.x. No `@eslint/eslintrc` dependency.

**Fallback (only if native spread fails to resolve after install)** — requires `npm i -D @eslint/eslintrc`:

```js
import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { FlatCompat } from '@eslint/eslintrc'
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const compat = new FlatCompat({ baseDirectory: __dirname })
export default [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  { rules: { 'react-hooks/exhaustive-deps': 'warn', 'no-restricted-imports': [ /* identical rule + verbatim message as above */ ] } },
  { ignores: ['node_modules/**', '.next/**', '.next/dev/**', 'out/**', 'build/**', 'coverage/**', 'next-env.d.ts'] },
]
```

### 3.2 `.eslintrc.json` — DELETE

```bash
git rm .eslintrc.json
```
Fully superseded by `eslint.config.mjs`. ESLint 9 + `@next/eslint-plugin-next@16` both default to flat config; keeping both risks double-application. No `.eslintignore` / lint-staged to migrate (none exist).

### 3.3 `package.json` scripts diff

```diff
-    "lint": "next lint",
+    "lint": "eslint .",
```
(Optionally add `"lint:fix": "eslint . --fix"`.) `next lint` is removed in Next 16; `next build` no longer lints. CI step `npm run lint` is unchanged — it now invokes the ESLint CLI.

### 3.4 `next.config.js` — NO CHANGE REQUIRED

Verified: only `output:'standalone'`, `env`, `rewrites`, `redirects` (308), `headers`, wrapped with `withSentryConfig`. **No** `webpack` key (so Turbopack-default build won't trip the webpack-config guard), **no** `images` key, **no** removed/renamed keys (`swcMinify`, `experimental.ppr/dynamicIO/useCache`, `serverRuntimeConfig`, `amp`, `eslint`). All carry over to 16 unchanged. The CSP-via-middleware comment and `tunnelRoute: undefined` (keeps `/monitoring` out of CSP) stay as-is.

*Contingency only* — if the Turbopack build errors with a phantom-webpack-config message originating from `withSentryConfig`, change `"build": "next build"` → `"build": "next build --webpack"` as a fallback (do **not** apply pre-emptively).

### 3.5 `tsconfig.json` — NO CHANGE REQUIRED

Verified: `target ES2017`, `moduleResolution: "bundler"`, `strict: true`, `skipLibCheck: true`, `plugins: [{ "name": "next" }]`, `paths { "@/*": ["./src/*"] }`. All valid on Next 16 / TS 5.x. `skipLibCheck: true` already shields against most `@types/react` 19 lib churn. No change.

### 3.6 `.github/workflows/ci.yml` — pin Node 22

```diff
       - uses: actions/setup-node@v6
         with:
-          node-version: "20"
+          node-version: "22"
           cache: npm
```
Bare `"20"` resolves to latest 20.x (≥20.9, technically OK) but is fragile; `"22"` is unambiguous and ≥ Next 16 floor. No other CI step changes (lint/typecheck/test/build/audit:bundle all call npm scripts; `npm audit` stays `continue-on-error: true`).

### 3.7 `.github/dependabot.yml` — relax the now-obsolete ignores (in the SAME PR)

The rationale block and the major-version ignores for `next`, `eslint`, `react`, `react-dom`, `@types/react`, `@types/react-dom`, `typescript` were all gated on "Next 14.x". This PR delivers that unblock. Remove those specific ignores so future minors/patches flow; **keep** `recharts` and `tailwindcss` major ignores (still deferred to dedicated PRs). Keep `date-fns` if present.

---

## 4. Codemods to run (exact, in order)

Run from repo root, **inside the isolated worktree**, after the `package.json` diff is applied and `npm install` has regenerated the lockfile. **Review every diff** — do not blind-accept.

1. **React 19 TS-only fixups** (after `@types/react@19` is installed):
   ```bash
   npx types-react-codemod@latest preset-19 ./src
   ```
   Catches `ReactElement` props→`unknown`, argless `useRef`, `useReducer` type args, removed `JSX` global. **Review:** in this repo the grep surface is empty, so expect **near-zero diff**; if it touches files, confirm each edit is a pure type change.

2. **Async Request APIs** (the one real app-code transform):
   ```bash
   npx @next/codemod@latest next-async-request-api .
   ```
   Should rewrite the single sync `headers()` call in `src/app/layout.tsx`. **Review carefully:** the codemod sometimes emits an `(headers() as unknown as ...)` `UnsafeUnwrapped` cast instead of a clean `await`. If so, replace it with the explicit `await` form in §5.1. RootLayout must end up `async`.

3. **next-lint → ESLint CLI** *(optional — only if you prefer codemod-scaffolding over hand-writing §3.1/§3.3)*:
   ```bash
   npx @next/codemod@canary next-lint-to-eslint-cli .
   ```
   It scaffolds `eslint.config.mjs` (FlatCompat form), rewrites the `lint` script, and adds deps. **If you run it, you MUST:** (a) replace its output with the native §3.1 form (or keep FlatCompat and `npm i -D @eslint/eslintrc`), (b) re-add the `no-restricted-imports` rule with the **byte-identical** Portuguese message, (c) re-add `react-hooks/exhaustive-deps: 'warn'`. **Recommended: skip this codemod and hand-write §3.1/§3.3.**

**DO NOT run** `middleware-to-proxy` (see §6 — would force nodejs runtime and break the edge CSP nonce). **NOT NEEDED** (verified absent): `next-request-geo-ip`, `built-in-next-font`, `app-dir-runtime-config-experimental-edge`, `remove-unstable-prefix`, `remove-experimental-ppr`.

> The all-in-one `npx @next/codemod@canary upgrade latest` is acceptable but its only *material* action here is the lint migration + version bumps; if you use it, **reject the middleware→proxy step** and still hand-fix `layout.tsx`.

---

## 5. Per-file code changes

### Category A — Async Request APIs (the ONE hard blocker)

#### 5.1 `src/app/layout.tsx`

```diff
-export default function RootLayout({ children }: { children: React.ReactNode }) {
+export default async function RootLayout({ children }: { children: React.ReactNode }) {
   // Step 10 — Fase 4: nonce gerado pelo middleware. ...
-  const nonce = headers().get('x-nonce') ?? undefined
+  const requestHeaders = await headers()
+  const nonce = requestHeaders.get('x-nonce') ?? undefined
```
- `import { headers } from 'next/headers'` (line 2) stays.
- The `themeBootstrap` string, `metadata`, all JSX (`<html ... suppressHydrationWarning>`, `<script nonce={nonce} ...>`, `<ThemeHydrator/>`, `<SentryUserBridge/>`) are **unchanged**.
- This is the **only** source file that *must* change for the runtime upgrade.

### Category B — React 19 legacy-API rewrites

**None.** Verified zero matches in `src/` for `propTypes`, `defaultProps`, `forwardRef`, legacy string refs, `ReactDOM.render/hydrate`, `renderToString`, `react-test-renderer`, `react-dom/test-utils`, argless `useRef()`, `React.FC`, global `JSX.Element`/`namespace JSX`. Tests already import `act` from `@testing-library/react`. No source edits.

### Category C — Dynamic routes / params

**None.** The only dynamic route `src/app/portal/documentos/[id]/page.tsx` is `'use client'` and reads the param via the client `useParams()` hook (unchanged in 16), not via an async server `params` prop. No server page/layout/route handler destructures `params`/`searchParams`.

### Category D — `next/image`, `next/font`, `next/link`

**None.** No `next/font`, no `legacyBehavior`, no `next/legacy/image`. The external/base64 logos pass `unoptimized`. The one optimized image (`login/page.tsx` static `/logo_grupo_alt.png`) renders fine at the new default quality 75. No `images` block to add.

---

## 6. CSP / middleware verification (nonce mechanism survival)

**Keep `src/middleware.ts` named `middleware.ts`. Do NOT rename to `proxy.ts` and do NOT run the middleware→proxy codemod.** In Next 16, `proxy` runs on the **nodejs runtime only** — the edge runtime is *not* supported there. The repo's middleware is deliberately edge-safe (`crypto.getRandomValues` + `btoa`, no `Buffer`/Node) and generates a **per-request** CSP nonce. Migrating to `proxy.ts` would change the runtime and the nonce-generation semantics. `middleware.ts` still works in 16 (emits a deprecation warning only — non-fatal).

The nonce-propagation contract is **unchanged** in Next 16:
- middleware sets `x-nonce` on the request headers via `NextResponse.next({ request: { headers } })` (line 58) and the `Content-Security-Policy` response header (line 59);
- Next reads `x-nonce` to nonce its own streaming-SSR inline scripts;
- `RootLayout` reads the same header to nonce the theme-bootstrap `<script>` — this is exactly the line being made async in §5.1.

**Re-test exactly this after the upgrade (production build, `npm run start`):**
1. **CSP header present** on the main document, with `script-src 'self' 'nonce-XXXX'` and **no** `'unsafe-inline'` and **no** `'unsafe-eval'` in production.
2. **Nonce match** — the inline theme-bootstrap `<script nonce="...">` in `<head>` carries a `nonce` whose value equals the `script-src 'nonce-...'` value in the response header.
3. **Per-request rotation** — reload twice; the nonce value changes each request.
4. **Zero CSP console violations** — no "Refused to execute inline script…" error; the theme applies before first paint (no flash of wrong theme on hard reload).
5. **Prefetch matcher** still excludes `next-router-prefetch` / `purpose: prefetch` (the `missing` rules at lines 77–80).
6. Confirm the build log shows **only a deprecation warning** for the middleware filename, **not** an error.

---

## 7. Risk register

| ID | Risk | Likelihood | Impact | Mitigation | Rollback |
|---|---|---|---|---|---|
| R-1 | **recharts blank-render under React 19.2** (open issue recharts#6857, reported on v3.6.0) — App Router runs React 19.2 internally even though we stay on recharts 2.15.4. | Low | High (all BI dashboards) | Smoke-test ALL 7 chart sites on Vercel Preview: Dashboard, `caixa/ChartGrid`+`DetailPanel`, `cp-cr`, `fluxo`, and portal mirrors (`cp/_content`, `fluxo/_content`). RTL chart tests also exercise this. | Revert PR (Vercel redeploy <2min). recharts stays on 2.x regardless. |
| R-2 | **React 19 third-party fallout** (act() strictness; type-shape changes in `tsc`). | Low | Medium | RTL 16 is the React-19 act release; run `npm test` + `npm run typecheck`. Treat new act() lines as warnings to fix incrementally. `types-react-codemod preset-19` pre-empts type churn. | None needed (warnings); if a test breaks, fix in-PR. |
| R-3 | **CSP nonce regression** — async `headers()` change drops the nonce → inline theme script blocked by no-unsafe-inline CSP (FOUC + console error). | Low | High (security + UX) | The mandatory manual CSP-nonce smoke (§6/§9). The change is mechanical (`await`); the propagation contract is unchanged in 16. | Revert PR; the prod build before merge is unaffected (Janela D gating). |
| R-4 | **Caching-default behavior change** (Next 15/16 uncached fetch/GET, Client Router Cache). | **None** | — | Verified **not applicable**: zero route handlers, zero server `fetch()` data, no `generateStaticParams`/`dynamic`/`revalidate`/`unstable_*`. Data layer is Axios via `/api/proxy`. App is already fully dynamic. | N/A |
| R-5 | **Vercel build ERROR (the #164/#171 root cause)** — unsatisfiable ESLint peer graph. | Low (now coordinated) | High (build red) | Bump `eslint ^9` + `eslint-config-next ^16` **together with** Next 16 in one PR; pin `eslint ^9` (NOT `^10`/`latest`). Pre-flight `npm ls eslint eslint-config-next` must show **zero** "invalid"/"UNMET PEER". | Revert PR. Never let dependabot bump `eslint-config-next` alone again (dependabot ignores updated in §3.7). |
| R-6 | **Turbopack-default build × withSentryConfig** — phantom webpack-config guard or source-map upload failure. | Low–Medium | Medium | No `webpack` key in `next.config.js`. Bump `@sentry/nextjs` → 10.58.0. Build on Preview first; if it errors on a phantom webpack config, fall back to `next build --webpack`. | Set `build` to `next build --webpack`; or revert PR. |
| R-7 | **`audit:bundle` scans zero files** — Turbopack relocates client chunks out of `.next/static`. | Low | Medium (silent scan bypass) | `scripts/check-bundle-secrets.js` reads `.next/static`. After build, assert `npm run audit:bundle` prints "Verificando N arquivos JS" with **N > 0**. | If N==0, update `buildDir` in the script; block merge until fixed. |
| R-8 | **Vercel Node pinned to 18.x** — Next 16 requires ≥20.9. | Low | High (build fails) | Set Vercel Project → Node.js Version to **22.x**; CI pinned to 22; `engines.node >=20.9.0` added. | Change Vercel Node setting (no code). |
| R-9 | **middleware deprecation becomes removal** in a future Next minor. | Low (16.2 = deprecation only) | Medium | Keep `middleware.ts` (edge) for now; track upstream for edge-`proxy` guidance. Out of scope for PR-4. | Future PR when edge-proxy lands. |

---

## 8. Ordered execution checklist (isolated worktree)

1. **Confirm not in Janela A blackout** — DRE soak D+7 gate is 2026-06-25 17:35; PR-4 may be *developed* during soak but **merged only in Janela D**.
2. **Create isolated worktree** off `main`:
   ```bash
   git worktree add ../grupoalt-web-next16 -b chore/upgrade-next-16-eslint-9 origin/main
   cd ../grupoalt-web-next16
   ```
3. **Apply the `package.json` diff** from §2 (deps, devDeps, `engines`).
4. **Regenerate lockfile:** `npm install` (one time; also reconciles the pre-existing `@vitejs/plugin-react`/`vitest` drift).
5. **Pre-flight peer check:** `npm ls next react react-dom eslint eslint-config-next` → must show next 16.2.x, react/react-dom 19.x, eslint 9.x, eslint-config-next 16.2.x, and **zero** "invalid"/"UNMET PEER DEPENDENCY". If any peer unmet → STOP (this is exactly #164/#171).
6. **Create `eslint.config.mjs`** (§3.1, native form) and **`git rm .eslintrc.json`** (§3.2).
7. **Change `lint` script** → `"eslint ."` (§3.3).
8. **Run codemods** in order (§4): `types-react-codemod preset-19 ./src` → `next-async-request-api .`. Review every diff.
9. **Hand-fix `src/app/layout.tsx`** (§5.1) if the async codemod left an `UnsafeUnwrapped` cast.
10. **Update CI** Node → `"22"` (§3.6) and **dependabot.yml** ignores (§3.7).
11. **Run the full local validation gate** (§9). All must be green.
12. **Manual CSP-nonce smoke** (§6 / §9 step 8) against `npm run start`.
13. **Smoke-test the 7 recharts pages** locally (R-1).
14. **Commit** (single commit) and **push** the branch; open the PR (do **not** merge).
15. **Validate on Vercel Preview:** set Preview env Node 22; confirm Turbopack build green, source-maps upload, CSP header + nonce on Preview URL, recharts pages render.
16. **Run the audit-agent** per the mandated audit pattern. Address findings.
17. **Hold for Janela D merge** — only after DRE soak complete + no other window active. Then squash-merge.

---

## 9. Local validation gate (exact commands + pass criteria)

Run from the worktree root on Node ≥20.9 (local 24.16 OK), **in this order, before push**:

```bash
# 0. Pre-flight — coordinated bump landed as one set
npm ls next react react-dom eslint eslint-config-next
#    PASS: next 16.2.x, react/react-dom 19.x, eslint 9.x, eslint-config-next 16.2.x;
#    ZERO lines containing "invalid" or "UNMET PEER DEPENDENCY".  FAIL → STOP.

# 1. Clean install (reproduces CI `npm ci`, reconciles lockfile drift)
rm -rf node_modules && npm ci
#    PASS: exit 0, no ERESOLVE / unmet-peer.

# 2. Typecheck
npm run typecheck                 # tsc --noEmit --pretty false
#    PASS: exit 0. WATCH: RootLayout must be async + await headers() or .get() on a Promise errors.

# 3. Lint (now raw ESLint CLI, flat config)
npm run lint                      # eslint .
#    PASS: exit 0. WARNINGS allowed (react-hooks/exhaustive-deps ~20 — accepted baseline).
#    FAIL if: any rule ERRORs, OR the @/hooks/useAPI ban is missing/altered
#    (verify the Portuguese message is byte-identical), OR flat config fails to load.

# 4. Tests
npm test                          # vitest run (~357 tests, ~25 files)
#    PASS: all green, exit 0. act() warnings OK; failures are not.

# 5. Build (Turbopack default)
npm run build                     # next build
#    PASS: exit 0, route table prints, NO "webpack configuration was found" error,
#    NO sync-dynamic-API runtime error on headers(). Only a middleware-filename
#    deprecation warning is acceptable. Confirm .next/static exists.
#    FALLBACK if Sentry/webpack collision: build with `next build --webpack`.

# 6. Bundle-secrets audit (consumes step 5 output)
npm run audit:bundle              # node scripts/check-bundle-secrets.js
#    PASS: "Verificando N arquivos JS no bundle..." with N > 0, then
#    "Nenhuma credencial exposta no bundle." exit 0.
#    FAIL if N == 0 (Turbopack moved output → fix buildDir) or any credential reported.

# 7. npm audit (non-blocking, informational)
npm audit --omit=dev --audit-level=high
#    EXPECTED: the Next 14.x advisory (EXC-001) should now be GONE — this upgrade is its remediation.
#    Update docs/plano-acao-seguranca/audit-exceptions.md to close EXC-001 (references issue #56).

# 8. MANUAL CSP-NONCE SMOKE (load-bearing — cannot be automated)
npm run start                     # serves the step-5 prod build on :3000
```
In DevTools at `http://localhost:3000`:
- **Elements:** inline theme-bootstrap `<script nonce="...">` in `<head>` carries a nonce **equal** to the `Content-Security-Policy` response header's `script-src 'nonce-...'`.
- **Network → main document → Response Headers:** `Content-Security-Policy` present; `script-src 'self' 'nonce-XXXX'` with **no** `'unsafe-inline'` / **no** `'unsafe-eval'` (prod).
- **Console:** **zero** "Refused to execute inline script…" violations; theme applies before paint (no FOUC).
- **Reload twice:** nonce value **changes** between requests.
- PASS = nonce present + matches header + no violations + theme applies + per-request rotation. This validates the §5.1 async-headers() change didn't break nonce propagation (R-3).

### Mapping to the PR-4 merge gate

| PR-4 gate (CLAUDE.md) | Satisfied by |
|---|---|
| **CI verde** | Gate steps 1–6 green locally **and** on the GitHub `Frontend CI` workflow (Node 22). |
| **CSP Preview validado** | Gate step 8 locally **plus** the same CSP-nonce checks on the **Vercel Preview** deployment. |
| **smoke** | Gate step 8 + the 7 recharts pages (R-1) on local `npm run start` and on the Preview URL. |
| **closes issue #56** | This PR is the Next 16 remediation for EXC-001; close issue #56 on merge and update `audit-exceptions.md`. |
| **merge timing** | Squash-merge **deferred to Janela D** (post-DRE-soak) per CLAUDE.md — never during Janela A. |

---

### Authoritative facts re-verified live (npm registry + repo, 2026-06-19)
- `next@16.2.9`: peer `react ^18.2.0 || ^19.0.0`, `engines.node >=20.9.0`.
- `eslint-config-next@16.2.9`: peer `eslint >=9.0.0`; bundles `typescript-eslint ^8.46`, `eslint-plugin-react ^7.37`, `eslint-plugin-react-hooks ^7`, `eslint-plugin-import ^2.32`, `eslint-plugin-jsx-a11y ^6.10`, `@next/eslint-plugin-next 16.2.9`, `globals 16.4` (native flat config — no FlatCompat needed).
- `recharts@2.15.4`: peer `react ^16||^17||^18||^19` (no v3 forced).
- `@sentry/nextjs`: latest 10.58.0, peer `next … || ^16.0.0-0`.
- ESLint: latest **10.5.0**, `maintenance`=9.39.4 → **pin `^9`** (react-hooks@7 early peer caps at `^9`).
- react/react-dom latest 19.2.7; `@types/react` 19.2.17; `@types/react-dom` 19.2.3.
- Repo confirmed: `layout.tsx:39` sync `headers()`; `middleware.ts` edge-safe nonce; `next.config.js` no `webpack`/`images` key; `tsconfig.json` bundler+strict; `check-bundle-secrets.js` reads `.next/static`; CI Node `"20"`; dependabot ignores `next/eslint/react/react-dom/@types/* /typescript` majors (this PR unblocks them).
