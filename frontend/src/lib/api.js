import { useAuth } from './auth'

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000')
const API = API_BASE + '/api'

export function useApi() {
  const { token, setToken, user, setUser, logout } = useAuth()

  async function request(path, options = {}) {
    const headers = { ...(options.headers || {}) }
    if (token) headers.Authorization = `Bearer ${token}`

    const res = await fetch(`${API}${path}`, {
      ...options,
      headers,
      credentials: 'include',
    })

    if (res.status === 401) {
      // token inválido/expirado: derruba para login (refresh automático pode ser adicionado depois)
      setToken('')
      logout()
      const err = await res.json().catch(() => ({}))
      throw new Error(err?.error || 'Não autenticado')
    }

    const data = await res.json().catch(() => null)
    if (!res.ok) {
      throw new Error(data?.error || `Erro HTTP ${res.status}`)
    }
    return data
  }

  return {
    API_BASE,
    request,
    login: async (email, password) => {
      const data = await request('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      setToken(data.access_token)
      try {
        const me = await request('/auth/me')
        setUser(me)
      } catch {}
      return data
    },
    logout: async () => {
      try { await request('/auth/logout', { method: 'POST' }) } catch {}
      setToken('')
      logout()
    },
    getContracts: () => request('/contracts'),
    getContract: (id) => request(`/contracts/${id}`),
    getMovements: (id) => request(`/contracts/${id}/movements`),
    createMovement: (id, payload) => request(`/contracts/${id}/movements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
    createContract: (payload) => request('/contracts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
    getUsers: () => request('/users'),
    updateUser: (id, payload) => request(`/users/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)}),
    deleteMovement: (movementId, reason) => request(`/movements/${movementId}`, { method:'DELETE', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ reason })}),
    getAudit: (params='') => request(`/audit${params}`),
    getAlerts: () => request('/alerts'),
    
    getUsers: () => request('/users'),
  }
}
