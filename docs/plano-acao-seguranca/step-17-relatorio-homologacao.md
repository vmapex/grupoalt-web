# Step 17 — Relatorio de Homologacao Final

> Data: 2026-05-06
> Branch: `claude/step-17-gIfDu` (api + web)
> Responsavel: Engenharia
> Versao do plano: consolidacao dos Steps 01-16

## Resumo executivo

O portal Grupo ALT esta tecnicamente apto para producao. Todas as
validacoes automatizadas passaram, RBAC backend validado em codigo e
testes, guardas frontend ativos, CSP com nonce dinamico, empresa ativa
isolada por sessao, plano de contas com overrides + NEUTRO funcional, e
o Orbit IA respeita politica LGPD com auditoria, rate limit, system
prompt blindado e retencao 90d.

**Decisao tecnica: GO** — sujeita ao cumprimento do checklist
operacional (manual, deploy controlado, monitoramento) descrito na
Secao 8.

## 1. Validacoes automatizadas

### grupoalt-api

| Comando | Resultado |
|---|---|
| `pytest tests/ --asyncio-mode=auto` | **123/123 verde** (~7.8s) |

Cobertura por arquivo:

- `test_integration.py` — fluxos end-to-end (auth, sync, dashboard).
- `test_orbit_audit.py` — 20 testes (Step 16 Fase C).
- `test_orbit_policy.py` — 14 testes (Step 16 Fase A).
- `test_orbit_router.py` — chat e classificacao.
- `test_rbac.py` — Step 06 (cross-tenant fix).
- `test_schema_manager.py` — schemas per-empresa.
- `test_security.py` — JWT, bcrypt, Fernet.

### grupoalt-web

| Comando | Resultado |
|---|---|
| `npm run typecheck` | **OK** (sem erros TS) |
| `npm run lint` | **OK** (apenas warnings de `react-hooks/exhaustive-deps` e `no-img-element` — Step 15 nao bloqueia em warnings) |
| `npm test` (vitest) | **174/174 verde** em 8 arquivos (~3.2s) |
| `npm run build` | **OK** — 50 rotas, middleware 26.8kB |
| `npm run audit:bundle` | **OK** — nenhuma credencial exposta em 79 arquivos JS |
| `npm audit --omit=dev --audit-level=high` | 2 vulnerabilidades — **ambas com excecao formal** em [`audit-exceptions.md`](./audit-exceptions.md) (EXC-001 Next 14.x, EXC-002 postcss transitivo) |

Distribuicao dos 174 testes web:

- `planoContas.test.ts` — 26 testes (Step 13 + 14).
- `caixaBuilder.test.ts` — 27 testes.
- `transformers.test.ts` — 33 testes.
- `chatHelpers.test.ts` — 24 testes (Step 16 Fase B).
- `empresaStore.test.ts` — 17 testes (isolamento entre sessoes).
- `api.test.ts` — 13 testes (interceptor auth).
- `access.test.ts` — 29 testes (RBAC frontend).
- `useAPI.test.ts` — 5 testes (paginacao).

## 2. Auth (Step 07)

| Item | Estado |
|---|---|
| `POST /v1/auth/login` | OK — JWT em cookies httpOnly (access 30min, refresh 7d) |
| `POST /v1/auth/refresh` | OK — endpoint dedicado, sem race condition no interceptor |
| `POST /v1/auth/logout` | OK — limpa cookies, invalida sessao |
| `GET /v1/auth/me` | OK — retorna usuario + empresas + permissoes |
| Falha de refresh nao trava UI | OK — interceptor com flag `_retry`, redirect para `/login` em 401 nao-recuperavel |
| Usuario sem sessao redirecionado | OK — `requireAuth` no `portal/layout.tsx` |

## 3. RBAC (Step 06)

| Item | Estado |
|---|---|
| Backend bloqueia cross-tenant | OK — `tests/test_rbac.py` cobre, dependencia `get_empresa_ctx` valida usuario tem acesso a empresa |
| Admin-only endpoints | OK — `get_current_admin` em `admin.py`, `gestao.py`, `permissoes.py`, `orbit.py::audit*` |
| Permissao por acao | OK — modelo `Permissao` (escopo + acao), enforcement no router |
| Frontend esconde acoes | OK — `lib/access.ts` (29 testes) + `useRequireAdmin` |
| Chamada direta retorna 403 | OK — testado em `test_rbac.py::test_user_cannot_access_other_empresa` |

## 4. Empresa ativa (Step 11)

| Item | Estado |
|---|---|
| Fonte unica de verdade | OK — `empresaStore.activeId` com persist Zustand |
| Validacao contra empresas do usuario | OK — `setActive` rejeita id invalido; `syncFromAuth` descarta se nao pertence ao novo user |
| Reset em logout | OK — `authStore.logout` chama `empresaStore.reset` |
| Sem fallback `1` | OK — `useEmpresaId` retorna `null` quando nao ha empresa, consumidores tratam |
| Isolamento entre sessoes | OK — 17 testes em `empresaStore.test.ts`, cenario explicito de logout-A/login-B |

## 5. BI (Step 13 + 14)

| Tela | Estado |
|---|---|
| Dashboard Executivo | OK — `horizonte_dias=30`, sortByMonthYear, useExtrato sem datas para "Ultimas Movimentacoes" |
| Caixa/DRE | OK — `Math.abs` documentado (Parte B), 14 testes golden, `calcularDRE` aceita map dinamico |
| Extrato | OK — leitura PostgreSQL, saldos por conta com sinal, plano dinamico via `useCategoriasMap` |
| CP/CR | OK — `useCPAll`/`useCRAll` paginam ate esgotar (sem truncamento), NF/PA expostos |
| Fluxo | OK — `horizonte_dias` parametro explicito, saldo projetado parte do `saldoAtualExtrato` |
| Conciliacao | OK — heatmap + multi-bank filter + calendar toggle |
| NEUTRO funcional | OK — exclui de RNOP/DNOP, mantem em audit, integrado em `calcularDRE`, `caixaBuilder`, AnaliseIA |

## 6. Admin (Step 06 + 13 + 16)

| Pagina | Estado |
|---|---|
| `/admin` Empresas | OK — CRUD empresas, logos |
| `/admin/categorias` | OK — overrides individual + bulk + sync sincrono |
| `/admin/contas-bancarias` | OK |
| `/admin/orbit` (NOVO Step 16C) | OK — KPIs + ranking + tabela paginada de auditoria |
| Sub-nav unificada | OK — 4 paginas admin com mesmo navigator |
| RBAC: viewer recebe 403 | OK — testes pytest cobrem |

## 7. Orbit (Step 16 — Fases A + B + C)

| Item | Estado |
|---|---|
| Tabela `orbit_audit_log` (sem conteudo) | OK — apenas metadados, indices em (usuario_id), (empresa_id), (request_id) |
| Rate limit 30 req/min/user | OK — Redis-backed, retorna 429 com `Retry-After` |
| Limites de payload (Pydantic) | OK — 1..20 mensagens, content 1..4000 chars, role `user|assistant`, financial_context max 4000 chars |
| System prompt blindado | OK — 6 regras anti prompt-injection + marcadores `<<< INICIO/FIM DOS DADOS >>>` |
| Auditoria em todos os caminhos | OK — `success`/`forbidden`/`not_found`/`usage_exceeded`/`error` |
| Endpoint admin `GET /v1/orbit/audit` | OK — paginado, filtros (usuario, empresa, status, desde_dias 1..90), join com nomes |
| Endpoint admin `GET /v1/orbit/audit/summary` | OK — totais, by_status, top_users (5), top_empresas (5), avg_duracao_ms |
| Job APScheduler de retencao 90d | OK — `purge_orbit_audit` diario (`ORBIT_AUDIT_PURGE_INTERVAL_HOURS=24`, `ORBIT_AUDIT_RETENTION_DAYS=90`) |
| ChatPanel hardening (cliente) | OK — `validateOutgoing` + `trimHistoryForApi` + `describeAxiosError` + 24 testes |
| Indisponibilidade nao quebra portal | OK — `kind=unavailable` em 5xx/network, banner info cinza, portal segue normal |
| Politica documentada | OK — `orbit-policy.md` v1.0 + LGPD |

## 8. CSP / headers (Step 10)

| Item | Estado |
|---|---|
| `script-src` sem `'unsafe-eval'` em prod | OK — Step 10 Fase 3 |
| `script-src` sem `'unsafe-inline'` em prod | OK — Step 10 Fase 4 (nonce dinamico via middleware) |
| `connect-src` restrito | OK — apenas API URL configurada |
| Strict-Transport-Security | OK — 2 anos, includeSubDomains, preload |
| X-Frame-Options DENY | OK |
| X-Content-Type-Options nosniff | OK |
| Referrer-Policy | OK |

## 9. Operacional — pendente para deploy

> Esta secao cobre o que **nao pode ser validado em CI** e exige acao
> humana. Marcar concluido apos cada deploy.

- [ ] Snapshot do banco de producao (rollback < 15min se necessario).
- [ ] Deploy primeiro em preview/staging (Vercel preview + Railway
      staging), validacao com 2+ usuarios de teste antes de promover.
- [ ] Janela de deploy comunicada ao cliente (preferir fora de horario
      comercial).
- [ ] Monitoramento ativo por **1h** apos deploy (Vercel logs + Railway
      logs + Sentry).
- [ ] Canal de suporte definido (WhatsApp + email) e responsavel de
      plantao agendado.
- [ ] Marcar categorias de repasse como NEUTRO em producao
      (`/bi/financeiro/admin/categorias` -> bulk-edit).
- [ ] Validar com financeiro/controladoria que RNOP/DNOP ficam limpos
      apos a marcacao NEUTRO.
- [ ] Validacao manual dos fluxos criticos:
  - login admin + comum;
  - troca de empresa em ambos;
  - criar/aprovar/publicar documento;
  - exportar PDF (extrato, CP, CR);
  - chat Orbit dentro do limite e excedendo (ver mensagens UX);
  - admin/orbit visualiza auditoria.

## 10. Riscos residuais aceitos

### R-01 — Next 14.x com 5 advisories high

- **Impacto:** DoS / smuggling em cenarios self-hosted; nao se aplicam
  a Vercel.
- **Probabilidade:** baixa.
- **Mitigacao:** hospedagem Vercel + CSP restritiva + rate limit
  backend.
- **Dono:** Vinicius Menezes (@VinnyMMHH).
- **Prazo de correcao:** ate 2026-07-31 (issue #56).
- **Motivo de aceitacao:** upgrade para Next 16 e breaking change e
  exige ciclo de regressao proprio (step dedicado).

### R-02 — postcss <8.5.10 (transitivo)

- **Impacto:** XSS via Stringify em CSS; portal nao gera CSS dinamico
  a partir de input do usuario.
- **Probabilidade:** baixa.
- **Mitigacao:** postcss roda apenas em build-time.
- **Dono:** herda de R-01.
- **Prazo:** resolve junto com upgrade do Next.

### R-03 — Estornos com sinal contrario inflam DRE (Step 13 Parte B)

- **Impacto:** indicadores podem mostrar valores inflados em meses com
  estornos.
- **Probabilidade:** media (depende do volume de estornos).
- **Mitigacao:** 14 testes golden capturam comportamento atual; mudanca
  da regra requer validacao com financeiro/controladoria.
- **Dono:** controladoria do cliente.
- **Prazo:** sem prazo fixo — depende de decisao contabil.
- **Motivo de aceitacao:** mudanca pode quebrar reconciliacao com Omie;
  preferimos manter consistencia com fonte de verdade ate ter aceite
  formal do financeiro.

## 11. Plano de rollback

1. **Frontend (Vercel):** rollback instantaneo via dashboard Vercel
   ("Rollback to previous deployment"). Tempo: <2min.
2. **Backend (Railway):** rollback via Railway UI para ultimo deploy
   verde. Tempo: <5min.
3. **Banco (PostgreSQL Railway):** schema migrations sao todas
   `IF NOT EXISTS` e nao destrutivas — rollback nao requer reverter
   schema. Em caso de corrupcao de dados, restore do snapshot pre-deploy
   (passo 9 do checklist operacional). Tempo: 15-30min.
4. **Cookies/sessoes:** sem mudanca de SECRET_KEY ou FERNET_KEY,
   sessoes ativas continuam validas. Se for necessario invalidar todas,
   rotacionar SECRET_KEY (forca todos a re-login).

## 12. Decisao Go/No-Go

### Criterios obrigatorios

| Criterio | Estado |
|---|---|
| Sem high/critical em audit de producao sem excecao formal | OK |
| RBAC backend validado | OK |
| Guardas frontend implementados | OK |
| Empresa ativa consistente | OK |
| Testes cobrem regras criticas | OK (123 backend + 174 frontend) |
| CI bloqueia regressao | OK (Step 15) |
| Politica LGPD escrita | OK (`orbit-policy.md` v1.0) |
| Plano de rollback definido | OK (Secao 11) |

### Decisao

**GO TECNICO** — codigo apto para producao na branch
`claude/step-17-gIfDu` (api + web). Falta apenas:

1. Cumprir o checklist operacional da Secao 9 antes de cada deploy.
2. Validacao com usuarios reais em staging.
3. Aceite formal do plano de rollback pelo dono do produto.

Em caso de qualquer falha durante a janela de monitoramento de 1h, o
plano de rollback (Secao 11) deve ser executado imediatamente sem
discussao adicional.
