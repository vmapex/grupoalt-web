# Prompt para proxima sessao — Portal Grupo ALT

Continuando desenvolvimento do portal Grupo ALT (grupoalt-api + grupoalt-web).
Esta sessao vai ser focada em **validar em producao** o que ja foi entregue e
**mapear/implementar** os proximos ajustes que o usuario esta identificando.

## Repositorios
- `vmapex/grupoalt-api` — FastAPI 0.115 + PostgreSQL 16 + Redis 7 (Railway)
- `vmapex/grupoalt-web` — Next.js 14 + TypeScript + Tailwind + Zustand (Vercel)

## Branches
- Sessoes anteriores usaram `claude/continue-alt-portal-HOQne`
- Ambos os repos ja tem todas as mudancas mergeadas em `main`
- **Criar uma branch nova** a partir de `main` com sufixo especifico do trabalho
  da sessao (ex: `claude/fix-categorias-bugs-ABC`)

## CLAUDE.md atualizado
Leia `CLAUDE.md` de ambos os repos antes de propor qualquer mudanca — eles tem
o historico completo das sessoes 11/04, 13/04 e 14-15/04 com TODAS as features,
bugs corrigidos, arquivos modificados e decisoes de arquitetura.

---

## Status atual — o que foi entregue nas sessoes anteriores

### 11/04 — Tela Analise IA + fundacao
- **Tela Analise IA** com layout `1fr 400px`: KPIs, mini cards EBT2/TDCF,
  waterfall DRE de 10 barras, tabela indicadores com badges, ChatPanel Claude
  embutido com contexto financeiro real
- **biViewStore** + **ChatPanel embedded mode**
- **Campos NF e PA** em CP/CR + **NF no Extrato**
- **Sync de Unidades via Projeto Omie** (`sync_unidades` + auto-sync no
  `GET /gestao/unidades`)
- **Categorias dinamicas** (backend + hook basico)
- Fix de ~15 bugs (persist empresa, export PDF URLs, race condition, etc)

### 13-14/04 — Admin de categorias + bulk edit
- **Tela `/bi/financeiro/admin/categorias`** com listagem hierarquica,
  9 stats cards, busca, sincronizacao sincrona, override individual
- **Bulk-edit** com checkboxes em 3 niveis + barra flutuante
- **Override por empresa** — coluna `grupo_dre_override` em `CategoriaOmie`
- **Endpoints:**
  - `POST /categorias/sync` (sincrono, dedicado)
  - `PATCH /categorias/{codigo}`
  - `POST /categorias/bulk-override`
- Bug fix: `async with client:` em `sync_categorias` e `sync_unidades`
  (era o motivo do Grupo ALT nunca sincronizar categorias nem unidades)
- Bug fix: categorias estaticas nao devem misturar com plano dinamico da API
- Bug fix: labels de subgrupo descritivos (usando descricao da categoria-pai)
- Ordenacao por codigo com natural sort

### 15/04 — Plano dinamico GLOBAL + NEUTRO
- **Hook `useCategoriasMap(empresaId)`** — ponto unico de acesso ao plano de
  contas efetivo da empresa ativa. Retorna `map`, `getGrupo`, `getNome`,
  `isDynamic`. **Auto-refetch em `visibilitychange`** (volta pra aba → refresh)
- **`calcularDRE`** e **`calcularDREPorMes`** aceitam `categoriaMap?` opcional
- **`caixaBuilder.*`** — todas as funcoes aceitam `categoriaMap?`
- **Propagado em 11 arquivos** (Dashboard, Caixa, Analise IA, CP/CR, Extrato
  — BI + Portal)
- **Grupo `NEUTRO`** — pseudo-grupo que exclui a categoria dos calculos de DRE
  mas mantem visibilidade em extrato/conciliacao para auditoria
- Use case: repasses internos entre unidades, mutuos intra-grupo
- `calcularNeutros(lancamentos, map)` retorna lista com total
- AnaliseIAView mostra nota cinza + injeta bloco no contexto do Claude

---

## O que o usuario precisa validar em producao

Quando voce receber o primeiro prompt da nova sessao, confirme se o usuario
ja validou ou se quer comecar validando. Items para testar:

1. **Admin/categorias end-to-end:**
   - Sincronizar do Grupo ALT da Omie
   - Listagem sem vazamento de categorias estaticas
   - Subgrupos com labels descritivos (nao "2.05" cru)
   - Ordenacao natural por codigo
   - Override individual funciona
   - Bulk-edit funciona
   - Badge CUSTOM aparece
   - "Remover override" funciona

2. **Propagacao em todas as telas:**
   - Override feito no admin reflete no Dashboard Executivo (EBT2, waterfall)
   - Reflete no Caixa Realizado (drill-down + breakdowns por favorecido/categoria)
   - Reflete na Analise IA (waterfall + contexto do chat)
   - Reflete nas tabelas CP/CR (nome da categoria)
   - Reflete no Extrato (nome da categoria)
   - Auto-refetch funciona: admin em uma aba, Dashboard em outra, faz override,
     volta pro Dashboard → numeros se atualizam sozinhos

3. **NEUTRO para Grupo ALT:**
   - Marcar `(+) Repasse unidade` e `(-) Repasse unidade` como NEUTRO
   - RNOP e DNOP devem cair no Dashboard (poluicao removida)
   - EBT2 deve manter (antes era zero entre eles de qualquer jeito)
   - Categorias continuam aparecendo no Extrato e Conciliacao
   - Analise IA mostra nota cinza com lista + total
   - Chat do Claude menciona transparentemente que excluiu os repasses

4. **Filtro de unidades:**
   - Dropdown aparece na Navbar (antes sumia)
   - Se tiver projetos cadastrados, eles aparecem selecionaveis
   - Se nao tiver, mensagem "Sem unidades" com instrucao

---

## Topicos em aberto / possiveis proximos ajustes

Pergunte ao usuario qual prioridade ele quer atacar primeiro:

### Bugs / ajustes que podem surgir da validacao
- O usuario vai trazer a lista

### Features de medio prazo
- **Filtro por unidade em todas as paginas** — o dropdown existe mas nao
  filtra nada ainda. Precisa:
  - Backend: `unidade_id` como query param opcional em `/extrato`, `/cp`,
    `/cr`, `/fluxo-caixa`, `/conciliacao`
  - Popular coluna `projeto_omie_id` em LancamentoCC/ContaPagar/ContaReceber
    a partir do `nCodProjeto` da Omie (verificar se `ListarExtrato` retorna)
  - Frontend: hooks passam `unidade_id` quando `useUnidadeStore` tem filtro

- **Coluna unidade visivel no extrato** (condicional — so mostra se a empresa
  usa projetos)

- **Validar resync full do Grupo ALT** apos todos os fixes

- **Dashboards persistidos por usuario** (saved views, filtros padrao)

- **Testes de integracao** nos endpoints de categorias

- **Endpoint `/indicadores`** (hoje retorna `"em_desenvolvimento"`)

- **Persistencia do token tracking do Orbit** (hoje in-memory)

### Longo prazo (visao de produto)
- Comparacao mensal/trimestral/anual no Caixa Realizado
- Alertas customizaveis pelo usuario
- Relatorios agendados (email)
- Multi-empresa consolidada (grupo vs unidade)
- API publica para integracao

---

## Diretrizes criticas

1. **NAO quebrar o que ja esta funcionando.** Leia CLAUDE.md antes de propor.
   Mudancas sao aditivas por padrao.

2. **OmieClient SEMPRE como context manager:** `async with client: ...`
   Sem isso, `self._client` fica None → erro `'NoneType' object has no attribute 'post'`.
   Ja pegamos esse bug uma vez, nao repita.

3. **`calcularDRE(lancamentos, categoriaMap?)`** — o param e opcional, backward-compat.

4. **Mudancas em `models.py`** precisam de migracao em
   `main.py::migrate_empresa_columns()` com `ALTER TABLE ADD COLUMN IF NOT EXISTS`.

5. **Overrides de grupo DRE sao por empresa** (unique em `(empresa_id, codigo)`).
   Nao vaze entre empresas.

6. **Grupos DRE validos no backend:**
   `{"RoB", "TDCF", "CV", "CF", "RNOP", "DNOP", "IRPJ", "CSLL", "NEUTRO"}`

7. **`NEUTRO` e excluido em todos os agregadores de DRE** — confirme em
   qualquer lugar novo que classifique lancamentos.

8. **Tela admin/categorias e o ponto unico** para editar plano de contas.
   Outras telas sao so-leitura via `useCategoriasMap`.

9. **Build sempre antes de commitar:**
   - Frontend: `cd /home/user/grupoalt-web && npx next build`
   - Backend: CI do Railway cuida

10. **NUNCA commite segredos.** `.env`, `FERNET_KEY`, `app_secret_enc`.

---

## Comandos uteis

```bash
# Frontend
cd /home/user/grupoalt-web
npm run dev
npx next build   # OBRIGATORIO antes de commitar

# Backend
cd /home/user/grupoalt-api
uvicorn app.main:app --reload
pytest -v --asyncio-mode=auto

# Git — setup nova branch
git checkout main && git pull origin main
git checkout -b claude/nome-da-nova-tarefa
```

## URLs e deploy

- **Portal:** https://portal.grupoalt.agr.br (Vercel auto-deploy on merge to main)
- **API:** https://api.grupoalt.agr.br (Railway auto-deploy on merge to main)
- **Swagger:** https://api.grupoalt.agr.br/docs

---

## Fluxo padrao da sessao

1. Ler este prompt + CLAUDE.md de ambos os repos
2. Perguntar ao usuario o que ele quer atacar nesta sessao
3. Se for bug: reproduzir + investigar raiz + propor fix (pedir OK antes de codar)
4. Se for feature: planejar + confirmar escopo + implementar
5. Build no frontend + testes no backend antes de commitar
6. Commit com mensagem clara explicando o "porque"
7. Push na branch da sessao
8. Abrir PRs (um por repo, referenciando um ao outro se houver dependencia
   entre backend e frontend)
9. Aguardar CI passar (lint-and-build / lint-and-test)
10. Merge quando verde
11. **Atualizar CLAUDE.md** de ambos os repos ao fim da sessao com um bloco
    novo (data + features + bugs + arquivos modificados)
