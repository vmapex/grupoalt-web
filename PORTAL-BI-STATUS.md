# ALT MAX Portal BI — Status Completo e Pendências

## Data: 02/04/2026

---

## 1. ARQUITETURA

### Repositórios
- **altmax-web**: Next.js 14 + TypeScript + Tailwind + Zustand (Vercel)
- **altmax-api**: FastAPI + PostgreSQL + Redis (Railway)

### Branches
- Desenvolvimento: `claude/continue-previous-work-yAok1`
- Produção: `main` (auto-deploy)

### URLs
- Frontend: Vercel (auto-deploy do main)
- API: `https://altmax-api-production.up.railway.app`
- Proxy: `/api/proxy/*` → Railway API

---

## 2. O QUE FOI IMPLEMENTADO

### 2.1 Infraestrutura
- [x] Autenticação JWT (login → portal → BI)
- [x] Navegação unificada (Sidebar Portal ↔ BI Navbar)
- [x] EmpresaStore dinâmico (syncFromAuth)
- [x] DateRangeStore com persistência localStorage
- [x] Botão refresh 🔄 na navbar (flush cache Redis + reload)
- [x] Cache Redis com TTLs otimizados (10min extrato/CP/CR, 1h dimensões)
- [x] Rate limit Omie tratado (REDUNDANT → retry com delay)
- [x] Sidebar: Portal BI dentro de Indicadores

### 2.2 Extrato Bancário ✅ 100%
- [x] Endpoint `ListarExtrato` da Omie (não ListarLancCC)
- [x] Favorecido real (`cDesCliente`/`cRazCliente`)
- [x] Valor com sinal correto (`cNatureza` R/D)
- [x] Filtro SALDO/SALDO ANTERIOR/Saldo Inicial removidos
- [x] Janelas de 90 dias para períodos longos
- [x] Saldo inicial do `nSaldo` do registro SALDO ANTERIOR
- [x] Saldo atual do último `nSaldo`
- [x] Banco real da conta corrente
- [x] Filtro de datas conectado ao dateRangeStore
- [x] KPIs: Saldo Inicial, Entradas, Saídas, Saldo Final + Balanço, Lançamentos
- [x] Cards de banco só mostram com saldo ≠ 0
- [x] Loading spinner + empty state
- [x] Resposta da API: `{saldo_inicial, saldo_atual, lancamentos, saldos_contas}`

### 2.3 Contas a Pagar / Receber ✅ ~95%
- [x] Favorecido resolvido via ListarClientes + ConsultarCliente
- [x] Status correto: usa `status_titulo` string + `valor_pago` dos movimentos
- [x] Prioridade: `valor_pago` dos movimentos > `status_titulo` string
- [x] Status PARCIAL (quando 1% < pago/valor < 99.5%)
- [x] Liquidação parcial via ListarMovimentos (`financas/mf/`)
- [x] Colunas: Favorecido, Grupo (nivel2 DRE), Vencimento, Valor, Pago, Em Aberto, Dt. Pgto, Status
- [x] Linha expandível com pagamentos realizados (Data, Valor, Desconto, Juros, Multa)
- [x] Filtro por status (botões: Todos, A Vencer, Atrasado, Parcial, Pago)
- [x] Prazo médio ponderado (emissão → vencimento × valor)
- [x] Rankings por favorecido e categoria com % corretos
- [x] Gráfico temporal CP × CR por mês (sem linha saldo confusa)
- [x] Conectado ao dateRangeStore
- [x] Paginação: 500 registros por página
- [x] Período default: 180 dias atrás + 90 dias futuro

### 2.4 Dashboard Executivo ✅ 100%
- [x] DRE calculado do extrato via planoContas.ts
- [x] KPIs reais: Saldo, EBT2, CP Atrasado, CR Previsto, Conciliação %, Fluxo 30d
- [x] Waterfall DRE real (RoB, Custos, EBT1, NOP, EBT2)
- [x] Receita vs Custos do extrato por mês
- [x] Últimas movimentações do extrato real
- [x] Top clientes do CR real
- [x] Aging do CP real
- [x] Rotas corretas (/bi/financeiro/*)
- [x] Sem trends fake (removidos)

### 2.5 Fluxo de Caixa ✅ 95%
- [x] Somente títulos em aberto (não pagos/recebidos)
- [x] KPIs: Saldo Atual, Entradas Prev., Saídas Prev., Saldo Projetado, Cobertura
- [x] Gráfico mensal derivado de CP/CR aberto por vencimento
- [x] Projeção diária: saldo atual + média diária de CR - CP
- [x] Sidebar: maiores entradas/saídas de títulos em aberto
- [x] Saldo atual do extrato (sem filtro de datas)
- [x] Horizonte selecionável (+7d, +30d, +60d, +90d)

### 2.6 Caixa Realizado ✅ 95%
- [x] KPIs reais do extrato (Saldo Inicial, Entradas, Saídas, Saldo Final, EBT2)
- [x] DRE sidebar com dados reais (10 linhas DRE)
- [x] Footer DRE real (Resultado, MC, EBT1, NOP, TDCF%)
- [x] Drill-down Q/M/W com dados reais do extrato via caixaBuilder.ts
- [x] ChartGrid recebe dados via props (não importa mocks internamente)
- [ ] **PENDENTE**: DetailPanel ainda usa mock para breakdown por cliente

### 2.7 Conciliação 🔶 50%
- [x] Hooks conectados (useConcilMovimentacao, useConcilResumo, useConcilDia)
- [x] Fallback para mock data quando API falha
- [ ] **PENDENTE**: Validar se endpoints retornam dados reais
- [ ] **PENDENTE**: Calendário heatmap pode não funcionar com dados reais

### 2.8 Performance
- [x] Cache Redis: 10min extrato/CP/CR, 1h dimensões
- [x] Removido `refresh=true` forçado de todas as chamadas
- [x] Botão refresh manual na navbar (flush cache + reload)
- [x] Primeiro acesso ~15-30s, subsequentes <1s

---

## 3. PENDÊNCIAS E BUGS CONHECIDOS

### 3.1 CP/CR — Pagamentos Parciais (BUG ATIVO)
**Problema**: O `ListarMovimentos` da Omie pode retornar `nValPago` como acumulado (running total) ou individual por movimento. A lógica tenta detectar, mas nem sempre funciona corretamente.

**Arquivo**: `altmax-api/app/routers/cp_cr.py` → `_get_movement_map()`

**Comportamento esperado**:
- Título R$ 1M com 2 pagamentos (R$ 500K + R$ 250K)
- Deveria mostrar: Pago = 750K, Em Aberto = 250K, Status = Parcial
- Expandir: 2 linhas com datas e valores individuais

**Possível solução**: Investigar o formato exato do `ListarMovimentos` — se `nValPago` é acumulado, usar delta. Se individual, somar. O Power Query do usuário usa `res[nValPago]` diretamente.

**Referência Power Query do usuário** (está no chat): O Power Query faz `cTpLancamento = "CP"` e `nRegPorPagina = 500`, depois expande `detalhes.nCodTitulo` para amarrar com o CP/CR.

### 3.2 Mock Data ainda presente em alguns fallbacks
**Arquivos afetados**:
- `src/app/bi/financeiro/cp-cr/page.tsx` — temporal data fallback removido (usa [])
- `src/components/caixa/DetailPanel.tsx` — ainda importa mocks para breakdown
- `src/app/bi/financeiro/conciliacao/page.tsx` — usa CONCIL_DATA como fallback

### 3.3 Conciliação não validada com dados reais
Os endpoints `/conciliacao/calendario`, `/conciliacao/movimentacao`, `/conciliacao/dia/{data}` existem mas usam `ListarLancCC` que funciona diferente do `ListarExtrato`.

### 3.4 Caracteres HTML entities
Alguns nomes de favorecidos aparecem com `&amp;` em vez de `&` (ex: "M &amp; B CONSULTORIA"). Precisa decode no frontend ou API.

---

## 4. ENDPOINTS OMIE INTEGRADOS

| Endpoint Omie | Método API | Uso |
|---|---|---|
| `financas/extrato/` → `ListarExtrato` | `listar_extrato()` | Extrato com favorecido, natureza, saldo |
| `financas/contapagar/` → `ListarContasPagar` | `listar_contas_pagar()` | CP |
| `financas/contareceber/` → `ListarContasReceber` | `listar_contas_receber()` | CR |
| `financas/mf/` → `ListarMovimentos` | `listar_movimentos("CP"/"CR")` | Liquidação parcial |
| `geral/clientes/` → `ListarClientes` | `listar_clientes()` | Nomes de clientes |
| `geral/clientes/` → `ConsultarCliente` | `consultar_cliente(codigo)` | Nome individual |
| `geral/contacorrente/` → `ListarContasCorrentes` | `listar_contas_correntes()` | Contas bancárias |
| `financas/contacorrentelancamentos/` → `ListarLancCC` | `listar_lancamentos_cc()` | Conciliação (legado) |

---

## 5. ESTRUTURA DE ARQUIVOS CHAVE

### Frontend (altmax-web)
```
src/
├── hooks/
│   ├── useAPI.ts              # Hooks de API (useExtrato, useCP, useCR, etc.)
│   └── useEmpresaId.ts        # Bridge authStore ↔ empresaStore
├── store/
│   ├── authStore.ts            # JWT, user, empresas, permissões
│   ├── empresaStore.ts         # Empresa ativa, sync com authStore
│   ├── dateRangeStore.ts       # Filtro de datas (persistido localStorage)
│   ├── themeStore.ts           # Dark/Light mode
│   └── unidadeStore.ts         # Filiais/projetos
├── lib/
│   ├── api.ts                  # Axios com proxy /api/proxy/*
│   ├── types.ts                # Tipos da API (ExtratoAPI, LancamentoAPI, etc.)
│   ├── transformers.ts         # API → componentes (transformExtrato, transformCPCR)
│   ├── planoContas.ts          # Categorias Omie → DRE (nivel1, nivel2, grupoDRE)
│   ├── caixaBuilder.ts         # Extrato → CaixaLevelData (Q/M/W drill-down)
│   ├── formatters.ts           # fmtBRL, fmtK, parseDMY
│   └── mocks/                  # Dados mock (fallback)
├── app/bi/financeiro/
│   ├── layout.tsx              # BI Shell (navbar, chat, auth guard)
│   ├── page.tsx                # Dashboard Executivo
│   ├── extrato/page.tsx        # Extrato bancário
│   ├── cp-cr/page.tsx          # Contas a Pagar/Receber
│   ├── fluxo/page.tsx          # Fluxo de Caixa
│   ├── caixa/page.tsx          # Caixa Realizado
│   └── conciliacao/page.tsx    # Conciliação
└── components/
    ├── nav/Navbar.tsx           # Navbar BI (tabs, refresh, filtros)
    ├── nav/DateRangePicker.tsx  # Seletor de período
    ├── caixa/                   # ChartGrid, DRESidebar, DetailPanel, DrillBar
    ├── ui/Badge.tsx             # Status badges (PAGO, PARCIAL, etc.)
    └── Sidebar.tsx              # Sidebar portal principal
```

### Backend (altmax-api)
```
app/
├── services/
│   └── omie_client.py          # Cliente async Omie (retry, rate limit)
├── routers/
│   ├── extrato.py              # /empresas/{id}/extrato + /saldos + cache flush
│   ├── cp_cr.py                # /empresas/{id}/cp, /cr + movimentos + resumo
│   ├── fluxo_caixa.py          # /empresas/{id}/fluxo-caixa
│   ├── conciliacao.py          # /empresas/{id}/conciliacao/*
│   └── auth.py                 # /auth/login, /auth/me
├── cache/
│   └── redis_client.py         # cache_get, cache_set, cache_invalidate
└── core/
    └── config.py               # CACHE_TTL_EXTRATO=600, CACHE_TTL_DIMS=3600
```

---

## 6. CONFIGURAÇÃO DE CACHE

| Namespace | TTL | Descrição |
|---|---|---|
| `extrato` | 600s (10min) | Lançamentos do extrato |
| `contas` | 3600s (1h) | Lista de contas correntes |
| `client_names` | 3600s (1h) | Mapa código→nome de clientes |
| `cp_{inicio}_{fim}` | 600s (10min) | Contas a pagar por período |
| `cr_{inicio}_{fim}` | 600s (10min) | Contas a receber por período |
| `movimentos_cp` | 600s (10min) | Movimentos CP (liquidação parcial) |
| `movimentos_cr` | 600s (10min) | Movimentos CR (liquidação parcial) |

**Flush manual**: `POST /empresas/{id}/cache/flush` (ou botão 🔄 na navbar)

---

## 7. PLANO DE CONTAS (planoContas.ts)

Mapeamento `codigo_categoria` → `{nome, nivel2, nivel1, grupoDRE, op}`

Grupos DRE:
- **RoB**: Receita Bruta (1.01.*)
- **TDCF**: Tributos, Deduções, Custos Financeiros (2.01.*, 2.02.*)
- **CV**: Custos Variáveis (2.03.*)
- **CF**: Custos Fixos (2.04.* até 2.13.*)
- **RNOP**: Receitas Não Operacionais (1.02.*)
- **DNOP**: Despesas Não Operacionais (2.14.*)

Fórmulas DRE:
```
Rec.Líq = RoB - TDCF
MC = Rec.Líq - CV
EBT1 = MC - CF
EBT2 = EBT1 + RNOP - DNOP
```

---

## 8. NOTAS IMPORTANTES

### Rate Limit Omie
- A Omie tem rate limit de ~0.2s entre chamadas
- Erro `REDUNDANT` = chamada duplicada, aguardar N segundos
- Tratado com retry + delay entre chamadas

### ListarExtrato vs ListarLancCC
- `ListarExtrato` (`financas/extrato/`): retorna favorecido, natureza, saldo — **USAR ESTE**
- `ListarLancCC` (`financas/contacorrentelancamentos/`): sem favorecido, formato diferente — **LEGADO**
- `ListarExtrato` **NÃO suporta paginação** — chamada única por conta
- `ListarExtrato` limite de ~90 dias por chamada — usar janelas

### Autenticação
- Token JWT em cookie `access_token`
- `/auth/me` retorna user + empresas + grupos + permissões
- BI layout e Portal layout compartilham o mesmo token

### Deploy
- Railway: auto-deploy do `main` do `altmax-api`
- Vercel: auto-deploy do `main` do `altmax-web`
- Ambos deployam automaticamente ao push no `main`
