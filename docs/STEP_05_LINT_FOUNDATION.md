# Lint e Testes — Fundacao Sem Bloqueio Inicial

Data: 2026-04-29
Step: 05 — Lint e testes (foundation)
Modo: configuracao minima — sem fix de warnings, sem instalar Vitest

---

## 1. Resumo das mudancas

| Item | Antes | Depois |
|---|---|---|
| `.eslintrc.json` | (nao existia) | `{ "extends": ["next/core-web-vitals"] }` |
| `npm run lint` | abria prompt interativo | roda direto, lista warnings |
| `npm run typecheck` | (nao existia) | `tsc --noEmit --pretty false` |
| Vitest / framework de testes | nao instalado | **adiamos para Step 14** |

## 2. Resultado do lint

```
npm run lint
```

- **0 erros**
- **49 warnings** distribuidos em duas regras:

| Regra | Ocorrencias | Severidade |
|---|---|---|
| `react-hooks/exhaustive-deps` | 45 | warning |
| `@next/next/no-img-element` | 4 | warning |

Build, typecheck e CI nao sao bloqueados (warnings nao quebram nada).
O CI atual (`.github/workflows/ci.yml`) ja tem
`continue-on-error: true` no passo de lint.

## 3. Por que nao corrigi os warnings agora

O Step 05 diz explicitamente:

> "corrigir apenas problemas triviais e seguros;
>  nao fazer refactor visual;
>  nao mudar regra de negocio;
>  registrar backlog para etapa posterior."

E os 49 warnings que aparecem **nao sao triviais**:

### `react-hooks/exhaustive-deps` (45 warnings)

Cada um exige decisao caso-a-caso. Adicionar uma dependencia faltante
pode:

- causar loop infinito de render
- duplicar fetch de API
- recalcular memos pesados a cada render
- mudar o momento de execucao de side-effects

A maior parte dos warnings cita variaveis derivadas (`lancamentos`,
`getCatDesc`, `today`, `EMPTY_LEVEL`, `cpAberto`/`crAberto`,
`financialContext`) — nao da pra corrigir em massa sem ler cada
`useMemo`/`useEffect`/`useCallback`. Vai para o Step 13 (calculos
BI/DRE) ou Step 14 (testes de dominio).

### `@next/next/no-img-element` (4 warnings)

Trocar `<img>` por `<Image />` exige:

- saber `width`/`height` correto
- ajustar layout (Image e block por padrao, comportamento de
  `object-fit` muda)
- considerar custo na Vercel (Image Optimizer e cobrado por uso)
- providenciar `alt` adequado

Locais afetados:
- `src/app/bi/financeiro/admin/page.tsx:78` — logo de empresa
- `src/app/login/page.tsx:99` — logo na pagina de login
- `src/components/nav/EmpresaDropdown.tsx:37` — logo na dropdown
- `src/components/nav/Navbar.tsx:97` — logo na navbar

Tambem note que o Step 04 deixou registrado o CVE
`Image Optimizer DoS via remotePatterns`. Migrar para `<Image />`
pode aumentar exposicao a esse CVE ate Next 16. Tratamento adequado:
**Step 09** (notificacoes/exportacoes/rotas) ou um PR de UI dedicado.

## 4. Backlog de lint

| Arquivo | Linha | Regra | Tipo |
|---|---|---|---|
| `src/app/bi/financeiro/admin/page.tsx` | 78 | no-img-element | logo |
| `src/app/login/page.tsx` | 99 | no-img-element | logo |
| `src/components/nav/EmpresaDropdown.tsx` | 37 | no-img-element | logo |
| `src/components/nav/Navbar.tsx` | 97 | no-img-element | logo |
| `src/app/bi/financeiro/caixa/dre-mensal/page.tsx` | 49, 53 | exhaustive-deps | `lancamentos` em useMemo |
| `src/app/bi/financeiro/caixa/page.tsx` | 47 (8x), 52, 53 | exhaustive-deps | `lancamentos`, `EMPTY_LEVEL` |
| `src/app/bi/financeiro/cp-cr/page.tsx` | 133, 148, 173, 185 | exhaustive-deps | `getCatDesc`, `today` |
| `src/app/bi/financeiro/extrato/page.tsx` | 82, 97 | exhaustive-deps | `getCatDesc`, `projetoNomeByCodigo` |
| `src/app/bi/financeiro/fluxo/page.tsx` | 136 | exhaustive-deps | `cpAberto`, `crAberto` |
| `src/app/bi/financeiro/layout.tsx` | 60 | exhaustive-deps | `setBiView` |
| `src/app/bi/financeiro/page.tsx` | 98, 138 | exhaustive-deps | `lancamentos`, `concilPct`, `fluxo30d` |
| `src/app/portal/admin/page.tsx` | 77 | exhaustive-deps | `loadData` |
| `src/app/portal/financeiro/caixa/_content.tsx` | 44 (7x), 49, 50 | exhaustive-deps | `lancamentos`, `EMPTY_LEVEL` |
| `src/app/portal/financeiro/cp/_content.tsx` | 130, 145, 170, 182 | exhaustive-deps | `getCatDesc`, `today` |
| `src/app/portal/financeiro/extrato/page.tsx` | 64, 78 | exhaustive-deps | `getCatDesc` |
| `src/app/portal/financeiro/fluxo/_content.tsx` | 133 | exhaustive-deps | `cpAberto`, `crAberto` |
| `src/app/portal/layout.tsx` | 77 | exhaustive-deps | `router`, `setAuth`, `syncFromAuth` |
| `src/components/analise/AnaliseIAView.tsx` | 56 (2x) | exhaustive-deps | `lancamentos` |
| `src/components/chat/ChatPanel.tsx` | 141 | exhaustive-deps | `empresaAtiva.id`, `financialContext` |
| `src/hooks/useAPI.ts` | 81 (2x) | exhaustive-deps | `params` + complex expression |

## 5. Por que nao instalei Vitest agora

O Step 14 (`step-14-testes-dominio-stores.md`) cobre testes formais.
Instalar Vitest sem usar de verdade so aumenta superficie. O acordo
deste Step 05 e ter "decisao registrada":

- **Decidido:** Vitest sera o framework para testes de dominio puro
  (calculos DRE, transformers, builders, formatters). Adicao em
  Step 14, junto com os primeiros testes reais.
- **Testing Library** sera adicionada num step posterior, quando
  comecarmos componentes.

## 6. Validacoes pos-mudanca

```
npm run lint        -> 0 errors, 49 warnings (catalogados)
npm run typecheck   -> 0 erros
npm run build       -> 49 paginas, sem warnings
```

CI nao sofre: `continue-on-error: true` no passo de lint, e o lint
continua nao bloqueando. Step 15 vai endurecer no momento certo.

## 7. Diff aplicado

- **`.eslintrc.json`**: arquivo novo (3 linhas)
- **`package.json`**: nova linha `"typecheck": "tsc --noEmit --pretty false"`

Nenhuma mudanca em codigo de aplicacao.

## 8. Pendencias herdadas

- **Resolver os 45 warnings de `exhaustive-deps`** — entra no Step 13
  (calculos BI/DRE/paginacao) ou Step 14 (testes de dominio). Cada
  warning vira um teste antes da correcao para garantir que o
  comportamento nao muda.
- **Migrar `<img>` para `<Image />`** — Step 09 ou PR de UI dedicado.
  Conferir custo de Image Optimizer na Vercel antes.
- **Instalar Vitest** — Step 14, com primeiro lote de testes reais.
- **Endurecer CI** — Step 15 (`continue-on-error: false` no lint
  apos o backlog estar zerado).

## 9. Criterios de pronto (Step 05)

- [x] `npm run lint` nao abre prompt interativo.
- [x] `npm run typecheck` passa.
- [x] `npm run build` passa.
- [x] Configuracao nao altera runtime.
- [x] Decisao sobre testes registrada (Vitest, em Step 14).
- [x] Backlog de warnings catalogado.
