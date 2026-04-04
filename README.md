# Grupo ALT — Portal Financeiro (Frontend)

Stack: Next.js 14 + TypeScript + Tailwind CSS + Zustand

## Produção

- **URL**: https://portal.grupoalt.agr.br
- **Repo**: vmapex/grupoalt-web
- **API**: https://api.grupoalt.agr.br (repo: vmapex/grupoalt-api)

## Deploy na Vercel

1. Importar repo `vmapex/grupoalt-web` na Vercel
2. Framework preset: Next.js
3. Environment Variable:
   ```
   NEXT_PUBLIC_API_URL = https://api.grupoalt.agr.br
   ```
4. Custom domain: `portal.grupoalt.agr.br`
5. DNS: CNAME `portal` → valor fornecido pela Vercel

## Desenvolvimento local

```bash
npm install
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev
# acesse http://localhost:3000
```

## Login

- **Email:** admin@grupoalt.agr.br
- **Senha:** definida via ADMIN_PASSWORD no Railway

## Proxy de API

O frontend proxeia chamadas para o backend via Next.js rewrites:
```
/api/proxy/:path* → NEXT_PUBLIC_API_URL/:path*
```

O axios (`src/lib/api.ts`) usa `baseURL: '/api/proxy'` com `withCredentials: true`.

## Estrutura

```
src/
  app/
    login/              → Tela de login
    portal/
      layout.tsx        → Auth guard + shell (sidebar, header)
      grupo/            → Dashboard do grupo
      financeiro/
        extrato/        → Extrato bancário
        cp/             → Contas a pagar
        cr/             → Contas a receber
        caixa/          → Caixa realizado
        fluxo/          → Fluxo de caixa
        conciliacao/    → Conciliação bancária
      admin/            → Painel administrativo
  lib/api.ts            → Axios com proxy + interceptor 401
  store/authStore.ts    → Auth + empresa ativa (Zustand)
  components/           → Sidebar, cards, charts
```
