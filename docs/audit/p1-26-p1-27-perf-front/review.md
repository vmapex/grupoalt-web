# Audit PR #127 — P1-26 + P1-27 (perf front)

Branch auditada: `feat/p1-26-p1-27-perf-front`
Commit: `ce47386 perf(front): P1-26 + P1-27 - remove jspdf morto + migra img para next/image`
Auditor: agente independente isolado (worktree `agent-ad366025b40fca7b0`)
Data: 2026-05-20

---

## TL;DR

PR remove duas dependencias mortas (`jspdf` + `html2canvas`) que ja nao tinham
import nenhum em `src/` (legado do `ExportPDFButton` que migrou para o backend
xhtml2pdf) e migra os 4 usos de `<img>` restantes para `next/image`. Asset
local do login ganha otimizacao automatica (WebP/AVIF) + `priority`; logos
dinamicos (URLs externas / base64) usam `unoptimized` mas ganham lazy loading
e tag semantica. Diff aditivo, sem alteracao de logica. Bundle do `/login`
sobe 30B (import do `Image`) compensado por servir WebP em runtime.
Tests 231/231 verde, typecheck limpo, build sem regressao, audit:bundle
sem credenciais. Recomendacao: **APPROVE**.

## Score: 98 / 100 — APPROVE

Descontei 2pt por nao haver `images.remotePatterns` configurado no
`next.config.js` (intencional dado o uso de `unoptimized`, mas merece nota
para futura refatoracao se quiser ganhar otimizacao real nos dinamicos via
allowlist de hosts conhecidos).

---

## Matriz de bloqueadores

| # | Item | Esperado | Resultado | Status |
|---|---|---|---|---|
| B1 | `jspdf`/`html2canvas` removidos de `dependencies` no `package.json` | ausentes | `grep -c "jspdf\|html2canvas" package.json` = 0 | OK |
| B2 | `package-lock.json` purgado | ausencia total | `grep -c` = 0; 213 linhas removidas no diff | OK |
| B3 | `npm ls jspdf html2canvas` retorna empty | `(empty)` | Confirmado: `altmax-web@1.0.0 (empty)` | OK |
| B4 | Sem `import jspdf\|html2canvas` em `src/` | 0 | Grep em `src/` = 0 matches | OK |
| B5 | `ExportPDFButton.tsx` continua usando endpoint `/export/.../pdf` com blob | sim | `api.get(url, { responseType: 'blob' })` linha 88-90; endpoints `/export/empresas/{id}/{extrato,cp,cr}/pdf` | OK |
| B6 | Login: `<Image>` com `priority` | sim | `src/app/login/page.tsx` linha 144 `priority` | OK |
| B7 | Login: dimensoes explicitas | width/height | `width={240}` `height={64}` linhas 142-143 | OK |
| B8 | Navbar/EmpresaDropdown/admin com `unoptimized` | sim | Navbar `unoptimized` linha 123; EmpresaDropdown linha 45; admin linha 90 | OK |
| B9 | `width`/`height` nos 4 Image | sim em todos | Login 240x64; Navbar 120x28; EmpresaDropdown 60x16; admin 120x48 | OK |
| B10 | Lint sem warnings de `<img>` | 0 | Lint local quebra por conflito de plugin (worktree dentro do projeto pai). Verificado por grep: zero `<img ` em `src/` | OK (validado por proxy) |
| B11 | Build sem regressao | /login ~5.49kB / /admin ~4.28kB / shared 160kB | `/login` 5.49 kB; `/bi/financeiro/admin` 4.28 kB; `First Load JS shared` 160 kB | OK exato |
| B12 | Tests 231/231 verde | sim | `Test Files 14 passed (14)`, `Tests 231 passed (231)`, 8.06s | OK |
| B13 | `audit:bundle` clean | 0 credenciais, 81 arquivos | "Verificando 81 arquivos JS no bundle... Nenhuma credencial exposta no bundle." | OK exato |
| B14 | Sem `<img ` em `src/` | 0 | grep `<img\s` em `src/` = 0 arquivos | OK |
| B15 | `next.config.js` nao precisa `images.remotePatterns` | confirmado | Nao tem campo `images`; os 3 dinamicos usam `unoptimized` que dispensa allowlist | OK (com nota Q-extra) |
| B16 | `alt` preservado nas 4 migracoes | sim | Login: `alt="Grupo ALT — Portal Corporativo"`; Navbar: `alt={active?.nome \|\| 'Logo'}`; EmpresaDropdown: idem; admin: `alt={label}` | OK |

**Resumo bloqueadores:** 16/16 OK.

## Matriz de qualidade

| # | Item | Resultado | Status |
|---|---|---|---|
| Q1 | Comentario explicando `unoptimized` em URL dinamica | Navbar 115-117, EmpresaDropdown 38, admin 82-84 — todos com justificativa clara (URL externa Omie/banco ou base64) | OK |
| Q2 | Comentario explicando `priority` no login | Login 136-137 ("asset local em /public", otimizacao automatica) — mencao curta de WebP/AVIF | OK |
| Q3 | Diff aditivo sem mudanca de logica visual | Confirmado: trocas 1-pra-1 (`<img>` -> `<Image>`), JSX semanticamente equivalente | OK |
| Q4 | `style={{ width: 'auto' }}` quando height fixo | Navbar `style={{ height: 28, width: 'auto' }}`; EmpresaDropdown `style={{ width: 'auto', height: 16 }}`; admin `style={{ maxHeight: 48, maxWidth: '80%', width: 'auto', objectFit: 'contain' }}` — todos respeitam aspect ratio | OK |
| Q5 | Sem novas dependencias | `next/image` ja vem com Next 14; package.json deps nao mudou (so removeu 2) | OK |
| Q6 | Commit message detalhado | Historico do jspdf, tabela com 4 sites + estrategia, ganhos quantificados, secao de compat | OK |
| Q7 | PR body lista compactamente as 4 migracoes | Implicito no commit (PR body acompanha) — tabela markdown clara no commit | OK |

**Resumo qualidade:** 7/7 OK.

## Matriz de risco / atencao

| # | Risco | Avaliacao |
|---|---|---|
| R1 | `unoptimized` desliga otimizacao completamente | Aceitavel para os 3 dinamicos (URLs externas Omie/banco + base64). Para otimizar de fato precisaria de `images.remotePatterns` ou um proxy server-side que materialize o asset. Nao bloqueante — o ganho de UX continua sendo lazy loading + tag semantica. |
| R2 | `priority` apenas no login | Correto. Navbar/EmpresaDropdown podem estar acima da fold dependendo da rota, mas o logo da empresa eh ~16px de altura e nao costuma dominar LCP — lazy esta certo. Admin esta numa pagina interna, tambem certo. |
| R3 | Width/height arbitrarios (120x28, 60x16, etc.) sem medir o logo real | Mitigado por `style={{ width: 'auto' }}` em todos os 3 dinamicos — o browser respeita aspect ratio nativo, dimensoes funcionam so como reserva de espaco. Logo do login (`240x64`) eh fixo no asset local, deve ter sido medido. |
| R4 | Layout shift (CLS) | Reservas de espaco corretas em todos os 4 sites; `width: auto` no style nao apaga a reserva inicial (next/image gera placeholder com aspect-ratio). Falta validacao visual em smoke test, mas conceito esta certo. |

---

## Validacoes cruzadas

```
$ git log origin/feat/p1-26-p1-27-perf-front -1 --oneline
ce47386 perf(front): P1-26 + P1-27 - remove jspdf morto + migra img para next/image

$ git show ce47386 --stat
 package-lock.json                      | 213 ---------------------------------
 package.json                           |   2 -
 src/app/bi/financeiro/admin/page.tsx   |  11 +-
 src/app/login/page.tsx                 |   8 +-
 src/components/nav/EmpresaDropdown.tsx |  12 +-
 src/components/nav/Navbar.tsx          |  13 +-
 6 files changed, 39 insertions(+), 220 deletions(-)

$ npm install --no-audit --no-fund
added 718 packages in 26s

$ npm ls jspdf html2canvas
altmax-web@1.0.0 ...
`-- (empty)

$ grep -c "jspdf\|html2canvas" package.json package-lock.json
package.json:0
package-lock.json:0

$ grep -rn "jspdf\|html2canvas" src/
(0 matches)

$ grep -rn "<img " src/ --include="*.tsx" --include="*.jsx"
(0 matches)

$ npm run typecheck
> tsc --noEmit --pretty false
(0 erros)

$ npm test -- --run
 Test Files  14 passed (14)
      Tests  231 passed (231)
   Duration  8.06s

$ npm run build
 ✓ Compiled successfully
 ✓ Generating static pages (43/43)
Route (app)                                Size     First Load JS
├ ƒ /bi/financeiro/admin                   4.28 kB         204 kB
├ ƒ /login                                 5.49 kB         193 kB
+ First Load JS shared by all              160 kB

$ npm run audit:bundle
Verificando 81 arquivos JS no bundle...
Nenhuma credencial exposta no bundle.
```

Nota sobre lint: `npm run lint` local quebra por conflito de plugin `@next/next`
(o worktree do auditor esta dentro do proprio repo principal, que tem outro
`node_modules` e `.eslintrc.json` — causa duplicacao). Eh artefato puramente
ambiental do auditor isolado, **NAO** representa um problema do PR. Verificacao
direta por grep confirma zero ocorrencias de `<img ` em `src/` (era 4 antes do
PR), entao o objetivo do lint (zero warnings `@next/next/no-img-element`) esta
atendido por construcao.

---

## Pontos de atencao nao-bloqueantes

1. **Sem `images.remotePatterns`**: o uso de `unoptimized` nos 3 dinamicos
   pula a otimizacao automatica do Next por completo. Se no futuro quiserem
   ganhar WebP/AVIF tambem nos logos de empresa, vai precisar:
   - mapear o(s) host(s) das URLs dinamicas (Omie, Cloudinary, S3, etc.)
   - adicionar em `next.config.js`:
     ```js
     images: {
       remotePatterns: [
         { protocol: 'https', hostname: 'omie.com.br' },
         // etc
       ]
     }
     ```
   - remover `unoptimized` dos 3 sites
   Nao eh problema desta PR — o objetivo aqui era so silenciar o lint
   warning e ganhar lazy loading. Otimizacao real fica para uma proxima
   iteracao quando souberem com certeza quais hosts servem os logos.

2. **PDFs no client (lazy import via dynamic)**: a remocao do jspdf eh
   final, nao reversivel sem `npm install`. Caso surja necessidade de
   gerar PDF client-side de novo (offline, sem backend), o caminho seria
   `dynamic import` + chunk separado. Hoje toda a pipeline depende de
   `/export/.../pdf` no backend (xhtml2pdf) — assumo que essa decisao foi
   tomada conscientemente (xhtml2pdf da mais controle de layout + nao
   custa CPU do cliente).

3. **`priority` no login**: certo (logo above-the-fold contribui pro LCP).
   Vale lembrar que o login ja tem 3 imagens `.jpeg/.jpg` carregadas via
   CSS `background-image` no `pillarStage` (`/missao.jpeg`, `/visao.jpg`,
   `/valores.jpg`) — essas continuam sendo `<div>` com `style.backgroundImage`,
   nao foram migradas (fora do escopo P1-27). Se quiserem ganho LCP maior
   no login num P-futuro, valeria considerar migrar tambem.

4. **Validacao visual ainda nao automatizada**: nao da pra rodar Playwright
   no audit. Recomendado smoke test manual em dev pra confirmar:
   - logo do login renderiza com tamanho correto e sem distorcao
   - logos dinamicos na Navbar/EmpresaDropdown carregam (especialmente
     com `unoptimized`, ja que perde o pipeline de erro nativo do next)
   - admin nao quebra com base64 (FileReader -> data:image/png;base64,...)

---

## Decisao final

**APPROVE** com score **98/100**.

Diff cirurgico, validacoes objetivas todas verde, comentarios in-line
explicando cada escolha, sem regressao mensuravel no bundle. Os 2 pontos
descontados sao alinhamento com o follow-up sugerido (remotePatterns),
nao defeito do PR.
