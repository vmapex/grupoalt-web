# Audit PR #148 — feat(admin): UI de restore de usuarios soft-deletados

**Branch:** `feat/admin-usuarios-restore-ui` · **Commit:** `273ae23`
**Base:** `main` · **Diff:** +297 / -33 (3 arquivos)
**Auditor:** agente independente · **Data:** 2026-05-23
**Companion api PR #116:** ainda nao mergeado (graceful degrade exigido)

---

## TL;DR

- **Score:** **96 / 100**
- **Recomendacao:** **APPROVE com merge imediato** (sem bloqueadores).
  Coordenar deploy: api PR #116 antes da web pra `deleted_at` chegar.
  Web sozinha nao quebra (graceful degrade).
- Cobertura B1..B10: **10/10 OK** (1 com sugestao nao-bloqueante).

## Validacoes automatizadas

| Check | Resultado |
|---|---|
| `npm run typecheck` | sem erros |
| `npm test -- --run src/hooks/api/useAdminPerfis.test.ts` | **9/9** verde |
| `npm test -- --run` | **308/308** em 20 arquivos (~8s) |
| `npm run build` | 50 rotas, sem regressao |
| `npm run audit:bundle` | 0 credenciais em 84 arquivos JS |
| `gh pr checks 148` | Vercel pass, ci pending (provavel CI lento, nao falha) |

Suite cresceu de 299 (pos PR #147) para **308** — +9 conforme matriz B8.

---

## Matriz de bloqueadores (B1..B10)

### B1 - retrocompat de `useAdminUsuarios({ includeDeleted })` — **OK**

`useAdminUsuarios()` sem args → `useApi('/admin/usuarios', undefined)`.
`buildCleanParams(undefined)` retorna `{}` (linha 25 do `_core.ts`).
Axios recebe `params: {}` → nao serializa nenhuma query.
`useAdminUsuarios({ includeDeleted: false })` → mesmo path (ternario filtra).
Os 3 testes assertam exatamente esse contrato (incluindo o caso `false`
explicito). Zero risco de regressao em callers existentes.

### B2 - `deleted_at?: string | null` modelado — **OK**

`useAdminPerfis.ts:39-50`. Tipo opcional + nullable cobre 3 cenarios:
backend antigo (campo ausente), usuario ativo (`null`), soft-deletado
(ISO 8601 string). `isDeleted = u.deleted_at != null` (page.tsx:191)
usa `!=` que cobre `undefined` + `null` — semanticamente correto.

### B3 - toggle controla `includeDeleted` → re-fetch — **OK**

`useState(false)` + `<input type="checkbox" checked={includeDeleted}
onChange={(e) => setIncludeDeleted(e.target.checked)} />` (page.tsx:151).
Re-fetch automatico via `JSON.stringify(params)` no deps do `useCallback`
(`_core.ts:73`) — quando `includeDeleted` muda, params muda, `fetch` muda,
`useEffect` dispara novo GET. Padrao da casa, ja exercitado pelo Step 13.

### B4 - estilizacao soft-deletado — **OK**

- `opacity: 0.65` no wrapper (page.tsx:199)
- `textDecoration: 'line-through'` no nome (page.tsx:223)
- Badge vermelho "Deletado" com `aria-label` (page.tsx:237-247) usando
  `#7f1d1d44` + `#fca5a5` (mesma paleta do badge "Marca confidencial"
  da pagina, ja validada em dark + light)
- `<button disabled={isDeleted}>` + `cursor: 'not-allowed'` +
  `title="Usuario deletado — restaure para selecionar"`
- `paddingRight: 92` quando deletado pra abrir espaco pro botao Restaurar
  flutuante sem ocluir o email — bem pensado.

### B5 - botao Restaurar com spinner e refetch — **OK**

`handleRestore(u)` chama `restaurarUsuario(u.id)` → `usuariosResult.refetch()`.
Botao com `disabled={isRestoring}`, troca icone `ArchiveRestore` →
`Loader2` (spin) durante loading. `cursor: 'wait'` enquanto processa.
`e.stopPropagation()` correto (page.tsx:258) — sem ele o click bubbleria
pro botao pai que tenta `setSelectedUserId(u.id)` mas o pai esta
`disabled` entao no caso especifico nao quebraria, **mas a defesa
explicita esta certa** e protege contra regressoes futuras.

### B6 - banner de erro + cleanup no finally — **OK**

`setRestoreError(null)` no inicio + `catch` constroi mensagem
`Falha ao restaurar ${u.nome}: ${detail || message || 'erro desconhecido'}`.
`finally { setRestoringId(null) }` garante que o spinner sempre sai mesmo
em erro. Banner tem `role="alert"` (acessibilidade) e cores ja usadas no
form de adicionar perfil (consistencia visual). **Falta** botao X para
fechar o banner manualmente (sugestao nao-bloqueante — banner some na
proxima acao de restore bem-sucedida).

### B7 - acessibilidade — **OK**

- `role="alert"` no banner de erro
- `aria-label="Restaurar ${u.nome}"` + `title` no botao
- `aria-label="Usuario deletado"` no badge
- `title` no botao desabilitado explicando porque
- Checkbox label envolve o `<input>` (clicavel no texto)

### B8 - cobertura de testes — **OK (9/9)**

`useAdminPerfis.test.ts`:
1. GET sem params por padrao
2. GET com `include_deleted=true` quando flag ON
3. GET sem param quando flag explicitamente `false`
4. Tipo `deleted_at` (`null` + ISO string)
5. `deleteUsuario` body shape
6. `deleteUsuario` propaga erro
7. `restaurarUsuario` POST sem body
8. `restaurarUsuario` propaga 409
9. `restaurarUsuario` propaga 404

Mock de `@/lib/api` no padrao da casa (mesmo estilo do
`useAPI.test.ts` do Step 13). Cobertura proporcional ao risco.

### B9 - validacoes verde — **OK**

typecheck, 308 tests, build, bundle audit — todos limpos. Ver tabela acima.

### B10 - graceful degrade (sem backend) — **OK**

Sem o api PR #116, `deleted_at` nunca vem no payload → `u.deleted_at`
e `undefined` → `isDeleted = false` para todos. UI fica identica ao
estado pre-PR (badge nao aparece, lista funcional). O toggle ainda
manda `?include_deleted=true` mas o backend ignora se nao tem suporte —
sem erro. **Validado por leitura, nao por execucao** (sem backend novo
disponivel no audit).

---

## Consideracoes especificas (do brief)

1. **stopPropagation no Restaurar** — Presente (page.tsx:258). Correto.

2. **Refetch apos restore** — Quando `includeDeleted=true` e restore
   sucede, `usuariosResult.refetch()` re-fetch o endpoint que ainda
   inclui o usuario restaurado MAS com `deleted_at: null`. Resultado
   visual: `isDeleted=false` → badge some, linha riscada some, opacity
   volta ao normal, botao Restaurar some, botao pai vira clicavel.
   Comportamento correto.

3. **Race condition em restores paralelos** — `restoringId: number | null`
   so suporta UM restore simultaneo. Se admin clica em user A
   (`restoringId=A`) e antes do `finally` clica em user B, o B sobrescreve
   `restoringId=B` enquanto A ainda esta processando. Sintoma: spinner
   pula de A pra B. Quando A termina, `setRestoringId(null)` apaga
   prematuramente o spinner do B. **Severidade BAIXA** — operacao e
   rapida (POST simples), admin dificilmente faz isso. Aceitavel pra
   F2; se virar problema, trocar pra `Set<number>`. **Nao bloqueia**.

4. **Selecionar soft-deletado antes do toggle** — Se selecao do user
   acontece (pre-soft-delete), depois soft-delete por outra aba, depois
   refresh com `includeDeleted=false`, o user some da lista mas
   `selectedUserId` mantem o id. `usuariosFiltrados.find(...)` retorna
   `undefined` → `userSelecionado=null` → `<EmptyDetalhe>` renderiza.
   **Sem crash**. Quando `includeDeleted=true`, o user volta na lista
   mas o card direito mostra `<DetalheUsuario>` com o user soft-deletado
   carregado — admin consegue ver atribuicoes (uteis para auditoria) mas
   tambem consegue **clicar em "Excluir usuario"** que vai pro modal e
   tenta deletar de novo → backend retorna 409 "ja deletado". Caminho de
   erro feio mas nao quebra. **Sugestao nao-bloqueante:** desabilitar
   o botao "Excluir usuario" no `DetalheUsuario` quando
   `user.deleted_at != null`. Nao foi feito neste PR.

5. **Empty state com toggle on + zero deletados** — `usuariosFiltrados`
   filtra por busca, nao por `includeDeleted`. Se backend retorna 0
   usuarios (toggle on, zero soft-deletados, zero ativos), mostra
   "Nenhum usuario encontrado". Se retorna ativos + zero deletados,
   mostra a lista normal sem badges — fluxo OK, o toggle nao impoe
   filtro client-side.

6. **line-through em dark mode** — `t.text` se adapta ao tema
   (dark: branco, light: preto). `opacity: 0.65` reduz contraste mas
   mantem legivel. Validado por leitura do tema — `themeStore.ts`
   garante contraste. OK.

---

## Sugestoes nao-bloqueantes (3)

1. **Botao X no banner de erro** (B6) — facilita dispensar erro sem
   tentar outra acao. ~5 linhas de UI.

2. **Desabilitar "Excluir usuario" quando ja deletado** (consid. 4) —
   `<DetalheUsuario>` deveria checar `user.deleted_at != null` e
   desabilitar o botao com title "Usuario ja deletado. Restaure
   primeiro." Evita 409 desnecessario.

3. **Race condition restore paralelo** (consid. 3) — trocar
   `restoringId: number | null` por `Set<number>` se virar problema em
   prod. Hoje aceitavel.

Nenhuma das 3 bloqueia o merge. Podem virar follow-up issues.

---

## Bloqueadores FAIL / PARTIAL

**Nenhum.** Os 10 bloqueadores B1..B10 estao OK.

## Veredicto

**APPROVE — merge imediato.**

Coordenar deploy:
1. `grupoalt-api` PR #116 (backend `deleted_at` em UsuarioResponse)
   deve subir **antes** desta web pra que badge/botao apareca em prod.
2. Se a web subir primeiro, o comportamento e o estado pre-F2
   (graceful degrade) — sem regressao, so feature invisivel.

PR pequeno (3 arquivos, 297 linhas), bem isolado, testes proporcionais,
build limpo, sem credenciais expostas, sem riscos de seguranca. Padrao
de qualidade igual aos PRs anteriores da Fase B.
