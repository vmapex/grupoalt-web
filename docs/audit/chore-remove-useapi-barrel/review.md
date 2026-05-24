# Audit — PR #154 chore: remove barrel useAPI.ts, importar dominio direto

**Commit:** 627367b
**Branch:** chore/remove-useapi-barrel
**Base:** main (4306a59)
**Data:** 2026-05-24
**Auditor:** Claude Opus 4.7 (1M context) — auditoria independente

## Score: 98/100
## Recomendação: APPROVE (merge limpo)

Refactor mecânico, sem alteração de lógica de negócio. Remove o barrel
`src/hooks/useAPI.ts` (90 LOC de re-exports introduzidas em P2 — 2026-05-21)
e migra os 23 call sites para importar direto dos módulos de domínio em
`src/hooks/api/*`. Diff total: +32 / −115 em 24 arquivos. Suite 328/328
verde, build em 44 rotas sem regressão.

## Matriz (B1..B7) — 7/7 PASS, zero FAIL/PARTIAL

| # | Bloqueador | Status |
|---|---|---|
| B1 | Zero leftover do barrel: `grep -rn "@/hooks/useAPI"` e `from './useAPI'` retornam 0 hits; `src/hooks/useAPI.ts` deletado; `useAPI.test.ts` movido para `src/hooks/api/_core.test.ts` | PASS |
| B2 | Mapeamento correto dos 23 consumers para os domínios certos (extrato, saldos, CPCR, fluxo, conciliacao, notificacoes, categoriasAPI, contasBancarias, orbitAudit, adminEmpresas, _core) | PASS |
| B3 | Os 2 mocks de teste apontam para `@/hooks/api/useAdminEmpresas` (onde `restoreEmpresa` e `deleteEmpresa` realmente vivem) | PASS |
| B4 | Test file movido (não copiado): git detecta `R097 useAPI.test.ts → api/_core.test.ts`; import interno é `from './_core'` (relativo correto) | PASS |
| B5 | Build 44 rotas sem regressão; `/bi/financeiro` em 12.7 kB / 317 kB First Load; tree-shaking preservado | PASS |
| B6 | Suite 328/328 em 24 arquivos (~12s); `npm run typecheck` limpo; `npm run audit:bundle` → 0 credenciais em 85 arquivos JS | PASS |
| B7 | Escopo cirúrgico: 22 `.tsx`/`.ts` consumers, 2 mocks, 1 test renomeado, barrel deletado. **Zero alteração nos módulos `src/hooks/api/*`** (apenas o test movido aparece sob esse path) | PASS |

## Análise das considerações específicas

### 1. Imports mistos quebrados em múltiplas linhas

`src/app/bi/financeiro/page.tsx` (dashboard) é o pior caso — antes
importava 5 hooks de 1 linha. Agora:

```tsx
import { useExtrato } from '@/hooks/api/useExtrato'
import { useCPAll, useCRAll } from '@/hooks/api/useCPCR'
import { useConcilResumo } from '@/hooks/api/useConciliacao'
import { useFluxoCaixa } from '@/hooks/api/useFluxo'
```

4 linhas (não 5 — `useCPAll`/`useCRAll` co-domínio em `useCPCR`). Bloco
separado por linha em branco do bloco anterior de utilitários. Pattern
idêntico em `AnaliseIAView.tsx`, `fluxo/page.tsx`, `fluxo/_content.tsx`.

`cp-cr/page.tsx` e `cp/_content.tsx` foram além: a versão anterior já
tinha 2 imports separados do mesmo barrel (`useBaixas` numa linha,
`useCPAll, useCRAll, useCPResumo, useCRResumo` em outra). O PR consolidou
em **1 linha só** apontando para `@/hooks/api/useCPCR` — net −1 linha
por arquivo. Pequena vitória de legibilidade.

### 2. Ordering consistente com vizinhos

Em todos os arquivos com múltiplos imports de domínio, a ordem segue:
`useExtrato` antes de CPCR antes de `useFluxo` antes de `useConciliacao`.
Não há regra estrita no projeto (sem ESLint `import/order` ativo
quebrando), mas a consistência entre `page.tsx` (BI), `AnaliseIAView.tsx`
e `fluxo/_content.tsx` (portal) sugere ordenação intencional pelo
caminho lógico do consumidor. OK.

### 3. `useCategoriasMap.ts` interno

Importava `useCategorias` via `from './useAPI'` (relativo). Agora
`from './api/useCategoriasAPI'`. Path correto — `useCategoriasMap.ts`
vive em `src/hooks/`, então `./api/useCategoriasAPI` resolve para
`src/hooks/api/useCategoriasAPI.ts`. Confirmado.

### 4. Sem regressão runtime nos domínios

`git diff main..HEAD --name-only -- src/hooks/api/` retorna **somente**
`src/hooks/api/_core.test.ts` (o arquivo movido). Os 11 módulos de
domínio (`useExtrato.ts`, `useSaldos.ts`, `useCPCR.ts`, `useFluxo.ts`,
`useConciliacao.ts`, `useNotificacoes.ts`, `useCategoriasAPI.ts`,
`useContasBancarias.ts`, `useOrbitAudit.ts`, `useAdminEmpresas.ts`,
`_core.ts`) **não foram tocados**. Refactor é 100% no lado dos
consumers + mocks.

### 5. Bundle (audit:bundle 84 → 85 JS files)

CLAUDE.md menciona "84 arquivos JS" como baseline pós-refactor de
2026-05-24. Build atual reporta 85 — diferença de **1 arquivo**.
Investigação: o número é função do número de chunks emitidos pelo Next
após code-splitting; remover o barrel pode mudar o particionamento mesmo
sem aumentar superfície (1 import indireto vira 1 import direto, o
bundler pode escolher chunk diferente). O bundle total e o First Load JS
de cada rota não regrediram — `/bi/financeiro` permanece em 12.7 kB
(317 kB shared), idêntico ao baseline histórico. **Sem expansão de
superfície de código**; 0 credenciais expostas.

### 6. Mocks pre-existentes pointavam para o barrel

Antes: `vi.mock('@/hooks/useAPI', () => ({ restoreEmpresa: ... }))`. Isso
funcionava porque o barrel re-exportava de `useAdminEmpresas`, e mockar
o módulo de "entry point" do consumer cobre o caso. Mas como agora o
consumer importa direto de `@/hooks/api/useAdminEmpresas`, o mock teve
que ser realocado pro path do módulo real — caso contrário o `vi.mock`
seria no-op e os testes falhariam. Validação: o teste `page.test.tsx`
exercita o cenário do PR #153 (race condition restore paralelo) — passa,
confirmando que o mock está pegando.

## Validações automatizadas

- `npm install --no-audit --no-fund` → 718 packages, OK
- `npm run typecheck` → sem erros (saída vazia)
- `npm test -- --run` → **328 passed (328)** em 24 arquivos, ~11.7s
- `npm run build` → **44 rotas**, middleware 87.2 kB,
  `/bi/financeiro` 12.7 kB / 317 kB sem regressão
- `npm run audit:bundle` → 85 JS files, 0 credenciais expostas
- `git diff main..HEAD --find-renames --name-status` → confirma
  `R097 src/hooks/useAPI.test.ts → src/hooks/api/_core.test.ts` e
  `D src/hooks/useAPI.ts`

## Diff por categoria

| Categoria | Arquivos | Diff |
|---|---|---|
| Consumers BI (`src/app/bi/financeiro/`) | 10 | imports patch |
| Consumers Portal (`src/app/portal/financeiro/`) | 5 | imports patch |
| Consumers Admin (`src/app/portal/admin/`, `src/components/admin/`) | 2 (+2 testes) | imports patch + mocks |
| Components (analise, nav) | 2 | imports patch |
| Hook interno (`useCategoriasMap.ts`) | 1 | imports patch |
| Test renomeado | 1 | move + 1 linha (import relativo) |
| Barrel deletado | 1 | −90 LOC |
| **Total** | **24** | **+32 / −115** |

## Riscos residuais

Nenhum. Refactor mecânico, sem lógica nova, sem mudança de API pública,
sem mudança em componentes UI, sem mudança em endpoints. A única
"superfície externa" do PR é o conjunto de imports — todos validados por
typecheck + suite verde + build.

Pontos de atenção para o futuro (nenhum bloqueador agora):

1. **Convenção de imports para hooks de API**: agora que o barrel sumiu,
   novos consumers devem importar de `@/hooks/api/<dominio>`. Vale
   considerar uma regra ESLint `no-restricted-imports` para bloquear
   reintrodução de `@/hooks/useAPI` no futuro (defesa em profundidade) —
   fica como follow-up opcional, não é blocker.

2. **Co-localização de testes**: o move `useAPI.test.ts → api/_core.test.ts`
   estabelece o padrão de co-localizar testes com o módulo testado
   (`src/hooks/api/_core.ts` + `src/hooks/api/_core.test.ts`). Outros
   testes em `src/hooks/api/` já seguem esse padrão (`useAdminPerfis.ts`
   + `useAdminPerfis.test.ts`). Consistente.

## Pontuação detalhada

| Critério | Peso | Nota | Subtotal |
|---|---|---|---|
| Corretude do mapeamento de imports | 25 | 25 | 25 |
| Escopo cirúrgico (zero side-effects) | 20 | 20 | 20 |
| Suite verde + typecheck + build | 20 | 20 | 20 |
| Mocks de teste atualizados corretamente | 15 | 15 | 15 |
| Mensagem de commit clara + rename detectado | 10 | 10 | 10 |
| Legibilidade dos imports resultantes | 10 | 8 | 8 |
| **Total** | **100** | | **98** |

−2 em legibilidade: alguns arquivos (`page.tsx`, `AnaliseIAView.tsx`,
`fluxo/_content.tsx`) ficaram com 3-4 imports consecutivos de
`@/hooks/api/*`, o que é factualmente mais verboso que a 1 linha
anterior. É o trade-off explícito do refactor (clareza de origem >
brevidade) e há precedente no projeto, mas não é gratuito. Não justifica
revert.

## Conclusão

**APPROVE.** Refactor mecânico exemplar — escopo cirúrgico, suite verde,
build sem regressão, mocks corrigidos no ponto certo, rename detectado
pelo git. Pronto para merge.
