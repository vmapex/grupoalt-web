# ADR-002 — Sync Omie síncrono vs assíncrono

- **Status:** ✅ Aceito (2026-05-14)
- **Data proposta:** 2026-05-12
- **Data aceite:** 2026-05-14
- **Decisor:** Vinicius Menezes (tech lead + ops)
- **Áreas afetadas:** backend (app/routers/, app/services/sync_service.py), frontend (loading states + polling)

## Contexto

Quando uma empresa tem o banco vazio (primeiro acesso, nova
empresa cadastrada), os endpoints `dashboard`, `extrato` e `cp_cr`
disparam **sync síncrono** à Omie **dentro do próprio request HTTP**:

- [app/routers/dashboard.py:140-152](../../../grupoalt-api/app/routers/dashboard.py#L140-L152)
- [app/routers/extrato.py:71-80](../../../grupoalt-api/app/routers/extrato.py#L71-L80)
- [app/routers/cp_cr.py:229-232](../../../grupoalt-api/app/routers/cp_cr.py#L229-L232)

O sync chama `sync_cp + sync_cr + sync_contas_correntes` em loop à
API Omie. Tempo típico observado: ~30s. **Healthcheck Railway: 60s.**

Existe risco real (não realizado, mas documentado) de timeout no
primeiro acesso, deixando o usuário com erro 504 enquanto a
sincronização ainda roda em background — sem feedback de progresso.

Histórico relevante:
- Sync agendado existe via APScheduler em
  [app/main.py:241-270](../../../grupoalt-api/app/main.py#L241-L270),
  rodando a cada 60min.
- Endpoint manual `POST /sync/empresas/{id}` também existe.
- Webhook Omie em [app/routers/webhook.py](../../../grupoalt-api/app/routers/webhook.py)
  já dispara sync incremental para eventos pontuais.

## Opções consideradas

### Opção A — Manter síncrono

- **Vantagens:**
  - "Funciona miraculosamente" no primeiro acesso (zero clique).
  - Sem refator no front.
- **Desvantagens:**
  - Bloqueia o request por até 30s.
  - Pode estourar timeout Railway (60s).
  - UX inaceitável para volumes grandes.
- **Custo de migração:** zero.

### Opção B — Migrar para assíncrono com polling

- **Vantagens:**
  - Sem bloqueio: response imediato.
  - Status rastreável (`GET /sync/status?empresa_id=X` já existe
    parcialmente).
  - Backend pode paralelizar fetches Omie.
- **Desvantagens:**
  - Requer UI nova no front ("Sincronizando... 3/7 etapas").
  - Estado pode dessincronizar (DB tem dados parciais, UI mostra
    "ok"). Mitigável com lock de empresa.
- **Custo de migração:** 2-3 dias (Fase 2-4 do handoff).

### Opção C — Pré-sync no momento do cadastro da empresa

- **Vantagens:**
  - Quando admin cadastra empresa nova, dispara sync em background
    imediatamente; quando usuário fizer login, dados já estão lá.
  - Não precisa mudar fluxo de leitura.
- **Desvantagens:**
  - Não resolve casos de "DB vazio por outro motivo" (cache flush,
    rebuild, primeira execução pós-deploy de schema novo).
  - Continua precisando do polling para casos de erro.
- **Custo de migração:** 1 dia + cobertura de edge cases.

## Decisão

**✅ Opção B — Migrar para assíncrono com polling.**

Implementação faseada:

1. Backend marca sync como background task (FastAPI BackgroundTasks
   ou job APScheduler imediato).
2. Endpoint `GET /sync/status?empresa_id=X` retorna estágio atual
   (já existe parcialmente em [app/routers/sync.py](../../../grupoalt-api/app/routers/sync.py)).
3. Front detecta DB vazio (response 200 + flag `sync_pending`) e
   exibe loading state com polling em 5s.

Opção C (pré-sync no cadastro) NÃO incluída agora. Resolve um caso
específico mas não cobre cache flush / rebuild / primeira execução
pós-deploy de schema novo. Pode entrar depois como otimização se
medirmos friction real.

## Consequências

### Positivas

- Resolve P0-5 do handoff.
- Garante que healthcheck Railway nunca seja afetado por sync.
- Abre porta para mostrar progresso real (UX "3/7 etapas").

### Negativas / aceitas

- Mais código no front (loading state + polling — 1 hook + 1 componente).
- Estado intermediário visível (parcial → completo).
- ~2-3 dias de refator (parte do roadmap pré-Fase 3 ou paralelo).

### Mitigações

- Endpoint `/sync/status` já retorna estágios; basta padronizar
  shape e usar.
- Lock de sync por empresa para evitar duplo trigger.

## Links

- Handoff: [docs/AUDITORIA_HANDOFF_PRODUCTION_READY.md](../AUDITORIA_HANDOFF_PRODUCTION_READY.md) §4 (P0-5)
- Issue de discussão: _criar antes da decisão_
- Código relacionado:
  - [app/services/sync_service.py](../../../grupoalt-api/app/services/sync_service.py)
  - [app/routers/sync.py](../../../grupoalt-api/app/routers/sync.py)
