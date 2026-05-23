# Audit — PR #145 fix(portal): UserMenu logoff

**Commit:** 20f47ce
**Branch:** feat/portal-user-menu-logoff
**Data:** 2026-05-23
**Auditor:** Claude Opus 4.7 (re-run após primeiro audit travar)
**Diff:** 3 arquivos, +379/-52

## Score: 96/100
## Recomendação: APPROVE

## Matriz

| # | Bloqueador | Status | Severidade |
|---|---|---|---|
| B1 | UserMenu componente client + named export | PASS | Alta |
| B2 | Dropdown abre/fecha com click + ESC + click-outside | PASS | Alta |
| B3 | logout + push /login funcionam | PASS | Alta |
| B4 | A11y completa (aria-haspopup, aria-expanded, role menu/menuitem) | PASS | Média |
| B5 | Tests cobrem cenários críticos | PASS | Alta |
| B6 | typecheck/test/build verdes | PASS | Alta |
| B7 | Sem regressão no portal/layout.tsx (refs órfãs a user) | PASS | Alta |

## Validações automatizadas

- typecheck: PASS (`tsc --noEmit --pretty false`, exit 0, sem output)
- tests (UserMenu): 14/14 PASS (~2.7s)
- tests (suite completa): 257/257 PASS em 16 arquivos (~9.4s)
  (174 anteriores + Steps posteriores + 14 novos do UserMenu — +14 vs Step 17)
- build: PASS (50 rotas, middleware 71.6kB, exit 0)

## Verificação técnica detalhada

### B1 — Componente cliente + export
- `'use client'` na linha 1 (correto, usa hooks/useRouter)
- `export function UserMenu()` (named export, casa com `import { UserMenu }` em
  `portal/layout.tsx:13`)

### B2 — Lifecycle dos listeners
- **Click outside** (`UserMenu.tsx:39-48`): `useEffect` com guard `if (!open) return`,
  registra `mousedown`, retorna cleanup `removeEventListener`. Dependência `[open]`
  — desmonta o listener quando fecha. Sem leak.
- **ESC** (`UserMenu.tsx:51-58`): mesmo padrão, registra `keydown`, retorna cleanup
  `removeEventListener`. Dependência `[open]`. Sem leak.
- Confirmação via teste: `ESC fecha o dropdown` (linha 148-154) e
  `click fora fecha o dropdown` (linha 156-167) passam.

### B3 — Logout + redirect
- `handleLogout` (`UserMenu.tsx:67-71`): `setOpen(false)` → `logout()` → `router.push('/login')`.
- `logout()` no `authStore.ts:82-100`: faz `api.post('/auth/logout')` (fire-and-forget
  com `.catch`), reseta state, e via dynamic imports limpa `empresaStore`,
  `unidadeStore`, `permissoesStore`.
- **Sem race observável**: o dynamic import é assíncrono mas a navegação para
  `/login` não depende desses stores (a página de login lê localStorage e
  redireciona se já autenticada — mas state já foi resetado em `set({...})`
  síncrono). Os stores limpos posteriormente garantem isolamento entre sessões
  (validado pelo teste `empresaStore.test.ts` do Step 14).
- Teste `click em "Sair" chama logout() + push /login + fecha menu` (linha 129-137)
  cobre o caminho feliz.

### B4 — Acessibilidade
- Botão principal (linha 80-82): `aria-haspopup="menu"`, `aria-expanded={open}`,
  `aria-label="Abrir menu do usuário"`.
- Container do menu (linha 137-138): `role="menu"`, `aria-label="Menu do usuário"`.
- Item de ação (linha 175): `role="menuitem"`.
- Ausências aceitáveis (não bloqueadoras): sem `focus trap`, sem retorno explícito
  de foco ao botão pai após fechar — UX padrão para dropdown simples.

### B5 — Cobertura de testes (14)
Cobre: estado inicial fechado, iniciais do user, fallback "?" sem user, primeiros
2 nomes, role admin/usuário, click toggle, dropdown mostra nome+email, botão Sair
existe, click Sair (logout+push+fecha), segundo click fecha, ESC fecha, click-outside
fecha, email vazio não renderiza div. Mocks corretos de `next/navigation`,
`useAuthStore`, `useThemeStore` (com seletores).

### B6 — Pipelines
Todos verdes (ver seção Validações).

### B7 — portal/layout.tsx limpo
- `grep` por `user.`, `userInitials`, `setUserMenuOpen`, `userMenuOpen` → 0 matches.
- Import `useAuthStore` mantido apenas para `setAuth` (linha 21), que continua
  necessário pro fluxo de `/auth/me`.
- Componente `<UserMenu />` substitui o bloco antigo no header (linha 214).
- Separador visual (`<div className="w-px h-6">`) preservado antes do menu.
- Sem refs órfãs.

## Observações (curto)

1. **Hover state local com setState** (linha 35, 78-79): cria re-render por
   hover, mas trivial — não é problema.
2. **`setTimeout(syncFromAuth, 0)`** em `layout.tsx:61` é pré-existente, fora do
   escopo do PR.
3. **Sem `focus-trap` no dropdown**: aceitável para menu simples de 1 ação.
   Caso adicione múltiplos itens no futuro, considerar `useFocusTrap`.
4. **Cleanup garantido** mesmo se componente desmonta com dropdown aberto: cleanup
   roda no unmount via React effects. Sem memory leak.
5. **Risco baixo de regressão**: a refatoração em `layout.tsx` é puramente
   substitutiva (remove bloco hardcoded, adiciona `<UserMenu />`). Nenhum hook ou
   side-effect novo no layout.

## Conclusão

PR enxuto, focado, com testes consistentes. Resolve bug pré-existente
(avatar sem onClick/logoff) de forma idiomática (componente isolado, hooks
limpos, a11y básica completa, testes cobrem o feliz e os edge-cases
relevantes). Sem bloqueadores. APPROVE.
