import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(localStorage.getItem('access_token') || '')
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  function setToken(t) {
    const value = t || ''
    setTokenState(value)

    if (value) {
      localStorage.setItem('access_token', value)
    } else {
      localStorage.removeItem('access_token')
    }
  }

  function logout() {
    setToken('')
    setUser(null)
  }

  useEffect(() => {
    async function restoreSession() {
      if (!token) {
        setLoading(false)
        return
      }

      try {
        const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'
        const res = await fetch(`${API_BASE}/api/auth/me`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          credentials: 'include',
        })

        const data = await res.json().catch(() => null)

        if (!res.ok) {
          logout()
          return
        }

        setUser(data)
      } catch (error) {
        console.error('Erro ao restaurar sessão:', error)
        logout()
      } finally {
        setLoading(false)
      }
    }

    restoreSession()
  }, [token])

  const value = useMemo(
    () => ({
      token,
      setToken,
      user,
      setUser,
      logout,
      loading,
      isAuthenticated: !!token && !!user,
    }),
    [token, user, loading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
