# ALT MAX Web

## Referência do Projeto
@ALTMAX-PORTAL-BI-HANDOFF.md

## Protótipo Visual
O arquivo `altmax-portal-v2.jsx` é o protótipo React renderizável — use como referência visual, não como código de produção. Refatore conforme a seção 8 do handoff.

## Stack
- Next.js 14 + TypeScript + Tailwind + Zustand
- Backend: FastAPI (Railway)
- Frontend: Vercel
- ERP: Omie API

## Comandos
- `npm run dev` — dev server
- `npm run build` — build de produção
- `npm run lint` — linting
```

**4.** Salve

A linha `@ALTMAX-PORTAL-BI-HANDOFF.md` é a mágica — o `@` diz pro Claude Code: "quando abrir uma sessão, leia também esse outro arquivo e carregue tudo na memória". Funciona como um `import`. Então ele vai carregar os dois: o `CLAUDE.md` (curto, com regras gerais) + o handoff completo (1.183 linhas com toda a spec).

**Estrutura final da pasta:**
```
altmax-web/
├── CLAUDE.md                        ← esse que você criou agora
├── ALTMAX-PORTAL-BI-HANDOFF.md      ← o handoff que baixou daqui
├── altmax-portal-v2.jsx             ← o protótipo que baixou daqui
├── package.json
├── app/
│   ├── page.tsx
│   └── ...
└── ...
