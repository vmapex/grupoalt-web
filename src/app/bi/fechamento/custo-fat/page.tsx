'use client'
/* BI de Fechamento · Custo × Faturamento (estrutura). */
import { TelaEmConstrucao } from '../_shared'

export default function CustoFatPage() {
  return (
    <TelaEmConstrucao
      titulo="Custo × Faturamento"
      descricao="Cruzamento de custo e faturamento do fechamento consolidado — mesma composição do BI executivo do Motor (seguro/imposto reduzem custo; comissão de carreta e pedágio fora)."
      itens={[
        'Custo × faturamento × margem por mês e por unidade',
        'Curva ABC de agregados (custo por motorista, top 50)',
        'Percentual custo/receita por período de fechamento (dezena/quinzena/navio)',
      ]}
    />
  )
}
