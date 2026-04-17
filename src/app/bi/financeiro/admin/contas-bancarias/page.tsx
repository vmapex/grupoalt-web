'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Settings, Tag, Landmark, Search, RefreshCw } from 'lucide-react'
import { useThemeStore } from '@/store/themeStore'
import { useEmpresaId } from '@/hooks/useEmpresaId'
import { useContasBancarias, updateContaBancariaFlags, type ContaBancariaAPIItem } from '@/hooks/useAPI'
import { GlowLine } from '@/components/ui/GlowLine'

export default function AdminContasBancariasPage() {
  const t = useThemeStore((s) => s.tokens)
  const empresaId = useEmpresaId()
  const { data, loading, refetch } = useContasBancarias(empresaId)
  const [filter, setFilter] = useState('')
  const [savingId, setSavingId] = useState<number | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  const contas = useMemo(() => data ?? [], [data])

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return contas
    return contas.filter((c) =>
      (c.descricao || '').toLowerCase().includes(q) ||
      (c.banco || '').toLowerCase().includes(q),
    )
  }, [contas, filter])

  const stats = useMemo(() => ({
    total: contas.length,
    ativasBI: contas.filter((c) => c.incluir_bi).length,
    projecao: contas.filter((c) => c.is_projecao).length,
    excluidasBI: contas.filter((c) => !c.incluir_bi).length,
  }), [contas])

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2500)
  }

  const handleToggle = async (
    conta: ContaBancariaAPIItem,
    field: 'incluir_bi' | 'is_projecao',
    value: boolean,
  ) => {
    if (!empresaId) return
    setSavingId(conta.id)
    try {
      await updateContaBancariaFlags(empresaId, conta.id, { [field]: value })
      showToast(
        field === 'incluir_bi'
          ? value ? 'Conta passará a refletir no BI' : 'Conta removida do BI'
          : value ? 'Conta marcada como projeção' : 'Conta deixa de ser projeção',
        'ok',
      )
      refetch()
    } catch (err) {
      showToast('Falha ao atualizar conta', 'err')
      console.error(err)
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="p-5">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <Landmark size={18} style={{ color: t.blue }} />
          <h1 className="text-lg font-semibold" style={{ color: t.text }}>Configurações</h1>
        </div>
        <p className="text-[12px]" style={{ color: t.muted }}>
          Gerencie quais contas bancárias refletem no BI e marque contas de projeção.
        </p>
      </div>

      {/* Sub-navigation */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: `1px solid ${t.border}`, paddingBottom: 12 }}>
        <Link href="/bi/financeiro/admin" style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 12px', borderRadius: 6,
          fontSize: 11, fontWeight: 600,
          color: t.muted, background: 'transparent',
          border: `1px solid ${t.border}`, textDecoration: 'none',
        }}>
          <Settings size={12} /> Empresas
        </Link>
        <Link href="/bi/financeiro/admin/categorias" style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 12px', borderRadius: 6,
          fontSize: 11, fontWeight: 600,
          color: t.muted, background: 'transparent',
          border: `1px solid ${t.border}`, textDecoration: 'none',
        }}>
          <Tag size={12} /> Plano de Contas
        </Link>
        <Link href="/bi/financeiro/admin/contas-bancarias" style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 12px', borderRadius: 6,
          fontSize: 11, fontWeight: 600,
          color: t.blue, background: t.blueDim,
          border: `1px solid ${t.blue}33`, textDecoration: 'none',
        }}>
          <Landmark size={12} /> Contas Bancárias
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          { l: 'Total', v: stats.total, c: t.text },
          { l: 'Refletindo no BI', v: stats.ativasBI, c: t.green },
          { l: 'Projeção', v: stats.projecao, c: t.purple },
          { l: 'Excluídas do BI', v: stats.excluidasBI, c: t.red },
        ].map((s, i) => (
          <div key={i} className="relative rounded-lg p-3 overflow-hidden"
            style={{ background: t.surface, border: `1px solid ${t.border}` }}>
            <GlowLine color={s.c} />
            <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: t.muted }}>{s.l}</div>
            <div className="font-mono text-xl" style={{ color: s.c }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-3">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: t.muted }} />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Buscar por descrição ou banco..."
            className="w-full pl-8 pr-3 py-2 text-[12px] rounded-md"
            style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.text }}
          />
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 px-3 py-2 text-[11px] rounded-md transition-all"
          style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.textSec }}
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      {/* Tabela */}
      <div className="rounded-lg overflow-hidden" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
        <table className="w-full text-[11px]">
          <thead>
            <tr style={{ background: `${t.bg}EE`, borderBottom: `1px solid ${t.border}` }}>
              <th className="px-3.5 py-2.5 text-left font-semibold" style={{ color: t.muted }}>Descrição</th>
              <th className="px-3.5 py-2.5 text-left font-semibold" style={{ color: t.muted }}>Banco</th>
              <th className="px-3.5 py-2.5 text-left font-semibold" style={{ color: t.muted }}>Tipo</th>
              <th className="px-3.5 py-2.5 text-center font-semibold" style={{ color: t.muted }}>Ativa Omie</th>
              <th className="px-3.5 py-2.5 text-center font-semibold" style={{ color: t.green }}>Refletir no BI</th>
              <th className="px-3.5 py-2.5 text-center font-semibold" style={{ color: t.purple }}>Projeção</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="px-3.5 py-8 text-center" style={{ color: t.muted }}>Carregando...</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={6} className="px-3.5 py-8 text-center" style={{ color: t.muted }}>
                {contas.length === 0 ? 'Nenhuma conta cadastrada' : 'Nenhuma conta corresponde ao filtro'}
              </td></tr>
            )}
            {filtered.map((c) => (
              <tr key={c.id} style={{ borderBottom: `1px solid ${t.border}22` }}>
                <td className="px-3.5 py-2.5" style={{ color: t.text }}>
                  {c.descricao || `(sem descrição — ${c.id})`}
                </td>
                <td className="px-3.5 py-2.5" style={{ color: t.muted }}>{c.banco || '—'}</td>
                <td className="px-3.5 py-2.5" style={{ color: t.muted }}>{c.tipo || '—'}</td>
                <td className="px-3.5 py-2.5 text-center">
                  <span className="inline-block w-2 h-2 rounded-full"
                    style={{ background: c.ativa ? t.green : t.red }} />
                </td>
                <td className="px-3.5 py-2.5 text-center">
                  <ToggleSwitch
                    checked={c.incluir_bi}
                    disabled={savingId === c.id}
                    onChange={(v) => handleToggle(c, 'incluir_bi', v)}
                    color={t.green}
                    bg={t.surface}
                    border={t.border}
                  />
                </td>
                <td className="px-3.5 py-2.5 text-center">
                  <ToggleSwitch
                    checked={c.is_projecao}
                    disabled={savingId === c.id}
                    onChange={(v) => handleToggle(c, 'is_projecao', v)}
                    color={t.purple}
                    bg={t.surface}
                    border={t.border}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-6 right-6 px-4 py-2.5 rounded-md text-[12px] font-medium shadow-lg"
          style={{
            background: toast.type === 'ok' ? t.green : t.red,
            color: '#FFF',
            zIndex: 100,
          }}
        >
          {toast.msg}
        </div>
      )}
    </div>
  )
}

interface ToggleSwitchProps {
  checked: boolean
  disabled?: boolean
  onChange: (value: boolean) => void
  color: string
  bg: string
  border: string
}

function ToggleSwitch({ checked, disabled, onChange, color, bg, border }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      className="relative inline-flex items-center transition-colors"
      style={{
        width: 32,
        height: 18,
        borderRadius: 999,
        background: checked ? color : bg,
        border: `1px solid ${checked ? color : border}`,
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      <span
        className="absolute transition-transform"
        style={{
          width: 12,
          height: 12,
          borderRadius: 999,
          background: '#FFF',
          top: 2,
          left: 2,
          transform: checked ? 'translateX(14px)' : 'translateX(0)',
        }}
      />
    </button>
  )
}
