# Plano de Acao - Seguranca, Bugs e Hardening

Data: 2026-04-29

Este diretorio organiza o plano de acao do `grupoalt-web` em um arquivo por step, para que cada etapa possa virar uma tarefa, branch ou PR independente.

## Objetivo

Preparar o portal para ser o hub central do Grupo ALT, com foco em:

- seguranca de acesso;
- controle de permissoes;
- confiabilidade dos indicadores;
- reducao de bugs funcionais;
- governanca de deploy;
- testes e CI;
- protecao de dados e uso responsavel do Orbit IA.

## Principios de Execucao

1. Executar um step por vez.
2. Evitar misturar refactor, bugfix e hardening no mesmo PR.
3. Antes de alterar qualquer coisa, confirmar `git status --short --branch`.
4. Depois de cada step, rodar as validacoes indicadas no arquivo correspondente.
5. Nao confiar no frontend como unica barreira de seguranca.
6. Toda permissao sensivel precisa ser garantida pelo backend.
7. Mudancas de dependencia devem vir antes de endurecer o CI.
8. Mudancas de arquitetura devem vir depois das correcoes de seguranca e dados.
9. Toda etapa sensivel precisa ter rollback simples.
10. Se um segredo real ja foi exposto, remover do arquivo nao basta: e necessario rotacionar.

## Ordem Recomendada

| # | Step | Status |
|---|------|--------|
| 01 | [Baseline tecnico](./step-01-baseline-tecnico.md) | DONE — merged em `main` |
| 02 | [Staging e deploy seguro](./step-02-staging-deploy-seguro.md) | DONE — merged em `main` |
| 03 | [Ambiente, secrets e documentacao antiga](./step-03-ambiente-secrets-documentacao.md) | DONE — merged em `main` |
| 04 | [Dependencias vulneraveis](./step-04-dependencias-vulneraveis.md) | DONE — merged em `main` |
| 05 | [Lint e testes sem bloqueio inicial](./step-05-lint-test-foundation.md) | DONE — merged em `main` |
| 06 | [Auditoria RBAC backend](./step-06-rbac-backend.md) | DONE — `grupoalt-web` PR #38 + `grupoalt-api` PR #26 (cross-tenant fix) |
| 07 | [Interceptor de auth e sessao](./step-07-auth-interceptor-sessao.md) | DONE — `grupoalt-web` PR #39 (sem mudanca no backend) |
| 08 | [Guardas frontend](./step-08-guardas-frontend.md) | DONE — `grupoalt-web` PR #40 |
| 09 | [Notificacoes, exportacoes e rotas dinamicas](./step-09-notificacoes-exportacoes-rotas.md) | EM ANDAMENTO — branch `claude/readme-step-9-QRW5Z` (web + api) |
| 10 | [CSP e headers](./step-10-csp-headers.md) | TODO |
| 11 | [Empresa ativa](./step-11-empresa-ativa.md) | TODO |
| 12 | [Navegacao e dashboard legado](./step-12-navegacao-dashboard-legado.md) | TODO |
| 13 | [Calculos BI/DRE e paginacao](./step-13-calculos-bi-dre-paginacao.md) | TODO |
| 14 | [Testes de dominio e stores](./step-14-testes-dominio-stores.md) | TODO |
| 15 | [CI bloqueante e audit](./step-15-ci-bloqueante-audit.md) | TODO |
| 16 | [Orbit IA, LGPD e observabilidade](./step-16-orbit-lgpd-observabilidade.md) | TODO |
| 17 | [Homologacao final](./step-17-homologacao-final.md) | TODO |

> Status atualizado em 2026-04-30. P0 (Steps 01-07) e Step 08 concluidos; Step 09 em andamento.

## Prioridade Consolidada

### P0 - Fazer primeiro

- Baseline tecnico.
- Staging/preview.
- Higiene de `.env`, secrets e docs antigas.
- Atualizacao de dependencias vulneraveis.
- Auditoria de RBAC backend.
- Correcao do interceptor de auth.

### P1 - Fazer em seguida

- Guardas frontend.
- Hardening de notificacoes/exportacoes.
- CSP faseada.
- Unificacao de empresa ativa.

### P2 - Dados e legado

- Link quebrado.
- `/dashboard` legado.
- Semana 5.
- Paginacao CP/CR.
- Regra DRE/`Math.abs`.

### P3 - Sustentacao

- Testes.
- CI bloqueante.
- Politica Orbit/LGPD.
- Observabilidade.
- Homologacao final.

## Observacao Principal

Frontend deve esconder acoes indevidas e evitar erro operacional. Backend deve bloquear acesso indevido sempre. Para um hub corporativo, uma permissao so existe de verdade quando o backend valida usuario, empresa, grupo, permissao e acao em cada endpoint.
