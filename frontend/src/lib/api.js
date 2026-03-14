import { useAuth } from './auth'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const API = `${API_BASE}/api`

export function useApi() {
  const { token, setToken, user, setUser, logout: authLogout } = useAuth()

  async function request(path, options = {}) {
    const headers = { ...(options.headers || {}) }

    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    const res = await fetch(`${API}${path}`, {
      ...options,
      headers,
      credentials: 'include',
    })

    const data = await res.json().catch(() => null)

    if (res.status === 401) {
      setToken('')
      setUser(null)
      authLogout()
      throw new Error(data?.error || 'Não autenticado')
    }

    if (!res.ok) {
      throw new Error(data?.error || `Erro HTTP ${res.status}`)
    }

    return data
  }

  async function login(email, password) {
    const data = await request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    if (data?.access_token) {
      setToken(data.access_token)
    }

    try {
      const meRes = await fetch(`${API}/auth/me`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${data.access_token}`,
        },
        credentials: 'include',
      })

      const meData = await meRes.json().catch(() => null)

      if (meRes.ok) {
        setUser(meData)
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error('Erro ao buscar /auth/me após login:', error)
      setUser(null)
    }

    return data
  }

  async function logout() {
    try {
      await request('/auth/logout', { method: 'POST' })
    } catch (error) {
      console.warn('Erro ao chamar logout no backend:', error)
    } finally {
      setToken('')
      setUser(null)
      authLogout()
    }
  }

  return {
    API_BASE,
    user,
    request,
    login,
    logout,

    getContracts: () => request('/contracts'),
    getContract: (id) => request(`/contracts/${id}`),
    getMovements: (id) => request(`/contracts/${id}/movements`),

    createMovement: (id, payload) =>
      request(`/contracts/${id}/movements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),

    deleteMovement: (movementId, reason) =>
      request(`/movements/${movementId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      }),

    createContract: (payload) =>
      request('/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),

    getUsers: () => request('/users'),

    updateUser: (id, payload) =>
      request(`/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),

    getAudit: (params = '') => request(`/audit${params}`),
    getAlerts: () => request('/alerts'),
  }
}
