# Atualizacao Minima de Dependencias Vulneraveis

Data: 2026-04-29
Step: 04 — Dependencias vulneraveis
Modo: hardening — somente atualizacoes de patch dentro das majors atuais

---

## 1. Resumo das mudancas

| Pacote | Antes | Depois | Por que |
|---|---|---|---|
| `next` | `14.2.5` | `^14.2.35` | patch mais recente da linha 14, fecha 1 critical + varias high/moderate |
| `eslint-config-next` | `14.2.5` | `^14.2.35` | alinha com `next` |
| `axios` | `^1.7.7` (resolvido `1.13.6`) | `^1.15.2` | fecha vulnerabilidade transitive de `follow-redirects` |
| `lodash` (transitive via `recharts`) | `4.17.23` | `4.18.1` | resolvido por `npm audit fix` apos upgrade do next |
| `recharts` | `2.15.4` | **mantido** | proxima major (`3.x`) e breaking change — fora do escopo deste step |
| `jspdf` | `4.2.1` | **mantido** | ja na ultima versao |

Nenhum override foi necessario. A atualizacao das deps diretas
(via `npm audit fix` para o restante) cobriu tudo o que era
fixavel sem mudanca de major.

## 2. Estado de `npm audit --omit=dev`

### Antes do step

```
6 vulnerabilities (4 moderate, 1 high, 1 critical)
- next 14.2.5  (CRITICAL — multiplos CVEs)
- lodash 4.17.23  (high)
- follow-redirects (moderate)
- postcss <8.5.10  (moderate)
- + 2 entradas na cadeia next/postcss
```

### Depois do step

```
2 vulnerabilities (1 moderate, 1 high)
- next <16  (high — DoS Image Optimizer, HTTP smuggling em rewrites,
  RSC DoS, image disk cache, etc.)  -> bloqueado por next major
- postcss <8.5.10  (moderate — XSS via </style>)
  -> via node_modules/next/node_modules/postcss, bundlado pelo next
```

**Reducoes:**
- 1 critical eliminada (next 14.2.5 -> 14.2.35)
- 1 high eliminada (lodash 4.17.23 -> 4.18.1)
- 3 moderate eliminadas (follow-redirects, postcss top-level e a cadeia)

## 3. Vulnerabilidades **ainda em aberto** (risco aceito)

### A. `next <16` — high

CVEs remanescentes na linha 14.2.x:

- GHSA-9g9p-9gw9-jx7f — Image Optimizer DoS via `remotePatterns`
- GHSA-h25m-26qc-wcjf — HTTP request deserialization DoS em RSC inseguros
- GHSA-ggv3-7p47-pfv8 — HTTP smuggling em rewrites
- GHSA-3x4c-7xq6-9pq8 — `next/image` disk cache crescimento ilimitado
- GHSA-q4gf-8mx6-v5v3 — DoS em Server Components

**Por que aceitamos:** o Step 04 explicitamente diz "nao migrar para
Next 16 neste step, a menos que nao exista caminho seguro na linha 14".
Todos os CVEs sao DoS, nenhum e RCE. O upgrade para Next 16 e
breaking (App Router, middleware, fetch caching mudaram) e merece um
step proprio.

**Mitigacao operacional ate la:**

- Nao usar `next/image` com `remotePatterns` muito permissivo (ja
  nao usamos — confirmar no Step 09).
- Nao expor RSC com input nao tratado (ja nao expoe — ver auditoria
  de rotas no Step 06).
- Confirmar com o time de infra se Vercel/Railway aplicam rate limit
  a nivel de WAF.

### B. `postcss <8.5.10` — moderate

`node_modules/next/node_modules/postcss` (`8.4.31`) bundlado pelo
proprio next 14. **Nao da pra atualizar sem trocar de next major**.
O risco (XSS via `</style>` nao escapado) e relevante apenas no
output do postcss em build — nao roda em runtime no browser. Risco
aceito ate Next 16.

## 4. Validacoes pos-mudanca

```
npx tsc --noEmit --pretty false  -> 0 erros
npm run build                    -> 49 paginas, sem warnings
npm run audit:bundle             -> 81 JS, 0 credenciais expostas
npm audit --omit=dev             -> 2 vulns (ver acima)
```

## 5. Smoke test

**Nao executado ainda** porque este ambiente nao tem browser/UI
disponivel para login real. O CI `lint-and-build` e o build da
preview do Vercel passando sao a cobertura automatizada possivel.
Antes do merge em `main`, um humano precisa rodar o checklist do
Step 02 na URL de preview do PR:

- [ ] login com `qa-admin` (ou usuario admin real em empresa fake)
- [ ] navegar `/portal/grupo`
- [ ] navegar `/bi/financeiro` -> dashboard executivo
- [ ] navegar `/bi/financeiro/extrato` (axios fez chamadas?)
- [ ] navegar `/bi/financeiro/cp-cr`
- [ ] navegar `/bi/financeiro/admin/categorias` (se admin)
- [ ] logout

## 6. Diff de `package.json`

```diff
-    "axios": "^1.7.7",
+    "axios": "^1.15.2",
-    "next": "14.2.5",
+    "next": "^14.2.35",
-    "eslint-config-next": "14.2.5",
+    "eslint-config-next": "^14.2.35",
```

`package-lock.json` regerado consistente. `node_modules` pode ser
recriado a partir do lockfile com `npm ci`.

## 7. Rollback

`git revert` do commit deste step e `npm ci` restauram o estado anterior.
Nenhuma migracao de schema, codigo ou configuracao foi feita junto.

## 8. Pendencias herdadas

- **Migracao para Next 16** — fecha as 2 vulns remanescentes mas
  exige um step proprio (App Router/middleware/fetch caching).
  Recomendacao: depois do Step 06 (RBAC backend) estar verde, antes
  do Step 11 (empresa ativa). Em PR proprio, com smoke test completo.
- **Avaliar upgrade de `recharts` 2.x -> 3.x** — fora do escopo de
  hardening. Trazem mudancas de API.
- **Revisar `npm outdated`** apos Next 16: `react`/`react-dom` 18 -> 19,
  `eslint` 8 -> 9, `tailwindcss` 3 -> 4. Cada um e seu proprio PR.

## 9. Criterios de pronto (Step 04)

- [x] Build passa.
- [x] Typecheck passa.
- [x] Audit nao tem critical, e os 2 high/moderate restantes estao
      formalmente justificados.
- [x] Lockfile atualizado de forma consistente.
- [x] Nenhum comportamento funcional mudou intencionalmente.
- [ ] Smoke test manual no preview por humano (pre-merge).
