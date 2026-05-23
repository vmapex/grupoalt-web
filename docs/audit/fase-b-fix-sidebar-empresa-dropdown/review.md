# Audit — PR #146 fix(portal): EmpresaSelector + remove lista duplicada

**Commit:** 78ac396
**Data:** 2026-05-23
**Auditor:** Claude Opus 4.7 (re-run apos primeiro audit travar)

## Score: 96/100
## Recomendacao: APPROVE

## Matriz
| # | Bloqueador | Status | Severidade |
|---|---|---|---|
| B1 | EmpresaSelector client + integrado com empresaStore | PASS | Alta |
| B2 | Dropdown abre/fecha (click, ESC, click outside) | PASS | Alta |
| B3 | setActive(id) + close on select | PASS | Alta |
| B4 | Disabled empty state | PASS | Media |
| B5 | A11y completa | PASS | Media |
| B6 | Sidebar refactor limpo (sem state orfao) | PASS | Media |
| B7 | tests/typecheck/build verdes | PASS | Alta |
| B8 | Sem regressao (STEP 11 mantido) | PASS | Alta |

## Validacoes automatizadas
- typecheck: limpo (zero erros)
- tests: 258/258 em 16 arquivos (15 novos do EmpresaSelector.test.tsx)
- build: OK, 50 rotas, sem regressao

## Verificacao detalhada

**B1 — Integracao:** `'use client'` presente. Importa `useEmpresaStore` e
`useThemeStore` corretamente; le `empresas`, `activeId`, `setActive` via
selectors finos (boa pratica Zustand).

**B2 — Lifecycle dos listeners:** ambos `useEffect` (click outside +
ESC) respeitam guard `if (!open) return` para nao registrar listener a
toa, e cleanup remove o listener no unmount/toggle. Sem memory leak.
Click outside usa `mousedown` (capta antes do click) e checa
`rootRef.current.contains(e.target)`.

**B3 — setActive:** `handleSelect(id)` chama `setActive(id)` e `setOpen(false)`.
Teste explicito valida `setActiveMock.toHaveBeenCalledWith('2')` e
`queryByRole('menu') === null` apos selecao. Click na empresa ativa tambem
fecha (idempotente).

**B4 — Empty state:** `disabled = empresas.length === 0` aplica
`cursor: not-allowed`, `opacity: 0.6`, atributo HTML `disabled`, e o
onClick faz guard `!disabled && setOpen(...)`. Texto "Sem empresas" no
label. Teste valida que click no botao disabled nao abre dropdown
(`aria-expanded` continua "false").

**B5 — A11y:** botao tem `aria-haspopup="menu"`, `aria-expanded={open}`,
`aria-label="Selecionar empresa ativa"`. Container do menu tem
`role="menu"` + `aria-label`. Itens tem `role="menuitem"`. `<Check>`
da empresa ativa tem `aria-label="Ativa"`. Truncate de nome longo com
atributo `title` nativo (tooltip). Falta menor: navegacao por teclado
arrow keys nao implementada — aceitavel pra v1 (nao bloqueia).

**B6 — Sidebar refactor:** grep por `Building2|hoveredEmpresa|hoveredGroupBtn|grupoAtivo|useEmpresaStore`
no Sidebar.tsx retorna zero matches. Imports limpos: so `BarChart3,
FileText, ChevronDown, Search, LayoutDashboard, Landmark, TrendingUp,
GitCompare, Network, Layers, Settings` do lucide + Link/usePathname +
auth/theme/access stores + EmpresaSelector. State local: so `collapsed`,
`hoveredItem`, `hoveredAdmin` — todos usados. Delta: -83/+4 LOC (60+ de
lista duplicada removidos como prometido).

**B7 — Validacoes:** ja documentadas acima. Build emite warning de
deprecation generico mas conclui com sucesso, 50 rotas, sem regressao.

**B8 — STEP 11:** `useEmpresaStore.setActive` (lido em empresaStore.ts)
mantem invariantes: valida que id pertence a `auth.empresas` antes de
aceitar, propaga via `setEmpresaAtivaInternal`. EmpresaSelector consome
via store, sem bypass. 17 testes do empresaStore continuam verdes na
suite (258 total).

## Observacoes (curto)

1. **Label do botao mostra empresa ATIVA, nao grupo** — comportamento
   correto: a acao do botao e "trocar empresa", entao deve refletir o
   contexto atual (empresa selecionada). Fallback "Selecione..." quando
   nao ha activeId mas ha empresas, "Sem empresas" quando lista vazia.

2. **Pequeno warning de unused vars** — `hover` state e usado em
   `background`/`borderColor` styles, nao e orfao. OK.

3. **Teste "nao renderiza cnpj quando vazio" e smoke test fraco** —
   apenas verifica que `queryAllByText('')` retorna array; nao prova
   ausencia condicional. Nao bloqueia (comportamento esta correto no
   codigo: `{emp.cnpj && (...)}`), mas poderia melhorar.

4. **A11y futura:** navegacao por teclado (Tab ja funciona via botoes
   nativos; Arrow Up/Down + Enter seria nice-to-have).

5. **Sem alteracao em backend, contracts, ou empresaStore.** Mudanca
   puramente de UI no Portal Sidebar. Risco minimo.

## Conclusao

PR pronto pra merge. Resolve bug pre-existente identificado na Fase B
(botao com chevron sem onClick), elimina duplicacao (~60 LOC), adiciona
componente bem testado com a11y. Sem regressao detectada.
