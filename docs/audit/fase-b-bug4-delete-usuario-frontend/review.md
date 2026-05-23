# Audit — PR #147 frontend: DeleteUsuarioModal

**Commit:** a223e76
**Data:** 2026-05-23
**Auditor:** Claude Opus 4.7 (1M context) — auditoria independente
**Companion backend:** PR #115 (`grupoalt-api`) ja em main, audit APPROVE 92/100

## Score: 96/100
## Recomendacao: APPROVE

PR pequeno (+562 LOC, -10 LOC), bem escopado, clone fiel do padrao P0-7
(`DeleteEmpresaModal`). Contrato com o backend bate exatamente
(`{ senha_admin, nome_usuario }`). Defesa em camada coerente. Toda a suite
verde (298/298), nenhuma regressao detectada.

## Matriz (8 bloqueadores)

| # | Bloqueador | Status | Severidade |
|---|---|---|---|
| B1 | Hooks deleteUsuario/restaurarUsuario corretos (body axios, paths) | PASS | Alta |
| B2 | Modal: confirmacao dupla + validacao UI | PASS | Alta |
| B3 | Auto-delete disabled em UI + tooltip | PASS | Media |
| B4 | onSuccess refetch + deseleciona | PASS | Media |
| B5 | A11y: dialog/role/aria | PASS | Media |
| B6 | Mapeamento de erros (403/409/404) | PASS | Alta |
| B7 | Reset inputs ao trocar usuario (id muda) | PASS | Baixa |
| B8 | Sem regressao (atribuir/revogar/busca continuam) | PASS | Alta |

### Detalhamento

- **B1 PASS** — `useAdminPerfis.ts` exporta `deleteUsuario(id, senha, nome)`
  e `restaurarUsuario(id)`. Body do axios usa `{ data: { senha_admin,
  nome_usuario } }` — confere com `DeleteUsuarioBody` em
  `app/routers/admin.py:556-560` do backend. Path
  `/admin/usuarios/{usuario_id}` e `/admin/usuarios/{id}/restore` batem.
  Nota: `restaurarUsuario` ainda nao tem consumidor (UI nao expoe restore
  neste PR) — o proprio docstring deixa explicito que e prep pra PR
  futuro, o que e razoavel.

- **B2 PASS** — `podeExcluir = senha.trim() !== '' && nomeDigitado ===
  usuario.nome && !loading`. Match exato case-sensitive no nome (igual
  ao backend). Senha so e validada por nao-vazio no client (servidor faz
  bcrypt). Botao `Excluir` permanece disabled ate ambos baterem +
  `handleSubmit` ainda re-checa `podeExcluir` antes de chamar.

- **B3 PASS** — `page.tsx:187` passa `isAutoDelete={currentUser?.id ===
  userSelecionado.id}` pro `DetalheUsuario`. Botao recebe
  `disabled={isAutoDelete}`, cor `t.muted`, cursor `not-allowed`,
  opacity 0.5 e tooltip claro ("Voce nao pode deletar a si mesmo. Peca
  a outro admin."). Backend tambem rejeita com 403 (defesa em camada).

- **B4 PASS** — `onSuccess` em `page.tsx:198-206` faz exatamente o
  esperado: se o user deletado era o selecionado, `setSelectedUserId(null)`
  pra retornar pro `EmptyDetalhe`; depois `usuariosResult.refetch()`
  pra recarregar lista (que ja vem filtrada sem deletados pelo backend).

- **B5 PASS** — Dialog tem `role="dialog"`, `aria-modal="true"`,
  `aria-labelledby="delete-usuario-title"`. Header `<h2 id="...">`
  presente. Botao de fechar tem `aria-label="Fechar"`. Banner de erro
  tem `role="alert"`. Backdrop click fecha (com guard de `loading`).
  Inputs tem `<label htmlFor>` correto (encontravel via
  `getByLabelText`).

- **B6 PASS** — Mapeamento em `handleSubmit`:
  - 403 -> usa `resp.data?.detail` (mensagem do backend e human-friendly:
    "Senha do admin nao confere" / "Nome enviado nao bate..." /
    "Voce nao pode deletar a si mesmo..." / "Nao e possivel deletar o
    ultimo admin ativo..."), fallback "Acao nao autorizada."
  - 409 -> `resp.data?.detail` ("Usuario ja esta soft-deletado..."),
    fallback amigavel.
  - 404 -> mensagem fixa amigavel "Usuario nao encontrado (pode ter
    sido removido)."
  - Default -> `resp?.data?.detail || 'Erro ao excluir. Tente novamente.'`
  
  Decisao de nao diferenciar sub-tipos do 403 (senha/nome/auto/ultimo
  admin) e correta — o backend ja humaniza o `detail`, e o cliente nao
  pode confiar em sub-codigos sem ampliar superficie de contrato.

- **B7 PASS** — `useEffect(() => { reset all }, [usuario?.id])` zera
  senha/nome/error/loading sempre que o id muda. Cenario coberto pelo
  teste "reseta inputs ao trocar de usuario (id muda)".

- **B8 PASS** — Diff em `page.tsx` se restringe a:
  1. Imports (`UserX`, modal, `currentUser`)
  2. State `deleteAlvo` (+ um setter no botao)
  3. Header do `DetalheUsuario` envolvido em flex pra acomodar botao Excluir
  4. Render do `<DeleteUsuarioModal>` no fim do root div
  
  Logica de `criarAtribuicaoPerfil`/`removerAtribuicaoPerfil`/busca/
  filtragem/dropdowns nao foi tocada. Componente continua funcionando
  identico (typecheck + build verdes confirmam).

## Validacoes

- typecheck: **PASS** — `npm run typecheck` sem erros TS
- tests novos: **PASS** — 12/12 em
  `src/components/admin/DeleteUsuarioModal.test.tsx`
- tests suite: **PASS** — 298/298 em 19 arquivos (sem regressao; tudo
  que estava verde continua verde)
- build: **PASS** — Next 14 standalone, 50+ rotas, sem erros nem
  warnings de build
- audit:bundle: **PASS** — 0 credenciais expostas em 84 arquivos JS
- gh pr checks: ci pending no momento do audit; Vercel preview verde

## Observacoes curtas

1. **Coverage dos 12 tests:** cobre o caminho feliz, validacao
   client-side (nome errado, senha vazia), os 3 status codes mapeados
   (403 senha + 403 auto-delete + 409 + 404), cancel, reset de state.
   Caso o time queira robustecer:
   - Cenario 500/network error -> cai no `default` do switch (texto
     "Erro ao excluir. Tente novamente."), util pra evitar regressao
     de fallback. Nao bloqueante.
   - Botao `Excluir` durante `loading` mostra `<Loader2>` — sem teste
     explicito, mas e visual menor.

2. **DRY oportunidade (nao bloqueante):** `DeleteEmpresaModal` e
   `DeleteUsuarioModal` sao ~85% identicos em estrutura. Em um proximo
   passo poderia extrair `<ConfirmDeleteModal>` genericamente
   (alvo: `{ id, label, secondaryLabel? }`, callback: `(id, senha,
   confirmTexto) => Promise<void>`, props: titulo/aviso/labels). Nao
   precisa neste PR — clonar mantem o blast radius zero e foi a
   abordagem correta dado o prazo.

3. **Restore nao expostas na UI:** `restaurarUsuario` existe no hook
   mas nao tem consumidor. Docstring deixa o gap explicito ("hook fica
   disponivel pra um PR de UI de restauracao no futuro"). Sem risco —
   tree-shaking remove se nao for usado. Sugiro abrir issue de followup
   pra UI de restore (espelho do P0-7 ui que ja existe pra empresas).

4. **Comentario do backend bate com cliente:** comentario em
   `useAdminPerfis.ts:90-94` enumera corretamente os status codes do
   backend incluindo o sub-tipo do 403 ("ultimo admin"), o que mostra
   que o author leu o spec backend antes de escrever.

5. **Confirmation modal recebe foco?** Nao detectei `autoFocus` no
   input de senha. Boa pratica seria focar o primeiro input ao abrir
   pra melhorar UX (e accessibilidade pra usuario de teclado).
   Followup nao bloqueante.

## Conclusao

PR cumpre exatamente o escopo declarado, com qualidade alta e zero
regressao. Recomendo **APPROVE / squash merge**. Score 96/100 (deduzi
4 pontos: ausencia de teste pra erro 5xx/network -2, ausencia de
autoFocus no primeiro input -1, oportunidade de DRY entre os 2 modais
para potencial debt futuro -1).
