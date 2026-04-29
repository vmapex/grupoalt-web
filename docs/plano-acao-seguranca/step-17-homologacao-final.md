# STEP 17 - Homologacao Final e Checklist de Producao

## Objetivo

Validar o conjunto antes de liberar o portal como hub central do grupo.

## Por que este step e o ultimo

Ele consolida seguranca, bugs, UX, CI, ambiente, backend e frontend.

## Checklist Tecnico

1. Dependencias:
   - `npm audit --omit=dev --audit-level=high` passa;
   - Next esta em versao segura;
   - Axios esta em versao segura;
   - vulnerabilidades restantes tem excecao formal.

2. Build e qualidade:

```powershell
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npm run audit:bundle
```

3. Auth:
   - login funciona;
   - refresh funciona;
   - logout invalida sessao;
   - falha de refresh nao trava UI;
   - usuario sem sessao vai para login.

4. RBAC:
   - usuario comum nao acessa admin;
   - usuario de empresa A nao acessa empresa B;
   - usuario sem permissao nao exporta PDF;
   - usuario sem permissao nao aprova documento;
   - chamada direta na API retorna `403`.

5. Empresa ativa:
   - portal e BI mostram mesma empresa;
   - persistencia nao vaza entre usuarios;
   - troca de empresa atualiza dados;
   - activeId invalido e descartado.

6. BI:
   - dashboard executivo carrega;
   - Caixa/DRE confere com exemplos reais;
   - Extrato carrega;
   - CP/CR carrega sem truncamento indevido;
   - Fluxo carrega;
   - Conciliacao carrega.

7. Documentos:
   - listar;
   - criar;
   - submeter;
   - aprovar;
   - rejeitar;
   - publicar;
   - arquivar;
   - respeitar permissoes.

8. Admin:
   - criar usuario;
   - vincular empresa;
   - alterar role;
   - alterar permissoes;
   - salvar/testar credenciais Omie;
   - gerenciar unidades.

9. CSP:
   - console sem violacoes inesperadas;
   - headers presentes em producao;
   - nenhuma feature critica bloqueada.

10. Orbit:
   - responde dentro do escopo;
   - respeita limite;
   - nao retorna dados sem permissao;
   - indisponibilidade nao quebra portal.

## Checklist Operacional

1. Existe rollback definido.
2. Deploy feito primeiro em preview/staging.
3. Usuarios de teste validaram.
4. Janela de deploy combinada.
5. Monitoramento apos deploy por pelo menos 1 hora.
6. Logs de erro acompanhados.
7. Canal de suporte definido para usuarios.
8. Responsavel de plantao definido.

## Decisao Go/No-Go

Liberar somente se:

- nao ha high/critical audit sem excecao formal;
- RBAC backend foi validado;
- guardas frontend estao implementados;
- empresa ativa esta consistente;
- testes cobrem regras criticas;
- CI bloqueia regressao;
- homologacao manual passou.

## Riscos Residuais

Registrar qualquer risco aceito com:

```text
Risco:
Impacto:
Probabilidade:
Dono:
Prazo para correcao:
Motivo da aceitacao temporaria:
```

## Prompt para Execucao

```text
Execute o STEP 17 do plano de acao do grupoalt-web: homologacao final e checklist de producao. Rode todas as validacoes tecnicas, teste fluxos com usuario admin e usuario comum, valide RBAC, empresa ativa, BI, documentos, admin, CSP e Orbit. No final, entregue decisao Go/No-Go com riscos residuais e plano de rollback.
```
