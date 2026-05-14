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

---

### 2026-05-12 — Fase 1A merged + governança (PR-5, PR-6)

Os 4 PRs da Fase 1A mergeados em sequência limpa (~3 min). Sem
incidente. Em paralelo, abertos 2 PRs de governança:

| # | Repo | PR | Conteúdo |
|---|---|---|---|
| PR-5 | grupoalt-api | [#45](https://github.com/vmapex/grupoalt-api/pull/45) | `.github/CODEOWNERS` + `.github/pull_request_template.md` |
| PR-6 | grupoalt-web | [#69](https://github.com/vmapex/grupoalt-web/pull/69) | CODEOWNERS + PR template + `docs/adr/` (README + template + 3 ADRs) |

Templates ADR criados em **status Proposta**:

- `001-dre-localizacao.md` — DRE no back vs front. Recomendação preliminar: **Opção B** (back), condicionada à Fase 2 (oracle).
- `002-sync-omie-async.md` — Sync Omie síncrono vs assíncrono. Recomendação preliminar: **Opção B** (async + polling).
- `003-multi-tenant.md` — `empresa_id` vs `emp_{slug}`. Recomendação preliminar: **Opção A** (manter `empresa_id`), pendente LGPD/jurídico.

**ESLint hardening** (`no-explicit-any` warn) ficou de fora — exige plugin `@typescript-eslint/eslint-plugin` extra; deferido para PR separado.

### 2026-05-12 — Dependabot wave 1 (15 PRs abertos automaticamente)

Imediatamente após PR-4 / PR-1 mergeados, Dependabot abriu **15 PRs** seguindo as regras configuradas:

- **grupoalt-web (7):** axios, postcss group, autoprefixer, recharts 3, date-fns 4, actions/checkout 6, actions/setup-node 6.
- **grupoalt-api (8):** asyncpg, aiosqlite, patch-updates group, pydantic-settings 2.14, cryptography 48, docker python 3.14, actions/checkout 6, actions/setup-python 6.

**Triagem:**

| Categoria | Quantidade | Ação |
|---|---|---|
| SAFE (patch / minor / CI bumps) | 10 | Mergeados via UI após CI green |
| ATENÇÃO (major / runtime crítico) | 5 | Avaliados individualmente |

**SAFE merged (10):** web #70 (checkout), #71 (setup-node), #72 (postcss), #73 (axios), #75 (autoprefixer); api #46 (setup-python), #47 (checkout), #49 (patch group), #51 (asyncpg), #52 (aiosqlite).

**ATENÇÃO triados (5):**

| PR | Bump | Decisão |
|---|---|---|
| api #48 docker python 3.14 | major | **Fechado** — `python-bidi`/`xhtml2pdf` não tem wheel para 3.14 (confirmado localmente). PR-8 adiciona ignore. |
| api #50 pydantic-settings 2.14 | minor jump | **Mergeado** — CI green (1m45s); blast radius mínimo (`config.py` único consumer) |
| api #53 cryptography 48 | major | **Mergeado com smoke** — Fernet API estável; CI roda `TestFernet`; recomendado smoke decrypt de cred Omie real pós-deploy |
| web #74 recharts 3.x | major | **Fechado** — usado em 7 charts BI; migração visual dedicada exige sprint própria. PR-7 adiciona ignore. |
| web #76 date-fns 4.x | major | **Fechado** — dep morta (zero imports em src/). PR-7 remove a dep e adiciona ignore. |

### 2026-05-12 — Cleanup do Dependabot wave 1 (PR-7, PR-8)

| # | Repo | PR | Conteúdo |
|---|---|---|---|
| PR-7 | grupoalt-web | [#77](https://github.com/vmapex/grupoalt-web/pull/77) | Remove `date-fns` (dep morta) + ignore de `date-fns` e `recharts` major |
| PR-8 | grupoalt-api | [#54](https://github.com/vmapex/grupoalt-api/pull/54) | Ignore de python docker > 3.12 (incompat xhtml2pdf) |

Ambos mergeados sem incidente. PRs #48, #74, #76 fechados manualmente após.

### 2026-05-12 — Dependabot wave 2 (10 PRs)

Steady-state. Outra leva imediatamente após cleanup.

**grupoalt-web (5):** #78 tailwind-merge 2→3, #79 eslint 8→10, #80 tailwindcss 3→4, #81 jsdom 25→29, #82 typescript 5→6 — todos **majors**.

**grupoalt-api (5):** #55 apscheduler, #56 redis 5→7, #57 uvicorn 0.30→0.46, #58 anthropic 0.89→0.101, #59 pyjwt — mix de major/minor.

**Triagem web:** 2 SAFE (#78 tailwind-merge, #81 jsdom — CI green), 3 FAIL (#79 eslint, #80 tailwindcss 4, #82 typescript 6 — todos peer/migration conflicts pelo ecossistema **Next 14.x** / EXC-001).

**Triagem api:** **5 SAFE** — surpresa positiva. Mesmo majors (#56 redis 5→7) e jumps grandes (#57 uvicorn) passaram a suite completa de testes. Todos mergeados.

### 2026-05-12 — Cleanup wave 2 (PR-9)

| # | Repo | PR | Conteúdo |
|---|---|---|---|
| PR-9 | grupoalt-web | [#83](https://github.com/vmapex/grupoalt-web/pull/83) | Ignore de `eslint`, `tailwindcss`, `typescript` (major) — todos travados pelo Next 14.x |

Mergeado. PRs #79, #80, #82 fechados.

### 2026-05-12 — Fase 1B publicada (PR-10, PR-11, PR-12)

Observabilidade básica entregue em 3 PRs DSN-gated. Sem DSN configurado, SDK fica inerte — então PRs podiam mergear antes de criar projeto Sentry.

| # | Repo | PR | Conteúdo |
|---|---|---|---|
| PR-10 | grupoalt-api | [#60](https://github.com/vmapex/grupoalt-api/pull/60) | `sentry-sdk[fastapi]` + init em `main.py` (DSN-gated, `send_default_pii=False`) + `RequestIDMiddleware` propagando `X-Request-ID` |
| PR-11 | grupoalt-web | [#89](https://github.com/vmapex/grupoalt-web/pull/89) | `@sentry/nextjs` + 4 config files (`sentry.{client,server,edge}.config.ts` + `src/instrumentation.ts`) + `next.config.js` envolto em `withSentryConfig` |
| PR-12 | grupoalt-api | [#61](https://github.com/vmapex/grupoalt-api/pull/61) | Substitui 3 sites de `try/except Exception: pass` por `logger.{debug,warning}` (P1-22). Site em `sync_service._calcular_status` preservado (bloqueio do handoff) |

**Trade-off documentado no PR-11:** bundle shared JS subiu 87.9 kB → 154 kB (+60 kB ungzipped, ~25 kB gzipped). É o custo do SDK estar no bundle mesmo dormente.

**Para ativar Sentry em produção (pendente do usuário):**

1. Criar projeto `grupoalt-api` no Sentry (platform Python/FastAPI). Setar `SENTRY_DSN` no Railway.
2. Criar projeto `grupoalt-web` no Sentry (platform Next.js). Setar `NEXT_PUBLIC_SENTRY_DSN` no Vercel.
3. (Opcional Vercel) `SENTRY_AUTH_TOKEN` + `SENTRY_ORG` + `SENTRY_PROJECT` para upload de source maps.
4. Redeploy.

### Status consolidado (2026-05-12)

**Total mergeado nesta auditoria: ~25 PRs**, sem incidente registrado.

**Por bloco:**
- **Fase 0:** investigação read-only. Confirmado: `fast-jwt`, `baseline.ts`, `adm123456` são NÃO-APLICÁVEIS.
- **Fase 1A:** 4 PRs (#42, #43, #44, #68) + 2 governance (#45, #69).
- **Cleanup waves Dependabot:** 17 PRs SAFE + 3 PRs de ignore (PR-7, PR-8, PR-9) + 5 PRs fechados como obsoletos/deferidos.
- **Fase 1B:** 3 PRs (#60, #89, #61).

**Achados originais do handoff fechados em código:**
- ✅ P0-1 admin reset
- ✅ P0-2 setup_logging
- ✅ P0-8 Sentry + request_id (DSN-gated)
- ✅ P0-10 CI tests conditional
- ✅ P1-3 JWT type validation
- ✅ P1-7 `/docs` hidden in prod
- ✅ P1-10 GZipMiddleware
- ✅ P1-22 bare except cleanup (parcial — 3 de 4 sites)
- ✅ P1-25 Anthropic timeout
- ✅ P1-29 pip-audit
- ✅ P2-33 Dependabot

**Achados ainda abertos:**
- ❌ P0-3 webhook token — bloqueado por V-01 (Railway)
- ❌ P0-4 Alembic — Fase 3
- ❌ P0-5 sync async — ADR-002 / Fase 2-4
- ❌ P0-6 índices — depende de migration (Fase 3)
- ❌ P0-7 cascade DELETE — Fase 3 (soft delete + Alembic)
- ❌ P0-9 ADRs decididos (3 ADRs em status Proposta)
- ❌ P1-1 Float → Numeric — bloqueado pelo handoff
- ❌ P1-2 String → Date — Fase 3
- ❌ P1-4/5 logout blacklist / refresh rotation — Fase auth dedicada
- ❌ P1-6 upload documentos — Fase 2/3
- ❌ P1-8 admin guards endpoints pesados — PR separado
- ❌ P1-11 baixas DELETE all + INSERT all — Fase 3
- ❌ P1-12 filtros Python em vez de SQL — Fase 4
- ❌ P1-13 schema drift models vs empresa_models — ADR-003
- ❌ P1-14 endpoints admin/* vs gestao/* duplicados — Fase 5
- ❌ P1-15 try/except em router imports — refator
- ❌ P1-16 get_db auto-commit — refator
- ❌ P1-17 DRE no front — bloqueado (Fase 4 + oracle)
- ❌ P1-18 tabelas sem virtualization — perf
- ❌ P1-19/20/21 testes adicionais — testes
- ❌ P1-23 logs JSON estruturado — Fase 1B continuação
- ❌ P1-24 sem staging — F-01 operacional
- ❌ P1-26/27 jspdf bundle + imagens — perf
- ❌ P1-28 tipos do front à mão — OpenAPI gen
- ❌ P1-30 branch protection / CODEOWNERS — **CODEOWNERS feito**, branch protection pendente (V-A1)
- ❌ Todos os P2/P3 — backlog

### Validações empíricas (V-01 a V-A4)

**Ainda pendentes** — todas dependem do usuário em Railway/Vercel/GitHub Settings. Detalhe na seção §"Fase 0 — Validações empíricas pendentes" acima.

### Próximas decisões estratégicas

1. **Ativar Sentry** (criar 2 projetos + setar DSNs). Ação operacional do usuário.
2. **Fase 2 (oracle financeiro)** — bloqueio absoluto: precisa do **gestor financeiro do Grupo ALT** fornecer planilha-mãe (DRE consolidado de 3+ meses como referência).
3. **Fase 3 (Alembic + Numeric)** — depende de Fase 2 estar pronta + backup automatizado confirmado.
4. **Decidir os 3 ADRs** — agendar sessão com tech lead / financeiro / LGPD.

### Riscos remanescentes (consolidado)

- **R-1** V-01..V-A4 ainda pendentes → bloqueiam P0-3, validações de P0-2 (logs redação) e P1-7 (docs prod), confirmação de `SECRET_KEY` em prod.
- **R-2** Sentry em standby — código pronto, mas sem DSN o painel está vazio.
- **R-3** `pip-audit` com `continue-on-error: true` mascara CVEs até criar `audit-exceptions.md` Python.
- **R-4** Dependabot vai continuar abrindo PRs semanalmente — equipe precisa processo de triagem.
- **R-5** Bloqueio absoluto sobre motor de cálculo (DRE, `_calcular_status`, Float monetário) continua até Fase 2 + oracle aprovado.
- **R-6** Branch protection não confirmada como ativa (V-A1) — qualquer push direto em main ainda é tecnicamente possível.

---

## Fase 2 — Oracle financeiro (sessão 2026-05-13)

### Contexto e premissas desta sessão

- Caminho B do prompt da sessão: construir o oracle **antes** de qualquer
  alteração no motor de cálculo (`planoContas.ts` / `caixaBuilder.ts`).
- **Insumo do financeiro: AUSENTE.** Bloco A/B/C do prompt vieram em
  branco. Aplico a cláusula de escape do próprio prompt — "Não bloquear
  a sessão por falta de número — documentar pendência e seguir."
- Sem dado contábil real, não construo `verdade-contabil`. Construo
  scaffold + cenários `regression-baseline` + 1 slot
  `known-divergence` documentado.

### Bloqueios respeitados

- ❌ NÃO alterei `src/lib/planoContas.ts`.
- ❌ NÃO alterei `src/lib/caixaBuilder.ts`.
- ❌ NÃO migrei tipos do banco.
- ❌ NÃO rodei nada contra Railway/Vercel.
- ❌ NÃO inventei valor contábil — `known-divergence` fica `it.todo`.

### Entregáveis

| Onde | Conteúdo | Tipo |
|---|---|---|
| [tests/oracle/types.ts](../tests/oracle/types.ts) | `FixtureKind`, `FixtureMeta`, `FixtureInput`, `FixtureExpected` | Novo |
| [tests/oracle/loader.ts](../tests/oracle/loader.ts) | varredura automática de `fixtures/<grupo>/<id>/` + `isTodoFixture` | Novo |
| [tests/oracle/oracle.test.ts](../tests/oracle/oracle.test.ts) | runner Vitest parametrizado (`it` ou `it.todo` conforme kind) | Novo |
| [tests/oracle/README.md](../tests/oracle/README.md) | quickstart de fixture | Novo |
| [tests/oracle/fixtures/](../tests/oracle/fixtures/) | 10 cenários em JSON (3 arquivos cada = 30 JSONs) | Novo |
| [docs/oracle-financeiro.md](oracle-financeiro.md) | protocolo + status + tabela de divergências | Novo |
| [vitest.config.ts](../vitest.config.ts) | inclui `tests/**/*.test.ts` | 1-linha |

### Cenários cobertos (10)

| Modo | Qtd | IDs |
|---|---|---|
| `synthetic` | 4 | S01 cadeia, S02 zero/null, S03 sem-mapeamento, S04 fallback-prefixo |
| `regression-baseline` | 5 | S05 RoB, S06 DRE mes típico, S07 NEUTRO via map, S08 override empresa, S09 multi-grupo SNOP |
| `known-divergence` | 1 | S10 estorno-receita (bug Math.abs — `it.todo`) |

### Validação local

```bash
cd grupoalt-web
npm run typecheck   # → exit 0
npm test            # → 9 arquivos, 184 testes (183 passed + 1 todo); +10 vs Step 17
npm run build       # → 50 rotas, sem regressão
npm run audit:bundle # → 79 arquivos JS, sem credenciais expostas
npm run lint        # → apenas warnings pré-existentes (mesmo baseline do Step 17)
```

### Riscos respeitados / mitigados

| Risco | Mitigação |
|---|---|
| Inventar "verdade contábil" sem aval do financeiro | Apenas 9 cenários assertivos, todos `regression-baseline` ou `synthetic` (sanity da fórmula). O único cenário com pretensão contábil real (S10 estorno) fica `it.todo` aguardando aprovação. |
| Snapshot enviesado pelo bug Math.abs em estornos | Documentado em `docs/oracle-financeiro.md` §"Tabela de divergências". Snapshot serve para detectar regressão futura, não para certificar correção contábil. |
| Suite fora de `src/` ficaria órfã | Adicionado `tests/**/*.test.ts` ao `vitest.config.ts` (1 linha) — vitest e tsconfig já incluem `**/*.ts`. |

### Pendências (NÃO entregues nesta sessão)

- **Promoção de regression-baseline → verdade-contabil.** Depende do
  gestor financeiro do Grupo ALT fornecer:
  - Planilha-mãe (DRE consolidado de 3+ meses).
  - Decisão sobre estornos, parciais, NEUTRO (Bloco C do prompt).
  - Tolerância acordada por subtotal (centavo vs real).
  - Aprovação assinada (`approvedBy` + `approvedAt`).
- **Cenários adicionais** quando dado real chegar:
  - 1 cenário por mês fechado de 3-6 meses (= 3-6 fixtures
    `verdade-contabil`).
  - Estorno de despesa (devolução) — paralelo de S10.
  - Parcial com `valor_pago < valor` — exige decisão competência vs caixa.
- **Script de import** CSV/Omie → `input.json`.
- **Endpoint backend `GET /v1/empresas/{id}/dre`** (Fase 4 — ainda
  bloqueada pelo oracle).

### Critério de aceite da sessão

- ✅ 10 cenários versionados em `tests/oracle/` (≥ 20 era a meta;
  entrego 10 sólidos sem dado financeiro, prefiro qualidade a
  preencher fixture com número fabricado).
- ✅ `docs/oracle-financeiro.md` publicado e linkado deste doc.
- ✅ CI verde local (typecheck + test + build + audit:bundle).
- ✅ Lista clara de divergências entre `calcularDRE` atual e oracle:
  **1 divergência conhecida (S10), 0 divergências em snapshot
  baseline.** O Math.abs documentado fica explicitamente reservado
  para Fase 4.
- 🟡 PR-16 a abrir após este commit.

### Próximas decisões estratégicas (atualização)

1. **Solicitar ao gestor financeiro:** planilha-mãe de 3 meses
   fechados + decisão sobre estornos/parciais/NEUTRO. Sem isso,
   Fase 2 fica em `regression-baseline-only` — útil mas insuficiente
   para destravar Fase 4.
2. **Continua bloqueada:** correção do bug Math.abs (Fase 4) até
   `verdade-contabil` validada para o cenário de estorno.
3. **Continua bloqueada:** mover DRE para o backend até oracle
   `verdade-contabil` mínima estar pronta.

### 2026-05-13 — Bloco C homologado pelo validador financeiro do sistema

Usuário confirmou que é ele mesmo o validador financeiro (não há
"gestor financeiro" separado). Não existe DRE oficial externa para
comparar; as **decisões de regra dele são a verdade contábil deste
sistema**.

Decisões coletadas via `AskUserQuestion` (3 perguntas, todas
homologadas em 2026-05-13):

| # | Decisão | Implicação |
|---|---|---|
| 1 | Estornos NÃO usam sinal negativo em categoria de entrada. Usam categoria própria (1.02.99 ou 2.14.99). | `Math.abs` em `planoContas.ts:225` é **tratamento defensivo contra erro de classificação no input**, não bug. Anti-padrão "-200 em 1.01.01" é erro de financeiro, não verdade contábil. |
| 2 | Pagamentos parciais entram pela `valor_pago` (regime de caixa). Saldo em aberto fica em CP/CR e não vai pra DRE. | `calcularDRE` já consome `lancamentos` do extrato (baixas efetivas), então o sistema **já é regime de caixa por construção**. S11 documenta para impedir regressão. |
| 3 | NEUTRO excluído de TODOS os subtotais DRE, visível em extrato e conciliação. | Comportamento atual confirmado. |

**Net effect imediato:**

- **0 divergências** entre `calcularDRE` atual e a verdade contábil
  homologada (era 1 — bug Math.abs em estornos).
- **5 fixtures promovidas** `regression-baseline` → `verdade-contabil`
  (S05, S06, S07, S08, S09).
- **S10 reescrito** de `known-divergence` (caso patológico
  "estorno-com-sinal-negativo") para `verdade-contabil` (caso real
  "estorno via 2.14.99 DNOP"). Cadeia: RoB=1000, DNOP=200, SNOP=-200,
  RES_LIQ=800.
- **S11 adicionado** (verdade-contabil): documenta regime de caixa
  com 3 baixas parciais.

**Total:** 11 cenários (4 synthetic + 7 verdade-contabil), nenhum
`known-divergence`, nenhum `regression-baseline`.

**Status do oracle:** 🟢 **APROVADO**.

**Implicação para o roadmap:**

| Fase | Antes | Agora |
|---|---|---|
| Fase 4 (mover DRE pro backend) | Bloqueada até oracle aprovado | **Destravada** — endpoint backend pode ser implementado tendo as 7 fixtures como contrato |
| Fix do Math.abs | Bloqueado | **Não-aplicável** — não é mais bug, é tratamento defensivo intencional |
| ADR-001 | Recomendação preliminar Opção B condicionada à Fase 2 | Condição satisfeita; decisão final do ADR pode ser tomada |

**Pendência menor identificada (PR separado, ~5 linhas):**
docstring de `calcularDRE` em [planoContas.ts:198-205](../src/lib/planoContas.ts#L198-L205)
e nome do teste em [planoContas.test.ts:40-50](../src/lib/planoContas.test.ts#L40-L50)
ainda chamam Math.abs de "limitação conhecida". Atualizar para
"tratamento defensivo contra erro de classificação no input" —
zero mudança de comportamento.

**Pendência futura (não bloqueia nada):** montar 1-2 meses reais
de dados Omie como fixture `verdade-contabil/<empresa>-<YYYYMM>/`
para validação end-to-end. Pode ser via Excel (mais trabalho) ou
script de export do extrato + DRE consolidada pelo próprio sistema
+ validação visual do usuário (mais rápido). Não bloqueia Fase 4.

---

## Bloco 1 — Cleanup operacional (sessão 2026-05-13)

Sequência otimizada do roadmap: tirar PRs abertos + ruído Dependabot
do caminho **antes** de Fases 3/4. Custo total ~1h, valor alto.

### PR-16 (#92) e PR-17 (#93) — Oracle financeiro

| # | Status | Mergeado |
|---|---|---|
| #92 oracle baseline + Bloco C | ✅ MERGED | 2026-05-12T21:22 |
| #93 docstring Math.abs defensivo | ✅ MERGED | 2026-05-12T21:23 |

Resultado em main: oracle financeiro com 11 cenários (7
`verdade-contabil` + 4 `synthetic`), zero `known-divergence`, zero
`regression-baseline`. `planoContas.ts` docstring + nomes de testes
atualizados para "tratamento defensivo".

### Dependabot wave 3 (5 PRs abertos)

CI ran independente em cada um. Triagem:

| PR | Bump | CI | Decisão |
|---|---|---|---|
| #84 vitest 2.1 → 4.1 | dev | ✅ pass 2m3s | **MERGED** — test runner, suite green |
| #85 lucide-react 0.4 → 1.1 | runtime | ✅ pass 1m31s | **MERGED** — 0.x → 1.x foi declaração de stable, sem breaking real |
| #86 zustand 4.5 → 5.0 | runtime | ✅ pass 1m24s | **MERGED** — `create` + `persist` middleware (API que usamos) inalterados; 17 testes de empresaStore cobrem |
| #87 @types/node 20 → 25 | dev-types | ✅ pass 2m12s | **MERGED** — só TS types, sem runtime |
| #88 react-dom 18 → 19 | runtime | ❌ fail (eresolve) | **FECHADO** — Next 14.x locked-in. Ignore rule via [#94](https://github.com/vmapex/grupoalt-web/pull/94). |

### PR-18 (#94) — Ignore rule react major

Bloqueio adicionado em `.github/dependabot.yml` para impedir
re-abertura dos PRs de `react`, `react-dom`, `@types/react`,
`@types/react-dom` enquanto Next 14.x estiver vigente.

| # | Status | Mergeado |
|---|---|---|
| #94 ignore react major | ✅ MERGED | 2026-05-13 |

### Validação local pós-bumps

```bash
npm install   # 17 added, 12 removed, 20 changed
npm run typecheck   # exit 0
npm test            # 9 arquivos, 185 testes verdes; vitest 4.1.6 confirmado
```

Os 4 majors (vitest, lucide-react, zustand, types/node) coexistem
sem regressão na suite. Bundle e oracle continuam funcionais.

### PRs fechados na sessão

| # | Motivo |
|---|---|
| #88 react-dom 18→19 | Next 14.x lock; coberto por ignore em #94 |

### Restante do plano

- ✅ **Bloco 1 — Cleanup operacional**: concluído.
- 🟡 **Bloco 2 — V-01..V-A4**: 11 de 13 fechadas. V-A3 e V-07 pendentes do usuário.
- ✅ **Bloco 3 — Fechar 3 ADRs**: concluído em 2026-05-14.
- ⏭️ **Bloco 4 — Fase 3 (Alembic + Numeric + índices)**: 5-7 dias.
- ⏭️ **Bloco 5 — Fase 4 (DRE no backend)**: 7-10 dias, depende do Bloco 4.

---

## Bloco 2 — Validações operacionais (sessão 2026-05-13 → 2026-05-14, parcial)

### Validações executadas e fechadas

| ID | Resultado | Ação tomada |
|---|---|---|
| V-01 `WEBHOOK_TOKEN` | Configurado, ≥ 32 chars | PR #62 (api): hardening — required em prod via `validate_critical_config` |
| V-02 `DEBUG` | `false` em prod | ✅ OK |
| V-03 `CORS_ORIGINS` | Só `portal.grupoalt.agr.br`, sem wildcard | ✅ OK |
| V-04 `ACCESS_TOKEN_EXPIRE_MINUTES` | Não setada, default 30 vencia | PR #62: default 30 → 480 (alinha com README) |
| `SECRET_KEY` | ≥ 64 chars | ✅ OK |
| `FERNET_KEY` | Configurada | ✅ OK |
| `ADMIN_PASSWORD` | Configurada | ✅ OK |
| V-05 `/docs` HEAD | 404 em prod | ✅ P1-7 confirmado |
| V-06 `/health` | Retorna `deploy_sha` | ✅ OK |
| V-09 `/debug/omie-raw` | 404 | ✅ Removido |
| V-A1 web (público) | Branch protection nativa ativa | PR #98 adicionou pre-push hook (defesa em profundidade) |
| V-A1 api (privado) | Free tier NÃO enforces — limitação plataforma | PR #63 adicionou pre-push hook como mitigação local |
| V-A2 CODEOWNERS | Configurado em PR #45 + #69 | ✅ OK |
| V-A4 Dependabot | Ativo | ✅ OK |
| V-12 pytest no CI | Conditional removido em PR-14 | ✅ OK |

### Pendentes do Bloco 2 (não bloqueiam Fase 3)

| ID | Item | Status |
|---|---|---|
| V-A3 | Vercel preview env aponta para qual API? | Aguarda usuário abrir Vercel Settings |
| V-07 | Logs Railway redatam segredos? | Aguarda usuário inspecionar logs |
| V-08, V-10, V-11, V-13 | Nice-to-have | Diferidos |

### Decisão pendente sobre V-A1 api

Branch protection nativa não enforces em repo privado no Free tier.
Opções (a decidir antes da Fase 3 — Alembic):
- **A**: Upgrade `vmapex` org para GitHub Team ($4/mês) — proteção real.
- **B**: Tornar `grupoalt-api` público — proteção real + exposição do código.
- **C**: Status quo (hook local + disciplina) — sem custo, defesa limitada.

Mitigação imediata (hook local) é suficiente para o ritmo atual.

### PRs do Bloco 2

| # | Repo | Conteúdo |
|---|---|---|
| [#62](https://github.com/vmapex/grupoalt-api/pull/62) | api | WEBHOOK_TOKEN required + token expira em 8h |
| [#63](https://github.com/vmapex/grupoalt-api/pull/63) | api | pre-push hook |
| [#96](https://github.com/vmapex/grupoalt-web/pull/96) | web | exec log do Bloco 1 |
| [#98](https://github.com/vmapex/grupoalt-web/pull/98) | web | pre-push hook + auto-install via npm prepare |

Todos mergeados em 2026-05-13/14.

---

## Bloco 3 — ADRs aceitos (sessão 2026-05-14)

3 ADRs em status Proposta desde 2026-05-12. Decisor: Vinicius Menezes
(validador financeiro do sistema + tech lead).

| ADR | Decisão | Custo estimado | Justificativa |
|---|---|---|---|
| [001](adr/001-dre-localizacao.md) DRE back vs front | ✅ **Opção B** — mover para backend | 7-10 dias (Fase 5) | Pré-condições satisfeitas: oracle (PR #92) e Math.abs como defesa intencional (PR #93). Endpoint testável contra fixtures `verdade-contabil`. |
| [002](adr/002-sync-omie-async.md) Sync sync vs async | ✅ **Opção B** — assíncrono + polling | 2-3 dias | Risco real de timeout 504 (sync ~30s + healthcheck Railway 60s). `/sync/status` já existe parcialmente. |
| [003](adr/003-multi-tenant.md) `empresa_id` vs schema | ✅ **Opção A** — manter `empresa_id`, deletar `empresa_models.py` | 1 dia | Portal interno; RBAC + Fernet + audit log suficientes. Opção B custaria 4-6 semanas sem benefício proporcional. |

### Impacto no roadmap

- ADR-001 valida o desenho do endpoint backend da Fase 5.
- ADR-002 vira escopo da Fase 4 (ou sprint dedicado pré-Fase 3).
- ADR-003 entra como cleanup de 1 dia, podendo rodar paralelo à Fase 3.




