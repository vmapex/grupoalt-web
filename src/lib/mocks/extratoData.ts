const CAT_DESC: Record<string, string> = {
  '1.01.01': 'Receita MI', '1.01.02': 'Receita ME',
  '1.02.01': 'Mútuos', '1.02.96': 'Resgate Aplicação', '1.02.97': 'Venda de Ativos',
  '1.02.98': 'Rendimento Aplicação', '1.02.99': 'Estorno',
  '2.01.01': 'PIS', '2.01.02': 'COFINS', '2.01.03': 'ICMS', '2.01.04': 'ISS',
  '2.02.01': 'Juros s/ Desc. Duplicatas',
  '2.03.01': 'Agregados', '2.03.02': 'Agregados - Adiantamento', '2.03.03': 'Pedágios e Taxas',
  '2.03.04': 'Postos (Diesel)', '2.03.05': 'Gerenc. de Risco', '2.03.06': 'Seguro Carga',
  '2.03.07': 'Descarga', '2.03.08': 'Diárias',
  '2.04.01': 'Brindes', '2.04.02': 'Publicidade e Marketing', '2.04.03': 'Comissões',
  '2.05.01': 'Uniformes', '2.05.02': 'Acordo Trabalhista', '2.05.03': '13º Salário',
  '2.05.04': 'Alimentação', '2.05.90': 'FGTS', '2.05.91': 'IRPF', '2.05.92': 'INSS',
  '2.05.93': 'Salário', '2.05.94': 'Folha PJ', '2.05.95': 'Rescisões',
  '2.05.96': 'Confraternizações', '2.05.97': 'Pró-Labore', '2.05.98': 'Férias', '2.05.99': 'EPI',
  '2.06.01': 'Aluguel', '2.06.02': 'IPTU', '2.06.03': 'Condomínio',
  '2.07.01': 'Água e Esgoto', '2.07.02': 'Energia Elétrica',
  '2.08.01': 'Internet / Telefone', '2.08.02': 'E-mail',
  '2.09.01': 'Locação de Veículos', '2.09.02': 'Conserto de Veículos', '2.09.05': 'Combustível',
  '2.10.95': 'Serv. de Terceiros', '2.10.96': 'Serv. Advocatícios', '2.10.97': 'Contabilidade',
  '2.10.98': 'Consultoria', '2.10.99': 'Auditoria',
  '2.11.94': 'Tarifas Bancárias', '2.11.95': 'Software / TI', '2.11.96': 'Cartório',
  '2.11.97': 'Correios', '2.11.98': 'Bens Pequeno Valor', '2.11.99': 'Desp. com Viagens',
  '2.12.98': 'Manutenção TI', '2.12.99': 'Manutenção Predial',
  '2.13.96': 'Mat. Expediente', '2.13.97': 'Mat. Limpeza', '2.13.98': 'Mat. Escritório',
  '2.13.99': 'Mat. TI',
  '2.14.91': 'Aplicação Automática', '2.14.94': 'Dividendos', '2.14.95': 'Investimentos',
  '2.14.96': 'Empréstimo', '2.14.97': 'Juros Diversos', '2.14.98': 'Mútuos', '2.14.99': 'Estorno',
  '2.15.99': 'IRPJ', '2.16.99': 'CSLL',
}

export function getCatDesc(code: string): string {
  return CAT_DESC[code] || code
}

export interface ExtratoLancamento {
  data: string
  descricao: string
  favorecido: string
  valor: number
  catCod: string
  conciliado: boolean
  banco: string
}

const descricoes = [
  'PIX RECEBIDO - FRETE BEAUVALLET', 'PAGTO DIESEL POSTO IPIRANGA',
  'PIX RECEBIDO - JHS ALIMENTOS', 'FOLHA PAGTO MOTORISTAS NOV/25',
  'PEDÁGIO AUTOPISTA LITORAL', 'PIX RECEBIDO - CARGILL SA',
  'MANUTENÇÃO VHN-4J22', 'SEGURO CARGA APÓLICE',
  'PIX ENVIADO - ADTO MOTORISTA', 'PAGTO ALUGUEL GALPÃO INHUMAS',
  'RECEBIMENTO CT-E 45891', 'TARIFA BANCÁRIA',
]
const valores = [12500, -8340, 18900, -45200, -1280, 32100, -4560, -2100, -3500, -6800, 15600, -89]
const catCods = [
  '1.01.01', '2.03.04', '1.01.01', '2.05.93', '2.03.03', '1.01.01',
  '2.09.02', '2.03.06', '2.03.02', '2.06.01', '1.01.01', '2.11.94',
]
const bancos = ['Itaú', 'Banco do Brasil', 'Itaú', 'Banco do Brasil', 'Bradesco']

export const mockExtrato: ExtratoLancamento[] = Array.from({ length: 20 }, (_, i) => ({
  data: `${String(25 - i).padStart(2, '0')}/11/2025`,
  descricao: descricoes[i % 12],
  favorecido: descricoes[i % 12],
  valor: valores[i % 12],
  catCod: catCods[i % 12],
  conciliado: i % 3 !== 0,
  banco: bancos[i % 5],
}))

export interface ContaSaldo {
  nome: string
  saldo: number
  cor: string
}

export const mockContas: ContaSaldo[] = [
  { nome: 'Itaú AG 0134 CC 4521-8', saldo: 45230.50, cor: '#38BDF8' },
  { nome: 'Banco do Brasil CC 8834-2', saldo: 18940.20, cor: '#34D399' },
  { nome: 'Bradesco CC 1247-5', saldo: 7812.80, cor: '#FBBF24' },
  { nome: 'Caixa CC 0091-3', saldo: 2340.10, cor: '#C084FC' },
]
