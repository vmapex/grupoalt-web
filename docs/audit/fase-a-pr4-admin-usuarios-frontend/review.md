# Audit — Fase A PR 4 (frontend): UI admin para atribuir perfis RBAC

**PR:** vmapex/grupoalt-web#140  
**Branch:** `feat/fase-a-pr4-admin-usuarios`  
**Commit auditado:** `9c8e283`  
**Companion backend:** vmapex/grupoalt-api#113 (`/admin/perfis`, `/admin/usuarios/{id}/atribuicoes`)  
**Data:** 2026-05-22  
**Auditor:** Claude Opus 4.7 (1M context) — auditoria independente

---

## 1. Score

**89 / 100**

| Categoria          | Peso | Nota | Pondera |
|--------------------|-----:|-----:|--------:|
| Funcionalidade UI  | 25%  |  96  |  24.0   |
| Hooks API          | 20%  |  95  |  19.0   |
| RBAC / segurança   | 25%  |  64  |  16.0   |
| Type-safety/build  | 15%  | 100  |  15.0   |
| Estilo/convenção   | 10%  |  85  |   8.5   |
| Testes/regressão   |  5%  | 100  |   5.0   |
| **Total**          |      |      | **87.5** |

> Score arredondado para **89**: subi 1 ponto porque a falha de RBAC é
> defendida pelo backend (não há vazamento de dados), só renderiza o
> chrome da página por instantes; apesar disso permanece um bug claro
> que destoa do padrão estabelecido nas outras 3 páginas admin.

---

## 2. Recomendação

**REQUEST_CHANGES** — bloqueador único, fix trivial (≈ 6 LOC). Após
ajuste, sobe para **96+** e está aprovado.

> **Ressalva importante**: o critério do solicitante era "APPROVE com
> ≥ 92". Estou abaixo do limiar **exclusivamente** por causa do bloqueador
> B1 (guard RBAC errado). Como o padrão `adminAccess === 'loading'` /
> `=== 'denied'` já existe em outras 4 páginas (`admin/page.tsx`,
> `admin/categorias`, `admin/contas-bancarias`, `admin/orbit`), a UI nova
> destoa visivelmente da convenção e a correção é mecânica. Recomendo
> fix antes do merge (5 min de trabalho); audit follow-up sobe pra
> APPROVE em escala 96+.

---

## 3. Matriz dos 13 bloqueadores

| #   | Bloqueador                                  | Status   | Severidade | Evidência |
|-----|---------------------------------------------|----------|------------|-----------|
| B1  | Página /admin/usuarios + useRequireAdmin    | **FAIL** | Médio      | ver §4.B1 |
| B2  | 5 hooks API com URLs corretos               | PASS     | —          | §4.B2     |
| B3  | Form atribuir + filtro empresasDisponiveis  | PASS     | —          | §4.B3     |
| B4  | Lista de atribuições + badge confidencial   | PASS     | —          | §4.B4     |
| B5  | Sub-nav em 5 páginas com link "Usuários"    | PASS     | —          | §4.B5     |
| B6  | `npx tsc --noEmit` sem erros                | PASS     | —          | §4.B6     |
| B7  | `npm test` 243/243 verde                    | PASS     | —          | §4.B7     |
| B8  | `npm run build` sem regressão               | PASS     | —          | §4.B8     |
| B9  | `npm run audit:bundle` 0 credenciais        | PASS     | —          | §4.B9     |
| B10 | Aviso amarelo de bypass para is_admin       | PASS     | —          | §4.B10    |
| B11 | Idempotência (POST duplicado tolerado)      | PASS     | —          | §4.B11    |
| B12 | confirm() nativo antes de revogar           | PASS     | —          | §4.B12    |
| B13 | Strings pt-BR coerentes                     | PASS     | —          | §4.B13    |

**Resultado:** 12/13 PASS, 1 FAIL (B1 médio).

---

## 4. Evidências detalhadas

### B1 — Guard RBAC tratando string como boolean (**BLOQUEADOR**)

`src/hooks/useRequireAdmin.ts:16-24` define:

```ts
export type AdminAccess = 'loading' | 'allowed' | 'denied'
export function useRequireAdmin(): AdminAccess { ... }
```

Em `src/app/bi/financeiro/admin/usuarios/page.tsx:31,41`:

```ts
const allowed = useRequireAdmin()
...
if (!allowed) return <AccessDenied />
```

`!allowed` é **sempre `false`** porque `'loading'`, `'allowed'` e
`'denied'` são strings truthy. Consequências:

1. **Estado `loading`**: dispara `useAdminUsuarios()` e `useAdminPerfis()`
   antes da sessão estar autenticada. O interceptor de auth lida com
   401, mas é round-trip desnecessário e cria flash de tela.
2. **Estado `denied`**: a página renderiza inteira (header, sub-nav,
   lista vazia) em vez de mostrar `<AccessDenied />`. Backend
   eventualmente responde 403 e a lista fica vazia, mas a UX está
   errada e o padrão do projeto é violado.

Compare com `src/app/bi/financeiro/admin/orbit/page.tsx:63-72`,
`admin/page.tsx:172-179`, `admin/categorias/page.tsx:264-271`,
`admin/contas-bancarias/page.tsx:68-75` — **todas** as 4 páginas admin
existentes usam o padrão correto:

```ts
if (adminAccess === 'loading') return <Loader/>
if (adminAccess === 'denied')  return <AccessDenied/>
```

**Fix sugerido** (≈ 6 LOC):

```ts
const adminAccess = useRequireAdmin()
if (adminAccess === 'loading') return (
  <div className="flex items-center justify-center h-64">
    <span className="text-[12px]" style={{ color: t.muted }}>Carregando...</span>
  </div>
)
if (adminAccess === 'denied') return <AccessDenied />
```

Adicional sugerido (opcional, defesa em profundidade): gate dos hooks
condicionalmente: `useAdminUsuarios(adminAccess === 'allowed')` — mas
exige adaptar a assinatura do hook. A correção acima já basta para o
bloqueador.

**Severidade:** Média — backend é fonte autoritária (responde 403), não
há vazamento de dados. É um bug de UX/convenção, não de segurança real.

---

### B2 — Hooks API alinhados com backend

`src/hooks/api/useAdminPerfis.ts:47-84`:

- `useAdminUsuarios` → `GET /admin/usuarios` ✓
  (reusa `admin.py:504` — `list_usuarios` existente, RBAC admin-only)
- `useAdminPerfis` → `GET /admin/perfis` ✓ (`admin.py:650`)
- `useAdminUsuarioAtribuicoes(id)` → `GET /admin/usuarios/{id}/atribuicoes`
  ✓ (`admin.py:688`), retorna `null` URL quando `usuarioId` é null
  (`useApi(null)` em `_core.ts:49` aborta) — guard ok.
- `criarAtribuicaoPerfil(usuarioId, perfilId, empresaId)`:
  `POST /admin/usuarios/{id}/atribuicoes` com body `{perfil_id, empresa_id}`
  ✓ (`admin.py:725-731` espera exatamente esses campos via
  `AtribuicaoPerfilCreate`).
- `removerAtribuicaoPerfil(usuarioId, atribuicaoId)`:
  `DELETE /admin/usuarios/{id}/atribuicoes/{aid}` ✓ (`admin.py:812-815`).

Types exportados: `PerfilResumo`, `PerfilPermissaoResumo`,
`AtribuicaoPerfil`, `AdminUsuarioListado` — tudo conforme spec.

Pequena nota de estilo: types co-localizados no hook (não em
`lib/types.ts`). Aceitável — `useAdminEmpresas.ts` segue mesma
convenção (`AdminEmpresaAPI` colocalizado).

**PASS.**

---

### B3 — Formulário atribuir

`page.tsx:316-372`:

- 2 dropdowns (perfil + empresa). ✓
- `empresasDisponiveis` via `useMemo` (linhas 248-255) filtra empresas
  onde o user já tem o perfil selecionado. Lógica: comparar
  `a.perfil_id === novaPerfilId` (number vs `number | ''`); funciona
  porque o `useMemo` guarda com `if (!novaPerfilId) return empresas`.
- Botão desabilitado se `!novaPerfilId || !novaEmpresaId || adicionando`. ✓
- `Loader2` spin quando `adicionando`. ✓
- Erro do backend exibido em vermelho (linhas 363-371). ✓
- Após sucesso: `refetch()` + reset dos selects. ✓

Nota lint (warning não-bloqueante): `atribuicoes` é re-criada com `?? []`
em cada render, fazendo `empresasDisponiveis` recomputar
desnecessariamente. Mesma observação do PR #115 do Orbit. Não bloqueia.

**PASS.**

---

### B4 — Lista de atribuições

`page.tsx:375-441`:

- Mostra `perfil_nome` e `empresa_nome` direto do response (linhas 407-425). ✓
- Badge "Marca confidencial" via lookup `perfis.find((p) => p.id === a.perfil_id)`
  + `perfil?.exports_confidencial` (linhas 411-419). ✓
- Botão "Revogar" → `confirm(...)` antes de chamar (linha 275). ✓
- Após revogar: `refetch()`. ✓
- Estado vazio: "Nenhum perfil atribuído..." (linhas 386-392). ✓

**PASS.**

---

### B5 — Sub-nav nas 5 páginas

Verificado via `git diff main..pr-140`:

| Página                                          | Link Users? | Import Users? |
|-------------------------------------------------|-------------|---------------|
| `admin/page.tsx` (Empresas)                     | ✓ +19 LOC   | ✓             |
| `admin/categorias/page.tsx`                     | ✓ +13 LOC   | ✓             |
| `admin/contas-bancarias/page.tsx`               | ✓ +9 LOC    | ✓             |
| `admin/orbit/page.tsx`                          | ✓ +1 LOC    | ✓             |
| `admin/usuarios/page.tsx` (novo, auto-active)   | ✓ active    | ✓             |

A `orbit/page.tsx` usa `SubNavLink` extraído como helper local — apenas
1 linha adicionada lá. As outras 3 mantêm bloco JSX inline.

**PASS.**

---

### B6 — TypeScript

```
$ npx tsc --noEmit
$ echo $?
0
```

Sem erros. ✓

Observação menor: assinatura `perfis: ReturnType<typeof useAdminPerfis>['data'] extends infer T ? T extends Array<infer E> ? E[] : never : never`
(linhas 232-233) é convoluta. Equivale a `PerfilResumo[]`. Não quebra
typecheck, mas torna o componente menos legível. Refactor de **um dia
chuvoso**.

**PASS.**

---

### B7 — Testes

```
$ npm test
Test Files  15 passed (15)
     Tests  243 passed (243)
  Duration  8.61s
```

Zero regressão. Nenhum teste novo (esperado — backend já cobre com 20
tests pytest). ✓

**PASS.**

---

### B8 — Build

```
$ npm run build
✓ Compiled successfully
Route /bi/financeiro/admin/usuarios  6.92 kB   195 kB
First Load JS shared by all                    160 kB
Middleware                                     87.2 kB
```

50 rotas, shared 160 kB. Zero regressão de bundle. ✓

**PASS.**

---

### B9 — Bundle audit

```
$ npm run audit:bundle
Verificando 83 arquivos JS no bundle...
Nenhuma credencial exposta no bundle.
```

83 arquivos (era 79 no Step 17), 0 credenciais. ✓

**PASS.**

---

### B10 — Aviso de bypass para is_admin

`page.tsx:304-313` mostra caixa âmbar quando `user.is_admin === true`:

> "Admin global tem bypass total no RBAC — as atribuições abaixo são
> efetivamente ignoradas até `is_admin` ser desligado."

UX excelente — alinha com a semântica do `hasPermissao` em
`authStore.ts:72-79` que sempre retorna `true` para is_admin.

**PASS.**

---

### B11 — Idempotência tolerante

Backend `admin.py:758-774` retorna 200 com a atribuição existente em
duplicata (em vez de 409). Frontend não tem catch específico de
duplicata — confia na idempotência. Botão duplo-clique é seguro.

Adicional: `setAdicionando(true)` evita disparar request duplo enquanto
o primeiro está em voo. ✓

**PASS.**

---

### B12 — confirm() antes de revogar

`page.tsx:275`:

```ts
if (!confirm('Revogar este perfil deste usuário nesta empresa?')) return
```

Previne acidente. ✓ Modal customizado seria melhor (R3), mas escopo PR.

**PASS.**

---

### B13 — Strings pt-BR

Strings inspeccionadas: "Atribuir", "Revogar", "Marca confidencial",
"Atribuições atuais", "Selecione um perfil...", "Selecione uma empresa...",
"Admin Global", "Carregando usuários...", "Nenhum usuário encontrado",
"Nenhum perfil atribuído", "desde {data}", "em {empresa}".

Tudo pt-BR coerente, sem mistura com inglês. ✓

**PASS.**

---

## 5. Riscos (não-bloqueadores)

| #   | Risco                                                          | Severidade | Recomendação                |
|-----|----------------------------------------------------------------|------------|-----------------------------|
| R1  | Página inline com ~400 LOC, sem extrair componentes            | Baixa      | Aceitável (admin pouco usado) |
| R2  | Sub-nav duplicada em 5 páginas (cada uma com bloco JSX)        | Baixa      | Extrair `<AdminSubNav>` em PR futuro |
| R3  | `confirm()` nativo do browser (não premium)                    | Baixa      | Modal custom em sprint UI   |
| R4  | useMemo `empresasDisponiveis` recomputa em todo render         | Baixa      | Lint warning não-bloq.      |
| R5  | Empresas dropdown limitado ao escopo do user (admin com 1+ UE só vê próprias) | Média | Backend `auth.py:237` faz fallback só quando `not empresas`; admin com 1 row vê 1 empresa só. Validar em produção. |
| R6  | `perfis` typing por conditional inference é confuso (legível: `PerfilResumo[]`) | Baixa | Refactor de estilo opcional |

**R5 mereceria nota separada** se virar bloqueador na operação: hoje a
seed cria admin SEM `UsuarioEmpresa`, então recebe todas as empresas
ativas (não-deletadas) — comportamento atual ok. Mas se algum admin
foi criado posteriormente com vinculo a uma empresa, vai ver só essa
empresa no dropdown e nem perceber. Tickar como **operacional** para o
GO de produção (Step 17 já tem checklist).

---

## 6. Itens validados via linha de comando

```
[OK] npx tsc --noEmit                          → exit 0
[OK] npm test                                  → 243/243 (15 arquivos)
[OK] npm run build                             → 50 rotas, /admin/usuarios 6.92kB
[OK] npm run audit:bundle                      → 0 credenciais em 83 JS
[OK] npm run lint                              → só warnings (1 em usuarios, 30+ pré-existentes)
[OK] git diff main..pr-140 --stat              → 6 arquivos, +575 -4
[OK] backend endpoints                         → 4 endpoints novos confirmados em admin.py
[OK] POST body shape                           → {perfil_id, empresa_id} bate com AtribuicaoPerfilCreate
[OK] DELETE path                               → /admin/usuarios/{id}/atribuicoes/{aid} match
```

---

## 7. Conclusão

PR sólido em quase todos os critérios (12/13 PASS). O único bloqueador
é uma **regressão de convenção** na implementação do RBAC guard que
funciona "por acidente" — o backend salva a situação respondendo 403.
Mas:

1. A UI fica em estado inconsistente para users denied (chrome
   renderiza, lista vazia, sem `<AccessDenied />`).
2. Hooks API disparam request desnecessário antes da auth resolver
   (estado `loading`).
3. Quatro páginas admin já usam o padrão correto, então a divergência
   é puramente cosmética/de inatenção.

**Fix de 6 LOC + 0 testes novos (visto que o backend já cobre o RBAC
real).** Audit follow-up sobe score para **96+** com APPROVE.

**Recomendação final: REQUEST_CHANGES** com pedido específico do fix
de B1 antes do merge.

---

## 8. Path do review

`docs/audit/fase-a-pr4-admin-usuarios-frontend/review.md`
