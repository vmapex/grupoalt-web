# Prompt para próxima sessão — Portal Grupo ALT

Continuando desenvolvimento do portal Grupo ALT (grupoalt-api + grupoalt-web).
Sessão anterior (11/04/2026) corrigiu ~15 bugs de UX e dados, implementou
categorias dinâmicas, fix do Orbit, alertas, e persist de empresa.

## Contexto
- Repositórios: vmapex/grupoalt-api (backend) + vmapex/grupoalt-web (frontend)
- O CLAUDE.md de ambos os repos está atualizado com o status da sessão 11/04
- Deploy: Railway (API) + Vercel (Web)
- Referência visual Análise IA: `altmax_claude_agent.html` na raiz do grupoalt-web

## O que foi feito na sessão 11/04/2026

### Frontend (12 correções)
- Nome empresa dinâmico na Navbar (era hardcoded "ALT MAX")
- Persist empresaStore (Zustand middleware) — empresa mantida ao refresh
- Fix URLs export PDF (removia `/v1` duplicado)
- Sub-bar Dashboard/Análise IA duplicada removida da caixa/page.tsx
- CP/CR "Grupo" → "Categoria" com getCatDesc()
- Conciliação "Descrição" → "Favorecido"
- Dashboard: fallbacks hardcoded removidos (87%, 42, 38400 → 0)
- useEmpresaId: prioriza activeId persistido sobre authStore.empresaAtiva
- syncFromAuth: sincroniza empresaAtiva no authStore após restaurar persist
- ExportPDFButton: toast de erro quando falha

### Backend (9 correções + 2 features)
- Fix saldo_banco `is not None` (antes falhava para saldo=0)
- Sync margem incremental: 5d → 30d
- resync-extrato: reseta ultima_sync=None → força 8 janelas full history
- Fluxo caixa: campo saldo_acumulado adicionado na resposta diária
- Conciliação detalhe_dia: campo favorecido adicionado
- Descrição: VARCHAR(500) → VARCHAR(2000) + migração automática + truncamento
- Alertas: reescritos com comparação de datas em Python + links corrigidos
- Orbit: _fetch_from_database usa schema público com empresa_id
- **Feature:** CategoriaOmie model + sync_categorias() + endpoint GET /categorias
- **Feature:** sync_categorias() integrado ao sync_empresa_completo()

## Pendências a atacar

### PRIORIDADE ALTA — Implementar Tela Análise IA
- Referência: `altmax_claude_agent.html` (443 linhas, layout completo)
- Layout: Grid `1fr 400px` (dados DRE + agente Claude)
- Painel esquerdo: 4 KPIs + 2 mini cards + waterfall DRE + tabela indicadores
- Painel direito: ChatPanel com contexto financeiro real
- Já existe: `calcularDRE()` em planoContas.ts, ChatPanel.tsx, `/orbit/chat`
- Renderizar quando `biView === 'analise'` no layout.tsx

### PRIORIDADE ALTA — Validar bugs corrigidos
- Executar resync full Grupo ALT: `POST /v1/sync/empresas/2/resync-extrato`
- Verificar se agora traz histórico completo (não só março-abril)
- Verificar saldo projetado diário no fluxo de caixa
- Verificar conciliação com dados reais (não mais 87% hardcoded)
- Verificar se página carrega dados sem precisar trocar empresa

### PRIORIDADE MÉDIA — Unidades via Projeto Omie
- Grupo ALT usa endpoint Projeto da Omie para mapear unidades
- `listar_projetos()` já existe em omie_client.py mas não é chamado
- Modelo Unidade existe, CRUD em gestao.py, UnidadeDropdown funcional
- Falta: sync Projetos → Unidades, filtro em endpoints, coluna no extrato

### PRIORIDADE MÉDIA — Categorias dinâmicas no frontend
- Backend pronto: `GET /empresas/{id}/categorias` retorna mapa {codigo: {descricao, nivel1, nivel2}}
- Frontend usa getCatDesc() estático do planoContas.ts (82 códigos ALT-MAX)
- Grupo ALT pode ter códigos diferentes → precisa hook useCategorias() dinâmico

### BUGS PENDENTES DO USUÁRIO
[O usuário vai adicionar itens aqui antes de iniciar a sessão]

## Arquivos-chave
### Backend (grupoalt-api)
- `app/services/sync_service.py` — sync completo + categorias + incremental 30d
- `app/routers/extrato.py` — extrato + endpoint /categorias
- `app/routers/sync.py` — resync-extrato com reset ultima_sync
- `app/routers/fluxo_caixa.py` — saldo_acumulado
- `app/routers/conciliacao.py` — favorecido em detalhe_dia
- `app/services/orbit_chat.py` — schema público com empresa_id
- `app/services/alertas.py` — alertas com datas em Python
- `app/models/models.py` — CategoriaOmie, LancamentoCC.descricao(2000)

### Frontend (grupoalt-web)
- `src/app/bi/financeiro/layout.tsx` — shell BI com biView toggle
- `src/app/bi/financeiro/page.tsx` — dashboard executivo
- `src/store/empresaStore.ts` — persist + syncFromAuth
- `src/hooks/useEmpresaId.ts` — prioriza activeId persistido
- `src/hooks/useAPI.ts` — hooks de dados
- `src/lib/planoContas.ts` — calcularDRE(), CATEGORIAS
- `src/components/chat/ChatPanel.tsx` — chat Orbit existente
- `altmax_claude_agent.html` — referência visual Análise IA
