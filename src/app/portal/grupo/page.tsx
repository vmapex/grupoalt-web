'use client'

import { useAuthStore } from '@/store/authStore'
import Link from 'next/link'
import {
  DollarSign, Truck, Car, AlertTriangle,
  TrendingUp, TrendingDown, FileCheck, GitCompare,
  CheckCircle, FileEdit, FilePlus, Receipt,
  BarChart3, Users, Download, Plus,
} from 'lucide-react'

const stats = [
  { label: 'Faturamento', value: 'R$ 4,2M', change: '+12.5% vs mês anterior', up: true, icon: DollarSign, color: '#CCA000', bg: 'rgba(204,160,0,0.1)' },
  { label: 'Viagens', value: '1.847', change: '+8.3% vs mês anterior', up: true, icon: Truck, color: '#60A5FA', bg: 'rgba(96,165,250,0.1)' },
  { label: 'Frota Ativa', value: '312', change: '+3 veículos', up: true, icon: Car, color: '#34D399', bg: 'rgba(52,211,153,0.1)' },
  { label: 'Pendências', value: 'R$ 287K', change: '+4.1% vs mês anterior', up: false, icon: AlertTriangle, color: '#F87171', bg: 'rgba(248,113,113,0.1)' },
]

const activities = [
  { icon: FileCheck, iconColor: '#CCA000', iconBg: 'rgba(204,160,0,0.1)', title: 'Nota Fiscal #48291', desc: 'emitida para Cargill S.A.', time: 'Hoje, 14:32', badge: 'Concluído', badgeColor: '#34D399', badgeBg: 'rgba(52,211,153,0.1)' },
  { icon: GitCompare, iconColor: '#60A5FA', iconBg: 'rgba(96,165,250,0.1)', title: 'Conciliação bancária', desc: 'finalizada - Banco do Brasil', time: 'Hoje, 11:15', badge: 'Concluído', badgeColor: '#34D399', badgeBg: 'rgba(52,211,153,0.1)' },
  { icon: CheckCircle, iconColor: '#34D399', iconBg: 'rgba(52,211,153,0.1)', title: 'Fechamento contábil', desc: 'de Fevereiro aprovado', time: 'Ontem, 17:48', badge: 'Aprovado', badgeColor: '#E0B82E', badgeBg: 'rgba(204,160,0,0.1)' },
  { icon: FileEdit, iconColor: '#A1A1AA', iconBg: 'rgba(161,161,170,0.1)', title: 'Política de Compliance', desc: 'atualizada por João Silva', time: 'Ontem, 09:20', badge: 'Atualizado', badgeColor: '#A1A1AA', badgeBg: 'rgba(161,161,170,0.1)' },
]

const quickActions = [
  { icon: FilePlus, color: '#CCA000', bg: 'rgba(204,160,0,0.1)', title: 'Novo Documento', desc: 'Criar ou enviar', href: '/portal/documentos' },
  { icon: Receipt, color: '#60A5FA', bg: 'rgba(96,165,250,0.1)', title: 'Contas a Pagar', desc: '18 pendentes', href: '/portal/financeiro/cp' },
  { icon: BarChart3, color: '#34D399', bg: 'rgba(52,211,153,0.1)', title: 'Indicadores', desc: 'Painel de KPIs', href: '/portal/indicadores' },
  { icon: Users, color: '#A1A1AA', bg: 'rgba(161,161,170,0.1)', title: 'Equipe', desc: 'Estrutura do grupo', href: '/portal/grupo/estrutura' },
]

const vencimentos = [
  { mes: 'ABR', dia: '02', titulo: 'IPVA Frota SP', valor: 'R$ 45.200', color: '#F87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.2)' },
  { mes: 'ABR', dia: '05', titulo: 'Folha Pagamento', valor: 'R$ 892.000', color: '#CCA000', bg: 'rgba(204,160,0,0.1)', border: 'rgba(204,160,0,0.2)' },
  { mes: 'ABR', dia: '10', titulo: 'Seguro Frota', valor: 'R$ 128.500', color: '#A1A1AA', bg: 'rgba(161,161,170,0.1)', border: 'rgba(113,113,122,0.2)' },
]

export default function DashboardPage() {
  const { grupoAtivo } = useAuthStore()

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white tracking-tight mb-1">Dashboard</h1>
            <p className="text-sm text-zinc-400">Visão geral das operações do {grupoAtivo?.nome || 'Grupo ALT'}</p>
          </div>
          <div className="flex items-center gap-3" />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="bg-zinc-900 rounded-2xl border border-zinc-800 p-5 hover:border-zinc-700 transition-all group">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{stat.label}</span>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: stat.bg }}>
                  <Icon className="w-4 h-4" style={{ color: stat.color }} />
                </div>
              </div>
              <div className="text-2xl font-semibold text-white mb-1">{stat.value}</div>
              <div className={`flex items-center gap-1 text-xs font-medium ${stat.up ? 'text-emerald-400' : 'text-red-400'}`}>
                {stat.up ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                {stat.change}
              </div>
            </div>
          )
        })}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-3 gap-4">
        {/* Activity Panel (2 cols) */}
        <div className="col-span-2 bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-semibold text-white">Atividade Recente</h3>
            <a href="#" className="text-xs text-[#E0B82E] hover:text-[#CCA000] font-medium transition-colors">Ver tudo</a>
          </div>

          <div className="space-y-0">
            {activities.map((item, i) => {
              const Icon = item.icon
              return (
                <div key={i} className={`flex items-start gap-3 py-4 ${i < activities.length - 1 ? 'border-b border-zinc-800/50' : ''}`}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: item.iconBg }}>
                    <Icon className="w-4 h-4" style={{ color: item.iconColor }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-200">
                      <span className="font-medium text-white">{item.title}</span> {item.desc}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">{item.time}</p>
                  </div>
                  <span className="flex-shrink-0 text-xs px-2 py-1 rounded-lg font-medium" style={{ background: item.badgeBg, color: item.badgeColor }}>
                    {item.badge}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right Panel */}
        <div className="space-y-4">
          {/* Quick Actions */}
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
            <h3 className="text-base font-semibold text-white mb-5">Acesso Rápido</h3>
            <div className="space-y-1">
              {quickActions.map((action) => {
                const Icon = action.icon
                return (
                  <Link key={action.href} href={action.href} className="flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-800 transition-colors group">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: action.bg }}>
                      <Icon className="w-4 h-4" style={{ color: action.color }} />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors">{action.title}</div>
                      <div className="text-xs text-zinc-500">{action.desc}</div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Próximos Vencimentos */}
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-white">Próximos Vencimentos</h3>
              <span className="text-xs text-zinc-500">Março 2026</span>
            </div>
            <div className="space-y-3">
              {vencimentos.map((v, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex flex-col items-center justify-center flex-shrink-0" style={{ background: v.bg, border: `1px solid ${v.border}` }}>
                    <span className="text-[10px] font-medium leading-none" style={{ color: v.color }}>{v.mes}</span>
                    <span className="text-sm font-bold leading-tight" style={{ color: v.color }}>{v.dia}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-200 font-medium truncate">{v.titulo}</p>
                    <p className="text-xs text-zinc-500">{v.valor}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
