# STEP 09 - Hardening de Notificacoes, Exportacoes e Rotas Dinamicas

## Objetivo

Reduzir risco de navegacao indevida, exportacao sem permissao e acoes sensiveis acionadas fora do escopo do usuario.

## Por que este step vem depois dos guards

Depois que as rotas principais tem autorizacao, endurecemos os pontos menores que acionam navegacao ou downloads.

## Escopo

- `src/components/nav/NotificationBell.tsx`;
- `src/components/ui/ExportPDFButton.tsx`;
- `src/components/nav/Navbar.tsx`;
- hooks de notificacao/export.

## Acoes Detalhadas

1. Criar allowlist de rotas internas permitidas para notificacoes:

```ts
const ALLOWED_NOTIFICATION_PREFIXES = [
  '/portal',
  '/bi/financeiro'
]
```

2. Antes de `router.push(n.action.route)`, validar:
   - e string;
   - comeca com `/`;
   - nao comeca com `//`;
   - nao contem `http://`, `https://`, `javascript:`, `data:`;
   - prefixo esta na allowlist.

3. Se rota for invalida:
   - nao navegar;
   - logar aviso em dev;
   - opcionalmente mostrar toast generico.

4. `ExportPDFButton`:
   - receber permissao como prop ou consultar authStore;
   - desabilitar sem permissao;
   - validar `empresaId`;
   - garantir endpoint vindo de constantes internas.

5. `Navbar`:
   - botao exportar aparece somente em telas certas e com permissao;
   - cache flush exige permissao apropriada;
   - backend tambem deve validar cache flush.

6. Testar:
   - notificacao com link valido;
   - notificacao com link externo;
   - usuario sem permissao tentando exportar;
   - usuario sem permissao tentando flush cache.

## Validacao

- Links externos em notificacoes nao navegam.
- Exportacao respeita permissao.
- Backend retorna `403` quando API e chamada diretamente sem permissao.
- Build e typecheck passam.

## Criterio de Pronto

- Nenhuma rota dinamica vinda da API consegue mandar usuario para destino nao permitido.
- Exportacao e cache flush estao protegidos na UI e no backend.

## Prompt para Execucao

```text
Execute o STEP 09 do plano de acao do grupoalt-web: endurecer notificacoes, exportacoes e rotas dinamicas. Adicione validacao/allowlist para links de notificacao, proteja botoes de PDF e cache flush por permissao, e valide que o backend retorna 403 quando a chamada direta nao e autorizada. Rode typecheck e build.
```
