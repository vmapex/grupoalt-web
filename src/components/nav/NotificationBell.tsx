'use client'
import { useState, useRef, useEffect } from 'react'
import { useThemeStore } from '@/store/themeStore'
import { Bell, AlertCircle, AlertTriangle, Info, ChevronRight } from 'lucide-react'

interface Notification {
  id: string
  type: 'critical' | 'warning' | 'info'
  title: string
  description: string
  value?: string
  action?: { label: string; route: string }
  createdAt: Date
  read: boolean
}

const NOW = new Date()
const YESTERDAY = new Date(NOW.getTime() - 86400000)

const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    type: 'critical',
    title: '3 contas atrasadas',
    description: 'ENERGIA, INTERNET, SEGURO',
    value: 'R$ 27.100',
    action: { label: 'Ver detalhes', route: '/portal/cp-cr' },
    createdAt: NOW,
    read: false,
  },
  {
    id: '2',
    type: 'warning',
    title: 'Conciliacao: 5 dias fora SLA',
    description: 'Maior atraso: 12d uteis',
    action: { label: 'Ir para Conciliacao', route: '/portal/conciliacao' },
    createdAt: NOW,
    read: false,
  },
  {
    id: '3',
    type: 'info',
    title: 'Cobertura de caixa: 0.8x',
    description: 'Saidas previstas > entradas',
    action: { label: 'Ver Fluxo de Caixa', route: '/portal/fluxo' },
    createdAt: NOW,
    read: false,
  },
  {
    id: '4',
    type: 'warning',
    title: 'Vencimento amanha: FGTS',
    description: 'R$ 9.600 — Itau',
    action: { label: 'Ver detalhes', route: '/portal/cp-cr' },
    createdAt: YESTERDAY,
    read: true,
  },
  {
    id: '5',
    type: 'info',
    title: '12 lancamentos nao conciliados',
    description: 'Novos lancamentos identificados hoje',
    action: { label: 'Conciliar', route: '/portal/conciliacao' },
    createdAt: YESTERDAY,
    read: true,
  },
]

function isToday(d: Date) {
  const now = new Date()
  return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
}

function isYesterday(d: Date) {
  const y = new Date()
  y.setDate(y.getDate() - 1)
  return d.getDate() === y.getDate() && d.getMonth() === y.getMonth() && d.getFullYear() === y.getFullYear()
}

export function NotificationBell() {
  const t = useThemeStore((s) => s.tokens)
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS)
  const panelRef = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter((n) => !n.read).length

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const typeConfig = {
    critical: { color: t.red, dim: t.redDim, icon: AlertCircle, label: 'Critico' },
    warning: { color: t.amber, dim: t.amberDim, icon: AlertTriangle, label: 'Atencao' },
    info: { color: t.blue, dim: t.blueDim, icon: Info, label: 'Info' },
  }

  const todayNotifs = notifications.filter((n) => isToday(n.createdAt))
  const yesterdayNotifs = notifications.filter((n) => isYesterday(n.createdAt))

  const renderNotification = (n: Notification) => {
    const cfg = typeConfig[n.type]
    const Icon = cfg.icon
    return (
      <div
        key={n.id}
        className="flex gap-2.5 p-2.5 rounded-lg transition-colors"
        style={{
          background: n.read ? 'transparent' : cfg.dim,
          border: `1px solid ${n.read ? t.border : `${cfg.color}22`}`,
        }}
      >
        <div
          className="flex items-center justify-center w-7 h-7 rounded-lg shrink-0"
          style={{ background: cfg.dim }}
        >
          <Icon size={13} style={{ color: cfg.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {!n.read && (
              <span
                className="block w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: cfg.color }}
              />
            )}
            <span className="text-[10px] font-semibold truncate" style={{ color: t.text }}>
              {n.title}
            </span>
          </div>
          <div className="text-[9px] mt-0.5" style={{ color: t.textSec }}>
            {n.description}
          </div>
          {n.value && (
            <div className="text-[10px] font-mono font-medium mt-0.5" style={{ color: cfg.color }}>
              Total: {n.value}
            </div>
          )}
          {n.action && (
            <button
              className="flex items-center gap-0.5 text-[9px] font-medium mt-1 cursor-pointer bg-transparent border-none p-0"
              style={{ color: t.blue }}
              onClick={() => {
                // In production, navigate to n.action.route
                setOpen(false)
              }}
            >
              {n.action.label} <ChevronRight size={10} />
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-center w-8 h-8 rounded-lg transition-all cursor-pointer relative"
        style={{
          background: open ? t.blueDim : t.surface,
          border: `1px solid ${open ? `${t.blue}44` : t.border}`,
          color: open ? t.blue : t.muted,
        }}
        aria-label="Notificacoes"
      >
        <Bell size={13} />
        {unreadCount > 0 && (
          <span
            className="absolute flex items-center justify-center rounded-full text-[8px] font-bold leading-none"
            style={{
              top: -4,
              right: -4,
              width: 16,
              height: 16,
              background: t.red,
              color: '#fff',
            }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 mt-2 rounded-xl overflow-hidden"
          style={{
            width: 320,
            maxHeight: 440,
            background: t.surfaceElevated,
            border: `1px solid ${t.border}`,
            boxShadow: t.tooltipShadow,
            zIndex: 50,
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-2.5"
            style={{ borderBottom: `1px solid ${t.border}` }}
          >
            <span className="text-[11px] font-semibold" style={{ color: t.text }}>
              Notificacoes
            </span>
            {unreadCount > 0 && (
              <span
                className="text-[9px] font-medium px-2 py-0.5 rounded-full"
                style={{ background: t.redDim, color: t.red }}
              >
                {unreadCount} {unreadCount === 1 ? 'nova' : 'novas'}
              </span>
            )}
          </div>

          {/* Body */}
          <div className="overflow-y-auto px-3 py-2 space-y-3" style={{ maxHeight: 340 }}>
            {todayNotifs.length > 0 && (
              <div>
                <div
                  className="text-[8px] uppercase tracking-wider font-semibold px-1 pb-1.5"
                  style={{ color: t.muted }}
                >
                  Hoje
                </div>
                <div className="space-y-1.5">{todayNotifs.map(renderNotification)}</div>
              </div>
            )}

            {yesterdayNotifs.length > 0 && (
              <div>
                <div
                  className="text-[8px] uppercase tracking-wider font-semibold px-1 pb-1.5"
                  style={{ color: t.muted }}
                >
                  Ontem
                </div>
                <div className="space-y-1.5">{yesterdayNotifs.map(renderNotification)}</div>
              </div>
            )}
          </div>

          {/* Footer */}
          {unreadCount > 0 && (
            <div
              className="px-4 py-2.5 text-center"
              style={{ borderTop: `1px solid ${t.border}` }}
            >
              <button
                onClick={markAllRead}
                className="text-[9px] font-medium cursor-pointer bg-transparent border-none p-0 transition-colors"
                style={{ color: t.blue }}
                onMouseEnter={(e) => { e.currentTarget.style.color = t.text }}
                onMouseLeave={(e) => { e.currentTarget.style.color = t.blue }}
              >
                Marcar todas como lidas
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
