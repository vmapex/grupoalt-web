# Validações operacionais V-01..V-A4 — sessão 2026-05-13/14

> Resultado das validações empíricas declaradas pendentes no
> [handoff](../AUDITORIA_HANDOFF_PRODUCTION_READY.md) §3.5 e
> [exec log](../AUDITORIA_EXECUCAO_PRODUCTION_READY.md) §"Fase 0 —
> Validações empíricas pendentes".
>
> Cada item: estado encontrado em produção + ação tomada + PR
> resultante. Sem valores de credenciais reais.

## Sumário

- **11 itens fechados** (validações OK ou hardenings aplicados via PR).
- **2 itens pendentes** (V-A3, V-07 — não bloqueantes).
- **6 itens deferidos** como nice-to-have (V-08, V-10, V-11, V-13).
- **6 PRs** abertos+mergeados na sessão (4 web, 4 api — alguns contam em ambos).

## Tabela consolidada

### Configuração crítica do backend (Railway)

| ID | Item | Estado em prod | Ação | PR |
|---|---|---|---|---|
| **V-01** | `WEBHOOK_TOKEN` configurado? | ✅ Configurado, ≥ 32 chars | **Hardening**: required em produção via `validate_critical_config` (fail-fast no startup se sumir) | [api #62](https://github.com/vmapex/grupoalt-api/pull/62) |
| **V-02** | `DEBUG=false` em prod? | ✅ `false` | Sem ação | — |
| **V-03** | `CORS_ORIGINS` real em prod? | ✅ Só `https://portal.grupoalt.agr.br`, sem wildcard | Sem ação | — |
| **V-04** | `ACCESS_TOKEN_EXPIRE_MINUTES` real? | ⚠️ Var não setada → default 30 do código vencia silenciosamente (README documentava 480) | Default code 30 → 480. Usuários ganham 7h30 a mais de sessão | [api #62](https://github.com/vmapex/grupoalt-api/pull/62) |
| `SECRET_KEY` (bônus) | Forte? | ✅ ≥ 64 chars, não-placeholder | Sem ação | — |
| `FERNET_KEY` (bônus) | Configurada? | ✅ Configurada, não-placeholder | Sem ação | — |
| `ADMIN_PASSWORD` (bônus) | Configurada? | ✅ Configurada (fallback do P0-1 garantido) | Sem ação | — |

### Endpoints públicos da api (curl)

| ID | Item | Resultado | Status |
|---|---|---|---|
| **V-05** | `/docs` HEAD em prod | 404 | ✅ P1-7 (esconder docs em prod) confirmado |
| **V-05b** | `/openapi.json` HEAD em prod | 404 | ✅ Mesmo gate |
| **V-06** | `/health` retorna SHA? | ✅ Body com `status` + `deploy_sha` | ✅ Diagnóstico OK |
| **V-09** | `/debug/omie-raw` removido? | 404 | ✅ Removido com sucesso (commit `8a34c82`) |

### GitHub branch protection

| ID | Item | Estado | Ação | PR |
|---|---|---|---|---|
| **V-A1 web** | Branch `main` protegida em `vmapex/grupoalt-web` (público)? | ✅ Rule criada + nativamente enforced (Free tier OK em repo público) | Defesa em profundidade adicionada via pre-push hook local | [web #98](https://github.com/vmapex/grupoalt-web/pull/98) |
| **V-A1 api** | Branch `main` protegida em `vmapex/grupoalt-api` (privado)? | ⚠️ Rule criada mas **NÃO enforced** (limitação GitHub Free em repo privado) | Mitigação local: pre-push hook em `.githooks/pre-push`. **Decisão futura pendente** sobre Opção A (Team $4/mês) vs Opção B (tornar repo público) — antes da Fase 3 (Alembic) | [api #63](https://github.com/vmapex/grupoalt-api/pull/63) |
| **V-A2** | CODEOWNERS configurado? | ✅ Configurado em PR #45 (api) e #69 (web) | Sem ação | — |
| **V-A4** | Dependabot/Renovate ativos? | ✅ Dependabot ativo, wave 3 já processada | Sem ação | — |

### CI

| ID | Item | Estado | Ação |
|---|---|---|---|
| **V-12** | `pytest tests/` realmente roda no CI? | ✅ Sim (a condicional `if: hashFiles('tests/')` foi removida em PR-14 desta auditoria) | Sem ação adicional |

### Observabilidade (Sentry)

Setup completo realizado nesta sessão. Não tem ID V-XX porque não estava no handoff original — entrou via Fase 1B (PR #60 backend, PR #89 frontend).

| Item | Estado | Ação |
|---|---|---|
| Sentry backend (api) | ✅ ATIVO em prod | DSN configurado no Railway. Log `✓ Sentry inicializado (env=production, sample=0.1)` confirmado. |
| Sentry web (frontend) | ✅ ATIVO em prod | DSN configurado no Vercel + redeploy + **CSP fix** (PR [#100](https://github.com/vmapex/grupoalt-web/pull/100)). Smoke runtime confirmado: `throw new Error()` → POST 200 OK pra `*.ingest.us.sentry.io/api/.../envelope/`. |
| Spending cap Sentry | ✅ N/A — free tier sem método de pagamento cadastrado = blindado por design | — |

### Pendentes (não bloqueiam Fase 3)

| ID | Item | Por quê pendente |
|---|---|---|
| **V-A3** | Vercel preview env aponta para qual API? | Aguarda usuário abrir Vercel Settings → Environment Variables e reportar valor de `NEXT_PUBLIC_API_URL` em "Preview" |
| **V-07** | Logs Railway redatam senhas/segredos? | Aguarda usuário inspecionar logs do Railway procurando `Authorization`, `Bearer`, `password`, CPF, CNPJ |
| V-08 | Vercel/Railway log retention | Nice-to-have, deferido |
| V-10 | Anthropic cota com hard limit | Nice-to-have, deferido |
| V-11 | Railway volumes (uploads sobrevivem deploy?) | Nice-to-have, deferido |
| V-13 | Cota Omie monitorada | Nice-to-have, deferido |

### Validação smoke ADR-003 em produção

Não é V-XX, mas validado no mesmo arco temporal:

| Stop | Resultado |
|---|---|
| Stop 1 — Deploy do PR #64 confirmado em prod | ✅ deploy_sha `e535b7d` (merge), 14:13 deploy time |
| Stop 2 — Logs limpos no startup | ✅ Sem mais `setup_empresa_schemas`, sem `Schema 'emp_X' criado/verificado` |
| Stop 3 — Criar empresa de teste via UI | ✅ "SMOKE TEST ADR-003" criada com ID 4, sem erro 500, propaga entre `/portal/admin` e `/bi/financeiro/admin` |
| Stop 4 — Schema NÃO criado no DB (opcional) | Não verificado pelo usuário (opcional) |
| Stop 5 — Deletar empresa de teste | ⚠️ UI delete em `/portal/admin` não existe; `/bi/financeiro/admin` "Excluir" deleta apenas `EmpresaConfig` (logo), não a `Empresa`. Smoke essencialmente passou pelos outros stops; delete via curl ou pulado conscientemente |

### Decisões pendentes que saíram desta rodada

1. **V-A1 api — Team vs público vs status quo.** Decisão antes da Fase 3.
2. **README ACCESS_TOKEN_EXPIRE_MINUTES** — README falava `default 480` enquanto código tinha `30`. PR #62 alinhou o código com o README, mas vale revisar o README pra confirmar/atualizar a redação se ficou redundante.
3. **Telas duplicadas `/portal/admin` vs `/bi/financeiro/admin`** — flagged como P1-14 do handoff. Item pra Fase 5 (consolidação BI/portal).

## Status final do Bloco 2

🟡 **Quase fechado.** 11 de 13 validações encerradas (com hardening onde fazia sentido). 2 nice-to-have (V-A3, V-07) ficam como pendência leve, não bloqueiam Fase 3 nem Fase 5.

A decisão estratégica de V-A1 api (Team/público/status quo) é o único item antes de iniciar a Fase 3.

## PRs desta rodada

| # | Repo | Conteúdo |
|---|---|---|
| [api #62](https://github.com/vmapex/grupoalt-api/pull/62) | api | V-01 hardening (WEBHOOK_TOKEN required) + V-04 fix (token expira em 8h) |
| [api #63](https://github.com/vmapex/grupoalt-api/pull/63) | api | V-A1 api — pre-push hook |
| [api #64](https://github.com/vmapex/grupoalt-api/pull/64) | api | ADR-003 — cleanup schema-per-empresa morto (-470 LOC) |
| [web #96](https://github.com/vmapex/grupoalt-web/pull/96) | web | Exec log Bloco 1 |
| [web #98](https://github.com/vmapex/grupoalt-web/pull/98) | web | V-A1 — pre-push hook (auto-install via npm prepare) |
| [web #99](https://github.com/vmapex/grupoalt-web/pull/99) | web | 3 ADRs aceitos |
| [web #100](https://github.com/vmapex/grupoalt-web/pull/100) | web | Sentry web — CSP fix permite `*.ingest.sentry.io` em connect-src |

Todos mergeados em prod entre 2026-05-13 e 2026-05-14.
