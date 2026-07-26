'use client'
/* BI do Motor · Devedores — estrutura da aba (dados na D2: endpoint
   /api/bi/devedores no motor-api com aging da carteira). */
import { BiEmConstrucao } from '../_shared'

export default function DevedoresPage() {
  return (
    <BiEmConstrucao
      titulo="Adiantamentos & Devedores"
      fase="D2"
      itens={[
        'Carteira em aberto com aging (data de origem + dias em aberto), como na aba do Power BI',
        'Total aberto vs recebido no período · taxa de recuperação',
        'Top devedores por motorista e por unidade',
        'Evolução mensal dos pagamentos',
        'Alerta na sineta do portal quando devedor estourar X dias',
      ]}
    />
  )
}
