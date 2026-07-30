/* ═══════════════════════════════════════════════════════════════
   Metas do BI do Motor — helpers puros (Fase D profundidade).

   O GET /fechamento-bi/metas devolve linhas (unidade_id, mes,
   faturamento, margem). Sem filtro de unidade a tela soma por mês —
   o total do grupo é a soma das unidades. `null` = mês sem meta
   daquela métrica (a linha do gráfico quebra; % não conta o mês).
   ═══════════════════════════════════════════════════════════════ */
import type { MetaFechamentoAPI } from '@/hooks/api/useFechamentoBi'

export interface MetaMes {
  faturamento: number | null
  margem: number | null
}

/** Soma as metas por mês (todas as unidades do payload). Retorna 12
 *  posições (índice 0 = JAN); mês sem nenhuma meta fica null. */
export function somarMetasPorMes(metas: MetaFechamentoAPI[]): MetaMes[] {
  const out: MetaMes[] = Array.from({ length: 12 }, () => ({
    faturamento: null,
    margem: null,
  }))
  for (const m of metas) {
    if (!Number.isInteger(m.mes) || m.mes < 1 || m.mes > 12) continue
    const slot = out[m.mes - 1]
    if (m.faturamento != null) slot.faturamento = (slot.faturamento ?? 0) + m.faturamento
    if (m.margem != null) slot.margem = (slot.margem ?? 0) + m.margem
  }
  return out
}

export interface ResumoMeta {
  /** Soma das metas do ano inteiro (meses com meta). */
  metaAnual: number
  /** Realizado acumulado do ano (todos os meses). */
  realizadoAno: number
  /** realizadoAno ÷ metaAnual — null se metaAnual = 0. */
  pctAnual: number | null
  /** Meta acumulada só até `ultimoMes` (comparação justa no ano corrente). */
  metaAteMes: number
  /** Realizado acumulado nos meses COM meta até `ultimoMes`. */
  realizadoAteMes: number
  /** realizadoAteMes ÷ metaAteMes — null se metaAteMes = 0. */
  pctAteMes: number | null
  mesesComMeta: number
}

/** Resume meta × realizado de UMA métrica. `realizadoPorMes` e
 *  `metaPorMes` têm 12 posições; `ultimoMes` (1-12) é o mês corrente
 *  no ano corrente, 12 em ano encerrado. Retorna null quando não há
 *  nenhuma meta — chamador esconde o bloco. */
export function resumoMeta(
  realizadoPorMes: number[],
  metaPorMes: (number | null)[],
  ultimoMes: number,
): ResumoMeta | null {
  let metaAnual = 0
  let metaAteMes = 0
  let realizadoAteMes = 0
  let mesesComMeta = 0
  for (let i = 0; i < 12; i++) {
    const meta = metaPorMes[i]
    if (meta == null) continue
    mesesComMeta++
    metaAnual += meta
    if (i + 1 <= ultimoMes) {
      metaAteMes += meta
      realizadoAteMes += realizadoPorMes[i] ?? 0
    }
  }
  if (mesesComMeta === 0) return null
  const realizadoAno = realizadoPorMes.reduce((acc, v) => acc + (v ?? 0), 0)
  return {
    metaAnual,
    realizadoAno,
    pctAnual: metaAnual > 0 ? (realizadoAno / metaAnual) * 100 : null,
    metaAteMes,
    realizadoAteMes,
    pctAteMes: metaAteMes > 0 ? (realizadoAteMes / metaAteMes) * 100 : null,
    mesesComMeta,
  }
}
