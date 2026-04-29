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
