# Prompt de Contexto — Grupo ALT Portal Financeiro (v2)

## Quem sou eu
Sou o desenvolvedor do portal financeiro multi-tenant do Grupo ALT, integrado com a API Omie.

## Repositórios (org vmapex no GitHub)
- **vmapex/grupoalt-api** — Backend Python 3.12 / FastAPI / SQLAlchemy async / PostgreSQL / Redis (Railway: api.grupoalt.agr.br)
- **vmapex/grupoalt-web** — Frontend Next.js 14 / TypeScript / Tailwind / Zustand (Vercel: portal.grupoalt.agr.br)

## O que já está funcionando em produção
- Auth JWT com httpOnly cookies (login, refresh cookie-only, /me)
- Setup wizard (/portal/setup) — onboarding de empresa com teste de credenciais Omie
- Dashboard (/portal/grupo) com dados reais: KPIs CP/CR, próximos vencimentos
- **Dashboard financeiro dedicado** (/bi/financeiro) com layout próprio + Navbar:
  - Extrato bancário — ListarExtrato Omie com janelas de 90 dias, saldos por conta
  - Contas a Pagar/Receber — com liquidação parcial via ListarMovimentos
  - Caixa realizado — DRE calculado do extrato por categorias
  - Fluxo de caixa — projeção +7/30/60/90 dias
  - Conciliação bancária — calendário heatmap, SLA D+1
- Admin — CRUD usuários/empresas/unidades, teste de credenciais, permissões por módulo
- Multi-tenant: credenciais Omie criptografadas com Fernet, schema PostgreSQL por empresa
- Cache Redis com TTLs por namespace, rate limiting, audit logging
- **CI/CD**: GitHub Actions em ambos os repos (lint, type-check, testes, build)
- **45 testes automatizados** no backend (security, schema_manager, orbit classifier)

## O que foi implementado recentemente (Fases 1-4)

### Fase 1 — Segurança (P0) ✅
- SQL injection fix em schema_manager.py (validação rígida de identificadores)
- python-jose → PyJWT 2.9.0
- Refresh token: cookie-only + jti
- Webhook payload limit 1MB
- Health check completo (DB + Redis, retorna 503 se degraded)
- CI/CD pipelines (GitHub Actions)
- 45 testes automatizados

### Fase 2 — Qualidade (P1) ✅
- DELETE /admin/empresas/{id} com confirmação
- Performance indexes (data_lancamento, data_vencimento)
- CORS validation
- Iframes → React (páginas /portal/financeiro/* usam componentes React)
- empresaStore sem defaults hardcoded
- unidadeStore conectado à API real
- alert() → toast no admin
- ChartErrorBoundary para gráficos

### Fase 3 — Consolidação ✅
- Code splitting (Recharts lazy-loaded com next/dynamic)
- API versioning: todos os routers sob /v1/ (webhooks e health na raiz)
- Tema light: toggle Sun/Moon no header do portal, CSS variables
- Responsividade mobile: grids adaptativos, sidebar oculta em mobile

### Fase 4 — Features ✅
- Documentos: CRUD completo com workflow (rascunho→revisão→aprovado→publicado)
- Sync agendado: APScheduler (60min sync, 30min alertas)
- Alertas financeiros: engine automática CP/CR (atrasado, vencimento próximo)
- NotificationBell: painel dropdown com notificações reais da API
- Exportar PDF: endpoints para extrato, CP, CR (xhtml2pdf + Jinja2 template)
- Orbit chatbot: roteamento Haiku/Sonnet por complexidade, limites de token por role

## Arquitetura atual (atualizada 09/04/2026)

```
Vercel (Next.js) → /api/proxy/v1/* → Railway (FastAPI /v1/*) → PostgreSQL (<100ms)
                                          ↓
                                   PostgreSQL + Redis
                                          ↑
                        Omie API → sync_service (60min) + webhooks (real-time)

Portal (/portal/*) → Layout com Sidebar + Header
BI Financeiro (/bi/financeiro/*) → Layout dedicado com Navbar própria
```

**MIGRAÇÃO EM ANDAMENTO: Omie API → PostgreSQL como fonte de dados**
- `/extrato`, `/contas`, `/saldos` — JÁ MIGRADOS para ler do PostgreSQL
- `/cp`, `/cr`, `/dashboard`, `/conciliacao`, `/fluxo-caixa` — PENDENTES (ainda chamam Omie diretamente)
- Sync: APScheduler a cada 60min + webhooks incrementais (CP/CR/Lancamentos)
- Dados sincronizados: LancamentoCC, ContaPagar, ContaReceber, ContaCorrente

- Auth: JWT em httpOnly cookies, interceptor 401 com refresh automático
- Frontend proxeia via Next.js rewrites, axios com baseURL '/api/proxy/v1'
- Backend: cada empresa tem OmieCredencial (app_key + app_secret_enc Fernet)
- Schema isolado por empresa: emp_{slug} no PostgreSQL
- Orbit: Haiku/Sonnet com contexto financeiro do DB (CP, CR, extrato, fluxo)
- Cache TTLs: extrato 1h, dashboard 30min, dimensões 2h

## Pendências e bugs identificados em produção

### BUGS RESOLVIDOS (auditoria 09/04/2026)

1. ~~**BI financeiro sem botão "Voltar ao Portal"**~~ — **RESOLVIDO.** Navbar.tsx tem Link para /portal/grupo com ArrowLeft + "Portal".
2. ~~**Orbit retornando respostas genéricas**~~ — **RESOLVIDO.** ChatPanel.tsx chama /orbit/chat real com tracking de tokens (Haiku/Sonnet).
3. ~~**Tema light incompleto no portal**~~ — **RESOLVIDO.** Todos os componentes (Sidebar, Portal layout, BI layout) usam useThemeStore com tokens dinâmicos. Sem classes hardcoded dark.
4. ~~**ExportPDFButton vs ExportModal**~~ — **Não há conflito.** ExportModal nunca foi implementado. Só ExportPDFButton existe, usado na Navbar do BI para extrato e CP/CR.
5. ~~**Notificações no /bi/financeiro**~~ — **RESOLVIDO.** NotificationBell usa n.link dinâmico vindo da API.

### BUGS RESOLVIDOS (sessão 09/04/2026)

1. ~~**ChatPanel PAGE_LABELS sem rotas BI**~~ — **RESOLVIDO.** Adicionadas rotas /bi/financeiro/* ao PAGE_LABELS.
2. ~~**Orbit erro 500 na segunda mensagem**~~ — **RESOLVIDO.** Causa: import inválido `_get_omie_client` em orbit_chat.py (não existia em deps.py). Removido.
3. ~~**Orbit sem dados do extrato**~~ — **RESOLVIDO.** orbit_chat.py agora busca EmpLancamentoCC do PostgreSQL (últimos 200 lançamentos) para contexto.
4. ~~**Análise IA era placeholder**~~ — **RESOLVIDO.** Agora abre Orbit automaticamente + mostra conteúdo da página.
5. ~~**Navbar BI não responsiva**~~ — **RESOLVIDO.** Tabs com scroll horizontal, logo oculto em mobile, controles adaptivos.

### MIGRAÇÃO DB — PENDÊNCIAS (Fase 5 em andamento)

1. **CP/CR ainda chama Omie API** — Migrar `cp_cr.py` para ler do PostgreSQL (pattern igual ao extrato). Schema e sync já preparados (status, valor_aberto, codigo_cliente_fornecedor).

2. **Dashboard ainda chama Omie API** — Migrar `dashboard.py` para queries SQL agregadas em CP + CR + lançamentos.

3. **Conciliação ainda chama Omie API** — Migrar `conciliacao.py` para ler de lancamentos_cc no DB.

4. **Fluxo de Caixa ainda chama Omie API** — Migrar `fluxo_caixa.py` para queries em CP + CR filtradas por status.

5. **Webhooks incrementais para LancamentoCC** — Adicionar handlers para `Financas.LancamentoCC.Incluido/Alterado` em webhook.py.

### MELHORIAS PENDENTES

6. **ExportPDFButton só em 2 páginas** — Falta em caixa, fluxo, conciliação. Depende de endpoints de export no backend.

7. **Portal /portal/financeiro/ sem navegação** — Sem tabs/navbar entre as páginas financeiras do portal.

8. **Indicadores endpoint placeholder** — /v1/grupos/{id}/indicadores retorna "em_desenvolvimento"

9. **Falta testes** — Backend: 45 unitários, zero integração. Frontend: zero cobertura.

## Arquivos-chave

### Backend
- app/main.py — Lifespan, routers (/v1/), middlewares, scheduler
- app/routers/auth.py — Login, refresh (cookie-only), /me
- app/routers/admin.py — CRUD empresas, credenciais, DELETE empresa
- app/routers/export.py — PDF export (extrato, CP, CR)
- app/routers/orbit.py — Chat endpoint com model routing
- app/routers/notificacoes.py — CRUD notificações + gerar-alertas
- app/services/orbit_chat.py — Classificador Haiku/Sonnet, token tracking
- app/services/alertas.py — Engine de alertas financeiros
- app/services/schema_manager.py — Schemas PostgreSQL (validação rígida)
- app/core/security.py — PyJWT, bcrypt, Fernet
- app/core/config.py — Settings (ANTHROPIC_API_KEY, SYNC_INTERVAL, etc.)

### Frontend
- src/lib/api.ts — Axios com baseURL '/api/proxy/v1' + interceptor 401
- src/store/empresaStore.ts — Lista de empresas (inicia vazio, syncFromAuth)
- src/store/unidadeStore.ts — Unidades via API real
- src/store/themeStore.ts — Dark/light tokens + toggle
- src/app/portal/layout.tsx — Auth guard, theme toggle, NotificationBell, ChatPanel
- src/app/bi/financeiro/layout.tsx — Layout dedicado BI com Navbar (botão voltar ao portal + tabs)
- src/components/chat/ChatPanel.tsx — Orbit conectado à API real
- src/components/nav/NotificationBell.tsx — Painel dropdown real
- src/components/ui/ExportPDFButton.tsx — Download PDF via API
- src/components/Sidebar.tsx — Navegação portal (Financeiro → /bi/financeiro)

## Env vars necessárias (Railway)
```
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
SECRET_KEY=...
FERNET_KEY=...
ANTHROPIC_API_KEY=sk-ant-...
ADMIN_EMAIL=admin@...
ADMIN_PASSWORD=...
CORS_ORIGINS=["https://portal.grupoalt.agr.br"]
SYNC_INTERVAL_MINUTES=60 (opcional)
ALERTAS_INTERVAL_MINUTES=30 (opcional)
```

## Limitações conhecidas
- **Omie API não expõe baixas individuais** — ListarMovimentos retorna consolidado
- **ListarExtrato não tem paginação** — Usa janelas de 90 dias como workaround
- **Rate limit Omie** — 5 req/s, erros REDUNDANT tratados com retry + backoff
- **Token tracking in-memory** — Orbit usa dict em memória. Com múltiplos workers, migrar para Redis.
