# Audit — PR #156: `refactor/error-presentation-shared`

- **Repo:** `vmapex/grupoalt-web`
- **Branch:** `refactor/error-presentation-shared` (commit `ea1b9fe`)
- **Base:** `main`
- **Diff:** +377 / -46 em 5 arquivos
- **Encerra:** OBS-2 do audit do PR #150 (E2 ConfirmDeleteModal base)
- **Data:** 2026-05-24
- **Veredito:** **APPROVE** — **Score 95/100**

---

## 1. Sumário executivo

PR extrai os tipos `ErrorKind / ErrorSeverity / ErrorPresentation` + uma
versão **generalizada** de `describeAxiosError(err, opts)` do
`src/components/chat/chatHelpers.ts` para um lib novo
`src/lib/errorPresentation.ts`, e aplica em duas telas administrativas
(`/bi/financeiro/admin/usuarios` com banner colorido por severidade e
`/portal/admin` com toast de erro consistente).

**Achado crítico não-bloqueante:** o título do PR diz "extrai
`describeAxiosError`", mas na prática o `chatHelpers.ts` **mantém sua
própria cópia inalterada** da função (apenas os tipos foram movidos +
re-exportados). Isso é **na verdade a decisão correta** — preserva 100%
das mensagens chat-específicas ("Voce nao tem acesso aos dados desta
empresa.", "Empresa nao encontrada.", "Orbit indisponivel...") sem
forçar o ChatPanel a passar opções por todo lado. Apenas a descrição
do PR está levemente imprecisa. Ver detalhe em B1.

Refactor cirúrgico, testes verde, build limpo, nenhum side-effect fora
dos 5 arquivos do escopo.

---

## 2. Matriz de validação B1..B8

| # | Critério | Resultado | Notas |
|---|---|---|---|
| **B1** | Equivalência com `describeAxiosError` antigo (chat) | **PASS** | `chatHelpers.describeAxiosError` continua **idêntica** (linhas 81-159 do `chatHelpers.ts`). Só os 3 tipos foram movidos para o lib novo + re-exportados. 24/24 tests chatHelpers verde. Mensagens chat-específicas (403 "aos dados desta empresa", 404 "Empresa nao encontrada", 5xx "Orbit indisponivel...") **preservadas**. Zero risco de regressão na UX do chat. |
| **B2** | Aplicação em admin/usuarios correta | **PASS** | `SEVERITY_COLORS` mapeia 4 severidades para cores (rate/warn→âmbar, error→vermelho, info→cinza). `data-severity` attribute presente. `role="alert"` preservado. 2/2 tests race-condition verde. |
| **B3** | Aplicação em portal/admin correta | **PASS** | `showToast('error', presentation.message)` mantém binário success/error; usa apenas o texto do ErrorPresentation. 2/2 tests verde. Trade-off documentado (ver §3.3). |
| **B4** | 19 tests novos cobrem o lib | **PASS** | Cobertura sólida: 401/403/404/409/422/429×2/500/503/network/418 + 3 opções (entity, prefix, messages override, combinação) + 2 edges (null/undefined err) + 1 type contract. Asserts concretos (`toBe(...)` com texto exato), não placeholder. 19/19 verde em ~1.15s. |
| **B5** | Tipos re-exportados via chatHelpers | **PASS** | Linha 70 do chatHelpers.ts: `export type { ErrorKind, ErrorSeverity, ErrorPresentation } from '@/lib/errorPresentation'`. Imports existentes em `ChatPanel.tsx` (linhas 9-12) e `chatHelpers.test.ts` continuam funcionando sem mudança. |
| **B6** | `conflict` (409) novo é justificado | **PASS** | `severity: 'error'` (não rate). Faz sentido para admin (restore de entidade já restaurada, criação duplicada, etc). Usa `detail` do backend antes do fallback genérico — preserva mensagem específica do servidor. |
| **B7** | Sem regressão fora dos 5 arquivos | **PASS** | `git diff main..HEAD --name-only` confirma exatamente os 5 arquivos do escopo. Demais admin pages (categorias, contas-bancarias, orbit) não tocadas — migração incremental conforme proposta no PR. |
| **B8** | Suite verde + bundle limpo | **PASS** | `npm run typecheck` sem erros. `npx vitest run errorPresentation.test.ts` 19/19. `npx vitest run chatHelpers.test.ts` **24/24**. `npm test` **347/347** em 25 arquivos. `npm run build` OK (Middleware 71.6kB, "First Load JS shared" 164kB). `npm run audit:bundle` 85 arquivos, 0 credenciais. ESLint apenas com 2 warnings pré-existentes (`react-hooks/exhaustive-deps` em pontos não tocados pelo PR). |

**Resultado:** 8/8 verde.

---

## 3. Considerações específicas (resposta a §"Considerações")

### 3.1 — 403 do chat: "aos dados desta empresa" preservada?

**SIM**, sem regressão silenciosa. A análise inicial sugeria que o chat
poderia ter virado genérico `"Voce nao tem acesso a este recurso."`. Na
prática, **o `chatHelpers.ts` ainda contém a função `describeAxiosError`
completa e inalterada** (linhas 81-159). Apenas os tipos foram movidos.

Trecho relevante de `chatHelpers.ts` (preservado pós-refactor):

```ts
if (status === 403) {
  return {
    kind: 'forbidden',
    message: 'Voce nao tem acesso aos dados desta empresa.',
    severity: 'error',
  }
}
```

E `ChatPanel.tsx` linha 156 importa do `chatHelpers`, não do
`errorPresentation`:

```ts
import { describeAxiosError, ..., type ErrorPresentation, ... } from './chatHelpers'
// linha 156:
setErrorState(describeAxiosError(err))
```

Trade-off escolhido pelo PR: **duas implementações coexistem** — a do
chat preserva strings de UX consagradas; a do lib é mais genérica e
permite que admin pages componham mensagens via `entity`/`prefix`.
Quem chama qual fica claro pelo import path. Aceitável por escopo:
unificar exigiria mexer no contrato do ChatPanel e em testes que
fazem `expect(out.message).toContain('Limite diario')`.

**Crítica leve (sugestão pós-merge):** o título do PR diz "extrai +
função", mas a função do chat foi **mantida** e o lib criou uma **nova**
function generalizada com mesma assinatura base. Trocar a descrição do
PR para "extrai tipos + cria versão generalizada de describeAxiosError"
ajudaria o histórico. Não-bloqueante.

### 3.2 — Banner via IIFE em admin/usuarios

JSX `{restoreError && (() => { const c = SEVERITY_COLORS[severity]; return <div .../> })()}`.
Padrão funciona — escopa `c` sem poluir o componente pai. Alternativas:

- **Sub-componente `<ErrorBanner presentation={...} onClose={...} />`**:
  mais limpo, testável isoladamente, reusável quando o pattern se
  espalhar para outras admin pages.
- **`useMemo`/inline ternary**: menos legível.

**Recomendação não-bloqueante:** quando o pattern for aplicado em
mais 2-3 telas (e.g., admin/categorias, admin/orbit), extrair
`<ErrorBanner>` em `src/components/admin/ErrorBanner.tsx` com testes
próprios (severity → cor, click X, role=alert). Para 1 call site, IIFE
é aceitável e evita over-engineering.

### 3.3 — Toast em portal/admin não-severity-aware

Documentado como out-of-scope no diff (comentário inline):

```ts
// Usa describeAxiosError para cobrir 409 (ja restaurada), 403 (RBAC),
// 429 (rate limit), 5xx (unavailable) com mensagens consistentes.
const presentation = describeAxiosError(err, {
  entity: 'empresa',
  prefix: `Falha ao restaurar "${emp.nome}"`,
})
showToast('error', presentation.message)
```

**Trade-off real:** `showToast` é binário (`'success' | 'error'`) — o PR
poderia ampliar a API do toast para aceitar severidade (e.g., `'info'`
em graceful degradation 5xx), mas teria que atualizar 7 call sites e
expandir o componente. Razoável adiar.

**Consequência operacional:** restore de empresa que pega rate-limit
do Omie (5xx) **vai mostrar toast vermelho** em vez de cinza/info —
visualmente igual a um erro real. Mensagem ainda fica precisa
("Servico indisponivel no momento..."), só a cor mente. Aceitável até
a primeira reclamação do usuário ou expansão do toast helper.

### 3.4 — Kind `conflict` no chat: over-engineering?

`conflict` foi adicionado para 409, comum em admin (restaurar entidade
já restaurada, criar duplicada). O ChatPanel **nunca** vai receber 409
do `/orbit/chat` — o endpoint não tem semântica de conflito.

**Mas:**

- O kind vive no `ErrorPresentation` shared, não na função do chat.
- Overhead zero: 1 string literal a mais no type union, sem código de
  runtime adicional no chat (que segue usando sua função local sem
  tratar 409 — cairia em `unknown`).
- Custo de NÃO ter: cada admin page que quisesse 409 teria que
  duplicar o handling.

**Veredito:** aceitável. Type union é grátis em TS.

### 3.5 — `capitalize` helper privado

```ts
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
```

Mantido privado no `errorPresentation.ts`. Pequeno demais para
exportar. **Concordo com a escolha.** Caso vire necessário em outro
lugar, mover para `src/lib/string.ts` ou `formatters.ts` e exportar
quando o segundo call site aparecer (regra de 3).

---

## 4. Achados positivos

1. **Compatibilidade pra trás 100%**: ChatPanel não muda, 24 testes
   chatHelpers verde, mensagens chat-específicas intactas.
2. **Tests novos sólidos**: 19 testes do lib novo cobrem matriz status
   × opções com asserts concretos (`toBe`, não `toBeTruthy`).
3. **Design clean das opções**: `entity` + `prefix` + `messages` cobre
   tanto o caso simples (admin/usuarios passa `entity: 'usuario'`)
   quanto o complexo (chat passaria `messages` se quisesse migrar).
4. **`unavailable` com severity `info`**: preserva a semântica de
   graceful degradation do Step 16 — feature degrada, não bloqueia UI.
5. **Comentários inline**: o `// fora de escopo` em portal/admin
   explicita o trade-off em vez de esconder.
6. **`data-severity`** attribute em admin/usuarios: pavimenta para
   testes futuros que asseram cor via attribute (não computed style).

---

## 5. Sugestões não-bloqueantes (pós-merge)

| # | Sugestão | Prioridade |
|---|---|---|
| S1 | Atualizar descrição do PR para refletir que a função do chat foi mantida (apenas tipos extraídos + nova função generalizada). | baixa (doc) |
| S2 | Quando aplicar o pattern em uma 3ª tela admin, extrair `<ErrorBanner presentation={...} onClose={...} />` em `src/components/admin/` com 2-3 tests (cor por severidade, click X, `role="alert"`). | média |
| S3 | Ampliar `showToast` para aceitar severidade (`info | warn | error | success`) e migrar todos os 7 call sites de uma vez. Pode virar PR próprio. | média |
| S4 | Adicionar 1 test de UI no `usuarios/page.test.tsx` que verifica `data-severity="error"` no banner após erro 422/409 simulado. Hoje os 2 tests só cobrem race condition. | baixa |
| S5 | Considerar migrar o chat para o lib compartilhado passando `messages: { forbidden: '...', not_found: '...', unavailable: '...' }` em call site único — eliminando a duplicação da função. Requer mexer no contrato do `errorState` (já é `ErrorPresentation`, então mecânico). Sem urgência. | baixa |

---

## 6. Resultado dos comandos automatizados

```
npm install --no-audit --no-fund                → up to date in 1s
npm run typecheck                                → sem erros
npx vitest run errorPresentation.test.ts        → 19/19 PASS (1.15s)
npx vitest run chatHelpers.test.ts              → 24/24 PASS (1.12s) ← CRÍTICO
npm test (vitest run)                            → 347/347 PASS (25 arquivos, 8.49s)
npx vitest run admin/usuarios                    → 2/2 PASS
npx vitest run portal/admin                      → 2/2 PASS
npm run build                                    → OK
npm run audit:bundle                             → 85 arquivos JS, 0 credenciais expostas
npx eslint <5 arquivos do PR>                    → 0 erros, 2 warnings PRÉ-EXISTENTES
git diff main..HEAD --name-only                  → exatamente 5 arquivos (escopo confirmado)
```

**Build size:** sem regressão; lib novo é tree-shake friendly (apenas
funções exportadas) e cresce ~0.3 kB no chunk shared (negligível).

---

## 7. Score detalhado

| Categoria | Peso | Score | Pontos |
|---|---|---|---|
| Compatibilidade (B1, B5) | 25 | 25/25 | Chat 100% preservado, tipos re-exportados, sem mudança de contrato. |
| Testes (B4, B8) | 20 | 20/20 | 19 novos + 24 antigos + 347 totais; todos com asserts concretos. |
| Aplicação correta (B2, B3) | 20 | 19/20 | -1: data-severity prometido para tests mas nenhum test novo o exercita. |
| Justificativa do escopo (B6, B7) | 15 | 15/15 | `conflict` justificado, sem creep fora dos 5 arquivos. |
| Qualidade do código | 10 | 9/10 | -1: IIFE no banner é aceitável mas sub-componente seria melhor (sugestão S2). |
| Documentação | 5 | 4/5 | -1: título do PR levemente impreciso (sugestão S1). |
| Build / Bundle / Lint | 5 | 5/5 | Limpo. |
| **TOTAL** | **100** | **97/100** | |

Ajuste final: -2 por trade-off do toast em portal/admin (sem severidade
de cor — restore com 5xx mostra vermelho, não info). Não chega a ser
bug, mas é regressão sutil da UX prometida no Step 16. **Score
final 95/100.**

---

## 8. Veredito

**APPROVE — 95/100.** Refactor cirúrgico, baixíssimo risco,
compatibilidade pra trás perfeita. Sugestões S1-S5 são todas pós-merge.
Pode mergear via squash conforme padrão do projeto.

**Próximos passos sugeridos:**

1. Mergear este PR.
2. Quando aplicar o pattern em 1 admin page a mais, abrir PR para
   extrair `<ErrorBanner>` (sugestão S2).
3. Considerar PR separado para tornar `showToast` severity-aware
   (sugestão S3) — desbloqueia graceful degradation visual em
   portal/admin.
