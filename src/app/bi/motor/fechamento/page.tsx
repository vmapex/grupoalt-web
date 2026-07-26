'use client'
/* BI do Motor · Fechamento — estrutura da aba (dados na D3: fechamento
   ao vivo do período aberto + crédito & débito por unidade). */
import { BiEmConstrucao } from '../_shared'

export default function FechamentoBiPage() {
  return (
    <BiEmConstrucao
      titulo="Fechamento ao vivo"
      fase="D3"
      itens={[
        'Espelho do fechamento do período ABERTO (dezena/quinzena/navio corrente) antes de fechar — visão que o Power BI nunca teve',
        'Tabela por motorista: a pagar, viagens, abastecimentos, vales, seguro, devedores, descontos',
        'Crédito & Débito por unidade (comissões, seguro boi, posto + imposto, terceiros)',
        'Fechamento por posto',
      ]}
    />
  )
}
