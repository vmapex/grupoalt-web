# STEP 02 - Ambiente de Staging e Regra de Deploy Seguro

## Objetivo

Garantir que as proximas mudancas possam ser testadas fora da producao, com dados e variaveis controladas.

## Por que este step vem antes das correcoes

Atualizar Next, mexer em auth, RBAC e empresa ativa pode afetar login e dados financeiros. Sem staging, qualquer erro iria direto para usuarios reais ou dependeria apenas de teste local.

## Escopo

Configurar ou validar ambiente de preview/staging. Pode envolver Vercel, Railway, GitHub e backend, mas nao deve alterar codigo da aplicacao se a infraestrutura ja existir.

## Acoes Detalhadas

1. Confirmar hospedagem do frontend:
   - producao esperada: `https://portal.grupoalt.agr.br`;
   - preview por PR, se configurado;
   - ambiente de staging, se existir.

2. Confirmar API por ambiente:

```text
Local:
  NEXT_PUBLIC_API_URL=http://localhost:8000 ou API staging

Preview/Staging:
  NEXT_PUBLIC_API_URL=https://api-staging.grupoalt.agr.br

Producao:
  NEXT_PUBLIC_API_URL=https://api.grupoalt.agr.br
```

3. Se nao houver API staging:
   - registrar risco;
   - criar usuario e empresas de teste na API atual;
   - evitar testes destrutivos em dados reais;
   - planejar API staging como tarefa separada.

4. Confirmar variaveis no provedor de deploy:
   - `NEXT_PUBLIC_API_URL`;
   - variaveis publicas adicionais, se existirem;
   - ausencia de secrets no frontend.

5. Definir regra operacional:
   - nenhum PR P0/P1 vai direto para producao sem preview;
   - mudancas de dependencia exigem smoke test de login e navegacao;
   - mudancas de auth/RBAC exigem teste com usuario admin e usuario comum.

6. Definir usuarios de teste:
   - admin global;
   - usuario comum com acesso a uma empresa;
   - usuario comum sem acesso a admin;
   - usuario com acesso a documentos mas sem permissao de editar/aprovar;
   - usuario com acesso a empresa A mas nao empresa B.

7. Criar checklist de homologacao por PR:
   - login;
   - portal grupo;
   - BI financeiro;
   - extrato;
   - CP/CR;
   - documentos;
   - admin;
   - logout.

8. Documentar matriz de ambientes em docs internas do repo ou em ferramenta operacional do time.

## Validacao

- Preview/staging existe ou ha plano formal para cria-lo.
- Variaveis por ambiente estao claras.
- Usuarios de teste estao disponiveis ou foram solicitados.
- Checklist de homologacao esta escrita.

## Criterio de Pronto

- Toda mudanca futura pode ser testada em ambiente nao produtivo.
- O time sabe qual API cada ambiente usa.
- Existe uma regra clara de deploy seguro.

## Risco se Ignorar

Correcoes de seguranca podem quebrar login, permissoes ou leitura de dados diretamente em producao.

## Prompt para Execucao

```text
Execute o STEP 02 do plano de acao do grupoalt-web: validar ou estruturar ambiente de staging/preview e regra de deploy seguro. Nao altere codigo da aplicacao sem necessidade. Levante variaveis por ambiente, usuarios de teste necessarios, criterio de validacao de PR e riscos de deploy. No final, entregue a matriz Local/Preview/Producao e uma checklist de homologacao.
```
