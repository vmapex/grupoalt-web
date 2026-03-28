export const CAIXA_DATA = {
  quarterly: {
    labels: ['Q4/25', 'Q1/26'],
    RB: [45700, 202042],
    TD: [9263, 21906],
    CV: [45653, 108698],
    CF: [53413, 37067],
    RN: [73600, 19100],
    DN: [6244, 15309],
  },
  monthly: {
    labels: ['Out/25', 'Nov/25', 'Dez/25', 'Jan/26', 'Fev/26', 'Mar/26'],
    RB: [0, 0, 45700, 78108, 86944, 36990],
    TD: [0, 0, 9263, 13287, 8619, 0],
    CV: [0, 10675, 34978, 48591, 23117, 36990],
    CF: [205, 22213, 30995, 18353, 10573, 8141],
    RN: [1100, 34000, 38500, 15000, 4100, 0],
    DN: [877, 0, 5367, 15035, 274, 0],
  },
}

export const WEEKLY: Record<string, typeof CAIXA_DATA.monthly> = {
  'Out/25': {
    labels: ['S1·Out', 'S2·Out', 'S3·Out', 'S4·Out'],
    RB: [0, 0, 0, 0], TD: [0, 0, 0, 0], CV: [0, 0, 0, 0],
    CF: [205, 0, 0, 0], RN: [1100, 0, 0, 0], DN: [877, 0, 0, 0],
  },
  'Nov/25': {
    labels: ['S1·Nov', 'S2·Nov', 'S3·Nov', 'S4·Nov'],
    RB: [0, 0, 0, 0], TD: [0, 0, 0, 0], CV: [0, 4500, 3200, 2975],
    CF: [5200, 6400, 5313, 5300], RN: [0, 34000, 0, 0], DN: [0, 0, 0, 0],
  },
  'Dez/25': {
    labels: ['S1·Dez', 'S2·Dez', 'S3·Dez', 'S4·Dez'],
    RB: [0, 8200, 16300, 21200], TD: [0, 1800, 3500, 3963],
    CV: [7800, 9200, 10200, 7778], CF: [7500, 8200, 7800, 7495],
    RN: [0, 0, 38500, 0], DN: [0, 2367, 3000, 0],
  },
  'Jan/26': {
    labels: ['S1·Jan', 'S2·Jan', 'S3·Jan', 'S4·Jan'],
    RB: [12400, 18900, 22500, 24308], TD: [2100, 3200, 4000, 3987],
    CV: [9800, 13200, 14500, 11091], CF: [4200, 5100, 4800, 4253],
    RN: [0, 0, 15000, 0], DN: [15035, 0, 0, 0],
  },
  'Fev/26': {
    labels: ['S1·Fev', 'S2·Fev', 'S3·Fev', 'S4·Fev'],
    RB: [14200, 21500, 28000, 23244], TD: [1400, 2100, 2800, 2319],
    CV: [3800, 5900, 7200, 6217], CF: [2700, 3100, 2600, 2173],
    RN: [4100, 0, 0, 0], DN: [274, 0, 0, 0],
  },
  'Mar/26': {
    labels: ['S1·Mar', 'S2·Mar', 'S3·Mar', 'S4·Mar'],
    RB: [8200, 12300, 9800, 6690], TD: [0, 0, 0, 0],
    CV: [8200, 12300, 9800, 6690], CF: [2100, 2300, 2000, 1741],
    RN: [0, 0, 0, 0], DN: [0, 0, 0, 0],
  },
}

export interface CaixaLevelData {
  labels: string[]
  RB: number[]
  TD: number[]
  CV: number[]
  CF: number[]
  RN: number[]
  DN: number[]
}

export const DRE_ROWS = [
  { name: 'RoB', val: 210752, pct: 100.0 },
  { name: 'T.D.C.F.', val: 31169, pct: 14.79 },
  { name: 'Rec. Líq.', val: 179583, pct: 85.2 },
  { name: 'Cust. Var.', val: 154351, pct: 73.2 },
  { name: 'Marg. Cont.', val: 25232, pct: 12.0 },
  { name: 'Cust. Fixo', val: 90480, pct: 42.9 },
  { name: 'EBT1', val: -65248, pct: -31.0 },
  { name: 'RNOP', val: 92702, pct: 44.0 },
  { name: 'DNOP', val: 21553, pct: 10.2 },
  { name: 'EBT2', val: 5901, pct: 2.8 },
]

/** DRE row color mapping by name */
export function getDREColor(name: string, tokens: { blue: string; amber: string; red: string; orange: string; green: string; purple: string; muted: string }): string {
  const map: Record<string, string> = {
    'RoB': tokens.blue,
    'T.D.C.F.': tokens.amber,
    'Rec. Líq.': tokens.blue,
    'Cust. Var.': tokens.red,
    'Marg. Cont.': tokens.orange,
    'Cust. Fixo': tokens.orange,
    'EBT1': tokens.red,
    'RNOP': tokens.green,
    'DNOP': tokens.purple,
    'EBT2': tokens.green,
  }
  return map[name] || tokens.muted
}

export interface DetailDef {
  title: string
  key: string | null
  color: string
  kpis: Array<{ l: string; v: string; c: string }>
  breakdown: Array<{ item: string; valor: number; pct: number }>
  breakdownDN?: Array<{ item: string; valor: number; pct: number }>
  clientes: Array<{ nome: string; valor: number }>
}
