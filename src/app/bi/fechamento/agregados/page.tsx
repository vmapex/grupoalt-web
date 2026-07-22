'use client'
/* BI de Fechamento · Agregados & Postos (estrutura). */
import { TelaEmConstrucao } from '../_shared'

export default function AgregadosPostosPage() {
  return (
    <TelaEmConstrucao
      titulo="Agregados & Postos"
      descricao="Abastecimentos, vales e descontos por posto e por motorista agregado."
      itens={[
        'Custo de combustível em R$ por posto/unidade/período',
        'R$/litro e km/litro — previstos, DESABILITADOS: litros ainda zerados na base do Motor ("aguardando litros")',
        'Vales e descontos negociados por motorista',
      ]}
    />
  )
}
