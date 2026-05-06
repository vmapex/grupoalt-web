# STEP 16 - Politica do Orbit IA, LGPD e Observabilidade

## Objetivo

Garantir que o chat Orbit nao exponha dados alem do escopo do usuario, tenha limites claros e seja auditavel.

## Por que este step vem depois dos controles de acesso

O Orbit depende do contexto de usuario, empresa e pagina. Primeiro estabilizamos auth, RBAC e empresa ativa; depois tratamos IA.

## Escopo

- `src/components/chat/ChatPanel.tsx`;
- endpoint backend `/orbit/chat`;
- endpoint backend `/orbit/usage`;
- logs e auditoria backend.

## Riscos a Tratar

- Usuario perguntar sobre empresa sem acesso.
- Prompt injection pedindo dados fora do contexto.
- Envio de contexto financeiro excessivo.
- Logs com dados sensiveis.
- Falta de trilha de auditoria.
- Limites de uso apenas em memoria.

## Acoes Detalhadas

1. Definir politica de dados:
   - quais dados podem ser enviados ao LLM;
   - quais dados nunca podem ser enviados;
   - se dados pessoais entram no contexto;
   - se documentos/processos podem ser usados como contexto;
   - tempo de retencao de logs.

2. Backend deve validar:
   - usuario autenticado;
   - empresa solicitada pertence ao usuario;
   - permissao para modulo consultado;
   - limite de tokens por papel;
   - rate limit por usuario.

3. Frontend deve enviar contexto minimo:
   - pagina atual;
   - empresa ativa;
   - filtros ativos;
   - nunca enviar segredos ou credenciais.

4. Sanitizar e limitar historico:
   - limite de mensagens enviadas;
   - limite de caracteres por mensagem;
   - bloquear anexos, se nao suportados;
   - truncar historico antigo.

5. Observabilidade:
   - logar `user_id`, `empresa_id`, tokens, modelo e classificacao;
   - nao logar conteudo sensivel integral sem politica;
   - criar retencao de logs;
   - criar alertas para uso anormal.

6. UX:
   - sem permissao -> erro amigavel;
   - limite esgotado -> mensagem clara;
   - indisponibilidade do Orbit nao pode quebrar portal.

7. Testes:
   - usuario da empresa A pede dados da empresa B;
   - usuario comum pede informacao admin;
   - pergunta tenta obter credenciais Omie;
   - limite de tokens excedido;
   - backend indisponivel.

## Validacao

- Orbit respeita empresa/permissao.
- Logs nao vazam segredo.
- Limites funcionam.
- Portal continua funcional se Orbit falhar.

## Criterio de Pronto

- Politica escrita.
- Backend aplica escopo.
- Frontend envia contexto minimo.
- Observabilidade existe.

## Prompt para Execucao

```text
Execute o STEP 16 do plano de acao do grupoalt-web: definir e implementar politica do Orbit IA, LGPD e observabilidade. Valide escopo por usuario/empresa/permissao no backend, limite contexto enviado pelo frontend, evite logs sensiveis e teste prompt injection, acesso cross-empresa e limite de tokens.
```

## Quebra em fases (decidida em 2026-05-06)

| Fase | Foco | Escopo |
|---|---|---|
| **A** — Politica + Backend hardening | LGPD escrita + endurecimento backend | Doc `orbit-policy.md` (no repo `grupoalt-api`), tabela `orbit_audit_log`, rate limit Redis (30 req/min/user), system prompt blindado, limites de payload (4000 chars/msg, 20 msgs), testes (limites + auditoria + rate limit). |
| **B** — Frontend + UX | Cliente minimo + UX defensiva | Cap de historico no envio, validacao de tamanho client-side, mensagens de erro por status (429/403/5xx), Orbit indisponivel nao quebra portal, testes Vitest. |
| **C** — Observabilidade + admin | Audit + metricas + alertas | Endpoint admin `/orbit/audit`, pagina BI/admin para visualizar uso, politica de retencao 90d (cron), alertas de uso anormal. |

### Fase A — Resultado (2026-05-06)

Entregue em `grupoalt-api` (PR companion). **Nao ha mudanca de codigo no
`grupoalt-web` na Fase A** — ela e backend-only. O frontend ja envia o
contexto correto desde a Sessao 11 (empresa ativa + pagina + filtros). A
Fase B vai cuidar dos pontos restantes do frontend (cap de historico,
validacao de tamanho, mensagens de erro especificas por status).

Itens entregues em `grupoalt-api`:

- Politica de dados em `docs/plano-acao-seguranca/orbit-policy.md`.
- Tabela `orbit_audit_log` (auditoria sem conteudo).
- Rate limit por usuario (30 req/min) em `POST /v1/orbit/chat`.
- Limites Pydantic: `messages` (1..20), `content` (1..4000 chars), `role` em `Literal["user", "assistant"]`, `financial_context` (max 4000 chars).
- System prompt blindado contra prompt injection (6 regras de seguranca explicitas).
- Marcadores delimitadores em torno do contexto financeiro injetado.
- 14 testes novos em `tests/test_orbit_policy.py` cobrindo limites, auditoria (sucesso/forbidden/not_found/usage_exceeded/error) e rate limit.
