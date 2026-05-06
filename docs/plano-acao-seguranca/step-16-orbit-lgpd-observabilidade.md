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

### Fase B — Resultado (2026-05-06)

Entregue em `grupoalt-web` (este branch). Cliente do Orbit (`ChatPanel`) ganha
defesa em profundidade alinhada aos limites e codigos de erro do backend.

**ARQUIVOS NOVOS:**

- `src/components/chat/chatHelpers.ts` — modulo puro com:
  - `MAX_MSG_CHARS = 4000`, `MAX_MESSAGES = 20` (espelho dos limites Pydantic).
  - `trimHistoryForApi(messages)` — corta historico para `MAX_MESSAGES` mais
    recentes e descarta `assistant` orfa no inicio (backend rejeita historico
    que nao comeca com `user`).
  - `validateOutgoing(text)` — valida texto antes do envio (vazio,
    > 4000 chars). Retorna `{ ok: false, reason, message }` para alimentar
    o banner de erro sem round trip.
  - `describeAxiosError(err)` — mapeia erros do axios para
    `ErrorPresentation { kind, message, severity, retryAfterSeconds? }`.
    Cobre todos os status documentados na politica (orbit-policy.md sec. 8):
    401 (`unauthorized` warn), 403 (`forbidden` error), 404 (`not_found`
    error), 422 (`payload_too_large` error), 429 com `Retry-After`
    (`rate_limited_burst` rate), 429 sem header (`rate_limited_daily` rate),
    5xx ou network error (`unavailable` info — graceful degradation),
    desconhecido (`unknown` error com `detail` do servidor).

- `src/components/chat/chatHelpers.test.ts` — **24 testes Vitest** cobrindo
  todos os caminhos dos helpers, incluindo:
  - cap de historico (15-25 mensagens, com e sem orfa no inicio);
  - validacao em limite (4000 chars exatos OK, 4001 falha);
  - todos os status mapeados para o `ErrorKind` correto;
  - graceful degradation (5xx, sem response, network error, undefined).

**ARQUIVOS MODIFICADOS:**

- `src/components/chat/ChatPanel.tsx`:
  - `sendMessage` agora roda `validateOutgoing` antes de despachar,
    truncando o pedido com banner se invalido.
  - Envia apenas `trimHistoryForApi(...)` ao backend (max 20 mensagens).
  - Substitui o estado `error: string` por `errorState: ErrorPresentation`,
    com cores do banner por severidade (`rate`/`warn` ambar, `error`
    vermelho, `info` cinza).
  - Banner agora tem botao X para dispensar e atributo `role="alert"`.
  - Removida a "fake assistant message" com prefixo "⚠️" (era poluicao).
    Erros agora vivem so no banner; o historico fica limpo.
  - Input mostra contador `N/4000` quando passa de 80% do limite, com cor
    vermelha em overflow. Botao de envio fica desabilitado quando
    `overLimit`.

**INTERACAO ENTRE FASES A E B:**

- Fase A defende com 422/429/forbidden no servidor (autoridade final).
- Fase B antecipa esses erros no cliente e melhora a UX, sem confiar nele
  como barreira de seguranca. Mesmo se o cliente for adulterado (envia 30
  mensagens de 5000 chars), o backend rejeita 422 — Fase A nao depende
  da Fase B.

**VALIDACAO:**

- `npm test` -> 174/174 verde (150 anteriores + 24 novos).
- `npm run typecheck` -> sem erros.
- `npm run build` -> build de producao OK (50 rotas, middleware 26.8 kB).
- `npm run lint` -> apenas warnings pre-existentes do Step 05 (img-element
  no Navbar e exhaustive-deps no useAPI). Nada novo introduzido.
- `npm run audit:bundle` -> sem credenciais expostas no bundle.
