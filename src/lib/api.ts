import axios from 'axios'

const api = axios.create({
  baseURL: '/api/proxy/v1',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

let isRefreshing = false
let pendingRequests: (() => void)[] = []

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const originalRequest = error.config

    // Não interceptar a própria request de refresh (evita loop infinito)
    if (originalRequest.url?.includes('/auth/refresh')) {
      return Promise.reject(error)
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingRequests.push(() => {
            resolve(api(originalRequest))
          })
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        await api.post('/auth/refresh')
        pendingRequests.forEach((cb) => cb())
        pendingRequests = []
        return api(originalRequest)
      } catch {
        pendingRequests = []
        window.location.href = '/login'
        return Promise.reject(error)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default api
