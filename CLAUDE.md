# CLAUDE.md — grupoalt-web

> Frontend do Portal BI do Grupo ALT.
> Última atualização: 2026-04-17 (Sessão A — quick wins frontend)

## Referências
- `ALTMAX-PORTAL-BI-HANDOFF.md` — spec completa do protótipo (1.183 linhas)
- `altmax-portal-v2.jsx` — protótipo visual React (referência, não código de produção)
- `altmax_claude_agent.html` — protótipo da tela Análise IA (referência visual)
- `NEXT_SESSION_PROMPT.md` — contexto para próxima sessão

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
│   │   ├── layout.tsx              # Shell BI (Navbar + sub-bar Dashboard/Análise IA + Chat)
│   │   ├── page.tsx                # Dashboard Executivo (KPIs, charts, conciliação)
│   │   ├── caixa/page.tsx          # Caixa Realizado (DRE, drill-down, detail views)
│   │   ├── extrato/page.tsx        # Extrato bancário (tabela + saldos por conta)
│   │   ├── cp-cr/page.tsx          # CP/CR (lançamentos, temporal, representatividade)
│   │   ├── fluxo/page.tsx          # Fluxo de Caixa (mensal + diário projetado)
│   │   ├── conciliacao/page.tsx    # Conciliação (heatmap calendário + SLA D+1)
│   │   └── admin/
│   │       ├── page.tsx            # Configurações (empresas, logos)
│   │       └── categorias/page.tsx # Revisão plano de contas + overrides + bulk-edit
│   ├── portal/layout.tsx           # Layout Portal (Sidebar + header + breadcrumb)
│   └── login/page.tsx
├── components/
│   ├── nav/                        # Navbar, DateRangePicker, EmpresaDropdown, UnidadeDropdown, NotificationBell, ThemeToggle
│   ├── ui/                         # GlowLine, Badge, ConcilBadge, SortHeader, KPICard, ExportPDFButton
│   ├── charts/                     # CustomTooltip, BarLabel, BarLabelVar
│   ├── caixa/                      # KPIStrip, DrillBar, ChartGrid, DetailPanel, DRESidebar
│   ├── chat/                       # ChatPanel (suporta embedded mode), OrbitButton
│   ├── analise/                    # AnaliseIAView (tela Análise IA com chat embutido)
│   └── Sidebar.tsx
├── hooks/
│   ├── useAPI.ts                   # useCategorias, updateCategoriaGrupoDRE, bulkUpdateCategoriasGrupoDRE, syncCategoriasEmpresa, etc
│   ├── useCategoriasMap.ts         # Plano de contas efetivo da empresa (map + getGrupo + getNome + refetch on visibility)
│   └── useEmpresaId.ts             # Resolve empresaId (prioriza empresaStore.activeId persistido)
├── store/
│   ├── authStore.ts                # Auth state (user, empresas, permissões)
│   ├── empresaStore.ts             # Empresa ativa (persist middleware, syncFromAuth)
│   ├── biViewStore.ts              # BI view: 'dashboard' | 'analise' (compartilhado entre layout e page)
│   ├── themeStore.ts               # Dark/Light mode (DARK/LIGHT tokens)
│   ├── dateRangeStore.ts           # Date range picker (persist)
│   └── unidadeStore.ts             # Unidades/projetos filtering
├── lib/
│   ├── api.ts                      # Axios instance (baseURL /api/proxy/v1, auth interceptor)
│   ├── types.ts                    # Interfaces TypeScript (ExtratoAPI, CPCRAPI, FluxoAPI, etc.)
│   ├── formatters.ts               # fmtBRL, fmtK, fmtPct, parseDMY, toggleSort, sortRows
│   ├── sla.ts                      # FERIADOS, isBusinessDay, nextBusinessDay
│   ├── planoContas.ts              # CATEGORIAS estático, calcularDRE(lanc, map?), calcularNeutros(), buildCategoriasFromAPI()
│   ├── transformers.ts             # transformCPCR (com NF/PA), transformExtrato (com NF), transformConcilMovimento
│   ├── caixaBuilder.ts             # buildQuarterly/Monthly/Weekly/BreakdownBy* — todos aceitam categoriaMap?
│   └── mocks/                      # extratoData (getCatDesc fallback estático), caixaData, cpcrData, concilData
└── next.config.js                  # API rewrites, security headers, standalone output
```

## Sessão 11/04/2026 — Bugs de UX + Tela Análise IA

**BUGS CORRIGIDOS:**
1. Nome empresa dinâmico na Navbar (era hardcoded "ALT MAX")
2. Persist empresa ao refresh (Zustand persist middleware)
3. Export PDF URLs (removido `/v1` duplicado)
4. Botão Dashboard/Análise IA duplicado removido de `caixa/page.tsx`
5. CP/CR "Grupo" → "Categoria"
6. Conciliação "Descrição" → "Favorecido"
7. Conciliação dashboard sem fallbacks hardcoded
8. Race condition refresh — `useEmpresaId` prioriza persistido
9. `syncFromAuth` sincroniza `empresaAtiva` no authStore

**FEATURES:**
- **Tela Análise IA** (`/bi/financeiro/...` com toggle no sub-bar) — grid `1fr 400px` com DRE waterfall, KPIs, tabela indicadores e chat Claude embutido
- **biViewStore** — compartilha `dashboard|analise` entre layout e page
- **ChatPanel embedded mode** — prop `embedded` renderiza inline ao invés de overlay
- **useCategorias + buildCategoriasFromAPI** — base para plano dinâmico (consumidor adicionado depois)
- **Campos NF e PA** em tabelas CP/CR + campo NF em Extrato
- **Fix filtro unidades** — corrigido path `/admin/` → `/gestao/` no unidadeStore

## Sessão 13-15/04/2026 — Plano de Contas Dinâmico Global + NEUTRO

**FEATURES:**

### 1. Tela admin/categorias (`/bi/financeiro/admin/categorias`)
- Lista hierárquica de categorias Omie agrupadas por grupoDRE → nivel2 → código
- 9 stats cards (um por grupo DRE incluindo NEUTRO)
- Busca textual por código/nome/grupo
- Botão "Sincronizar da Omie" (síncrono via POST `/categorias/sync`)
- **Override individual** de grupoDRE por categoria (dropdown com ícone + cor)
- **Bulk-edit** com checkboxes em 3 níveis (categoria / subgrupo nivel2 / grupo DRE inteiro)
- Barra flutuante roxa com dropdown bulk-apply quando há seleção
- Badge `CUSTOM` em categorias com override
- Natural sort por código (2.5 antes de 2.11)
- Ordenação de subgrupos pelo menor código contido
- Sub-nav `/bi/financeiro/admin` → "Empresas" / "Plano de Contas"

### 2. Grupo DRE `NEUTRO` (🚫)
- Categorias marcadas como NEUTRO são **excluídas dos cálculos de DRE e indicadores** mas continuam visíveis em extrato/conciliação para auditoria
- Use case: repasses internos entre unidades, mútuos intra-grupo, transferências que se anulam
- Integrado em `calcularDRE`, `caixaBuilder.resolveGrupoDRE`, `buildBreakdownByCategoria`
- `calcularNeutros(lancamentos, map)` retorna lista com total movimentado + count
- AnaliseIAView mostra nota cinza com resumo + injeta no contexto do Claude ("NÃO incluir em RNOP/DNOP")

### 3. Propagação dinâmica do plano de contas
- Novo hook **`useCategoriasMap(empresaId)`** retorna:
  - `map`: Record<codigo, CategoriaInfo> (API + overrides, fallback estático)
  - `getGrupo(codigo)`: resolve grupo DRE (override > API > prefixo > null)
  - `getNome(codigo)`: descrição dinâmica (API > CAT_DESC > código)
  - `getNivel2(codigo)`: label do subgrupo
  - `isDynamic`: flag se veio da API
- **Auto-refetch em `visibilitychange`** — ao voltar pra aba, pega overrides feitos em outras abas sem F5
- `calcularDRE(lancamentos, categoriaMap?)` aceita map opcional (prioriza override, fallback por prefixo)
- `calcularDREPorMes(lancamentos, categoriaMap?)` propaga o map
- `caixaBuilder.*` — todas as funções aceitam `categoriaMap?` opcional

**CONSUMIDORES ATUALIZADOS (11 arquivos) — plano dinâmico propagado em tudo:**
- `app/bi/financeiro/page.tsx` — Dashboard Executivo usa map
- `app/bi/financeiro/caixa/page.tsx` — Caixa Realizado usa map em todos os build*
- `components/analise/AnaliseIAView.tsx` — Análise IA usa map + exibe neutros
- `app/bi/financeiro/cp-cr/page.tsx` — label dinâmico via getNome
- `app/bi/financeiro/extrato/page.tsx` — label dinâmico
- `app/portal/financeiro/caixa/_content.tsx` — espelho BI
- `app/portal/financeiro/cp/_content.tsx` — label dinâmico + remove getCatNivel2 obsoleto
- `app/portal/financeiro/extrato/page.tsx` — label dinâmico

**ARQUIVOS CRIADOS:**
- `src/hooks/useCategoriasMap.ts`
- `src/app/bi/financeiro/admin/categorias/page.tsx`
- `src/store/biViewStore.ts`
- `src/components/analise/AnaliseIAView.tsx`

**BUGS CORRIGIDOS:**
1. Filtro de unidades sumindo silenciosamente — `Navbar.tsx` guard `if (activeId)` + `UnidadeDropdown` mostra "Sem unidades" ao invés de retornar null
2. Categorias "não sincronizado" vazando no meio da listagem — quando API tem dados, usar SÓ a API (sem merge com CATEGORIAS estático)
3. Labels de subgrupo mostrando código cru ("2.05") — `buildCategoriasFromAPI` agora usa descrição da categoria-pai
4. Botão "Sincronizar da Omie" disparava sync completo em background (4s timeout insuficiente) — agora endpoint dedicado `POST /categorias/sync` síncrono retorna count real
5. Subgrupos em ordem alfabética do label — agora ordena por menor código com natural sort
6. Subgrupos/categorias dentro do subgrupo usando ordem lexicográfica — agora natural sort (`numeric: true`)

## Endpoints principais consumidos
```
# Categorias / plano de contas
GET    /empresas/{id}/categorias                     — lista com grupo_dre override
POST   /empresas/{id}/categorias/sync                — sync só categorias (síncrono, ~1-3s)
PATCH  /empresas/{id}/categorias/{codigo}            — override individual
POST   /empresas/{id}/categorias/bulk-override       — override em lote

# Financeiro (base)
GET    /empresas/{id}/extrato                        — extrato bancário
GET    /empresas/{id}/cp, /cr, /cp/resumo, /cr/resumo
GET    /empresas/{id}/saldos, /contas
GET    /empresas/{id}/conciliacao/{movimentacao|resumo|calendario|dia/{date}}
GET    /empresas/{id}/fluxo-caixa, /fluxo-caixa/diario, /fluxo-caixa/mensal

# Admin
POST   /sync/empresas/{id}                           — sync completo background
POST   /sync/empresas/{id}/resync-extrato            — resync total (admin)
GET    /gestao/empresas/{id}/unidades                — unidades (auto-sync via projetos Omie)

# Orbit (chat)
POST   /orbit/chat                                    — envia mensagem com financial_context
GET    /orbit/usage                                   — uso de tokens
```

## Sessão 17/04/2026 — Sessão A (Quick wins frontend)

Pós-validação em produção. 21 bugs frontend fechados em 4 commits incrementais
numa única branch (`claude/validate-grupoalt-portal-csJsy`). Backend intocado.

**UTILITÁRIOS COMPARTILHADOS (base das etapas seguintes):**
- `CustomTooltip.tsx`: filtro `value > 0` → `value !== 0` (mostra negativos
  em Dashboard/Saldo NOP/Fluxo diário)
- `BarLabel.tsx`: aceita `height` e posiciona o rótulo abaixo quando valor
  é negativo, evitando sobreposição com a barra
- `formatters.ts`: novo helper `sortByMonthYear` (aceita `getLabel` opcional)
  para ordenar labels "Mmm/YY" cronologicamente

**DASHBOARD (`/bi/financeiro/page.tsx`):**
- Receita vs Custos em ordem cronológica (via `sortByMonthYear`)
- Últimas Movimentações usa um `useExtrato` sem datas (independente do
  dateRange global)
- Fluxo 30d KPI calcula `today+30d` local (fix real no backend — Sessão H)
- Top Clientes CR agrega por favorecido via Map
- SLA "fora" troca `total_divergencias` (R$) por `dias_sem_conciliar`
  (proxy até Sessão H implementar `dias_fora_sla`)
- Bônus: "87 dias" → "87%" nos 2 cards que renderizavam percentual como dias

**CAIXA REALIZADO (`ChartGrid.tsx` + `caixa/page.tsx`):**
- ChartGrid vira apresentacional: recebe `dreData` via prop
- Linha tracejada sem significado removida (Receita Bruta)
- Card "Conciliação" (hardcoded 87%/342/51) → **"Receita Líquida"**
  (RoB − TDCF) consumindo dreData real
- `t.mutedDim` → `t.muted` nos XAxis (contrast em dark mode)
- "Resultado Final" consome dreData.ebt2/ebt1/rnop/dnop ao invés de
  valores fixos (5.901, -65248, 92702, -21553)
- Mini-cards TDCF/CV/CF: `% RoB` calculado de dreData (bate com DRESidebar)
- Saldo NOP header/footer: label "Receitas NOP" → "Saldo NOP" com %
  dinâmico
- Portal mirror (`_content.tsx`) atualizado

**DEMAIS TELAS:**
- Extrato: warning defensivo em dev (`saldo_inicial=0` com lançamentos);
  saldos por conta com verde/vermelho explícito
- CP/CR: busca textual inclui `numero_documento` (NF); "Vencimentos por
  Mês" usa `sortByMonthYear`
- Fluxo: Maiores Entradas/Saídas agregam por favorecido
- Conciliação: `bankFilter` vira `Set<string>` (multi-seleção), `stats`
  recalcula local quando há filtro, calendar toggle (clique na data
  já selecionada remove)

**ARQUIVOS MODIFICADOS (10):**
- `src/components/charts/{CustomTooltip,BarLabel}.tsx`
- `src/lib/formatters.ts`
- `src/app/bi/financeiro/page.tsx`
- `src/app/bi/financeiro/caixa/page.tsx`
- `src/components/caixa/ChartGrid.tsx`
- `src/app/portal/financeiro/caixa/_content.tsx`
- `src/app/bi/financeiro/{extrato,cp-cr,fluxo,conciliacao}/page.tsx`

**DEFERIDOS** (vão para sessões específicas do backlog):
- Saldo NOP detalhe N2/N3 → Sessão B (toggle N2/N3 global)
- Filtro de unidade (Dashboard #7) → Sessão C (backend + front)
- SLA real em dias fora → Sessão H (backend `dias_fora_sla`)
- Fluxo 30d ignorar `data_fim` → Sessão H (backend)
- Cross-filter Power BI, DRE mês a mês, admin contas bancárias, token
  Orbit persistido → Sessões D, E, F, G

## Pendências / próxima sessão
Veja `NEXT_SESSION_PROMPT.md` para contexto completo.

Principais itens abertos:
- Validar em produção todas as features entregues (categorias dinâmicas, NEUTRO, Análise IA, bulk edit)
- Marcar as categorias de repasse do Grupo ALT como NEUTRO e validar que RNOP/DNOP ficam limpos
- Identificar bugs encontrados durante uso real
- Próximas features que o usuário vai mapear
