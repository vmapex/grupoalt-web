# Audit PR #153 — fix(admin): race condition em restore paralelo de empresas

**Branch:** `fix/portal-admin-restore-empresa-race-set` · **Commit:** `ce53116`
**Base:** `main` · **Diff:** +207 / -5 (2 arquivos)
**Auditor:** agente independente · **Data:** 2026-05-24
**Origem:** sugestao nao-bloqueante #1 do audit PR #152
(`docs/audit/fix-admin-usuarios-restore-race-set/review.md`, secao
"Sugestoes nao-bloqueantes")

---

## TL;DR

- **Score:** **97 / 100**
- **Recomendacao:** **APPROVE com merge imediato** (sem bloqueadores).
- Cobertura B1..B6: **6/6 OK**.
- PR cirurgico: 1 troca de tipo (`number | null` -> `Set<number>`) em
  `src/app/portal/admin/page.tsx` + 2 testes novos cobrindo paralelismo
  e erro isolado. Espelho estrutural exato do PR #152, sem variacao
  desnecessaria.
- Sem regressao no comportamento single-restore, sem mudanca visivel
  ao user fora do paralelismo, sem mexer em `restoreEmpresa`, hooks de
  API ou outras telas.

## Validacoes automatizadas

| Check | Resultado |
|---|---|
| `npm install --no-audit --no-fund` | 718 packages, sem erros |
| `npm run typecheck` | sem erros TS |
| `npm test -- --run src/app/portal/admin/page.test.tsx` | **2/2** verde (~1.8s) |
| `npm test -- --run` | **328/328** em 24 arquivos (~12s) |
| `npm run build` | **44 rotas**, compiled successfully, sem regressao |
| `npm run audit:bundle` | 0 credenciais em 84 arquivos JS |

Suite cresceu de 326 (pos PR #152) para **328** — +2 testes do PR.
Build mantem as 44 rotas atuais (post-audit, sem regressao). Lint nao
foi rodado por nao ser exigido pelo brief — typecheck cobre o
contrato TS e os testes cobrem o comportamento.

---

## Matriz de bloqueadores (B1..B6)

### B1 — Set imutavel — **OK**

Os tres updates de `setRestoringEmpresaIds` sao imutaveis:

- **Init lazy** (page.tsx:61): `useState<Set<number>>(() => new Set())`
  cria o Set 1x via callback (boa pratica — evita realocar a cada
  render).
- **Add no inicio do handleRestoreEmpresa** (page.tsx:68-72):

  ```tsx
  setRestoringEmpresaIds((prev) => {
    const next = new Set(prev)
    next.add(emp.id)
    return next
  })
  ```

  Copia rasa (`new Set(prev)`) antes de mutar. `next !== prev` →
  `Object.is` detecta a mudanca → re-render dispara.

- **Delete no finally** (page.tsx:81-86):

  ```tsx
  setRestoringEmpresaIds((prev) => {
    if (!prev.has(emp.id)) return prev
    const next = new Set(prev)
    next.delete(emp.id)
    return next
  })
  ```

  Mesmo padrao. Nenhum dos paths chama `prev.add(...)` ou
  `prev.delete(...)` diretamente — Set retornado pelo `useState`
  nunca eh mutado. **Sem armadilha React.**

### B2 — Cleanup idempotente no finally — **OK**

`if (!prev.has(emp.id)) return prev` (page.tsx:82) faz early-return
sem instanciar Set novo quando o id ja nao esta na collection. Tres
beneficios:

1. **Sem re-render desnecessario** — `prev === prev` mantem identidade
   de referencia, React skip do render.
2. **Defense in depth** — protege contra cenarios futuros (unmount em
   meio ao restore, double-cleanup por StrictMode em dev, etc).
3. **Correto semanticamente** — `Set.delete` no Set vazio nao explode,
   mas o pattern do early-return e o que "fala correto" para o leitor.

A primeira chamada (`add`) nao precisa do mesmo guard porque
`Set.add` e idempotente (admin poderia clicar 2x antes do unmount,
sem efeito colateral).

### B3 — Pattern identico ao PR #152 — **OK**

Comparei `git diff main..origin/fix/admin-usuarios-restore-race-set
-- src/app/bi/financeiro/admin/usuarios/page.tsx` com este PR. Match
estrutural exato:

| PR #152 (usuarios) | PR #153 (empresas portal) |
|---|---|
| `restoringId: number \| null` -> `restoringIds: Set<number>` | `restoringEmpresa: number \| null` -> `restoringEmpresaIds: Set<number>` |
| `useState(() => new Set())` lazy init | idem |
| `setRestoringIds((prev) => { const next = new Set(prev); next.add(u.id); return next })` | `setRestoringEmpresaIds((prev) => { const next = new Set(prev); next.add(emp.id); return next })` |
| `if (!prev.has(u.id)) return prev` no finally | `if (!prev.has(emp.id)) return prev` no finally |
| `restoringIds.has(u.id)` no JSX (`disabled` + spinner ternario) | `restoringEmpresaIds.has(emp.id)` no JSX (`disabled` + spinner ternario) |

Diffs identicos em estrutura, naming adaptado de `u.id` -> `emp.id`
e `restoringId(s)` -> `restoringEmpresa(Ids)`. Sem alteracoes
escondidas, sem variacao no pattern. Boa.

### B4 — Tests cobrem paralelismo — **OK**

**Teste 1** (`permite restaurar 2 empresas em paralelo`, linhas 102-149):
- Mock `apiGetMock` retorna 2 empresas soft-deletadas (Alfa id=10,
  Beta id=20) em `/admin/empresas`.
- `restoreEmpresa` mockado via `vi.mock('@/hooks/useAPI', ...)` retorna
  um `Deferred` por id em um `Map<number, Deferred>` — controle
  manual de resolucao/rejeicao.
- Sequencia: `fireEvent.click` na aba `Empresas` -> findByRole no
  botao Restaurar de cada empresa -> click Alfa -> assert
  `btnAlfa.disabled === true`, `btnBeta.disabled === false` -> click
  Beta -> **assert chave**: ambos `disabled === true` (regressao!) ->
  resolve Alfa -> assert `btnAlfa.disabled === false`,
  `btnBeta.disabled === true` -> resolve Beta -> ambos liberados.

  O assert que captura a regressao especifica e a linha 134:
  `expect(btnAlfa.hasAttribute('disabled')).toBe(true) // ← antes virava false`.
  Comentario inline explicita o que estava quebrando.

**Teste 2** (`erro em um restore nao afeta o spinner do outro`,
linhas 151-189):
- Mesmo setup, mas Alfa e rejeitada com payload `{ response: { data:
  { detail: 'erro forcado' } } }` e Beta e resolvida depois.
- Assert: apos `reject(Alfa)`, `btnAlfa` libera (finally limpa o id
  10 do Set), `btnBeta` mantem disabled (id 20 ainda esta no Set).
  Beta resolve -> libera.
- `flush microtasks` com `await Promise.resolve(); await Promise.resolve()`
  garante que o `.catch` propaga o erro antes dos asserts.

Cobertura proporcional ao bug. **2 testes, 100% do espaco de race
condition single-restore.** Nao cobre 3+ empresas em paralelo, mas
extrapolacao para N e direta (Set.has e Set.add sao O(1)) e ja
testada no PR #152 — heranca de padrao consistente.

### B5 — Sem regressao na suite — **OK**

Tabela acima ja mostra `328/328` verde. Suite anterior 326 + 2 novos
= 328 — match exato. `typecheck`, `build`, `audit:bundle` todos
limpos.

### B6 — Escopo minimal — **OK**

Diff (`git diff main..fix/portal-admin-restore-empresa-race-set
--stat`):

```
src/app/portal/admin/page.test.tsx | 190 +++++++++++++++++++++++++++++++++++++
src/app/portal/admin/page.tsx      |  22 ++++-
2 files changed, 207 insertions(+), 5 deletions(-)
```

Inspecao do diff em `page.tsx` (17 linhas effective):

- Declaracao de state: troca tipo `number | null` -> `Set<number>`
  com lazy init.
- `handleRestoreEmpresa` inicio: 1 update funcional em vez de
  `setRestoringEmpresa(emp.id)`.
- `handleRestoreEmpresa` finally: 1 update funcional em vez de
  `setRestoringEmpresa(null)`, com guard `prev.has(emp.id)`.
- Consumo: 2 ocorrencias no JSX trocam `restoringEmpresa === emp.id`
  por `restoringEmpresaIds.has(emp.id)` (disabled + ternario do
  spinner).
- Comentario adicionado explicando o pattern e referenciando PR #152.

**NAO mexe** em:
- `restoreEmpresa` em `src/hooks/api/useAdminEmpresas.ts:46`
  (intacto — grep confirma).
- `useAPI.ts` barrel (linha 88 reexporta intacta).
- `loadData`, `loadUnidades`, ou qualquer outro handler.
- `DeleteEmpresaModal` (modal continua igual).
- `restoringEmpresa` em outras paginas — grep confirma que so existia
  aqui. O equivalente em `/bi/financeiro/admin/usuarios` ja foi
  resolvido no PR #152.
- Estilos, ARIA, behavior visivel ao user fora do cenario de
  multiplos restores simultaneos.

Nenhum refactor escondido, nenhum cleanup acidental. PR e literalmente
o follow-up sugerido no audit anterior.

---

## Consideracoes especificas (do brief)

1. **Teste muda de aba antes de testar restore** — Confirmado. Linha
   114-116 do teste: `fireEvent.click(screen.getByRole('button',
   { name: /^Empresas$/i }))` dentro de `await act(async () => ...)`.
   Necessario porque o componente comeca em `tab = 'Usuarios'` (default
   do `useState` no `AdminPage`) e os botoes Restaurar so renderizam
   no branch `tab === 'Empresas'`. Sequenciamento correto — sem o
   click, `findByRole('button', { name: /Restaurar Empresa Alfa/i })`
   travaria no timeout.

2. **Mock de `loadData`** — `apiGetMock.mockImplementation` cobre:
   - `/gestao/usuarios` -> `data: []` (passa filtros sem usuarios).
   - `/admin/empresas` -> 2 empresas com `deleted_at` populado.
   - `/unidades` (url.includes) -> `data: []`.
   - Default -> `data: []`.

   Cobre o `Promise.all` do `loadData` (linhas 96-99). O `.catch`
   fallback para `/gestao/empresas` nunca dispara porque `/admin/empresas`
   resolve. **Suficiente** para esse cenario.

3. **`restoreEmpresa` mockado via barrel `@/hooks/useAPI`** —
   Confirmado. Grep: `useAPI.ts:88: restoreEmpresa,` (reexporta de
   `useAdminEmpresas.ts:46`). A page importa de
   `@/hooks/useAPI`. `vi.mock('@/hooks/useAPI', ...)` intercepta no
   barrel — caminho correto. Se importasse direto de
   `@/hooks/api/useAdminEmpresas`, o mock no barrel nao pegaria, mas
   nao e o caso.

4. **Sem mock de `themeStore`** — Confirmado. Grep em `page.tsx` por
   `useThemeStore` retorna zero matches. A page usa Tailwind classes
   diretamente (`bg-blue-500/10`, `text-blue-400`, etc.) sem
   tematicacao por store. Match com o comentario do brief.

5. **`DeleteEmpresaModal` mockado como `() => null`** — Correto. A
   page renderiza esse modal incondicionalmente (ver linhas finais
   do JSX) mas como os testes nao interagem com delete, trivializar
   pra null e o mais simples. Sem efeito colateral.

6. **`showToast` apos restore** — Apos resolve, o handler chama
   `showToast('success', ...)` que faz `setToast({ ... })` + agenda
   `setTimeout(() => setToast(null), 4000)`. Os testes NAO esperam o
   toast e isso e aceitavel:
   - O assert chave e `disabled === false` no botao apos resolve —
     prova que o finally rodou e o id saiu do Set.
   - O toast e effect colateral de UX, nao parte da regressao que o
     PR cobre. Forcar assert no toast acoplaria o teste a um detalhe
     visual.
   - O `setTimeout` de 4000ms nao chega a vencer dentro do teste (o
     teste termina em <100ms post-resolve). Como nao ha `vi.useFakeTimers`,
     o timer fica pendente — Vitest aceita isso silenciosamente (nao
     ha leak warning de jsdom). **Aceitavel.**

7. **`loadData()` chamado apos resolve** — Confirmado, e nao
   verificado no teste. A robustez deste arranjo e media:
   - `apiGetMock.mockImplementation` mantem o comportamento entre
     chamadas — quando `loadData` reroda, retorna as mesmas 2 empresas
     com `deleted_at` ainda populado. O botao Restaurar continua
     existindo, com `restoringEmpresaIds.has(emp.id) === false` ja
     que o finally limpou. **Teste passa.**
   - Se o backend real removesse `deleted_at` apos restore, o botao
     desapareceria e o assert `btnAlfa.hasAttribute('disabled') === false`
     em referencia ao botao antigo continuaria valido (o elemento
     existe em memoria ate o React desmonta-lo na proxima render).
     Levemente fragil — uma versao defensiva trocaria o mock de
     `/admin/empresas` para retornar `deleted_at: null` apos resolve.
   - Pratico: o teste foca na transicao do Set, nao no refetch.
     Esta abordagem espelha o teste do PR #152 e foi aprovada la.
     **Aceitavel como esta, com nota leve.**

---

## Sugestoes nao-bloqueantes (1)

1. **Assertion explicita no refetch** (cosmetico) — O Teste 1 do PR
   #152 inclui `expect(refetchMock).toHaveBeenCalledTimes(2)` apos as
   duas resolucoes; aqui o equivalente seria
   `expect(apiGetMock).toHaveBeenCalledWith('/admin/empresas')` x3
   (1x init + 2x refetch). Reforcaria que cada restore bem-sucedido
   dispara seu proprio `loadData`. Pequeno. Nao bloqueia o PR.

Nao bloqueia este PR — o teste atual ja cobre o pivot principal
(transicoes do `disabled`).

---

## Bloqueadores FAIL / PARTIAL

**Nenhum.** Os 6 bloqueadores B1..B6 estao OK.

---

## Veredicto

**APPROVE — merge imediato.**

PR cirurgico que fecha exatamente a sugestao nao-bloqueante #1 do
audit do PR #152. Pattern Set-imutavel reaproveitado 1-pra-1, sem
desvio. Diff < 210 linhas, 91% e teste (190 / 207). Suite cresce
326 -> 328, build limpo (44 rotas), sem credenciais expostas.

Risco zero para deploy. Comportamento single-restore intacto;
paralelismo agora correto em ambas as paginas admin (BI
`/admin/usuarios` ja resolvido no #152, portal `/admin` resolvido
aqui).
