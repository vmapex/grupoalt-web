# Higiene de Ambiente, Secrets e Documentacao Antiga

Data: 2026-04-29
Step: 03 — Ambiente, secrets e documentacao antiga
Modo: hardening minimo (untrack `.env.local`, `.gitignore`, banners de
historico em dois docs antigos)

---

## 1. Resumo das mudancas

| Item | Antes | Depois |
|---|---|---|
| `git ls-files .env*` | `.env.example`, `.env.local` | apenas `.env.example` |
| `.gitignore` | `.env*.local` | `.env*.local` + `.env` |
| `.env.local` (arquivo local) | rastreado | **mantido localmente**, nao mais rastreado |
| `.env.example` | `NEXT_PUBLIC_API_URL=http://localhost:8000` | **inalterado** (ja estava seguro) |
| `BRIEFING_ALTMAX.md` | sem aviso, URLs/repos legados | banner `HISTORICO` no topo |
| `CLAUDE_CONTEXT_V2.md` | sem aviso, superseded por `CLAUDE.md` | banner `HISTORICO` no topo |

## 2. Auditoria — `.env*`

```
git ls-files .env*
.env.example     # apenas exemplo seguro com URL local
```

**Conteudo de `.env.local` (antes da remocao):**

```
NEXT_PUBLIC_API_URL=https://altmax-api-production.up.railway.app
```

Isso e a URL **publica** direta do Railway — nao e um segredo. Mas
nao deveria estar versionada porque:

- sobrescreve a escolha de cada dev local (cada um pode querer
  `localhost:8000`, staging futuro, ou outra empresa);
- conflita com `vercel.json` que ja declara `NEXT_PUBLIC_API_URL=https://api.grupoalt.agr.br`;
- viola a politica padrao de "ambiente local fora do Git".

Acao tomada: `git rm --cached .env.local` e `.env` adicionado ao
`.gitignore`. O arquivo continua existindo no disco do dev e o app
continua funcionando.

## 3. Auditoria — segredos em docs versionadas

Padroes pesquisados em todos os `.md` da raiz:

```
SECRET | FERNET | ANTHROPIC | OMIE_APP_KEY | OMIE_APP_SECRET | Bearer | Authorization | sk- | api[_-]?key
```

### Ocorrencias e classificacao

| Arquivo | Linha | Conteudo | Classificacao |
|---|---|---|---|
| `BRIEFING_ALTMAX.md` | 249-250 | `SECRET_KEY = ...`, `FERNET_KEY = ...` | placeholder, nao segredo real |
| `BRIEFING_ALTMAX.md` | 92, 132, 274 | mencao a `Bearer token` no header | padrao legado documentado, nao segredo |
| `CLAUDE_CONTEXT_V2.md` | 162-164 | `SECRET_KEY=...`, `FERNET_KEY=...`, `ANTHROPIC_API_KEY=sk-ant-...` | placeholder, nao segredo real |
| `PROMPT-PROXIMA-SESSAO.md` | 20, 33, 92 | descreve uso de Fernet no backend | documentacao tecnica, nao segredo |
| `NEXT_SESSION_PROMPT.md` | 175 | "NUNCA commite segredos. .env, FERNET_KEY, app_secret_enc" | aviso de boa pratica, nao segredo |
| `PORTAL-BI-STATUS.md` | 35 | "Credenciais Omie criptografadas com Fernet (AES)" | documentacao tecnica |
| `README.md` | 86 | menciona "App Key + App Secret do Omie" como passo do setup | UX, nao segredo |
| `ALTMAX-PORTAL-BI-HANDOFF.md` | 315 | rodape "Claude Sonnet 4 · Anthropic" | label de UI |

**Resultado: nenhum segredo real encontrado em arquivos versionados.**
Nao ha necessidade de rotacao.

## 4. Auditoria — URLs antigas em docs versionadas

| Arquivo | Linha | URL/referencia | Acao |
|---|---|---|---|
| `BRIEFING_ALTMAX.md` | 15-16 | `https://altmax-api-production.up.railway.app` (Railway direto) | banner historico (URL canonica e `api.grupoalt.agr.br`) |
| `BRIEFING_ALTMAX.md` | 23 | `altmax-f8vi3z5fp-vmenezestreinamentos-1408s-projects.vercel.app` (Vercel auto) | banner historico |
| `BRIEFING_ALTMAX.md` | 26-27 | repos `altmax-api`/`altmax-web` (nomes antigos) | banner historico (repos atuais: `vmapex/grupoalt-api` e `vmapex/grupoalt-web`) |
| `BRIEFING_ALTMAX.md` | 251, 258 | `CORS_ORIGINS` e `NEXT_PUBLIC_API_URL` apontando para URLs antigas | banner historico |
| `BRIEFING_ALTMAX.md` | 267-270 | rotas `/dashboard/cp`, `/dashboard/cr`, `/dashboard/fluxo`, `/dashboard/conciliacao` | banner historico (deprecadas em favor de `/bi/financeiro/*` — Step 12) |
| `CLAUDE_CONTEXT_V2.md` | (geral) | versao "v2" superseded pelo `CLAUDE.md` canonico | banner historico |
| `README.md`, `NEXT_SESSION_PROMPT.md`, `PROMPT-PROXIMA-SESSAO.md`, `PORTAL-BI-STATUS.md` | varias | URLs canonicas atuais (`api.grupoalt.agr.br`, `portal.grupoalt.agr.br`) | sem acao — corretas |

`BRIEFING_ALTMAX.md` e `CLAUDE_CONTEXT_V2.md` ganharam um banner
`> HISTORICO — ...` logo apos o titulo, apontando para `README.md` e
`CLAUDE.md` como fontes canonicas.

## 5. Validacoes pos-mudanca

```
git ls-files .env*
.env.example       (somente)

npm run build
# 49 paginas estaticas + 1 dinamica, sem warnings

npm run audit:bundle
# 81 JS verificados, 0 credenciais expostas
```

## 6. Politica final de ambiente

- `.env.local` **nunca** deve ser rastreado (`git rm --cached` aplicado).
- `.gitignore` agora cobre `.env`, `.env.local` e `.env*.local`.
- `.env.example` e a unica referencia versionada e contem apenas
  `NEXT_PUBLIC_API_URL=http://localhost:8000` (exemplo seguro).
- Variaveis reais de producao vivem **so** no provedor de deploy
  (Vercel para frontend; Railway para backend).
- Nenhuma variavel sensivel (token, chave, secret) pode usar prefixo
  `NEXT_PUBLIC_` (porque vai pro bundle e fica acessivel no browser).
- `npm run audit:bundle` deve continuar verde em qualquer build.

## 7. Pendencias herdadas

- **Auditar env do projeto Vercel** — confirmar para qual API a preview
  esta apontando (Step 02 ja registrou; ainda precisa ser feito por
  alguem com acesso ao painel Vercel).
- **Documentar rotacao de Fernet/Secret Key** — politica de rotacao
  fora do escopo deste step; vai para um runbook operacional do time
  ou Step 16 (LGPD/observabilidade).
- **Decidir destino dos docs historicos**: manter banner como esta
  (caminho atual), ou mover para `docs/legado/` numa proxima passada
  de organizacao.

## 8. Criterios de pronto (Step 03)

- [x] `git ls-files .env*` nao lista `.env.local`.
- [x] `.gitignore` cobre `.env*.local` e `.env`.
- [x] `.env.example` nao contem segredo nem URL ambigua.
- [x] Documentos antigos com URLs/refs legadas tem banner `HISTORICO`.
- [x] Nenhum segredo real encontrado — sem necessidade de rotacao.
- [x] `npm run build` e `npm run audit:bundle` passam.
