# Auditoria — Handoff Production Ready

> **Documento de handoff técnico** para continuar a auditoria e plano de ação production-ready do Portal Financeiro Grupo ALT em uma nova sessão.
>
> **Criado em:** 2026-05-12
> **Revisado em:** 2026-05-12 (revisão estrutural — reclassificação P0/P1 crítico, divisão de fases, bloqueios absolutos)
> **Auditor anterior:** sessão Claude (Opus 4.7, 1M context)
> **Modo da sessão:** somente leitura — nenhum código de produção foi alterado.
> **Escopo:** repositórios `vmapex/grupoalt-web` (frontend Next.js) e `vmapex/grupoalt-api` (backend FastAPI).

---

## ⚠️ Avisos importantes para a próxima sessão

1. **Esta auditoria foi feita apenas por leitura estática.** Nenhum comando de runtime foi executado (sem `npm audit`, `pip-audit`, `pytest`, `EXPLAIN ANALYZE` reais). As validações empíricas estão pendentes em §4 e §7.
2. **O solicitante mencionou achados específicos** que **não foram confirmados** durante minha leitura do código (`fast-jwt`, `baseline.ts`, `adm123456`, `JWT_SECRET`). Estão documentados em §3 com a marca explícita **"precisa validação prévia"**. **Não trate como fato — investigue antes de agir.**
3. **Nomes de variáveis no código real:** `SECRET_KEY` (não `JWT_SECRET`), `FERNET_KEY`, `ADMIN_PASSWORD`. Veja [grupoalt-api/.env.example](../grupoalt-api/.env.example).
4. **Backend usa `PyJWT[crypto]==2.9.0` (Python).** Frontend não tem biblioteca JWT — apenas consome cookies httpOnly. **Não encontrei `fast-jwt`** em nenhum dos repos. Se a próxima sessão receber confirmação externa de que `fast-jwt` está em uso, refazer o levantamento.

---

## Leitura obrigatória antes de executar

> **Esta seção é um contrato operacional. A nova sessão DEVE ler e respeitar antes de qualquer outra ação.**

### O que este handoff não autoriza

- **Não autoriza alterações imediatas no código.** O documento é diagnóstico + plano. Toda execução exige Fase 0 prévia.
- **Não autoriza rodar migrations, seeds, scripts destrutivos** ou comandos que toquem produção (Railway, Vercel, banco real) sem confirmação humana explícita.
- **Não autoriza alteração em DRE, `planoContas.ts`, `caixaBuilder.ts`, `Math.abs`, motor de classificação contábil, regras de estorno, NEUTRO, parcelas ou qualquer função que produza número visível ao gestor.** Estas mudanças exigem **oracle financeiro aprovado** (Fase 2).
- **Não autoriza migration `Float → Numeric`, `String → Date`, soft delete, ou qualquer mudança estrutural de schema** antes de Alembic baseline + staging + backup + restore testado (Fase 3A → 3B).
- **Não autoriza alteração em autenticação, cookies, CORS, `WEBHOOK_TOKEN`, `SECRET_KEY` ou permissões** sem smoke test em preview/staging e validação manual em produção.
- **Não autoriza tratar `fast-jwt`, `baseline.ts`, `adm123456` ou `JWT_SECRET` como fatos deste projeto antes de validar.** No backend deste projeto: variável real de assinatura JWT é `SECRET_KEY`; a biblioteca é `PyJWT[crypto]`. Nenhum dos quatro itens foi encontrado por leitura estática.

### O que a nova sessão DEVE fazer antes de qualquer correção

1. Ler integralmente este handoff.
2. Criar `docs/AUDITORIA_EXECUCAO_PRODUCTION_READY.md` (registro vivo de execução com timestamp).
3. Executar **Fase 0** completa — validar premissas, investigar achados herdados não confirmados, capturar baseline, alinhar com stakeholder.
4. Só então executar **Fase 1A → 1B → 1C** com PRs pequenos atômicos.
5. Registrar **toda decisão, comando rodado, validação feita, arquivo alterado, e resultado** em `AUDITORIA_EXECUCAO_PRODUCTION_READY.md`.

### Regra de ouro

> Se houver dúvida sobre o impacto de uma mudança, **pare e pergunte ao usuário**. É melhor adiar uma sprint do que introduzir um incidente em produção.

---

## Achados herdados de outro contexto — não confirmados neste projeto

> **⚠️ Itens abaixo foram mencionados pelo solicitante mas NÃO foram encontrados na auditoria por leitura estática.** Podem ser confusão com outro projeto, alerta de scan externo, ou itens reais não detectáveis sem comandos runtime. **Não agir sobre eles antes de confirmar.**

| Item | Status atual na auditoria | Ação obrigatória na Fase 0 |
|---|---|---|
| **`fast-jwt`** vulnerável | Não encontrado na leitura estática. Backend usa **PyJWT 2.9.0** (Python); frontend não tem JWT lib. `package-lock.json` lido (615 pacotes), mas grep direto não foi executado | `npm ls fast-jwt`, `npm why fast-jwt`, `npm audit --json` no `grupoalt-web`. Se aparecer: identificar caminho, versão, severidade. Se não aparecer: marcar como **não-aplicável** |
| **`baseline.ts`** | Arquivo não encontrado em nenhum dos repos. O que existe é [grupoalt-web/docs/AUDIT_BASELINE_2026-04-29.md](AUDIT_BASELINE_2026-04-29.md) (markdown) | `find . -name "baseline.ts" -o -name "baseline.spec.ts"` + `git log --all -- "**/baseline.ts"` em ambos os repos. Se não existir: marcar como **não-aplicável** |
| **`adm123456`** versionado | Não confirmado. Backend tem `ADMIN_PASSWORD: testadmin123` em CI workflow (apenas credencial de CI, não prod) | `git log --all --oneline -S "adm123456"` + `grep -rn "adm123456" --include="*.ts" --include="*.tsx" --include="*.py" --include="*.md" .` em ambos os repos. Se não existir: **não-aplicável** |
| **`JWT_SECRET`** | Nome divergente. A variável real é **`SECRET_KEY`** (ver [grupoalt-api/app/core/config.py:21](../grupoalt-api/app/core/config.py#L21)) | Validar **`SECRET_KEY`** no painel Railway: existe? ≥ 64 chars? Não é placeholder `INSECURE_DEFAULTS`? Foi rotacionada nos últimos 12 meses? |
| **Senha real versionada** (genérico) | Não confirmada. Step 03 já auditou e registrou "nenhum segredo real" | Rodar `gitleaks detect --source . --no-banner` e `trufflehog filesystem .` em ambos os repos. Se encontrar: tratar como **incidente** (regra 5 da §10) |

### Reforço operacional

- **Não criar PRs de "remoção de fast-jwt" antes de `npm ls` confirmar caminho.**
- **Não criar PRs de "remoção de baseline.ts" antes de `find` confirmar existência.**
- **Caso algum item seja confirmado em runtime:** reclassificar conforme **impacto real** observado (não pela suspeita externa).
- **Caso não seja confirmado:** registrar em `AUDITORIA_EXECUCAO_PRODUCTION_READY.md` como "investigado, não aplicável neste projeto" e seguir.

---

## 1. Contexto geral do projeto

### 1.1 Tipo de aplicação

Portal financeiro multi-tenant interno do Grupo ALT que:
- Integra com a API da **Omie (ERP)** para sincronizar extrato, contas a pagar/receber, baixas, categorias, contas correntes.
- Oferece dashboards BI (Caixa Realizado / DRE, Extrato, CP-CR, Fluxo de Caixa, Conciliação).
- Tem um chat IA chamado **Orbit** integrado à API da Anthropic (Claude Haiku/Sonnet).
- Tem CRUD administrativo de empresas, usuários, credenciais Omie, permissões granulares.
- Tem upload e workflow de documentos institucionais.

### 1.2 Estrutura geral

**Dois repositórios independentes (não monorepo):**
```
GitHub/
├── grupoalt-web/   ← frontend Next.js 14, deploy Vercel → portal.grupoalt.agr.br
└── grupoalt-api/   ← backend FastAPI 0.115, deploy Railway → api.grupoalt.agr.br
```

### 1.3 Frontend (`grupoalt-web`)

- **Stack:** Next.js 14.2 (App Router, `output: 'standalone'`) + TypeScript 5 (strict) + Tailwind 3.4 + Zustand 4.5 + Axios 1.15 + Recharts 2.15 + lucide-react + react-hot-toast.
- **Estado:** 107 arquivos TS/TSX em `src/`, 50 rotas no build, **174 testes** Vitest passando.
- **Middleware CSP com nonce dinâmico** em [src/middleware.ts](../grupoalt-web/src/middleware.ts).
- **Duas experiências paralelas** com duplicação intencional (~3500 LOC duplicadas):
  - `/bi/financeiro/*` — experiência executiva.
  - `/portal/*` — experiência operacional.
- **Stores Zustand:** `authStore`, `empresaStore` (entrelaçadas via lazy import), `themeStore`, `dateRangeStore`, `unidadeStore`, `biViewStore`.
- **Hooks de fetch:** monolítico em [src/hooks/useAPI.ts](../grupoalt-web/src/hooks/useAPI.ts) (632 LOC, 30+ hooks).
- **Lógica de domínio (DRE)** vive no frontend: [src/lib/planoContas.ts](../grupoalt-web/src/lib/planoContas.ts) (367 LOC) + [src/lib/caixaBuilder.ts](../grupoalt-web/src/lib/caixaBuilder.ts) (394 LOC).

### 1.4 Backend/API (`grupoalt-api`)

- **Stack:** Python 3.12 + FastAPI 0.115 + Uvicorn + SQLAlchemy 2.0 async + asyncpg + Redis aioredis + **PyJWT[crypto]** + bcrypt + cryptography (Fernet) + httpx + tenacity + anthropic + APScheduler + xhtml2pdf.
- **Estado:** 40 arquivos `.py` em `app/`, 17 routers, **~106 endpoints distintos**, 8 arquivos pytest em `tests/`.
- **Prefixo de API:** `/v1` exceto `/webhooks/*`, `/health`, `/`, `/docs`, `/openapi.json`.
- **Arquivos críticos por tamanho:** `sync_service.py` (792), `admin.py` (665), `extrato.py` (603), `models.py` (595), `orbit.py` (551), `main.py` (544), `orbit_chat.py` (538).

### 1.5 Banco de dados

- **PostgreSQL 16** gerenciado pela Railway.
- **22 tabelas no schema `public`** ([app/models/models.py](../grupoalt-api/app/models/models.py)).
- **Schema per-empresa duplicado**: `emp_{slug}.*` definido em [app/models/empresa_models.py](../grupoalt-api/app/models/empresa_models.py) + [app/services/schema_manager.py](../grupoalt-api/app/services/schema_manager.py), **mas nenhum router consome**. Schemas existem fisicamente, vazios.
- **Migrations:** inline em [app/main.py:97-163](../grupoalt-api/app/main.py#L97-L163) (26 `ALTER TABLE IF NOT EXISTS` no boot). **Alembic declarado em `requirements.txt` mas sem pasta `alembic/`.**
- **Pool:** `pool_size=5, max_overflow=10` (15 conexões).
- **Cache:** Redis com chave `altmax:{empresa_id}:{namespace}:{suffix}`, TTLs diferenciados (dims 7200s, extrato 3600s, dashboard 1800s).

### 1.6 Deploy / Infra

| Ambiente | Frontend | Backend |
|---|---|---|
| Local | `npm run dev` (:3000) | `uvicorn --reload` (:8000) + docker-compose para Postgres/Redis |
| Preview | Vercel preview por PR (aponta para **prod**) | **não existe** |
| Staging | **não existe** | **não existe** |
| Produção | `portal.grupoalt.agr.br` (Vercel) | `api.grupoalt.agr.br` (Railway) |

**CI parcialmente bloqueante** em ambos, com lacunas relevantes:
- **Frontend** ([.github/workflows/ci.yml](../grupoalt-web/.github/workflows/ci.yml)): typecheck + lint + test + build + audit:bundle são bloqueantes; `npm audit --omit=dev --audit-level=high` está com **`continue-on-error: true`** (não bloqueia merge).
- **Backend** ([grupoalt-api/.github/workflows/ci.yml](../grupoalt-api/.github/workflows/ci.yml)): ruff é bloqueante; pytest é **condicional** (`if: hashFiles('tests/') != ''`) — pode pular silenciosamente.
- **Sem coverage mínimo** medido no CI.
- **Branch protection no GitHub** não confirmada (V-A1).
- **CODEOWNERS** não encontrado nos repos (V-A2).
- **Dependabot/Renovate** não confirmados (V-A4).

### 1.7 Convenções observadas

- **Linguagem:** mistura português/inglês. Código de domínio em português (`empresa_id`, `lançamento`, `categoria`); código de infra em inglês (`get_db`, `create_access_token`).
- **Commits:** Conventional Commits (`feat(...)`, `fix(...)`, `docs(...)`, `refactor(...)`, `style(...)`).
- **PRs:** branches `claude/*` (uso intensivo de Claude Code). Squash merge.
- **Documentação:** 17 Steps de plano de ação versionados em `docs/plano-acao-seguranca/` em ambos os repos.
- **Naming de variáveis env:** `SECRET_KEY` (JWT signing), `FERNET_KEY` (encryption de credenciais Omie), `ADMIN_PASSWORD`, `WEBHOOK_TOKEN`, `ANTHROPIC_API_KEY`, `DATABASE_URL`, `REDIS_URL`, `CORS_ORIGINS`.

> **Sobre o "GO técnico" do Step 17:** Existe um Step 17 documentando "GO técnico" em 2026-05-06, **mas esta auditoria considera que o projeto ainda não atingiu production-ready pleno**, pois permanecem P0s operacionais e P1 críticos que bloqueiam essa classificação (ver §3 e §4).

### 1.8 Estado geral da maturidade técnica

| Dimensão | Nível | Comentário |
|---|---|---|
| Estrutura de pastas | **Maduro** | hierarquia clara em ambos os repos |
| Segurança fundamental | **Maduro** | bcrypt, Fernet, JWT httpOnly, CSP nonce |
| Multi-tenant | **Médio** | via `empresa_id`; duplicação parcial não consumida |
| Migrations | **Baixo** | sem Alembic, ALTERs inline |
| Testes | **Médio** | ~250 testes; cobertura real desconhecida |
| Observabilidade | **Baixo** | logger básico; sem APM/Sentry |
| CI/CD | **Médio** | parcialmente bloqueante; sem coverage; sem staging |
| Documentação | **Maduro** | Steps 01-17 + READMEs |
| Onboarding | **Médio-baixo** | `.env.example` incompleto; sem seed |

---

## 2. Resumo executivo da auditoria

### 2.1 Estado atual

Aplicação **operacional em produção** com fundamentos de segurança e CI no lugar. Existe um relatório formal de "GO técnico" (Step 17), mas a auditoria considera que **production-ready pleno ainda não foi atingido**:

- **~5-6 achados P0** (incidentes imediatos confirmados ou condicionais à validação).
- **~12-15 achados P1 críticos** (bloqueio production-ready, exigem fases próprias).
- **~20 achados P1 altos** (importantes mas não bloqueio production-ready).
- **~40 achados P2** + ~25 P3.
- **3 ADRs pendentes** (decisões arquiteturais que bloqueiam refatoração).
- **~18 validações empíricas pendentes** (dependem de acesso ao painel Railway/Vercel/GitHub).

### 2.2 Por que ainda não está production-ready

Separação clara entre **incidentes imediatos** (atacar na Fase 1) e **bloqueios estruturais** (atacar em fases dedicadas com pré-requisitos).

#### P0 — Incidentes imediatos que devem ser atacados na Fase 1

> Comportamentos que **acontecem agora em produção** e podem gerar incidente. **Atacar imediatamente** após Fase 0.

1. **Admin é resetado no startup.** [app/main.py:56-94](../grupoalt-api/app/main.py#L56-L94) sobrescreve `senha_hash`, `ativo`, `is_admin` a cada deploy. Senha real do admin = valor da env var.
2. **Logging sem redaction ativado.** `setup_logging()` definido em [app/core/logging_config.py:48](../grupoalt-api/app/core/logging_config.py#L48) mas nunca chamado. `app_secret`, `Bearer ...`, CPF/CNPJ podem vazar em logs.
3. **Webhook sem token, se `WEBHOOK_TOKEN` vazio em prod.** [app/routers/webhook.py:128](../grupoalt-api/app/routers/webhook.py#L128) — validação é pulada se token vazio. **Condicional à validação V-01.**
4. **`SECRET_KEY` fraco/placeholder, se confirmado em prod.** Variável existe e é validada contra placeholders em `INSECURE_DEFAULTS` no startup, mas valor real precisa ser confirmado. **Condicional à validação no Railway.**
5. **Segredo real versionado, se confirmado por gitleaks/trufflehog.** Step 03 já auditou e não encontrou, mas runtime scan não foi rodado. **Condicional à investigação.**
6. **DELETE de empresa com cascade.** [app/routers/admin.py:224-270](../grupoalt-api/app/routers/admin.py#L224-L270) apaga todos os dados financeiros via cascade com confirmação trivial `{confirmar: true}`. **Considerar P0 se o stakeholder julgar risco imediato; senão P1 crítico até soft delete (Fase 3B).**

#### P1 crítico — Bloqueios production-ready

> **Itens que impedem production-ready pleno, mas NÃO devem ser corrigidos na Fase 1 sem pré-requisitos.** Especialmente: Alembic, Float/Numeric, datas e DRE dependem de staging, backup, oracle financeiro e validação do negócio. Atacar em fases dedicadas (2, 3A, 3B, 4).

1. **Alembic ausente / migrations inline.** 26 `ALTER TABLE` no boot; mudança destrutiva impossível. **Fase 3A.**
2. **Sync Omie síncrono no request HTTP.** Pode estourar timeout Railway (60s). **Fase 4 (depende de UI de loading + endpoint status).**
3. **Float em campos monetários.** Erros de ponto flutuante em DRE. **Fase 3B (depende de Alembic + oracle + backup).**
4. **Datas como `String(10)`.** Ordenação lexicográfica errada; sem índice efetivo. **Fase 3B.**
5. **DRE inteiro no frontend sem fonte única.** Bug Math.abs documentado em test. **Fase 4 (depende de oracle).**
6. **Oracle financeiro inexistente.** Pré-requisito de qualquer mudança em DRE/Float/datas. **Fase 2.**
7. **Sem ambiente staging.** Preview Vercel aponta para prod. **Fase 1C ou paralelo.**
8. **Sem observabilidade completa** (APM, Sentry, request_id, métricas). **Fase 1B (parcial) + Fase 5.**
9. **Índices ausentes em tabelas grandes.** Full scan em queries de período. **Fase 3A (parcial via `CONCURRENTLY`) + Fase 3B (definitivo via Alembic).**
10. **CI parcialmente bloqueante.** `npm audit` com `continue-on-error`; pytest condicional. **Fase 1A (corrigir pytest) + Fase 1C (corrigir audit).**
11. **Branch protection não validada.** Sem CODEOWNERS, sem template de PR confirmados. **Fase 1C (depende de V-A1/A2).**
12. **Schema drift `models.py` vs `empresa_models.py`.** Duas fontes de verdade do schema multi-tenant. **Fase 3A (decisão ADR-03).**
13. **ADRs pendentes** (DRE no back/front, sync sync/async, multi-tenant). **Fase 0.**

### 2.3 Principais pontos positivos

- JWT em cookies httpOnly + Secure + SameSite=Lax.
- bcrypt para senhas; Fernet para credenciais Omie (chaves separadas).
- CSP com nonce dinâmico por request (sem `unsafe-inline` em prod).
- Rate-limit duplo (global 60/min/IP + por endpoint sensível).
- Audit log estruturado (`LogAuditoria`, `OrbitAuditLog`).
- Política LGPD escrita ([orbit-policy.md](../grupoalt-api/docs/plano-acao-seguranca/orbit-policy.md)).
- ~250 testes automatizados.
- CI parcialmente bloqueante (typecheck/lint/test/build em ambos).
- Plano de ação documentado em 17 Steps com critério de pronto.
- Plano de exceções de `npm audit` documentado com dono e prazo.

### 2.4 Principais riscos (visão consolidada)

| Categoria | P0 (imediato) | P1 crítico (production-ready) |
|---|---|---|
| **Segurança** | Senha admin resetada; logs sem redação; webhook sem token (se vazio); SECRET_KEY (se fraco); segredo versionado (se confirmado) | Swagger público em prod; logout sem blacklist; refresh sem revogação; upload sem validação |
| **Dados** | Cascade DELETE empresa (se julgado imediato) | Float monetário; String em datas; sem Alembic; sem soft delete; schema drift |
| **Performance** | — | Sync síncrono no request; índices ausentes; KEYS pattern Redis; sem GZipMiddleware |
| **Manutenção** | — | DRE no frontend; duplicação BI vs portal; arquivos monolíticos; mocks em runtime |
| **Observabilidade** | — | Sem APM / Sentry / request_id; try/except Exception pass em 6 lugares |
| **Operacional** | — | Sem staging; branch protection não confirmada; sem dependabot; CI lacunoso |

### 2.5 Nível de risco atual

**Médio-alto.**

Justificativa: existem P0s explorando hoje (P0-1 senha admin, P0-2 logs sem redação) e P0s condicionais à validação (P0-3 webhook, P0-4 SECRET_KEY, P0-6 segredo versionado). A combinação cria fricção operacional e risco de degradação não detectada.

### 2.6 Nível de risco esperado após Fase 1

**Médio-baixo.**

Justificativa: a Fase 1 (A+B+C) resolve todos os P0s explorando hoje + adiciona observabilidade básica + remove os bloqueios operacionais imediatos. **Não chega a "baixo"** porque P1 críticos (DRE no front, Float monetário, sem Alembic, sem staging) só são resolvidos nas Fases 2-4.

---

## 3. Histórico do estudo realizado

### 3.1 Etapas analisadas

| # | Etapa | Foco principal |
|---|---|---|
| 1 | Mapeamento inicial | Estrutura, stack, configs, deps, CI básico |
| 2 | Onboarding técnico | README, `.env.example`, scripts, capacidade de subir local |
| 3 | Arquitetura | Camadas, acoplamento, regras de negócio, fluxo de dados |
| 4 | API e contratos | Endpoints, padrões REST, paginação, validação, autorização |
| 5 | Segurança | Auth, RBAC, sessão, JWT, CORS, CSRF, XSS, SQLi, upload, logs sensíveis |
| 6 | Banco de dados | Modelos, migrations, índices, integridade, concorrência, N+1 |
| 7 | Qualidade de código | Arquivos grandes, duplicação, complexidade, nomes, tipagem |
| 8 | Código morto / dependências | Imports não usados, endpoints órfãos, libs sem uso |
| 9 | Testes / erros / logs / observabilidade | Cobertura, tratamento global de erros, structured logging, monitoring |
| 10 | Performance | Bundle, queries, cache, payloads, code splitting, virtualization |
| 11 | Deploy / ambientes / CI/CD | Pipeline, rollback, branch protection, staging, migrations em prod |

### 3.2 Arquivos/pastas considerados

**Backend (`grupoalt-api/`):**
- Configuração: `Dockerfile`, `docker-compose.yml`, `railway.toml`, `requirements.txt`, `pytest.ini`, `.env.example`, `.env.railway`, `.gitignore`, `.dockerignore`, `.github/workflows/ci.yml`.
- Núcleo: `app/main.py`, `app/core/{config,database,security,deps,ratelimit,logging_config}.py`.
- Models: `app/models/models.py`, `app/models/empresa_models.py`.
- Routers (todos os 17): `auth, admin, gestao, permissoes, extrato, cp_cr, fluxo_caixa, conciliacao, dashboard, sync, webhook, orbit, grupo, notificacoes, documentos, indicadores, export`.
- Services: `omie_client, orbit_chat, sync_service, schema_manager, alertas, auditoria`.
- Cache: `app/cache/redis_client.py`.
- Tests: `tests/{conftest, test_security, test_rbac, test_orbit_audit, test_orbit_policy, test_orbit_router, test_schema_manager, test_integration}.py`.
- Docs: `README.md`, `CLAUDE.md`, `DEPLOY-PRODUCAO.md`, `GUIA_VALIDACAO_OMIE.md`, `PLANO-SEGURANCA-PORTAL-GRUPO-ALT.md`, `docs/plano-acao-seguranca/*` (Steps 01-17 + audit-exceptions.md + orbit-policy.md).

**Frontend (`grupoalt-web/`):**
- Configuração: `package.json`, `package-lock.json`, `next.config.js`, `tsconfig.json`, `tailwind.config.js`, `vitest.config.ts`, `vercel.json`, `.eslintrc.json`, `.env.example`, `.gitignore`, `.github/workflows/ci.yml`, `scripts/check-bundle-secrets.js`.
- Núcleo: `src/middleware.ts`, `src/lib/api.ts`.
- Páginas: `src/app/{layout, page, login/page}.tsx` + todos os 50 `page.tsx`/`_content.tsx`.
- Stores: `src/store/{authStore, empresaStore, themeStore, dateRangeStore, unidadeStore, biViewStore}.ts`.
- Libs: `src/lib/{api, types, formatters, planoContas, caixaBuilder, transformers, access, sla, mocks/*}.ts`.
- Hooks: `src/hooks/{useAPI, useCategoriasMap, useEmpresaId, useRequireAdmin}.ts`.
- Tests: `src/{components/chat/chatHelpers, hooks/useAPI, lib/{access, api, caixaBuilder, planoContas, transformers}, store/empresaStore}.test.ts`.
- Docs: `README.md`, `CLAUDE.md`, vários markdowns legados (BRIEFING_ALTMAX, CLAUDE_CONTEXT_V2, NEXT_SESSION_PROMPT, etc.), `docs/plano-acao-seguranca/*`, `docs/STEP_*`, `docs/AUDIT_BASELINE_2026-04-29.md`, `docs/STAGING_DEPLOY_SEGURO.md`.

### 3.3 Comandos executados durante a auditoria

| Comando | Resultado relevante |
|---|---|
| `git log --oneline -20 main` em ambos os repos | confirmou padrão de commits + sequência de Steps |
| `git log --all --oneline -S "ANTHROPIC_API_KEY=sk-ant"` | nenhum segredo real encontrado em histórico |
| `git log --all --oneline -S "SECRET_KEY="` | apenas commits de docs ou estrutura |
| `git log --all -- ".env" ".env.local" ".env.production"` | `.env.local` foi removido em Step 03; nunca houve `.env` versionado |
| `git branch -a` | 17 branches `claude/*` no front, ~15 no back |
| `git ls-files | grep -iE "(env|secret|key)"` | só `.env.example`, `.env.railway` (placeholder), docs |
| `find ... | wc -l` | 107 TS/TSX no front, 40 .py no back |
| `wc -l app/routers/*.py app/services/*.py` | confirmou arquivos grandes |
| `cat package.json | python -c ...` | listou deps + versão real do lockfile (next 14.2.35, react 18.3.1, axios 1.15.2) |

**Comandos NÃO executados (pendências de validação empírica):**
- `npm audit --json` (output completo)
- `npm ls fast-jwt` / `npm why fast-jwt`
- `pip-audit -r requirements.txt`
- `gitleaks detect` / `trufflehog filesystem`
- `npx depcheck`, `npx knip`, `npx ts-prune`
- `pytest -v --cov`
- `vitest --coverage`
- `EXPLAIN ANALYZE` no Postgres
- `redis-cli SLOWLOG GET`
- Acesso ao painel Railway / Vercel para validar env vars
- `curl` em endpoints de produção

### 3.4 Evidências encontradas (resumo de pontos com referência ao código)

| Evidência | Local |
|---|---|
| Senha admin sobrescrita em todo boot | [app/main.py:79,89](../grupoalt-api/app/main.py#L79) |
| `setup_logging()` nunca chamado | [app/core/logging_config.py:48](../grupoalt-api/app/core/logging_config.py#L48) vs [app/main.py:15](../grupoalt-api/app/main.py#L15) |
| Webhook token opcional | [app/routers/webhook.py:128](../grupoalt-api/app/routers/webhook.py#L128) |
| `OMIE_ALLOWED_IPS` declarado e ignorado | [app/routers/webhook.py:31-34](../grupoalt-api/app/routers/webhook.py#L31-L34) |
| 26 ALTER TABLE inline no startup | [app/main.py:97-163](../grupoalt-api/app/main.py#L97-L163) |
| Sync síncrono no request | [app/routers/dashboard.py:140-152](../grupoalt-api/app/routers/dashboard.py#L140), [extrato.py:71-80](../grupoalt-api/app/routers/extrato.py#L71-L80), [cp_cr.py:229-232](../grupoalt-api/app/routers/cp_cr.py#L229) |
| `_calcular_status` sem teste | [app/services/sync_service.py:27-65](../grupoalt-api/app/services/sync_service.py#L27-L65) |
| Float em valor monetário | [app/models/models.py](../grupoalt-api/app/models/models.py) — colunas `valor*` |
| String(10) em datas | [app/models/models.py:442-443](../grupoalt-api/app/models/models.py#L442-L443) |
| DRE no front com Math.abs | [src/lib/planoContas.ts:225](../grupoalt-web/src/lib/planoContas.ts#L225) + test `planoContas.test.ts:42` |
| `_parse_date` duplicado em 6 arquivos | back/`extrato.py`, `cp_cr.py`, `conciliacao.py`, `alertas.py`, `orbit_chat.py`, `dashboard.py` |
| `_get_client_ip` duplicado em 3 arquivos | back/`ratelimit.py`, `webhook.py`, `auditoria.py` |
| KEYS pattern bloqueante | [app/cache/redis_client.py:42-48](../grupoalt-api/app/cache/redis_client.py#L42-L48) |
| Sem GZipMiddleware | [app/main.py:340-346](../grupoalt-api/app/main.py#L340-L346) |
| Status remap PAGO→RECEBIDO | [app/routers/cp_cr.py:165](../grupoalt-api/app/routers/cp_cr.py#L165) |
| Cookies httpOnly OK | [app/routers/auth.py:24-48](../grupoalt-api/app/routers/auth.py#L24-L48) |
| CSP nonce dinâmico | [src/middleware.ts](../grupoalt-web/src/middleware.ts) |
| Tipos do front à mão (drift Step 13 #52) | [src/lib/types.ts](../grupoalt-web/src/lib/types.ts) |
| `tests/` no root do back tem 8 arquivos | confirmado via `ls -la` |

---

## 4. Pontos não validados (precisam de Fase 0)

| # | Item | Como validar | Bloqueia |
|---|---|---|---|
| V-01 | `WEBHOOK_TOKEN` configurado em prod? | Painel Railway → Variables | P0-3 |
| V-02 | `DEBUG=false` em prod? | idem | P1 alto |
| V-03 | `CORS_ORIGINS` real em prod? | idem | P1 alto |
| V-04 | `ACCESS_TOKEN_EXPIRE_MINUTES` real (30 ou 480)? | idem | P2 |
| V-05 | `/docs` e `/openapi.json` públicos em prod? | `curl -I https://api.grupoalt.agr.br/docs` | P1 alto |
| V-06 | `/health` em prod retorna SHA? | `curl https://api.grupoalt.agr.br/health` | P3 |
| V-07 | Logs Railway redatam senhas/segredos? | Painel Railway → logs | P0-2 |
| V-08 | Vercel/Railway capturam request body em logs? | Docs do provedor | P1 alto |
| V-09 | Endpoint `/debug/omie-raw` removido em prod? | `curl -I https://api.grupoalt.agr.br/debug/omie-raw` | P2 |
| V-10 | Cota Anthropic em limite hard? | Console Anthropic | P2 |
| V-11 | `/tmp/uploads/` sobrevive a deploy Railway? | Upload doc + redeploy | P1 alto |
| V-12 | `pytest tests/` no CI roda hoje? | Forçar PR e ver Actions | P1 crítico (CI) |
| V-13 | Cota Omie monitorada? | Painel Omie | P3 |
| V-A1 | Branch `main` protegida no GitHub? | GitHub → Settings → Branches | P1 crítico |
| V-A2 | CODEOWNERS existe? | GitHub Settings | P1 crítico |
| V-A3 | Vercel preview env aponta para? | Vercel → Project → Settings → Env | P1 crítico |
| V-A4 | Dependabot/Renovate ativos? | GitHub Settings → Security | P2 |
| V-A5 | **`SECRET_KEY` no Railway tem ≥ 64 chars e não é placeholder?** | Painel Railway → Variables | **P0 condicional** |

---

## 5. Achados críticos por prioridade

> **Definições:**
> - **P0 — Incidente imediato de segurança/operação.** Atacar na Fase 1 (após Fase 0 confirmar).
> - **P1 crítico — Bloqueio production-ready.** Atacar em fase dedicada com pré-requisitos.
> - **P1 alto** — Importante mas não bloqueia production-ready imediato.
> - **P2 / P3** — Médio / baixo.

### 5.1 P0 — Incidente imediato (5-6 itens)

#### P0-1 — Senha do admin é resetada em todo startup
- **Categoria:** Segurança / Autenticação
- **Local:** [grupoalt-api/app/main.py:56-94](../grupoalt-api/app/main.py#L56-L94) — função `criar_admin_inicial`
- **Evidência:** na branch `else` (usuário admin já existe), o código executa `user.ativo = True`, `user.is_admin = True`, e **`user.senha_hash = hash_password(admin_password)`** em todo boot.
- **Problema:** se o admin trocar a senha pela UI, qualquer redeploy/restart sobrescreve.
- **Impacto:** senha do admin = valor da env var. Impossível desativar o admin pelo painel.
- **Risco:** invalidação silenciosa de troca de senha; logout forçado após cada deploy.
- **Recomendação:** criar admin **apenas se não existir**; nunca atualizar `senha_hash`, `ativo`, `is_admin` em boots subsequentes. Reset via env exigir flag explícita (`ADMIN_PASSWORD_RESET=true`) + auditoria.
- **Esforço:** 15 min.
- **Dependências:** confirmar caminho de acesso de fallback antes (Railway → DB direto).
- **Status:** ❌ pendente
- **Precisa validação?** Não — comportamento óbvio no código.

#### P0-2 — Filtro de redação de senha/token nos logs nunca é ativado
- **Categoria:** Segurança / Observabilidade
- **Local:** [grupoalt-api/app/core/logging_config.py:48](../grupoalt-api/app/core/logging_config.py#L48) (`setup_logging` definida) vs [grupoalt-api/app/main.py:15](../grupoalt-api/app/main.py#L15) (`logging.basicConfig` direto).
- **Evidência:** Grep por `setup_logging` retorna só a definição e a docstring; nenhuma chamada real existe.
- **Problema:** `app_secret`, `Authorization`, `Bearer ...` em logs de exceção não são redatados.
- **Impacto:** vazamento de credenciais Omie e tokens JWT nos logs do Railway.
- **Risco:** alto.
- **Recomendação:** chamar `setup_logging()` no início do lifespan. Adicionar teste unitário.
- **Esforço:** 10 min + 30 min validação.
- **Dependências:** —
- **Status:** ❌ pendente
- **Precisa validação?** Sim (V-07) — confirmar amostra de logs.

#### P0-3 — Webhook Omie pode aceitar payload sem token em produção (condicional)
- **Categoria:** Segurança / Integrações
- **Local:** [grupoalt-api/app/routers/webhook.py:128](../grupoalt-api/app/routers/webhook.py#L128) — `if settings.WEBHOOK_TOKEN and token != settings.WEBHOOK_TOKEN:`
- **Evidência:** se `WEBHOOK_TOKEN == ""`, validação é pulada. `OMIE_ALLOWED_IPS` declarado em linhas 31-34 mas **nunca verificado**.
- **Problema:** atacante com qualquer `app_key` Omie pode enviar evento falso.
- **Impacto:** sync abusivo + payload malicioso processado em background.
- **Risco:** alto **se token vazio em prod**.
- **Recomendação:** validar `WEBHOOK_TOKEN` em `validate_critical_config()`; falhar startup se vazio em produção. Ativar checagem de IP (ou remover constante).
- **Esforço:** 20 min.
- **Dependências:** validação V-01 (confirmar estado atual no Railway); coordenar com Omie para garantir que o token configurado corresponde ao que a Omie envia.
- **Status:** ❌ pendente
- **Precisa validação?** **Sim** (V-01) — urgente. Conferir Railway.

#### P0-4 — `SECRET_KEY` fraco ou placeholder em produção (condicional)
- **Categoria:** Segurança / Auth
- **Local:** [grupoalt-api/app/core/config.py:21](../grupoalt-api/app/core/config.py#L21) (definição) + [grupoalt-api/app/main.py:19-24](../grupoalt-api/app/main.py#L19-L24) (`INSECURE_DEFAULTS`).
- **Evidência:** `validate_critical_config()` no startup bloqueia placeholders conhecidos (`"troque-esta-chave-em-producao"`, `"chave-padrao-dev-32-bytes-exato!!"`, `"SUBSTITUA_POR_UMA_CHAVE_FORTE_DE_64_CHARS"`), mas não há limite mínimo de comprimento configurado.
- **Problema:** se em produção o valor estiver curto ou for um placeholder não listado, JWT pode ser forjado.
- **Impacto:** total bypass de autenticação.
- **Risco:** alto **se confirmado**.
- **Recomendação:** verificar no Railway. Se fraco/placeholder: **gerar nova chave forte (≥ 64 chars), atualizar no Railway, restart**. Esta rotação invalida todos os tokens ativos — comunicar usuários antes.
- **Esforço:** 30 min se rotação for necessária + 1h de notificação a usuários.
- **Dependências:** validação V-A5 (acesso Railway).
- **Status:** ❌ pendente
- **Precisa validação?** **Sim** (V-A5) — urgente.

#### P0-5 — Segredo real versionado (condicional)
- **Categoria:** Segurança / Higiene
- **Local:** histórico Git completo (ambos os repos).
- **Evidência:** Step 03 já auditou e registrou "nenhum segredo real encontrado em arquivos versionados". `git log -S` por strings comuns (`SECRET_KEY=`, `ANTHROPIC_API_KEY=sk-ant`) não retornou nada. **Mas scan completo (gitleaks/trufflehog) não foi executado.**
- **Problema:** segredo histórico pode estar em commit antigo não capturado pela busca por strings.
- **Impacto:** vazamento de credencial; exige rotação imediata e tratamento como incidente.
- **Risco:** alto **se confirmado**.
- **Recomendação:** rodar `gitleaks detect --source . --no-banner` e `trufflehog filesystem .` em ambos os repos. Se encontrar: tratar como incidente (regra 5 da §10), rotacionar antes de qualquer outra ação.
- **Esforço:** 1h investigação + tempo variável para rotação.
- **Dependências:** —
- **Status:** ❌ pendente
- **Precisa validação?** **Sim** — investigação obrigatória na Fase 0.

#### P0-6 — `DELETE /admin/empresas/{id}` cascade (classificação depende do julgamento do stakeholder)
- **Categoria:** Banco / Segurança / Integridade
- **Local:** [grupoalt-api/app/routers/admin.py:224-270](../grupoalt-api/app/routers/admin.py#L224-L270)
- **Evidência:** confirmação trivial via `{confirmar: true}`. Cascade `Empresa → OmieCredencial → Lancamentos → CP → CR → Baixas`. Sem soft delete.
- **Problema:** um clique apaga tudo, irrecuperável.
- **Impacto:** catastrófico se mal-acionado.
- **Risco:** baixa probabilidade, alto impacto.
- **Classificação dupla:**
  - **P0** se o stakeholder julgar que o risco operacional imediato é inaceitável → mitigação imediata: desabilitar endpoint via feature flag ou exigir senha do admin **antes** de soft delete completo.
  - **P1 crítico** se o stakeholder aceitar o risco até a Fase 3B (soft delete via Alembic).
- **Recomendação imediata (P0):** adicionar confirmação por senha do admin + matching do nome da empresa **sem mexer no cascade ainda**. Manda a UI exigir digitação do nome. Bloqueia 99% dos acidentes.
- **Recomendação estrutural (P1 crítico):** soft delete via Alembic (Fase 3B).
- **Esforço imediato:** 2-4h. Estrutural: 1 dia.
- **Dependências:** Alembic (P1-crítico-1).
- **Status:** ❌ pendente
- **Precisa validação?** **Sim** — decisão do stakeholder sobre classificação.

### 5.2 P1 crítico — Bloqueio production-ready (~13 itens)

> **Estes itens NÃO devem ser corrigidos na Fase 1.** Atacar em fases dedicadas com pré-requisitos. Listagem em ordem sugerida de execução.

#### P1-crítico-1 — Migrations via `ALTER TABLE IF NOT EXISTS` inline (sem Alembic)
- **Categoria:** Banco / Plataforma
- **Local:** [grupoalt-api/app/main.py:97-163](../grupoalt-api/app/main.py#L97-L163)
- **Evidência:** 26 ALTER TABLE no boot. `alembic==1.13.3` em [requirements.txt:5](../grupoalt-api/requirements.txt#L5). Sem pasta `alembic/`, sem `versions/`. Comentário em [main.py:131-142](../grupoalt-api/app/main.py#L131-L142) admite que índices grandes não podem ser criados no startup por causa do healthcheck Railway (60s).
- **Problema:** schema drift incontrolado; sem rollback; sem revisão de mudanças. Alterações destrutivas **não são suportadas**.
- **Recomendação:** introduzir Alembic com baseline congelado (Fase 3A).
- **Esforço:** 1-2 dias.
- **Bloqueia:** P1-crítico-3 (soft delete), P1-crítico-4 (Float→Numeric), P1-crítico-5 (datas).
- **Pré-requisito:** staging + backup automatizado + restore testado.

#### P1-crítico-2 — Sync Omie síncrono dentro do request HTTP
- **Categoria:** Arquitetura / Performance
- **Local:** [dashboard.py:140-152](../grupoalt-api/app/routers/dashboard.py#L140-L152), [extrato.py:71-80](../grupoalt-api/app/routers/extrato.py#L71-L80), [cp_cr.py:229-232](../grupoalt-api/app/routers/cp_cr.py#L229-L232).
- **Evidência:** quando DB vazio, request dispara `sync_cp + sync_cr + sync_contas_correntes` em loop à Omie (~30s).
- **Problema:** bloqueia request; pode estourar timeout Railway (60s).
- **Recomendação:** substituir por scheduler imediato + endpoint `GET /sync/status` + UI "sincronizando...".
- **Esforço:** 2-3 dias.
- **Pré-requisito:** UI de loading no front + ADR-02 decidido (Fase 0).

#### P1-crítico-3 — `DELETE /admin/empresas/{id}` cascade (versão estrutural)
- Ver P0-6. Solução estrutural: soft delete via Alembic (Fase 3B).
- **Pré-requisito:** Alembic (P1-crítico-1).

#### P1-crítico-4 — Float em campos monetários
- **Categoria:** Banco / Integridade
- **Local:** [grupoalt-api/app/models/models.py](../grupoalt-api/app/models/models.py) — colunas `valor*` em `LancamentoCC`, `ContaPagar`, `ContaReceber`, `BaixaFinanceira`.
- **Evidência:** `Float` (DOUBLE PRECISION) em `valor`, `valor_pago`, `valor_aberto`, `valor_recebido`, `saldo_banco`, `desconto`, `juros`, `multa`.
- **Problema:** erros de ponto flutuante em agregação contábil.
- **Recomendação:** migrar para `Numeric(15,2)` (Fase 3B).
- **Esforço:** 2-3 dias.
- **Pré-requisito:** Alembic baseline + oracle financeiro + backup + restore testado.

#### P1-crítico-5 — Datas como `String(10)` "DD/MM/YYYY"
- **Categoria:** Banco / Integridade / Performance
- **Local:** [grupoalt-api/app/models/models.py:442-443](../grupoalt-api/app/models/models.py#L442-L443) e demais.
- **Evidência:** `String(10)` em `data_lancamento`, `data_vencimento`, `data_emissao`, `data_previsao`, `data_pagamento`, `data_conciliacao`.
- **Problema:** ordenação lexicográfica errada; sem índice efetivo; parsing em Python.
- **Recomendação:** migrar para `Date` com coluna paralela + backfill + dual-read (Fase 3B).
- **Esforço:** 3-5 dias.
- **Pré-requisito:** Alembic + saneamento de dados + staging + validação de dashboards.

#### P1-crítico-6 — DRE inteiro no frontend sem fonte única
- **Categoria:** Arquitetura
- **Local:** [src/lib/planoContas.ts](../grupoalt-web/src/lib/planoContas.ts) (367 LOC) + [caixaBuilder.ts](../grupoalt-web/src/lib/caixaBuilder.ts) (394 LOC).
- **Evidência:** regra contábil em TS; `Math.abs()` em toda agregação; bug com estornos documentado em `planoContas.test.ts:42-43`.
- **Recomendação:** mover para back após oracle financeiro (Fase 4).
- **Esforço:** 5-7 dias.
- **Pré-requisito:** ADR-01 + oracle financeiro (Fase 2) + Numeric (P1-crítico-4).

#### P1-crítico-7 — Oracle financeiro inexistente
- **Categoria:** Testes / Domínio
- **Evidência:** sem `tests/oracle/`; sem planilha-mãe; sem DRE consolidada validada por financeiro.
- **Problema:** qualquer mudança em DRE é cega.
- **Recomendação:** construir oracle como prioridade da Fase 2.
- **Esforço:** 5-10 dias.
- **Pré-requisito:** disponibilidade do financeiro do Grupo ALT; DRE fechada de 3-6 meses.

#### P1-crítico-8 — Sem ambiente staging
- **Categoria:** Deploy
- **Evidência:** Vercel preview aponta para API de produção. Documentado em Step 02 como pendência.
- **Problema:** qualquer PR pode mutar dados reais; teste destrutivo impossível.
- **Recomendação:** criar API staging na Railway + Vercel preview env separado (Fase 1C ou paralelo).
- **Esforço:** 1-2 dias de infra.

#### P1-crítico-9 — Sem observabilidade completa (APM, Sentry, request_id, métricas)
- **Categoria:** Observabilidade
- **Evidência:** nenhum `sentry-sdk` nas deps. Sem middleware `X-Request-ID`. `orbit_audit_log` gera `request_id` mas só persiste em DB.
- **Problema:** impossível diagnosticar incidente.
- **Recomendação:** Sentry (back + front) + `X-Request-ID` (Fase 1B parcial); APM/métricas Prometheus (Fase 5).
- **Esforço:** 1-2 dias (parcial); 5 dias (completo).

#### P1-crítico-10 — Índices ausentes em tabelas grandes
- **Categoria:** Banco / Performance
- **Local:** [models.py:457](../grupoalt-api/app/models/models.py#L457) — `lancamentos_cc` só tem `(empresa_id, omie_id) unique`. Idem `contas_pagar`, `contas_receber`.
- **Evidência:** comentário em [main.py:131-142](../grupoalt-api/app/main.py#L131-L142) admite que índices não são criados no startup.
- **Recomendação imediata (P0-ish):** `CREATE INDEX CONCURRENTLY` via psql manual para `(empresa_id, data_lancamento)`, `(empresa_id, status)`, `(empresa_id, data_vencimento)`. Mitigação rápida (Fase 1C).
- **Recomendação estrutural:** mover para migrations Alembic (Fase 3B).
- **Esforço:** 30 min de criação + monitorar.
- **Observação:** Datas `String(10)` limitam a efetividade do índice de data. Indexar antes de migrar `String → Date` mitiga parcialmente; depois disso pode ser necessário recriar índices.

#### P1-crítico-11 — CI parcialmente bloqueante
- **Categoria:** CI / Testes
- **Evidência:**
  - `npm audit` no front com `continue-on-error: true`.
  - `pytest tests/` no back com `if: hashFiles('tests/') != ''` (pode pular silenciosamente).
  - Sem coverage mínimo.
- **Recomendação Fase 1A:** remover condicional `hashFiles` do back.
- **Recomendação Fase 1C:** remover `continue-on-error` do `npm audit`; adicionar coverage (P2).
- **Esforço:** 1h (Fase 1A) + 4h (Fase 1C).

#### P1-crítico-12 — Schema drift `models.py` vs `empresa_models.py`
- **Categoria:** Banco / Manutenção
- **Evidência:** dois modelos coexistem; nenhum router consome `empresa_models.py`; DDL inline em `schema_manager.py` diverge dos modelos SQLAlchemy.
- **Recomendação:** decisão via ADR-03 (Fase 0). Implementação (Fase 3A): deletar lado não usado ou consumir.
- **Esforço:** 1 dia (decisão) + 2-5 dias (implementação).

#### P1-crítico-13 — Branch protection / CODEOWNERS / Dependabot não confirmados
- **Categoria:** Deploy / Processo
- **Evidência:** `CODEOWNERS` não detectado nos repos; `dependabot.yml` não detectado; branch protection só validável via GitHub Settings (V-A1).
- **Recomendação:** Fase 1C — configurar CODEOWNERS + template de PR + branch protection + Dependabot.
- **Esforço:** 2h.

### 5.3 P1 alto (~20 itens — não bloqueio production-ready imediato)

| # | Título | Categoria | Local |
|---|---|---|---|
| P1-3 | `decode_token` não valida claim `type=access` | Segurança | core/security.py:58-62 + deps.py:45-60 |
| P1-4 | Logout não invalida JWT server-side (sem blacklist) | Segurança | routers/auth.py:178-182 |
| P1-5 | Refresh rotation sem revogação do anterior | Segurança | routers/auth.py:171-175 |
| P1-6 | Upload de documentos sem validação | Segurança | routers/documentos.py:179-220 |
| P1-7 | Swagger `/docs`, `/openapi.json` provavelmente públicos | Segurança | main.py:334 — FastAPI default |
| P1-8 | Endpoints de trabalho pesado sem admin guard | Segurança | notificacoes.py:89, extrato.py:341, sync.py:26 |
| P1-9 | `KEYS pattern` bloqueante no Redis | Performance | cache/redis_client.py:42-48 |
| P1-10 | Sem GZipMiddleware | Performance | main.py:340-346 |
| P1-11 | `sync_baixas` DELETE all + INSERT all sem lock | Banco | services/sync_service.py:531-589 |
| P1-12 | `_filtrar()` Python sobre lista carregada do DB | Performance | cp_cr.py:91, dashboard.py:127, conciliacao.py:90 |
| P1-15 | 17 imports de routers envoltos em try/except | Arquitetura | main.py:401-503 |
| P1-16 | `get_db` faz commit automático | Banco | core/database.py:26-35 |
| P1-18 | Tabelas grandes sem virtualization | Performance | sem `react-virtual`/`react-virtuoso` instalado |
| P1-19 | Sem testes para `_calcular_status` | Testes | services/sync_service.py:27-65 |
| P1-20 | Sem testes para `sync_cp/cr/lancamentos` (idempotência) | Testes | services/sync_service.py |
| P1-21 | Sem testes para webhook handler | Testes | routers/webhook.py |
| P1-22 | `try/except Exception: pass` em 6+ lugares | Observabilidade | main.py + omie_client.py + conciliacao.py + sync_service.py |
| P1-23 | Logs free-form (sem JSON estruturado) | Observabilidade | core/logging_config.py + main.py:15 |
| P1-25 | Anthropic SDK sem timeout explícito | Performance | services/orbit_chat.py:509 |
| P1-26 | `jspdf` + `html2canvas` no bundle main | Performance | components/ui/ExportPDFButton.tsx |
| P1-27 | Imagens não otimizadas em `public/` (~628 KB) | Performance | `<img>` em login + Navbar + EmpresaDropdown |
| P1-28 | Tipos do front à mão (drift back↔front) | API/Manutenção | src/lib/types.ts |
| P1-29 | Sem `pip-audit` no CI do back | CI/Segurança | grupoalt-api/.github/workflows/ci.yml |

### 5.4 P2 — Médio (~40 itens)

> Lista resumida (referenciada nas etapas 3, 4, 6, 7, 9, 10, 11 do trabalho anterior). Inclui:

- Quebra de arquivos monolíticos (`sync_service.py`, `admin.py`, `extrato.py`, `useAPI.ts`).
- `app/schemas/` separado dos routers.
- Centralizar `_parse_date`, `_get_client_ip`, status enum.
- Renomear `lib/mocks/` → `lib/types/`.
- Unificar `bi/` ↔ `portal/` (~3500 LOC duplicadas).
- Webhook com Pydantic + IP allowlist.
- `auth/me` em 1 query.
- Cron de retenção em `logs_auditoria`, `notificacoes`, `webhook_logs`.
- Soft delete em Usuario / OmieCredencial.
- Status PAGO/RECEBIDO unificado.
- Verify-password com rate-limit dedicado.
- Account lockout após N tentativas.
- Conciliação agregada via SQL (com LIMIT).
- `useCPAll/useCRAll` agregado (não paginação por cliente).
- Testes E2E (Playwright).
- Coverage no CI.
- Onboarding completo (`.env.example`, seed, `.nvmrc`, CONTRIBUTING).
- Dockerfile multistage.
- CHANGELOG automatizado.
- Slack webhook para CI/deploy.
- Tags semver formais.
- Uptime monitor externo.
- Error Boundary React.
- `src/lib/log.ts` central.
- Geração de types do front via OpenAPI.

### 5.5 P3 — Baixo (~25 itens)

- `/health` expõe `deploy_sha`/`build_id`.
- Versão app divergente (1.0.0/2.0.0/3.0.0).
- Markdowns legados na raiz do `grupoalt-web`.
- Protótipos (`altmax-portal-v2.jsx`, HTMLs em `public/`).
- `app/scheduler/__init__.py` vazio.
- ESLint endurecer (`no-explicit-any`).
- Logs unicode (`✓`, `✗`).
- `cors_origins` rejeitar `"*"` explicitamente.
- TODO `dias_fora_sla` virar issue.
- `pyproject.toml`/Poetry no backend.
- Validar uso de `clsx`, `tailwind-merge`, `js-cookie` (suspeitos de não usados).
- Tracing distribuído OpenTelemetry.

---

## 6. Bloqueios absolutos antes de alterações financeiras e estruturais

> **Estas listas são pré-requisitos obrigatórios. Não iniciar a mudança correspondente sem TODOS os itens marcados.**

### 6.1 Antes de migrar `Float → Numeric` (P1-crítico-4)

- [ ] Alembic baseline criado e validado (Fase 3A concluída).
- [ ] Backup real do PostgreSQL Railway confirmado (snapshot manual + automatizado).
- [ ] Restore testado em ambiente separado (staging ou DB local de teste).
- [ ] Staging disponível para validar migration antes de prod.
- [ ] Oracle financeiro criado e aprovado pelo financeiro (Fase 2 concluída).
- [ ] Comparação antes/depois documentada (script que roda agregações antes e depois e compara).
- [ ] Plano de rollback documentado (estratégia: coluna paralela + dual-read + cutover + drop tardio).
- [ ] Janela de manutenção comunicada se for migration online.

### 6.2 Antes de alterar datas `String(10) → Date` (P1-crítico-5)

- [ ] Levantamento de formatos reais existentes no banco (DD/MM/YYYY puro? Tem datas malformadas? Tem strings vazias? `null`?).
- [ ] Script de saneamento validado (o que fazer com datas inválidas: NULL? data padrão? rejeitar?).
- [ ] Migration em staging com dataset realista.
- [ ] Teste de filtros por período (extrato, CP/CR, dashboard, conciliação) antes e depois.
- [ ] Validação com dashboards e relatórios (visual + numérica).
- [ ] Reescrita de queries em Python que fazem parse de string (6+ ocorrências de `_parse_date`).
- [ ] Reescrita do front (transformers, formatters) se shape mudar.

### 6.3 Antes de alterar DRE / `Math.abs` / plano de contas (P1-crítico-6)

- [ ] Planilha-mãe ou DRE oficial do financeiro recebida (Fase 2).
- [ ] Golden tests criados a partir da planilha-mãe (input lançamentos → output DRE esperado).
- [ ] Regra de estorno validada pelo financeiro (cenário `Math.abs(-200) vira +200` em RoB hoje: é correto ou bug?).
- [ ] Regra de NEUTRO validada (transferências internas).
- [ ] Regra de PARCIAL validada.
- [ ] Impacto nos números históricos comunicado a quem usa o portal (gestores).
- [ ] Aprovação formal do stakeholder com data e assinatura (mesmo que digital).
- [ ] Pré-requisitos das §6.1 e §6.2 também concluídos (porque Numeric e Date afetam os números).

### 6.4 Antes de qualquer mudança em autenticação / cookies / CORS

- [ ] Staging disponível.
- [ ] Smoke test do fluxo login → portal → empresa ativa → logout em staging.
- [ ] Plano de rollback (qual commit anterior, quanto tempo leva para restaurar).
- [ ] Comunicação a usuários ativos se for invalidar sessões (ex.: rotação de `SECRET_KEY`).

---

## 7. Dúvidas operacionais pendentes

> **Obrigatórias antes de iniciar Fase 1.**

### Dúvidas explícitas levantadas pelo solicitante

1. **Qual é o valor real do `JWT_SECRET` (chamado `SECRET_KEY` no código) no Railway?**
   - É forte (≥ 64 chars)?
   - É um dos placeholders bloqueados em `INSECURE_DEFAULTS`?
   - Foi rotacionado recentemente?
   - **Como descobrir:** abrir painel Railway → projeto API → Variables. Não copiar o valor para nenhum lugar versionado.

2. **Quem teve acesso ao GitHub desde o commit que introduziu `adm123456` em `baseline.ts`?** (Nota: não confirmamos que isso existe — investigação obrigatória primeiro.)
   - **Pré-requisito:** confirmar existência via `git log --all -S "adm123456"` + `find . -name "baseline.ts"`.
   - **Se existir:** rodar `git log --pretty="%h %ae %s" <arquivo>` para identificar commit e autor; rodar `gh api /repos/vmapex/grupoalt-web/collaborators` para listar quem teve acesso desde então.
   - **Se não existir:** marcar como N/A.

3. **Existe planilha-mãe do cliente para construir o oracle do motor de cálculo?**
   - Gestor financeiro do Grupo ALT pode fornecer uma DRE fechada de 3+ meses como referência?
   - Se sim, em qual formato (Excel, Google Sheets, PDF, screenshot)?
   - Quem tem autoridade para aprovar o oracle como "verdade contábil"?

### Dúvidas adicionais identificadas na auditoria

4. **`WEBHOOK_TOKEN` está configurado em produção?** (V-01) — se vazio, qualquer um pode enviar payload Omie falso.
5. **`DEBUG=false` em produção?** (V-02) — se true, stack traces vazam.
6. **`CORS_ORIGINS` real em produção?** (V-03) — confirmar que só inclui `https://portal.grupoalt.agr.br`.
7. **`ACCESS_TOKEN_EXPIRE_MINUTES` real?** (V-04) — README diz 480, código diz 30.
8. **Swagger `/docs` e `/openapi.json` acessíveis sem auth em prod?** (V-05) — exige `curl`.
9. **Endpoint `/debug/omie-raw` realmente removido?** (V-09) — commit `8a34c82` introduziu, mas não temos confirmação que sumiu de produção.
10. **Branch `main` protegida no GitHub?** (V-A1) — required reviewers + required CI checks.
11. **Vercel preview env aponta para prod ou staging?** (V-A3) — Step 02 registra que aponta para prod, mas precisa confirmar agora.
12. **Cota Anthropic configurada com hard limit?** (V-10).
13. **Logs do Railway redatam dados sensíveis?** (V-07) — depende de política do provedor + ativação local de `setup_logging`.
14. **Backup do PostgreSQL na Railway: RPO/RTO documentado?** Backup foi testado por restore?
15. **`/tmp/uploads/` sobrevive a deploy Railway?** (V-11) — se não, documentos enviados são perdidos.
16. **Existe ambiente staging (mesmo informal)?** (Step 02 registra ausência).
17. **Quem é DRI por área (frontend, backend, banco, integração Omie, IA)?** Não documentado nos repos.
18. **Acordo de uso pessoal do `claude/*` branches**: confirmado que Claude Code teve acesso de write aos repos no histórico.

---

## 8. Plano de ação recomendado

### Fase 0 — Preparação e handoff (estimado 1-2 dias)

**Objetivo:** validar premissas, capturar baseline, alinhar com stakeholders.

**Escopo:**
- Investigar itens "mencionados mas não confirmados" (`fast-jwt`, `baseline.ts`, `adm123456`, segredo versionado, SECRET_KEY).
- Coletar respostas das validações V-01 a V-A5.
- Escrever 3 ADRs (DRE no back/front, sync sync/async, multi-tenant).
- Capturar baseline de logs, métricas, performance (mesmo que sem APM).
- Criar `docs/AUDITORIA_EXECUCAO_PRODUCTION_READY.md` para registrar execução.

**O que fazer:**
1. `npm ls fast-jwt` + `npm audit --json` + `npm why fast-jwt` no `grupoalt-web`.
2. `gitleaks detect --source . --no-banner` e `trufflehog filesystem .` em ambos os repos.
3. `git log --all --oneline -S "adm123456"` e `find . -name "baseline.ts"`.
4. Abrir painel Railway e capturar (em local seguro/lastpass) os valores reais de `SECRET_KEY`, `WEBHOOK_TOKEN`, `CORS_ORIGINS`, `DEBUG`, `ACCESS_TOKEN_EXPIRE_MINUTES`.
5. `curl -I https://api.grupoalt.agr.br/docs` e `/openapi.json` e `/debug/omie-raw`.
6. Abrir GitHub → Settings → Branches → confirmar regras de proteção.
7. Pedir ao financeiro do Grupo ALT uma DRE fechada de 3+ meses como referência (para oracle da Fase 2).
8. Documentar tudo em `AUDITORIA_EXECUCAO_PRODUCTION_READY.md`.

**O que NÃO fazer:**
- Não tocar em código de produção ainda.
- Não rotacionar credenciais antes de saber o estado atual.
- Não decidir P0s sem ter as validações.

**Arquivos prováveis:**
- `docs/AUDITORIA_EXECUCAO_PRODUCTION_READY.md` (novo).
- `docs/adr/001-dre-localizacao.md` (novo).
- `docs/adr/002-sync-omie-async.md` (novo).
- `docs/adr/003-multi-tenant.md` (novo).

**Critério de aceite:**
- Todas as 18 dúvidas operacionais respondidas (mesmo que com "não-aplicável").
- 3 ADRs aprovados pelo solicitante.
- Arquivo de execução criado e populado.
- Achados herdados (fast-jwt, baseline.ts, adm123456) classificados como confirmados ou não-aplicáveis.

**Riscos:**
- Solicitante demora a responder dúvidas → Fase 1 fica bloqueada em itens dependentes.
- Encontrar segredo real vazado → escalar como incidente antes de seguir.

**Dependências:**
- Acesso ao Railway, Vercel, GitHub Settings.
- Disponibilidade do gestor financeiro (oracle).

---

### Fase 1A — Segurança imediata (estimado 1-2 dias)

**Objetivo:** atacar todos os P0 confirmados (incidentes imediatos).

**Escopo:**
- Corrigir admin resetado no startup (P0-1).
- Ativar `setup_logging()` com redaction (P0-2).
- Validar/exigir `WEBHOOK_TOKEN` em produção (P0-3, depende de V-01).
- Validar/rotacionar `SECRET_KEY` no Railway (P0-4, depende de V-A5).
- Tratar segredo versionado como incidente, **se** confirmado (P0-5).
- Corrigir CI do back que pode pular testes (P1-crítico-11 parcial).
- Confirmar se `/docs` e `/openapi.json` ficam públicos em produção (V-05); restringir Swagger se confirmado público (P1-7).

**O que NÃO fazer nesta fase:**
- Não tocar em `planoContas.ts`, `caixaBuilder.ts`, motor de DRE.
- Não migrar tipos de dados do banco (`Float`/`Numeric`, `String`/`Date`).
- Não introduzir Alembic ainda (Fase 3A).
- Não remover endpoints duplicados.
- Não unificar páginas BI vs Portal.
- Não mexer em upload de documentos (P1-6 vai para fase dedicada).
- Não fazer migrations estruturais de schema.
- Não alterar regras de classificação contábil.

**Arquivos prováveis:**
- `grupoalt-api/app/main.py` (corrigir `criar_admin_inicial`, ativar `setup_logging`, validar `WEBHOOK_TOKEN`).
- `grupoalt-api/.github/workflows/ci.yml` (remover condicional `hashFiles`).
- `grupoalt-api/tests/test_admin_init.py` (novo).
- `grupoalt-api/tests/test_logging.py` (novo).

**Critério de aceite:**
- Todos os P0 confirmados em §5.1 com status ✅.
- CI verde em ambos os repos.
- Admin consegue logar com senha não-default após restart.
- Logs não vazam `app_secret` em traceback de exceção (validar via injeção controlada).
- Webhook rejeita request sem token em ambiente prod (validar com curl).

**Riscos:**
- Mudança em `criar_admin_inicial` pode bloquear acesso se senha real divergir da env. **Mitigação:** ter outro caminho de acesso (root SQL via Railway) antes de aplicar.
- `setup_logging` pode causar perda de logs em transição. **Mitigação:** validar em ambiente local primeiro.
- `WEBHOOK_TOKEN` obrigatório quebra se Omie não estiver enviando — confirmar com Omie antes.

**Dependências:**
- Fase 0 concluída.
- Acesso ao painel Railway (para validar `SECRET_KEY` e configurar `WEBHOOK_TOKEN`).

---

### Fase 1B — Observabilidade mínima (estimado 2-3 dias)

**Objetivo:** ganhar visibilidade básica em produção.

**Escopo:**
- Adicionar middleware `X-Request-ID` (gera UUID por request, propaga em header de response e em logs via `LoggerAdapter`).
- Integrar Sentry SDK no backend (`sentry-sdk[fastapi]` + DSN em env).
- Integrar Sentry no frontend (`@sentry/nextjs` + tag por `empresa_id` e `user_id`).
- Garantir logs com contexto mínimo (`request_id`, `empresa_id` se disponível).
- Validar que logs não vazam tokens, senhas, `app_secret` ou Authorization (decorre de P0-2 estar ativo).

**O que NÃO fazer:**
- Não adicionar APM completo (Prometheus, Datadog) — vai para Fase 5.
- Não substituir logger padrão por structlog completo — vai para Fase 5.
- Não alterar logs do `orbit_audit_log` (já estruturado em DB).

**Arquivos prováveis:**
- `grupoalt-api/app/main.py` (Sentry init + middleware `X-Request-ID`).
- `grupoalt-api/requirements.txt` (adicionar `sentry-sdk[fastapi]`).
- `grupoalt-web/sentry.client.config.ts` (novo).
- `grupoalt-web/sentry.server.config.ts` (novo).
- `grupoalt-web/package.json` (adicionar `@sentry/nextjs`).

**Critério de aceite:**
- Sentry recebendo eventos de teste do back e front.
- Toda response HTTP tem header `X-Request-ID`.
- Toda mensagem de erro inclui `request_id`.
- Erros não-tratados em produção viram event no Sentry com tag de empresa/usuário.

**Riscos:**
- DSN exposta no front é normal (Sentry sabe lidar), mas validar configuração.
- Adicionar overhead pequeno por request (aceitável).

**Dependências:**
- Conta Sentry criada (ou alternativa: Glitchtip self-hosted, Rollbar, etc.).
- Fase 1A concluída (porque `setup_logging` precisa estar ativo antes para redaction funcionar).

---

### Fase 1C — Proteções operacionais e quick wins seguros (estimado 1-2 dias)

**Objetivo:** ganhos operacionais de baixo risco.

**Escopo:**
- Admin guard em endpoints pesados (P1-8: `/notificacoes/gerar-alertas`, `/cache/flush`, `/sync/empresas/{id}`).
- Timeout explícito no Anthropic SDK (P1-25).
- `GZipMiddleware` no FastAPI (P1-10).
- `pip-audit` no CI do back (P1-29).
- Validação de claim `type=access` em `decode_token` (P1-3).
- `.github/dependabot.yml` em ambos os repos.
- Configurar branch protection no GitHub (V-A1).
- Criar `.github/CODEOWNERS` (V-A2).
- Criar `.github/pull_request_template.md`.
- Substituir `try/except Exception: pass` por `logger.exception` (P1-22).
- Remover `continue-on-error` do `npm audit` se exceções estiverem documentadas.
- Healthcheck mais útil: split `/health/live` (process) + `/health/ready` (deps).

**O que NÃO fazer:**
- Não criar API staging ainda (vai para fase dedicada, ainda na Fase 1 mas em paralelo).
- Não mexer em DRE / motor de cálculo.
- Não migrar tipos de dados do banco.
- Não fazer Alembic ainda.

**Arquivos prováveis:**
- `grupoalt-api/app/routers/{notificacoes,extrato,sync}.py` (admin guard).
- `grupoalt-api/app/services/orbit_chat.py` (timeout=30).
- `grupoalt-api/app/main.py` (GZipMiddleware + healthcheck split).
- `grupoalt-api/.github/workflows/ci.yml` (pip-audit + remover hashFiles).
- `grupoalt-api/app/core/deps.py` (validar type=access).
- `.github/dependabot.yml` (em ambos).
- `.github/CODEOWNERS` (em ambos).
- `.github/pull_request_template.md` (em ambos).

**Critério de aceite:**
- Endpoints pesados retornam 403 para usuário comum.
- `npm audit` no front bloqueia merge para vuln high.
- Branch `main` exige reviewer + CI verde + status checks.
- CODEOWNERS define donos por área.
- 6 `try/except Exception: pass` substituídos por `logger.exception`.
- `pip-audit` rodando no CI back.

**Riscos:**
- Admin guard pode quebrar fluxos legítimos se algum usuário comum dependia. **Mitigação:** confirmar com stakeholders antes.
- `pip-audit` pode encontrar vuln pendente. **Mitigação:** documentar como `EXC-NNN` se for o caso.

**Dependências:**
- Fase 1A + 1B concluídas.

---

### Fase 2 — Oracle financeiro (estimado 5-10 dias)

**Objetivo:** construir verdade contábil testável **antes** de qualquer mudança em DRE, motor de cálculo, Float→Numeric, ou String→Date que afete números visíveis ao gestor.

> **Esta fase é pré-requisito absoluto** para alterações em:
> - `src/lib/planoContas.ts` e `src/lib/caixaBuilder.ts`.
> - Motor de DRE (R-C).
> - Classificação por categoria, override de grupo DRE.
> - Regra `Math.abs` em agregação.
> - Tratamento de estornos, NEUTRO, PARCIAL.
> - Migração `Float → Numeric` (porque qualquer mudança no tipo pode alterar agregados).
> - Migração `String(10) → Date` (porque ordenação correta pode mudar dashboards).

**Escopo:**
- Coletar dados reais de 3-6 meses (extrato, CP, CR, baixas) de uma empresa real ou fixture.
- Pedir ao financeiro/controladoria a DRE consolidada correspondente.
- Criar `tests/oracle/` com:
  - Fixtures JSON (input).
  - Resultados esperados (output validado pelo financeiro).
  - Suite parametrizada que compara `calcularDRE(input)` com expected.
- Documentar regras edge:
  - Como tratar estornos (hoje Math.abs duplica).
  - Como tratar transferências internas (categoria NEUTRO).
  - Como tratar parcelas (PARCIAL).
- Criar **golden DRE files** (snapshot) para evitar regressão silenciosa.

**O que NÃO fazer:**
- Não mudar a regra ainda. Capturar o que existe + o que deveria existir.
- Não publicar o oracle como API (Fase 4).

**Sem planilha-mãe:** O oracle pode ser construído capturando a saída atual do `calcularDRE` como baseline, mas isso é apenas **oracle de regressão** (protege contra mudança não intencional), **não é verdade contábil**. O bug Math.abs só pode ser corrigido com aprovação do financeiro contra valores reais.

**Arquivos prováveis:**
- `grupoalt-web/tests/oracle/` (nova pasta).
- `grupoalt-web/tests/oracle/fixtures/empresa-X-mes-Y.json`.
- `grupoalt-web/tests/oracle/expected/empresa-X-mes-Y.dre.json`.
- `grupoalt-web/src/lib/planoContas.test.ts` (expandir com fixtures reais).
- `grupoalt-web/docs/oracle-financeiro.md` (novo).

**Critério de aceite:**
- 20+ cenários reais cobertos.
- Cada cenário tem assinatura do gestor financeiro como "verdade".
- Bug Math.abs documentado: cenários onde resultado atual ≠ esperado.

**Riscos:**
- Financeiro pode não estar disponível ou não ter dados consolidados.
- Resultado atual pode estar tão divergente que financeiro recusa aprovar.

**Dependências:**
- Resposta da dúvida #3 (planilha-mãe).
- Disponibilidade do gestor financeiro.

---

### Fase 3A — Alembic baseline (estimado 2-3 dias)

**Objetivo:** introduzir Alembic sem alterar schema ainda.

**Escopo:**
- Criar estrutura `alembic/` no `grupoalt-api`.
- `alembic init alembic` + configuração de `alembic.ini` + `env.py` apontando para `app.core.database.Base.metadata`.
- Congelar schema atual como baseline: gerar migration vazia ou usar `--autogenerate` + revisar para garantir que não tenta criar tudo.
- Executar `alembic stamp head` em staging e prod (após confirmação) para marcar como atual.
- Remover gradualmente `ALTER TABLE` inline do startup do `main.py` (não remover de uma vez — fazer em fases).
- Garantir que migrations não rodem implicitamente no boot (deploy explícito).
- Adicionar migration de baseline congelado em `alembic/versions/0001_baseline.py` (vazia, marcada como `down_revision = None`).
- Adicionar passo no CI: `alembic upgrade head --sql` (dry-run) para validar que migrations são válidas.

**O que NÃO fazer:**
- Não criar migration alterando schema nesta fase. Só baseline.
- Não rodar `alembic upgrade head` em prod sem backup confirmado.
- Não remover ALTERs inline do `main.py` até ter certeza de paridade.

**Arquivos prováveis:**
- `grupoalt-api/alembic/` (nova pasta).
- `grupoalt-api/alembic/env.py`.
- `grupoalt-api/alembic.ini`.
- `grupoalt-api/alembic/versions/0001_baseline.py`.

**Critério de aceite:**
- Alembic ativo em ambos staging e prod.
- Schema sem mudança visível ao usuário.
- `alembic current` retorna `0001_baseline` em prod.
- CI valida que `alembic upgrade head` não tenta recriar tabelas (autogenerate em staging deve retornar "no changes detected").

**Riscos:**
- Schema real em prod pode divergir do que está nos models (drift acumulado dos 26 ALTERs). **Mitigação:** rodar `alembic revision --autogenerate -m "drift-check"` em staging com dump da prod; se gerar diff, investigar antes de continuar.

**Dependências:**
- Staging disponível (P1-crítico-8).
- Backup automatizado documentado.

---

### Fase 3B — Migrações seguras (estimado 7-15 dias)

**Objetivo:** corrigir os tipos de dados estruturais.

**Escopo (na ordem):**
1. **Índices ausentes em tabelas grandes** via Alembic com `CREATE INDEX CONCURRENTLY` (P1-crítico-10).
2. **Soft delete em `Empresa`, `Usuario`, `OmieCredencial`** (P0-6 estrutural).
3. **Float → Numeric(15,2)** (P1-crítico-4) — coluna paralela + backfill + dual-read + cutover.
4. **String(10) → Date** (P1-crítico-5) — mesma estratégia.
5. **`updated_by_id`** em tabelas críticas (P2).
6. **Cron de retenção** em `logs_auditoria`, `notificacoes`, `webhook_logs` (P2).
7. **ENUM Postgres** para status CP/CR (P2).

**O que NÃO fazer:**
- Não fazer migration destrutiva sem backup.
- Não migrar tudo em um único PR.
- Não pular cutover (manter coluna paralela por pelo menos 1 sprint para rollback).
- Não migrar Float→Numeric ou String→Date sem oracle (Fase 2) e sem staging (P1-crítico-8).

**Arquivos prováveis:**
- `grupoalt-api/alembic/versions/0002_add_indexes.py`.
- `grupoalt-api/alembic/versions/0003_add_soft_delete.py`.
- `grupoalt-api/alembic/versions/0004_add_valor_numeric.py`.
- `grupoalt-api/alembic/versions/0005_drop_valor_float.py`.
- `grupoalt-api/alembic/versions/0006_add_data_date.py`.
- `grupoalt-api/alembic/versions/0007_drop_data_string.py`.
- `grupoalt-api/app/models/models.py` (atualizar tipos progressivamente).

**Critério de aceite:**
- Cada migration tem teste de paridade antes/depois.
- Oracle (Fase 2) continua passando após cada migration.
- Sem regressão em dashboards/relatórios.
- Rollback testado em staging.

**Riscos:**
- Migration pode falhar em valores legados com `NaN`/`Infinity` (Float) ou string malformada (datas).
- Backup pré-migration **obrigatório**.
- Janela de manutenção possivelmente necessária.

**Dependências:**
- Fase 3A concluída.
- Fase 2 (oracle).
- Staging.
- Backup automatizado.

---

### Fase 4 — Fonte única do motor de cálculo (estimado 7-10 dias)

**Objetivo:** mover regra de DRE do frontend para o backend; eliminar duplicação `bi/` vs `portal/`.

**Escopo:**
- Endpoint `GET /v1/empresas/{id}/dre?dt_inicio&dt_fim&projeto_ids&granularity` no back.
- `app/domain/dre.py` com regra única (substitui `planoContas.calcularDRE`).
- Endpoint consome `categorias_omie.grupo_dre_override` + `CATEGORIAS` (migrado de TS) com cache Redis.
- Front consome endpoint pronto; remove `calcularDRE` do bundle.
- Aplicar oracle (Fase 2) como teste do endpoint.
- Refatorar agregadores trimestral/mensal/semanal para SQL (em vez de Python).
- Trocar `Math.abs()` por respeito ao sinal — **se** oracle aprovar.
- Eliminar sync síncrono no request (P1-crítico-2): adicionar UI de loading + `GET /sync/status`.

**O que NÃO fazer:**
- Não remover `planoContas.calcularDRE` antes que todas as páginas BI consumam o novo endpoint.
- Não fazer mudança visível ao gestor sem validação financeira.

**Arquivos prováveis:**
- `grupoalt-api/app/api/v1/financeiro/dre.py` (novo).
- `grupoalt-api/app/domain/financeiro/dre.py` (novo).
- `grupoalt-api/app/domain/financeiro/status.py` (novo, vindo de `_calcular_status`).
- `grupoalt-web/src/features/financeiro/hooks/useDRE.ts` (novo).

**Critério de aceite:**
- Endpoint `/v1/empresas/{id}/dre` retorna mesmo resultado que oracle.
- Páginas BI consomem endpoint; `planoContas.calcularDRE` removido.
- Bug Math.abs corrigido (estornos respeitam sinal).
- Performance igual ou melhor (cache Redis).

**Riscos:**
- Mudança silenciosa de número visível ao gestor → comunicar com antecedência.
- Quebra em fluxo de export PDF se shape mudar.

**Dependências:**
- Fase 2 (oracle).
- Fase 3A + 3B (Numeric e Date para evitar erro de soma e ordenação).

---

### Fase 5 — Validação final e production-ready (estimado 3-5 dias)

**Objetivo:** fechar checklist Triple A; declarar production-ready com auditoria externa.

**Escopo:**
- Resolver todos os P1 alto restantes.
- Coverage ≥ 70% nos arquivos críticos.
- Smoke E2E Playwright em CI.
- Runbook de rollback documentado.
- DRI por área documentado.
- Reauditoria de segurança (interna ou externa).
- Restore de backup testado.
- APM completo (Sentry Performance ou Datadog).
- Uptime monitor externo.

**Critério de aceite:**
- Triple A checklist do relatório técnico final ≥ 80% completo.
- Sem P0 pendente.
- ≤ 5 P1 pendentes documentados como exceção com prazo.
- Documento `PRODUCTION_READY.md` assinado pelo time.

---

## 9. Checklist da Fase 1

### Bloco A — Validações obrigatórias (Fase 0 pré-Fase-1)

> Sem essas respostas, a Fase 1 pode ser executada em direção errada.

- [ ] **A.1** `npm ls fast-jwt` no `grupoalt-web`. Se aparecer, identificar caminho. Se não, marcar como **não-aplicável**.
- [ ] **A.2** `find . -name "baseline.ts" -o -name "baseline.spec.ts"` em ambos os repos. Se não encontrar, marcar como **não-aplicável**.
- [ ] **A.3** `git log --all --oneline -S "adm123456"` + `grep -rn "adm123456" .` em ambos os repos. Se nada, marcar como **não-aplicável**.
- [ ] **A.4** `gitleaks detect --source grupoalt-web --no-banner` e idem para `grupoalt-api`. Salvar relatório em `docs/audit/gitleaks-YYYY-MM-DD.txt`.
- [ ] **A.5** `npm audit --json --omit=dev` no `grupoalt-web`. Salvar em `docs/audit/npm-audit-YYYY-MM-DD.json`.
- [ ] **A.6** Painel Railway: `SECRET_KEY` é forte (≥ 64 chars, não placeholder)? Capturar resposta em `docs/audit/validations-YYYY-MM-DD.md` **sem expor o valor**.
- [ ] **A.7** Painel Railway: `WEBHOOK_TOKEN` configurado (não vazio)? Resposta documentada.
- [ ] **A.8** Painel Railway: `DEBUG=false` em prod? Resposta documentada.
- [ ] **A.9** Painel Railway: `CORS_ORIGINS` real em prod (lista, sem `"*"`)? Resposta documentada.
- [ ] **A.10** `curl -I https://api.grupoalt.agr.br/docs` e `/openapi.json`. Documentar HTTP status.
- [ ] **A.11** GitHub Settings: branch `main` protegida? Required reviewers + status checks? Resposta documentada.
- [ ] **A.12** Vercel: env do preview aponta para qual API? Documentar.
- [ ] **A.13** Se algum segredo real for encontrado em A.4: **PARAR**. Criar `docs/incidents/YYYY-MM-DD-secret-leak.md`. Rotacionar o segredo. Notificar stakeholder.

### Bloco B — Correções P0 confirmadas (Fase 1A)

> Cada item vira um PR atômico, ≤ 200 linhas, com teste.

- [ ] **B.1** PR: corrigir `criar_admin_inicial` ([main.py:56-94](../grupoalt-api/app/main.py#L56-L94)) para não resetar `senha_hash`/`ativo`/`is_admin` quando usuário existe. Adicionar `tests/test_admin_init.py`.
- [ ] **B.2** PR: ativar `setup_logging()` no início do `lifespan` ([main.py](../grupoalt-api/app/main.py)). Adicionar `tests/test_logging.py` validando redação.
- [ ] **B.3** PR: se A.7 = vazio em prod, **antes** do PR aplicar: gerar token forte ≥ 32 chars + configurar no Railway. PR: validar `WEBHOOK_TOKEN` em `validate_critical_config()`; falhar startup se vazio em prod. Coordenar com Omie.
- [ ] **B.4** PR: se A.6 = fraco/placeholder, **antes** do PR: gerar `SECRET_KEY` forte + configurar no Railway + comunicar usuários (rotação invalida sessões). Documentar rotação em `docs/incidents/...`.
- [ ] **B.5** PR: remover `if: hashFiles('tests/') != ''` do CI back ([.github/workflows/ci.yml:69-70](../grupoalt-api/.github/workflows/ci.yml#L69-L70)). Deixar `pytest` falhar se faltar arquivo.
- [ ] **B.6** PR: condicional para esconder `/docs` e `/openapi.json` em produção (se A.10 = público): `app = FastAPI(docs_url=None if env=="production" else "/docs", ...)`.
- [ ] **B.7** Se A.13 confirmou segredo real: completar rotação antes de qualquer outra ação.

### Bloco C — Observabilidade (Fase 1B)

- [ ] **C.1** PR: middleware `X-Request-ID` no FastAPI: gera UUID, propaga em header de response e em logs via `LoggerAdapter`.
- [ ] **C.2** PR: integrar Sentry SDK no back: `pip install sentry-sdk[fastapi]`; init em `main.py`; DSN em env var Railway.
- [ ] **C.3** PR: integrar Sentry no front: `@sentry/nextjs`; tag por `empresa_id` e `user_id`; configurar source maps.
- [ ] **C.4** Validar manualmente: forçar erro em staging/preview → confirmar evento no Sentry com `request_id` correlacionado.
- [ ] **C.5** Validar manualmente: tentar injetar `app_secret=XXX` em log → confirmar redação no Sentry/logs Railway.

### Bloco D — Quick wins seguros (Fase 1C)

- [ ] **D.1** PR: admin guard em `/notificacoes/gerar-alertas`, `/cache/flush`, `/sync/empresas/{id}` (P1-8).
- [ ] **D.2** PR: `anthropic.AsyncAnthropic(api_key=..., timeout=30)` (P1-25).
- [ ] **D.3** PR: `app.add_middleware(GZipMiddleware, minimum_size=1000)` (P1-10).
- [ ] **D.4** PR: validar `payload.get("type") == "access"` em `get_current_user` (P1-3).
- [ ] **D.5** PR: substituir 6 `try/except Exception: pass` por `logger.exception` + decisão explícita (P1-22).
- [ ] **D.6** PR: `pip-audit -r requirements.txt --strict` no CI back. Documentar como `EXC-NNN` se encontrar vuln pendente.
- [ ] **D.7** PR: remover `continue-on-error: true` do `npm audit` no CI front (se exceções estiverem documentadas).
- [ ] **D.8** PR: adicionar `.github/dependabot.yml` em ambos os repos.
- [ ] **D.9** PR: adicionar `.github/CODEOWNERS` definindo donos por área.
- [ ] **D.10** PR: adicionar `.github/pull_request_template.md` com checklist do Step 02.
- [ ] **D.11** GitHub Settings UI (não em PR): configurar branch protection — required reviewers ≥ 1, required status checks, sem force-push, sem delete.
- [ ] **D.12** PR: split healthcheck em `/health/live` (process) + `/health/ready` (deps).

### Bloco E — Validação final da Fase 1

- [ ] **E.1** `npm run lint` no `grupoalt-web` — CI verde.
- [ ] **E.2** `npm run typecheck` no `grupoalt-web` — CI verde.
- [ ] **E.3** `npm test` no `grupoalt-web` — 174+ testes passando.
- [ ] **E.4** `npm run build` no `grupoalt-web` — sem erro.
- [ ] **E.5** `ruff check app/` no `grupoalt-api` — sem erro.
- [ ] **E.6** `pytest tests/ -v` no `grupoalt-api` — todos passando (sem condicional `hashFiles`).
- [ ] **E.7** Deploy em staging (se já existir) → smoke test → deploy prod.
- [ ] **E.8** Confirmar no Sentry que eventos chegam de prod.
- [ ] **E.9** Confirmar que admin consegue logar com senha não-default após restart.
- [ ] **E.10** Webhook rejeita request sem token (curl em prod).
- [ ] **E.11** Registrar pendências (Fases 2-5) em `docs/AUDITORIA_EXECUCAO_PRODUCTION_READY.md`.

---

## 10. Regras de segurança para a próxima sessão

> **Estas regras são inegociáveis. Violar qualquer uma pode causar incidente financeiro, perda de dados ou vazamento de credenciais.**

1. **Não alterar lógica financeira sem oracle.**
   Toda mudança em `planoContas.ts`, `caixaBuilder.ts`, `_calcular_status`, ou qualquer função que produza número visível ao gestor exige oracle (Fase 2) aprovado pelo financeiro **antes**.

2. **Não alterar motor de cálculo sem mapear entradas, saídas e fórmulas.**
   Antes de tocar em `calcularDRE`, `calcularNeutros`, `buildQuarterly/Monthly/Weekly`, documentar em `docs/motor-calculo.md`:
   - Quais campos do extrato/CP/CR são entrada.
   - Quais grupos/subtotais são saída.
   - Fórmula matemática de cada subtotal.
   - Edge cases (estornos, parciais, neutros).

3. **Não remover código sem validar uso dinâmico.**
   Antes de remover qualquer arquivo/função suspeita de morta:
   - Rodar `npx depcheck`, `npx knip` (front) e `deptry`, `vulture` (back).
   - Conferir rotas dinâmicas, jobs (APScheduler), reflection, permissões granulares (módulo/ação string).
   - Marcar `@deprecated` antes de remover em PR posterior.
   - Esperar uma sprint (1-2 semanas) entre marcar e remover.

4. **Não versionar secrets.**
   Antes de cada commit, `git diff --staged | grep -iE "(secret|password|api[_-]?key|token|bearer)"`. Se aparecer:
   - Reverter o arquivo.
   - Verificar se é placeholder (`SUBSTITUA_POR_...`) ou valor real.
   - Se for real, tratar como incidente (regra 5).

5. **Tratar segredo versionado como incidente.**
   Se em qualquer momento for descoberto segredo real em commit:
   - **Não fazer revert** (não apaga do histórico).
   - **Rotacionar imediatamente** o segredo no provedor.
   - Documentar incidente em `docs/incidents/YYYY-MM-DD-secret-leak.md`.
   - Comunicar stakeholder.
   - Considerar reescrita de histórico via `git filter-repo` apenas se autorizado.

6. **Recomendar rotação de qualquer credencial exposta.**
   Se houver dúvida sobre exposição (commit antigo, log, screenshot, mensagem), assumir que vazou e rotacionar. Custo de rotação é baixo; custo de não rotacionar pode ser alto.

7. **Separar mudanças em PRs pequenos.**
   Cada PR ataca **um** achado. Nada de "fix-multiple-issues". Tamanho-alvo: ≤ 200 linhas modificadas.

8. **Registrar tudo em documento de execução.**
   Criar `docs/AUDITORIA_EXECUCAO_PRODUCTION_READY.md` na próxima sessão e atualizar a cada PR/decisão. Estrutura sugerida:
   ```markdown
   ## YYYY-MM-DD HH:MM — Ação
   - Achado: P0-X / P1-crítico-Y
   - PR: #NNN
   - Comando rodado: ...
   - Mudança: ...
   - Risco: ...
   - Validação: ...
   - Status: ✅/❌/🟡
   ```

9. **Validar em staging antes de prod.**
   Mesmo sem staging dedicado hoje, todo PR P0/P1 passa por preview Vercel + smoke test manual antes do merge em `main`. Se a Fase 1 incluir criar staging, validar lá primeiro.

10. **Backup antes de qualquer migration de banco.**
    Não rodar `alembic upgrade head` em produção sem snapshot Railway pré-deploy. Confirmar via UI que o backup foi criado **antes** de continuar.

11. **Não mexer em DRE / planoContas.ts / caixaBuilder.ts / Math.abs / Float / Numeric / datas / plano de contas antes do oracle financeiro.**
    Esta regra repete propositalmente as regras 1 e 2 porque é o erro mais provável de ser cometido por pressa.

12. **Não rodar Alembic, migrations, seeds, scripts destrutivos ou comandos contra produção sem autorização humana explícita.**

---

## 11. Ordem recomendada de commits/PRs

> Cada PR é atômico, ≤ 200 linhas, com testes verdes.

### Fase 0 (preparação)

1. **PR-01 — `docs/add-audit-handoff`**
   - Adiciona este arquivo (`AUDITORIA_HANDOFF_PRODUCTION_READY.md`).
   - **Risco:** nulo. Só documentação.

2. **PR-02 — `docs/add-execution-log`**
   - Cria `docs/AUDITORIA_EXECUCAO_PRODUCTION_READY.md` vazio com estrutura.
   - Adiciona `docs/adr/` com templates ADR-01/02/03 (preencher depois).
   - **Risco:** nulo.

3. **PR-03 — `docs/answer-audit-validations`**
   - Documenta respostas das validações V-01 a V-A5 em `docs/audit/validations-YYYY-MM-DD.md`.
   - **Não inclui valores de credenciais.** Apenas "configurado/não configurado", "≥ 64 chars/não", etc.
   - **Risco:** nulo.

### Fase 1A (segurança imediata)

4. **PR-04 — `security/remove-versioned-secrets`** (somente se Bloco A.4 encontrar algo)
   - Remove segredo. Rotação documentada em incident report separado.
   - **Risco:** médio. Rotação obrigatória.

5. **PR-05 — `security/update-vulnerable-deps`** (somente se Bloco A.1-A.5 encontrar vuln high)
   - Atualiza dep vulnerável.
   - **Risco:** baixo se sem breaking change.

6. **PR-06 — `fix/admin-password-not-reset-on-boot`** (P0-1)
   - Modifica `criar_admin_inicial` em `app/main.py`.
   - Adiciona teste `tests/test_admin_init.py`.
   - **Risco:** baixo (mas confirmar acesso de fallback antes).

7. **PR-07 — `fix/activate-log-redaction`** (P0-2)
   - Chama `setup_logging()` no lifespan.
   - Adiciona `tests/test_logging.py` validando redação.
   - **Risco:** baixo.

8. **PR-08 — `fix/webhook-token-required-in-prod`** (P0-3)
   - Valida `WEBHOOK_TOKEN` em `validate_critical_config()`.
   - **Pré-requisito:** A.7 = configurado em prod; confirmar com Omie que token está sendo enviado.
   - **Risco:** médio.

9. **PR-09 — `chore/remove-tests-conditional-in-ci`** (P1-crítico-11 parcial)
   - Remove `if: hashFiles('tests/')` do CI back.
   - **Risco:** nulo.

10. **PR-10 — `security/hide-swagger-in-production`** (P1-7)
    - Condicional `docs_url=None if ENVIRONMENT=="production"`.
    - **Pré-requisito:** A.10 confirmou que está público.
    - **Risco:** baixo.

### Fase 1B (observabilidade)

11. **PR-11 — `obs/add-request-id-middleware`** (P1-crítico-9 parcial)
    - Middleware FastAPI gera UUID, propaga em header e logs.
    - **Risco:** baixo.

12. **PR-12 — `obs/add-sentry-backend`** (P1-crítico-9 parcial)
    - `sentry-sdk[fastapi]` em requirements.txt.
    - Init em `main.py`.
    - DSN em env var.
    - **Risco:** baixo.

13. **PR-13 — `obs/add-sentry-frontend`** (P1-crítico-9 parcial)
    - `@sentry/nextjs` em package.json.
    - `sentry.client.config.ts`, `sentry.server.config.ts`.
    - **Risco:** baixo.

### Fase 1C (quick wins)

14. **PR-14 — `security/admin-guard-heavy-endpoints`** (P1-8)
    - `Depends(get_current_admin)` em `/notificacoes/gerar-alertas`, `/cache/flush`, `/sync/empresas/{id}`.
    - **Risco:** médio (se algum usuário comum dependia desses, vai 403).

15. **PR-15 — `fix/anthropic-timeout`** (P1-25)
    - `timeout=30` no client Anthropic.
    - **Risco:** nulo.

16. **PR-16 — `perf/add-gzip-middleware`** (P1-10)
    - `app.add_middleware(GZipMiddleware, minimum_size=1000)`.
    - **Risco:** nulo.

17. **PR-17 — `security/validate-jwt-type-access`** (P1-3)
    - Valida `payload.get("type") == "access"` em `get_current_user`.
    - **Risco:** baixo.

18. **PR-18 — `obs/replace-bare-except-pass`** (P1-22)
    - Substitui 6 `try/except Exception: pass` por `logger.exception` + decisão explícita.
    - **Risco:** médio (algum lugar pode depender do silenciamento; testar bem).

19. **PR-19 — `chore/add-pip-audit-to-ci`** (P1-29)
    - Adiciona `pip-audit -r requirements.txt --strict` no CI back.
    - **Risco:** baixo (pode encontrar vuln pendente; documentar como EXC-NNN).

20. **PR-20 — `chore/add-dependabot`** (P2)
    - `.github/dependabot.yml` em ambos os repos.
    - **Risco:** nulo.

21. **PR-21 — `chore/add-codeowners-and-pr-template`** (P1-crítico-13)
    - `.github/CODEOWNERS`, `.github/pull_request_template.md`.
    - Configurar branch protection via GitHub UI (não em PR).
    - **Risco:** nulo.

22. **PR-22 — `obs/healthcheck-split`** (P2)
    - `/health/live` + `/health/ready`.
    - **Risco:** baixo (Railway pode precisar de reconfiguração do healthcheck path).

### Fase 2-4 (futuras, não no Sprint 1)

23. **PR-23 — `test/create-financial-oracle-baseline`** (Fase 2)
    - Adiciona `tests/oracle/` com fixtures e expected.
    - **Risco:** baixo se só captura. **Médio** se descobre bugs antes de Fase 4.

24. **PR-24 — `feat/alembic-baseline`** (P1-crítico-1, Fase 3A)
    - Adiciona Alembic com baseline congelado.
    - **Risco:** alto (precisa backup obrigatório).

25. **PR-25 — `fix/monetary-decimal-handling`** (P1-crítico-4, Fase 3B)
    - Migration `Float` → `Numeric(15,2)`.
    - **Risco:** alto.

26. **PR-26 — `fix/dates-as-date-type`** (P1-crítico-5, Fase 3B)
    - Migration `String(10)` → `Date`.
    - **Risco:** alto.

27. **PR-27 — `refactor/calculation-engine-single-source`** (P1-crítico-6, Fase 4)
    - Move DRE para o back.
    - **Risco:** alto. Exige Fase 2 completa.

---

## 12. Prompt recomendado para a nova sessão

Cole o bloco abaixo no início da próxima sessão Claude/IA:

```
Estou continuando uma auditoria técnica do Portal Financeiro Grupo ALT
(repos vmapex/grupoalt-web e vmapex/grupoalt-api) feita em sessão anterior.

Antes de qualquer outra coisa:

1. Leia integralmente o arquivo
   docs/AUDITORIA_HANDOFF_PRODUCTION_READY.md
   no repositório grupoalt-web.

2. Leia especialmente as seções:
   - "Leitura obrigatória antes de executar"
   - "Achados herdados de outro contexto — não confirmados neste projeto"
   - "Regras de segurança para a próxima sessão"
   - "Bloqueios absolutos antes de alterações financeiras e estruturais"

3. Crie um novo arquivo
   docs/AUDITORIA_EXECUCAO_PRODUCTION_READY.md
   estruturado para registrar TODAS as ações que você for executar,
   incluindo decisões, comandos rodados, PRs, validações e pendências,
   com timestamp.

4. Inicie pela Fase 0 (Preparação e handoff) do plano descrito em §8.
   NÃO execute Fase 1 antes de:
   - Investigar os itens "mencionados mas não confirmados" (fast-jwt,
     baseline.ts, adm123456, JWT_SECRET) — eles podem ser não-aplicáveis;
   - Coletar respostas das 18 dúvidas operacionais pendentes (§7);
   - Mapear arquivos e riscos atualizados de cada P0 antes de submeter
     qualquer PR.

5. Só execute a Fase 1 (1A → 1B → 1C, nessa ordem) depois de:
   - Validações da Fase 0 respondidas;
   - 3 ADRs decididos (mesmo que parcialmente);
   - Confirmação explícita do usuário.

6. NÃO mexa em DRE / planoContas.ts / caixaBuilder.ts / Math.abs /
   Float / Numeric / datas / plano de contas / regras de classificação
   contábil antes da Fase 2 (oracle financeiro) estar pronta e aprovada.

7. NÃO rode Alembic, migrations, seeds, scripts destrutivos ou comandos
   contra produção sem autorização humana explícita.

8. NÃO altere autenticação, cookies, CORS, WEBHOOK_TOKEN, SECRET_KEY ou
   permissões sem smoke test em preview/staging.

9. Siga as regras de segurança da §10 do handoff sem exceção:
   - Não versionar secrets;
   - Não remover código sem validar uso dinâmico;
   - Não rotacionar credenciais antes de saber o estado atual;
   - Tratar segredo versionado como incidente;
   - PRs pequenos (≤ 200 linhas);
   - Backup antes de qualquer migration;
   - Não mexer em motor de cálculo antes do oracle.

10. Use a ordem de commits/PRs sugerida na §11 do handoff. Para cada PR,
    atualize docs/AUDITORIA_EXECUCAO_PRODUCTION_READY.md com:
    - Achado relacionado (P0-X, P1-crítico-Y, P1-Z);
    - Comandos rodados (e saída relevante, redatada);
    - Mudança aplicada;
    - Risco identificado;
    - Validação executada;
    - Status (✅/❌/🟡).

11. Antes de qualquer alteração de produção, valide com lint + typecheck
    + test + build em CI verde.

12. Se encontrar evidência de segredo real versionado no histórico,
    PARE, documente como incidente em docs/incidents/YYYY-MM-DD-...,
    e peça orientação ao usuário antes de qualquer ação.

13. Você está autorizado a realizar:
    - Leitura ampla;
    - Alterações em arquivos novos (docs/, alembic/, tests/);
    - PRs pequenos atacando achados P0 confirmados (Bloco B da §9)
      e quick wins seguros (Bloco D da §9).

    Você NÃO está autorizado a:
    - Tocar em planoContas.ts/caixaBuilder.ts (motor de cálculo);
    - Migrar tipos de dados do banco (Float/Numeric, String/Date);
    - Remover endpoints duplicados;
    - Unificar páginas BI vs Portal;
    - Hardening de upload de documentos (vai para fase dedicada);
    - Mexer em produção sem confirmação explícita do usuário.

Comece confirmando:
- Que leu o handoff integralmente;
- Que os 3 ADRs estão pendentes;
- Que as 18 dúvidas operacionais estão pendentes;
- Que os 4 achados herdados não foram confirmados nesta auditoria;
- Que a próxima ação proposta é PR-01: docs/add-audit-handoff (criar
  branch claude/docs-audit-handoff e abrir PR).
```

---

## Anexo A — Arquivos referenciados neste handoff

### Backend (`grupoalt-api/`)

| Arquivo | Função |
|---|---|
| `app/main.py` | FastAPI app + lifespan + scheduler + migrations inline + admin seed |
| `app/core/config.py` | Pydantic Settings (envs) |
| `app/core/database.py` | Engine async + session factory |
| `app/core/security.py` | bcrypt, JWT, Fernet |
| `app/core/deps.py` | get_current_user, get_empresa_ctx, etc. |
| `app/core/ratelimit.py` | Rate limit Redis |
| `app/core/logging_config.py` | `setup_logging` definido mas nunca chamado |
| `app/models/models.py` | 22 tabelas schema public |
| `app/models/empresa_models.py` | Schema per-empresa não consumido |
| `app/services/sync_service.py` | Integração Omie → DB (792 LOC) |
| `app/services/orbit_chat.py` | Chat IA Claude |
| `app/services/omie_client.py` | httpx + tenacity + paginação |
| `app/services/schema_manager.py` | DDL dinâmico per-empresa |
| `app/services/alertas.py` | Alertas financeiros via cron |
| `app/services/auditoria.py` | LogAuditoria |
| `app/cache/redis_client.py` | get_redis + cache_get/set/invalidate |
| `app/routers/*.py` | 17 routers (auth, admin, gestao, permissoes, financeiro, sync, webhook, orbit, etc.) |
| `tests/conftest.py` | Fixtures pytest |
| `tests/test_*.py` | 8 arquivos de teste |
| `requirements.txt` | Deps Python (alembic listado, não usado) |
| `Dockerfile` | Python 3.12-slim non-multistage |
| `railway.toml` | Healthcheck 60s |
| `.github/workflows/ci.yml` | ruff + pytest condicional |
| `.env.example` | Template (incompleto) |
| `.env.railway` | Template versionado |

### Frontend (`grupoalt-web/`)

| Arquivo | Função |
|---|---|
| `src/middleware.ts` | CSP nonce dinâmico |
| `src/app/layout.tsx` | Root layout com nonce inline |
| `src/app/login/page.tsx` | Tela de login (425 LOC) |
| `src/lib/api.ts` | Axios + interceptor 401/refresh |
| `src/lib/planoContas.ts` | Regra de DRE no front (367 LOC, bug Math.abs) |
| `src/lib/caixaBuilder.ts` | Agregadores trimestral/mensal/semanal (394 LOC) |
| `src/lib/transformers.ts` | API → shape de componente |
| `src/lib/access.ts` | Autorização UX |
| `src/lib/types.ts` | Tipos do front mantidos à mão |
| `src/lib/mocks/*.ts` | Tipos de domínio + 2 helpers (mal nomeada) |
| `src/hooks/useAPI.ts` | 30+ hooks monolítico (632 LOC) |
| `src/hooks/useCategoriasMap.ts` | Plano de contas dinâmico |
| `src/store/{authStore,empresaStore,...}.ts` | Zustand stores |
| `src/components/chat/ChatPanel.tsx` | UI do Orbit (645 LOC) |
| `src/app/bi/financeiro/**/page.tsx` | Experiência BI executiva |
| `src/app/portal/**/page.tsx` | Experiência portal operacional |
| `package.json` | Deps Node |
| `next.config.js` | rewrites, redirects, headers |
| `vercel.json` | NEXT_PUBLIC_API_URL = prod |
| `.github/workflows/ci.yml` | typecheck + lint + test + build + audit (parcialmente bloqueante) |
| `.env.example` | NEXT_PUBLIC_API_URL = localhost |
| `scripts/check-bundle-secrets.js` | Scan de credenciais no bundle |

### Documentação existente

| Arquivo | Conteúdo |
|---|---|
| `docs/plano-acao-seguranca/README.md` | Índice dos Steps 01-17 |
| `docs/plano-acao-seguranca/step-{01..17}-*.md` | Plano detalhado |
| `docs/plano-acao-seguranca/audit-exceptions.md` | EXC-001 (Next 14.x), EXC-002 (postcss) |
| `docs/plano-acao-seguranca/orbit-policy.md` | Política LGPD Orbit |
| `docs/plano-acao-seguranca/step-17-relatorio-homologacao.md` | "GO técnico" 2026-05-06 (não significa production-ready pleno conforme esta auditoria) |
| `docs/STEP_*.md` | Steps 03, 04, 05 |
| `docs/AUDIT_BASELINE_2026-04-29.md` | Baseline anterior |
| `docs/STAGING_DEPLOY_SEGURO.md` | Step 02 detalhado |
| `README.md`, `CLAUDE.md` | Em ambos os repos |
| `DEPLOY-PRODUCAO.md` (api) | Configuração Railway |
| `GUIA_VALIDACAO_OMIE.md` (api) | Validação de credenciais |

---

## Anexo B — Glossário

- **DRE** — Demonstrativo de Resultados do Exercício. Saída financeira agregada.
- **RoB** — Receita Bruta. Primeira linha da DRE.
- **TDCF** — Tributos, Deduções, Custos Financeiros.
- **CV** — Custos Variáveis.
- **CF** — Custos Fixos.
- **RNOP/DNOP** — Receitas/Despesas Não-Operacionais.
- **MC** — Margem de Contribuição.
- **EBT** — Earnings Before Taxes (EBT1 = MC − CF, EBT2 = EBT1 + SNOP).
- **NEUTRO** — Categoria especial excluída do DRE (transferências internas).
- **Orbit** — Nome interno do chat IA.
- **Omie** — ERP brasileiro com API pública.
- **`empresa_id`** — Discriminador de tenant.
- **`emp_{slug}`** — Schema PostgreSQL per-empresa (existe, não é usado).
- **Step XX** — Tarefa do plano de ação versionado em `docs/plano-acao-seguranca/`.
- **EXC-XXX** — Exceção registrada em `audit-exceptions.md`.
- **Oracle financeiro** — Conjunto de fixtures (input lançamentos → output DRE esperado) validado pelo financeiro do cliente. Verdade contábil testável.
- **Oracle de regressão** — Captura da saída atual de `calcularDRE` como baseline. Protege contra mudança não intencional, mas **não é verdade contábil**.

---

## Anexo C — Decisões Arquiteturais (ADRs) pendentes

> Templates para escrever na Fase 0.

### ADR-001 — Localização do motor de DRE

**Status:** Proposta

**Contexto:** O DRE é hoje calculado em `src/lib/planoContas.ts::calcularDRE` no frontend, com 367 LOC de código TS + bug Math.abs documentado em test. Existe override de grupo DRE por empresa no DB (`categorias_omie.grupo_dre_override`) mas a regra de cálculo vive no cliente.

**Opções:**
- **A. Manter no frontend.** Vantagem: cliente pode simular cenários sem hit no backend; bundle não cresce muito. Desvantagem: contábil não revisa TS; auditor não tem onde olhar; mudança exige deploy do front; bug Math.abs afeta reportado.
- **B. Mover para o backend.** Vantagem: fonte única; testável com oracle; cacheável; auditável. Desvantagem: requer endpoint dedicado; muda contrato API; refator grande.

**Decisão:** _(pendente)_

**Consequências:** _(pendente)_

---

### ADR-002 — Sync Omie síncrono vs assíncrono

**Status:** Proposta

**Contexto:** Quando uma empresa tem DB vazio, os endpoints `dashboard`, `extrato` e `cp_cr` disparam `sync_*` síncrono à Omie dentro do request. Tempo: ~30s. Pode estourar timeout Railway (60s).

**Opções:**
- **A. Manter síncrono.** Vantagem: primeiro acesso "funciona" miraculosamente. Desvantagem: bloqueia request; UX inaceitável; pode falhar com timeout.
- **B. Migrar para assíncrono.** Front detecta DB vazio; mostra "Sincronizando..."; scheduler executa imediatamente; UI faz polling em `/sync/status`. Vantagem: sem bloqueio; rastreável. Desvantagem: requer UI nova.

**Decisão:** _(pendente)_

**Consequências:** _(pendente)_

---

### ADR-003 — Multi-tenant: `empresa_id` vs schema per-empresa

**Status:** Proposta

**Contexto:** Co-existem dois modelos:
- `models.py` define tabelas no schema `public` com `empresa_id` como discriminador (em uso por 100% dos routers).
- `empresa_models.py` define tabelas no schema `per_empresa` traduzido dinamicamente para `emp_{slug}` (nenhum router consome).
- `schema_manager.py` cria os schemas físicos via DDL inline (que **diverge** dos modelos SQLAlchemy).

**Opções:**
- **A. Manter `empresa_id`.** Simplifica. Deleta `empresa_models.py` + `_create_tables_in_schema`. Remove duplicação.
- **B. Migrar para schema-per-empresa.** Maior isolamento (LGPD). Muito caro: refatorar todos os routers + migração de dados + drop coluna.
- **C. Manter ambos.** Status atual. Justificativa formal obrigatória.

**Decisão:** _(pendente)_

**Consequências:** _(pendente)_

---

**Fim do handoff.**

Próxima ação esperada: nova sessão Claude/IA lê este arquivo integralmente (especialmente "Leitura obrigatória antes de executar", "Achados herdados não confirmados" e "Regras de segurança"), cria `AUDITORIA_EXECUCAO_PRODUCTION_READY.md`, e inicia Fase 0.
