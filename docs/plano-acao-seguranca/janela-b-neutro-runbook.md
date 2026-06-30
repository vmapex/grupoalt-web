# Janela B — Marcar categorias de repasse como NEUTRO (OP-2) — Runbook

> Objetivo: marcar as categorias de **repasse / mútuo / transferência intra-grupo**
> como `NEUTRO`, para que sejam **excluídas dos cálculos de DRE e indicadores**
> (RNOP/DNOP/EBT) mas continuem visíveis em extrato/conciliação para auditoria.
>
> **Pré-requisitos (NÃO começar antes):**
> 1. Soak do DRE backend **estável por 24–48h** (ver `soak-dre-monitoring-log.md`).
> 2. **Sign-off escrito da controladoria** sobre a lista exata de categorias de repasse.
>
> **Empresa-alvo:** Grupo ALT. Descubra o `EMPRESA_ID` na aba **Network** do DevTools —
> a requisição `.../empresas/{id}/categorias` traz o id na URL.

## Contexto técnico (verificado no código)

- Auth é por **cookie** (`api.ts`: `withCredentials: true`, sem token em header/localStorage).
  Logo, os snippets abaixo rodam **direto no console do navegador**, logado no portal
  (`https://portal.grupoalt.agr.br`), na tela `/bi/financeiro/admin/categorias` — o cookie
  vai junto automaticamente, sem manusear token.
- Endpoints (`useCategoriasAPI.ts`):
  - `GET  /empresas/{id}/categorias` → `Record<codigo, { descricao, nivel1, nivel2, grupo_dre }>` (`grupo_dre` = override; `null` = inferido por prefixo).
  - `POST /empresas/{id}/categorias/bulk-override` body `{ codigos: string[], grupo_dre: string|null }` → `{ updated, grupo_dre, nao_encontradas }` (`grupo_dre:null` **remove** o override).
- `NEUTRO` já é integrado em `calcularDRE`, `caixaBuilder.resolveGrupoDRE`, `buildBreakdownByCategoria` e no backend `/dre`. Marcar uma categoria como NEUTRO a tira de RNOP/DNOP.

> ⚠️ Reversível: o **Passo 1 (snapshot)** é o seguro de rollback. **Não pule.**

---

## Passo 1 — Snapshot dos overrides atuais (OBRIGATÓRIO, antes de tudo)

Logado no portal, na tela de Plano de Contas, abra o **Console** (F12) e cole:

```js
// === SNAPSHOT — baixa o estado atual de TODOS os overrides ===
const EMPRESA_ID = 1; // <-- AJUSTE: id da Grupo ALT (veja na aba Network, URL .../empresas/{id}/categorias)
const res = await fetch(`/api/proxy/v1/empresas/${EMPRESA_ID}/categorias`, { credentials: 'include' });
if (!res.ok) throw new Error('Falha ao buscar categorias: HTTP ' + res.status);
const data = await res.json();
const snapshot = { empresa_id: EMPRESA_ID, capturado_em: new Date().toISOString(), categorias: data };
const a = document.createElement('a');
a.href = URL.createObjectURL(new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' }));
a.download = `overrides-snapshot-empresa${EMPRESA_ID}-${snapshot.capturado_em.replace(/[:.]/g, '-')}.json`;
a.click();
console.log(`✅ Snapshot de ${Object.keys(data).length} categorias baixado. Guarde este arquivo para rollback.`);
window.__snap = snapshot; // também fica em memória nesta aba (útil pro rollback abaixo)
```

Guarde o `.json` baixado. Ele é a referência de rollback.

## Passo 2 — Lista de candidatas (heurística → revisão da controladoria)

Esta heurística **só sugere** — a decisão final é da controladoria. Ainda no console:

```js
// === CANDIDATAS — categorias cujo NOME sugere repasse/mútuo/transferência ===
const termos = /repasse|m[uú]tuo|mutuo|transfer[eê]ncia|aporte|intercompany|entre unidades|intra.?grupo|conta garantia/i;
const candidatas = Object.entries(window.__snap.categorias)
  .filter(([, c]) => termos.test(c.descricao))
  .map(([codigo, c]) => ({ codigo, descricao: c.descricao, grupo_atual: c.grupo_dre ?? '(inferido)' }));
console.table(candidatas);
console.log('codigos sugeridos:', JSON.stringify(candidatas.map(c => c.codigo)));
```

Leve a tabela (código + descrição + grupo atual) para a controladoria. **Só prossiga com a
lista que ela aprovar por escrito.** A heurística pode ter falso-positivo/negativo.

## Passo 3 — Aplicar NEUTRO (após sign-off)

**Opção A (preferida) — pela UI:** em `/bi/financeiro/admin/categorias`, use os checkboxes
(bulk-edit em 3 níveis) para selecionar as categorias aprovadas e, na barra flutuante roxa,
escolha **NEUTRO 🚫** no dropdown bulk-apply. Vantagem: revisão visual + badge `CUSTOM`.

**Opção B — pelo console (lote único):**

```js
// === APLICAR NEUTRO — use APENAS a lista aprovada pela controladoria ===
const CODIGOS_NEUTRO = ["2.05.01", "2.05.02"]; // <-- SUBSTITUA pela lista aprovada
const r = await fetch(`/api/proxy/v1/empresas/${window.__snap.empresa_id}/categorias/bulk-override`, {
  method: 'POST', credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ codigos: CODIGOS_NEUTRO, grupo_dre: 'NEUTRO' }),
});
console.log('resultado:', await r.json()); // { updated, grupo_dre, nao_encontradas }
```

Confira `nao_encontradas` vazio e `updated` == tamanho da lista.

## Passo 4 — Validar RNOP/DNOP limpos

- Volte à aba (o `useCategoriasMap` tem auto-refetch em `visibilitychange`) e abra
  **Caixa** / **Análise IA**.
- Rode o **`ComparativoDRE`** (em dev, ou Preview com `NEXT_PUBLIC_DRE_COMPARATIVO=true`)
  na Grupo ALT, janelas de 30/60/91 dias: as categorias NEUTRO devem **sumir de RNOP/DNOP**
  e os neutros aparecerem na nota cinza (total movimentado + count). Local e backend devem
  continuar batendo (0 flagged) — o NEUTRO é tratado igual nos dois.
- Confirme com a controladoria que RNOP/DNOP agora refletem só o operacional real.

## Passo 5 — Rollback (se a controladoria discordar)

Restaura **só os códigos alterados** ao valor original do snapshot. Cole o objeto do snapshot
em `snap` (ou use `window.__snap` se for a mesma aba), defina `CODIGOS_NEUTRO` com a lista que
você aplicou, e rode:

```js
// === ROLLBACK CIRÚRGICO — restaura os codigos alterados ao grupo_dre do snapshot ===
const snap = window.__snap; // ou: const snap = <cole aqui o conteúdo do .json>
const CODIGOS_NEUTRO = ["2.05.01", "2.05.02"]; // <-- a MESMA lista que você aplicou
const grupos = {};
for (const cod of CODIGOS_NEUTRO) {
  const orig = snap.categorias[cod]?.grupo_dre ?? null; // valor ANTES do NEUTRO
  (grupos[orig === null ? '__NULL__' : orig] ||= []).push(cod);
}
for (const [key, codigos] of Object.entries(grupos)) {
  const grupo_dre = key === '__NULL__' ? null : key;
  const r = await fetch(`/api/proxy/v1/empresas/${snap.empresa_id}/categorias/bulk-override`, {
    method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ codigos, grupo_dre }),
  });
  console.log((grupo_dre ?? '(remover override)'), '←', codigos.length, 'cod →', (await r.json()).updated);
}
console.log('✅ Rollback completo — estado restaurado ao snapshot.');
```

> Fallback nuclear (restaurar **tudo** ao snapshot): troque o loop para iterar
> `Object.entries(snap.categorias)` em vez de `CODIGOS_NEUTRO`. Mais pesado (reescreve todos
> os overrides), mas garante estado idêntico ao snapshot.

---

## Checklist de execução

- [ ] Soak DRE estável ≥ 24–48h (log)
- [ ] **Passo 1** — snapshot `.json` baixado e guardado
- [ ] **Passo 2** — tabela de candidatas levada à controladoria
- [ ] **Sign-off escrito** da controladoria (lista final de códigos)
- [ ] **Passo 3** — NEUTRO aplicado (UI ou console); `nao_encontradas` vazio
- [ ] **Passo 4** — RNOP/DNOP limpos validados (ComparativoDRE 30/60/91d, Grupo ALT)
- [ ] Confirmação final da controladoria
- [ ] (se discordância) **Passo 5** — rollback via snapshot

## Notas

- Janela B **não bloqueia** nem é bloqueada pelo PR-4. Pode rodar a qualquer momento após o
  soak estável + sign-off, independente do merge do Next 16.
- Mantém-se **fora da Janela A** no sentido de não tocar em deploy/flag — é só dado
  (overrides de categoria), reversível pelo snapshot. Mas só executar com soak estável para
  não confundir leitura de números durante a validação do DRE.
