'use client'
import { useMemo, useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { RefreshCw, Search, ChevronDown, ChevronRight, Tag, Settings, Pencil, Check, X as XIcon, Square, CheckSquare, Layers } from 'lucide-react'
import { useThemeStore } from '@/store/themeStore'
import { useEmpresaId } from '@/hooks/useEmpresaId'
import { useCategorias, updateCategoriaGrupoDRE, syncCategoriasEmpresa, bulkUpdateCategoriasGrupoDRE } from '@/hooks/useAPI'
import { CATEGORIAS, buildCategoriasFromAPI, type CategoriaInfo } from '@/lib/planoContas'
import { GlowLine } from '@/components/ui/GlowLine'

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
  NEUTRO: '#64748B',
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
  NEUTRO: '🚫 Neutro / Excluir do DRE',
}

export default function AdminCategoriasPage() {
  const t = useThemeStore((s) => s.tokens)
  const empresaId = useEmpresaId()
  const { data: apiData, loading, refetch } = useCategorias(empresaId)
  const [filter, setFilter] = useState('')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState('')
  const [editingCodigo, setEditingCodigo] = useState<string | null>(null)
  const [savingCodigo, setSavingCodigo] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)
  const editDropdownRef = useRef<HTMLDivElement>(null)
  // Bulk-edit
  const [selectedCodigos, setSelectedCodigos] = useState<Set<string>>(new Set())
  const [bulkEditing, setBulkEditing] = useState(false)
  const bulkDropdownRef = useRef<HTMLDivElement>(null)

  // Fechar bulk dropdown ao clicar fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (bulkDropdownRef.current && !bulkDropdownRef.current.contains(e.target as Node)) {
        setBulkEditing(false)
      }
    }
    if (bulkEditing) {
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }
  }, [bulkEditing])

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (editDropdownRef.current && !editDropdownRef.current.contains(e.target as Node)) {
        setEditingCodigo(null)
      }
    }
    if (editingCodigo) {
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }
  }, [editingCodigo])

  // Toast auto-dismiss
  useEffect(() => {
    if (toast) {
      const id = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(id)
    }
  }, [toast])

  /** Salva o override de grupo DRE para uma categoria */
  const handleSaveOverride = async (codigo: string, grupoDre: string | null) => {
    if (!empresaId) return
    setSavingCodigo(codigo)
    try {
      await updateCategoriaGrupoDRE(empresaId, codigo, grupoDre)
      setToast({
        msg: grupoDre ? `✓ Categoria ${codigo} agora está em ${grupoDre}` : `✓ Override removido em ${codigo}`,
        type: 'ok',
      })
      setEditingCodigo(null)
      refetch()
    } catch (err: any) {
      setToast({ msg: `✗ Erro: ${err?.response?.data?.detail || err.message}`, type: 'err' })
    } finally {
      setSavingCodigo(null)
    }
  }

  /** Verifica se uma categoria tem override manual ativo (grupo atual != inferido por prefixo) */
  const hasOverride = (codigo: string): boolean => {
    if (!apiData || !apiData[codigo]) return false
    return apiData[codigo].grupo_dre !== null && apiData[codigo].grupo_dre !== undefined
  }

  /** Verifica se uma categoria pode ser editada (veio da API) */
  const canEditCategoria = (codigo: string): boolean => {
    return !!apiData && !!apiData[codigo]
  }

  /** Toggle de selecao de uma categoria */
  const toggleSelect = (codigo: string) => {
    setSelectedCodigos((prev) => {
      const next = new Set(prev)
      if (next.has(codigo)) next.delete(codigo)
      else next.add(codigo)
      return next
    })
  }

  /** Seleciona todas as categorias de uma lista (filtrando as editaveis) */
  const selectMany = (codigos: string[]) => {
    setSelectedCodigos((prev) => {
      const next = new Set(prev)
      for (const c of codigos) {
        if (canEditCategoria(c)) next.add(c)
      }
      return next
    })
  }

  /** Deseleciona todas as categorias de uma lista */
  const deselectMany = (codigos: string[]) => {
    setSelectedCodigos((prev) => {
      const next = new Set(prev)
      for (const c of codigos) next.delete(c)
      return next
    })
  }

  /** Aplica um grupo DRE em todas as categorias selecionadas via bulk endpoint */
  const handleBulkApply = async (grupoDre: string | null) => {
    if (!empresaId || selectedCodigos.size === 0) return
    setBulkEditing(false)
    const codigos = Array.from(selectedCodigos)
    try {
      const result = await bulkUpdateCategoriasGrupoDRE(empresaId, codigos, grupoDre)
      const label = grupoDre ? `em ${grupoDre}` : 'sem override'
      setToast({
        msg: `✓ ${result.updated} categoria${result.updated !== 1 ? 's' : ''} atualizada${result.updated !== 1 ? 's' : ''} ${label}`,
        type: 'ok',
      })
      setSelectedCodigos(new Set())
      refetch()
    } catch (err: any) {
      setToast({
        msg: `✗ Erro ao aplicar em lote: ${err?.response?.data?.detail || err.message}`,
        type: 'err',
      })
    }
  }

  const clearSelection = () => setSelectedCodigos(new Set())

  /* ── Fonte de dados: API (dinâmico) OU CATEGORIAS (estático) ─
   * Quando a API retorna dados, usamos SÓ a API — sem merge com o
   * mapa estático, pra evitar que categorias de outras empresas
   * (ALT MAX) vazem na lista com "não sincronizado". */
  const categorias = useMemo<Record<string, CategoriaInfo>>(() => {
    if (apiData && Object.keys(apiData).length > 0) {
      return buildCategoriasFromAPI(apiData)
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
    // Ordena códigos dentro de cada nivel2 com natural sort (para 2.5 vir antes de 2.11)
    for (const grupo of Object.keys(byGrupo)) {
      for (const nivel2 of Object.keys(byGrupo[grupo])) {
        byGrupo[grupo][nivel2].sort((a, b) =>
          a.codigo.localeCompare(b.codigo, undefined, { numeric: true }),
        )
      }
    }
    return byGrupo
  }, [filtered])

  const grupoOrder = ['RoB', 'TDCF', 'CV', 'CF', 'RNOP', 'DNOP', 'IRPJ', 'CSLL', 'NEUTRO']

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  /* ── Sincronizar da Omie (apenas categorias, síncrono) ────── */
  const handleSync = async () => {
    if (!empresaId || syncing) return
    setSyncing(true)
    setSyncMessage('')
    try {
      const result = await syncCategoriasEmpresa(empresaId)
      if (result.aviso) {
        setSyncMessage(`⚠ ${result.aviso}`)
      } else {
        setSyncMessage(`✓ ${result.sincronizadas} categorias sincronizadas da Omie.`)
      }
      // Refetch imediato (sync já foi concluído)
      refetch()
      setTimeout(() => setSyncMessage(''), 5000)
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err.message || 'Erro desconhecido'
      setSyncMessage(`✗ ${detail}`)
      setTimeout(() => setSyncMessage(''), 8000)
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
      {/* Toast */}
      {toast && (
        <div
          className="fixed top-20 right-6 z-50 px-4 py-3 rounded-lg text-[11px] font-medium"
          style={{
            background: toast.type === 'ok' ? t.greenDim : t.redDim,
            color: toast.type === 'ok' ? t.green : t.red,
            border: `1px solid ${toast.type === 'ok' ? t.green : t.red}44`,
            boxShadow: t.tooltipShadow,
            minWidth: 220,
          }}
        >
          {toast.msg}
        </div>
      )}

      {/* Barra flutuante de edicao em lote */}
      {selectedCodigos.size > 0 && (
        <div
          className="fixed bottom-6 left-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{
            transform: 'translateX(-50%)',
            background: t.surfaceElevated,
            border: `1px solid ${t.purple}44`,
            boxShadow: t.tooltipShadow,
            minWidth: 440,
          }}
        >
          <div className="flex items-center gap-2">
            <Layers size={14} style={{ color: t.purple }} />
            <div>
              <div className="text-[11px] font-semibold" style={{ color: t.text }}>
                {selectedCodigos.size} categoria{selectedCodigos.size !== 1 ? 's' : ''} selecionada{selectedCodigos.size !== 1 ? 's' : ''}
              </div>
              <div className="text-[9px]" style={{ color: t.muted }}>
                Aplique um grupo DRE em lote
              </div>
            </div>
          </div>
          <div className="flex-1" />
          <div ref={bulkDropdownRef} className="relative">
            <button
              onClick={() => setBulkEditing(!bulkEditing)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg cursor-pointer"
              style={{
                background: t.purpleDim,
                border: `1px solid ${t.purple}44`,
                color: t.purple,
                fontSize: 10,
                fontWeight: 600,
                fontFamily: 'inherit',
              }}
            >
              <Pencil size={10} />
              Aplicar grupo DRE
              <ChevronDown size={10} style={{ transform: bulkEditing ? 'rotate(180deg)' : 'none' }} />
            </button>
            {bulkEditing && (
              <div
                className="absolute bottom-full mb-2 right-0 rounded-lg overflow-hidden"
                style={{
                  background: t.surfaceElevated,
                  border: `1px solid ${t.borderHover}`,
                  boxShadow: t.tooltipShadow,
                  minWidth: 280,
                }}
              >
                <div
                  className="px-3 py-2 text-[8px] uppercase tracking-wider"
                  style={{ color: t.muted, borderBottom: `1px solid ${t.border}` }}
                >
                  Aplicar em {selectedCodigos.size} categoria{selectedCodigos.size !== 1 ? 's' : ''}
                </div>
                {grupoOrder.map((g) => {
                  const color = GRUPO_COLORS[g]
                  return (
                    <button
                      key={g}
                      onClick={() => handleBulkApply(g)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-[10px] cursor-pointer transition-colors"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: t.textSec,
                        fontFamily: 'inherit',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = `${color}14` }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                    >
                      <span
                        className="inline-flex px-1.5 py-0.5 rounded text-[8px] font-mono font-semibold"
                        style={{
                          background: `${color}22`,
                          color,
                          border: `1px solid ${color}44`,
                        }}
                      >
                        {g}
                      </span>
                      <span className="flex-1 truncate">{GRUPO_LABELS[g]}</span>
                    </button>
                  )
                })}
                <div style={{ height: 1, background: t.border }} />
                <button
                  onClick={() => handleBulkApply(null)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-[9px] cursor-pointer"
                  style={{ background: 'transparent', border: 'none', color: t.muted, fontFamily: 'inherit' }}
                >
                  <RefreshCw size={10} />
                  <span>Remover override (usar padrão)</span>
                </button>
              </div>
            )}
          </div>
          <button
            onClick={clearSelection}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg cursor-pointer"
            style={{
              background: 'transparent',
              border: `1px solid ${t.border}`,
              color: t.muted,
              fontSize: 10,
              fontFamily: 'inherit',
            }}
          >
            <XIcon size={10} />
            Limpar
          </button>
        </div>
      )}

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
            background: syncMessage.startsWith('✓') ? t.greenDim : syncMessage.startsWith('⚠') ? t.amberDim : t.redDim,
            color: syncMessage.startsWith('✓') ? t.green : syncMessage.startsWith('⚠') ? t.amber : t.red,
            border: `1px solid ${syncMessage.startsWith('✓') ? t.green : syncMessage.startsWith('⚠') ? t.amber : t.red}33`,
          }}
        >
          {syncMessage}
        </div>
      )}

      {/* ── Stats por grupo DRE ──────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3">
        {grupoOrder.map((grupo) => (
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

          // Códigos deste grupo que podem ser selecionados (vieram da API)
          const grupoCodigos = Object.values(nivel2Map).flat().map((c) => c.codigo).filter(canEditCategoria)
          const grupoSelectedCount = grupoCodigos.filter((c) => selectedCodigos.has(c)).length
          const grupoAllSelected = grupoCodigos.length > 0 && grupoSelectedCount === grupoCodigos.length
          const grupoSomeSelected = grupoSelectedCount > 0 && grupoSelectedCount < grupoCodigos.length

          return (
            <div
              key={grupo}
              className="relative rounded-xl overflow-hidden"
              style={{ background: t.surface, border: `1px solid ${t.border}` }}
            >
              <GlowLine color={grupoColor} />
              <div
                className="w-full flex items-center gap-2 px-4 py-3"
                style={{ textAlign: 'left' }}
              >
                {/* Checkbox select-all do grupo */}
                {grupoCodigos.length > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (grupoAllSelected) deselectMany(grupoCodigos)
                      else selectMany(grupoCodigos)
                    }}
                    className="flex items-center justify-center cursor-pointer"
                    style={{ background: 'transparent', border: 'none', padding: 0 }}
                    title={grupoAllSelected ? 'Desmarcar todas deste grupo' : 'Selecionar todas deste grupo'}
                  >
                    {grupoAllSelected ? (
                      <CheckSquare size={13} style={{ color: t.purple }} />
                    ) : grupoSomeSelected ? (
                      <CheckSquare size={13} style={{ color: t.purple, opacity: 0.5 }} />
                    ) : (
                      <Square size={13} style={{ color: t.muted }} />
                    )}
                  </button>
                )}
                <button
                  onClick={() => toggleGroup(grupo)}
                  className="flex items-center gap-2 flex-1 cursor-pointer"
                  style={{ background: 'transparent', border: 'none', textAlign: 'left', fontFamily: 'inherit' }}
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
              </div>

              {isExpanded && (
                <div style={{ borderTop: `1px solid ${t.border}` }}>
                  {Object.entries(nivel2Map)
                    .sort(([, catsA], [, catsB]) => {
                      // Ordena subgrupos pelo menor codigo (primeira categoria)
                      // Cada cats[] ja vem ordenado por codigo do useMemo grouped
                      const codA = catsA[0]?.codigo || ''
                      const codB = catsB[0]?.codigo || ''
                      return codA.localeCompare(codB, undefined, { numeric: true })
                    })
                    .map(([nivel2, cats]) => {
                    const nivel2Codigos = cats.map((c) => c.codigo).filter(canEditCategoria)
                    const nivel2SelectedCount = nivel2Codigos.filter((c) => selectedCodigos.has(c)).length
                    const nivel2AllSelected = nivel2Codigos.length > 0 && nivel2SelectedCount === nivel2Codigos.length
                    const nivel2SomeSelected = nivel2SelectedCount > 0 && nivel2SelectedCount < nivel2Codigos.length
                    return (
                    <div key={nivel2}>
                      <div
                        className="px-5 py-2 text-[9px] uppercase tracking-wider font-mono flex items-center gap-2"
                        style={{
                          color: t.muted,
                          background: `${t.text}04`,
                          borderBottom: `1px solid ${t.border}`,
                        }}
                      >
                        {nivel2Codigos.length > 0 && (
                          <button
                            onClick={() => {
                              if (nivel2AllSelected) deselectMany(nivel2Codigos)
                              else selectMany(nivel2Codigos)
                            }}
                            className="flex items-center justify-center cursor-pointer"
                            style={{ background: 'transparent', border: 'none', padding: 0 }}
                            title={nivel2AllSelected ? 'Desmarcar todas' : 'Selecionar todas deste subgrupo'}
                          >
                            {nivel2AllSelected ? (
                              <CheckSquare size={11} style={{ color: t.purple }} />
                            ) : nivel2SomeSelected ? (
                              <CheckSquare size={11} style={{ color: t.purple, opacity: 0.5 }} />
                            ) : (
                              <Square size={11} style={{ color: t.muted }} />
                            )}
                          </button>
                        )}
                        <span>{nivel2}</span>
                      </div>
                      <table className="w-full text-[11px]">
                        <tbody>
                          {cats.map((cat) => {
                            const isEditing = editingCodigo === cat.codigo
                            const isSaving = savingCodigo === cat.codigo
                            const hasCustom = hasOverride(cat.codigo)
                            const canEdit = !!apiData && !!apiData[cat.codigo]
                            const isSelected = selectedCodigos.has(cat.codigo)
                            return (
                              <tr
                                key={cat.codigo}
                                className="transition-colors"
                                style={{
                                  borderBottom: `1px solid ${t.border}22`,
                                  background: isSelected ? `${t.purple}0A` : 'transparent',
                                }}
                                onMouseEnter={(e) => {
                                  if (!isSelected) e.currentTarget.style.background = t.surfaceHover
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = isSelected ? `${t.purple}0A` : 'transparent'
                                }}
                              >
                                <td className="pl-5 pr-1 py-2" style={{ width: 24 }}>
                                  {canEdit && (
                                    <button
                                      onClick={() => toggleSelect(cat.codigo)}
                                      className="flex items-center justify-center cursor-pointer"
                                      style={{ background: 'transparent', border: 'none', padding: 0 }}
                                    >
                                      {isSelected ? (
                                        <CheckSquare size={12} style={{ color: t.purple }} />
                                      ) : (
                                        <Square size={12} style={{ color: t.muted }} />
                                      )}
                                    </button>
                                  )}
                                </td>
                                <td
                                  className="pl-2 pr-3 py-2 font-mono text-[10px]"
                                  style={{ color: t.mutedDim, width: 80 }}
                                >
                                  {cat.codigo}
                                  {hasCustom && (
                                    <span
                                      className="ml-1 inline-flex px-1 rounded text-[7px] font-semibold align-middle"
                                      style={{
                                        background: `${t.purple}22`,
                                        color: t.purple,
                                        border: `1px solid ${t.purple}44`,
                                      }}
                                      title="Override manual aplicado para esta empresa"
                                    >
                                      CUSTOM
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-2" style={{ color: t.text }}>
                                  {cat.nome}
                                </td>
                                <td
                                  className="px-3 py-2 text-right font-mono text-[9px]"
                                  style={{ color: t.muted, width: 70 }}
                                >
                                  {cat.grupoDRE === 'NEUTRO' ? 'neutro' : cat.op === '+' ? 'entrada' : 'saída'}
                                </td>
                                <td className="px-3 py-2 text-right" style={{ width: 160, position: 'relative' }}>
                                  {!canEdit && (
                                    <span className="text-[8px]" style={{ color: t.mutedDim }} title="Sincronize da Omie para editar">
                                      não sincronizado
                                    </span>
                                  )}
                                  {canEdit && !isEditing && (
                                    <button
                                      onClick={() => setEditingCodigo(cat.codigo)}
                                      disabled={isSaving}
                                      className="flex items-center gap-1 px-2 py-0.5 rounded cursor-pointer transition-colors ml-auto"
                                      style={{
                                        background: 'transparent',
                                        border: `1px solid ${t.border}`,
                                        color: t.muted,
                                        fontSize: 9,
                                        fontFamily: 'inherit',
                                        opacity: isSaving ? 0.5 : 1,
                                      }}
                                      title="Alterar grupo DRE desta categoria"
                                    >
                                      <Pencil size={9} />
                                      {isSaving ? 'Salvando...' : 'Editar grupo'}
                                    </button>
                                  )}
                                  {canEdit && isEditing && (
                                    <div
                                      ref={editDropdownRef}
                                      className="absolute right-3 top-8 rounded-lg overflow-hidden z-40"
                                      style={{
                                        background: t.surfaceElevated,
                                        border: `1px solid ${t.borderHover}`,
                                        boxShadow: t.tooltipShadow,
                                        minWidth: 220,
                                      }}
                                    >
                                      <div
                                        className="px-3 py-2 text-[8px] uppercase tracking-wider flex items-center justify-between"
                                        style={{ color: t.muted, borderBottom: `1px solid ${t.border}` }}
                                      >
                                        <span>Mover para grupo DRE</span>
                                        <button
                                          onClick={() => setEditingCodigo(null)}
                                          className="cursor-pointer"
                                          style={{ color: t.muted, background: 'none', border: 'none' }}
                                        >
                                          <XIcon size={10} />
                                        </button>
                                      </div>
                                      {grupoOrder.map((g) => {
                                        const isCurrent = cat.grupoDRE === g
                                        const color = GRUPO_COLORS[g]
                                        return (
                                          <button
                                            key={g}
                                            onClick={() => handleSaveOverride(cat.codigo, g)}
                                            className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-[10px] cursor-pointer transition-colors"
                                            style={{
                                              background: isCurrent ? `${color}14` : 'transparent',
                                              border: 'none',
                                              color: isCurrent ? color : t.textSec,
                                              fontFamily: 'inherit',
                                            }}
                                          >
                                            {isCurrent ? (
                                              <Check size={11} style={{ color }} />
                                            ) : (
                                              <span style={{ width: 11 }} />
                                            )}
                                            <span
                                              className="inline-flex px-1.5 py-0.5 rounded text-[8px] font-mono font-semibold"
                                              style={{
                                                background: `${color}22`,
                                                color,
                                                border: `1px solid ${color}44`,
                                              }}
                                            >
                                              {g}
                                            </span>
                                            <span className="flex-1 truncate">{GRUPO_LABELS[g]}</span>
                                          </button>
                                        )
                                      })}
                                      {hasCustom && (
                                        <>
                                          <div style={{ height: 1, background: t.border }} />
                                          <button
                                            onClick={() => handleSaveOverride(cat.codigo, null)}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-left text-[9px] cursor-pointer"
                                            style={{
                                              background: 'transparent',
                                              border: 'none',
                                              color: t.muted,
                                              fontFamily: 'inherit',
                                            }}
                                          >
                                            <RefreshCw size={10} />
                                            <span>Remover override (usar padrão)</span>
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                    )
                  })}
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
