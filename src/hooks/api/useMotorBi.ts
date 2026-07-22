/* ═══════════════════════════════════════════════════════════════
   Fase D — BI executivo do Motor de Fechamento.

   Consome GET /motor/bi/executivo (proxy do portal-api sobre o
   /api/bi/executivo do Motor, cache Redis 5min). Gate no backend:
   fechamento:bi — a UI espelha com PermissionGate/Sidebar require.

   Tipos espelham BiExecutivoResult do motor-api
   (src/domain/bi/executivo.ts) + meta do router.
   ═══════════════════════════════════════════════════════════════ */
import { useApi } from './_core'

export interface MotorBiSerieMesAPI {
  mes: number
  faturamento: number
  custo: number
  margem: number
  cabecas: number
  km: number
  viagens: number
  /** Mês corrente do servidor — dados ainda entrando, não comparar. */
  parcial: boolean
}

export interface MotorBiGrupoAPI {
  chave: number | null
  label: string
  faturamento: number
  custo: number
  margem: number
  cabecas: number
  viagens: number
}

export interface MotorBiExecutivoAPI {
  meta: {
    ano: number
    hoje: string
    server_time: string
    unidade_id: number | null
  }
  kpis: {
    faturamento: number
    custo: number
    margem: number
    margem_pct: number
    custo_pct: number
    ticket_medio_viagem: number
    rs_km: number
    rs_cabeca: number
    custo_km: number
    custo_cabeca: number
    cabecas: number
    km: number
    viagens: number
  }
  serie_mensal: MotorBiSerieMesAPI[]
  serie_mensal_ano_anterior: MotorBiSerieMesAPI[]
  totais_ano_anterior: {
    faturamento: number
    custo: number
    cabecas: number
    km: number
    viagens: number
  }
  por_unidade: MotorBiGrupoAPI[]
  por_cliente: MotorBiGrupoAPI[]
  por_tipo_veiculo: MotorBiGrupoAPI[]
}

export function useMotorBiExecutivo(params: { ano?: number; unidade_id?: number | null }) {
  const clean: Record<string, number> = {}
  if (params.ano) clean.ano = params.ano
  if (params.unidade_id) clean.unidade_id = params.unidade_id
  return useApi<MotorBiExecutivoAPI>('/motor/bi/executivo', clean)
}
