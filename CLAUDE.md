# CLAUDE.md — grupoalt-web

> Frontend do Portal BI do Grupo ALT.
> Última atualização: 2026-07-01 (Fase 5 concluída: #176/#178 mergeados; fix datas P1-2 #179 + api #143; Janela B fechada)

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
