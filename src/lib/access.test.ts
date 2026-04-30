import { describe, expect, it } from 'vitest'
import { safeInternalRoute } from './access'

describe('safeInternalRoute (Step 09)', () => {
  describe('rotas validas', () => {
    it.each([
      '/portal',
      '/portal/grupo',
      '/portal/financeiro/cp',
      '/bi/financeiro',
      '/bi/financeiro/caixa',
      '/bi/financeiro/admin/categorias',
      '/portal/grupo?tab=overview',
    ])('aceita %s', (route) => {
      expect(safeInternalRoute(route)).toBe(route)
    })

    it('faz trim de whitespace', () => {
      expect(safeInternalRoute('  /portal  ')).toBe('/portal')
    })
  })

  describe('rotas invalidas', () => {
    it.each([
      ['null', null],
      ['undefined', undefined],
      ['numero', 42],
      ['objeto', { route: '/portal' }],
      ['array', ['/portal']],
    ])('rejeita tipo nao-string (%s)', (_label, input) => {
      expect(safeInternalRoute(input)).toBeNull()
    })

    it.each([
      ['vazio', ''],
      ['so espaco', '   '],
      ['relativo sem barra', 'portal/grupo'],
      ['protocol-relative', '//evil.com/portal'],
      ['fora da allowlist', '/dashboard'],
      ['raiz pura', '/'],
      ['admin geral', '/admin'],
    ])('rejeita rota %s', (_label, input) => {
      expect(safeInternalRoute(input)).toBeNull()
    })

    it.each([
      'http://evil.com/portal',
      'https://evil.com/portal',
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      '/portal?next=https://evil.com',
      '/portal#javascript:alert(1)',
      '/portal/data:text/html',
    ])('rejeita esquema perigoso: %s', (input) => {
      expect(safeInternalRoute(input)).toBeNull()
    })
  })

  describe('cobertura de prefixo', () => {
    it('aceita prefixo exato', () => {
      expect(safeInternalRoute('/portal')).toBe('/portal')
      expect(safeInternalRoute('/bi/financeiro')).toBe('/bi/financeiro')
    })

    it('rejeita prefixo parcial que nao bate em segmento', () => {
      // /portal-fake nao casa com /portal mesmo comecando com as letras
      expect(safeInternalRoute('/portal-fake/leak')).toBeNull()
      expect(safeInternalRoute('/bi/financeiro-fake')).toBeNull()
    })
  })
})
