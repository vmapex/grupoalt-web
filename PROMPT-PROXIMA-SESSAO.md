# Prompt de Contexto — Grupo ALT Portal Financeiro

## Quem sou eu
Sou o desenvolvedor do portal financeiro multi-tenant do Grupo ALT, integrado com a API Omie.

## Repositórios (org vmapex no GitHub)
- **vmapex/grupoalt-api** — Backend Python 3.12 / FastAPI / SQLAlchemy async / PostgreSQL / Redis (Railway: api.grupoalt.agr.br)
- **vmapex/grupoalt-web** — Frontend Next.js 14 / TypeScript / Tailwind / Zustand (Vercel: portal.grupoalt.agr.br)

## O que já está funcionando em produção
- Auth JWT com httpOnly cookies (login, refresh, /me)
- Setup wizard (/portal/setup) — onboarding de empresa com teste de credenciais Omie
- Dashboard (/portal/grupo) com dados reais: KPIs CP/CR, próximos vencimentos
- Extrato bancário — ListarExtrato Omie com janelas de 90 dias, saldos por conta
- Contas a Pagar/Receber — com liquidação parcial via ListarMovimentos
- Caixa realizado — DRE calculado do extrato por categorias
- Fluxo de caixa — projeção +7/30/60/90 dias
- Conciliação bancária — calendário heatmap, SLA D+1
- Admin — CRUD usuários/empresas/unidades, teste de credenciais, permissões por módulo
- Multi-tenant: credenciais Omie criptografadas com Fernet, schema PostgreSQL por empresa
- Cache Redis com TTLs por namespace, rate limiting, audit logging

## Arquitetura atual

```
Vercel (Next.js) → /api/proxy/* → Railway (FastAPI) → Omie API
                                        ↓
                                 PostgreSQL + Redis
```

- Auth: JWT em httpOnly cookies, interceptor 401 com refresh automático
- Frontend proxeia via Next.js rewrites, axios com baseURL '/api/proxy'
- Backend: cada empresa tem OmieCredencial (app_key + app_secret_enc Fernet)
- Schema isolado por empresa: emp_{slug} no PostgreSQL
- Páginas financeiras usam iframe com HTML/JS inline (pattern legado)
- Hooks React (useAPI.ts) existem mas NÃO são usados pelas páginas

## Mapeamento de melhorias — PRIORIZADO

### P0 — CRÍTICO (Segurança e Estabilidade)

1. **Sem testes automatizados** — Nenhum teste unitário ou de integração em ambos os repos
2. **Sem CI/CD pipeline** — Sem GitHub Actions, deploy direto na main sem lint/type-check
3. **python-jose deprecated** — Biblioteca JWT com vulnerabilidades conhecidas. Migrar para PyJWT
4. **SQL injection potencial em schema_manager.py** — f-string em CREATE SCHEMA. validate_slug sanitiza mas risco existe se bypassado
5. **Refresh token sem validação cruzada** — Aceita via body OU cookie, falta validação rigorosa
6. **Webhook sem limite de payload** — Aceita qualquer tamanho de JSON
7. **Health check incompleto** — /health não verifica DB/Redis, pode reportar OK com dependências caídas

### P1 — IMPORTANTE (Qualidade e UX)

8. **Páginas financeiras em iframe** — Extrato, caixa, cp, cr, fluxo, conciliação renderizam HTML em iframes com JS inline. Hooks React existem (useAPI.ts) mas não são usados. Migrar para componentes React nativos
9. **empresaStore com defaults hardcoded** — "Alt Max Transportes" e "Alt Max Logística" como defaults. Deveria iniciar vazio
10. **unidadeStore 100% mock** — PROJETOS_POR_EMPRESA hardcoded. Precisa conectar ao GET /projetos
11. **Admin page usa document.getElementById** — Campos de credenciais não usam React state
12. **Feedback com alert()** — Admin page usa alert() em vez de toasts/notificações inline
13. **Endpoint /indicadores é placeholder** — Retorna "em_desenvolvimento"
14. **Sem endpoint DELETE empresa** — Schema PostgreSQL fica órfão
15. **Falta index (empresa_id, data_lancamento)** — Full table scan em queries por período
16. **Pool de conexões não configurado** — pool_size e max_overflow não definidos
17. **Sem error boundaries nos gráficos** — Dados malformados crasham silenciosamente
18. **CORS pode aceitar origens inválidas** — Se CORS_ORIGINS malformado

### P2 — NICE-TO-HAVE (Evolução)

19. **Consolidar rotas /bi/ e /portal/** — Duas versões de algumas páginas existem
20. **Exportar PDF** — Spec existe no handoff, falta implementar
21. **Orbit chatbot (IA)** — Componentes existem (OrbitButton, ChatPanel), sem integração Claude API
22. **Notificações inteligentes** — Backend de notificações existe, falta engine de alertas automáticos
23. **Sync agendado** — APScheduler no requirements mas não configurado. Sync é manual ou webhook
24. **Tema light** — Portal só dark mode. ThemeStore existe mas não usado no portal
25. **Responsividade mobile** — Grid 4 colunas no dashboard quebra em mobile
26. **Acessibilidade (a11y)** — Sem aria-labels, sem roles semânticos
27. **Módulo Documentos** — Backend CRUD completo existe, frontend é placeholder
28. **Sem code splitting** — Charts (Recharts) carregam no bundle principal
29. **Sem API versioning** — Endpoints sem prefixo de versão

## Arquivos-chave

### Backend
- app/main.py — Lifespan, routers, middlewares, admin user startup
- app/routers/admin.py — CRUD empresas, credenciais, setup, teste de conexão
- app/routers/auth.py — Login, refresh, /me
- app/routers/extrato.py — Extrato bancário via Omie
- app/routers/cp_cr.py — CP/CR com liquidação parcial
- app/routers/dashboard.py — Dashboard agregado
- app/routers/fluxo_caixa.py — Projeção de fluxo
- app/routers/conciliacao.py — Conciliação bancária
- app/services/omie_client.py — Client HTTP async para API Omie
- app/services/schema_manager.py — Criação de schemas PostgreSQL
- app/core/deps.py — Dependencies (auth, empresa context, omie client)
- app/core/security.py — JWT, bcrypt, Fernet encrypt/decrypt
- app/core/config.py — Settings/env vars
- app/models/models.py — SQLAlchemy models (público)

### Frontend
- src/lib/api.ts — Axios com proxy + interceptor 401
- src/hooks/useAPI.ts — React hooks para endpoints (NÃO usados pelas páginas)
- src/store/authStore.ts — Auth + empresa ativa + permissões
- src/store/empresaStore.ts — Lista de empresas (tem defaults hardcoded)
- src/app/portal/layout.tsx — Auth guard + redirect setup
- src/app/portal/setup/page.tsx — Wizard de onboarding
- src/app/portal/grupo/page.tsx — Dashboard com dados reais
- src/app/portal/admin/page.tsx — Painel administrativo
- src/app/portal/financeiro/extrato/page.tsx — Extrato (iframe)
- src/app/portal/financeiro/cp/page.tsx — CP (iframe)
- src/app/portal/financeiro/cr/page.tsx — CR (iframe)
- src/app/portal/financeiro/caixa/page.tsx — Caixa (iframe)
- src/app/portal/financeiro/fluxo/page.tsx — Fluxo (iframe)
- src/app/portal/financeiro/conciliacao/page.tsx — Conciliação (iframe)
- next.config.js — Rewrites proxy + CSP + headers

## Limitações conhecidas
- **Omie API não expõe baixas individuais** — ListarMovimentos retorna consolidado
- **ListarExtrato não tem paginação** — Usa janelas de 90 dias como workaround
- **Rate limit Omie** — 5 req/s, erros REDUNDANT tratados com retry + backoff

## O que quero fazer agora
Quero um planejamento minucioso para executar as melhorias mapeadas acima (P0, P1, P2), considerando:
- Ordem de execução que maximize valor e minimize risco
- Dependências entre itens
- Estimativa de complexidade
- O que pode ser feito em paralelo
- Breakpoints naturais para deploy/validação
