/* ═══════════════════════════════════════════════════════════════
   BI de Fechamento — helpers puros do recorte intra-mês.

   O backend (/fechamento-bi/resumo) agrega por ano/mês/unidade/navio.
   QUINZENA/DEZENA é recorte LOCAL: cada fechamento retornado traz
   dt_ini/dt_fim + faturamento/custo/margem/viagens próprios, então o
   front filtra os fechamentos cuja janela está CONTIDA no recorte e
   reagrega KPIs/série/por-unidade a partir deles.

   Limitações conhecidas (por design):
   - cabeças/km e a curva ABC vêm agregados do backend e NÃO são
     re-fatiáveis por recorte — as telas escondem/anotam isso.
   - fechamento por NAVIO tem janela arbitrária; só entra no recorte
     se a janela couber inteira nele (ex.: navio de 3 dias dentro da
     1ª quinzena conta na Q1).
   ═══════════════════════════════════════════════════════════════ */
import type {
  FechamentoBiFechamentoAPI,
  FechamentoBiSerieMesAPI,
  FechamentoBiUnidadeAPI,
} from '@/hooks/api/useFechamentoBi'
import type { PeriodoIntraMes } from '@/store/biFechamentoStore'

/** Janela [diaIni, diaFim] de cada recorte. `null` em diaFim = fim do mês. */
const JANELAS: Record<Exclude<PeriodoIntraMes, ''>, [number, number | null]> = {
  Q1: [1, 15],
  Q2: [16, null],
  D1: [1, 10],
  D2: [11, 20],
  D3: [21, null],
}

function diaDoMes(iso: string | null | undefined): number | null {
  if (!iso || iso.length < 10) return null
  const d = Number(iso.slice(8, 10))
  return Number.isFinite(d) && d >= 1 && d <= 31 ? d : null
}

function mesmoMes(a: string, b: string): boolean {
  return a.slice(0, 7) === b.slice(0, 7)
}

/**
 * True se a janela [dt_ini, dt_fim] do fechamento está CONTIDA no recorte
 * do próprio mês. Janela cruzando mês (raro) nunca casa recorte intra-mês.
 */
export function fechamentoNoRecorte(
  f: Pick<FechamentoBiFechamentoAPI, 'dt_ini' | 'dt_fim'>,
  periodo: PeriodoIntraMes,
): boolean {
  if (!periodo) return true
  const ini = f.dt_ini
  const fim = f.dt_fim || f.dt_ini
  const dIni = diaDoMes(ini)
  const dFim = diaDoMes(fim)
  if (!ini || !fim || dIni == null || dFim == null || !mesmoMes(ini, fim)) return false
  const [lo, hi] = JANELAS[periodo]
  return dIni >= lo && (hi == null || dFim <= hi)
}

export function filtrarFechamentosPorRecorte(
  fechamentos: FechamentoBiFechamentoAPI[],
  periodo: PeriodoIntraMes,
): FechamentoBiFechamentoAPI[] {
  if (!periodo) return fechamentos
  return fechamentos.filter((f) => fechamentoNoRecorte(f, periodo))
}

export interface AgregadoCliente {
  kpis: {
    faturamento: number
    custo: number
    margem: number
    margem_pct: number
    viagens: number
    fechamentos: number
  }
  serieMensal: FechamentoBiSerieMesAPI[]
  porUnidade: FechamentoBiUnidadeAPI[]
}

const r2 = (v: number) => Math.round(v * 100) / 100

/**
 * Reagrega a lista de fechamentos (já filtrada pelo recorte) no mesmo
 * shape dos agregados do backend — usada só quando há recorte ativo.
 */
export function agregarFechamentosNoCliente(
  fechamentos: FechamentoBiFechamentoAPI[],
  ano: number,
): AgregadoCliente {
  let fat = 0
  let custo = 0
  let viagens = 0
  const serie: FechamentoBiSerieMesAPI[] = Array.from({ length: 12 }, (_, i) => ({
    mes: i + 1, faturamento: 0, custo: 0, margem: 0, viagens: 0, fechamentos: 0,
  }))
  const porUnidade = new Map<number, FechamentoBiUnidadeAPI>()

  for (const f of fechamentos) {
    fat += f.faturamento
    custo += f.custo
    viagens += f.viagens

    if (f.ano === ano && f.mes >= 1 && f.mes <= 12) {
      const s = serie[f.mes - 1]
      s.faturamento += f.faturamento
      s.custo += f.custo
      s.viagens += f.viagens
      s.fechamentos += 1
    }

    let u = porUnidade.get(f.unidade_id)
    if (!u) {
      u = {
        unidade_id: f.unidade_id, unidade_nome: f.unidade_nome,
        faturamento: 0, custo: 0, margem: 0, viagens: 0, fechamentos: 0,
      }
      porUnidade.set(f.unidade_id, u)
    }
    u.faturamento += f.faturamento
    u.custo += f.custo
    u.viagens += f.viagens
    u.fechamentos += 1
  }

  for (const s of serie) {
    s.faturamento = r2(s.faturamento)
    s.custo = r2(s.custo)
    s.margem = r2(s.faturamento - s.custo)
  }
  const unidades = [...porUnidade.values()]
    .map((u) => ({ ...u, faturamento: r2(u.faturamento), custo: r2(u.custo), margem: r2(u.faturamento - u.custo) }))
    .sort((a, b) => b.faturamento - a.faturamento)

  const margem = fat - custo
  return {
    kpis: {
      faturamento: r2(fat),
      custo: r2(custo),
      margem: r2(margem),
      margem_pct: fat !== 0 ? r2((margem / fat) * 100) : 0,
      viagens,
      fechamentos: fechamentos.length,
    },
    serieMensal: serie,
    porUnidade: unidades,
  }
}
