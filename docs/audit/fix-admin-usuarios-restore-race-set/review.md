# Audit PR #152 — fix(admin): race condition em restore paralelo de usuarios

**Branch:** `fix/admin-usuarios-restore-race-set` · **Commit:** `edca7d8`
**Base:** `main` · **Diff:** +200 / -5 (2 arquivos)
**Auditor:** agente independente · **Data:** 2026-05-24
**Origem:** sugestao nao-bloqueante #3 do audit PR #148
(`docs/audit/f2-admin-usuarios-restore-ui/review.md`, secao
"Sugestoes nao-bloqueantes")

---

## TL;DR

- **Score:** **97 / 100**
- **Recomendacao:** **APPROVE com merge imediato** (sem bloqueadores).
- Cobertura B1..B6: **6/6 OK**.
- PR cirurgico: 1 troca de tipo (`number | null` → `Set<number>`) +
  2 testes novos que cobrem exatamente o cenario que motivou a mudanca.
- Sem regressao no comportamento single-restore, sem mudanca visivel
  ao user fora do paralelismo, sem mexer em hooks de API ou logica
  de erro.

## Validacoes automatizadas

| Check | Resultado |
|---|---|
| `npm install --no-audit --no-fund` | 718 packages, sem erros |
| `npm run typecheck` | sem erros TS |
| `npm test -- --run src/app/bi/financeiro/admin/usuarios/page.test.tsx` | **2/2** verde (~1.8s) |
| `npm test -- --run` | **326/326** em 23 arquivos (~12s) |
| `npm run build` | **44 rotas**, compiled successfully, sem regressao |
| `npm run audit:bundle` | 0 credenciais em 84 arquivos JS |

Suite cresceu de 324 (pos PR #151) para **326** — +2 testes do PR.
Build mantem as 44 rotas atuais (post-audit, sem regressao). Lint nao
foi rodado por conflito conhecido de plugin `@next/next` duplicado
quando worktree convive com checkout principal (problema do ambiente
do auditor, nao do PR).

---

## Matriz de bloqueadores (B1..B6)

### B1 — Tipo Set como state imutavel — **OK**

Os tres updates de `setRestoringIds` sao imutaveis:

- **Init lazy** (page.tsx:51): `useState<Set<number>>(() => new Set())`
  cria o Set 1x via callback (boa pratica — evita realocar a cada
  render).
- **Add no inicio do handleRestore** (page.tsx:55-59):

  ```tsx
  setRestoringIds((prev) => {
    const next = new Set(prev)
    next.add(u.id)
    return next
  })
  ```

  Copia rasa (`new Set(prev)`) antes de mutar. `next !== prev` →
  `Object.is` detecta a mudanca → re-render dispara.

- **Delete no finally** (page.tsx:70-75):

  ```tsx
  setRestoringIds((prev) => {
    if (!prev.has(u.id)) return prev
    const next = new Set(prev)
    next.delete(u.id)
    return next
  })
  ```

  Mesmo padrao. Nenhum dos paths chama `prev.add(...)` ou
  `prev.delete(...)` diretamente — Set retornado pelo `useState`
  nunca eh mutado. **Sem armadilha React.**

### B2 — Cleanup idempotente no finally — **OK**

`if (!prev.has(u.id)) return prev` (page.tsx:71) faz early-return
sem instanciar Set novo quando o id ja nao esta na collection. Tres
beneficios:

1. **Sem re-render desnecessario** — `prev === prev` mantem identidade
   de referencia, React skip do render.
2. **Defense in depth** — protege contra cenarios futuros (unmount em
   meio ao restore, double-cleanup por StrictMode em dev, etc).
3. **Correto semanticamente** — `Set.delete` no Set vazio nao explode,
   mas o pattern do early-return e o que "fala correto" para o leitor.

A primeira chamada (`add`) nao precisa do mesmo guard porque
`Set.add` e idempotente (o usuario poderia clicar 2x antes do
unmount, sem efeito colateral).

### B3 — stopPropagation no botao Restaurar mantido — **OK**

Linha 281-283 da `page.tsx` (intacta — PR nao mexeu nessa regiao):

```tsx
onClick={(e) => {
  e.stopPropagation()
  handleRestore(u)
}}
```

Sem o stopPropagation, o click bubbleria pro `<button onClick={() =>
setSelectedUserId(u.id)}>` pai (linha 226-227). No caso atual o pai
esta `disabled={isDeleted}` entao o handler nao dispara, mas a defesa
explicita esta correta. Mesma analise do audit PR #148 (B5).

### B4 — Tests cobrem paralelismo — **OK**

**Teste 1** (`permite restaurar 2 usuarios em paralelo`, linhas 137-167):
- Mocka 2 users soft-deletados (Ana id=1, Bruno id=2) via
  `useAdminUsuarios`.
- `restaurarUsuario` retorna `Deferred` por id — controla resolucao
  manualmente.
- Sequencia: click Ana → assert ambos disabled corretos → click Bruno
  → **assert chave**: `btnAna.disabled === true` (regressao!) +
  `btnBruno.disabled === true` → resolve Ana → assert Ana liberada,
  Bruno ainda disabled → resolve Bruno → ambos liberados → assert
  `refetch` chamado **2x**.

  O assert que captura a regressao especifica e a linha 152:
  `expect(btnAna.hasAttribute('disabled')).toBe(true) // ← antes virava false`.
  Comentario inline explicita o que estava quebrando.

**Teste 2** (`erro em um restore nao afeta o spinner do outro`,
linhas 170-202):
- Mesmo setup, mas Ana e rejeitada e Bruno e resolvido depois.
- Assert: apos `reject(Ana)`, `btnAna` libera (finally limpa
  o id 1 do Set), `btnBruno` mantem disabled (id 2 ainda esta no Set),
  banner `role="alert"` aparece. Bruno resolve → libera.
- `flush microtasks` com `await Promise.resolve(); await Promise.resolve()`
  garante que o `.catch` propaga o erro antes dos asserts.

Cobertura proporcional ao bug. **2 testes, 100% do espaco de race
condition single-restore.** Nao cobre 3+ users em paralelo, mas
extrapolacao para N e direta (Set.has e Set.add sao O(1)).

### B5 — Sem regressao na suite — **OK**

Tabela acima ja mostra `326/326` verde. Suite anterior 324 + 2 novos
= 326 — match exato. `typecheck`, `build`, `audit:bundle` todos limpos.

### B6 — Escopo minimal — **OK**

Diff (`git diff main..fix/admin-usuarios-restore-race-set --stat`):

```
src/app/bi/financeiro/admin/usuarios/page.test.tsx | 184 +++++++++++++++++++++
src/app/bi/financeiro/admin/usuarios/page.tsx      |  21 ++-
2 files changed, 200 insertions(+), 5 deletions(-)
```

Inspecao do diff em `page.tsx` (16 linhas effective):

- Declaracao de state: troca tipo `number | null` → `Set<number>`
  com lazy init.
- `handleRestore` inicio: 1 update funcional em vez de
  `setRestoringId(u.id)`.
- `handleRestore` finally: 1 update funcional em vez de
  `setRestoringId(null)`, com guard `prev.has(u.id)`.
- Consumo: `isRestoring = restoringIds.has(u.id)` em vez de `===`.
- Comentario atualizado.

**NAO mexe** em:
- `useAdminUsuarios`, `restaurarUsuario`, hooks de API
  (`useAdminPerfis.ts` intacto — grep confirma).
- Logica de `restoreError` / banner (intacta).
- `restoringEmpresa` em `src/app/portal/admin/page.tsx`
  (linhas 58, 369, 373 ainda usam `number | null` — escopo
  deferido como o PR description anuncia).
- Estilos, ARIA, behavior visivel ao user fora do cenario de
  multiplos restores simultaneos.

Nenhum refactor escondido, nenhuma cleanup acidental.

---

## Consideracoes especificas (do brief)

1. **`useState(() => new Set())` lazy init** — Confirmado. Sem o
   callback, um Set novo seria criado a cada render e descartado pelo
   React; com o callback, instancia 1x. Match com o padrao do
   `dateRangeStore` e outros lazy inits.

2. **`new Set(prev)` em cada update** — Copia rasa, correto para
   `Set<number>` (numeros sao primitivos, sem aliasing). Custo:
   O(n) por update onde n = qty de restores simultaneos — em pratica
   0..3. Aceitavel.

3. **`Set.has(id)` O(1) vs `restoringId === u.id`** — Ambos sao O(1)
   amortizado. Para uma lista de N usuarios, render eh O(N) nos dois
   casos (cada `restoringIds.has(u.id)` ou `restoringId === u.id` por
   linha). Sem regressao de perf.

4. **Cleanup com `if (!prev.has(u.id)) return prev`** — Faz sentido.
   Especificamente protege:
   - **StrictMode dev** — React 18 invoca effects 2x em dev. Para
     `useState` updates dentro de `try/finally`, o duplo-fire eh
     diferente do effects (finally roda 1x por catch), entao na
     pratica nao dispara o guard. Mas e barato e legivel.
   - **Future unmount-during-restore** — se algum dia o componente
     desmontar com restore pendente (ex: navegar fora antes do
     POST resolver), o update tentaria rodar no componente desmontado.
     React loga warning mas o early-return evita recriar Set por
     nada.

5. **`fireEvent + act` (sem `user-event`)** — Verifiquei
   `package.json` e a suite — `@testing-library/user-event` nao esta
   instalado; padrao da casa eh `fireEvent` wrapped em `act` async.
   Para o caso de teste aqui (click puro, sem keyboard events ou
   pointer simulado), `fireEvent.click` produz o mesmo resultado:
   onClick dispara, state updates batched, re-render. O `await act`
   garante que microtasks dos handlers async resolvam antes do assert.
   **Espelha corretamente** o comportamento real do click.

6. **Mocks dos stores e hooks** — Bem feitos:
   - `themeStore`, `authStore` mockados via callback selector (padrao
     Zustand) — match com o stub real.
   - `useRequireAdmin` retorna `'allowed'` direto — by-passa o branch
     de loading sem mockar timers.
   - `AccessDenied`, `AdminSubNav`, `DeleteUsuarioModal` como stubs
     vazios — focam o teste no que importa.
   - `useAdminUsuarios` retorna 2 users com `deleted_at` populado —
     ativa o branch `isDeleted = true` que pinta o botao Restaurar.
   - `restaurarUsuario` substituido por mapa de `Deferred` — controle
     fino da resolucao por id, sem `setTimeout` flaky.

7. **`refetch` chamado 2x** — Assert importante: garante que cada
   restore bem-sucedido faz seu proprio refetch (nao foi
   "absorvido" pela race). Confirma que o `try` block tambem
   funciona corretamente sob paralelismo.

---

## Sugestoes nao-bloqueantes (1)

1. **Replicar pattern em `restoringEmpresa`** (escopo deferido) — O
   mesmo bug existe em `src/app/portal/admin/page.tsx:58`
   (`restoringEmpresa: number | null`) com o handler em linhas
   369-373. Severidade igual (BAIXA — admin clica em multiplas
   empresas raramente). Pode virar follow-up PR de 1-2 linhas
   replicando exatamente o pattern aqui validado, ideal com 1 teste
   identico ao `Teste 1` adaptado.

Nao bloqueia este PR — o PR description anuncia que o escopo eh so
usuarios.

---

## Bloqueadores FAIL / PARTIAL

**Nenhum.** Os 6 bloqueadores B1..B6 estao OK.

---

## Veredicto

**APPROVE — merge imediato.**

PR cirurgico de race condition fix sugerido pelo audit anterior
(#148). Fechamento de loop bonito: sugestao deferida -> implementacao
focada -> testes que provam a regressao especifica + ausencia
ela apos o fix. Padrao Set-imutavel correto, escopo controlado,
sem efeito colateral em outras paginas. Suite cresce 324 -> 326,
build limpo, sem credenciais expostas.

Diff < 200 linhas, 75% do diff e teste (184 / 200). Risco zero para
deploy. Single follow-up opcional: replicar pattern em
`restoringEmpresa` quando tiver tempo.
