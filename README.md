# Grupo ALT — Portal Financeiro (Frontend)

Portal financeiro multi-tenant integrado com a API Omie via backend FastAPI.

**Producao:** https://portal.grupoalt.agr.br (Vercel)
**API:** https://api.grupoalt.agr.br (Railway — repo: vmapex/grupoalt-api)

---

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Zustand (state management)
- Axios (HTTP client com interceptor 401/refresh)

---

## Deploy na Vercel

1. Importar repo `vmapex/grupoalt-web` na Vercel
2. Framework preset: Next.js
3. Environment Variable: `NEXT_PUBLIC_API_URL = https://api.grupoalt.agr.br`
4. Custom domain: `portal.grupoalt.agr.br`

---

## Desenvolvimento local

```bash
npm install
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev
# acesse http://localhost:3000
```

---

## Login

- **Email:** admin@grupoalt.agr.br
- **Senha:** definida via ADMIN_PASSWORD no Railway

---

## Proxy de API

O frontend proxeia chamadas para o backend via Next.js rewrites:
```
/api/proxy/:path* → NEXT_PUBLIC_API_URL/:path*
```
O axios (`src/lib/api.ts`) usa `baseURL: '/api/proxy'` com `withCredentials: true`.

---

## Paginas do portal

### Funcionais (dados reais da Omie)
| Rota | Pagina | Fonte de dados |
|------|--------|----------------|
| `/portal/grupo` | Dashboard | `GET /empresas/{id}/dashboard` — KPIs CP/CR/vencimentos |
| `/portal/financeiro/extrato` | Extrato bancario | `GET /empresas/{id}/extrato` + `/saldos` |
| `/portal/financeiro/caixa` | Caixa realizado (DRE) | `GET /empresas/{id}/extrato` agregado por categoria |
| `/portal/financeiro/cp` | Contas a pagar | `GET /empresas/{id}/cp` + `/cp/resumo` |
| `/portal/financeiro/cr` | Contas a receber | `GET /empresas/{id}/cr` + `/cr/resumo` |
| `/portal/financeiro/fluxo` | Fluxo de caixa | `GET /empresas/{id}/fluxo-caixa` |
| `/portal/financeiro/conciliacao` | Conciliacao bancaria | `GET /empresas/{id}/conciliacao/*` |
| `/portal/admin` | Administracao | CRUD usuarios/empresas/unidades + teste de credenciais |
| `/portal/setup` | Setup wizard | Onboarding: empresa + credenciais Omie |

### Em desenvolvimento
| Rota | Pagina | Status |
|------|--------|--------|
| `/portal/indicadores/*` | Indicadores | Placeholder |
| `/portal/documentos/*` | Documentos | Placeholder |
| `/portal/grupo/estrutura` | Estrutura do grupo | Placeholder |

---

## Fluxo de onboarding

Quando um admin loga sem nenhuma empresa cadastrada:

1. Portal detecta `empresas.length === 0` no `/auth/me`
2. Redireciona automaticamente para `/portal/setup`
3. Wizard de 3 passos:
   - **Passo 1:** Nome da empresa + CNPJ
   - **Passo 2:** App Key + App Secret do Omie (com botao "Testar Conexao")
   - **Passo 3:** Confirmacao + redirect ao dashboard
4. Backend cria grupo + empresa + credenciais + vinculo em uma transacao

---

## Estrutura

```
src/
  app/
    login/                  → Tela de login
    portal/
      layout.tsx            → Auth guard + shell (sidebar, header, redirect setup)
      grupo/page.tsx        → Dashboard com dados reais da Omie
      setup/page.tsx        → Wizard de onboarding (3 passos)
      financeiro/
        extrato/page.tsx    → Extrato bancario
        caixa/page.tsx      → Caixa realizado (DRE)
        cp/page.tsx         → Contas a pagar
        cr/page.tsx         → Contas a receber
        fluxo/page.tsx      → Fluxo de caixa
        conciliacao/page.tsx → Conciliacao bancaria
      admin/page.tsx        → Painel administrativo
      indicadores/          → Em desenvolvimento
      documentos/           → Em desenvolvimento
  lib/
    api.ts                  → Axios com proxy + interceptor 401
    types.ts                → Interfaces TypeScript
  hooks/
    useAPI.ts               → React hooks para endpoints (useExtrato, useCP, etc.)
    useEmpresaId.ts         → Hook para empresa ativa
  store/
    authStore.ts            → Auth + empresa ativa + permissoes (Zustand)
    empresaStore.ts         → Lista de empresas + sync do auth
    themeStore.ts           → Tema dark/light
    dateRangeStore.ts       → Periodo de datas (persistido)
    unidadeStore.ts         → Unidades/projetos
  components/
    Sidebar.tsx             → Navegacao lateral
    ui/                     → Badge, GlowLine, KPICard, etc.
    charts/                 → BarLabel, CustomTooltip
    nav/                    → DateRangePicker, EmpresaDropdown
    export/                 → ExportModal, ExportButton
    chat/                   → OrbitButton, ChatPanel
```
