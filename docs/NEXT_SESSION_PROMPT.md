# Prompt da próxima sessão

> Última sessão: 2026-05-22 — **Fase A do RBAC granular FECHADA** (4 PRs com audit médio 96.7/100).
> Cole o conteúdo abaixo na primeira mensagem da próxima sessão.

---

Continuando trabalho no Portal BI Grupo ALT (vmapex/grupoalt-web + vmapex/grupoalt-api).

## O que aconteceu até agora

**Auditoria production-ready (sessões 2026-05-12 → 2026-05-21):**

- P0: 10/10 ✅
- P1: 31/31 (100%) ✅
- P2: 2/3 ✅ (resta unificação `bi/`↔`portal/`, aguarda Fase 5.G)
- Fase 5: 7/8 sub-fases em soak (a Fase 5.G de cleanup aguarda fim do soak)
- 23 audits cumulados ao todo

**Roadmap pós-auditoria (sessões 2026-05-21 → 2026-05-22):**

User comunicou 4 itens de produto que segurou durante a auditoria:

1. Integrar Motor de Fechamento no portal
2. RBAC granular real (segmentar logins por perfil)
3. Dashboard inicial gated por permissões
4. Trazer dados do motor pro dashboard inicial

**Fase A (RBAC granular) — ENTREGUE em 4 PRs com média 96.7/100:**

| PR | Escopo | Score |
|---|---|---|
| PR 1 (api) | Foundation: 3 tabelas (`Perfil`, `PerfilPermissao`, `UsuarioPerfilEmpresa`) + migration 0008 + seed dos 8 perfis + helper `get_effective_permissions()` | 98/100 |
| PR 2 (api) | Middleware `require_permission()` em 26 sites + feature flag `RBAC_ENFORCE` (default `False` = no-op) | 98/100 |
| PR 3 backend (api) | Endpoint `GET /auth/me/permissoes/{empresa_id}` | 97/100 |
| PR 3 frontend (web) | Zustand store + 5 hooks + `<PermissionGate>` + 3 sites na Navbar | 96/100 |
| PR 4 backend (api) | 4 endpoints admin: GET perfis, GET/POST/DELETE atribuições | 96/100 |
| PR 4 frontend (web) | UI `/bi/financeiro/admin/usuarios` + 5 sub-navs atualizadas | 95/100 |

**8 perfis canônicos seeded:**
Diretoria · Controladoria · Financeiro · Operações · Operador Junior · Gestor Unidade · Consultor Externo (com `exports_confidencial=True`) · Faturista

**Vocabulário:** 11 módulos × 4 ações (`ver` / `editar` / `exportar` / `executar`)

**Migração gradual:** `RBAC_ENFORCE=False` por default → merge não muda prod. Quando user atribuir perfis + ligar flag em staging → valida → liga em prod.

**Retrocompat absoluta:** `Usuario.is_admin=True` continua bypass total.

## Antes de qualquer coisa

1. **Sync local de ambos os repos:**
   ```bash
   cd grupoalt-web && git checkout main && git pull origin main
   cd grupoalt-api && git checkout main && git pull origin main
   gh pr list --repo vmapex/grupoalt-web --state open
   gh pr list --repo vmapex/grupoalt-api --state open
   ```

2. **Confirme com o user**: os PRs da sessão 2026-05-22 foram mergeados?
   - `api #113, #114` (PR 4 backend + docs)
   - `web #140, #141, #142, e este de handoff` (PR 4 frontend + 2 docs)
   - Estado esperado: zero PRs abertos exceto dependabot.

3. **Leia em ordem:**
   - `docs/AUDITORIA_EXECUCAO_PRODUCTION_READY.md` (especialmente as últimas 3 sessões: 2026-05-22 partes 1, 2, 3)
   - `docs/AUDITORIA_HANDOFF_PRODUCTION_READY.md` apenas se primeira sessão em dias

## Estado operacional pendente (depende do user — não-código)

Estas tarefas precisam você (ou o user) executar **fora** do código:

### Bloco 1 — DRE backend (pendente desde 2026-05-20)

- Ligar `NEXT_PUBLIC_USE_BACKEND_DRE=true` + `NEXT_PUBLIC_DRE_COMPARATIVO=true` em **Preview Vercel**
- Validar paridade DRE via `<ComparativoDRE>` 2-3 dias
- Ligar em **Production Vercel**
- Soak 7-14 dias
- Após soak: Fase 5.G (cleanup ~-700 LOC de `calcularDRE` local)

### Bloco 2 — RBAC granular (novo — pendente desta sessão)

- Rodar `alembic upgrade head` em staging Postgres (cria tabelas + seed dos 8 perfis)
- Abrir `/bi/financeiro/admin/usuarios` → atribuir perfil "Faturista" a um user não-admin
- Logar com esse user → confirmar que só vê `/portal/fechamento`
- Ligar `RBAC_ENFORCE=true` no Railway staging
- Confirmar que `/bi/financeiro` retorna 403 efetivo pra Faturista
- Repetir em prod após validação

## Próximas frentes possíveis (em ordem de dependência/valor)

### Fase B — Dashboard inicial gated (~1 sessão)

`/portal/page.tsx` hoje só faz `redirect('/portal/grupo')`. Substituir por dashboard real com cards condicionais via `<PermissionGate>`. Depende de Fase A (✅) e idealmente de RBAC_ENFORCE ligado em prod.

### Fase C — Integração Motor de Fechamento via SSO (~2 sessões)

Motor está em outro repo (`vmapex/motor-fechamento-grupoalt-api` + `VinnyMMHH/motor-fechamento-alt`). Já tem RBAC próprio (5 perfis ADM/GESTOR_FECHAMENTO/OPERADOR/ANALISTA/EMISSOR_CTE). Caminho documentado:

- Compartilhar `JWT_SECRET` + `JWT_ISSUER` entre portal e motor
- Cookie `auth_token` em `.grupoatla.gr.br` (cross-site)
- Login direto no motor desabilitado
- Lazy provisioning: motor pede `GET /portal-api/users/{id}/motor-profile` no 1º acesso → portal devolve `{login, nome, perfil_motor, unidade_ids}`

Mapeamento Portal Perfil → Motor Perfil já desenhado em `memory/post-audit-roadmap.md`.

Handoff completo: `grupoalt-api/MOTOR_FECHAMENTO_HANDOFF.md`.

### Fase D — KPIs do motor no dashboard inicial (~1 sessão)

Cards no dashboard inicial mostrando último fechamento + viagens via `GET /api/historico-fechamentos` e `GET /api/dashboard` do motor. Depende de Fase C (SSO).

### P2 estrutural restante (escopo grande, aguarda Fase 5.G)

Unificar `bi/` ↔ `portal/` (~3500 LOC duplicadas, 2-3 sessões). Não iniciar antes da 5.G terminar — evita retrabalho.

### Follow-ups menores (rápidos, isolados)

- Atualizar referências a "50 rotas" no CLAUDE.md (build atual: 42)
- Depreciar barrels `useAPI.ts` e `sync_service.py` (migrar consumers para imports diretos do dominio)
- `dashboard.py`: migrar agregações Python para SQL `GROUP BY`
- Depreciar re-export de `get_client_ip` em `auditoria.py`
- Extrair `<AdminSubNav>` componente (hoje duplicado em 5 páginas admin)

## Bloqueios respeitados (valem toda a sessão)

- NÃO bypass branch protection (hard-enforced em ambos os repos)
- Audit-agent **OBRIGATÓRIO** para PRs que tocam contrato, segurança, ou destrutivo
- Padrão "seq + 1 auditor" — ver memória `[[audit-pattern-portal-bi]]`
- Se audit-agent travar (raro), suplementar com verificação manual e registrar como follow-up
- PRs docs sempre com **links clicáveis** para PRs (`[#123](https://github.com/...)`)
- Motor de Fechamento está em desenvolvimento paralelo em outra sessão — **não tocar** os repos do motor sem alinhamento

## Recomendação concreta de início

Pergunte ao user qual frente atacar:

**Opção A — Soak operacional**: você pausa o trabalho de código enquanto o user liga as flags em staging (DRE + RBAC) e valida alguns dias. Próxima sessão retoma com Fase B.

**Opção B — Avançar Fase B em paralelo**: enquanto user valida, você implementa o dashboard inicial gated (`/portal/page.tsx`) — escopo 1 sessão, baixo risco, não conflita com soak.

**Opção C — Iniciar Fase C (motor SSO)**: maior escopo (2 sessões), exige planejamento detalhado com o user. Recomendado depois do dashboard.

**Opção D — Quick wins de follow-ups menores** (depreciar barrels, AdminSubNav, etc.) — bom pra warmup de sessão se user não tiver prioridade clara.

## Memórias técnicas relevantes

- `[[audit-pattern-portal-bi]]` — padrão de audit + branch protection
- `[[post-audit-roadmap]]` — atualizada agora com Fase A ✅
- `[[railway-restore-model]]` — Restore Railway via volume swap
- `[[local-db-tooling]]` — Postgres 16.14 local, sem pg_dump/Docker/WSL
- `[[classifier-railway-prod]]` — bloqueios de `railway run` em prod
