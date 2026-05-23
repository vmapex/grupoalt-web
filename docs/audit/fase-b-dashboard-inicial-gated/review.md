# Audit — Fase B: dashboard inicial `/portal` gated por RBAC granular

**PR:** vmapex/grupoalt-web#144
**Branch:** `feat/fase-b-dashboard-inicial-gated`
**Commit auditado:** `fcb29cc`
**Companion backend:** nenhum (frontend-only, consome contrato Fase A já em main)
**Data:** 2026-05-23
**Auditor:** Claude Opus 4.7 (1M context) — auditoria independente

---

## 1. Score

**97 / 100**

| Categoria             | Peso | Nota | Pondera |
|-----------------------|-----:|-----:|--------:|
| Funcionalidade UI     | 20%  | 100  |  20.0   |
| RBAC / gating         | 25%  | 100  |  25.0   |
| Type-safety/build     | 15%  | 100  |  15.0   |
| Testes/regressão      | 15%  | 100  |  15.0   |
| Estilo/convenção      | 10%  |  92  |   9.2   |
| Acessibilidade        | 10%  |  95  |   9.5   |
| Consistência rotas    |  5%  |  85  |   4.25  |
| **Total**             |      |      | **97.0** |

> Score arredondado para **97**. Implementação limpa, gating fail-closed
> herdado do `<PermissionGate>` da Fase A, layout consistente com o design
> system gold/hairline, 14 testes novos cobrindo todos os estados (skeleton
> / empty / grid / admin-bypass / contratos cards). Pequenos descontos por:
> (a) entrada stale em `ChatPanel.PAGE_LABELS['/portal/grupo']` que perdeu
> o significado de "Dashboard", (b) reentrância visual de `aria-label` no
> `<header>` que poderia ganhar `<h1>` semântico melhor (já tem, então
> só pontuação parcial em A11y), (c) skeleton sem `<span class="sr-only">`
> descritivo (compensado por `aria-busy="true"` no parent).

---

## 2. Recomendação

**APPROVE** — score acima do limiar 92/100.

Nenhum bloqueador FAIL. PR pronto pra merge. Os 3 pontos de melhoria
listados na Seção 6 são opcionais e não bloqueiam.

---

## 3. Matriz dos 15 bloqueadores

| #   | Status   | Severidade | Evidência (arquivo:linha) |
|-----|----------|------------|----------------------------|
| B1  | ✅ PASS  | Alta       | `src/app/portal/page.tsx:28-90` — client component substitui redirect; renderiza header + states + grid |
| B2  | ✅ PASS  | Alta       | `src/app/portal/page.tsx:81-85` — `<PermissionGate require={card.require}>` envolve cada card; fallback default `null` em `components/auth/PermissionGate.tsx:60` |
| B3  | ✅ PASS  | Alta       | `src/app/portal/page.tsx:34-38, 74-76` — `isLoading` via `perms === undefined`, `isEmpty` via `!is_admin_global && permissoes.length === 0`. Skeleton e EmptyState distintos |
| B4  | ✅ PASS  | Alta       | `src/app/portal/dashboardCards.ts` (novo, 69 linhas) — `DASHBOARD_CARDS` + tipo `DashboardCard` exportados em arquivo separado, importados em `page.tsx:25` |
| B5  | ✅ PASS  | Alta       | `src/app/portal/dashboardCards.ts:26-69` — 6 cards: `financeiro:ver`, `fechamento:ver`, `indicadores:ver` (×2), `grupo:ver`, `documentos:ver`. Todos pertencem a `MODULOS`/`ACOES` em `grupoalt-api/app/core/rbac.py:38-58` |
| B6  | ✅ PASS  | Média      | BI Financeiro → `financeiro:ver`, Motor → `fechamento:ver`, Indicadores Op./Controladoria → `indicadores:ver`, Estrutura → `grupo:ver`, Documentos → `documentos:ver` — todos batem com o uso real das rotas-destino |
| B7  | ✅ PASS  | Baixa      | `src/app/portal/page.tsx:40,66` — `user?.nome?.split(' ')[0] ?? 'Bem-vindo'` + saudação `Olá, {firstName}` |
| B8  | ✅ PASS  | Baixa      | `src/app/portal/page.tsx:30,55` — `empresa?.nome ?? 'Grupo ALT'` no eyebrow do header |
| B9  | ✅ PASS  | Média      | `src/app/portal/page.tsx:78` (`aria-label="Módulos disponíveis"`), `:155` (`aria-busy="true"`), `:191` (`role="status"`) |
| B10 | ⚠ PARTIAL | Média      | Sidebar (`Sidebar.tsx:31`), Navbar (`Navbar.tsx:99`), AccessDenied (`AccessDenied.tsx:19`), setup (`setup/page.tsx:33,324`) — todos apontam `/portal`. Porém entrada stale `'/portal/grupo': 'Dashboard'` em `ChatPanel.tsx:53` (label do breadcrumb do chat — não quebra nada mas semanticamente desatualizada) |
| B11 | ✅ PASS  | Alta       | Diretórios `src/app/portal/grupo/estrutura/page.tsx` e `src/app/portal/grupo/segmentacao/page.tsx` intactos; `src/app/portal/grupo/page.tsx` (Dashboard do grupo) também segue existindo |
| B12 | ✅ PASS  | Alta       | `npm run typecheck` → sem erros (output limpo, só header) |
| B13 | ✅ PASS  | Alta       | `npm test -- --run` → **257/257** em 16 arquivos (~10s). 14 testes novos em `src/app/portal/page.test.tsx` (saudação×4, loading×1, empty×2, grid×4, DASHBOARD_CARDS×3) |
| B14 | ✅ PASS  | Alta       | `npm run build` → 44 rotas estáticas geradas, sem erro. `/portal` aparece como `7.58 kB / 193 kB First Load JS` (descrição esperava ~7.59 kB / 193 kB — match exato) |
| B15 | ✅ PASS  | Alta       | `PermissionGate.fallback=null` por default (`PermissionGate.tsx:60`); `usePermission` retorna `false` durante loading e sem empresa ativa (`usePermission.ts:63-66`); admin global resolve `true` em todas permissões via `is_admin_global` no store (`permissoesStore`/`hasPermissionIn`). Teste "admin global SEM perfis seeded ainda ve grid" valida o bypass (`page.test.tsx:131-136`) |

---

## 4. Análise detalhada (bloqueadores PARTIAL/FAIL)

### B10 — Consistência de rotas (PARTIAL, severidade Média)

**Status:** PARTIAL. Os 4 pontos pedidos no PR — Sidebar "Início" →
`/portal` (linha 31), Navbar PORTAL → `/portal` (linha 99), AccessDenied
default → `/portal` (linha 19), setup `replace`/`push` → `/portal`
(linhas 33 e 324) — todos foram atualizados corretamente. **Não é um
FAIL.**

**O que segura o PARTIAL** é uma única ocorrência stale fora do escopo
declarado do PR: em `src/components/chat/ChatPanel.tsx:53` o mapa
`PAGE_LABELS` rotula `'/portal/grupo': 'Dashboard'`. Antes da Fase B,
`/portal/grupo` era o Dashboard. Agora `/portal/grupo` é apenas a
"home" da seção Grupo (com Estrutura e Segmentação como filhos), e o
verdadeiro Dashboard ficou em `/portal` (já listado na linha acima,
`/portal: 'Dashboard'`). Não há regressão funcional — o chat continua
exibindo "Dashboard" na breadcrumb se o usuário abrir o painel numa
dessas duas rotas — mas semanticamente o segundo mapeamento perdeu o
sentido e deveria ser revisto (provavelmente para `'Grupo'` ou
removido para deixar o fallback genérico responder).

**Severidade:** Média (cosmético / curadoria de labels do chat).
**Fix sugerido (1 linha):**
```ts
'/portal/grupo': 'Grupo',
```

---

## 5. Observações

### 5.1 Pontos fortes da implementação

- **Extração `dashboardCards.ts`** é a decisão correta. Next App Router
  só aceita exports especiais (`default`, `metadata`, `dynamic`, etc.)
  em `page.tsx`; um `export const DASHBOARD_CARDS` ali quebraria o
  build com erro de "Page should export a default function". Comentário
  no topo do arquivo (linhas 1-9) documenta isso explicitamente.
- **Tipo template-literal** `require: \`${string}:${string}\``
  (`dashboardCards.ts:22`) força no compile-time o formato `modulo:acao`
  esperado pelo `<PermissionGate>`. Teste estrutural
  (`page.test.tsx:207-219`) valida em runtime contra o vocabulário
  oficial.
- **Hooks order safety**: `<PermissionGate>` resolve a posição com
  `useSinglePermission` em slot fixo (`PermissionGate.tsx:101-106`), o
  que evita o classic React bug de "hooks chamados em ordem diferente"
  quando a lista de cards for filtrada — mas como aqui passamos cards
  individualmente com `require` único, isso nem é exercitado. Está
  certo de qualquer forma.
- **Fail-closed comprovado** pelo teste "Faturista (so fechamento) ve
  apenas card Motor de Fechamento" (`page.test.tsx:149-163`): com
  apenas `fechamento:ver`/`editar`, os outros 5 cards somem (não
  renderizam). Isso bate exatamente com a pós-condição declarada no
  briefing.
- **Bypass admin global** comprovado pelo teste "admin global SEM
  perfis seeded ainda ve grid" (`page.test.tsx:131-136`): mesmo com
  `permissoes: []`, se `is_admin_global=true`, o grid renderiza.
- **Estados ortogonais**: skeleton com 6 placeholders dimensionados
  (`page.tsx:158-181`) evita layout shift quando perms chegam. Empty
  state com ícone, título e copy acionável (`page.tsx:187-227`).
- **Design tokens** consistentes: `t.surfaceElevated`, `t.borderGold`,
  `t.goldDim`, `t.gold` — bate com o resto do design system gold/preto.

### 5.2 Validações automatizadas (todas verde)

- `npm run typecheck` → sem erros
- `npm test -- --run` → 257/257 em 16 arquivos (~10s)
- `npm run build` → 44 rotas, sem regressão; `/portal` em 7.58 kB / 193 kB
- `npm run audit:bundle` → 0 credenciais expostas em 84 arquivos JS
- `gh pr checks 144` → CI + Vercel + Vercel Preview Comments todos PASS

### 5.3 Bugs pré-existentes (NÃO contam contra este PR)

Conforme briefing, os 3 bugs abaixo foram identificados em validação
manual mas são pré-existentes (não-regressões da Fase B):

1. **Sidebar `Sidebar.tsx:128-144`** — botão "Grupo ALT" no header tem
   chevron + visual de dropdown mas não tem `onClick` nem
   `aria-haspopup`. Estado morto. Sugestão: ou implementar o dropdown
   de seleção de grupo, ou remover o chevron e dar-lhe semântica de
   apenas badge.
2. **Avatar do usuário** (Sidebar `:147-165` ou PortalLayout) sem
   dropdown nem botão de logout visível. `useAuthStore.logout()`
   existe (verificado durante navegação prévia do projeto), só falta
   exposição na UI. Bug de descobribilidade.
3. **`/portal/admin/usuarios`** sem ação de deletar usuário — requer
   endpoint backend novo (`DELETE /admin/usuarios/{id}` ou
   soft-delete). Backlog.

Nenhum desses afeta o gating ou a renderização do dashboard novo.

---

## 6. Próximos passos (opcionais, não-bloqueantes)

1. **Atualizar `ChatPanel.PAGE_LABELS['/portal/grupo']`** de
   `'Dashboard'` para `'Grupo'` (1 linha — vide B10). Pode ir num
   PR cosmético separado junto com o cleanup dos 3 bugs pré-existentes.
2. **Adicionar `<span class="sr-only">Carregando módulos do portal…</span>`**
   dentro do skeleton para leitores de tela ganharem texto explícito
   (hoje só temos `aria-label` + `aria-busy`). Marginal — A11y já
   passa no critério.
3. **Considerar `Suspense boundary` + `loading.tsx`** ao redor de
   `/portal/page.tsx` para esconder o skeleton via streaming do Next ao
   invés de render condicional. Tradeoff: hoje a UX é deterministic
   (skeleton até `perms` resolver via fetch do layout), o que é
   provavelmente mais previsível. Não mexer agora.
4. **Documentar no `CLAUDE.md`** a entrada da Fase B junto com Fase A —
   incluir o pattern `<PermissionGate require="modulo:acao">` para
   gating de cards no dashboard. Isso é doc-only e vai naturalmente
   no próximo handoff.
5. **Tests opcionais futuros**: rolar uma simulação de skeleton-during-
   refetch quando o usuário troca de empresa (hoje o teste mocka
   `permsAtivasMock` direto, não exercita transição). Útil quando
   a lógica de cache crescer.

---

## 7. Conclusão

PR cirúrgico, bem testado, com extração arquitetural correta
(`dashboardCards.ts`), gating defensivo herdado do `<PermissionGate>`
da Fase A, e total respeito ao design system. Resolve exatamente a
pós-condição declarada: o Faturista para de cair em `/portal/grupo`
(que ele não tem permissão pra ver) e passa a ver apenas o card
"Motor de Fechamento" em `/portal`.

**Recomendação final: APPROVE (97/100).**
