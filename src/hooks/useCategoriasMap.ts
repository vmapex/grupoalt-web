'use client'
/**
 * Hook unificado para o plano de contas da empresa ativa.
 *
 * Retorna:
 *  - `map`: Record<codigo, CategoriaInfo> efetivo (API > fallback estático)
 *  - `getGrupo(codigo)`: resolve grupo DRE (override manual > prefixo > null)
 *  - `getNome(codigo)`: descrição da categoria (API > CAT_DESC estático > código cru)
 *  - `getNivel2(codigo)`: label do subgrupo (API > CATEGORIAS estático > código cru)
 *  - `loading`, `refetch`
 *
 * Refetch automático quando a aba volta a ser visível — pega overrides feitos
 * em outras abas sem precisar dar F5.
 */
import { useEffect, useMemo, useRef } from 'react'
import { useCategorias } from './useAPI'
import {
  CATEGORIAS,
  buildCategoriasFromAPI,
  getGrupoDRE,
  type CategoriaInfo,
} from '@/lib/planoContas'
import { getCatDesc } from '@/lib/mocks/extratoData'

export interface UseCategoriasMapResult {
  map: Record<string, CategoriaInfo>
  getGrupo: (codigo: string | null | undefined) => string | null
  getNome: (codigo: string | null | undefined) => string
  getNivel2: (codigo: string | null | undefined) => string
  loading: boolean
  refetch: () => void
  isDynamic: boolean
}

export function useCategoriasMap(empresaId: number | null): UseCategoriasMapResult {
  const { data: apiData, loading, refetch } = useCategorias(empresaId)

  // Auto-refetch quando a aba volta a ficar visível
  const refetchRef = useRef(refetch)
  refetchRef.current = refetch
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible') {
        refetchRef.current()
      }
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [])

  const isDynamic = !!apiData && Object.keys(apiData).length > 0

  const map = useMemo<Record<string, CategoriaInfo>>(() => {
    if (isDynamic) {
      return buildCategoriasFromAPI(apiData!)
    }
    return CATEGORIAS
  }, [apiData, isDynamic])

  const getGrupo = useMemo(() => {
    return (codigo: string | null | undefined): string | null => {
      if (!codigo) return null
      const entry = map[codigo]
      if (entry) return entry.grupoDRE
      return getGrupoDRE(codigo)
    }
  }, [map])

  const getNome = useMemo(() => {
    return (codigo: string | null | undefined): string => {
      if (!codigo) return ''
      return map[codigo]?.nome || getCatDesc(codigo)
    }
  }, [map])

  const getNivel2 = useMemo(() => {
    return (codigo: string | null | undefined): string => {
      if (!codigo) return ''
      return map[codigo]?.nivel2 || getCatDesc(codigo) || codigo
    }
  }, [map])

  return { map, getGrupo, getNome, getNivel2, loading, refetch, isDynamic }
}
