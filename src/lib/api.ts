import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { storage } from './storage'
import { config } from './config'

const api = axios.create({
  baseURL: config.apiBaseUrl,
  headers: { 'Content-Type': 'application/json' },
})

let refreshPromise: Promise<string> | null = null

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const isAuthRequest =
    config.url?.includes('/auth/login') ||
    config.url?.includes('/auth/google') ||
    config.url?.includes('/auth/refresh')
  if (!isAuthRequest && storage.isSessionReplaced()) {
    window.location.replace('/login?reason=session-replaced')
    return Promise.reject(new axios.CanceledError('SESSION_REPLACED'))
  }
  const token = storage.getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    // Don't retry auth/login or auth/refresh endpoints
    if (
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/google') ||
      originalRequest.url?.includes('/auth/refresh')
    ) {
      return Promise.reject(error)
    }

    // Only an explicit registration response may open the registration flow.
    if (error.response?.status === 403) {
      const data = error.response.data
      const errCode = typeof data === 'string' ? data : (data as Record<string, unknown>)?.error ?? (data as Record<string, unknown>)?.message ?? ''
      if (errCode === 'REGISTRATION_INCOMPLETE') {
        const currentPath = window.location.pathname
        if (currentPath !== '/register') {
          window.location.href = '/register'
        }
        return Promise.reject(error)
      }
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const newToken = await refreshAccessToken()
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return api(originalRequest)
      } catch {
        storage.clearSession()
        window.location.replace('/login')
        return Promise.reject(error)
      }
    }

    return Promise.reject(error)
  }
)

async function refreshAccessToken(): Promise<string> {
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    const refreshToken = storage.getRefreshToken()
    if (!refreshToken) throw new Error('No refresh token')

    const { data } = await axios.post(`${config.apiBaseUrl}/api/auth/refresh`, { refreshToken })

    const newToken = data?.token ?? data?.jwt ?? data?.accessToken ?? data?.access_token
    const newRefreshToken = data?.refreshToken ?? data?.refresh_token
    const expiresAt = data?.accessTokenExpiresAtUtc ?? data?.access_token_expires_at_utc ?? ''

    if (!newToken || !newRefreshToken) {
      throw new Error('Invalid refresh response')
    }

    storage.setToken(newToken)
    storage.setRefreshToken(newRefreshToken)
    storage.setAccessTokenExpiresAtUtc(expiresAt)

    if (data?.user) storage.setUser(data.user)

    return newToken
  })()

  try {
    return await refreshPromise
  } finally {
    refreshPromise = null
  }
}

export const apiService = {
  get: <T = unknown>(url: string) => api.get<T>(url).then((r) => r.data),
  post: <T = unknown>(url: string, body?: unknown) => api.post<T>(url, body).then((r) => r.data),
  put: <T = unknown>(url: string, body?: unknown) => api.put<T>(url, body).then((r) => r.data),
  patch: <T = unknown>(url: string, body?: unknown) => api.patch<T>(url, body).then((r) => r.data),
  del: <T = unknown>(url: string) => api.delete<T>(url).then((r) => r.data),
  postForm: <T = unknown>(url: string, formData: FormData) =>
    api.post<T>(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data),
  getBlob: (url: string) => api.get(url, { responseType: 'blob' }).then((r) => r.data),
}

export default api
