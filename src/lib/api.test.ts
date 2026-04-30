import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import MockAdapter from 'axios-mock-adapter'
import api, { __testing } from './api'

const mock = new MockAdapter(api)

const originalLocation = window.location

function mockWindowLocation(pathname = '/portal'): { href: string } {
  const stub = { href: '', pathname }
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: stub,
  })
  return stub
}

function restoreWindowLocation(): void {
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: originalLocation,
  })
}

beforeEach(() => {
  __testing.reset()
  mock.reset()
})

afterEach(() => {
  restoreWindowLocation()
})

describe('api auth interceptor', () => {
  describe('401 handling — refresh com sucesso', () => {
    it('retenta a request original após refresh bem sucedido', async () => {
      mockWindowLocation()
      mock.onGet('/data').replyOnce(401).onGet('/data').replyOnce(200, { ok: true })
      mock.onPost('/auth/refresh').replyOnce(200)

      const res = await api.get('/data')

      expect(res.status).toBe(200)
      expect(res.data).toEqual({ ok: true })
      expect(mock.history.post.filter((c) => c.url === '/auth/refresh')).toHaveLength(1)
    })

    it('dispara apenas um refresh quando duas requests caem em 401 simultaneamente', async () => {
      mockWindowLocation()
      mock.onGet('/a').replyOnce(401).onGet('/a').replyOnce(200, { a: 1 })
      mock.onGet('/b').replyOnce(401).onGet('/b').replyOnce(200, { b: 2 })
      mock.onPost('/auth/refresh').replyOnce(200)

      const [resA, resB] = await Promise.all([api.get('/a'), api.get('/b')])

      expect(resA.data).toEqual({ a: 1 })
      expect(resB.data).toEqual({ b: 2 })
      expect(mock.history.post.filter((c) => c.url === '/auth/refresh')).toHaveLength(1)
      expect(__testing.pendingCount).toBe(0)
    })
  })

  describe('401 handling — refresh falha', () => {
    it('rejeita a request original e redireciona para /login quando refresh falha', async () => {
      const stub = mockWindowLocation()
      mock.onGet('/data').replyOnce(401)
      mock.onPost('/auth/refresh').replyOnce(401)

      await expect(api.get('/data')).rejects.toBeDefined()

      expect(stub.href).toBe('/login')
    })

    it('rejeita todas as requests pendentes quando refresh falha', async () => {
      mockWindowLocation()
      mock.onGet('/a').replyOnce(401)
      mock.onGet('/b').replyOnce(401)
      mock.onPost('/auth/refresh').replyOnce(401)

      const results = await Promise.allSettled([api.get('/a'), api.get('/b')])

      expect(results[0].status).toBe('rejected')
      expect(results[1].status).toBe('rejected')
      expect(__testing.pendingCount).toBe(0)
    })

    it('não redireciona se já está em /login', async () => {
      const stub = mockWindowLocation('/login')
      mock.onGet('/data').replyOnce(401)
      mock.onPost('/auth/refresh').replyOnce(401)

      await expect(api.get('/data')).rejects.toBeDefined()

      expect(stub.href).toBe('')
    })

    it('só redireciona uma vez mesmo quando vários refresh falham seguidos', async () => {
      const stub = mockWindowLocation()
      mock.onGet('/a').reply(401)
      mock.onPost('/auth/refresh').reply(401)

      await expect(api.get('/a')).rejects.toBeDefined()
      stub.href = '' // simula que o redirect ainda não navegou
      await expect(api.get('/a')).rejects.toBeDefined()

      expect(stub.href).toBe('')
    })
  })

  describe('endpoints excluídos do refresh', () => {
    it.each(['/auth/login', '/auth/refresh', '/auth/logout'])(
      'não dispara refresh quando %s retorna 401',
      async (endpoint) => {
        mockWindowLocation()
        mock.onPost(endpoint).replyOnce(401)
        mock.onPost('/auth/refresh').reply(() => {
          throw new Error('refresh deveria ser ignorado')
        })

        await expect(api.post(endpoint)).rejects.toBeDefined()

        const refreshCalls = mock.history.post.filter((c) => c.url === '/auth/refresh')
        expect(refreshCalls).toHaveLength(endpoint === '/auth/refresh' ? 1 : 0)
      }
    )
  })

  describe('403 — sem permissão', () => {
    it('propaga 403 sem tentar refresh nem redirecionar', async () => {
      const stub = mockWindowLocation()
      mock.onGet('/forbidden').replyOnce(403, { detail: 'sem permissao' })
      mock.onPost('/auth/refresh').reply(() => {
        throw new Error('refresh não deveria rodar para 403')
      })

      await expect(api.get('/forbidden')).rejects.toMatchObject({
        response: { status: 403 },
      })
      expect(stub.href).toBe('')
      expect(mock.history.post.filter((c) => c.url === '/auth/refresh')).toHaveLength(0)
    })
  })

  describe('proteção contra loop', () => {
    it('não tenta refresh duas vezes na mesma request (_retry)', async () => {
      mockWindowLocation()
      mock.onGet('/data').reply(401)
      mock.onPost('/auth/refresh').replyOnce(200)

      await expect(api.get('/data')).rejects.toMatchObject({
        response: { status: 401 },
      })
      expect(mock.history.post.filter((c) => c.url === '/auth/refresh')).toHaveLength(1)
    })
  })

  describe('SSR safety', () => {
    it('não quebra quando window é undefined no momento do redirect', async () => {
      const win = window
      // @ts-expect-error simulando ambiente sem window
      delete globalThis.window
      mock.onGet('/data').replyOnce(401)
      mock.onPost('/auth/refresh').replyOnce(401)

      try {
        await expect(api.get('/data')).rejects.toBeDefined()
      } finally {
        globalThis.window = win
      }
    })
  })

  describe('outros status', () => {
    it('propaga 500 sem mexer na auth', async () => {
      const stub = mockWindowLocation()
      mock.onGet('/oops').replyOnce(500, { detail: 'boom' })

      await expect(api.get('/oops')).rejects.toMatchObject({
        response: { status: 500 },
      })
      expect(stub.href).toBe('')
    })
  })
})
