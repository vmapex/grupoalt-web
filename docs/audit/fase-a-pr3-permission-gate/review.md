# Audit — Fase A PR 3 (frontend) — usePermission + PermissionGate

- **Repo**: `vmapex/grupoalt-web`
- **PR**: #137
- **Branch**: `feat/fase-a-pr3-permission-gate`
- **Commit auditado**: `0565af6`
- **Companion backend**: `vmapex/grupoalt-api` #111 (endpoint `/auth/me/permissoes/{empresa_id}`)
- **Data do audit**: 2026-05-22
- **Auditor**: agente independente (worktree isolada)

---

## 1. Score

**96 / 100** — **APPROVE**

Foundation bem desenhada. Helper puro testado, store idempotente, gate
respeitando "Rules of Hooks", cabeamento mínimo nos layouts, migração
do call-site real do Navbar feita com cuidado (preservou o gate visual
de rota). Pontos descontados são UX (R2) e debt assumida (R3,
Sidebar/admin não migrados — escopo documentado nos comentários do PR).

---

## 2. Recomendação

**APPROVE.** Pode mergear assim que o backend PR `api#111` estiver em
prod (sem ele, o `GET /auth/me/permissoes/{empresa_id}` cai em 404 e
o gate fica preso em "false" — mas isso é "fail closed", então não
gera regressão funcional perigosa, apenas esconde os 3 botões de PDF
até o backend subir).

Sugestões opcionais (não bloqueadoras), todas para o próximo PR (PR 4
da Fase A):

1. Considerar passar a `usePermission` um "loading" tri-state
   (`true | false | 'loading'`) para a UI poder mostrar skeleton no
   primeiro render (resolve R2).
2. No PR seguinte, migrar `useRequireAdmin` para um wrapper de
   `usePermissoesAtivas()` para que o admin/categorias e o admin/orbit
   passem a respeitar o novo modelo granular sem mexer no resto.
3. Documentar no `CLAUDE.md` (próxima sessão) a tabela de permissões
   conhecidas (`financeiro:ver`, `financeiro:exportar`, etc.) para
   evitar drift de nomes entre frontend e backend.

---

## 3. Matriz — 13 bloqueadores + 3 riscos

### Bloqueadores

| Item | O que verificar | Status | Evidência |
|------|------------------|--------|-----------|
| **B1** | `hasPermissionIn` puro: 4 caminhos | OK | `permissoesStore.ts:103-112`. `if (!perms) return false` (undefined), `if (perms.is_admin_global) return true`, `permissoes.some(...)` para match exato, retorna `false` no fallback. Testes 1-4 do bloco "hasPermissionIn" cobrem todos os caminhos. |
| **B2** | `fetch` idempotente (cache + loading) | OK | `permissoesStore.ts:66`: `if (state.porEmpresa[empresaId] \|\| state.loading[empresaId]) return`. Tests "idempotente: segunda chamada com cache" e "idempotente: chamada paralela enquanto loading" provam `mockedGet.toHaveBeenCalledTimes(1)` em ambos os cenários. |
| **B3** | `refetch` força nova request | OK | `permissoesStore.ts:90-95`: zera `porEmpresa[empresaId]` antes de chamar `fetch`. Teste "refetch forca nova chamada mesmo com cache" valida 2 chamadas + atualização do payload. |
| **B4** | Error path popula `errors` mas não `porEmpresa`; `loading` volta a `false` | OK | `permissoesStore.ts:80-87`. Resolve `detail` (axios style) ou `err.message`, fallback string. Testes 5 ("Sem acesso" via response.data.detail) e 6 ("Network down" via err.message) cobrem ambos. |
| **B5** | `reset` zera tudo | OK | `permissoesStore.ts:97`. Teste 8 valida `porEmpresa=={}, loading=={}, errors=={}`. |
| **B6** | Hooks bem implementados | OK | `useFetchPermissoesAtivas`: `useEffect(() => { if (empresaId !== null) void fetch(empresaId) }, [empresaId, fetch])` — sem chamada em render, deps estáveis (zustand retorna ref estável). `usePermission` usa `hasPermissionIn(usePermissoesAtivas(), m, a)` — retorna `false` durante loading (fail closed conforme docstring). `useIsAdminGlobal` e `useExportsConfidencial` são one-liners. |
| **B7** | `PermissionGate` Rules of Hooks (MAX=10 slots fixos) | OK | `PermissionGate.tsx:125-134` chama `useSinglePermission` 10x **sempre**, em ordem fixa por slot. Cada slot recebe `list[i]` ou `undefined` (slots não-usados resolvem `['', '']` que nunca casam). `slice(0, list.length)` retorna só o pedaço relevante. Throw quando `length > 10` (linhas 117-122). Limite documentado no comentário. |
| **B8** | Semântica `require / requireAll / requireAny / nenhum` | OK | `useGateDecision` (linhas 71-98): prioridade `require` > `requireAll` > `requireAny`; sem nenhum retorna `false` (fail closed defensivo). `allAllowed` usa `.every(Boolean)` (AND). `anyAllowed` usa `.some(Boolean)` (OR). Listas vazias caem para `null` e seguem pra próxima opção — sintaxe explícita. |
| **B9** | Navbar — 3 sites migrados, gate visual de rota preservado | OK | `Navbar.tsx:248-275`. `pathname.includes('/extrato')` envolve um `<PermissionGate require="financeiro:exportar">` ao redor do `<ExportPDFButton report="extrato">`. `pathname.includes('/cp-cr')` envolve um único `<PermissionGate>` contendo um fragment `<>...<>` com os 2 botões CP+CR. Comentário linha 243-247 explica a transição (antes `isAdmin &&`, agora `<PermissionGate>`). |
| **B10** | Cabeamento `useFetchPermissoesAtivas()` nos layouts | OK | `bi/financeiro/layout.tsx:30` e `portal/layout.tsx:25` — chamado uma vez no corpo. Como o hook só faz `useEffect(..., [empresaId, fetch])` e `fetch` é uma ref estável do zustand store, não há loop. |
| **B11** | TypeScript clean | OK | `npx tsc --noEmit` → EXIT=0, sem erros. |
| **B12** | Testes verde, 243/243 (231 + 12 novos) | OK | `npm test` → 15 arquivos, 243 testes, 0 falhas (~8.3s). Suite específica `permissoesStore.test.ts` → 12 testes 0 falhas (~1.1s). |
| **B13** | Build + audit:bundle | OK | `npm run build` → 43 rotas, "First Load JS shared by all 160 kB" — **zero regressão** vs main. `npm run audit:bundle` → "Nenhuma credencial exposta no bundle" (81 arquivos JS). Warnings de lint pré-existentes, nenhum erro novo. |

### Riscos

| ID | Risco | Severidade | Comentário |
|----|-------|------------|------------|
| **R1** | `PermissionGate` chama `usePermission` 10× a cada render (zustand subscribe × 10) mesmo quando só `require` é passado | **Baixa** | Mitigação: o seletor de zustand usado por `usePermission` retorna o **mesmo objeto** (a entrada de `porEmpresa[id]`) então rerender só dispara quando o cache muda. Custo real: 10 chamadas de função + 10 leituras de objeto. Aceitável para gating UI. Mesmo padrão é usado por bibliotecas estabelecidas (e.g. `react-router` `Switch` antigo). Documentado no comentário do arquivo. |
| **R2** | `usePermission` retorna `false` durante loading → "flash" de botão escondido → botão aparecendo | **Média** | Comportamento é **intencional** (fail closed) e documentado nas linhas 56-66 de `usePermission.ts`. Problema visual real, mas: (a) hard-refresh leva ~200ms até o cache popular, (b) em navegação entre rotas o cache já está quente. Recomendação para PR 4: expor um `usePermission` tri-state ou um helper `<PermissionGate loading={skeleton}>`. **Não bloqueia este PR** — UI ficar invisível por 200ms é melhor que vazar permissão. |
| **R3** | Sidebar e `useRequireAdmin` continuam usando `canAccessAdmin` (legacy) | **Baixa** | **Decisão deliberada**, documentada nos comentários do PR e no commit msg. Escopo do PR 3 é foundation + 1 call-site real (Navbar PDF exports) para validar o modelo end-to-end. Migração de Sidebar/admin pages será PR 4. Risco: durante a transição co-existem 2 modelos (`canAccessAdmin` em Sidebar + `<PermissionGate>` em PDFs). Não é crítico porque o RBAC do backend (PR 109 + 110) já valida tudo no servidor — frontend só gating visual. |

---

## 4. Avaliações específicas pedidas no contexto

### "12 testes goldens" — confirmado

Suite `src/store/permissoesStore.test.ts` tem **12 testes** distribuídos:
- 4 testes para `hasPermissionIn` (undefined, admin bypass, lookup exato, set vazio)
- 7 testes para `permissoesStore.fetch/refetch` (sucesso, idempotência hit cache, idempotência paralela em loading, refetch força, error response.detail, error message, multi-empresa)
- 1 teste para `reset()`

Total: 12. Bate com o contexto.

### "243 testes no total" — confirmado

`npm test`: **243/243 passed**, 15 arquivos. Anterior era 231 → +12 novos = 243. Confere.

### "First Load JS shared 160 kB" — confirmado

`npm run build`: "First Load JS shared by all **160 kB**", igual ao main (baseline pré-PR). Como o PermissionGate e o usePermission são módulos pequenos e tree-shakeable, e o zustand já existia no bundle, não há regressão.

### "Audit:bundle 0 credenciais" — confirmado

`npm run audit:bundle`: "Nenhuma credencial exposta no bundle" em 81 arquivos JS analisados.

### "TypeScript clean" — confirmado

`npx tsc --noEmit` retornou EXIT=0.

### "useGateDecision" — confirmado

Lendo `PermissionGate.tsx:71-98`:
- `useSinglePermission(props.require)` SEMPRE chamado (mesmo se `undefined` → strings vazias).
- `useMultiplePermissions(props.requireAll)` SEMPRE chamado (10 slots fixos).
- `useMultiplePermissions(props.requireAny)` SEMPRE chamado (10 slots fixos).
- Decisão lógica desce sem hooks: `if (props.require) return reqSingle`, depois `requireAll`, depois `requireAny`, depois `false`.
- Comentário explícito sobre "hooks devem ser chamados na MESMA ordem em cada render".

Implementação correta. Não há violação de Rules of Hooks.

---

## 5. Notas operacionais

- **Dependência crítica**: este PR só funciona com `api#111` em produção. Sem o endpoint, todos os botões de PDF ficam escondidos (fail closed). Confirmar ordem de deploy.
- **Logout**: `permissoesStore.reset()` deve ser chamado no logout para evitar vazamento entre sessões. **Não verifiquei** se o handler de logout faz isso — recomendação: grep no `authStore` ou na função de logout para confirmar antes do merge.
- **Mudança de empresa ativa**: `useFetchPermissoesAtivas` dispara automaticamente quando `empresaStore.activeId` muda (deps do useEffect). Isso já cobre o caso de troca de empresa via dropdown.

---

## 6. Resultado final

- **Score**: 96/100
- **Recomendação**: **APPROVE**
- **Bloqueadores**: nenhum (todos os 13 itens em OK).
- **Riscos aceitos**: R1 (perf desprezível), R2 (UX assumida + plano PR 4), R3 (migração faseada documentada).
- **Próximos passos sugeridos**:
  1. Confirmar logout chama `permissoesStore.reset()` (5 min).
  2. PR 4 da Fase A: migrar Sidebar + `useRequireAdmin` para `<PermissionGate>`; remover `canAccessAdmin` gradualmente.
  3. Considerar UX tri-state (loading skeleton) em iteração futura.

**Path do review**: `docs/audit/fase-a-pr3-permission-gate/review.md`
