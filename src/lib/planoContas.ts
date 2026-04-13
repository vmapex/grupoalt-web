/**
 * Plano de Contas — Mapeamento de categorias Omie para estrutura DRE
 *
 * Estrutura DRE:
 * RoB (Receita Bruta) → TDCF → RL → CV → MC → CF → EBT1 → SNOP → EBT2 → IRPJ → CSLL → Res.Líq
 */

// ── CATEGORIAS ────────────────────────────────────────────────────────────────
// Mapeamento: código Omie (sem pontos) → { nome, nivel2, nivel1, grupo DRE, operação }

export interface CategoriaInfo {
  codigo: string       // "1.01.01"
  nome: string         // "RECEITA MI"
  nivel2: string       // "( + ) RECEITAS REALIZADAS"
  nivel1: string       // "( + ) RECEITAS BRUTAS"
  grupoDRE: string     // "RoB"
  op: '+' | '-'        // operação no DRE
}

export const CATEGORIAS: Record<string, CategoriaInfo> = {
  // ── RoB — Receitas Brutas ──────────────────────────────────────────────────
  '1.01.01': { codigo: '1.01.01', nome: 'RECEITA MI',                    nivel2: '( + ) RECEITAS REALIZADAS', nivel1: '( + ) RECEITAS BRUTAS',   grupoDRE: 'RoB',  op: '+' },
  '1.01.02': { codigo: '1.01.02', nome: 'RECEITA ME',                    nivel2: '( + ) RECEITAS REALIZADAS', nivel1: '( + ) RECEITAS BRUTAS',   grupoDRE: 'RoB',  op: '+' },

  // ── TDCF — Tributos, Deduções, Custos Financeiros ─────────────────────────
  '2.01.01': { codigo: '2.01.01', nome: 'PIS',                           nivel2: '( - ) TRIBUTOS',            nivel1: '( - ) T.D.C.F.',          grupoDRE: 'TDCF', op: '-' },
  '2.01.02': { codigo: '2.01.02', nome: 'COFINS',                        nivel2: '( - ) TRIBUTOS',            nivel1: '( - ) T.D.C.F.',          grupoDRE: 'TDCF', op: '-' },
  '2.01.03': { codigo: '2.01.03', nome: 'ICMS',                          nivel2: '( - ) TRIBUTOS',            nivel1: '( - ) T.D.C.F.',          grupoDRE: 'TDCF', op: '-' },
  '2.01.04': { codigo: '2.01.04', nome: 'ISS',                           nivel2: '( - ) TRIBUTOS',            nivel1: '( - ) T.D.C.F.',          grupoDRE: 'TDCF', op: '-' },
  '2.02.01': { codigo: '2.02.01', nome: 'JUROS SOB DESCONTO DE DUPLICATAS', nivel2: '( - ) CUSTO FINANCEIRO', nivel1: '( - ) T.D.C.F.',          grupoDRE: 'TDCF', op: '-' },

  // ── CV — Custos Variáveis ──────────────────────────────────────────────────
  '2.03.01': { codigo: '2.03.01', nome: 'AGREGADOS',                     nivel2: '( - ) CPV/CMV',             nivel1: '( - ) CUSTOS VARIÁVEIS',  grupoDRE: 'CV',   op: '-' },
  '2.03.02': { codigo: '2.03.02', nome: 'AGREGADOS - ADIANTAMENTO',      nivel2: '( - ) CPV/CMV',             nivel1: '( - ) CUSTOS VARIÁVEIS',  grupoDRE: 'CV',   op: '-' },
  '2.03.03': { codigo: '2.03.03', nome: 'PEDÁGIOS E OUTRAS TAXAS',       nivel2: '( - ) CPV/CMV',             nivel1: '( - ) CUSTOS VARIÁVEIS',  grupoDRE: 'CV',   op: '-' },
  '2.03.04': { codigo: '2.03.04', nome: 'POSTOS',                        nivel2: '( - ) CPV/CMV',             nivel1: '( - ) CUSTOS VARIÁVEIS',  grupoDRE: 'CV',   op: '-' },
  '2.03.05': { codigo: '2.03.05', nome: 'GERENCIAMENTO DE RISCO',        nivel2: '( - ) CPV/CMV',             nivel1: '( - ) CUSTOS VARIÁVEIS',  grupoDRE: 'CV',   op: '-' },
  '2.03.06': { codigo: '2.03.06', nome: 'SEGURO CARGA',                  nivel2: '( - ) CPV/CMV',             nivel1: '( - ) CUSTOS VARIÁVEIS',  grupoDRE: 'CV',   op: '-' },
  '2.03.07': { codigo: '2.03.07', nome: 'DESCARGA',                      nivel2: '( - ) CPV/CMV',             nivel1: '( - ) CUSTOS VARIÁVEIS',  grupoDRE: 'CV',   op: '-' },
  '2.03.08': { codigo: '2.03.08', nome: 'DIARIAS',                       nivel2: '( - ) CPV/CMV',             nivel1: '( - ) CUSTOS VARIÁVEIS',  grupoDRE: 'CV',   op: '-' },
  '2.04.01': { codigo: '2.04.01', nome: 'BRINDES',                       nivel2: '( - ) VENDAS',              nivel1: '( - ) CUSTOS VARIÁVEIS',  grupoDRE: 'CV',   op: '-' },
  '2.04.02': { codigo: '2.04.02', nome: 'PUBLICIDADE E MARKETING',       nivel2: '( - ) VENDAS',              nivel1: '( - ) CUSTOS VARIÁVEIS',  grupoDRE: 'CV',   op: '-' },
  '2.04.03': { codigo: '2.04.03', nome: 'COMISSÕES',                     nivel2: '( - ) VENDAS',              nivel1: '( - ) CUSTOS VARIÁVEIS',  grupoDRE: 'CV',   op: '-' },

  // ── CF — Custos Fixos ──────────────────────────────────────────────────────
  // Pessoal
  '2.05.01': { codigo: '2.05.01', nome: 'UNIFORMES',                     nivel2: '( - ) PESSOAL',             nivel1: '( - ) CUSTOS FIXOS',      grupoDRE: 'CF',   op: '-' },
  '2.05.02': { codigo: '2.05.02', nome: 'ACORDO TRABALHISTA',            nivel2: '( - ) PESSOAL',             nivel1: '( - ) CUSTOS FIXOS',      grupoDRE: 'CF',   op: '-' },
  '2.05.03': { codigo: '2.05.03', nome: 'DÉCIMO TERCEIRO',               nivel2: '( - ) PESSOAL',             nivel1: '( - ) CUSTOS FIXOS',      grupoDRE: 'CF',   op: '-' },
  '2.05.04': { codigo: '2.05.04', nome: 'ALIMENTAÇÃO',                   nivel2: '( - ) PESSOAL',             nivel1: '( - ) CUSTOS FIXOS',      grupoDRE: 'CF',   op: '-' },
  '2.05.90': { codigo: '2.05.90', nome: 'FGTS',                          nivel2: '( - ) PESSOAL',             nivel1: '( - ) CUSTOS FIXOS',      grupoDRE: 'CF',   op: '-' },
  '2.05.91': { codigo: '2.05.91', nome: 'IRPF',                          nivel2: '( - ) PESSOAL',             nivel1: '( - ) CUSTOS FIXOS',      grupoDRE: 'CF',   op: '-' },
  '2.05.92': { codigo: '2.05.92', nome: 'INSS',                          nivel2: '( - ) PESSOAL',             nivel1: '( - ) CUSTOS FIXOS',      grupoDRE: 'CF',   op: '-' },
  '2.05.93': { codigo: '2.05.93', nome: 'SALARIO',                       nivel2: '( - ) PESSOAL',             nivel1: '( - ) CUSTOS FIXOS',      grupoDRE: 'CF',   op: '-' },
  '2.05.94': { codigo: '2.05.94', nome: 'FOLHA PJ',                      nivel2: '( - ) PESSOAL',             nivel1: '( - ) CUSTOS FIXOS',      grupoDRE: 'CF',   op: '-' },
  '2.05.95': { codigo: '2.05.95', nome: 'RESCISÕES E INDENIZAÇÕES',      nivel2: '( - ) PESSOAL',             nivel1: '( - ) CUSTOS FIXOS',      grupoDRE: 'CF',   op: '-' },
  '2.05.96': { codigo: '2.05.96', nome: 'FESTAS E CONFRATERNIZAÇÕES',    nivel2: '( - ) PESSOAL',             nivel1: '( - ) CUSTOS FIXOS',      grupoDRE: 'CF',   op: '-' },
  '2.05.97': { codigo: '2.05.97', nome: 'PRO-LABORE',                    nivel2: '( - ) PESSOAL',             nivel1: '( - ) CUSTOS FIXOS',      grupoDRE: 'CF',   op: '-' },
  '2.05.98': { codigo: '2.05.98', nome: 'FÉRIAS',                        nivel2: '( - ) PESSOAL',             nivel1: '( - ) CUSTOS FIXOS',      grupoDRE: 'CF',   op: '-' },
  '2.05.99': { codigo: '2.05.99', nome: 'EPI',                           nivel2: '( - ) PESSOAL',             nivel1: '( - ) CUSTOS FIXOS',      grupoDRE: 'CF',   op: '-' },
  // Ocupação
  '2.06.01': { codigo: '2.06.01', nome: 'ALUGUEL',                       nivel2: '( - ) OCUPAÇÃO',            nivel1: '( - ) CUSTOS FIXOS',      grupoDRE: 'CF',   op: '-' },
  '2.06.02': { codigo: '2.06.02', nome: 'IPTU',                          nivel2: '( - ) OCUPAÇÃO',            nivel1: '( - ) CUSTOS FIXOS',      grupoDRE: 'CF',   op: '-' },
  '2.06.03': { codigo: '2.06.03', nome: 'CONDOMINIO',                    nivel2: '( - ) OCUPAÇÃO',            nivel1: '( - ) CUSTOS FIXOS',      grupoDRE: 'CF',   op: '-' },
  // Utilidades
  '2.07.01': { codigo: '2.07.01', nome: 'AGUA E ESGOTO',                 nivel2: '( - ) UTILIDADES',          nivel1: '( - ) CUSTOS FIXOS',      grupoDRE: 'CF',   op: '-' },
  '2.07.02': { codigo: '2.07.02', nome: 'ENERGIA ELETRICA',              nivel2: '( - ) UTILIDADES',          nivel1: '( - ) CUSTOS FIXOS',      grupoDRE: 'CF',   op: '-' },
  // Comunicação
  '2.08.01': { codigo: '2.08.01', nome: 'INTERNET / TELEFONE',           nivel2: '( - ) COMUNICAÇÃO',         nivel1: '( - ) CUSTOS FIXOS',      grupoDRE: 'CF',   op: '-' },
  '2.08.02': { codigo: '2.08.02', nome: 'E-MAIL',                        nivel2: '( - ) COMUNICAÇÃO',         nivel1: '( - ) CUSTOS FIXOS',      grupoDRE: 'CF',   op: '-' },
  // Veículos
  '2.09.01': { codigo: '2.09.01', nome: 'LOCAÇÃO DE VEÍCULOS',           nivel2: '( - ) VEÍCULOS',            nivel1: '( - ) CUSTOS FIXOS',      grupoDRE: 'CF',   op: '-' },
  '2.09.02': { codigo: '2.09.02', nome: 'CONSERTO DE VEÍCULOS',          nivel2: '( - ) VEÍCULOS',            nivel1: '( - ) CUSTOS FIXOS',      grupoDRE: 'CF',   op: '-' },
  '2.09.05': { codigo: '2.09.05', nome: 'COMBUSTIVEL',                   nivel2: '( - ) VEÍCULOS',            nivel1: '( - ) CUSTOS FIXOS',      grupoDRE: 'CF',   op: '-' },
  // Serviços
  '2.10.95': { codigo: '2.10.95', nome: 'SERVIÇOS DE TERCEIROS',         nivel2: '( - ) SERVIÇOS',            nivel1: '( - ) CUSTOS FIXOS',      grupoDRE: 'CF',   op: '-' },
  '2.10.96': { codigo: '2.10.96', nome: 'SERVIÇOS ADVOCATICIOS',         nivel2: '( - ) SERVIÇOS',            nivel1: '( - ) CUSTOS FIXOS',      grupoDRE: 'CF',   op: '-' },
  '2.10.97': { codigo: '2.10.97', nome: 'SERVIÇOS DE CONTABILIDADE',     nivel2: '( - ) SERVIÇOS',            nivel1: '( - ) CUSTOS FIXOS',      grupoDRE: 'CF',   op: '-' },
  '2.10.98': { codigo: '2.10.98', nome: 'CONSULTORIA',                   nivel2: '( - ) SERVIÇOS',            nivel1: '( - ) CUSTOS FIXOS',      grupoDRE: 'CF',   op: '-' },
  '2.10.99': { codigo: '2.10.99', nome: 'AUDITORIA',                     nivel2: '( - ) SERVIÇOS',            nivel1: '( - ) CUSTOS FIXOS',      grupoDRE: 'CF',   op: '-' },
  // Outros CF
  '2.11.94': { codigo: '2.11.94', nome: 'TARIFAS BANCARIAS',             nivel2: '( - ) OUTROS CF',           nivel1: '( - ) CUSTOS FIXOS',      grupoDRE: 'CF',   op: '-' },
  '2.11.95': { codigo: '2.11.95', nome: 'SOFTWARE / TI',                 nivel2: '( - ) OUTROS CF',           nivel1: '( - ) CUSTOS FIXOS',      grupoDRE: 'CF',   op: '-' },
  '2.11.96': { codigo: '2.11.96', nome: 'DESPESAS COM CARTORIO',         nivel2: '( - ) OUTROS CF',           nivel1: '( - ) CUSTOS FIXOS',      grupoDRE: 'CF',   op: '-' },
  '2.11.97': { codigo: '2.11.97', nome: 'CORREIOS',                      nivel2: '( - ) OUTROS CF',           nivel1: '( - ) CUSTOS FIXOS',      grupoDRE: 'CF',   op: '-' },
  '2.11.98': { codigo: '2.11.98', nome: 'BENS DE PEQUENO VALOR',         nivel2: '( - ) OUTROS CF',           nivel1: '( - ) CUSTOS FIXOS',      grupoDRE: 'CF',   op: '-' },
  '2.11.99': { codigo: '2.11.99', nome: 'DESPESAS COM VIAGENS',          nivel2: '( - ) OUTROS CF',           nivel1: '( - ) CUSTOS FIXOS',      grupoDRE: 'CF',   op: '-' },
  // Manutenção
  '2.12.98': { codigo: '2.12.98', nome: 'MANUTENÇÃO TI',                 nivel2: '( - ) MANUTENÇÃO',          nivel1: '( - ) CUSTOS FIXOS',      grupoDRE: 'CF',   op: '-' },
  '2.12.99': { codigo: '2.12.99', nome: 'MANUTENÇÃO PREDIAL',            nivel2: '( - ) MANUTENÇÃO',          nivel1: '( - ) CUSTOS FIXOS',      grupoDRE: 'CF',   op: '-' },
  // Materiais
  '2.13.96': { codigo: '2.13.96', nome: 'MATERIAL EXPEDIENTE',           nivel2: '( - ) MATERIAIS',           nivel1: '( - ) CUSTOS FIXOS',      grupoDRE: 'CF',   op: '-' },
  '2.13.97': { codigo: '2.13.97', nome: 'MATERIAL DE LIMPEZA',           nivel2: '( - ) MATERIAIS',           nivel1: '( - ) CUSTOS FIXOS',      grupoDRE: 'CF',   op: '-' },
  '2.13.98': { codigo: '2.13.98', nome: 'MATERIAL DE ESCRITÓRIO',        nivel2: '( - ) MATERIAIS',           nivel1: '( - ) CUSTOS FIXOS',      grupoDRE: 'CF',   op: '-' },
  '2.13.99': { codigo: '2.13.99', nome: 'MATERIAL DE TI',                nivel2: '( - ) MATERIAIS',           nivel1: '( - ) CUSTOS FIXOS',      grupoDRE: 'CF',   op: '-' },

  // ── NOP — Não Operacional ──────────────────────────────────────────────────
  // Receitas NOP (+)
  '1.02.01': { codigo: '1.02.01', nome: '( + ) MUTUOS',                  nivel2: '( + ) RECEITAS NOP',        nivel1: '( +/- ) SALDO NOP',       grupoDRE: 'RNOP', op: '+' },
  '1.02.02': { codigo: '1.02.02', nome: '( + ) EMPRESTIMO',              nivel2: '( + ) RECEITAS NOP',        nivel1: '( +/- ) SALDO NOP',       grupoDRE: 'RNOP', op: '+' },
  '1.02.96': { codigo: '1.02.96', nome: 'RESGATE APLICAÇÃO AUTOMÁTICA',  nivel2: '( + ) RECEITAS NOP',        nivel1: '( +/- ) SALDO NOP',       grupoDRE: 'RNOP', op: '+' },
  '1.02.97': { codigo: '1.02.97', nome: 'VENDA DE ATIVOS',               nivel2: '( + ) RECEITAS NOP',        nivel1: '( +/- ) SALDO NOP',       grupoDRE: 'RNOP', op: '+' },
  '1.02.98': { codigo: '1.02.98', nome: 'RENDIMENTO APLICAÇÃO',          nivel2: '( + ) RECEITAS NOP',        nivel1: '( +/- ) SALDO NOP',       grupoDRE: 'RNOP', op: '+' },
  '1.02.99': { codigo: '1.02.99', nome: '( + ) ESTORNO',                 nivel2: '( + ) RECEITAS NOP',        nivel1: '( +/- ) SALDO NOP',       grupoDRE: 'RNOP', op: '+' },
  // Despesas NOP (-)
  '2.14.86': { codigo: '2.14.86', nome: 'CSLL - RETIDO',                 nivel2: '( - ) DESPESAS NOP',        nivel1: '( +/- ) SALDO NOP',       grupoDRE: 'DNOP', op: '-' },
  '2.14.87': { codigo: '2.14.87', nome: 'COFINS - RETIDO',               nivel2: '( - ) DESPESAS NOP',        nivel1: '( +/- ) SALDO NOP',       grupoDRE: 'DNOP', op: '-' },
  '2.14.88': { codigo: '2.14.88', nome: 'PIS - RETIDO',                  nivel2: '( - ) DESPESAS NOP',        nivel1: '( +/- ) SALDO NOP',       grupoDRE: 'DNOP', op: '-' },
  '2.14.89': { codigo: '2.14.89', nome: 'INSS - RETIDO',                 nivel2: '( - ) DESPESAS NOP',        nivel1: '( +/- ) SALDO NOP',       grupoDRE: 'DNOP', op: '-' },
  '2.14.90': { codigo: '2.14.90', nome: 'IRRF - RETIDO',                 nivel2: '( - ) DESPESAS NOP',        nivel1: '( +/- ) SALDO NOP',       grupoDRE: 'DNOP', op: '-' },
  '2.14.91': { codigo: '2.14.91', nome: 'APLICAÇÃO AUTOMATICA',          nivel2: '( - ) DESPESAS NOP',        nivel1: '( +/- ) SALDO NOP',       grupoDRE: 'DNOP', op: '-' },
  '2.14.92': { codigo: '2.14.92', nome: 'VARIAVEL',                      nivel2: '( - ) DESPESAS NOP',        nivel1: '( +/- ) SALDO NOP',       grupoDRE: 'DNOP', op: '-' },
  '2.14.93': { codigo: '2.14.93', nome: 'OUTROS IMPOSTOS E TAXAS',       nivel2: '( - ) DESPESAS NOP',        nivel1: '( +/- ) SALDO NOP',       grupoDRE: 'DNOP', op: '-' },
  '2.14.94': { codigo: '2.14.94', nome: 'DIVIDENDOS',                    nivel2: '( - ) DESPESAS NOP',        nivel1: '( +/- ) SALDO NOP',       grupoDRE: 'DNOP', op: '-' },
  '2.14.95': { codigo: '2.14.95', nome: 'INVESTIMENTOS',                 nivel2: '( - ) DESPESAS NOP',        nivel1: '( +/- ) SALDO NOP',       grupoDRE: 'DNOP', op: '-' },
  '2.14.96': { codigo: '2.14.96', nome: '( - ) EMPRESTIMO',              nivel2: '( - ) DESPESAS NOP',        nivel1: '( +/- ) SALDO NOP',       grupoDRE: 'DNOP', op: '-' },
  '2.14.97': { codigo: '2.14.97', nome: 'JUROS DIVERSOS',                nivel2: '( - ) DESPESAS NOP',        nivel1: '( +/- ) SALDO NOP',       grupoDRE: 'DNOP', op: '-' },
  '2.14.98': { codigo: '2.14.98', nome: '( - ) MUTUOS',                  nivel2: '( - ) DESPESAS NOP',        nivel1: '( +/- ) SALDO NOP',       grupoDRE: 'DNOP', op: '-' },
  '2.14.99': { codigo: '2.14.99', nome: '( - ) ESTORNO',                 nivel2: '( - ) DESPESAS NOP',        nivel1: '( +/- ) SALDO NOP',       grupoDRE: 'DNOP', op: '-' },

  // ── IRPJ / CSLL ───────────────────────────────────────────────────────────
  '2.15.99': { codigo: '2.15.99', nome: 'IRPJ',                          nivel2: '( - ) IRPJ',                nivel1: '( - ) IRPJ',              grupoDRE: 'IRPJ', op: '-' },
  '2.16.99': { codigo: '2.16.99', nome: 'CSLL',                          nivel2: '( - ) CSLL',                nivel1: '( - ) CSLL',              grupoDRE: 'CSLL', op: '-' },
}

// ── ESTRUTURA DRE ────────────────────────────────────────────────────────────

export interface LinhaDRE {
  sigla: string
  nome: string
  tipo: 'A' | 'ST' | 'STNOP'  // A=acumulador, ST=subtotal, STNOP=subtotal NOP
  ordem: number
}

export const ESTRUTURA_DRE: LinhaDRE[] = [
  { sigla: 'RoB',      nome: '( + ) RECEITAS BRUTAS',       tipo: 'A',     ordem: 1 },
  { sigla: 'TDCF',     nome: '( - ) T.D.C.F.',              tipo: 'A',     ordem: 2 },
  { sigla: 'RL',        nome: '( = ) RECEITAS LÍQUIDAS',     tipo: 'ST',    ordem: 3 },
  { sigla: 'CV',        nome: '( - ) CUSTOS VARIÁVEIS',      tipo: 'A',     ordem: 4 },
  { sigla: 'MC',        nome: '( = ) MARGEM DE CONTRIBUIÇÃO', tipo: 'ST',   ordem: 5 },
  { sigla: 'CF',        nome: '( - ) CUSTOS FIXOS',          tipo: 'A',     ordem: 6 },
  { sigla: 'EBT1',      nome: '( = ) EBITDA I',              tipo: 'ST',    ordem: 7 },
  { sigla: 'SNOP',      nome: '( +/- ) SALDO NOP',           tipo: 'STNOP', ordem: 8 },
  { sigla: 'EBT2',      nome: '( = ) EBITDA II',             tipo: 'ST',    ordem: 9 },
  { sigla: 'IRPJ',      nome: '( - ) IRPJ',                  tipo: 'A',     ordem: 10 },
  { sigla: 'CSLL',      nome: '( - ) CSLL',                  tipo: 'A',     ordem: 11 },
  { sigla: 'RES_LIQ',   nome: '( = ) RESULTADO LÍQUIDO',     tipo: 'ST',    ordem: 12 },
]

// ── HELPERS ──────────────────────────────────────────────────────────────────

/**
 * Retorna o grupo DRE para uma categoria Omie.
 * Fallback por prefixo se a categoria exata não for encontrada.
 */
export function getGrupoDRE(categoria: string | null): string | null {
  if (!categoria) return null
  const cat = categoria.trim()

  // Busca exata
  if (CATEGORIAS[cat]) return CATEGORIAS[cat].grupoDRE

  // Fallback por prefixo (ex: "2.03" → CV)
  const prefix2 = cat.split('.').slice(0, 2).join('.')
  const prefixMap: Record<string, string> = {
    '1.01': 'RoB',
    '1.02': 'RNOP',
    '2.01': 'TDCF', '2.02': 'TDCF',
    '2.03': 'CV', '2.04': 'CV',
    '2.05': 'CF', '2.06': 'CF', '2.07': 'CF', '2.08': 'CF',
    '2.09': 'CF', '2.10': 'CF', '2.11': 'CF', '2.12': 'CF', '2.13': 'CF',
    '2.14': 'DNOP',
    '2.15': 'IRPJ', '2.16': 'CSLL',
  }
  return prefixMap[prefix2] || null
}

/**
 * Retorna informações da categoria ou null.
 */
export function getCategoriaInfo(categoria: string | null): CategoriaInfo | null {
  if (!categoria) return null
  return CATEGORIAS[categoria.trim()] || null
}

/**
 * Calcula o DRE a partir de lançamentos do extrato.
 * Cada lançamento deve ter: { valor: number, categoria: string, origem: string }
 */
export function calcularDRE(lancamentos: Array<{ valor: number; categoria: string | null; origem?: string }>) {
  const grupos: Record<string, number> = {
    RoB: 0, TDCF: 0, CV: 0, CF: 0, RNOP: 0, DNOP: 0, IRPJ: 0, CSLL: 0,
  }

  lancamentos.forEach(r => {
    const grupo = getGrupoDRE(r.categoria)
    if (grupo && grupos[grupo] !== undefined) {
      grupos[grupo] += Math.abs(r.valor || 0)
    }
  })

  // Subtotais
  const RL = grupos.RoB - grupos.TDCF
  const MC = RL - grupos.CV
  const EBT1 = MC - grupos.CF
  const SNOP = grupos.RNOP - grupos.DNOP
  const EBT2 = EBT1 + SNOP
  const RES_LIQ = EBT2 - grupos.IRPJ - grupos.CSLL

  return {
    RoB: grupos.RoB,
    TDCF: grupos.TDCF,
    RL,
    CV: grupos.CV,
    MC,
    CF: grupos.CF,
    EBT1,
    RNOP: grupos.RNOP,
    DNOP: grupos.DNOP,
    SNOP,
    EBT2,
    IRPJ: grupos.IRPJ,
    CSLL: grupos.CSLL,
    RES_LIQ,
  }
}

/**
 * Converte resposta da API /categorias para formato CategoriaInfo.
 *
 * Prioridade do grupoDRE:
 * 1. `info.grupo_dre` (override manual salvo por empresa) — maior prioridade
 * 2. `getGrupoDRE(codigo)` — inferência por prefixo (fallback)
 *
 * O `op` (+/-) é derivado do grupoDRE:
 * - Grupos "+": RoB, RNOP
 * - Grupos "-": TDCF, CV, CF, DNOP, IRPJ, CSLL
 *
 * O nivel2 (subgrupo) é resolvido assim:
 * 1. Se existe uma categoria-pai (ex: "2.05") na própria apiData,
 *    usa a descricao dela (ex: "( - ) CUSTO FINANCEIRO")
 * 2. Senão, tenta o info.nivel2 do backend (ex: "2.05")
 * 3. Fallback: string vazia
 */
export function buildCategoriasFromAPI(
  apiData: Record<string, { descricao: string; nivel1: string; nivel2: string; grupo_dre?: string | null }>
): Record<string, CategoriaInfo> {
  const result: Record<string, CategoriaInfo> = {}
  const gruposPositivos = new Set(['RoB', 'RNOP'])

  /** Mapa { "2.05": "( - ) CUSTO FINANCEIRO" } construído a partir
   *  das entradas cujo código tem exatamente 2 segmentos (categoria-pai). */
  const parentMap: Record<string, string> = {}
  for (const [codigo, info] of Object.entries(apiData)) {
    const parts = codigo.split('.')
    if (parts.length === 2) {
      parentMap[codigo] = info.descricao
    }
  }

  for (const [codigo, info] of Object.entries(apiData)) {
    const grupoDRE = info.grupo_dre || getGrupoDRE(codigo)
    if (!grupoDRE) continue
    const op: '+' | '-' = gruposPositivos.has(grupoDRE) ? '+' : '-'

    // Resolve nivel2 label: prefer parent category's descricao
    const parts = codigo.split('.')
    const parentCodigo = parts.length >= 2 ? `${parts[0]}.${parts[1]}` : ''
    const nivel2Label = parentMap[parentCodigo] || info.nivel2 || parentCodigo || ''

    result[codigo] = {
      codigo,
      nome: info.descricao,
      nivel2: nivel2Label,
      nivel1: info.nivel1 || '',
      grupoDRE,
      op,
    }
  }
  return result
}

/**
 * Calcula DRE agrupado por mês.
 * Retorna { 'Out/25': { RoB, TDCF, ... }, 'Nov/25': { ... }, ... }
 */
export function calcularDREPorMes(lancamentos: Array<{ valor: number; categoria: string | null; data_lancamento: string; origem?: string }>) {
  const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  const porMes: Record<string, Array<{ valor: number; categoria: string | null; origem?: string }>> = {}

  lancamentos.forEach(r => {
    const dt = r.data_lancamento || ''
    const parts = dt.split('/')
    if (parts.length < 3) return
    const mIdx = parseInt(parts[1]) - 1
    const year = parts[2].slice(2)
    const key = MESES[mIdx] + '/' + year
    if (!porMes[key]) porMes[key] = []
    porMes[key].push(r)
  })

  const resultado: Record<string, ReturnType<typeof calcularDRE>> = {}
  for (const [mes, lancs] of Object.entries(porMes)) {
    resultado[mes] = calcularDRE(lancs)
  }

  return resultado
}
