'use client'
/* BI de Fechamento · Faturamento 5 anos — comparativo plurianual
   (estrutura; anos disponíveis vêm do /fechamento-bi/filtros). */
import { TelaEmConstrucao } from '../_shared'

export default function Faturamento5AnosPage() {
  return (
    <TelaEmConstrucao
      titulo="Faturamento 5 anos"
      descricao="Comparativo plurianual de faturamento — os anos são descobertos do histórico importado no Motor (2024/25 em diante), sem lista fixa."
      itens={[
        'Faturamento ano a ano, empilhado por unidade',
        'Acumulado YoY mês a mês (ano corrente vs anteriores)',
        'Variação % ano contra ano',
      ]}
    />
  )
}
