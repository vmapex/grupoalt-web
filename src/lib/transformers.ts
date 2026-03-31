/* ═══════════════════════════════════════════════════════════════
   Transformadores — API response → shapes dos componentes
   ═══════════════════════════════════════════════════════════════ */

import type { ExtratoAPI, SaldoAPI, LancamentoAPI, ConcilMovimentoAPI } from './types'
import type { ExtratoLancamento, ContaSaldo } from './mocks/extratoData'
import type { ContaPagarReceber } from './mocks/cpcrData'
import type { ConcilEntry } from './mocks/concilData'

const BANK_COLORS: Record<string, string> = {
  'itau': '#38BDF8',
  'itaú': '#38BDF8',
  'banco do brasil': '#34D399',
  'bb': '#34D399',
  'bradesco': '#FBBF24',
  'santander': '#F87171',
  'caixa': '#C084FC',
  'inter': '#FB923C',
  'nubank': '#C084FC',
}

function bankColor(banco: string | null): string {
  if (!banco) return '#64748B'
  const key = banco.toLowerCase()
  for (const [k, v] of Object.entries(BANK_COLORS)) {
    if (key.includes(k)) return v
  }
  return '#64748B'
}

/** Descobre nome curto do banco a partir da descrição da conta */
function bankName(descricao: string, banco: string | null): string {
  if (banco) {
    const num = banco.replace(/^0+/, '')
    const map: Record<string, string> = {
      '341': 'Itaú', '1': 'Banco do Brasil', '237': 'Bradesco',
      '33': 'Santander', '104': 'Caixa', '77': 'Inter', '260': 'Nubank',
    }
    if (map[num]) return map[num]
  }
  const desc = descricao.toLowerCase()
  if (desc.includes('itau') || desc.includes('itaú')) return 'Itaú'
  if (desc.includes('brasil') || desc.includes(' bb')) return 'Banco do Brasil'
  if (desc.includes('bradesco')) return 'Bradesco'
  if (desc.includes('santander')) return 'Santander'
  if (desc.includes('caixa')) return 'Caixa'
  if (desc.includes('inter')) return 'Inter'
  if (desc.includes('nubank')) return 'Nubank'
  return descricao.slice(0, 20)
}

// ── Extrato ───────────────────────────────────────────────────

export function transformExtrato(items: ExtratoAPI[], contas: Map<number, string>): ExtratoLancamento[] {
  return items.map((r) => ({
    data: r.data_lancamento || '',
    descricao: r.descricao || '',
    favorecido: r.favorecido || r.descricao || '',
    valor: r.valor,
    catCod: r.categoria || '',
    conciliado: r.conciliado,
    banco: r.banco || contas.get(r.conta_id ?? 0) || 'N/D',
  }))
}

// ── Saldos → ContaSaldo ───────────────────────────────────────

export function transformSaldos(items: SaldoAPI[]): ContaSaldo[] {
  return items.map((s) => {
    const nome = bankName(s.descricao, s.banco)
    return {
      nome: nome,
      saldo: s.saldo,
      cor: bankColor(nome),
    }
  })
}

// ── CP/CR → ContaPagarReceber ─────────────────────────────────

export function transformCPCR(items: LancamentoAPI[], tipo: 'CP' | 'CR'): ContaPagarReceber[] {
  return items.map((l) => ({
    fav: l.favorecido,
    valor: l.valor,
    valor_pago: l.valor_pago ?? 0,
    valor_aberto: l.valor_aberto ?? l.saldo,
    vcto: l.data_vcto || '',
    status: l.status as ContaPagarReceber['status'],
    cat: l.categoria || '',
    banco: '',
    pagamentos: (l.pagamentos || []).map((p) => ({
      data: p.data,
      valor: p.valor,
      desconto: p.desconto,
      juros: p.juros,
      multa: p.multa,
    })),
  }))
}

// ── Conciliação movimentação → ConcilEntry ────────────────────

export function transformConcilMovimento(items: ConcilMovimentoAPI[]): Record<string, ConcilEntry> {
  const data: Record<string, ConcilEntry> = {}
  for (const m of items) {
    data[m.data] = {
      date: m.data,
      extrato: m.extrato,
      saldoBanco: m.saldo_banco,
      dif: m.diferenca,
      conciliado: Math.abs(m.diferenca) < 0.01,
      banco: m.banco,
    }
  }
  return data
}

/** Build a Map<conta_id, bancoName> from contas + saldos */
export function buildContaMap(saldos: SaldoAPI[]): Map<number, string> {
  const map = new Map<number, string>()
  for (const s of saldos) {
    map.set(s.conta_id, bankName(s.descricao, s.banco))
  }
  return map
}
