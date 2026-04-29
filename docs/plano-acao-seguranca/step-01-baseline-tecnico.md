# STEP 01 - Baseline Tecnico e Trilha de Decisao

## Objetivo

Criar uma fotografia tecnica confiavel antes de qualquer mudanca. Esse baseline sera usado para comparar comportamento depois de cada etapa e reduzir investigacoes subjetivas caso algo quebre.

## Por que este step vem primeiro

Antes de atualizar dependencias ou corrigir codigo, precisamos saber exatamente:

- branch atual;
- status do worktree;
- versoes instaladas;
- resultado de build/typecheck/audit;
- rotas existentes;
- variaveis publicas esperadas;
- vulnerabilidades atuais;
- pontos de risco ja identificados.

## Escopo

Somente leitura e documentacao. Nao alterar codigo funcional.

## Acoes Detalhadas

1. Confirmar branch e worktree:

```powershell
git status --short --branch
git log -1 --oneline
```

2. Confirmar versoes principais:

```powershell
node --version
npm --version
npm ls next react react-dom axios recharts jspdf --depth=0
```

3. Rodar validacoes atuais:

```powershell
npx tsc --noEmit --pretty false
npm run build
npm run audit:bundle
npm audit --omit=dev
```

4. Testar o lint atual:

```powershell
npm run lint
```

Se abrir prompt interativo, cancelar e registrar como problema conhecido. Nao configurar ESLint neste step.

5. Listar rotas principais:

```powershell
Get-ChildItem -Recurse -Filter page.tsx src\app | Select-Object FullName
```

6. Registrar os resultados em um arquivo de baseline, sugerido:

```text
docs/AUDIT_BASELINE_2026-04-29.md
```

7. Incluir no baseline:
   - resultado de cada comando;
   - lista das vulnerabilidades;
   - confirmacao se build/typecheck passam;
   - confirmacao se lint e interativo;
   - rotas sensiveis;
   - riscos ja conhecidos.

## Validacao

- Existe documento de baseline.
- Resultado de `npm audit --omit=dev` foi registrado.
- Resultado de `npm run build` foi registrado.
- Resultado de `npx tsc --noEmit --pretty false` foi registrado.
- Nenhum arquivo funcional foi alterado.

## Criterio de Pronto

- O time sabe qual e o estado inicial.
- Existe comparacao objetiva para mudancas futuras.
- O repositorio segue funcionalmente igual.

## Risco se Ignorar

Sem baseline, qualquer regressao futura pode virar uma investigacao longa, sem ponto de comparacao confiavel.

## Prompt para Execucao

```text
Execute o STEP 01 do plano de acao do grupoalt-web: criar baseline tecnico e trilha de decisao. Trabalhe em modo somente leitura, rode comandos de status, versoes, typecheck, build, audit, audit:bundle e teste o lint apenas para confirmar se abre prompt. Nao faca alteracoes funcionais. No final, gere um resumo objetivo do estado atual e indique qualquer comando que falhou.
```
