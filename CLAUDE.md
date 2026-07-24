# CLAUDE.md — grupoalt-web

> Frontend do Portal BI do Grupo ALT.
> Última atualização: 2026-07-16 (validação operacional: RBAC de alertas/visão financeira, logos persistidos, convite por e-mail + reset de senha)

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
- Fluxo 30d ignorar `data_fim` → Sessão H (backend) ✅ ENTREGUE no Step 13 — Parte D
- Cross-filter Power BI, DRE mês a mês, admin contas bancárias, token
  Orbit persistido → Sessões D, E, F, G

## Sessão 01-05/05/2026 — Step 13 (Cálculos BI/DRE e paginação)

PRs `grupoalt-web` #49 + #50 + #52 mergeados em `main`. Companion: `grupoalt-api` PR #34 + #35.

### Parte A — Semana 5 (`buildWeekly`)
- `src/lib/caixaBuilder.ts::buildWeekly` gera `S1..Smax` dinamicamente conforme
  `daysInMonth`. Antes fixava `S1..S4` e descartava silenciosamente lançamentos
  dos dias 29-31. Mês com 28d (Fev não bissexto) continua S1..S4; 29-31d → S1..S5.
- 12 testes em `src/lib/caixaBuilder.test.ts`.

### Parte B — Math.abs no DRE (DOCUMENTADO, não alterado)
- Limitação conhecida: estornos lançados com sinal contrário inflam o agregador
  em vez de compensá-lo. Mudar a regra requer validação prévia com financeiro.
- 14 testes "golden" em `src/lib/planoContas.test.ts` capturam o comportamento
  atual pra servir de baseline em mudança futura.
- Plano: `docs/plano-acao-seguranca/step-13-calculos-bi-dre-paginacao.md`.

### Parte C — Paginação CP/CR (sem truncamento silencioso)
- Novos hooks `useCPAll` / `useCRAll` em `src/hooks/useAPI.ts` paginam até
  esgotar (`PAGINATED_ALL_PAGE_SIZE=1000`, cap atual do backend).
- Função pura `fetchAllPages` extraída e exportada para teste — 5 testes em
  `src/hooks/useAPI.test.ts`.
- Migrados todos os call sites `useCP/useCR({ registros: 500 })` que alimentam
  KPIs, breakdowns e contexto da IA: Dashboard, AnaliseIA, Fluxo (BI + portal),
  cp-cr (BI + portal).

### Parte D — Fluxo (contrato explícito)
- `useFluxoCaixa` aceita `horizonteDias` e `saldoAtual` como parâmetros
  explícitos. Backend (`/empresas/{id}/fluxo-caixa`) tem `horizonte_dias`
  (1-365) com prioridade sobre `data_fim`.
- Dashboard usa `horizonte_dias=30` em vez de calcular `today+30d` localmente.
- Página Fluxo passa o `hz` (estado dos botões `+7d/+30d/+60d/+90d`) como
  `horizonte_dias` — antes os botões só faziam `slice` no resultado, sem
  controlar a chamada da API.

### Hotfixes pós-deploy

**PR #50** — Saldo Projetado começava em zero porque `saldo_atual` nunca era
enviado pra API; chart Mensais tinha sort alfabético em fallback. Fix: passar
`saldoAtualExtrato` pra API + usar `sortByMonthYear` no fallback.

**PR #52 + api #35** — Cards "Entradas Prev." e "Saídas Prev." mostravam R$ 0
mesmo com fluxo retornando dados. Causa: bug de naming no contrato. Backend
retorna `entradas_previstas`/`saidas_previstas` no objeto `kpis`, mas
`FluxoKPIsAPI` (types) e os consumidores liam `total_entradas`/`total_saidas`
(undefined → 0). Bug pré-existente, ficou visível só após o Step 13 porque
antes a chamada caía no fallback. Mesmo bug em `services/orbit_chat.py`
(`build_financial_context`) — corrigido junto.

**ARQUIVOS MODIFICADOS:**
- `src/lib/caixaBuilder.ts` (Parte A)
- `src/lib/planoContas.ts` (Parte B — só docstring, regra inalterada)
- `src/hooks/useAPI.ts` (Parte C + D — `useCPAll`, `useCRAll`,
  `fetchAllPages`, `PAGINATED_ALL_PAGE_SIZE`, `useFluxoCaixa` ampliado)
- `src/lib/types.ts` (`FluxoKPIsAPI` campos renomeados)
- `src/app/bi/financeiro/page.tsx` (Dashboard)
- `src/app/bi/financeiro/{cp-cr,fluxo}/page.tsx`
- `src/app/portal/financeiro/{cp,fluxo}/_content.tsx`
- `src/components/analise/AnaliseIAView.tsx`

**ARQUIVOS CRIADOS:**
- `src/lib/caixaBuilder.test.ts` (12 testes)
- `src/lib/planoContas.test.ts` (14 testes)
- `src/hooks/useAPI.test.ts` (5 testes)

**Total testes**: 73 (29 antigos + 31 novos do Step 13).

## Sessão 05/05/2026 — Step 14 (Testes de dominio e stores)

Suite minima de testes automatizados para impedir regressao nas regras
sensiveis identificadas no plano de seguranca. Vitest 2.1 + jsdom (ja
configurado). Backend (`grupoalt-api`) intocado.

**ANTES:** 5 arquivos de teste, 73 testes (Step 13 entregou tests para
buildWeekly, DRE Math.abs, useCPAll/useCRAll).

**AGORA:** 7 arquivos, **150 testes** (+77 novos).

**ARQUIVOS MODIFICADOS:**
- `src/lib/planoContas.test.ts` — adicionados 12 testes para `getGrupoDRE`
  (lookup exato + fallback de prefixo + null/vazio/desconhecido + trim) e
  `getCategoriaInfo`, alem de cobrir `buildCategoriasFromAPI` em mais
  cenarios (override > prefixo, op +/- por grupo, descarte de codigo
  desconhecido).
- `src/lib/caixaBuilder.test.ts` — adicionados 15 testes para `buildMonthly`
  (soma multipla mesmo mes, NEUTRO via map, datas null/invalidas, ordem
  cross-ano), `buildQuarterly` (Q1-Q4, NEUTRO, data invalida),
  `buildBreakdownByCategoria` (NEUTRO, granularidade n1/n3) e
  `buildBreakdownByFavorecido` (agregacao, fallback "Sem favorecido",
  exclusao NEUTRO).

**ARQUIVOS CRIADOS:**
- `src/lib/transformers.test.ts` — 33 testes para `transformExtrato`
  (preserva valor negativo/zero, fallback descricao→favorecido,
  banco→conta_id→"N/D", datas null), `transformCPCR` (5 status do
  contrato, decimais, NF/PA, valor_pago null=0, valor_aberto null=saldo,
  pagamentos com desconto/juros/multa), `transformSaldos` (codigos
  numericos Omie, descricao truncada 20 chars, sinal preservado),
  `transformConcilMovimento` (threshold 0.01, Math.abs, lista vazia) e
  `buildContaMap`.
- `src/store/empresaStore.test.ts` — 17 testes cobrindo as invariantes
  do Step 11: `syncFromAuth` (cria empresas, mantem activeId valido,
  descarta invalido, limpa quando user sem empresas, espelho legado),
  `setActive` (rejeita id vazio, rejeita id de outro usuario,
  pre-login fallback), `reset` (limpa estado e localStorage), e o cenario
  critico de **isolamento entre sessoes** — logout do usuario A nao vaza
  activeId para o usuario B.

**VALIDACAO:**
- `npm test` → 7 arquivos, 150 testes, 0 falhas (~2.5s).
- `npm run typecheck` → sem erros.
- `npm run build` → build de producao OK.

## Sessão 06/05/2026 — Step 16 Fase B (ChatPanel hardening)

Hardening cliente do `ChatPanel` alinhado com a Fase A do `grupoalt-api`
(politica em `docs/plano-acao-seguranca/orbit-policy.md` no repo backend).

**ARQUIVOS NOVOS:**

- `src/components/chat/chatHelpers.ts` — modulo puro com:
  - `MAX_MSG_CHARS = 4000`, `MAX_MESSAGES = 20` (espelho dos limites Pydantic).
  - `trimHistoryForApi(messages)` — corta historico para `MAX_MESSAGES` mais
    recentes; descarta `assistant` orfa no inicio (backend rejeita).
  - `validateOutgoing(text)` — valida texto antes do envio (vazio,
    > 4000 chars). Retorna `{ ok: false, reason, message }` para alimentar
    o banner de erro sem round trip.
  - `describeAxiosError(err)` — mapeia erros do axios para
    `ErrorPresentation { kind, message, severity, retryAfterSeconds? }`.
    Cobre 401 (warn), 403/404/422 (error), 429 com `Retry-After`
    (`rate_limited_burst`), 429 sem header (`rate_limited_daily`), 5xx ou
    network error (`unavailable` info — graceful degradation), desconhecido
    (`unknown` error com `detail` do servidor).

- `src/components/chat/chatHelpers.test.ts` — **24 testes Vitest**.

**ARQUIVOS MODIFICADOS:**

- `src/components/chat/ChatPanel.tsx`:
  - `sendMessage` agora roda `validateOutgoing` antes de despachar.
  - Envia apenas `trimHistoryForApi(...)` (max 20 mensagens).
  - Estado `error: string` substituido por `errorState: ErrorPresentation`,
    com cores do banner por severidade (rate/warn=ambar, error=vermelho,
    info=cinza). Banner com botao X e `role="alert"`.
  - "Fake assistant message" `⚠️ ...` removida — erros vivem no banner.
  - Contador `N/4000` no input quando passa de 80% do limite (vermelho em
    overflow). Botao de envio desabilitado em overflow.
  - Cores aplicadas em ambos os modos (overlay padrao + embedded da
    AnaliseIAView).

**INTERACAO ENTRE FASES A E B:**
- Fase A defende com 422/429/403 no servidor (autoridade final).
- Fase B antecipa esses erros no cliente e melhora UX, sem confiar no
  cliente como barreira de seguranca. Mesmo se o cliente for adulterado,
  o backend rejeita.

**VALIDACAO:**
- `npm test` -> 174/174 verde (150 anteriores + 24 novos).
- `npm run typecheck` -> sem erros.
- `npm run build` -> build de producao OK.
- `npm run audit:bundle` -> sem credenciais expostas.

**DEFERIDO PARA FASE C:**
- Endpoint admin `/orbit/audit` no backend.
- Pagina BI/admin para visualizar audit log + metricas.
- Politica de retencao 90d via cron.
- Alertas de uso anormal.

## Sessão 06/05/2026 (parte 2) — Step 16 Fase C (página admin de auditoria)

Frontend da observabilidade administrativa do Orbit. Backend companion
entrega 2 endpoints (`GET /orbit/audit` paginado e
`GET /orbit/audit/summary`) + job APScheduler de retenção 90d.

**ARQUIVOS NOVOS:**

- `src/app/bi/financeiro/admin/orbit/page.tsx` — página admin completa:
  - Sub-nav unificada (Empresas / Plano de Contas / Contas Bancárias /
    **Orbit IA** — adicionado em todas as páginas admin).
  - Seletor de janela (`24h` / `7d` / `30d` / `90d`).
  - 5 KPI cards: total chamadas, tokens consumidos, taxa de erro
    (highlight âmbar > 5%), latência média, tentativas bloqueadas.
  - Top 5 usuários + Top 5 empresas (cards de ranking por tokens).
  - Filtro de status em chips (Todos / Sucesso / Forbidden / Not Found
    / Payload / Limite diario / Erro / Rate limit).
  - Tabela paginada (25 itens/página): Quando, Usuário, Empresa, Status
    (badge colorido por severidade), Modelo, Tokens, Latência, Erro.
  - `useRequireAdmin` + `<AccessDenied />` (admin-only).

**ARQUIVOS MODIFICADOS:**

- `src/hooks/useAPI.ts` — novos hooks + types:
  - `useOrbitAudit(filters: OrbitAuditFilters)`
  - `useOrbitAuditSummary(desdeDias: number = 7)`
  - Types: `OrbitAuditItemAPI`, `OrbitAuditPageAPI`,
    `OrbitAuditSummaryAPI`, `OrbitAuditTopUserAPI`,
    `OrbitAuditTopEmpresaAPI`, `OrbitAuditStatusBucketAPI`,
    `OrbitAuditFilters`.
- Sub-nav admin atualizada em 4 páginas:
  - `src/app/bi/financeiro/admin/page.tsx` (Empresas)
  - `src/app/bi/financeiro/admin/categorias/page.tsx` (Plano de Contas)
  - `src/app/bi/financeiro/admin/contas-bancarias/page.tsx`
  - `src/app/bi/financeiro/admin/orbit/page.tsx` (novo)

**Por que sem testes Vitest novos:**

A página é principalmente display (KPI cards, badges, tabela). Os hooks
são wrappers finos sobre o `useApi` genérico já exercitado pelos 13
testes do `api.test.ts`. A lógica de paginação, filtros e agregação é
backend-side, com cobertura forte de **20 testes pytest novos** no PR
companion (`tests/test_orbit_audit.py`): RBAC, filtros, agregação,
retenção.

**VALIDAÇÃO:**

- `npm test` -> 174/174 verde (sem regressão).
- `npm run typecheck` -> sem erros.
- `npm run build` -> rota `/bi/financeiro/admin/orbit` (5.27 kB,
  130 kB total c/ shared chunks); 50 rotas no total.
- `npm run audit:bundle` -> sem credenciais expostas.

**STEP 16 COMPLETO (Fases A + B + C):**
Política LGPD escrita, audit log persistido sem conteúdo, rate limit por
usuário, system prompt blindado, validação client-side, mensagens de
erro por status, graceful degradation, página admin com KPIs + ranking
+ tabela paginada, retenção 90d via cron.

## Sessão 06/05/2026 — Step 17 (Homologação Final)

Consolidação dos Steps 01-16 e decisão **GO técnico** para produção.
Relatório companion no `grupoalt-api` em
`docs/plano-acao-seguranca/step-17-relatorio-homologacao.md`. Cópia
local do mesmo relatório em
`docs/plano-acao-seguranca/step-17-relatorio-homologacao.md`.

**VALIDAÇÕES AUTOMATIZADAS (verde, web):**

- `npm run typecheck` → sem erros TS
- `npm run lint` → apenas warnings (`react-hooks/exhaustive-deps`,
  `@next/next/no-img-element`); CI do Step 15 só bloqueia em erros
- `npm test` → **174/174** em 8 arquivos (~3.2s)
- `npm run build` → 50 rotas, middleware 26.8kB, sem regressão
- `npm run audit:bundle` → 0 credenciais expostas em 79 arquivos JS
- `npm audit --omit=dev --audit-level=high` → 2 advisories
  (Next 14.x + postcss transitivo) com **EXC-001/EXC-002** formais em
  `docs/plano-acao-seguranca/audit-exceptions.md`. Plano de upgrade do
  Next 16 ate 2026-07-31 (issue #56).

**CHECKLIST FRONTEND:**

- Auth (Step 07): interceptor sem race, refresh dedicado, redirect em
  401 não recuperável.
- RBAC (Step 06+08): `lib/access.ts` com 29 testes; `useRequireAdmin`
  + `<AccessDenied />` em todas as páginas admin.
- Empresa ativa (Step 11): `empresaStore.activeId` é fonte única,
  17 testes garantindo isolamento entre sessões.
- BI: 6 telas (Dashboard, Caixa, Extrato, CP/CR, Fluxo, Conciliação)
  consumindo plano dinâmico via `useCategoriasMap`.
- Admin: 4 páginas com sub-nav unificada (Empresas, Plano de Contas,
  Contas Bancárias, Orbit).
- CSP (Step 10): nonce dinâmico via `src/middleware.ts`, sem
  `'unsafe-eval'`/`'unsafe-inline'` em produção.
- Orbit (Step 16 B): `validateOutgoing` + `trimHistoryForApi` +
  `describeAxiosError` no ChatPanel; banner de erro com cores por
  severidade; graceful degradation em 5xx/network.

**RISCOS RESIDUAIS ACEITOS:** R-01 (Next 14.x), R-02 (postcss),
R-03 (DRE Math.abs em estornos). Detalhes no relatório.

**PLANO DE ROLLBACK:** rollback Vercel <2min, Railway <5min, schema
migrations não destrutivas.

**ARQUIVOS NOVOS:**

- `docs/plano-acao-seguranca/step-17-relatorio-homologacao.md`

**ARQUIVOS MODIFICADOS:**

- `docs/plano-acao-seguranca/README.md` — Step 17 marcado como DONE.

## Pendências (operacional, fora do código)

- Validar em produção todas as features entregues (Steps 11-16).
- Marcar as categorias de repasse do Grupo ALT como NEUTRO e validar
  que RNOP/DNOP ficam limpos.
- Validação financeiro/controladoria sobre regra de estornos no DRE
  (Step 13 — Parte B aberta até decisão contábil).
- Cumprir checklist operacional da Seção 9 do relatório do Step 17
  antes de cada deploy de produção.

## Sessão 2026-06-18 — Janela A (Soak DRE Backend)

**Status: JANELA A 100% COMPLETA (soak iniciado 2026-06-18 17:35)**

### Etapa 5.A — Convergência DRE Backend
✅ **Diagnóstico divergência:** cf +15,3K constante em 30/60/91d → causa raiz: `/dre` não filtrava `ContaCorrente.incluir_bi/is_projecao`.
✅ **Fix (api #134):** `_query_dre_from_db` com semântica idêntica ao `/extrato` + `DRE_CACHE_SCHEMA_VERSION=v2` + M1 (PATCH de flags invalida namespace "dre"). Audit 95/100 APPROVE.
✅ **Merges:** api #134 + 6 dependabot seguros + web #165 + redis #128 adiado com justificativa (RESP3 default + socket timeouts).

### Etapa 5.B — Validação Production DRE
✅ **Sentry:** DSN da API testado; web preenchido em prod; evento chegando.
✅ **Flag virada:** `NEXT_PUBLIC_USE_BACKEND_DRE=true` em Vercel Production 2026-06-18 17:35.
✅ **Paridade:** números idênticos aos pré-virada em 2–3 meses validados.
✅ **1h monitoramento pós-flip:** Sentry limpo, Railway logs OK, taxa de 403 normal, zero anomalia.

**Soak timeline:**
- **D** = 2026-06-18 17:35 (flag virada + soak iniciado)
- **D+1** → **D+6**: monitoramento contínuo (7 dias, mín ≥ 7 de intervalo)
- **D+7** = 2026-06-25 17:35 (gate para PR-6 Fase 5.G = ponto-de-não-retorno do DRE)

**Próximos passos (cronograma Fase 5 final):**
- **OP-1 (soak D→D+7):** Monitorar DRE backend (zero regressão números, 403 taxa normal, Sentry limpo). Rollback instant (<2min) se anomalia.
- **Janela B (após 24–48h soak estável):** OP-3 marcar categorias de repasse como NEUTRO (com sign-off controladoria escrito); validar RNOP/DNOP limpos.
- **PR-4 (Next 16) em paralelo durante soak:** Branch `chore/upgrade-next-16-eslint-9` em desenvolvimento; CI verde + CSP Preview validado antes do merge (nunca mergear em Janela A).
- **Janela C (pós-soak, fora de horário comercial):** OP-4 ligar `RBAC_ENFORCE=true` (requer api #132/#133 em prod + rbac_preflight.py exit 0).
- **Janela D (após Janela C):** PR-4 merge + smoke completo + 1h monitoramento CSP sem violations.
- **PR-6 (5.G, após D+7 gate):** Remove calcularDRE local (~−700 LOC), fecha issue #56 Next16, consolida Fase 5 (ponto final deste plano).

## Sessão 2026-06-29/30 — Soak DRE concluído + paridade SALDO (#142) + PR-6 (Fase 5.G)

**Soak DRE: GO.** Em D+11 (2026-06-29) o backend `/dre` foi validado como **fonte de verdade**
(bate com o banco). A divergência da GRUPO ALT (+76K em CV no range amplo) foi diagnosticada via
query read-only no DB e **NÃO era bug de backend** — era o cálculo **LOCAL** subcontando ~0,2%
(artefato do `ComparativoDRE` dev-only). Detalhe em
`docs/plano-acao-seguranca/soak-dre-monitoring-log.md`.

**api #142 — paridade fina SALDO (MERGEADO + deployado):** `get_dre` passa a pular marcadores de
saldo (`favorecido ∈ {SALDO, SALDO ANTERIOR, SALDO INICIAL}`), espelhando `extrato.py:242-245` +
bump `DRE_CACHE_SCHEMA_VERSION v2→v3`. A premissa (haver registros SALDO) foi **refutada** por
query (0 registros) → **no-op nos números**; mantido como hardening defensivo. Audit 94/100.

**web #176 — PR-6 / Fase 5.G (DRAFT, NÃO mergeado):** remove o cálculo DRE local agora que o
backend é a fonte única. Branch `chore/pr6-remove-local-dre`, commit `f592df6`, **−894 LOC**:
- **Remove:** `calcularDRE`/`calcularDREPorMes`/`calcularNeutros` (planoContas.ts), `featureFlags.ts`
  (flag `useBackendDRE` + `useDREComparativo`), `ComparativoDRE.tsx`, harness TS do oracle
  (`tests/oracle/{oracle.test.ts,loader.ts,types.ts}`).
- **Mantém:** `CATEGORIAS`/`getGrupoDRE`/`getCategoriaInfo`/`buildCategoriasFromAPI`, `caixaBuilder.ts`
  (gráficos + `buildDREMatrix`), `useCategoriasMap`, e as **fixtures do oracle** (fonte de verdade
  sincronizada p/ o backend via `grupoalt-api/scripts/sync_oracle_fixtures.py`).
- 5 call sites → `useDRE` direto; `AnaliseIAView` usa `EMPTY_DRE` (objeto-zero) como guarda de loading.
- Audit adversarial **97/100 APPROVE** (`docs/audit/pr6-remove-local-dre/review.md`).
- **Pendência conhecida (não bloqueia):** `buildDREMatrix` (DRE mês-a-mês N2/N3) segue local — sem
  endpoint backend com esse breakdown; micro-divergência ~0,2% aceita.
- **Merge em janela própria** (fora de horário) + smoke + remover env vars
  `NEXT_PUBLIC_USE_BACKEND_DRE`/`NEXT_PUBLIC_DRE_COMPARATIVO` do Vercel. **Ponto final da Fase 5.**
- ADR-001 atualizado com a Fase 5.G executada.

**Pendente (não-código):** Janela B (NEUTRO) aguarda **sign-off escrito da controladoria**;
Janela C (`RBAC_ENFORCE`) e Janela D (PR-4 Next 16 — #172) pós-soak.

## Estado atual do build (2026-06-30)

Referências de "50 rotas" nas seções históricas dos Steps 16/17 estão
congeladas no tempo. Estado corrente:

- **44 rotas** geradas (`npm run build`)
- Suite de testes: **357 em `main`**; **335 na branch do PR-6** (#176) após remover os testes de
  `calcularDRE`/`calcularDREPorMes`/`calcularNeutros` + o harness TS do oracle
- Bundle: 0 credenciais (`npm run audit:bundle` cobre 85 arquivos JS)
- **DRE backend = fonte única validada** (soak concluído D+11). PR-6 (#176, draft) remove o cálculo
  local; após o merge a flag `NEXT_PUBLIC_USE_BACKEND_DRE` deixa de existir (backend sempre).

Componentes compartilhados adicionados pós-Step 17:
- `<PermissionGate>`, `usePermission`, `usePermissoesAtivas` (Fase A RBAC)
- `<UserMenu>` (Bug #3 da Fase B)
- `<EmpresaSelector>` (Bug #1/2 da Fase B)
- `<DeleteUsuarioModal>` (Bug #4 backend + frontend)
- `<AdminSubNav>` (refactor E1: dedup de sub-nav nas 5 páginas admin)

## Sessão 2026-06-30/07-01 — Fase 5 encerrada + fallout de datas P1-2 + Janela B

**Fase 5.G (DRE) — CONCLUÍDA (tudo mergeado):**
- **web #176 (PR-6)**: removido o cálculo DRE local (`calcularDRE`/`calcularDREPorMes`/
  `calcularNeutros`, `featureFlags.ts`, `ComparativoDRE`). Backend `/dre` = fonte única.
- **web #178**: `<DREErrorBanner>` (`components/ui/`) nos 5 consumidores do `useDRE` — sem fallback
  local, uma falha do `/dre` mostrava **zeros silenciosos**; agora banner `role="alert"` + retry.
  `useDRE` coage `detail` a string (422 array-safe). +8 testes.
- Env vars `NEXT_PUBLIC_USE_BACKEND_DRE`/`NEXT_PUBLIC_DRE_COMPARATIVO` removidas do Vercel.

**Fallout da migração de datas P1-2 (bug de ~mai/2026, achado no smoke — NÃO era da Fase 5):**
- Backend migrou datas `DD/MM/YYYY` → ISO `YYYY-MM-DD`; consumidores de data **crua** no front
  quebraram em silêncio: Caixa/DRE-mensal (gráficos zerados), Dashboard "Receita vs Custos",
  Conciliação (calendário sem cores), Portal `/grupo` (badges de vencimento).
- **web #179**: novo **`parseApiDate`** (fonte única — ISO + datetime + DMY + bounds) em
  `formatters.ts`; `caixaBuilder`/dashboard/`portal/grupo` roteados por ele; `transformConcilMovimento`
  volta a chavear por **ISO**. Novo `sla.test.ts`.
- **api #143**: **500** no `/conciliacao/movimentacao` — `float += Decimal` (coluna `valor` Numeric);
  extrai `_build_movimentacao_rows` + coage valor→float. A conciliação precisava dos **dois** PRs
  (#179 alinha a chave ISO do heatmap; #143 devolve os dados).

**Janela B (NEUTRO) — CONCLUÍDA sem alteração (controladoria 2026-07-01):** revisados os candidatos
da GRUPO ALT (`empresa_id 2`); só **REPASSE UNIDADES** fica NEUTRO (`1.02.96`/`2.13.83`, já estava).
**Mútuos/empréstimos NÃO** (financeiros reais em RNOP/DNOP); **custo-matriz** = rateio descontinuado.
Nenhum `bulk-override` aplicado — RNOP/DNOP já corretos. Runbook `janela-b-neutro-runbook.md` marcado
como concluído + Passo 4 corrigido (sem `ComparativoDRE`).

**Pendências de roadmap:** Janela C (`RBAC_ENFORCE`) e Janela D (PR-4 Next 16 — #172).

## Estado atual do build (2026-07-01)

- **44 rotas**; testes **368 em `main`** (pós #178/#179); bundle 0 credenciais (`audit:bundle`).
- DRE **100% backend** (a flag `NEXT_PUBLIC_USE_BACKEND_DRE` não existe mais). Parsing de data crua
  da API **centralizado em `parseApiDate`** (`formatters.ts`) — não usar `split('/')`/`parseDMY`
  próprios em campo de data cru.

## Sessão 2026-07-12/14 — Janelas C+D fechadas + extrato limpo (fonte fiel ao caixa)

**Janela C — RBAC_ENFORCE (CONCLUÍDA 2026-07-12):** flag `RBAC_ENFORCE=true` em prod (Railway)
desde ~01/07, validada. Estado real da prod divergia do plano: Giovan e r.tonha **soft-deletados
em 12/06** — só 2 admins ativos (bypass), risco de lock-out zero. Decisão: ligar como
secure-by-default. ⚠️ **Usuário não-admin novo EXIGE perfil** (`/bi/financeiro/admin/usuarios`),
senão 403 em todo o BI. Pré-flight via `railway connect` + `scripts/rbac_check.sql` (api).

**Janela D — Next 16 (CONCLUÍDA 2026-07-13):** #172 mergeado (Next 16.2.9 + React 19.2 + ESLint 9
flat config). Branch atualizada com main pós-Fase 5 (zero conflitos), gate re-rodado, CSP validada
em Preview e produção (nonce, sem unsafe-*), issue #56 fechada. Dependabot destravado: #168/#169/
#170/#173/#181 mergeados na sequência (CI verde era bloqueado pelo peer eslint>=9).

**Saga do extrato contaminado (2026-07-13/14):** conferência fina do DRE vs Excel da controladoria
(GRUPO ALT) achou Abr +3,2M / Mai CV +1,9M. Investigação em 5 rodadas de SQL read-only
(`grupoalt-api/scripts/dre_divergencia*.sql`) isolou **3 mecanismos** contaminando `lancamentos_cc`:

1. **Títulos em aberto como caixa** — Omie manda previsões (`Conta a Receber/Pagar`) no
   `ListarExtrato`; sync ingeria. Fix **api #144** (skip `is_previsao` + cache DRE v4) + limpeza
   one-time (DELETE 1113 linhas / ~15,7M — Jun/Jul correntes eram os mais poluídos).
2. **Registros-fantasma** — Omie reemite baixa com `nCodLanc` NOVO ao conciliar/rebaixar; upsert
   nunca deletava. Fix **api #145**: reconciliação de janela no sync (deleta o que a Omie parou de
   devolver) + guarda M1 anti-resposta-truncada (mortos > max(50, 30%) aborta) + cache nos caminhos
   que deletam. Audit 84→APPROVE pós-fix.
3. **"Dupla camada" crédito+baixa** — inspeção do JSON cru (`inspect_extrato_raw.py`) provou que era
   **subconjunto do mecanismo 2**: ao conciliar, a Omie SUBSTITUI crédito bancário + baixa antiga por
   baixa nova; os "pares" no banco eram cadáveres. Resync-extrato purgou tudo.

**Resultado:** 1.01.02 Abr 7,92M→4,75M (Excel: 4,77M), Mai 4,1M→2,58M (Excel: 2,60M), duplicatas 0,
previsões 0. **DRE agora fiel ao caixa real**; higiene permanente = sync diário com reconciliação +
financeiro conciliando na Omie. NOP nunca bate com Excel da controladoria **por design** (repasse é
NEUTRO no portal). Regra de estorno (R-03/Math.abs) descartada como causa (query de sinais mistos vazia).

**Frontend entregue na sequência:**
- **#184**: `fmtInt` (inteiro pt-BR) na tabela DRE mês a mês — pedido da controladoria pra enxergar
  distorção fina.
- **#185**: `fmtInt` em TODAS as superfícies de leitura (KPI cards, DRESidebar, DetailPanel,
  ChartGrid cards, tabelas de CP/CR/Extrato/Fluxo/Conciliação, Análise IA + espelhos portal).
  **`fmtK` é EXCLUSIVO de gráficos** (tickFormatter, BarLabel/BarLabelVar, CustomTooltip, waterfall).
- **#186**: botão **"Resync extrato"** por empresa em Configurações (era só via fetch manual no
  console). 504/rede = info "continua em segundo plano" (endpoint síncrono e demorado), não erro.
- **#187**: fix de flake no teste de race do portal/admin (`findByRole` — o `waitFor` só garantia a
  chamada, não o re-render da aba).

**api na mesma sessão:** #144, #145, #146 (fix falso-negativo do `rbac_preflight` — override
letra-morta do vocabulário legado mascarava lock-out; + promove 8 scripts de diagnóstico read-only
pra `scripts/`).

**Pendências:** limpeza empresas TESTE(3)/SMOKE(4) em prod (operacional, via UI); unificação
estrutural `bi/` ↔ `portal/` (~3500 LOC, único item grande restante).

## Estado atual do build (2026-07-14)

- **44 rotas**; testes **376 em `main`**; bundle 0 credenciais.
- Formatação: **`fmtInt` para leitura, `fmtK` só em gráficos** — não reintroduzir `fmtK` em
  card/tabela nova.
- Extrato: sync com **reconciliação de janela** (deleta o que a Omie não devolve mais) e **sem
  previsões**. Resync total por empresa disponível na tela admin de Configurações.

## Sessão 2026-07-14/15 — Fase 2 Motor↔Portal (SSO) mergeada e validada

**web #191 (mergeado):** UI da integração SSO com o Motor de Fechamento:
- `src/app/portal/fechamento/page.tsx` — página de entrada com botão SSO. Padrão
  anti-popup-blocker: `window.open('', '_blank')` SÍNCRONO no clique, URL setada quando o
  ticket chega; em erro a aba fecha e um banner explica (409 sem acesso / 403 sem permissão /
  503 integração não configurada).
- `src/components/admin/MotorAcessoSection.tsx` — seção "Acesso ao Motor de Fechamento" no
  detalhe de usuário do admin BI (`/bi/financeiro/admin/usuarios`): conceder ou VINCULAR
  existente (aviso azul), atualizar perfil/unidades, revogar (confirm + faixa vermelha),
  aviso âmbar quando estado no Motor diverge do portal, linha informativa em 503.
- `src/hooks/api/useMotorAcesso.ts` — hooks/endpoints `/motor/*`.
- Sidebar: módulo `fechamento` + fix bug `'visualizar'→'ver'` (seções com módulo sumiam
  pra não-admin).

**Validação em produção (2026-07-15):** smoke E2E aprovado — provisionar, SSO abre logado
sem senha (admin e operacional não-admin, escopo de unidades do Motor respeitado),
revogar → banner 409 + sessão do Motor derrubada. Detalhes operacionais do gate e do
diagnóstico vivem no CLAUDE.md do repo da api (privado).
**Lição de UX do smoke:** uma sessão antiga do Motor no navegador MASCARA falha de SSO —
a SPA abre o dashboard mesmo com `?sso_error=1` na URL; validar SSO pelo estado real,
não pela tela aberta.

**Backlog anotado (validação do usuário):**
- Motor (`motor-fechamento-alt`): falta filtro de unidade nas telas operacionais pra quem
  opera 2+ unidades (o escopo funciona; não dá pra filtrar entre as unidades permitidas).
- Web: mover/duplicar gestão de usuários + "Acesso ao Motor" pro `/portal/admin` — hoje
  vive só no admin do BI, e o admin do BI deveria ser só de BI. Toca na unificação
  `bi/` ↔ `portal/`.
- Fase D: KPIs do Motor no dashboard do portal.

## Sessão 2026-07-15/16 — Validação com perfil operacional (5 ressalvas) + convite/reset de senha

Validação do usuário logado como perfil operacional real levantou 5 ressalvas.
Tudo mergeado e validado em produção (companions: api#149/#150/#151, repo privado).

**web #193 — gestão de usuários unificada no `/portal/admin`:** o detalhe
expandido do usuário ganhou as seções Perfis RBAC (novo
`components/admin/PerfisRBACSection.tsx`) e Acesso ao Motor (reuso do
`MotorAcessoSection` com tokens `DARK`) + busca por nome/email. "Usuários"
saiu da `AdminSubNav` do BI (admin do BI é só de BI);
`/bi/financeiro/admin/usuarios` virou redirect.

**web #194 — header do portal + visibilidade financeira:**
- Bug de empilhamento que explicava DOIS sintomas: o `<header>` tem
  `backdrop-filter` (cria stacking context) sem z-index, e o `<main>`
  (`relative z-0`, depois no DOM) pintava POR CIMA dos dropdowns — painel de
  notificações atravessado pelos cards e clique no "Sair" morrendo no
  conteúdo. Fix: `z-20` no header.
- Sidebar com gate POR ITEM (`NavChild.require` + `filterNavSections`
  exportada/testada): "Financeiro" (link pro BI) e "Controladoria" exigem
  `financeiro:ver`; card Controladoria da home idem. Perfil operacional vê
  só "Operações" em Indicadores.
- Backend companion (api#149): alertas financeiros da sineta só chegam pra
  quem tem `financeiro:ver` na empresa.

**web #195 — logo por empresa persistido:** upload em Configurações salva no
backend (`updateEmpresaLogos`, otimista + rollback) em vez de só no
localStorage de quem subiu; `/auth/me` entrega `logo_dark/logo_light`,
`syncFromAuth` mapeia, `EmpresaSelector` do portal e Navbar/EmpresaDropdown
do BI exibem (getLogo, tema-aware), PDFs estampam no cabeçalho (backend).

**web #196 — convite por e-mail + esqueci/redefinir senha:**
- Páginas públicas `/esqueci-senha` (confirmação genérica por design —
  anti-enumeração do backend) e `/redefinir-senha?token=...[&convite=1]`
  (serve reset E primeiro acesso de convidado; mínimo 8 chars + confirmação;
  Suspense p/ useSearchParams).
- Login: link "Esqueceu a senha?" apontava pra `#` desde sempre — agora leva
  pro fluxo real.
- Modal Novo Usuário do `/portal/admin`: CONVITE POR PADRÃO (só nome+email;
  link de 7 dias) com checkbox "Definir senha manualmente" pro fluxo antigo;
  botão "Reenviar convite" no detalhe expandido (invalida links anteriores).
- Gate operacional (envs SMTP + migration) documentado no CLAUDE.md da api
  (repo privado). Smoke aprovado em produção 2026-07-16.

## Estado atual do build (2026-07-16)

- **46 rotas** (novas: `/esqueci-senha`, `/redefinir-senha`); testes **420 em `main`**.
- Gestão de usuários = `/portal/admin` (BI admin: Empresas, Plano de Contas,
  Contas Bancárias, Orbit). Visão financeira (BI/Controladoria/alertas) exige
  `financeiro:ver`.
- Backlog: Fase D do Motor (duas visões, escopo aguarda discussão — memória
  `fase-d-motor-bi`); unificação estrutural `bi/` ↔ `portal/`.

## Sessão 2026-07-22/24 — Módulo BI de Fechamento completo (read-through do Motor)

Novo módulo `/bi/fechamento` lendo o Motor de Fechamento (fonte única) via
read-through com cache — **NÃO copia o banco do Motor**. Companions na
`grupoalt-api`: #160 (fundação), #161 (anual), #162 (telas finais),
#163 (Crédito & Débito canônico). Web: #210 (shell), #211 (fix selects),
#212 (Faturamento + Custo×Fat), #213 (var% + tipo_periodo + 5 anos),
#214 (5 anos vira botão + tooltip), #215 (3 telas finais), #216 (Crédito
& Débito espelho PBI).

**Arquitetura (api):**
- `MotorBIClient` (services/motor_client.py): identidade de SERVIÇO
  read-only no Motor (perfil ANALISTA, usuário id em
  `MOTOR_BI_SVC_USER_ID`; sem env → 503) autenticada pela MESMA máquina
  de SSO da Fase 2 — ticket JWT server-side trocado em GET /auth/sso,
  cookie no Redis 20h, re-SSO único em 401. Claim perfil=ANALISTA contém
  privilégio (o Motor adota o perfil do ticket).
- Router `/v1/fechamento-bi/*` (gate `fechamento:bi`): `/filtros`
  (unidades c/ tipo_periodo, navios, anos — dinâmicos), `/resumo`,
  `/faturamento-anual`, `/credito-debito`, `/postos`, `/devedores`.
  Cache Redis 10min por recorte + agregado POR FECHAMENTO
  (`fech:v3:{id}:{atualizado_em}`, TTL 7d — reabertura roda a chave).
- **Base = HISTÓRICO DE FECHAMENTO consolidado, nunca viagens cruas**
  (duplicatas de reimportação inflariam faturamento). Litros zerados →
  R$/litro previsto e desabilitado ("aguardando litros").
- **Dual-shape de linhas_resumo** (#163): produção fecha via
  /commit-batch com o shape do FRONTEND (saldo_bruto,
  desconto_seguro_boi, total_debitos, liquido, frota…) ≠ shape do motor
  server-side (valor_motorista_total…). Agregador lê os dois via
  `_linha_num`; valores por viagem saem do snapshot (igual nos dois).

**Telas (web):** Faturamento (KPIs, var% MoM via BarLabelVar, resultado
por unidade, fechamentos; botão "Comparar 5 anos"), Faturamento 5 anos
(fora da barra de abas; tabela ano a ano + gráfico com tooltip-tabela
estilo PBI: ANO | mês | %YoY | YTD | %YoY), Custo × Fat (ABC de
agregados c/ % acumulado), Agregados & Postos, Adiant. & Devedores
(aging 0-30/31-60/61-90/90+, posição ATUAL — só filtro de unidade),
Crédito & Débito (espelho fiel da planilha/PBI: crédito × débito ×
rodapé c/ VALOR TOTAL FECHAMENTO; "período em aberto" quando não há
fechamento; KPIs de Resultado e Margem % no topo). Eixo mês+trimestre
(`MesTriTick`) nos gráficos mensais.

**Filtros globais** (biFechamentoStore): ANO · MÊS · QUINZENA/DEZENA ·
NAVIO · UNIDADE — opções dinâmicas do `/filtros`; quinzena/dezena
respeita o `tipo_periodo` da unidade (QUINZENAL→Q1/Q2; DEZENA→D1-D3;
MENSAL/NAVIO→trava) e é recorte LOCAL sobre os fechamentos
(lib/fechamentoBi.ts — janela contida; cabeças/km/ABC não re-fatiam,
telas mostram "—"/nota).

**Definições de domínio validadas (Crédito & Débito, 2026-07-23):**
comissão bruta = razão − motorista (agregados) + valorFrota (FROTA);
saldo posto = retido nas fichas; devedores/adiant = DESCONTADOS no
período (dt_fechamento_desconto ?? dt_prevista_debito, FINANCEIRO fora);
devedores gerados = fichas com líquido negativo; SUBTOTAL crédito =
total razão; VALOR TOTAL = razão − custo motorista (canon do
RelatoriosPage.gerar() do Motor).

**Também nesta sessão (repos do Motor):** motor-alt#231 (dropdown de
Relatórios não lia unidade_ids multi), motor-alt#232 (UI de unidades de
operação no cadastro de motoristas + badge SEM UNIDADE),
motor-api#190 (trava de DELETE em período fechado — 409
PERIODO_FECHADO, sem bypass; correção legítima = reopen-batch);
script fix-motoristas-sem-unidade aplicado em prod (55 corrigidos).

**Pendências:** "Total terceiros" sem fonte no Motor (tela mostra "—",
aguarda definição da controladoria); smoke + validação de paridade vs
planilha/PBI num período fechado (gate final); ajustes de layout;
import histórico 2024/25 no Motor; rotacionar senha do Postgres do
Motor; test:integration do motor-api em staging; mapear ~88 motoristas
SEM UNIDADE pela UI nova.

## Estado atual do build (2026-07-24)

- Testes **440 em `main`**; rotas novas: `/bi/fechamento` ×6 (+ `/bi/motor` ×4 da sessão 07-22).
- BI de Fechamento 100% dados reais; gate `fechamento:bi`; usuário de
  serviço no Motor = ANALISTA id 14 (`MOTOR_BI_SVC_USER_ID`).
- Lição operacional: PRs são mergeados MINUTOS após abertura — checar
  `gh pr view N --json state` antes de push de follow-up (2 commits
  ficaram órfãos em 23/07; resgatados via cherry-pick nos #163/#216).
