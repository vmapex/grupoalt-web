# ALT MAX — Portal Financeiro (Frontend)

Stack: Next.js 14 + TypeScript + Tailwind CSS + Zustand

## Deploy na Vercel (recomendado)

1. Suba este projeto para um repositório GitHub
2. Acesse [vercel.com](https://vercel.com) → New Project → Importar o repositório
3. Em **Environment Variables**, adicione:
   ```
   NEXT_PUBLIC_API_URL = https://altmax-api-production.up.railway.app
   ```
4. Clique em **Deploy** — pronto!

## Desenvolvimento local

```bash
npm install
npm run dev
# acesse http://localhost:3000
```

## Login padrão (Railway)
- **Email:** admin@altmax.com.br
- **Senha:** a senha definida na variável ADMIN_PASSWORD do Railway

## Estrutura
```
src/
  app/
    login/          → Tela de login
    dashboard/
      page.tsx      → Visão geral (KPIs + saldos)
      extrato/      → Extrato bancário
      saldos/       → Saldo por conta
      cp/           → Contas a pagar
      cr/           → Contas a receber
      fluxo/        → Fluxo de caixa
  lib/api.ts        → Axios configurado para o Railway
  store/authStore   → Auth + empresa ativa (Zustand)
```
