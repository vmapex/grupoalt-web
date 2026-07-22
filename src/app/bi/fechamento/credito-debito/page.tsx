'use client'
/* BI de Fechamento · Crédito & Débito (estrutura). */
import { TelaEmConstrucao } from '../_shared'

export default function CreditoDebitoPage() {
  return (
    <TelaEmConstrucao
      titulo="Crédito & Débito"
      descricao="Composição de créditos e débitos do fechamento por motorista — bônus, descontos, retenções (seguro do boi, imposto) e saldo líquido."
      itens={[
        'Créditos × débitos por fechamento e por motorista',
        'Retenções (seguro/imposto) como crédito da unidade',
        'Saldo líquido a pagar por período de fechamento',
      ]}
    />
  )
}
