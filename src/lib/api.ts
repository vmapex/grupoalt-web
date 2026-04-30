import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios'

interface RetryableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

interface PendingRequest {
  resolve: (value: AxiosResponse | Promise<AxiosResponse>) => void
  reject: (reason?: unknown) => void
  config: RetryableConfig
}

const AUTH_ENDPOINTS_NO_REFRESH = ['/auth/login', '/auth/refresh', '/auth/logout']

const api = axios.create({
  baseURL: '/api/proxy/v1',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
  // FastAPI espera repeat format pra Query(List[str]): ?k=a&k=b (sem []).
  paramsSerializer: {
    indexes: null,
  },
})

let isRefreshing = false
let pendingRequests: PendingRequest[] = []
let isRedirectingToLogin = false

function shouldSkipRefresh(url?: string): boolean {
  if (!url) return false
  return AUTH_ENDPOINTS_NO_REFRESH.some((endpoint) => url.includes(endpoint))
}

function redirectToLogin(): void {
  if (typeof window === 'undefined') return
  if (isRedirectingToLogin) return
  if (window.location.pathname.startsWith('/login')) return
  isRedirectingToLogin = true
  window.location.href = '/login'
}

function flushPendingRequests(error: unknown | null): void {
  const queue = pendingRequests
  pendingRequests = []
  if (error) {
    queue.forEach(({ reject }) => reject(error))
    return
  }
  queue.forEach(({ resolve, config }) => {
    resolve(api(config))
  })
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableConfig | undefined

    if (!originalRequest) {
      return Promise.reject(error)
    }

    const status = error.response?.status

    // Não tentar refresh para os próprios endpoints de auth (evita loop).
    if (shouldSkipRefresh(originalRequest.url)) {
      return Promise.reject(error)
    }

    // 403 = autenticado mas sem permissão. Não tenta refresh; propaga o erro
    // para a UI tratar (mensagem de "sem permissão"), evitando logout indevido.
    if (status === 403) {
      return Promise.reject(error)
    }

    if (status !== 401) {
      return Promise.reject(error)
    }

    // Já tentamos retry nessa request — não loopa.
    if (originalRequest._retry) {
      return Promise.reject(error)
    }

    // Já fomos para tela de login; não tenta refresh nem enfileira.
    if (isRedirectingToLogin) {
      return Promise.reject(error)
    }

    // Refresh em andamento: enfileira para reexecutar quando terminar.
    if (isRefreshing) {
      return new Promise<AxiosResponse>((resolve, reject) => {
        pendingRequests.push({
          resolve,
          reject,
          config: { ...originalRequest, _retry: true } as RetryableConfig,
        })
      })
    }

    originalRequest._retry = true
    isRefreshing = true

    try {
      await api.post('/auth/refresh')
      flushPendingRequests(null)
      return api(originalRequest)
    } catch (refreshError) {
      flushPendingRequests(refreshError)
      redirectToLogin()
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  }
)

// Helpers expostos para testes — não usar em código de produção.
export const __testing = {
  reset(): void {
    isRefreshing = false
    pendingRequests = []
    isRedirectingToLogin = false
  },
  get pendingCount(): number {
    return pendingRequests.length
  },
}

export default api
