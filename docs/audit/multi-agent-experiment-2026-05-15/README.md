# Experimento multi-agentes ADR-002 (2026-05-15)

Primeira execução do padrão "3 dev-agents paralelos + 1 audit-agent" no plano
de auditoria. Trabalho: migrar 3 endpoints residuais do ADR-002
(`fluxo_caixa`, `conciliacao`, `cp_cr` resumos) do sync síncrono inline para
`trigger_async_sync_if_idle`.

## PRs gerados

| PR | Arquivo | Branch | Status CI | Score audit |
|---|---|---|---|---|
| [api #70](https://github.com/vmapex/grupoalt-api/pull/70) | cp_cr.py (resumos) | feat/adr-002-followup-cp-cr-resumos | ✅ | 100/100 |
| [api #71](https://github.com/vmapex/grupoalt-api/pull/71) | fluxo_caixa.py | feat/adr-002-followup-fluxo-caixa | ✅ | 95/100 |
| [api #72](https://github.com/vmapex/grupoalt-api/pull/72) | conciliacao.py | feat/adr-002-followup-conciliacao | ✅ | 100/100 |

Recomendação do auditor: **APPROVE todos os 3**.

## Custo

- Wall clock: ~50min (3 devs paralelos, tempo dominado pelo mais lento) + ~14min (auditor) = ~65min
- Token usage: ~430K total (3 devs + 1 auditor)

## Achados críticos do experimento

### Bug do framework: `isolation: worktree` não funcionou como esperado

Os 3 dev-agents foram despachados via `Agent` tool com `isolation: "worktree"`.
Reportaram que o working tree **não estava isolado** — os 3 trabalharam no
mesmo checkout, com branches sendo trocadas no meio das operações.

Contorno aplicado pelos agentes: criaram seus próprios worktrees via
`git worktree add ../grupoalt-api-<task>`. Custou tempo extra
(~10-20min por agente).

**Ação**: nas próximas rodadas, criar worktrees manualmente antes de
despachar, OU rodar agentes em sequência se isolamento real não existir.

### Bug do framework: classifier bloqueou audit-agent de postar reviews

Apesar do prompt autorizar explicitamente `gh pr review --approve` e
`gh pr comment`, o classifier auto-mode bloqueou as duas operações com
mensagem "external-system writes em PRs que o agente não criou".

**Ação**: auditor entrega os bodies em texto; humano posta manualmente
ou via foreground (eu).

### Anti-padrão da metodologia: conflito por arquivo de teste compartilhado

Após mergear PR #70 em main, os PRs #71 e #72 entraram em CONFLITO em
`tests/test_sync_pending_flag.py`. Causa: os 3 agentes adicionaram seus
testes no **mesmo arquivo, no mesmo ponto** (final). Quando o primeiro
mergeou, os outros 2 ficaram com versão antiga do arquivo.

Não é conflito lógico — todos os testes são complementares — mas git
detecta como "duas mudanças na mesma região".

**Resolução nesta sessão**: rebase manual + accept both + force-push.
Custou ~15min extra após o merge.

**Lições para próximas rodadas**:

1. **Quando paralelizar, agentes devem editar APENAS arquivos exclusivos**.
   Arquivo de teste compartilhado = anti-padrão garantido.

2. **Padrão recomendado**: cada agente cria SEU PRÓPRIO arquivo de teste
   (ex.: `tests/test_sync_pending_fluxo_caixa.py`,
   `tests/test_sync_pending_conciliacao.py`). Resultado: zero conflito.

3. **Alternativa**: mergear todos os PRs sequencialmente sem deixar
   nenhum "vencer" — mas isso elimina parte do ganho de paralelismo.

4. **Brief deve ter regra explícita**: "se precisar criar teste,
   crie em arquivo novo dedicado".

## Drift cruzado (auditor)

1. **PR #70** descarta retorno de `trigger_async_sync_if_idle`; PRs #71 e #72
   capturam em `triggered` e logam quando lock já tomado. Match com canônico:
   #71/#72 ✅, #70 ⚠️ (não bloqueia).
2. **PR #71** incluiu rename `l → lc` em ~14 ocorrências (cleanup E741 piggyback).
   Disclosed no PR description. Inflou o diff sem violar escopo.
3. Imports, nomenclatura, fixtures de teste: **zero drift** nos 3 PRs.

## Avaliação da metodologia (3 dev-agents paralelos + 1 audit)

**O que funcionou:**
- Briefs idênticos com source-of-truth referenciado produziram código consistente.
- Auditor com matriz objetiva pegou inconsistências reais (nit do #70, piggyback do #71).
- Drift cruzado mínimo (3 pequenos achados, nenhum bloqueador).

**O que precisa ajuste:**
- Worktree isolation não é confiável (workaround manual obrigatório).
- Audit-agent precisa de mecanismo separado para postar reviews (ou foreground).
- Time-box estourado (60min target, real 35-50min nos devs + 14min audit).

**Recomendação para próximas fases:**
- Aplicar padrão em Fase 3 (Alembic + Numeric + índices) com 2-3 agentes paralelos
  para criação de índices (`CREATE INDEX CONCURRENTLY` em tabelas diferentes).
- Não aplicar em Fase 5 (DRE backend) sem oracle financeiro pronto — risco alto demais.
