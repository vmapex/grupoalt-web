'use client'
/* Composição usada por todas as telas do /bi/fechamento: lê os filtros
   globais do biFechamentoStore, busca o /fechamento-bi/resumo (ano/mês/
   unidade/navio agregados no backend) e aplica o recorte QUINZENA/DEZENA
   localmente sobre a lista de fechamentos (lib/fechamentoBi). Prefixo _
   tira o arquivo do roteamento do App Router. */
import { useMemo } from 'react'
import { useBiFechamentoStore, PERIODO_INTRA_MES_OPTS } from '@/store/biFechamentoStore'
import { useFechamentoBiResumo, type FechamentoBiResumoAPI } from '@/hooks/api/useFechamentoBi'
import {
  agregarFechamentosNoCliente,
  filtrarFechamentosPorRecorte,
} from '@/lib/fechamentoBi'

export function useResumoComRecorte() {
  const ano = useBiFechamentoStore((s) => s.ano)
  const mes = useBiFechamentoStore((s) => s.mes)
  const periodo = useBiFechamentoStore((s) => s.periodo)
  const navioId = useBiFechamentoStore((s) => s.navioId)
  const unidadeId = useBiFechamentoStore((s) => s.unidadeId)

  const { data, loading, error, refetch } = useFechamentoBiResumo({
    ano, mes, unidade_id: unidadeId, navio_id: navioId,
  })

  const recorteAtivo = periodo !== ''
  const labelRecorte = PERIODO_INTRA_MES_OPTS.find((p) => p.value === periodo)?.label ?? ''

  const fechamentos = useMemo(
    () => filtrarFechamentosPorRecorte(data?.fechamentos ?? [], periodo),
    [data, periodo],
  )

  // Com recorte ativo, KPIs/série/por-unidade são reagregados localmente
  // dos fechamentos filtrados; sem recorte, valem os agregados do backend
  // (que incluem cabeças/km, não re-fatiáveis).
  const visao = useMemo(() => {
    if (!data) return null
    if (!recorteAtivo) {
      return {
        kpis: { ...data.kpis, cabecas: data.kpis.cabecas as number | null, km: data.kpis.km as number | null },
        serieMensal: data.serie_mensal,
        porUnidade: data.por_unidade,
      }
    }
    const agg = agregarFechamentosNoCliente(fechamentos, ano)
    return {
      kpis: { ...agg.kpis, cabecas: null as number | null, km: null as number | null },
      serieMensal: agg.serieMensal,
      porUnidade: agg.porUnidade,
    }
  }, [data, recorteAtivo, fechamentos, ano])

  return {
    data: data as FechamentoBiResumoAPI | null,
    loading, error, refetch,
    ano, mes, periodo, unidadeId, navioId,
    recorteAtivo, labelRecorte,
    fechamentos, visao,
  }
}
