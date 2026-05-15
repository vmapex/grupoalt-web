## Audit independente (Audit Agent ADR-002)

**Score: 100/100**
**Recomendação: APPROVE**

### Bloqueadores (todos passam)
- Escopo: apenas `app/routers/conciliacao.py` + `tests/test_sync_pending_flag.py` modificados.
- `app/services/sync_pipeline.py` não tocado.
- `app/services/sync_state.py` não tocado.
- `app/services/sync_service.py` não tocado.
- `tests/conftest.py` não tocado.
- `app/main.py` não tocado.
- CI: `lint-and-test` pass (2m4s).
- Endpoint não tem `?refresh=true` (disclosed corretamente no PR description); todos os paths preservaram contrato.

### Qualidade (todos passam)
- Trigger usa `trigger_async_sync_if_idle(empresa.id, background_tasks)`.
- Captura `triggered = await ...` + loga "sync já em andamento" (paridade com `dashboard.py` canônico).
- Helper `_get_lancamentos` mudou assinatura para retornar tuple `(lancamentos, sync_pending, sync_status_payload)` — mudança consistente, todos os 4 callers atualizados na mesma PR.
- Endpoints que retornam dict (`/resumo` e `/dia/{data}`) propagam `sync_pending` + `sync_status` no body.
- Endpoints que retornam list (`/movimentacao` e `/calendario`) preservam shape — variáveis prefixadas com `_` para sinalizar trigger silencioso intencional. Match com o padrão de `/contas` é correto: front detecta `[]` e consulta `/sync/status` separadamente.
- Guarda `not projeto_ids` mantida (evita disparar sync quando vazio = "unidade sem dados").
- Teste usa fixtures padrão (`fake_redis`, `neutralize_pipeline`, `empresa_vazia`).
- Teste verifica `body["sync_pending"] is True` e `body["sync_status"]["in_progress"] is True` no `/conciliacao/resumo`.
- PR description menciona ADR-002 + Bloqueios respeitados explicitamente.
- Diff minimal (apenas a assinatura do helper expandiu, justificadamente). Nenhum refactor não-relacionado.

### Observações
Implementação criteriosa: o tratamento diferenciado (dict propaga, list é silent trigger) reproduz o padrão canônico de `/contas` em vez de inflar payload de endpoints que o front consome como array puro. Decisão correta.
