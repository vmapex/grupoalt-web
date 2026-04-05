# Grupo ALT — Portal Financeiro — Status e Pendencias

## Data: 05/04/2026

---

## 1. ARQUITETURA

### Repositorios
- **vmapex/grupoalt-web**: Next.js 14 + TypeScript + Tailwind + Zustand (Vercel)
- **vmapex/grupoalt-api**: FastAPI + PostgreSQL + Redis (Railway)

### URLs Producao
- Frontend: https://portal.grupoalt.agr.br (Vercel, auto-deploy da main)
- API: https://api.grupoalt.agr.br (Railway, auto-deploy da main)
- Proxy: `/api/proxy/*` → API Railway

### Admin
- Email: admin@grupoalt.agr.br
- Senha: definida via ADMIN_PASSWORD no Railway

---

## 2. O QUE FOI IMPLEMENTADO

### 2.1 Infraestrutura
- [x] Auth JWT com httpOnly cookies (access + refresh)
- [x] Interceptor 401 com token refresh automatico
- [x] Proxy Next.js rewrites → backend
- [x] Multi-tenant: empresa ativa no authStore
- [x] EmpresaStore dinamico (syncFromAuth chamado no portal layout)
- [x] DateRangeStore com persistencia localStorage
- [x] Cache Redis com TTLs (10min extrato/CP/CR, 1h dimensoes, 10min dashboard)
- [x] Rate limit Omie tratado (REDUNDANT → retry com delay)
- [x] Credenciais Omie criptografadas com Fernet (AES)
- [x] Audit logging em todas as operacoes admin
- [x] Rate limiting por usuario e IP
- [x] Schema PostgreSQL isolado por empresa (emp_{slug})
- [x] CSP headers configurados no Next.js
- [x] HTML entities decode nos nomes de favorecidos

### 2.2 Onboarding / Setup
- [x] Setup wizard em `/portal/setup` (3 passos: empresa + credenciais + confirmacao)
- [x] Teste de credenciais Omie em tempo real (POST /admin/credenciais/testar)
- [x] Endpoint all-in-one POST /admin/setup (grupo + empresa + credenciais + vinculo)
- [x] GET /admin/setup-status (estado do onboarding)
- [x] Redirect automatico para setup quando admin sem empresas
- [x] Admin page: botao "Testar Conexao" + indicador verde/ambar de credenciais

### 2.3 Dashboard (/portal/grupo)
- [x] Dados reais da Omie via GET /empresas/{id}/dashboard
- [x] KPIs: A Receber, A Pagar, Saldo Liquido, Atrasados CP
- [x] Cards CP e CR com totais aberto/a vencer/atrasado
- [x] Proximos vencimentos (top 10, ordenados por data)
- [x] Quick actions para paginas financeiras
- [x] Tratamento de erro quando credenciais nao configuradas

### 2.4 Extrato Bancario (/portal/financeiro/extrato) - 100%
- [x] Endpoint ListarExtrato da Omie (favorecido real, natureza R/D)
- [x] Janelas de 90 dias para periodos longos
- [x] Saldo por conta bancaria (sidebar)
- [x] Filtros: data, busca, conciliacao
- [x] KPIs: Saldo Inicial, Entradas, Saidas, Saldo Final, Lancamentos
- [x] Tabela sortable com 6 colunas
- [x] Top categorias dinamico

### 2.5 Caixa Realizado (/portal/financeiro/caixa) - 100%
- [x] DRE calculado do extrato via categorias (1.x = receita, 2.x = despesa)
- [x] 6 graficos de barras por mes (Receita, TDCF, CV, CF, RNOP, DNOP)
- [x] DRE sidebar com 13 indicadores e percentuais
- [x] Filtro de periodo conectado ao dateRangeStore

### 2.6 Contas a Pagar/Receber (/portal/financeiro/cp e cr) - 97%
- [x] Favorecido resolvido via ListarClientes + ConsultarCliente
- [x] Status: PAGO/RECEBIDO/A VENCER/ATRASADO/PARCIAL
- [x] Liquidacao parcial via ListarMovimentos
- [x] KPIs: Total, A Vencer, Atrasado, Prazo Medio, Saldo Liquido
- [x] Aging buckets (0-15d, 16-30d, 31-60d, 60+d)
- [x] Rankings por favorecido e categoria
- [x] Paginacao: 500 registros por pagina
- [ ] LIMITACAO OMIE: Baixas individuais nao disponiveis via API

### 2.7 Fluxo de Caixa (/portal/financeiro/fluxo) - 95%
- [x] KPIs: Saldo Atual, Entradas Prev., Saidas Prev., Saldo Projetado, Cobertura
- [x] Projecao mensal derivada de CP/CR aberto
- [x] Saldo projetado diario
- [x] Horizonte selecionavel (+7d, +30d, +60d, +90d)
- [x] Top entradas e saidas

### 2.8 Conciliacao (/portal/financeiro/conciliacao) - 80%
- [x] Endpoints backend funcionais (calendario, resumo, movimentacao, dia)
- [x] Calendario heatmap com 6 meses
- [x] KPIs de conciliacao
- [x] SLA D+1 util com feriados BR
- [ ] Validar comportamento com volume grande de dados

### 2.9 Admin (/portal/admin)
- [x] CRUD usuarios com toggle ativo/inativo
- [x] CRUD empresas com credenciais Omie inline
- [x] Vinculo usuario-empresa com roles (admin/gestor/viewer)
- [x] Matriz de permissoes por modulo (visualizar/editar/aprovar)
- [x] CRUD unidades por empresa
- [x] Botao "Testar Conexao" para credenciais Omie
- [x] Indicador visual de status de credenciais (verde/ambar)

### 2.10 Paginas em desenvolvimento
- [ ] `/portal/indicadores/*` — Placeholder
- [ ] `/portal/documentos/*` — Placeholder (backend de documentos existe)
- [ ] `/portal/grupo/estrutura` — Placeholder

---

## 3. PENDENCIAS E LIMITACOES

### 3.1 Limitacao API Omie — Baixas individuais
Investigado exaustivamente. A API Omie nao expoe pagamentos individuais de titulos parcialmente liquidados. ListarMovimentos retorna 1 registro consolidado. Solucao: exibir consolidado com desconto/juros/multa totais.

### 3.2 Paginas financeiras usam iframe pattern
Todas as paginas financeiras (extrato, caixa, cp, cr, fluxo, conciliacao) renderizam HTML em iframes com JavaScript inline. Funciona mas dificulta:
- Reuso de componentes React
- Type safety
- Debugging
- SEO (nao relevante para portal)

Hooks React (`useAPI.ts`) existem mas nao sao usados pelas paginas — poderiam substituir o pattern de iframe.

### 3.3 empresaStore defaults hardcoded
O `empresaStore.ts` tem defaults "Alt Max Transportes" e "Alt Max Logistica" que aparecem antes do syncFromAuth. Nao causa bug funcional mas pode confundir.

---

## 4. ENDPOINTS OMIE INTEGRADOS

| Endpoint Omie | Metodo | Uso |
|---|---|---|
| financas/extrato/ → ListarExtrato | listar_extrato() | Extrato bancario |
| financas/contacorrente/ → ListarContasCorrentes | listar_contas_correntes() | Lista de contas + teste de credenciais |
| financas/contapagar/ → ListarContasPagar | listar_contas_pagar() | CP |
| financas/contareceber/ → ListarContasReceber | listar_contas_receber() | CR |
| financas/mf/ → ListarMovimentos | listar_movimentos() | Liquidacao parcial |
| geral/clientes/ → ListarClientes | listar_clientes() | Nomes de favorecidos |
| geral/clientes/ → ConsultarCliente | consultar_cliente() | Lookup individual |
| financas/categorias/ → ListarCategorias | listar_categorias() | Plano de contas |
| geral/projetos/ → ListarProjetos | listar_projetos() | Projetos |

---

## 5. CACHE REDIS

| Namespace | TTL | Dados |
|---|---|---|
| extrato_{periodo} | 10 min | Lancamentos do extrato |
| contas | 1 hora | Lista de contas correntes |
| cp_{periodo} | 10 min | Contas a pagar |
| cr_{periodo} | 10 min | Contas a receber |
| dashboard_v2 | 10 min | KPIs agregados |
| movimentos_{tipo} | 10 min | Movimentos (liquidacao) |
| client_names | 1 hora | Nomes de clientes/fornecedores |
| concil_{periodo} | 10 min | Dados de conciliacao |
