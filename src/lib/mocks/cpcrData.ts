export interface ContaPagarReceber {
  fav: string
  valor: number
  vcto: string
  status: 'A VENCER' | 'ATRASADO' | 'PAGO' | 'A RECEBER' | 'RECEBIDO'
  cat: string
  banco: string
}

export const mockCPFull: ContaPagarReceber[] = [
  { fav: 'POSTO IPIRANGA LTDA', valor: 42800, vcto: '05/12/2025', status: 'A VENCER', cat: '2.03.04', banco: 'Itaú' },
  { fav: 'FOLHA MOTORISTAS NOV/25', valor: 98500, vcto: '05/12/2025', status: 'A VENCER', cat: '2.05.93', banco: 'Itaú' },
  { fav: 'AUTOPISTA LITORAL SUL', valor: 8900, vcto: '10/12/2025', status: 'A VENCER', cat: '2.03.03', banco: 'BB' },
  { fav: 'SEGURO CARGA MAPFRE', valor: 12400, vcto: '01/11/2025', status: 'ATRASADO', cat: '2.03.06', banco: 'Itaú' },
  { fav: 'MANUTENÇÃO VEÍCULOS', valor: 15200, vcto: '20/12/2025', status: 'A VENCER', cat: '2.09.02', banco: 'BB' },
  { fav: 'GALPÃO INHUMAS ALUGUEL', valor: 6800, vcto: '15/12/2025', status: 'A VENCER', cat: '2.06.01', banco: 'Bradesco' },
  { fav: 'CONSULTORIA TRIAD', valor: 8500, vcto: '30/11/2025', status: 'PAGO', cat: '2.10.98', banco: 'Itaú' },
  { fav: 'POSTOS (ARAGUAÍNA)', valor: 31200, vcto: '10/01/2026', status: 'A VENCER', cat: '2.03.04', banco: 'BB' },
  { fav: 'INSS COMPETÊNCIA NOV', valor: 14800, vcto: '20/12/2025', status: 'A VENCER', cat: '2.05.92', banco: 'Itaú' },
  { fav: 'FGTS NOV/25', valor: 9600, vcto: '07/12/2025', status: 'A VENCER', cat: '2.05.90', banco: 'Itaú' },
  { fav: 'ENERGIA ELÉTRICA', valor: 3200, vcto: '25/11/2025', status: 'ATRASADO', cat: '2.07.02', banco: 'Bradesco' },
  { fav: 'INTERNET / TELEFONE', valor: 1800, vcto: '28/12/2025', status: 'A VENCER', cat: '2.08.01', banco: 'Bradesco' },
  { fav: 'SEGURO FROTA DEZ', valor: 22100, vcto: '15/01/2026', status: 'A VENCER', cat: '2.03.06', banco: 'Itaú' },
  { fav: 'PRÓ-LABORE SÓCIOS', valor: 18000, vcto: '05/01/2026', status: 'A VENCER', cat: '2.05.97', banco: 'BB' },
]

export const mockCRFull: ContaPagarReceber[] = [
  { fav: 'BEAUVALLET IND', valor: 85200, vcto: '10/12/2025', status: 'A RECEBER', cat: '1.01.01', banco: 'Itaú' },
  { fav: 'JHS ALIMENTOS', valor: 42300, vcto: '15/12/2025', status: 'A RECEBER', cat: '1.01.01', banco: 'BB' },
  { fav: 'CARGILL SA', valor: 128900, vcto: '20/12/2025', status: 'A RECEBER', cat: '1.01.01', banco: 'Itaú' },
  { fav: 'FRIBAL FRIGORÍFICO', valor: 34500, vcto: '05/12/2025', status: 'A RECEBER', cat: '1.01.01', banco: 'BB' },
  { fav: 'BRF SA', valor: 67800, vcto: '28/12/2025', status: 'A RECEBER', cat: '1.01.01', banco: 'Itaú' },
  { fav: 'MARFRIG GLOBAL', valor: 56400, vcto: '10/01/2026', status: 'A RECEBER', cat: '1.01.01', banco: 'BB' },
  { fav: 'MINERVA FOODS', valor: 41200, vcto: '15/01/2026', status: 'A RECEBER', cat: '1.01.01', banco: 'Itaú' },
  { fav: 'RENDIMENTO APLIC.', valor: 3800, vcto: '02/12/2025', status: 'A RECEBER', cat: '1.02.98', banco: 'Itaú' },
]

export const cpTemporalData = [
  { mes: 'Nov/25', cp: 24100, cr: 0 },
  { mes: 'Dez/25', cp: 222200, cr: 358700 },
  { mes: 'Jan/26', cp: 89800, cr: 97600 },
]
