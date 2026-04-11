# CLAUDE.md — grupoalt-web

> Frontend do Portal BI do Grupo ALT.
> Última atualização: 2026-04-11 (sessão de correções + features)

## Referências
- `ALTMAX-PORTAL-BI-HANDOFF.md` — spec completa do protótipo (1.183 linhas)
- `altmax-portal-v2.jsx` — protótipo visual React (referência, não código de produção)
- `altmax_claude_agent.html` — protótipo da tela Análise IA (referência visual)

## Stack
- Next.js 14 + TypeScript + Tailwind + Zustand + Recharts
- Backend: FastAPI (Railway) — repo vmapex/grupoalt-api
- Frontend: Vercel (https://portal.grupoalt.agr.br)
- ERP: Omie API

## Comandos
```bash
npm run dev    # dev server
npm run build  # build produção
npm run lint   # linting
```

## Estrutura principal
```
src/
├── app/
│   ├── bi/financeiro/
│   │   ├── layout.tsx           # Shell BI (Navbar + sub-bar Dashboard/Análise IA + Chat)
│   │   ├── page.tsx             # Dashboard Executivo (KPIs, charts, conciliação)
│   │   ├── caixa/page.tsx       # Caixa Realizado (DRE, drill-down, detail views)
│   │   ├── extrato/page.tsx     # Extrato bancário (tabela + saldos por conta)
│   │   ├── cp-cr/page.tsx       # CP/CR (lançamentos, temporal, representatividade)
│   │   ├── fluxo/page.tsx       # Fluxo de Caixa (mensal + diário projetado)
│   │   ├── conciliacao/page.tsx # Conciliação (heatmap calendário + SLA D+1)
│   │   └── admin/page.tsx       # Configurações (empresas, logos)
│   ├── portal/layout.tsx        # Layout Portal (Sidebar + header + breadcrumb)
│   └── login/page.tsx
├── components/
│   ├── nav/                     # Navbar, DateRangePicker, EmpresaDropdown, UnidadeDropdown, NotificationBell, ThemeToggle
│   ├── ui/                      # GlowLine, Badge, ConcilBadge, SortHeader, KPICard, ExportPDFButton
│   ├── charts/                  # CustomTooltip, BarLabel, BarLabelVar
│   ├── caixa/                   # KPIStrip, DrillBar, ChartGrid, DetailPanel, DRESidebar
│   ├── chat/                    # ChatPanel, OrbitButton
│   └── Sidebar.tsx
├── hooks/
│   ├── useAPI.ts                # Hooks genéricos + específicos (useExtrato, useCP, useCR, etc.)
│   └── useEmpresaId.ts          # Resolve empresaId (prioriza empresaStore.activeId persistido)
├── store/
│   ├── authStore.ts             # Auth state (user, empresas, permissões)
│   ├── empresaStore.ts          # Empresa ativa (persist middleware, syncFromAuth)
│   ├── themeStore.ts            # Dark/Light mode (DARK/LIGHT tokens)
│   ├── dateRangeStore.ts        # Date range picker (persist)
│   └── unidadeStore.ts          # Unidades/projetos filtering
├── lib/
│   ├── api.ts                   # Axios instance (baseURL /api/proxy/v1, auth interceptor)
│   ├── types.ts                 # Interfaces TypeScript (ExtratoAPI, CPCRAPI, FluxoAPI, etc.)
│   ├── formatters.ts            # fmtBRL, fmtK, fmtPct, parseDMY, toggleSort, sortRows
│   ├── sla.ts                   # FERIADOS, isBusinessDay, nextBusinessDay
│   ├── planoContas.ts           # CATEGORIAS (82 códigos), ESTRUTURA_DRE, calcularDRE()
│   ├── transformers.ts          # transformCPCR, transformConcilMovimento
│   ├── caixaBuilder.ts          # buildQuarterly/Monthly/Weekly, buildBreakdown
│   └── mocks/                   # extratoData (getCatDesc), caixaData, cpcrData, concilData
└── next.config.js               # API rewrites, security headers, standalone output
```

## Sessão 11/04/2026 — Correções realizadas

**FRONTEND — BUGS CORRIGIDOS (Fase 1):**
1. Nome empresa dinâmico — `Navbar.tsx:86` trocado de hardcoded "ALT MAX" para `{active?.nome}`
2. Persist empresa ao refresh — `empresaStore.ts` agora usa `persist` middleware Zustand
3. Export PDF URLs — removido `/v1` duplicado das URLs de export (era `/v1/v1/export/...`)
4. Botão Dashboard/Análise IA duplicado — removida sub-bar redundante de `caixa/page.tsx` (já existia no `layout.tsx`)
5. CP/CR "Grupo" → "Categoria" — coluna renomeada, usa `getCatDesc()` ao invés de `getCatNivel2()`
6. Conciliação "Descrição" → "Favorecido" — header e dados de lançamentos do dia

**FRONTEND — BUGS CORRIGIDOS (Fase 2):**
7. Conciliação dashboard hardcoded — removidos fallbacks `?? 87`, `?? 42`, `?? 38400`
8. Race condition refresh — `useEmpresaId()` prioriza `empresaStore.activeId` (persistido)
9. syncFromAuth() — agora sincroniza `empresaAtiva` no authStore após restaurar persist

**ARQUIVOS MODIFICADOS:**
- `src/components/nav/Navbar.tsx` — nome dinâmico + fix URLs export
- `src/store/empresaStore.ts` — persist middleware + syncFromAuth melhorado
- `src/components/ui/ExportPDFButton.tsx` — toast de erro
- `src/app/bi/financeiro/caixa/page.tsx` — removida sub-bar duplicada
- `src/app/bi/financeiro/cp-cr/page.tsx` — "Grupo" → "Categoria"
- `src/app/bi/financeiro/conciliacao/page.tsx` — "Descrição" → "Favorecido"
- `src/app/bi/financeiro/page.tsx` — fallbacks zerados
- `src/hooks/useEmpresaId.ts` — prioridade invertida

## Pendências para próxima sessão
- Tela Análise IA (referência: `altmax_claude_agent.html`)
- Unidades via Projeto Omie + filtro em todas as páginas
- Validar resync full do Grupo ALT (após fix ultima_sync)
- Coluna unidade no extrato (condicional)
- Plano de contas dinâmico no frontend (endpoint `/categorias` já existe no backend)
- Bugs adicionais que o usuário vai mapear
