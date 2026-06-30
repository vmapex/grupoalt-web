# Soak DRE Backend — Log de Monitoramento (OP-1)

> Flag `NEXT_PUBLIC_USE_BACKEND_DRE=true` virada em Vercel Production.
> **D = 2026-06-18 17:35 BRT** · **Gate D+7 = 2026-06-25 17:35 BRT** (libera PR-6 / Fase 5.G).
>
> Critério: monitoramento diário (mín. 7 dias). **Rollback instantâneo (<2 min)** se
> qualquer delta nos números do DRE, onda de 5xx em `/dre`, CSP violations, ou Sentry vermelho.

## Mecanismo de rollback (<2 min)

Como `NEXT_PUBLIC_*` é inlined no build, o rollback é **promover o deploy de produção
anterior à virada da flag** (build de 2026-06-14, flag ainda `false`):

- **Deploy alvo de rollback:** `dpl_F3zZmCCt8nEuyTGmmEZEzd6gemcz` (commit `45986bb`, target=production, `isRollbackCandidate: true`) — mesmo commit do deploy atual, porém **buildado antes** de `NEXT_PUBLIC_USE_BACKEND_DRE=true`, logo o bundle volta ao cálculo DRE local.
- **Como:** Vercel → projeto `grupoalt-web` → Deployments → "Instant Rollback" para esse deploy (ou `vercel rollback`).
- **Alternativa:** setar `NEXT_PUBLIC_USE_BACKEND_DRE=false` (ou remover) e Redeploy — mais lento (build novo).

> Deploy de produção **atual**: `dpl_7nhbacKt6pTSECgo2k6vDVBnQ5cV` (redeploy do commit `45986bb`
> em 2026-06-18 ~17:24 BRT — este é o build que ativou a flag).

---

## Dia 1 — 2026-06-19 (~D+15h)

**Verificação automatizada (lado web / Vercel) — feita por Claude via MCP Vercel:**

| Check | Resultado | Fonte |
|---|---|---|
| Deploy de produção em estado saudável | ✅ `READY` (`dpl_7nhbac…`, commit `45986bb`, target=production) | `get_project` / `list_deployments` |
| Runtime logs `error`/`fatal` (prod, últimas ~36h) | ✅ Nenhum | `get_runtime_logs` level=error,fatal |
| Runtime logs gerais (prod, últimas 6h) | ✅ Nenhum erro (sem ondas) | `get_runtime_logs` |
| Deploy que ativou a flag é o que está no ar | ✅ Sim (redeploy 2026-06-18 ~17:24 BRT) | `list_deployments` |

**⚠️ Limites desta verificação (precisam de checagem manual — ver abaixo):**
- O endpoint `/dre` roda no **backend (Railway/FastAPI)**, NÃO na Vercel. O proxy do front é
  um *rewrite* do `next.config.js` (`/api/proxy/:path*`), sem serverless function que logue —
  por isso os runtime logs da Vercel ficam vazios. **Saúde real do `/dre` está nos logs do Railway.**
- A **paridade numérica do DRE** (números idênticos aos pré-virada) só se confirma no app
  autenticado, comparando 2–3 períodos no Dashboard/Caixa.
- **Sentry** (api + web) não tem MCP nesta sessão → checar no dashboard Sentry.

### Checklist manual do usuário (Dia 1) — resultados

| Check | Resultado | Evidência |
|---|---|---|
| **Sentry web** (grupoalt-web, 14d) | ✅ Crash-Free Sessions **100%**, Crash-Free Users 100%, Apdex 0,963 (−0,036), 3.453 sessões. Sem onda de erros. | Screenshot Sentry |
| **Sentry api** (grupoalt-api, 14d) | ✅ Crash-Free Sessions **99,96%** (+0,06%), Apdex **0,999**, 7.153 sessões. Sem onda de erros. (Crash-Free **Users** 0% é esperado — backend não rastreia sessão de usuário.) | Screenshot Sentry |
| **Railway `/dre`** | ✅ Deploy **Active**, `INFO:app.main:✓ Router DRE carregado (/v1)` no startup. Sem erro. | Screenshot Deploy Logs |
| **Taxa de 403 RBAC** | ✅ Normal (RBAC_ENFORCE ainda desligado — baixo esperado). | — |

**Reconciliação crítica do deploy do backend (feita por Claude no repo `grupoalt-api`):**
O deploy ativo do Railway é de **Jun 12 18:56** (rótulo `7360e2d3`). Confirmei que isso **inclui o fix de paridade api #134**:
- `#134` (merge `91df063`) entrou em **Jun 12 18:19**; commit do fix `5dbbd82` + invalidação de cache `38d82a0`.
- `origin/main` tip = `0504e26` (**Jun 12 18:56**) — depois do #134 → fix é ancestral de main.
- Deploy Railway (Jun 12 18:56) == timestamp do main tip → **o fix de paridade ESTÁ em produção.**
- (O rótulo `7360e2d3` não existe no histórico de `main` — é o ref de deploy do Railway/GitHub; a data bate com `0504e26`. Vale conferir no Railway que está seguindo o `main` mais recente, mas não é bloqueador.)
- O frontend que consome o backend DRE (`useDRE` gated por `useBackendDRE()`) **está em `main`/produção** — 5 call sites (Dashboard, Caixa BI, Caixa Portal, dre-mensal, AnaliseIA). Fase 5.F mergeada. A virada da flag em Jun 18 é real (não é no-op).

### Paridade DRE — RESOLVIDO sem precisar dos números antigos ✅

Não é preciso lembrar/recuperar os números pré-virada. O código tem o **`ComparativoDRE`**
(`src/components/caixa/ComparativoDRE.tsx`), montado na tela **Caixa** (BI e Portal), que renderiza
lado a lado o **DRE local (`calcularDRE`, motor de referência validado pelo financeiro)** vs o
**DRE do backend (`useDRE`)**, com diff por linha. Foi exatamente essa ferramenta que pegou a
divergência de +15,3K (CF) que o #134 corrigiu. **Mesmo com a flag ligada, os dois caminhos
continuam sendo calculados** — então a paridade é uma comparação **absoluta e ao vivo**, não uma
lembrança de números.

**Como revalidar paridade a qualquer momento (≈2 min):**
1. `npm run dev` (em dev o comparativo aparece automático) **ou** abrir o Preview `validate/dre-backend-preview` (tem `NEXT_PUBLIC_DRE_COMPARATIVO=true`).
2. Garantir que `NEXT_PUBLIC_API_URL` aponta para a **API de produção** (`api.grupoalt.agr.br`), não staging.
3. Login → tela **Caixa** → empresa **Grupo ALT** (a que tinha a divergência).
4. Conferir a bolha flutuante (canto inf. direito) em janelas de **30 / 60 / 91 dias**: header **verde + 0 linhas sinalizadas** = paridade exata (diff ≤ R$0,01 nas 9 linhas). Header vermelho = divergência → investigar/rollback.

> Nota: a paridade já foi confirmada via comparativo na virada (Jun 18, per handoff). O comparativo
> é reproduzível a qualquer dia do soak — é o "baseline" estrutural, melhor que números decorados.

**Baseline opcional (preencher 1x p/ ter referência nos próximos dias):**

| Período | RoB | CF | RNOP | DNOP | EBT2 | Comparativo (flagged) |
|---|---|---|---|---|---|---|
| Últimos 30d | | | | | | 0 = OK |
| Últimos 60d | | | | | | 0 = OK |
| Últimos 91d | | | | | | 0 = OK |

**Veredito Dia 1:** ✅ **Soak saudável, sem anomalia.** Web (Sentry 100% / Vercel 0 erros),
API (Sentry 99,96% / Apdex 0,999 / `/dre` ok), backend de produção confirmado com o fix de paridade #134.
**Única pendência (não-bloqueante):** rodar o `ComparativoDRE` em 30/60/91d na Grupo ALT para registrar
"0 flagged" no log (substitui a comparação de números antigos).

### Achado — divergência DRE só em range amplo (>91d) — 2026-06-19

Ao rodar o `ComparativoDRE` na Grupo ALT:
- **30 / 60 / 90 dias: paridade exata (0 flagged)** ✅ — janelas validadas + operacionais OK.
- **Range amplo (169d): 4 divergências**, todas cascateando de **UMA raiz em CV**:
  - CV: local 27,6M vs backend **27,7M** (backend **+92,8K**) ← raiz
  - MC / EBT1 / EBT2: −92,8K (cascata). RoB/TDCF/CF/RNOP/DNOP **idênticos**.
  - EBT2 (Resultado Final): local 517,6K vs backend 424,9K.

**Raiz CONFIRMADA (leitura de código, 2026-06-19) — gatilho: incluir o mês atual:**
Δ **constante de 92,8K só em CV**. O motor DRE é idêntico nos dois lados e usa
`Math.abs(valor)` (sinal irrelevante → normalização de sinal do /extrato é moot). Logo a
divergência vem do **conjunto de lançamentos**. Diferença que produz backend > local:
- O **`/extrato`** (fonte do DRE local) **PULA** registros com `favorecido ∈ {SALDO,
  SALDO ANTERIOR, SALDO INICIAL}` (`extrato.py:242-245`).
- O **`/dre`** (`_query_dre_from_db`, `dre.py`) **NÃO pula** — inclui esses marcadores de saldo.
→ Um registro de SALDO ANTERIOR do mês atual, com categoria que cai em CV e |valor|≈92,8K, é
contado pelo backend e descartado pelo local. **Mesma classe do #134** (que alinhou só o filtro
de *conta*, não o tratamento de *linha*). NÃO é a flag `conciliado` (nenhum lado filtra) nem
estorno/Math.abs. (A intuição "mês atual / não conciliado" acertou o *quando*.)

**Corroboração (2026-06-19):** a empresa **ALT-MAX**, no **mesmo período (jun/26)** e pelo
**mesmo `/dre`**, deu **paridade total (0 flagged)**. Confirma que NÃO é bug sistêmico do
backend — é **data-specific da GRUPO ALT** (o registro de SALDO). Só a GRUPO ALT + mês atual
quebra.

**Fix:** backend (api) — `_query_dre_from_db` deve espelhar o skip de SALDO do `/extrato`.
Cirúrgico, mesma linhagem do #134. Confirmar a linha culpada via "Detalhar" no CV (favorecido
SALDO*, ~92,8K) **na GRUPO ALT** (não na ALT-MAX).

**Decisão:** ✅ **NÃO é rollback de emergência** (marcador de saldo mal-contado, não erro
sistêmico). 📌 Mas superfatura CV do mês corrente (Resultado Final -174,6K backend vs -81,9K
local) → **corrigir no backend ANTES de confiar no /dre pro mês atual e ANTES do PR-6.**

---

## Dia 2 — 2026-06-20 (~D+2)

> ✅ **Reconciliação de calendário (confirmada pelo usuário em 2026-06-29):** a data real de
> operação é **2026-06-29 = D+11** — o **gate D+7 (2026-06-25) já passou**. As sessões anteriores
> rotularam esta verificação como "Dia 2"; na prática ela foi feita em **D+11**, e os
> **Dias 2–10 não foram logados separadamente** (gap de monitoramento honesto). Mitigante: o lado
> web está limpo na janela inteira (Sentry 100% web/api, zero 5xx em 48h, zero error/fatal na
> retenção) e o backend `/dre` segue Active sem erro (deploy Jun 12, inclui #134). **Implicação para
> o gate do PR-6:** ver "Implicações do gate D+7" no fim desta entrada.

**Verificação automatizada (lado web / Vercel) — feita por Claude via MCP Vercel:**

| Check | Resultado | Fonte |
|---|---|---|
| Deploy de produção ainda é o build do soak | ✅ Sim — `dpl_7nhbacKt6pTSECgo2k6vDVBnQ5cV` (commit `45986bb`, target=production) segue sendo o **único** deploy com `target="production"`; nenhuma promoção nova desde a virada da flag | `list_deployments` |
| Builds mais novos não vazaram pra produção | ✅ Todos `target=null` (previews): dependabot #173/#174/#175 + PR-4 Next16 #172 (`dpl_72WjN…`, turbopack). Nenhum promovido | `list_deployments` |
| Status codes prod (48h) | ✅ Só `200`/`404`/`307` (redirects de auth + estáticos). **Zero 5xx** | `get_runtime_logs` group_by=statusCode |
| Runtime logs `error`/`fatal` (prod, janela de retenção) | ✅ Nenhum | `get_runtime_logs` level=error,fatal |

> Lembrete (igual Dia 1): o `/dre` roda no **Railway/FastAPI**, não na Vercel — o proxy do front é
> rewrite sem serverless function, então os runtime logs da Vercel ficam naturalmente vazios para o
> `/dre`. **Saúde real do `/dre` está nos logs do Railway** (print do usuário abaixo).

### Checklist manual do usuário (Dia 2 / D+11) — evidências anexadas

| Check | Resultado | Evidência |
|---|---|---|
| **Sentry web** (grupoalt-web, 24h) | ✅ Crash-Free Sessions **100%**, 15 sessões, 0 release novo, sem onda de erro. (Crash-Free Users 0% / Apdex — esperado: baixo volume de sessão rastreada no web) | Screenshot |
| **Sentry api** (grupoalt-api, 24h) | ✅ Crash-Free Sessions **100%** (Δ 0%), **Apdex 1,0**, 18 sessões, sem onda. | Screenshot |
| **Railway `/dre`** | ✅ Deploy `7360e2d3` **Active** (Jun 12 18:56), log `INFO:app.main:✓ Router DRE carregado (/v1)`, sem 5xx/timeout. | Screenshot |
| **Taxa de 403 RBAC** | ✅ Variável `RBAC_ENFORCE` **não existe** no Railway → default **off** → 403 baixo esperado (consistente; ligar é a Janela C). | — |
| **ComparativoDRE 30/60/90d = 0 flagged** | ✅ Mantido do Dia 1 (paridade estrutural ao vivo). | Dia 1 |
| **Query SALDO no DB (confirmação definitiva)** | ❌ **0 rows** — NÃO existe nenhum marcador de SALDO em `lancamentos_cc`, em **nenhuma empresa**. **Diagnóstico de SALDO REFUTADO.** | Screenshot Railway Query |

**Veredito Dia 2 / D+11:** ✅ **Soak saudável no lado web/infra.** Produção continua no build do soak (flag
DRE ligada, sem promoção acidental dos previews dependabot/PR-4), zero 5xx, zero error/fatal; Sentry
web/api 100% Crash-Free, Apdex api 1,0; `/dre` Active. **Achado aberto reaberto:** a divergência da GRUPO
ALT (+92,8K em CV no range amplo) **NÃO é SALDO** — diagnóstico do Dia 1 refutado (ver abaixo).

**Divergência GRUPO ALT (+92,8K em CV, range >91d) — REABERTA em 2026-06-29:**
- **Query no DB voltou 0 rows** para favorecido ∈ {SALDO, SALDO ANTERIOR, SALDO INICIAL} em TODAS as
  empresas → **não há marcadores de SALDO na base.** O diagnóstico do Dia 1 (inferido por leitura de
  código) está **refutado**. O `/extrato` skipa SALDO, mas isso é dead-code defensivo: não há o que skipar.
- **Investigação de código (2026-06-29) — o que foi descartado:**
  - Motor local (`calcularDRE`, planoContas.ts) × motor backend (`calcular_dre`, dre.py): **idênticos** —
    ambos resolvem grupo por categoria (map/override → prefixo), pulam NEUTRO, somam `Math.abs(valor)`.
    `origem` é aceito mas **não usado** em nenhum dos dois (red herring).
  - Mapas estáticos de CV (2.03.\*/2.04.\* → CV e prefixos 2.03/2.04 → CV): **idênticos** front × back.
  - `/extrato` **não pagina nem limita** (retorna todos os lançamentos) → cálculo local não é truncado.
  - Diferença de conjunto de registros: a única assimetria achada é datas NULL (`/extrato` inclui, `/dre`
    exclui) — mas isso deixaria o **local maior**, direção oposta ao observado (backend maior).
- **Conclusão:** por leitura de código os dois caminhos são equivalentes; o +92,8K **não é explicado por
  nenhum bug estrutural de backend**. Hipóteses remanescentes: (a) estado **transitório** no Dia 1 (ex.:
  `categoriaMap` do front defasado vs DB, ou estado de dados que mudou nos 10 dias desde então), ou
  (b) skew sutil de **override de categoria** (front × back) só visível com dados ao vivo.
- **Próximo passo conclusivo: RE-RODAR o ComparativoDRE HOJE** (GRUPO ALT, range amplo). Se **sumiu** →
  era transitório, backend OK, soak limpo. Se **persiste** → capturar números/janela exatos e fazer diff
  por categoria (`/dre` × `/extrato` × `/categorias`) pra achar a categoria culpada.

**api #142 (skip de SALDO):** premissa REFUTADA (0 registros de SALDO) → **é no-op nos números reais; NÃO
corrige a divergência da GRUPO ALT.** Permanece válido só como **hardening defensivo de paridade** (extrato/
conciliacao/sync já skipam SALDO; dre passaria a skipar também, guardando contra dados legados/futuros;
audit 94/100). **Decisão pendente do usuário: manter como hardening de baixa prioridade ou fechar.** Draft;
não mergear esperando mudança de número.

### Implicações do gate D+7 (estamos em D+11)

1. **Gap de monitoramento (Dias 2–10):** o calendário passou do gate sem log contínuo. Mitigante: web/infra
   limpos na janela inteira + `/dre` Active.
2. **PR-6 (remove `calcularDRE` local) depende de fechar a questão da GRUPO ALT** — não SALDO/#142, mas
   confirmar (re-rodando o comparativo) que `/dre` está correto antes de remover o fallback local.
   **Ordem: re-rodar comparativo → resolver/confirmar GRUPO ALT → só então PR-6.**

### RESOLUÇÃO da divergência GRUPO ALT (2026-06-29, via query no DB)

Re-rodado o ComparativoDRE ao vivo (210d): persistiu, mas mudou pra **+76K em CV** (era 92,8K; muda com
os dados/janela → estrutural, não transitório). Diff por categoria no DB (read-only) fechou a causa:

| Métrica (GRUPO ALT, 210d, contas BI, com override) | Valor |
|---|---|
| CV **com override aplicado** (= lógica do backend) | **R$ 33.848.044** |
| CV só pelo prefixo estático (ignora override) | R$ 2.018.834 |
| delta (quanto os overrides somam ao CV) | R$ 31.829.210 |
| Distribuição de overrides | CF 43 · **CV 30** · TDCF 23 · DNOP 17 · NEUTRO 2 |

**Conclusão — a preocupação inicial estava INVERTIDA:**
- O **backend (R$ 33.848.044) == verdade do banco** (overrides + filtro de conta + janela aplicados
  corretamente) e == o CV **backend** do comparativo. → **`/dre` está CORRETO.**
- O CV da GRUPO ALT é **override-driven** (31,8M de 33,8M vêm de 30 categorias reclassificadas pra CV; o
  prefixo estático daria só 2,0M). O **front também aplica overrides** (está em ~33,77M, não em 2,0M).
- O **local subconta ~76K (0,22%)** vs a verdade — provável `categoriaMap` do front levemente defasado.
  **Não é o backend contando a mais; é o local contando de menos.**

**Decisões decorrentes:**
1. ✅ **Backend DRE validado** — é mais correto que o local. O objetivo do soak foi atingido.
2. ✅ **PR-6 (remover `calcularDRE` local) é seguro** — o local é o lado que erra 0,2%.
3. ✅ **api #142 (skip SALDO): MERGEADO** (decisão do usuário — mantido como hardening defensivo de
   paridade, não como fix do +76K). Squash commit `e9ae7f2` (só dre.py + test + review.md). Merge na
   `main` → **deploy de produção da API** (Railway auto-deploy). Seguro: no-op nos números (0 registros
   SALDO); o bump `DRE_CACHE_SCHEMA_VERSION v2→v3` só revalida o cache (próximas chamadas recalculam,
   mesmo número). **Checagem pós-deploy (2026-06-29): ✅ deploy Railway feito, `✓ Router DRE carregado
   (/v1)` nos logs, sem 5xx.** Deploy do #142 saudável em produção.
4. 🔎 **Residual (opcional, baixa prioridade):** pinpoint dos 76K que o front perde (comparar "Detalhar CV"
   por categoria × DB) — é cosmético do comparativo dev-only; não afeta produção (prod usa o backend).

> _Veredito do soak: backend DRE confiável (= verdade do DB). Divergência GRUPO ALT explicada (artefato do
> cálculo local, não bug de backend). #142 mergeado + deployado (hardening)._

### PR-6 (Fase 5.G) aberto — 2026-06-29

Com o backend validado, **PR-6 (remove `calcularDRE` local, backend = fonte única)** foi implementado e
aberto como **draft**: **[web #176](https://github.com/vmapex/grupoalt-web/pull/176)** (branch
`chore/pr6-remove-local-dre`, commit `f592df6`, **−894 LOC**). Audit adversarial **97/100 APPROVE**
(`docs/audit/pr6-remove-local-dre/review.md`); typecheck/test(335)/build/audit:bundle verdes.
**Não mergear** — merge em janela própria (fora de horário) + smoke + remover env vars
`NEXT_PUBLIC_USE_BACKEND_DRE`/`NEXT_PUBLIC_DRE_COMPARATIVO` do Vercel. Ponto final da Fase 5.
