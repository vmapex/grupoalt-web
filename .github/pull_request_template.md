<!--
Template alinhado ao plano de auditoria production-ready
(docs/plano-acao-seguranca/ + docs/AUDITORIA_HANDOFF_PRODUCTION_READY.md).
-->

## Summary

<!-- 1-3 bullets — foco no porquê. -->

-

## Achado(s) relacionado(s)

<!-- P0-X / P1-Y do handoff, ou "N/A — feature nova". -->

## Risco

<!-- Marque um -->

- [ ] 🟢 **Zero** — só docs/config/CI/test; nenhum bit muda no bundle de produção.
- [ ] 🟢 **Baixo** — pequeno, isolado, reversível em <2min via revert.
- [ ] 🟡 **Médio** — mexe em store, fetch, fluxo de auth, ou afeta número visível ao gestor.
- [ ] 🔴 **Alto** — motor de cálculo (DRE), regras de negócio, schema, deploy. **Exige Fase 2/3/4 do handoff.**

## Bloqueios do handoff respeitados?

- [ ] Não toca em `planoContas.ts`, `caixaBuilder.ts` ou qualquer função que produza número visível ao gestor (DRE, RoB, EBT, RNOP/DNOP)
- [ ] Não muda regras NEUTRO, estorno, parcelas ou `Math.abs` no agregador
- [ ] Não muda cookies, CORS allow-origins, fluxo refresh/logout no `lib/api.ts`
- [ ] Não muda `middleware.ts` (CSP/nonce) sem testar em preview
- [ ] Não roda comando contra produção (Vercel/Railway)

> Se alguma caixa **não** pôde ser marcada, explique abaixo + cite ADR/decisão.

## Test plan

- [ ] `npm run typecheck` verde
- [ ] `npm run lint` sem novos erros (warnings ok)
- [ ] `npm test` — testes relevantes citados aqui
- [ ] `npm run build` verde
- [ ] `npm run audit:bundle` limpo
- [ ] Smoke manual em dev local (golden path da feature)
- [ ] Preview Vercel revisado em desktop + mobile (se UI)

## Rollback

<!-- Vercel: ‘Promote previous deployment’ leva <2min. Mas considere
     reverter via PR para histórico limpo. -->

## Refs

<!-- Issue, ADR (docs/adr/00X), PR irmão no grupoalt-api, handoff. -->

-

---

🤖 PRs gerados por Claude Code: anote o agente que ajudou na descrição final.
