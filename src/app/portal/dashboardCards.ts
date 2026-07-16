/* ═══════════════════════════════════════════════════════════════
   Catalogo de cards do dashboard inicial (/portal/page.tsx).

   Separado da page para evitar restricao do Next App Router que
   so permite exports especiais (default, metadata, dynamic, ...)
   em `page.tsx`. Tambem facilita teste isolado.

   Fase B (2026-05-23).
   ═══════════════════════════════════════════════════════════════ */

import {
  BarChart3, GitCompare, TrendingUp, Landmark, Network, FileText,
  type LucideIcon,
} from 'lucide-react'


export interface DashboardCard {
  title: string
  desc: string
  href: string
  icon: LucideIcon
  require: `${string}:${string}`
}


export const DASHBOARD_CARDS: readonly DashboardCard[] = [
  {
    title: 'BI Financeiro',
    desc: 'Dashboard executivo, Caixa, Extrato, CP/CR, Fluxo e Conciliação.',
    href: '/bi/financeiro',
    icon: BarChart3,
    require: 'financeiro:ver',
  },
  {
    title: 'Motor de Fechamento',
    desc: 'Lançamentos de viagens, CT-e e consolidação de período.',
    href: '/portal/fechamento',
    icon: GitCompare,
    require: 'fechamento:ver',
  },
  {
    title: 'Indicadores Operacionais',
    desc: 'KPIs de operações por unidade.',
    href: '/portal/indicadores/operacoes',
    icon: TrendingUp,
    require: 'indicadores:ver',
  },
  {
    title: 'Controladoria',
    desc: 'Indicadores e relatórios consolidados.',
    href: '/portal/indicadores/controladoria',
    icon: Landmark,
    // 2026-07-15 (decisão do usuário): Controladoria expõe visão financeira
    // consolidada — exige a permissão financeira, não a operacional. Perfis
    // sem financeiro:ver (Operacoes etc.) não veem o card.
    require: 'financeiro:ver',
  },
  {
    title: 'Estrutura do Grupo',
    desc: 'Organograma, MVV e segmentação por negócio.',
    href: '/portal/grupo/estrutura',
    icon: Network,
    require: 'grupo:ver',
  },
  {
    title: 'Documentos',
    desc: 'Repositório de documentos institucionais.',
    href: '/portal/documentos',
    icon: FileText,
    require: 'documentos:ver',
  },
] as const
