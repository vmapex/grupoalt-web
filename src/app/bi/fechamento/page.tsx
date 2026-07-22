'use client'
/* BI de Fechamento · Faturamento — tela 1 do shell (estrutura; os dados
   virão de GET /fechamento-bi/resumo na etapa de profundidade). */
import { TelaEmConstrucao } from './_shared'

export default function FaturamentoPage() {
  return (
    <TelaEmConstrucao
      titulo="Faturamento"
      descricao="Visão principal de faturamento do fechamento consolidado — respeita os filtros globais de ano, mês, quinzena/dezena, navio e unidade."
      itens={[
        'KPIs: faturamento, custo, margem, nº de viagens e de fechamentos do recorte',
        'Série mensal de faturamento × custo × margem (12 meses do ano filtrado)',
        'Resultado por unidade (dinâmico — funciona para N unidades)',
        'Lista dos fechamentos do período com drill até o detalhe',
      ]}
    />
  )
}
