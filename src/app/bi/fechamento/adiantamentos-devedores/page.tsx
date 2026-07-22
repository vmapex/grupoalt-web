'use client'
/* BI de Fechamento · Adiantamentos & Devedores (estrutura). */
import { TelaEmConstrucao } from '../_shared'

export default function AdiantamentosDevedoresPage() {
  return (
    <TelaEmConstrucao
      titulo="Adiantamentos & Devedores"
      descricao="Posição de adiantamentos e devedores por motorista e unidade, a partir do fechamento consolidado."
      itens={[
        'Saldo devedor por motorista (aging pendente × quitado)',
        'Adiantamentos concedidos no período vs descontados em fechamento',
        'Evolução mensal do saldo em aberto',
      ]}
    />
  )
}
