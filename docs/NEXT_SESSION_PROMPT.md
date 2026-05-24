# Prompt da próxima sessão

> Última sessão: 2026-05-23 → 2026-05-24 — **Bug #4 + F1 + F2 + E1 entregues e mergeados; E2 (PR #150) aberto aguardando merge**.
> Cole o conteúdo abaixo na primeira mensagem da próxima sessão.

---

Continuando trabalho no Portal BI Grupo ALT (vmapex/grupoalt-web + vmapex/grupoalt-api).

## O que aconteceu até agora

### Fase A do RBAC (FECHADA em 2026-05-22)

4 PRs entregues, audit médio 96.7/100. Modelo `Perfil` + `PerfilPermissao` + `UsuarioPerfilEmpresa`, middleware `require_permission()` em 26 sites com feature flag `RBAC_ENFORCE` (default `False`), endpoint `GET /auth/me/permissoes/{empresa_id}`, componentes frontend `<PermissionGate>`, hook `usePermission`, store Zustand. 8 perfis canônicos seeded (Diretoria, Controladoria, Financeiro, Operações, Operador Junior, Gestor Unidade, Consultor Externo, Faturista). Vocabulário: 11 módulos × 4 ações. Retrocompat absoluta: `is_admin=True` continua bypass total.

### Fase B do roadmap (FECHADA em 2026-05-23)

**3 PRs entregues, audit médio 96.3/100:**
- web #144 Fase B: dashboard inicial em `/portal` com 6 cards gated via `<PermissionGate>` (97/100)
- web #145 Bug #3: `<UserMenu>` com dropdown clicável + ação Sair (96/100)
- web #146 Bug #1/2: `<EmpresaSelector>` substitui botão "Grupo ALT" + remove lista duplicada (96/100)

### Sessão 2026-05-23 → 2026-05-24 — 6 PRs

**Bug #4 (deletar usuário com soft delete) — MERGEADO:**

| PR | Escopo | Score |
|---|---|---|
| api #115 backend | Migration 0009 (`usuarios.deleted_at`) + `DELETE /admin/usuarios/{id}` + `POST /restore` + 6 guards (senha, nome, auto-delete, último admin, 409, 404) + filtros em listar/criar/patch/atribuições + login + get_current_user + refresh rejeitam soft-deletados + 21 pytests | 92 |
| web #147 frontend | `<DeleteUsuarioModal>` (clone do P0-7) + hooks `deleteUsuario`/`restaurarUsuario` + botão "Excluir usuário" em `/admin/usuarios` desabilitado em auto-delete + 13 vitests | 96 |

**F1: documentos:ver pros 6 perfis canônicos — MERGEADO:**

| PR | Escopo | Score |
|---|---|---|
| api #116 | Migration 0010 (INSERT em `perfil_permissoes` idempotente) + atualiza `app/core/rbac.py::PERFIS_SEED` + expõe `deleted_at` em `UsuarioResponse` (pré-req do F2) + 3 pytests | 95 |

Quem ganhou: Diretoria, Controladoria, Financeiro, Operações, Operador Junior, Gestor Unidade. NÃO ganharam: Consultor Externo, Faturista (escopo restrito por design).

**F2: UI de restore de usuários — MERGEADO:**

| PR | Escopo | Score |
|---|---|---|
| web #148 | Hook `useAdminUsuarios({ includeDeleted })` + toggle "Mostrar deletados" + badge "DELETADO" + botão Restaurar inline + 9 vitests | 96 |

**E1: AdminSubNav extract (DRY) — MERGEADO:**

| PR | Escopo | Score |
|---|---|---|
| web #149 | `<AdminSubNav>` extraído (dedup nas 5 páginas admin) + CLAUDE.md atualizado + 5 vitests. Mudança visual: orbit muda purple→blue (uniformização) | 97 |

**E2: ConfirmDeleteModal base (DRY) — ABERTO ⏳:**

| PR | Escopo | Score |
|---|---|---|
| web #150 | `<ConfirmDeleteModal>` base + 2 wrappers thin (~55 LOC cada) sobre Delete{Empresa,Usuario}Modal. ~250 LOC removidas. API pública dos wrappers preservada (23 tests existentes passam zero mudança) + 11 tests novos | 96 |

## Antes de qualquer coisa

1. **Sync local de ambos os repos:**

   ```bash
   cd grupoalt-web && git checkout main && git pull origin main
   cd grupoalt-api && git checkout main && git pull origin main
   gh pr list --repo vmapex/grupoalt-web --state open
   gh pr list --repo vmapex/grupoalt-api --state open
   ```

2. **Confirme com o user**: o PR #150 (E2) foi mergeado?

   - Esperado: zero PRs abertos exceto dependabot.
   - Se #150 ainda aberto e CI verde + audit APPROVE: peça pro user mergear antes de seguir.

3. **Leia em ordem**:

   - `docs/AUDITORIA_EXECUCAO_PRODUCTION_READY.md` (últimas sessões para contexto)
   - `docs/audit/e1-admin-subnav-extract/review.md` e `e2-confirm-delete-modal-base/review.md` se quiser entender padrão atual de DRY
   - `grupoalt-api/MOTOR_FECHAMENTO_HANDOFF.md` SE for atacar Fase C nesta sessão

## Estado operacional pendente (depende do user — não-código)

### Bloco 1 — DRE backend (pendente desde 2026-05-20)

- Ligar `NEXT_PUBLIC_USE_BACKEND_DRE=true` + `NEXT_PUBLIC_DRE_COMPARATIVO=true` em **Preview Vercel**
- Validar paridade DRE via `<ComparativoDRE>` 2-3 dias
- Ligar em **Production Vercel**
- Soak 7-14 dias
- Após soak: Fase 5.G (cleanup ~-700 LOC de `calcularDRE` local)

### Bloco 2 — RBAC granular

- Rodar `alembic upgrade head` em staging Postgres (cria tabelas 0008-0010 + seeds dos 8 perfis + `usuarios.deleted_at`)
- Abrir `/bi/financeiro/admin/usuarios` → atribuir perfil "Faturista" a um user não-admin
- Logar com esse user → confirmar que `/portal` mostra só "Motor de Fechamento" + "Documentos" não aparece
- Logar como Diretoria → confirmar que card "Documentos" aparece (F1)
- Ligar `RBAC_ENFORCE=true` no Railway staging
- Confirmar que `/bi/financeiro` retorna 403 efetivo pra Faturista
- Validar fluxo de delete + restore de usuário (Bug #4 + F2): deletar → toggle "Mostrar deletados" → restaurar
- Repetir tudo em prod após validação

### Bloco 3 — Regra de estornos no DRE (pendente desde Step 13)

Validação financeiro/controladoria sobre `Math.abs` em estornos. Step 13 Parte B aberta até decisão contábil.

## Próximas frentes possíveis (em ordem de dependência/valor)

### Fase C — Integração Motor de Fechamento via SSO (~2 sessões, MAIOR)

Motor está em outro repo (`vmapex/motor-fechamento-grupoalt-api` + `VinnyMMHH/motor-fechamento-alt`). Já tem RBAC próprio (5 perfis ADM/GESTOR_FECHAMENTO/OPERADOR/ANALISTA/EMISSOR_CTE). Caminho documentado em `grupoalt-api/MOTOR_FECHAMENTO_HANDOFF.md`:

- Compartilhar `JWT_SECRET` + `JWT_ISSUER` entre portal e motor
- Cookie `auth_token` em `.grupoatla.gr.br` (cross-site)
- Login direto no motor desabilitado
- Lazy provisioning: motor pede `GET /portal-api/users/{id}/motor-profile` no 1º acesso → portal devolve `{login, nome, perfil_motor, unidade_ids}`

Mapeamento Portal Perfil → Motor Perfil já desenhado em `memory/post-audit-roadmap.md`. **Exige coordenação com sessão paralela do motor** antes de iniciar.

### Fase D — KPIs do motor no dashboard inicial (~1 sessão)

Cards no dashboard inicial mostrando último fechamento + viagens via `GET /api/historico-fechamentos` e `GET /api/dashboard` do motor. **Depende de Fase C (SSO)**.

### Quick wins remanescentes (~30min-2h cada, isolados)

Esses ficaram pendentes do handoff anterior e desta sessão. Bons pra warmup ou se Fase C ainda não pode iniciar:

- **Race condition restore** (sugestão deferida do audit #148): trocar `restoringId: number | null` por `Set<number>` em `/admin/usuarios/page.tsx` pra permitir restaurar múltiplos users em paralelo. ~20min.
- **Depreciar barrels `useAPI.ts` e `sync_service.py`**: migrar consumers para imports diretos do dominio. ~1h.
- **Agregações Python → SQL no `dashboard.py`** (backend): migrar GROUP BY para SQL. ~1.5h.
- **Depreciar re-export `get_client_ip`** em `auditoria.py`: ~15min.
- **UI de restore para EMPRESA** (paralelo ao F2 mas pra empresa): hoje admin precisa chamar `POST /admin/empresas/{id}/restore` via curl. ~45min usando padrão do F2.
- **Status `error: string` vs `ErrorPresentation`** (OBS-2 do audit E2): se quiser unificar com padrão da Fase A do Orbit (ChatPanel). ~1h, refactor maior.

### P2 estrutural restante (escopo grande)

Unificar `bi/` ↔ `portal/` (~3500 LOC duplicadas, 2-3 sessões). Aguarda Fase 5.G do DRE terminar — evita retrabalho.

## Bloqueios respeitados (valem toda a sessão)

- NÃO bypass branch protection (hard-enforced em ambos os repos)
- Audit-agent **OBRIGATÓRIO** para PRs que tocam contrato, segurança, ou destrutivo (ou mudança visível ao cliente)
- Padrão "seq + 1 auditor" — ver memória `[[audit-pattern-portal-bi]]`
- Se audit-agent travar (raro, mas aconteceu 3x até agora): re-spawnar com prompt mais enxuto OU suplementar com verificação manual
- **CUIDADO com worktrees**: após audit-agent terminar, o worktree fica `locked` e bloqueia checkout da branch original. Use `git worktree remove --force --force` antes de checkout. **Cleanup APAGA o review.md do worktree** — se ainda não foi copiado pra pasta principal, reconstitua a partir do summary do agent.
- PRs docs sempre com **links clicáveis** para PRs (`[#123](https://github.com/...)`)
- Motor de Fechamento está em desenvolvimento paralelo em outra sessão — **não tocar** os repos do motor sem alinhamento

## Recomendação concreta de início

Pergunte ao user qual frente atacar:

**Opção A — Pausa operacional**: você (claude) pausa o trabalho de código enquanto o user liga as flags em staging (Bloco 1 DRE + Bloco 2 RBAC) e valida alguns dias. Próxima sessão retoma com Fase C ou D.

**Opção B — Fase C (motor SSO)**: maior escopo (2 sessões). Recomendado se o user confirmar que a sessão paralela do motor está pronta pra coordenar (compartilhar JWT_SECRET, etc.). Senão, fica em risco de retrabalho.

**Opção C — Quick wins acumulados**: pegar 2-3 itens dos "Quick wins remanescentes" numa sessão única. Boa pra fechar débito técnico antes da Fase C grande. Eu sugiro: race condition restore + UI restore empresa + depreciar barrels.

**Opção D — Aguardar soak operacional e fechar P2 estrutural**: começar unificação `bi/` ↔ `portal/` após Fase 5.G terminar. Escopo grande, baixo valor visível pro user final.

## Memórias técnicas relevantes

- `[[audit-pattern-portal-bi]]` — padrão de audit + branch protection + worktree caveats
- `[[post-audit-roadmap]]` — atualizada agora com Bug #4 + F1 + F2 + E1 + E2
- `[[portal-ux-validation-pattern]]` — botões com chevron sem onClick (validação manual obrigatória pre-merge UX)
- `[[railway-restore-model]]` — Restore Railway via volume swap
- `[[local-db-tooling]]` — Postgres 16.14 local, sem pg_dump/Docker/WSL
- `[[classifier-railway-prod]]` — bloqueios de `railway run` em prod
