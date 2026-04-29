# Staging, Preview e Regra de Deploy Seguro

Data: 2026-04-29
Step: 02 — Ambiente de staging e regra de deploy seguro
Modo: documentacao + acordo operacional (nao altera codigo)

Pre-requisito: o baseline tecnico do Step 01
(`docs/AUDIT_BASELINE_2026-04-29.md`) deve estar comitado.

---

## 1. Estado atual da infraestrutura

### 1.1 Frontend

| Ambiente | Hospedagem | URL | Como sobe |
|---|---|---|---|
| **Producao** | Vercel | `https://portal.grupoalt.agr.br` | merge em `main` |
| **Preview** | Vercel | URL automatica `grupoalt-web-git-<branch>-<scope>.vercel.app` por PR | abertura/atualizacao de PR (visto em PR #37) |
| **Staging dedicado** | (nao existe) | — | risco registrado abaixo |
| **Local** | `npm run dev` | `http://localhost:3000` | dev local |

### 1.2 Backend

| Ambiente | Hospedagem | URL conhecida |
|---|---|---|
| **Producao** | Railway | `https://api.grupoalt.agr.br` (via DNS) — direto: `https://altmax-api-production.up.railway.app` |
| **Staging dedicado** | (nao existe) | — |
| **Local** | dev local | `http://localhost:8000` |

### 1.3 Configuracao de variaveis hoje

- `vercel.json` declara `env.NEXT_PUBLIC_API_URL=https://api.grupoalt.agr.br`
  para deploy producao.
- `.env.example` traz `NEXT_PUBLIC_API_URL=http://localhost:8000`.
- `.env.local` no repo aponta para
  `https://altmax-api-production.up.railway.app`
  (Railway producao direta).
- `next.config.js` reexpoe somente `NEXT_PUBLIC_API_URL`. Nao ha
  outras variaveis publicas declaradas.

### Riscos atuais (entrada para Step 03)

1. **`.env.local` aponta para producao** — qualquer dev local mexe em
   dados reais. Tratamento no Step 03.
2. **Sem API staging** — auth/RBAC/Next major upgrade vao precisar
   ser testados em producao mascarada (usuarios de teste) ou em local
   apontando para staging futuro.
3. **Preview do Vercel usa qual API?** A preview usa o env padrao do
   projeto Vercel — precisa confirmar no painel do projeto. Se estiver
   apontando para producao, qualquer PR pode efetuar mutacoes na API
   real.
4. **Sem checklist formal** de homologacao por PR — risco de regressao
   silenciosa em login/empresa ativa/permissoes.

## 2. Matriz de ambientes (alvo)

| Ambiente | Frontend | Backend | Empresas/Dados | Quem usa |
|---|---|---|---|---|
| **Local** | `npm run dev` | `localhost:8000` (dev) **ou** API staging | base local ou staging | Dev individual |
| **Preview/PR** | Vercel preview por PR | API **staging** | base staging com empresa fake | Revisor/QA por PR |
| **Producao** | `portal.grupoalt.agr.br` | `api.grupoalt.agr.br` (Railway) | dados reais | Usuarios finais |

> Acao curta: enquanto API staging nao existir, **tratar Preview como
> tocando producao em modo somente-leitura sempre que possivel**, e
> proibir testes destrutivos.

## 3. Variaveis por ambiente

| Variavel | Local | Preview | Producao | Comentario |
|---|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | URL local ou staging | API staging quando existir; ate la, prod | `https://api.grupoalt.agr.br` | Unica publica hoje |
| (futuras) | — | — | — | Tudo sensivel **NAO** pode ter prefixo `NEXT_PUBLIC_` |

Toda variavel sensivel (tokens, chaves) precisa viver no backend, nao
no frontend, e nao pode ter prefixo `NEXT_PUBLIC_`. Step 03 vai
validar e documentar isso de forma definitiva.

## 4. Usuarios de teste necessarios

Modelo atual (de `src/store/authStore.ts`):
- `user.is_admin: boolean` — admin global, bypassa todas as checagens
  via `hasPermissao`.
- `permissoes[]` no shape `{ modulo, acao, empresa_id }`.
- `empresas[]` — empresas que o usuario enxerga.
- `grupos[]` — grupos corporativos.

Pessoas de teste a serem criadas/solicitadas (em **API staging quando
existir**, ou em **producao com empresa fake** marcada como descartavel):

| Apelido | `is_admin` | Empresas | Permissoes esperadas | Cenario |
|---|---|---|---|---|
| `qa-admin` | `true` | todas | (irrelevante, bypassa) | regressao admin/setup/permissoes |
| `qa-user-empresaA` | `false` | apenas Empresa A | financeiro:read, documentos:read | usuario padrao |
| `qa-user-no-admin` | `false` | uma empresa | qualquer modulo, sem `admin:*` | teste de bloqueio em `/portal/admin` e `/bi/financeiro/admin/*` |
| `qa-user-docs-readonly` | `false` | uma empresa | documentos:read, **sem** write/approve | teste de bloqueio de upload/aprovacao |
| `qa-user-empresaA-only` | `false` | apenas Empresa A (nao Empresa B) | financeiro:read em A | teste de isolamento entre empresas |

Item bloqueante para Step 06 (RBAC backend): preciso confirmar **com o
backend** se permissoes negativas ja sao aplicadas em todos os
endpoints, ou se a regra hoje e "tem token = ve tudo". Sem isso, o
teste com `qa-user-empresaA-only` nao tem sentido.

## 5. Regra operacional de deploy seguro

1. **Nenhum PR P0 ou P1 vai direto para producao.** Sempre passa pela
   preview do Vercel + verificacao humana antes do merge.
2. **Mudancas de dependencia exigem smoke test** de:
   - login
   - troca de empresa no header
   - dashboard executivo BI
   - extrato de uma empresa
   - logout
3. **Mudancas de auth/RBAC exigem smoke test com pelo menos dois
   perfis**: `qa-admin` e `qa-user-empresaA`.
4. **Mudancas de schema/dado exigem teste em staging ou empresa fake.**
   Nunca em empresa real ativa.
5. **`main` so recebe merge com `lint-and-build` verde.** O CI
   atual (`.github/workflows/ci.yml`) ja roda `tsc`, `next lint`
   (continue-on-error) e `npm run build`. Step 15 vai endurecer.
6. **Squash merge em PRs do plano** para manter o historico legivel
   (um step = um commit no main).
7. **Rollback rapido**: redeploy do commit anterior na Vercel (ja
   suportado via UI). Nao fazer reset no `main`.

## 6. Checklist de homologacao por PR

Cole isto em todo PR P0/P1 antes de marcar como "ready for review".
Usar a preview do Vercel.

### Smoke (todo PR)
- [ ] Pagina de login carrega
- [ ] Login com `qa-admin` funciona
- [ ] Header mostra nome correto da empresa ativa
- [ ] Refresh da pagina mantem empresa ativa (Zustand persist)
- [ ] Logout limpa estado e redireciona

### Portal
- [ ] `/portal` carrega sidebar correta
- [ ] `/portal/grupo` lista grupos
- [ ] `/portal/documentos` carrega lista
- [ ] `/portal/financeiro/caixa` espelha BI corretamente
- [ ] `/portal/admin` so aparece para admin

### BI Financeiro
- [ ] `/bi/financeiro` (dashboard executivo) carrega KPIs
- [ ] `/bi/financeiro/caixa` calcula DRE corretamente
- [ ] `/bi/financeiro/extrato` carrega lancamentos
- [ ] `/bi/financeiro/cp-cr` carrega titulos
- [ ] `/bi/financeiro/fluxo` carrega fluxo mensal e diario
- [ ] `/bi/financeiro/conciliacao` carrega calendario
- [ ] `/bi/financeiro/admin/categorias` permite override e bulk-edit
  (so admin)

### Permissoes (PRs de auth/RBAC)
- [ ] `qa-user-no-admin` recebe 403 em rotas admin
- [ ] `qa-user-empresaA-only` nao consegue ler dados da Empresa B
- [ ] `qa-user-docs-readonly` nao consegue subir documento

### Pos-merge
- [ ] Producao carrega login
- [ ] Producao carrega `/bi/financeiro` para usuario admin real
- [ ] Sem erros novos em `console.error` no DevTools

## 7. Critério de pronto (Step 02)

- [x] Preview por PR confirmado (Vercel, visto em PR #37).
- [ ] Plano formal para criar staging dedicado **registrado** (ver "Pendencias" abaixo).
- [x] Variaveis por ambiente documentadas.
- [x] Usuarios de teste definidos (precisam ser **criados** depois — Step 06 ou tarefa operacional).
- [x] Checklist de homologacao escrita.

## 8. Pendencias herdadas para outros steps

- **Criar usuarios `qa-*`** em API real ou staging — depende de
  Step 06 (RBAC) e de uma decisao operacional do time.
- **Provisionar API staging** — tarefa de infra fora do escopo do
  Step 02. Recomendado antes do Step 04 (atualizacao de dependencias)
  ou do Step 06 (RBAC), os dois com risco de quebrar producao.
- **Auditar env do projeto Vercel** — confirmar para qual API a
  preview esta apontando. Step 03.
- **Garantir que `.env.local` no dev nao vaze para producao acidental** —
  Step 03.
