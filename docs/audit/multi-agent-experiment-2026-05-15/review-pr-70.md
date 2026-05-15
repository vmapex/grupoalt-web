## Audit independente (Audit Agent ADR-002)

**Score: 100/100**
**Recomendação: APPROVE**

### Bloqueadores (todos passam)
- Escopo: apenas `app/routers/cp_cr.py` + `tests/test_sync_pending_flag.py` modificados.
- `app/services/sync_pipeline.py` não tocado.
- `app/services/sync_state.py` não tocado.
- `app/services/sync_service.py` não tocado.
- `tests/conftest.py` não tocado.
- `app/main.py` não tocado.
- CI: `lint-and-test` pass (2m31s).
- Path `?refresh=true` preservado (síncrono intencional).

### Qualidade (todos passam)
- Trigger usa `trigger_async_sync_if_idle(empresa.id, background_tasks)`.
- Response inclui `sync_pending=True` quando trigger acontece.
- `sync_status` populado via `build_sync_pending_payload(empresa.id, db)`.
- `ResumoKPIs` (Pydantic) ganhou ambos os campos como `Optional[...] = None`. Bom — não quebra clients existentes.
- Sem cache no endpoint, item N/A.
- Teste usa fixtures padrão (`fake_redis`, `neutralize_pipeline`, `empresa_vazia`).
- Teste verifica `body["sync_pending"] is True` e `body["sync_status"]["in_progress"] is True`.
- PR description menciona ADR-002 + Bloqueios respeitados explicitamente.
- Diff minimal (+74/-6), nenhum refactor não-relacionado.
- Simetria CP/CR: dois testes (cp_resumo e cr_resumo) cobrem ambos os endpoints migrados.

### Observações
- Nit (não-bloqueante): o exemplo canônico em `dashboard.py` captura o retorno de `trigger_async_sync_if_idle` (`triggered = await ...`) e loga "sync já em andamento" quando `not triggered`. Aqui o retorno é descartado. Não afeta correção (state ainda vem certo do `build_sync_pending_payload`), só perde uma linha de observabilidade.

Match com o padrão canônico (`app/routers/dashboard.py` ~140-152 e `cp_cr.py::listar_cp` já em main) está exato em nomenclatura de variáveis (`sync_pending`, `sync_status_payload`), estilo de import e idioma `sync_pending or None`.
