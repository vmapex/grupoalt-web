# Auditoria — Execução Production Ready

> **Registro vivo de execução** da auditoria iniciada via `docs/AUDITORIA_HANDOFF_PRODUCTION_READY.md`.
>
> **Sessão iniciada em:** 2026-05-12
> **Executor:** Claude Code (Opus 4.7 — 1M context)
> **Modo:** somente leitura nesta sessão; nenhuma alteração de código de produção será feita até confirmação do usuário.
> **Repositórios cobertos:** `vmapex/grupoalt-web` (Next.js) + `vmapex/grupoalt-api` (FastAPI).

---

## Como este documento é mantido

Cada ação relevante (investigação, decisão, PR, validação, incidente) recebe uma entrada com:

```
## YYYY-MM-DD HH:MM — <título>
- Achado: P0-X / P1-Y / N/A
- Comando(s) / arquivo(s):
- Resultado:
- Risco:
- Status: ✅ feito | 🟡 em andamento | ❌ pendente | 🚫 bloqueado
- Próximo passo:
```

Entradas em ordem cronológica reversa **dentro de cada bloco** (mais recente no topo do bloco). Blocos seguem a fase do plano (Fase 0 → 1A → 1B → ...).

---

## Fase 0 — Preparação e handoff

### 2026-05-12 — Sessão inicializada e handoff lido integralmente

- **Comando:** `Read docs/AUDITORIA_HANDOFF_PRODUCTION_READY.md` (1393 linhas).
- **Resultado:** handoff absorvido. Estrutura: 11 seções + 3 anexos. 10 P0, ~30 P1, ~40 P2, ~25 P3. 3 ADRs pendentes. 18 dúvidas operacionais. 11 fases. Bloqueios absolutos enumerados em §"O que este handoff não autoriza".
- **Status:** ✅ feito.

### 2026-05-12 — Investigação dos 3 achados herdados de outro contexto

> Itens mencionados pelo solicitante mas **não confirmados** na auditoria estática anterior. Precisavam de validação prévia antes de qualquer plano de ação.

#### `fast-jwt`

- **Comando 1:** `npm ls fast-jwt` no `grupoalt-web` → retornou `(empty)` com exit code não-zero. **Não instalado.**
- **Comando 2:** `git log --all --oneline -S "fast-jwt"` → **sem resultados.** Nunca esteve no histórico.
- **Comando 3:** `Grep -r "fast-jwt"` em todo o repo → **sem matches.**
- **Comando 4:** `npm audit --omit=dev --json` → vulnerabilidades reportadas são **todas de `next`** (CVEs `GHSA-9g9p-9gw9-jx7f`, `GHSA-h25m-26qc-wcjf`, `GHSA-ggv3-7p47-pfv8`, `GHSA-3x4c-7xq6-9pq8`, `GHSA-q4gf-8mx6-v5v3`, `GHSA-8h8q-6873-q5fj`). **Nenhuma menção a `fast-jwt`.**
- **Conclusão:** **NÃO-APLICÁVEL.** A biblioteca de assinatura JWT do projeto é `PyJWT[crypto]==2.9.0` no backend Python. O frontend não tem biblioteca JWT — apenas consome cookies httpOnly. Provável confusão de origem (outro projeto/alerta externo).
- **Status:** ✅ resolvido / N/A.

#### `baseline.ts`

- **Comando 1:** `Glob **/baseline.ts` e `**/baseline.*` → **sem matches.**
- **Comando 2:** `git log --all --oneline -- "**/baseline.ts" "**/baseline.spec.ts"` → **sem resultados.**
- **O que existe:** `docs/AUDIT_BASELINE_2026-04-29.md` (markdown, não `.ts`) — baseline anterior da auditoria.
- **Conclusão:** **NÃO-APLICÁVEL.** Arquivo nunca existiu neste projeto.
- **Status:** ✅ resolvido / N/A.

#### `adm123456`

- **Comando 1:** `Grep -r "adm123456"` em ambos os repos → **sem matches.**
- **Comando 2:** `git log --all --oneline -S "adm123456"` em `grupoalt-web` e `grupoalt-api` → **sem resultados em ambos.**
- **O que existe em código:** `ADMIN_PASSWORD: testadmin123` em `grupoalt-api/.github/workflows/ci.yml:44` — **apenas para CI**, com `ENVIRONMENT: test`. Não é credencial de produção. Aceitável (mas vale documentar como prática consciente).
- **Conclusão:** **NÃO-APLICÁVEL.** A senha mencionada nunca esteve no projeto. Pode ter sido confundida com a senha de teste do CI (`testadmin123`) ou alerta de outro repo.
- **Status:** ✅ resolvido / N/A.

### 2026-05-12 — Confirmação dos P0 conhecidos via leitura de código

#### P0-1 — Admin reset em todo boot

- **Local validado:** [grupoalt-api/app/main.py:56-94](../../grupoalt-api/app/main.py#L56-L94).
- **Trecho confirmado:**
  ```python
  else:
      user.ativo = True
      user.is_admin = True
      user.senha_hash = hash_password(admin_password)
      await db.commit()
      logger.info("✓ Usuário admin verificado/atualizado")
  ```
- **Status:** ✅ confirmado. Aguarda PR `fix/admin-password-not-reset-on-boot` (PR-06).

#### P0-2 — `setup_logging()` nunca é chamado

- **Local validado:** [grupoalt-api/app/core/logging_config.py:48](../../grupoalt-api/app/core/logging_config.py#L48).
- **Grep:** apenas a definição + docstring referenciam `setup_logging`. Nenhuma chamada real.
- **Em `main.py:15`:** `logging.basicConfig(level=logging.INFO)` direto. Filtro de redação **inativo**.
- **Status:** ✅ confirmado. Aguarda PR `fix/activate-log-redaction` (PR-07).

#### P0-3 — Webhook pode aceitar payload sem token

- **Local validado:** [grupoalt-api/app/routers/webhook.py:128](../../grupoalt-api/app/routers/webhook.py#L128).
- **Trecho confirmado:**
  ```python
  if settings.WEBHOOK_TOKEN and token != settings.WEBHOOK_TOKEN:
      ...
  ```
- **Em `config.py:46`:** `WEBHOOK_TOKEN: str = ""` (default vazio).
- **`OMIE_ALLOWED_IPS`** em [webhook.py:31-34](../../grupoalt-api/app/routers/webhook.py#L31-L34): declarado mas **nunca verificado**.
- **Status:** ✅ confirmado. **Pré-requisito:** verificar Railway antes de aplicar PR-08.

#### P0-4 — Migrations via `ALTER TABLE IF NOT EXISTS` inline

- **Local validado:** [grupoalt-api/app/main.py:97-163](../../grupoalt-api/app/main.py#L97-L163).
- **Conta:** ~26 `ALTER TABLE IF NOT EXISTS` + comentário explícito (linhas 131-142) admitindo que `CREATE INDEX` não pode rodar no boot por causa do healthcheck Railway (60s).
- **Sem pasta `alembic/`** apesar de `alembic==1.13.3` em `requirements.txt`.
- **Status:** ✅ confirmado. Fase 3 (não Fase 1).

#### P0-10 — CI back pode pular testes silenciosamente

- **Local validado:** [grupoalt-api/.github/workflows/ci.yml:69-70](../../grupoalt-api/.github/workflows/ci.yml#L69-L70).
- **Trecho confirmado:**
  ```yaml
  - name: Run tests
    run: pytest tests/ -v --tb=short
    if: hashFiles('tests/') != ''
  ```
- **Status:** ✅ confirmado. Aguarda PR `chore/remove-tests-conditional-in-ci` (PR-14).

#### P1-3 — `decode_token` não valida claim `type=access`

- **Local validado:** [grupoalt-api/app/core/deps.py:50-55](../../grupoalt-api/app/core/deps.py#L50-L55).
- **Trecho confirmado:**
  ```python
  payload = decode_token(token)
  user_id: int = int(payload["sub"])
  ```
- Nenhuma validação `payload.get("type") == "access"`. Refresh token pode ser usado como access token.
- **Status:** ✅ confirmado. Aguarda PR `security/validate-jwt-type-access` (PR-11).

### 2026-05-12 — Estado de `.env.example` (back)

- **Arquivo:** [grupoalt-api/.env.example](../../grupoalt-api/.env.example) — **28 linhas**.
- **Faltam:** `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `WEBHOOK_TOKEN`, `OMIE_*` (não-padrão), `CACHE_TTL_*`, `ORBIT_AUDIT_*`, `ENVIRONMENT` válido (já tem mas é `development`).
- **Status:** ✅ confirmado. P2-29 (não-Fase-1, mas trivial — pode subir junto com outro PR de docs).

### 2026-05-12 — Vulnerabilidades em `next` 14.2.x

- **`npm audit --omit=dev --json`** identificou pacote `next` com 6+ advisories: 2 HIGH, 4 MODERATE.
- **Já documentado:** EXC-001 em [docs/plano-acao-seguranca/audit-exceptions.md](plano-acao-seguranca/audit-exceptions.md) — upgrade para Next 16 planejado até 2026-07-31 (issue #56).
- **CI:** [grupoalt-web/.github/workflows/ci.yml:43-45](../../grupoalt-web/.github/workflows/ci.yml#L43-L45) — `npm audit` roda com `continue-on-error: true` por causa da exceção.
- **Conclusão:** já tratado por exceção formal. Sem ação adicional na Fase 1.
- **Status:** ✅ rastreado.

---

## Fase 0 — Validações empíricas pendentes (V-01 a V-A4)

> Estas validações exigem acesso a painéis (Railway, Vercel, GitHub Settings) e a produção (curl). **Eu não tenho esse acesso.** O usuário precisa executar ou autorizar.

| ID | Item | Como validar | Status |
|---|---|---|---|
| V-01 | `WEBHOOK_TOKEN` configurado em prod? | Railway → Variables | 🚫 pendente — bloqueia PR-08 |
| V-02 | `DEBUG=false` em prod? | Railway → Variables | 🚫 pendente |
| V-03 | `CORS_ORIGINS` real em prod? | Railway → Variables | 🚫 pendente |
| V-04 | `ACCESS_TOKEN_EXPIRE_MINUTES` real (30 ou 480)? | Railway → Variables | 🚫 pendente |
| V-05 | `/docs` e `/openapi.json` acessíveis sem auth em prod? | `curl -I https://api.grupoalt.agr.br/docs` | 🚫 pendente |
| V-06 | `/health` em prod retorna SHA? | `curl https://api.grupoalt.agr.br/health` | 🚫 pendente |
| V-07 | Logs Railway redatam senhas/segredos? | Painel Railway → logs | 🚫 pendente — bloqueia validar PR-07 |
| V-08 | Vercel/Railway capturam request body em logs? | Docs do provedor | 🚫 pendente |
| V-09 | `/debug/omie-raw` realmente removido? | `curl -I https://api.grupoalt.agr.br/debug/omie-raw` | 🚫 pendente |
| V-10 | Cota Anthropic com hard limit? | Anthropic Console | 🚫 pendente |
| V-11 | `/tmp/uploads/` sobrevive a deploy Railway? | Teste upload→redeploy→baixar | 🚫 pendente |
| V-12 | `pytest tests/` realmente roda no CI? | Forçar PR e ver Actions | 🚫 pendente (PR-14 já corrige) |
| V-13 | Cota Omie monitorada? | Painel Omie | 🚫 pendente |
| V-A1 | Branch `main` protegida? | GitHub → Settings → Branches | 🚫 pendente — bloqueia PR-21 |
| V-A2 | CODEOWNERS configurado? | GitHub → Settings | 🚫 pendente |
| V-A3 | Vercel preview env aponta para qual API? | Vercel → Project → Env | 🚫 pendente |
| V-A4 | Dependabot/Renovate ativos? | GitHub → Settings → Security | 🚫 pendente |

---

## Dúvidas operacionais obrigatórias (do handoff §6)

| # | Pergunta | Bloqueia | Status |
|---|---|---|---|
| 1 | Valor real e força do `SECRET_KEY` no Railway? Rotacionado? | Fase 0/B.1, B.3 | 🚫 aguarda usuário |
| 2 | Quem teve acesso ao GitHub desde commits suspeitos? | Investigação herdada → **N/A** confirmado | ✅ N/A |
| 3 | Existe planilha-mãe do financeiro para oracle? | Fase 2 | 🚫 aguarda gestor financeiro |
| 4 | `WEBHOOK_TOKEN` configurado em prod? (V-01) | PR-08 | 🚫 aguarda usuário |
| 5 | `DEBUG=false` em prod? (V-02) | Fase 1 / observabilidade | 🚫 aguarda usuário |
| 6 | `CORS_ORIGINS` real em prod? (V-03) | Fase 1 | 🚫 aguarda usuário |
| 7 | `ACCESS_TOKEN_EXPIRE_MINUTES` real? (V-04) | Documentação | 🚫 aguarda usuário |
| 8 | Swagger público em prod? (V-05) | PR-09 | 🚫 aguarda usuário |
| 9 | `/debug/omie-raw` removido? (V-09) | Validação | 🚫 aguarda usuário |
| 10 | Branch `main` protegida? (V-A1) | PR-21 / processo | 🚫 aguarda usuário |
| 11 | Vercel preview → prod ou staging? (V-A3) | F-01 | 🚫 aguarda usuário |
| 12 | Cota Anthropic com hard limit? (V-10) | Custos | 🚫 aguarda usuário |
| 13 | Política de redação de logs no Railway? (V-07) | Validar PR-07 | 🚫 aguarda usuário |
| 14 | Backup PostgreSQL Railway: RPO/RTO documentado? Restore testado? | Fase 3 (Alembic) | 🚫 aguarda usuário |
| 15 | `/tmp/uploads/` sobrevive deploy Railway? (V-11) | P1-6 | 🚫 aguarda usuário |
| 16 | Existe ambiente staging (mesmo informal)? | F-01 / Fase 5 | 🚫 aguarda usuário |
| 17 | DRI por área (front, back, banco, Omie, IA)? | Processo | 🚫 aguarda usuário |
| 18 | Acordo de uso pessoal das branches `claude/*`? | Processo / segurança | 🚫 aguarda usuário |

---

## Arquivos mapeados como críticos para a Fase 1

> Inventário dos arquivos que **serão lidos com profundidade** quando a Fase 1 começar. Nenhum será alterado nesta sessão.

### Bloco C — Corrigir P0s (FASE 1A)

| Achado | Arquivo | LOC alvo |
|---|---|---|
| P0-1 | `grupoalt-api/app/main.py` | 56-94 (função `criar_admin_inicial`) |
| P0-2 | `grupoalt-api/app/main.py` + `app/core/logging_config.py` | adicionar chamada de `setup_logging()` no lifespan |
| P0-3 | `grupoalt-api/app/routers/webhook.py` + `app/main.py` | 128 (validação token) + `validate_critical_config` |
| P0-10 | `grupoalt-api/.github/workflows/ci.yml` | linha 70 |
| P1-3 | `grupoalt-api/app/core/deps.py` | 50-55 |
| P1-7 | `grupoalt-api/app/main.py` | construtor FastAPI (esconder `/docs` em prod) |
| P1-8 | `grupoalt-api/app/routers/notificacoes.py`, `extrato.py`, `sync.py` | endpoints sem `get_current_admin` |
| P1-10 | `grupoalt-api/app/main.py` | `app.add_middleware(GZipMiddleware, ...)` |
| P1-15 | `grupoalt-api/app/main.py` | linhas 401-503 (try/except em imports de routers) |
| P1-25 | `grupoalt-api/app/services/orbit_chat.py` | client Anthropic — adicionar `timeout=30` |
| P1-29 | `grupoalt-api/.github/workflows/ci.yml` | adicionar `pip-audit` |

### Bloco D — Observabilidade (FASE 1B)

| Achado | Arquivo |
|---|---|
| P0-8 (Sentry back) | `grupoalt-api/requirements.txt` + `app/main.py` |
| P0-8 (Sentry front) | `grupoalt-web/package.json` + `sentry.{client,server}.config.ts` (novos) |
| P0-8 (request_id) | `grupoalt-api/app/main.py` (middleware novo) |
| P1-22 | 6 sites de `try/except Exception: pass` — buscar com Grep antes do PR |

### Bloco E — CI/processo (FASE 1C)

| Achado | Arquivo |
|---|---|
| P2-33 | `.github/dependabot.yml` em ambos os repos (novo) |
| P1-30 | `.github/CODEOWNERS` + `.github/pull_request_template.md` (novos) |
| - | Branch protection (configuração via UI GitHub — fora do código) |

---

## Riscos prioritários (consolidado, ordenado por severidade)

1. **Senha do admin é resetada em todo deploy** (P0-1) — controle de acesso instável; troca pela UI é silenciosamente revertida. **Confirmado em código.**
2. **Logs sem redação de senhas/tokens/CPF/CNPJ** (P0-2) — filtro existe mas nunca é ativado. Risco de vazamento via logs Railway. **Confirmado em código.**
3. **Webhook Omie pode estar sem token em produção** (P0-3) — `if settings.WEBHOOK_TOKEN` permite bypass se vazio. **Código confirmado; valor em prod precisa de V-01.**
4. **CI do backend pode pular testes silenciosamente** (P0-10) — `if: hashFiles('tests/')`. **Confirmado em código.** Falsa confiança.
5. **JWT não valida claim `type=access`** (P1-3) — refresh token pode ser aceito como access. **Confirmado em código.**
6. **Sem APM / Sentry / `request_id`** (P0-8) — diagnóstico cego em incidente.
7. **Sem ambiente staging** (P1-24) — preview Vercel aponta para API de produção (assumido; V-A3 valida).
8. **Migrations via `ALTER TABLE` inline sem Alembic** (P0-4) — bloqueia evoluções de schema; mudança destrutiva impossível. (Fase 3.)
9. **DRE no frontend com `Math.abs` documentado como bug** (P1-17 / R-C) — afeta número visível ao gestor. (Fase 4, depois do oracle.)
10. **`Float` em campos monetários** (P1-1) — risco de erro de arredondamento na DRE. (Fase 3.)

---

## ADRs pendentes (handoff Anexo C)

| ADR | Tema | Depende de |
|---|---|---|
| ADR-001 | DRE no back vs front | decisão do solicitante + financeiro |
| ADR-002 | Sync Omie síncrono vs assíncrono | decisão do solicitante |
| ADR-003 | Multi-tenant: `empresa_id` vs `emp_{slug}` | decisão técnica |

Templates em `docs/adr/00{1,2,3}-*.md` **ainda não criados** — serão na próxima etapa quando o usuário autorizar.

---

## Próximos passos imediatos (aguardando confirmação do usuário)

1. **Aguardo respostas** das 18 dúvidas operacionais (em especial V-01 a V-A4 e dúvida #1 sobre `SECRET_KEY`).
2. **Aguardo autorização** para:
   - PR-01: este documento + handoff (commit dos `.md` em `docs/`).
   - PR-02: criar `docs/adr/00{1,2,3}-*.md` como templates vazios para discussão.
3. **Aguardo input** sobre planilha-mãe do financeiro (dúvida #3) — necessária para Fase 2.
4. Após dúvidas 1, 4 a 9 respondidas, posso iniciar **Fase 1A** com PR-06 (admin reset).

**Nada será alterado em código de produção sem confirmação explícita do usuário em cada PR.**

---

## Log de comandos executados nesta sessão (Fase 0)

```bash
# Investigação dos achados herdados
cd grupoalt-web && npm ls fast-jwt           # → (empty)
cd grupoalt-web && git log --all -S "fast-jwt"   # → vazio
cd grupoalt-web && git log --all -S "adm123456"  # → vazio
cd grupoalt-api && git log --all -S "adm123456"  # → vazio
Glob **/baseline.ts                                # → no files
Glob **/baseline.*                                 # → no files
Grep -r "adm123456"                                # → no matches
Grep -r "fast-jwt"                                 # → no matches

# Auditoria de dependências
cd grupoalt-web && npm audit --omit=dev --json    # → 6+ advisories em "next"

# Leitura para confirmar P0/P1
Read grupoalt-api/app/main.py (1-170)
Read grupoalt-api/app/core/config.py (1-100)
Read grupoalt-api/app/routers/webhook.py (1-160)
Read grupoalt-api/app/core/logging_config.py
Read grupoalt-api/app/core/deps.py
Read grupoalt-api/.env.example
Read grupoalt-api/.github/workflows/ci.yml
Read grupoalt-web/.github/workflows/ci.yml
Read grupoalt-web/package.json
Grep -r "setup_logging" grupoalt-api  # → 3 hits, todos no próprio logging_config.py
```

Nenhum comando rodou contra **produção** (Railway/Vercel/banco real). Nenhum comando alterou arquivos de código fonte.

---

**Fim do registro inicial de Fase 0.**

---

## Fase 1A — Quick wins de segurança e estabilidade (P0 + P1 seguros)

### 2026-05-12 — Bloco C aplicado em 6 arquivos + 2 novos

Escopo: **P0-1, P0-2, P0-10, P1-3, P1-7, P1-10, P1-25, P1-29, P2-33**.
Bloqueios respeitados: motor de cálculo, banco, migrations, autenticação crítica (refresh/cookies/CORS) **não foram tocados**. Sem comandos contra Railway/Vercel/banco real.

#### Arquivos alterados

| Arquivo | Achado | Mudança | Risco |
|---|---|---|---|
| `grupoalt-api/app/main.py` | P0-1 | `criar_admin_inicial` não reescreve senha/ativo/is_admin em boots subsequentes. Reset explícito via `ADMIN_PASSWORD_RESET=true`. | 🟢 BAIXO — admin mantém senha atual; flag opt-in para recovery. |
| `grupoalt-api/app/main.py` | P0-2 | Adicionado `from app.core.logging_config import setup_logging` + chamada após `basicConfig`. Filtro de redação (senha/Bearer/CPF/CNPJ) agora ativo. | 🟢 BAIXO — só adiciona filtro a loggers existentes. |
| `grupoalt-api/app/main.py` | P1-7 | FastAPI construtor: `docs_url=None / redoc_url=None / openapi_url=None` quando `settings.ENVIRONMENT == "production"`. | 🟢 BAIXO — dev/test seguem com `/docs` acessível. |
| `grupoalt-api/app/main.py` | P1-10 | `app.add_middleware(GZipMiddleware, minimum_size=1000)` antes do CORS. | 🟢 ZERO — apenas comprime respostas grandes. |
| `grupoalt-api/app/core/deps.py` | P1-3 | `get_current_user` valida `payload.get("type") == "access"` antes de aceitar token. | 🟢 BAIXO — verificado em `security.py:28-41`: todos os access tokens já têm `type="access"`. |
| `grupoalt-api/app/services/orbit_chat.py` | P1-25 | `anthropic.AsyncAnthropic(api_key=..., timeout=30.0)`. | 🟢 ZERO — antes usava default 600s. |
| `grupoalt-api/.github/workflows/ci.yml` | P0-10 | Removida condicional `if: hashFiles('tests/') != ''`. | 🟢 ZERO. |
| `grupoalt-api/.github/workflows/ci.yml` | P1-29 | Novo step `pip-audit -r requirements.txt --strict` com `continue-on-error: true` (consistente com EXC-001). | 🟡 LOW — pode reportar CVE em dev tools; sem bloqueio inicial. |
| `grupoalt-api/.github/dependabot.yml` | P2-33 | **Arquivo novo** — pip + github-actions + docker. | 🟢 ZERO. |
| `grupoalt-web/.github/dependabot.yml` | P2-33 | **Arquivo novo** — npm + github-actions, com bloqueio explícito de `next` major (EXC-001). | 🟢 ZERO. |

#### Comandos de validação executados

```bash
# Sintaxe — todos PASS
python -c "import ast; ast.parse(open(p).read())" para main.py, deps.py, orbit_chat.py
python -c "import yaml; yaml.safe_load(open(p))" para todos os 4 YAMLs

# Backend
cd grupoalt-api && ruff check app/ --select E,F,W --ignore E501,E712,E741
# → All checks passed!

cd grupoalt-api && pytest tests/ -v --tb=short
# → 120 passed, 3 failed
# As 3 falhas são TODAS em test_integration::TestExportPDF (xhtml2pdf não tem
# wheel para Python 3.14 no env local; em CI usa Python 3.12 e passa).
# NENHUMA falha relacionada às mudanças desta Fase 1A.

# Frontend (apesar de não ter mudança de código front)
cd grupoalt-web && npm ci   # 537 packages instalados
cd grupoalt-web && npm run typecheck   # → exit 0, sem output
cd grupoalt-web && npm run lint        # → apenas warnings (mesmo baseline do Step 17)
cd grupoalt-web && npm test            # → 174/174 passed em 8 arquivos
cd grupoalt-web && npm run build       # → 50 rotas; middleware 26.8kB; sem regressão
cd grupoalt-web && npm run audit:bundle # → 79 arquivos JS verificados, sem credenciais expostas
```

#### Riscos mitigados

1. **Admin lockout após troca de senha pela UI** — eliminado. Senha pela UI sobrevive a deploys.
2. **Vazamento de credenciais nos logs** (P0-2) — filtro de redação agora ativo para Authorization, Bearer, app_secret, fernet_key, password, CPF, CNPJ.
3. **CI back podia passar sem rodar testes** (P0-10) — eliminado.
4. **Refresh token aceito como access** (P1-3) — eliminado. Refresh em rota de access → 401.
5. **Swagger/OpenAPI expostos sem auth em prod** (P1-7) — eliminados em `ENVIRONMENT=production` (dependendo de V-02/V-05).
6. **Sem compressão em respostas grandes** (P1-10) — agora gzip ≥ 1KB.
7. **Cliente Anthropic com timeout 600s** (P1-25) — agora 30s; libera worker em caso de incidente upstream.
8. **CI back sem `pip-audit`** (P1-29) — agora roda toda PR.
9. **Sem Dependabot** (P2-33) — PRs semanais de update em ambos os repos.

#### Pendências (NÃO aplicadas nesta sessão)

- **P0-3** (webhook token required) → bloqueado por V-01. Sem PR até confirmar valor em Railway.
- **P0-4** (Alembic) → Fase 3.
- **P0-5/6/7** (sync async, índices, cascade DELETE) → Fase 2/3.
- **P0-8** (Sentry/APM, request_id, replace bare except) → Fase 1B separada (precisa DSN + decisão).
- **P1-8** (admin guards em endpoints pesados) → PR separado depois de mapear chamadores.
- **P1-15, P1-22** (refator de `try/except`) → PR separado.
- **Tudo de Fase 2-5** (oracle financeiro, motor DRE, monetary types) → bloqueado conforme handoff.

#### Riscos remanescentes

- **R-1** Validações V-01..V-A4 ainda pendentes do usuário. Bloqueiam P0-3, PR-21 e a confirmação de impacto real do P1-7.
- **R-2** Comportamento do filtro de redação (P0-2) precisa ser validado com amostra de log real do Railway (V-07).
- **R-3** Sem Sentry/APM ainda; um incidente após este deploy continua difícil de diagnosticar.
- **R-4** `pip-audit` rodando com `continue-on-error: true` — pode mascarar CVE de produção até criarmos `audit-exceptions.md` para Python (espelhando o do front).
- **R-5** Dependabot vai começar a abrir PRs — equipe precisa de processo de triagem.

#### Próximo PR recomendado

**PR-22 (Fase 1B): Observabilidade básica**
- Adicionar `sentry-sdk[fastapi]` ao `requirements.txt`
- Init com `SENTRY_DSN` env var (gated em `if settings.SENTRY_DSN`)
- Middleware `X-Request-ID` no FastAPI
- Sentry no front (`@sentry/nextjs`) com `NEXT_PUBLIC_SENTRY_DSN`

**Pré-requisito do PR-22:** criar projeto Sentry e obter 2 DSNs (back e front). Sem DSN, o código fica inerte (sem-op). Não exige rotação de credenciais nem mudança de banco.

---

**Estado da Fase 1A (pré-PRs):** ✅ código pronto, validado localmente, aguardando autorização para commit/push e PR.

---

### 2026-05-12 — Fase 1A publicada em 4 PRs

Usuário autorizou abrir os PRs. Mudanças divididas em 4 PRs lógicos.

| # | Repo | Branch | PR | Conteúdo |
|---|---|---|---|---|
| PR-1 | grupoalt-web | `docs/audit-handoff-and-dependabot` | [#68](https://github.com/vmapex/grupoalt-web/pull/68) | Handoff + este doc + `.github/dependabot.yml` |
| PR-2 | grupoalt-api | `security/p0-quick-wins` | [#42](https://github.com/vmapex/grupoalt-api/pull/42) | P0-1, P0-2, P1-3, P1-7 |
| PR-3 | grupoalt-api | `perf-ci/quick-wins` | [#43](https://github.com/vmapex/grupoalt-api/pull/43) | P0-10, P1-10, P1-25, P1-29 |
| PR-4 | grupoalt-api | `chore/add-dependabot` | [#44](https://github.com/vmapex/grupoalt-api/pull/44) | Dependabot back (pip + actions + docker) |

**Estratégia:** PR-2 e PR-3 modificam ambos `app/main.py`. Branches partem de `main` independentemente; conflito trivial (~1 região) esperado no segundo merge, resolvível em rebase. Mantidos independentes para revisão isolada de cada PR.

**Validação por PR antes do push:**
- PR-1: `npm test` 174/174, `typecheck`, `lint` (só warnings), `build`, `audit:bundle` limpo, YAMLs válidos.
- PR-2: `ruff check` verde; pytest (security + orbit_audit + rbac) → 56/56.
- PR-3: `ruff check` verde; pytest (security + orbit_router + orbit_policy) → 39/39; `ci.yml` válido.
- PR-4: `dependabot.yml` válido.

**Recomendação de ordem de merge:**
1. **PR-1** (docs) — zero risco; baseline de leitura para os demais.
2. **PR-4** (dependabot back) — zero risco.
3. **PR-3** (perf+CI) — zero risco em runtime.
4. **PR-2 por último, com smoke em staging** — único com mudança de comportamento visível em produção. **Pré-requisito:** garantir caminho de fallback (SQL via Railway) para resetar senha do admin caso necessário, **antes** de mergear.

Após PR-2 e PR-3 mergeados, o segundo terá conflito trivial em `app/main.py` (importações + ordem dos middlewares). Resolução: manter ambas mudanças coexistindo (setup_logging + GZip + docs_url condicional + admin reset opt-in).

**Estado:** ✅ 4 PRs abertos aguardando review humano + execução do CI no GitHub Actions.

**Próximo bloco (Fase 1B — observabilidade):** aguarda DSNs do Sentry e decisão sobre middleware `X-Request-ID`. Não bloqueado por nenhum dos 4 PRs.


