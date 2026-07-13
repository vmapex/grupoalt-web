# Excecoes de Audit (npm audit)

Este arquivo lista vulnerabilidades de dependencias que sao temporariamente
permitidas em CI por nao terem fix disponivel sem upgrade breaking. Cada
excecao precisa ter dono, motivo, mitigacao e data de revisao. Excecoes sem
dono ou vencidas nao sao aceitas — apos a data de revisao, criar issue
para remover ou atualizar a entrada com nova justificativa.

## Politica

- **critical/high em producao bloqueia merge** por padrao (`npm audit --omit=dev --audit-level=high`).
- **moderate** gera alerta e issue, exceto se for explorável no app.
- **low/info** apenas documenta no relatorio.
- **dev-only** (audit completo) gera issue se for high/critical, mas nao bloqueia merge.

## Excecoes ativas

> **EXC-001 (Next.js 14.x — 5 advisories high) RESOLVIDA em 2026-06-19 pelo PR-4**
> (upgrade Next 14.2.35 → 16.2.9 + React 19 + ESLint 9). Os 5 GHSAs da serie 14.x
> (`GHSA-9g9p-9gw9-jx7f`, `-h25m-26qc-wcjf`, `-ggv3-7p47-pfv8`, `-3x4c-7xq6-9pq8`,
> `-q4gf-8mx6-v5v3`) nao aparecem mais em `npm audit --omit=dev --audit-level=high`.
> Entrada removida conforme a politica ("remova a entrada no mesmo PR que faz o
> upgrade"). Issue [#56](https://github.com/vmapex/grupoalt-web/issues/56) fecha com o PR-4.
>
> O HIGH transitivo `form-data` (`GHSA-hmw2-7cc7-3qxx`, via axios) que apareceu na
> nova arvore de deps foi corrigido no mesmo PR via `npm audit fix` (form-data
> 4.0.5 → 4.0.6, so lockfile) — nao precisa de excecao.

### EXC-002 — postcss <8.5.10: XSS via Stringify (vendorizado DENTRO do Next 16)

- **Pacote**: `postcss` — **NAO** o nosso dep direto (que e `^8.5.15`, ja corrigido).
  A copia vulneravel vive em `node_modules/next/node_modules/postcss`, vendorizada
  pelo proprio Next 16.2.9.
- **Severidade**: moderate
- **Advisory**: `GHSA-qx2v-qp2m-jg93`
- **Fix disponivel**: nao por nos. `npm audit fix --force` so "resolve" instalando
  `next@9.3.3` (downgrade absurdo). Depende do Next publicar patch que atualize o
  postcss vendorizado para >= 8.5.10.
- **Mitigacoes**: o portal nao gera CSS dinamico a partir de input do usuario;
  postcss roda apenas em build-time (nunca no runtime de producao). Nao exploravel.
- **Dono**: Vinicius Menezes (@VinnyMMHH).
- **Plano**: acompanhar releases do Next 16.x; remover quando o postcss vendorizado
  estiver >= 8.5.10.
- **Revisao**: 2026-09-19 (~90 dias).
- **Issue de tracking**: abrir nova issue (a #56 fecha com o PR-4). Ate la, vale esta entrada.

## Dev-only (nao bloqueia merge)

Vulnerabilidades em `devDependencies` (vitest/esbuild/glob/eslint-config-next)
nao sao executadas em producao. Sao monitoradas em `npm audit` completo mas
nao em `--omit=dev`. Upgrade quando houver janela.

## Como atualizar este arquivo

1. **Quando uma excecao for resolvida** (upgrade feito): remova a entrada
   no mesmo PR que faz o upgrade.
2. **Quando a data de revisao chegar**: atualize a data com novo plano e
   confirme o dono — nao deixe ficar perpetua.
3. **Quando uma nova vulnerabilidade aparecer sem fix**: adicione entrada
   com `EXC-NNN` sequencial, dono, mitigacoes e data <= 90 dias.
4. **Sempre** rodar `npm audit --omit=dev --audit-level=high` localmente
   antes de mexer aqui — se passou, nao precisa de excecao.
