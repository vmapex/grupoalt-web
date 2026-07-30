import { describe, expect, it } from 'vitest'
import { somarMetasPorMes, resumoMeta } from './metasBi'
import type { MetaFechamentoAPI } from '@/hooks/api/useFechamentoBi'

/**
 * Helpers de meta × realizado da Visão Executiva. Travam as decisões:
 * total do grupo = SOMA das unidades por mês; mês sem meta = null
 * (linha do gráfico quebra, % não conta o mês); % até-o-mês compara
 * realizado só dos meses COM meta (comparação justa no ano corrente).
 */

const linha = (
  unidade_id: number,
  mes: number,
  faturamento: number | null,
  margem: number | null = null,
): MetaFechamentoAPI => ({ unidade_id, mes, faturamento, margem })

describe('somarMetasPorMes', () => {
  it('soma unidades no mesmo mês e mantém null onde não há meta', () => {
    const out = somarMetasPorMes([
      linha(1, 1, 100, 10),
      linha(2, 1, 200, null),
      linha(1, 3, 50, 5),
    ])
    expect(out[0]).toEqual({ faturamento: 300, margem: 10 })
    expect(out[1]).toEqual({ faturamento: null, margem: null })
    expect(out[2]).toEqual({ faturamento: 50, margem: 5 })
    expect(out).toHaveLength(12)
  })

  it('métrica só de margem não inventa faturamento 0', () => {
    const out = somarMetasPorMes([linha(1, 6, null, 80)])
    expect(out[5]).toEqual({ faturamento: null, margem: 80 })
  })

  it('ignora mês fora de 1-12 e lista vazia vira 12× null', () => {
    const out = somarMetasPorMes([linha(1, 0, 10), linha(1, 13, 10)])
    expect(out.every((m) => m.faturamento === null && m.margem === null)).toBe(true)
  })
})

describe('resumoMeta', () => {
  const realizado = [100, 100, 100, 0, 0, 0, 0, 0, 0, 0, 0, 0]

  it('null quando não há nenhuma meta (bloco some da tela)', () => {
    expect(resumoMeta(realizado, Array(12).fill(null), 12)).toBeNull()
  })

  it('ano encerrado: anual e até-o-mês coincidem', () => {
    const metas = [200, 200, null, null, null, null, null, null, null, null, null, null]
    const r = resumoMeta(realizado, metas, 12)!
    expect(r.metaAnual).toBe(400)
    expect(r.realizadoAno).toBe(300)
    expect(r.pctAnual).toBe(75)
    // realizado até-o-mês só conta meses COM meta (JAN+FEV = 200)
    expect(r.metaAteMes).toBe(400)
    expect(r.realizadoAteMes).toBe(200)
    expect(r.pctAteMes).toBe(50)
    expect(r.mesesComMeta).toBe(2)
  })

  it('ano corrente: até-o-mês corta no ultimoMes, anual segue cheio', () => {
    const metas = Array(12).fill(100) as number[]
    const r = resumoMeta(realizado, metas, 2)!
    expect(r.metaAnual).toBe(1200)
    expect(r.metaAteMes).toBe(200)
    expect(r.realizadoAteMes).toBe(200)
    expect(r.pctAteMes).toBe(100)
    expect(r.pctAnual).toBe(25)
  })

  it('meta zerada não divide por zero', () => {
    const metas = [0, null, null, null, null, null, null, null, null, null, null, null]
    const r = resumoMeta(realizado, metas, 12)!
    expect(r.pctAnual).toBeNull()
    expect(r.pctAteMes).toBeNull()
  })
})
