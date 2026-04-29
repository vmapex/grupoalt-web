# STEP 03 - Higiene de Ambiente, Secrets e Documentacao Antiga

## Objetivo

Remover ambiguidade de ambiente e reduzir risco de vazamento ou confusao com segredos, URLs antigas e documentacao obsoleta.

## Por que este step vem antes de dependencia e codigo

Se local aponta para API antiga e producao aponta para API nova, qualquer teste pode validar contra o alvo errado. Isso atrapalha auditoria e pode gerar conclusoes falsas.

## Escopo

- `.env.local`;
- `.env.example`;
- `.gitignore`;
- `vercel.json`;
- documentacao antiga;
- script de audit de bundle.

## Acoes Detalhadas

1. Verificar arquivos de ambiente rastreados:

```powershell
git ls-files .env*
```

2. Conferir conteudo atual:

```powershell
Get-Content .env.local
Get-Content .env.example
Get-Content vercel.json
```

3. Definir politica:
   - `.env.local` nao deve ser rastreado;
   - `.env.example` deve conter apenas exemplos seguros;
   - variaveis reais de producao devem estar no provedor de deploy;
   - secrets nunca devem usar prefixo `NEXT_PUBLIC_`.

4. Remover `.env.local` do controle de versao sem apagar o arquivo local:

```powershell
git rm --cached .env.local
```

5. Garantir `.gitignore` com:

```gitignore
.env*.local
.env
```

6. Atualizar `.env.example` para exemplo seguro:

```text
NEXT_PUBLIC_API_URL=http://localhost:8000
```

ou, se o padrao local for staging:

```text
NEXT_PUBLIC_API_URL=https://api-staging.grupoalt.agr.br
```

7. Revisar documentos antigos:
   - `BRIEFING_ALTMAX.md`;
   - `PROMPT-PROXIMA-SESSAO.md`;
   - `CLAUDE_CONTEXT_V2.md`;
   - `ALTMAX-PORTAL-BI-HANDOFF.md`;
   - `NEXT_SESSION_PROMPT.md`;
   - outros arquivos historicos com `ALTMAX`, `SECRET`, `FERNET`, `ANTHROPIC`, `OMIE`, `Bearer`.

8. Classificar cada ocorrencia:
   - URL antiga publica: marcar como historica ou atualizar;
   - nome de variavel sensivel sem valor real: pode ficar como exemplo;
   - valor real de segredo: remover e rotacionar imediatamente;
   - padrao antigo de bearer token/iframe: marcar como legado ou remover.

9. Se houver qualquer segredo real:
   - remover do repo;
   - rotacionar no provedor/backend;
   - avaliar necessidade de reescrever historico Git;
   - registrar incidente interno.

10. Rodar validacoes:

```powershell
npm run build
npm run audit:bundle
git ls-files .env*
```

## Validacao

- `git ls-files .env*` nao lista `.env.local`.
- `.env.example` nao contem segredo nem URL ambigua.
- Documentos antigos estao limpos ou marcados como historicos.
- Qualquer segredo real identificado foi rotacionado.

## Criterio de Pronto

- Ambientes estao claros.
- Nenhum arquivo local sensivel esta rastreado.
- Nao ha segredo real em documentacao versionada.

## Rollback

Se a remocao de `.env.local` atrapalhar dev local, manter arquivo local fora do Git e documentar criacao a partir de `.env.example`.

## Prompt para Execucao

```text
Execute o STEP 03 do plano de acao do grupoalt-web: higiene de ambiente, secrets e documentacao antiga. Verifique arquivos .env rastreados, remova .env.local do Git sem apagar o arquivo local, alinhe .env.example, revise documentos antigos para URLs/segredos/padroes legados e informe se algum segredo real exige rotacao. Rode build e audit:bundle ao final. Nao faca outras alteracoes.
```
