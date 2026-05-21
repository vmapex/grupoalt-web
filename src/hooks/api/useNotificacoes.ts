'use client'
import { useApi } from './_core'
import api from '@/lib/api'
import type { NotificacaoAPI } from '@/lib/types'

export function useNotificacoes(limit?: number) {
  return useApi<NotificacaoAPI[]>('/notificacoes', { limit: limit ?? 50 })
}

export function useNotificacoesContagem() {
  return useApi<{ nao_lidas: number }>('/notificacoes/contagem')
}

export async function marcarNotificacaoLida(id: number) {
  return api.patch(`/notificacoes/${id}/ler`)
}

export async function marcarTodasLidas() {
  return api.post('/notificacoes/ler-todas')
}
