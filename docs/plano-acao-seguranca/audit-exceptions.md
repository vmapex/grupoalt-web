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

### EXC-001 — Next.js 14.x: cinco advisories (DoS / smuggling)

- **Pacote**: `next`
- **Versao atual**: 14.2.35 (ultima patch da serie 14.x)
- **Severidade**: high
- **Advisories**:
  - `GHSA-9g9p-9gw9-jx7f` — DoS via Image Optimizer remotePatterns (self-hosted)
  - `GHSA-h25m-26qc-wcjf` — HTTP request deserialization (RSC) DoS
  - `GHSA-ggv3-7p47-pfv8` — HTTP request smuggling em rewrites
  - `GHSA-3x4c-7xq6-9pq8` — Unbounded next/image disk cache (self-hosted)
  - `GHSA-q4gf-8mx6-v5v3` — DoS com Server Components
- **Fix disponivel**: upgrade para Next 16.x (breaking).
- **Mitigacoes ativas**:
  - Hospedagem em Vercel — duas das cinco advisories sao especificas para self-hosted (image optimizer e disk cache) e nao se aplicam.
  - CSP restritiva em vigor (Step 10) com `unsafe-eval` removido e nonce dinamico.
  - Rate limit no backend protege contra DoS por exaustao.
- **Dono**: Vinicius Menezes (@VinnyMMHH).
- **Plano**: avaliar upgrade de Next durante Step 16 ou abrir step proprio.
- **Revisao**: 2026-07-31 (~3 meses do registro da excecao).
- **Issue de tracking**: [#56](https://github.com/vmapex/grupoalt-web/issues/56).

### EXC-002 — postcss <8.5.10: XSS via Stringify (transitivo de Next 14.x)

- **Pacote**: `postcss`
- **Severidade**: moderate
- **Advisory**: `GHSA-qx2v-qp2m-jg93`
- **Fix disponivel**: presente em Next 16.x. Em Next 14.x, postcss e dependencia transitiva fixada.
- **Mitigacoes**: o portal nao gera CSS dinamico a partir de input do usuario; postcss roda apenas em build-time.
- **Dono**: Vinicius Menezes (@VinnyMMHH) — herda de EXC-001.
- **Revisao**: junto com EXC-001 (resolve no upgrade do Next).
- **Issue de tracking**: [#56](https://github.com/vmapex/grupoalt-web/issues/56) (mesma de EXC-001).

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
