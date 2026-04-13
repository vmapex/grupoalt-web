'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { RefreshCw, Search, ChevronDown, ChevronRight, Tag, Settings } from 'lucide-react'
import { useThemeStore } from '@/store/themeStore'
import { useEmpresaId } from '@/hooks/useEmpresaId'
import { useCategorias } from '@/hooks/useAPI'
import { CATEGORIAS, buildCategoriasFromAPI, type CategoriaInfo } from '@/lib/planoContas'
import { GlowLine } from '@/components/ui/GlowLine'
import api from '@/lib/api'

/* ── Cores dos grupos DRE ─────────────────────────────────────── */
const GRUPO_COLORS: Record<string, string> = {
  RoB: '#38BDF8',
  TDCF: '#FBBF24',
  CV: '#F87171',
  CF: '#FB923C',
  RNOP: '#34D399',
  DNOP: '#C084FC',
  IRPJ: '#94A3B8',
  CSLL: '#94A3B8',
}

const GRUPO_LABELS: Record<string, string> = {
  RoB: '( + ) Receita Bruta',
  TDCF: '( - ) Tributos, Deduções e Custos Financeiros',
  CV: '( - ) Custos Variáveis',
  CF: '( - ) Custos Fixos',
  RNOP: '( + ) Receitas Não Operacionais',
  DNOP: '( - ) Despesas Não Operacionais',
  IRPJ: '( - ) IRPJ',
  CSLL: '( - ) CSLL',
}

export default function AdminCategoriasPage() {
  const t = useThemeStore((s) => s.tokens)
  const empresaId = useEmpresaId()
  const { data: apiData, loading, refetch } = useCategorias(empresaId)
  const [filter, setFilter] = useState('')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState('')

  /* ── Merge: API (dinâmico) > CATEGORIAS (estático) ─────────── */
  const categorias = useMemo<Record<string, CategoriaInfo>>(() => {
    if (apiData && Object.keys(apiData).length > 0) {
      // API tem dados: converte para CategoriaInfo
      const dynamicMap = buildCategoriasFromAPI(apiData)
      // Combina com estático como fallback para códigos faltantes
      return { ...CATEGORIAS, ...dynamicMap }
    }
    return CATEGORIAS
  }, [apiData])

  /* ── Filtro por texto ──────────────────────────────────────── */
  const filtered = useMemo(() => {
    const search = filter.trim().toLowerCase()
    const entries = Object.values(categorias)
    if (!search) return entries
    return entries.filter((c) =>
      c.codigo.toLowerCase().includes(search)
      || c.nome.toLowerCase().includes(search)
      || c.nivel1.toLowerCase().includes(search)
      || c.nivel2.toLowerCase().includes(search)
      || c.grupoDRE.toLowerCase().includes(search),
    )
  }, [categorias, filter])

  /* ── Agrupamento por grupoDRE > nivel2 ─────────────────────── */
  const grouped = useMemo(() => {
    const byGrupo: Record<string, Record<string, CategoriaInfo[]>> = {}
    for (const cat of filtered) {
      if (!byGrupo[cat.grupoDRE]) byGrupo[cat.grupoDRE] = {}
      if (!byGrupo[cat.grupoDRE][cat.nivel2]) byGrupo[cat.grupoDRE][cat.nivel2] = []
      byGrupo[cat.grupoDRE][cat.nivel2].push(cat)
    }
    // Ordena códigos dentro de cada nivel2
    for (const grupo of Object.keys(byGrupo)) {
      for (const nivel2 of Object.keys(byGrupo[grupo])) {
        byGrupo[grupo][nivel2].sort((a, b) => a.codigo.localeCompare(b.codigo))
      }
    }
    return byGrupo
  }, [filtered])

  const grupoOrder = ['RoB', 'TDCF', 'CV', 'CF', 'RNOP', 'DNOP', 'IRPJ', 'CSLL']

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  /* ── Sincronizar da Omie ───────────────────────────────────── */
  const handleSync = async () => {
    if (!empresaId || syncing) return
    setSyncing(true)
    setSyncMessage('')
    try {
      await api.post(`/sync/empresas/${empresaId}`)
      setSyncMessage('✓ Sincronização iniciada em segundo plano. Atualize em alguns segundos.')
      setTimeout(() => {
        refetch()
        setSyncMessage('')
      }, 4000)
    } catch (err: any) {
      setSyncMessage(`✗ Erro: ${err?.response?.data?.detail || err.message}`)
    } finally {
      setSyncing(false)
    }
  }

  /* ── Stats ─────────────────────────────────────────────────── */
  const stats = useMemo(() => {
    const total = Object.keys(categorias).length
    const fromAPI = apiData ? Object.keys(apiData).length : 0
    const byGrupo: Record<string, number> = {}
    for (const cat of Object.values(categorias)) {
      byGrupo[cat.grupoDRE] = (byGrupo[cat.grupoDRE] || 0) + 1
    }
    return { total, fromAPI, byGrupo }
  }, [categorias, apiData])

  return (
    <div className="flex flex-col gap-4 p-5 min-h-full" style={{ maxWidth: 1100, margin: '0 auto', width: '100%' }}>
      {/* ── Sub-navigation ────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, borderBottom: `1px solid ${t.border}`, paddingBottom: 12 }}>
        <Link
          href="/bi/financeiro/admin"
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 6,
            fontSize: 11, fontWeight: 600,
            color: t.muted, background: 'transparent',
            border: `1px solid ${t.border}`, textDecoration: 'none',
          }}
        >
          <Settings size={12} />
          Empresas
        </Link>
        <Link
          href="/bi/financeiro/admin/categorias"
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 6,
            fontSize: 11, fontWeight: 600,
            color: t.blue, background: t.blueDim,
            border: `1px solid ${t.blue}33`, textDecoration: 'none',
          }}
        >
          <Tag size={12} />
          Plano de Contas
        </Link>
      </div>

      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[13px] font-semibold flex items-center gap-2" style={{ color: t.text }}>
            <Tag size={14} />
            Plano de Contas — Categorias
          </div>
          <div className="text-[10px] mt-1" style={{ color: t.muted }}>
            {stats.fromAPI > 0
              ? `${stats.fromAPI} categorias sincronizadas da Omie · ${stats.total} no total`
              : `${stats.total} categorias estáticas (padrão) — sincronize da Omie para receber dados específicos da empresa`}
          </div>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing || !empresaId}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] cursor-pointer transition-all"
          style={{
            background: t.blueDim,
            border: `1px solid ${t.blue}44`,
            color: t.blue,
            opacity: (syncing || !empresaId) ? 0.5 : 1,
            fontFamily: 'inherit',
          }}
        >
          <RefreshCw size={11} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Sincronizando...' : 'Sincronizar da Omie'}
        </button>
      </div>

      {syncMessage && (
        <div
          className="px-3 py-2 rounded-lg text-[10px]"
          style={{
            background: syncMessage.startsWith('✓') ? t.greenDim : t.redDim,
            color: syncMessage.startsWith('✓') ? t.green : t.red,
            border: `1px solid ${syncMessage.startsWith('✓') ? t.green : t.red}33`,
          }}
        >
          {syncMessage}
        </div>
      )}

      {/* ── Stats por grupo DRE ──────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3">
        {grupoOrder.slice(0, 4).map((grupo) => (
          <div
            key={grupo}
            className="relative rounded-xl p-3 overflow-hidden"
            style={{ background: t.surface, border: `1px solid ${t.border}` }}
          >
            <GlowLine color={GRUPO_COLORS[grupo]} />
            <div className="text-[9px] uppercase tracking-widest mb-1" style={{ color: t.muted }}>
              {grupo}
            </div>
            <div className="text-[20px] font-mono font-medium" style={{ color: GRUPO_COLORS[grupo] }}>
              {stats.byGrupo[grupo] || 0}
            </div>
            <div className="text-[8px] mt-0.5 truncate" style={{ color: t.mutedDim }}>
              {GRUPO_LABELS[grupo]}
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-3">
        {grupoOrder.slice(4).map((grupo) => (
          <div
            key={grupo}
            className="relative rounded-xl p-3 overflow-hidden"
            style={{ background: t.surface, border: `1px solid ${t.border}` }}
          >
            <GlowLine color={GRUPO_COLORS[grupo]} />
            <div className="text-[9px] uppercase tracking-widest mb-1" style={{ color: t.muted }}>
              {grupo}
            </div>
            <div className="text-[20px] font-mono font-medium" style={{ color: GRUPO_COLORS[grupo] }}>
              {stats.byGrupo[grupo] || 0}
            </div>
            <div className="text-[8px] mt-0.5 truncate" style={{ color: t.mutedDim }}>
              {GRUPO_LABELS[grupo]}
            </div>
          </div>
        ))}
      </div>

      {/* ── Busca ────────────────────────────────────────────── */}
      <div
        className="relative rounded-lg flex items-center gap-2 px-3 py-2"
        style={{ background: t.surface, border: `1px solid ${t.border}` }}
      >
        <Search size={12} style={{ color: t.muted }} />
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Buscar por código, descrição ou grupo DRE..."
          className="flex-1 bg-transparent border-none outline-none text-[11px]"
          style={{ color: t.text, fontFamily: 'inherit' }}
        />
        {filter && (
          <button
            onClick={() => setFilter('')}
            className="text-[9px] cursor-pointer"
            style={{ color: t.muted, background: 'none', border: 'none' }}
          >
            Limpar
          </button>
        )}
      </div>

      {/* ── Lista agrupada ───────────────────────────────────── */}
      {loading && (
        <div className="flex items-center justify-center py-8 text-[10px]" style={{ color: t.muted }}>
          Carregando categorias...
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="flex items-center justify-center py-8 text-[10px]" style={{ color: t.muted }}>
          Nenhuma categoria encontrada
        </div>
      )}

      <div className="flex flex-col gap-2">
        {grupoOrder.map((grupo) => {
          const nivel2Map = grouped[grupo]
          if (!nivel2Map) return null
          const grupoColor = GRUPO_COLORS[grupo]
          const grupoLabel = GRUPO_LABELS[grupo]
          const totalNoGrupo = Object.values(nivel2Map).reduce((s, arr) => s + arr.length, 0)
          const isExpanded = expandedGroups.has(grupo) || filter.length > 0

          return (
            <div
              key={grupo}
              className="relative rounded-xl overflow-hidden"
              style={{ background: t.surface, border: `1px solid ${t.border}` }}
            >
              <GlowLine color={grupoColor} />
              <button
                onClick={() => toggleGroup(grupo)}
                className="w-full flex items-center gap-2 px-4 py-3 cursor-pointer transition-colors"
                style={{
                  background: 'transparent',
                  border: 'none',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                }}
              >
                {isExpanded ? (
                  <ChevronDown size={12} style={{ color: t.muted }} />
                ) : (
                  <ChevronRight size={12} style={{ color: t.muted }} />
                )}
                <span
                  className="inline-flex px-2 py-0.5 rounded text-[9px] font-mono font-semibold"
                  style={{ background: `${grupoColor}22`, color: grupoColor, border: `1px solid ${grupoColor}44` }}
                >
                  {grupo}
                </span>
                <span className="text-[11px] font-medium" style={{ color: t.text }}>
                  {grupoLabel}
                </span>
                <span className="text-[9px] font-mono ml-auto" style={{ color: t.muted }}>
                  {totalNoGrupo} categoria{totalNoGrupo !== 1 ? 's' : ''}
                </span>
              </button>

              {isExpanded && (
                <div style={{ borderTop: `1px solid ${t.border}` }}>
                  {Object.entries(nivel2Map).sort().map(([nivel2, cats]) => (
                    <div key={nivel2}>
                      <div
                        className="px-5 py-2 text-[9px] uppercase tracking-wider font-mono"
                        style={{
                          color: t.muted,
                          background: `${t.text}04`,
                          borderBottom: `1px solid ${t.border}`,
                        }}
                      >
                        {nivel2}
                      </div>
                      <table className="w-full text-[11px]">
                        <tbody>
                          {cats.map((cat) => (
                            <tr
                              key={cat.codigo}
                              className="transition-colors"
                              style={{ borderBottom: `1px solid ${t.border}22` }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = t.surfaceHover
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent'
                              }}
                            >
                              <td
                                className="px-5 py-2 font-mono text-[10px]"
                                style={{ color: t.mutedDim, width: 90 }}
                              >
                                {cat.codigo}
                              </td>
                              <td className="px-3 py-2" style={{ color: t.text }}>
                                {cat.nome}
                              </td>
                              <td
                                className="px-3 py-2 text-right font-mono text-[9px]"
                                style={{ color: t.muted, width: 60 }}
                              >
                                {cat.op === '+' ? 'entrada' : 'saída'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Info footer ──────────────────────────────────────── */}
      <div
        className="mt-2 p-3 rounded-lg text-[9px]"
        style={{
          background: t.surface,
          border: `1px solid ${t.border}`,
          color: t.muted,
        }}
      >
        <div className="mb-1 font-semibold" style={{ color: t.textSec }}>Como funciona o mapeamento DRE:</div>
        <div>
          Cada categoria Omie é mapeada para um grupo do DRE via prefixo do código.
          O grupo determina onde o valor entra na cascata do demonstrativo de resultado.
        </div>
        <div className="mt-1">
          <span className="font-mono" style={{ color: t.blue }}>1.01.*</span> → RoB ·
          <span className="font-mono" style={{ color: t.blue }}> 1.02.*</span> → RNOP ·
          <span className="font-mono" style={{ color: t.blue }}> 2.01-2.02</span> → TDCF ·
          <span className="font-mono" style={{ color: t.blue }}> 2.03-2.04</span> → CV ·
          <span className="font-mono" style={{ color: t.blue }}> 2.05-2.13</span> → CF ·
          <span className="font-mono" style={{ color: t.blue }}> 2.14.*</span> → DNOP
        </div>
      </div>
    </div>
  )
}
