/* Espelho client-side do `excede_teto` (grupoalt-api/app/services/
   motor_perfil.py) — decide o aviso de SSO rebaixado/bloqueado na
   MotorAcessoSection. Divergir do backend = aviso mentiroso. */
import { describe, expect, it } from 'vitest'
import { ssoRebaixado } from './useMotorAcesso'

describe('ssoRebaixado', () => {
  it('teto NENHUM rebaixa qualquer perfil (SSO bloqueado)', () => {
    expect(ssoRebaixado('ANALISTA', 'NENHUM')).toBe(true)
    expect(ssoRebaixado('ADM', 'NENHUM')).toBe(true)
    expect(ssoRebaixado('EMISSOR_CTE', 'NENHUM')).toBe(true)
  })

  it('perfil acima do teto = rebaixado; dentro do teto = preservado', () => {
    expect(ssoRebaixado('OPERADOR', 'ANALISTA')).toBe(true)
    expect(ssoRebaixado('ADM', 'GESTOR_FECHAMENTO')).toBe(true)
    expect(ssoRebaixado('ANALISTA', 'ANALISTA')).toBe(false)
    expect(ssoRebaixado('OPERADOR', 'GESTOR_FECHAMENTO')).toBe(false)
    expect(ssoRebaixado('ADM', 'ADM')).toBe(false)
  })

  it('EMISSOR_CTE é papel sob demanda — nunca excede com teto ≥ leitura', () => {
    expect(ssoRebaixado('EMISSOR_CTE', 'ANALISTA')).toBe(false)
    expect(ssoRebaixado('EMISSOR_CTE', 'ADM')).toBe(false)
  })

  it('perfil desconhecido é tratado como excesso (fail-closed)', () => {
    expect(ssoRebaixado('SUPREMO', 'ADM')).toBe(true)
  })
})
