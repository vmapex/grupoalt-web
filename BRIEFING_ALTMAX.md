# ALT MAX — Portal BI · Briefing Completo para Claude Code

> **HISTÓRICO — NÃO USE COMO REFERÊNCIA OPERACIONAL.**
> Este briefing reflete o estado inicial do projeto. URLs, nomes de repo
> e rotas estão desatualizados:
> - URLs canônicas atuais: `https://api.grupoalt.agr.br` (backend) e
>   `https://portal.grupoalt.agr.br` (frontend). Os domínios
>   `altmax-api-production.up.railway.app` e
>   `altmax-f8vi3z5fp-...vercel.app` aqui referenciados são legados.
> - Nomes de repositório atuais: `vmapex/grupoalt-api` e `vmapex/grupoalt-web`.
> - Rotas `/dashboard/*` mencionadas estão sendo deprecadas em favor de
>   `/bi/financeiro/*` (ver `CLAUDE.md` e Step 12 do plano de ação).
>
> Para contexto canônico, use `README.md` e `CLAUDE.md`.

## 1. Visão Geral do Projeto

Portal financeiro web para a empresa **Alt Max**, substituindo relatórios Power BI por um dashboard interativo conectado à **API Omie** (ERP financeiro brasileiro). O sistema é multi-tenant (3 empresas) com autenticação JWT.

---

## 2. Stack Tecnológica

### Backend (produção — Railway)
- **FastAPI** + Python 3.12
- **PostgreSQL** + SQLAlchemy async
- **Redis** (cache)
- **URL produção:** `https://altmax-api-production.up.railway.app`
- **Swagger/Docs:** `https://altmax-api-production.up.railway.app/docs`

### Frontend (produção — Vercel)
- **Next.js 14** (App Router)
- **TypeScript** + Tailwind CSS
- **Zustand** (estado global)
- **Axios** (HTTP)
- **URL produção:** `https://altmax-f8vi3z5fp-vmenezestreinamentos-1408s-projects.vercel.app`

### Repositórios GitHub
- Backend: `altmax-api` (usuário: vmenezestreinamentos ou natolira)
- Frontend: `altmax-web`

---

## 3. Credenciais e Acessos

### Login do Portal
- **Email:** `admin@altmax.com.br`
- **Senha:** `AltMax@2026`

### Empresas cadastradas
- Empresa ID 1 → Alt Max (principal, já sincronizada com Omie)
- Empresas 2 e 3 → ainda não cadastradas no painel admin

### Banco de dados (PostgreSQL no Railway)
- Tabelas criadas: `empresas`, `omie_credenciais`, `usuarios`, `usuario_empresa`, `contas_correntes`, `lancamentos_cc`, `contas_pagar`, `contas_receber`
- Coluna `ultima_sync` adicionada manualmente via SQL

### Dados já sincronizados (Empresa 1)
- 5 contas correntes
- 157 lançamentos CC
- 98 contas a pagar
- 18 contas a receber

---

## 4. Arquitetura do Backend (altmax-api)

```
altmax-api/
├── app/
│   ├── main.py                    # FastAPI app + todos os routers registrados
│   ├── core/
│   │   ├── config.py              # Variáveis de ambiente
│   │   ├── database.py            # SQLAlchemy async engine
│   │   ├── deps.py                # get_empresa_ctx, get_omie_client (multi-tenant)
│   │   └── security.py            # JWT + bcrypt + Fernet
│   ├── models/models.py           # Todos os modelos SQLAlchemy (BigInteger nos omie_id!)
│   ├── routers/
│   │   ├── auth.py                # POST /auth/login (OAuth2 form-urlencoded)
│   │   ├── admin.py               # CRUD empresas, credenciais, usuários
│   │   ├── extrato.py             # GET /empresas/{id}/extrato, /saldos, /contas
│   │   ├── cp_cr.py               # GET /empresas/{id}/cp, /cr
│   │   ├── fluxo_caixa.py         # GET /empresas/{id}/fluxo-caixa
│   │   ├── conciliacao.py         # GET /empresas/{id}/conciliacao/calendario
│   │   ├── webhook.py             # Webhooks Omie
│   │   └── sync.py                # POST /sync/empresas/{id}
│   ├── services/
│   │   ├── omie_client.py         # Cliente Omie async (retry, paginação, rate limit)
│   │   └── sync_service.py        # Sync Omie → PostgreSQL (com rollback por step)
│   └── cache/redis_client.py
```

### Endpoints principais
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/auth/login` | Login (form-urlencoded: username + password) |
| GET | `/auth/me` | Usuário atual + empresas |
| GET | `/empresas/{id}/contas` | Listar contas correntes |
| GET | `/empresas/{id}/extrato` | Lançamentos (params: data_inicio, data_fim DD/MM/YYYY) |
| GET | `/empresas/{id}/saldos` | Saldo por conta |
| GET | `/empresas/{id}/cp` | Contas a pagar |
| GET | `/empresas/{id}/cr` | Contas a receber |
| GET | `/empresas/{id}/fluxo-caixa` | Projeção fluxo |
| GET | `/empresas/{id}/conciliacao/calendario` | Heatmap 5 meses |
| POST | `/sync/empresas/{id}` | Dispara sync completo (requer Bearer token) |

### Campos retornados pelo /extrato
```json
{
  "id": 8721587397,
  "data_lancamento": "24/10/2025",
  "data_conciliacao": "27/10/2025",
  "descricao": "PIX RECEBIDO ...",
  "valor": 40.0,
  "tipo": "99999",
  "conciliado": true,
  "conta_id": 8720596545,
  "categoria": "1.02.01",
  "documento": "...",
  "origem": "EXTR"
}
```
> ⚠️ `valor` positivo = entrada, negativo = saída

---

## 5. Arquitetura do Frontend (altmax-web)

```
altmax-web/
├── src/
│   ├── app/
│   │   ├── layout.tsx             # Root layout
│   │   ├── page.tsx               # Redirect → /login
│   │   ├── login/page.tsx         # Tela de login (OAuth2 form-urlencoded)
│   │   └── dashboard/
│   │       ├── layout.tsx         # Nav top + seletor empresa + logout
│   │       ├── page.tsx           # Redirect → /dashboard/caixa
│   │       ├── caixa/page.tsx     # ✅ Conectado na API real
│   │       ├── extrato/page.tsx   # ✅ Conectado na API real
│   │       ├── cp/page.tsx        # ⚠️ Ainda com dados mock
│   │       ├── cr/page.tsx        # ⚠️ Ainda com dados mock
│   │       ├── fluxo/page.tsx     # ⚠️ Ainda com dados mock
│   │       └── conciliacao/page.tsx # ⚠️ Ainda com dados mock
│   ├── lib/api.ts                 # Axios + Bearer token automático
│   └── store/authStore.ts         # Zustand: token, user, empresas, empresaAtiva
├── .env.local                     # NEXT_PUBLIC_API_URL
├── next.config.js
└── vercel.json
```

### Padrão das páginas (iframe srcdoc)
Todas as páginas do dashboard usam o padrão:
```tsx
'use client'
import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/store/authStore'

export default function XxxPage() {
  const ref = useRef<HTMLDivElement>(null)
  const { token, empresaAtiva } = useAuthStore()

  useEffect(() => {
    const html = `<!-- HTML completo com Chart.js -->`
    const iframe = document.createElement('iframe')
    iframe.style.cssText = 'width:100%;height:calc(100vh - 48px);border:none;display:block'
    iframe.srcdoc = html
    ref.current!.innerHTML = ''
    ref.current!.appendChild(iframe)
  }, [empresaAtiva, token])

  return <div ref={ref} style={{ width: '100%', height: 'calc(100vh - 48px)' }} />
}
```

O HTML dentro do iframe usa:
- `const API = '${apiUrl}'` e `const TOKEN = '${token}'` injetados via template literal
- Chart.js 4.4.1 via CDN
- Fontes: DM Mono + Plus Jakarta Sans via unpkg
- Design system: dark navy `#05091A`, cores semânticas

---

## 6. Design System

```css
--bg: #05091A          /* Navy escuro — background */
--surface: rgba(255,255,255,0.034)  /* Superfície de cards */
--border: rgba(255,255,255,0.07)    /* Bordas */
--blue: #38BDF8        /* Cor principal / entradas */
--green: #34D399       /* Positivo / conciliado */
--red: #F87171         /* Negativo / saída */
--amber: #FBBF24       /* Alerta / pendente */
--orange: #FB923C      /* Custo fixo */
--purple: #C084FC      /* DNOP / especial */
--text: #F1F5F9        /* Texto principal */
--muted: #64748B       /* Texto secundário */

Fontes: 'DM Mono' (números/mono), 'Plus Jakarta Sans' (texto)
```

---

## 7. Status Atual e Próximos Passos

### ✅ Concluído
- [x] Backend FastAPI completo no Railway (online)
- [x] PostgreSQL + Redis configurados
- [x] Sync Omie → banco funcionando (empresa 1)
- [x] Frontend Next.js no ar na Vercel
- [x] Login com autenticação JWT real
- [x] Página Caixa conectada na API real (gráficos + KPIs + drill down)
- [x] Página Extrato conectada na API real (tabela + filtros + saldos por conta)

### ⚠️ Pendente (próximos passos em ordem)
1. **Conectar CP (Contas a Pagar)** na API real — endpoint: `GET /empresas/{id}/cp`
2. **Conectar CR (Contas a Receber)** na API real — endpoint: `GET /empresas/{id}/cr`
3. **Conectar Fluxo de Caixa** na API real — endpoint: `GET /empresas/{id}/fluxo-caixa`
4. **Conectar Conciliação** na API real — endpoint: `GET /empresas/{id}/conciliacao/calendario`
5. **Cadastrar empresas 2 e 3** via painel admin Swagger + sincronizar
6. **Correções de UX** no Extrato: troca de data recarregar sem precisar de botão, scroll da tabela
7. **Sync agendado** — carga automática noturna (APScheduler no backend)

### 🐛 Bugs conhecidos
- Extrato: trocar as datas requer clicar no botão "Buscar" manualmente
- Extrato: a tabela precisa de melhor controle de altura/scroll dentro do iframe
- CP/CR/Fluxo/Conciliação: ainda mostram dados mockados do HTML original

---

## 8. Campos da API Omie (mapeamento)

### /extrato → lançamentos_cc
| Campo API | Significado |
|-----------|-------------|
| `valor` | Positivo = entrada, negativo = saída |
| `data_lancamento` | "DD/MM/YYYY" |
| `conciliado` | true/false |
| `categoria` | código categoria Omie |
| `descricao` | texto do lançamento |

### /cp e /cr → contas_pagar / contas_receber
| Campo API | Significado |
|-----------|-------------|
| `favorecido` | nome do fornecedor/cliente |
| `valor` | valor do documento |
| `valor_pago` / `valor_recebido` | valor já liquidado |
| `data_vencimento` | "DD/MM/YYYY" |
| `data_previsao` | previsão de pagamento |
| `data_pagamento` | data efetiva |
| `categoria` | código categoria |
| `status` | calculado: "PAGO", "A VENCER", "ATRASADO" |

---

## 9. Variáveis de Ambiente

### Railway (backend)
```
DATABASE_URL     = postgresql+asyncpg://...
REDIS_URL        = redis://...
SECRET_KEY       = ...
FERNET_KEY       = ...
CORS_ORIGINS     = https://altmax-f8vi3z5fp-vmenezestreinamentos-1408s-projects.vercel.app,http://localhost:3000
DEBUG            = false
ENVIRONMENT      = production
```

### Vercel (frontend)
```
NEXT_PUBLIC_API_URL = https://altmax-api-production.up.railway.app
```

---

## 10. Instrução para Claude Code

Ao iniciar, clone o repositório `altmax-web` e foque nos seguintes arquivos prioritários:

1. `src/app/dashboard/cp/page.tsx` → conectar em `GET /empresas/{id}/cp`
2. `src/app/dashboard/cr/page.tsx` → conectar em `GET /empresas/{id}/cr`
3. `src/app/dashboard/fluxo/page.tsx` → conectar em `GET /empresas/{id}/fluxo-caixa`
4. `src/app/dashboard/conciliacao/page.tsx` → conectar em `GET /empresas/{id}/conciliacao/calendario`

O padrão de implementação está nos arquivos `caixa/page.tsx` e `extrato/page.tsx` — use como referência.

A API aceita Bearer token no header `Authorization`. O token vem do `useAuthStore().token`.

Datas sempre no formato `DD/MM/YYYY` nos parâmetros da API.
