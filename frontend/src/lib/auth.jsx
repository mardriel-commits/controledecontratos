import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(localStorage.getItem('access_token') || '')
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  function setToken(t) {
    const v = t || ''
    setTokenState(v)

    if (v) {
      localStorage.setItem('access_token', v)
    } else {
      localStorage.removeItem('access_token')
    }
  }

  function logout() {
    setToken('')
    setUser(null)
  }

  async function fetchMe(currentToken) {
    try {
      const response = await api.get('/auth/me', {
        headers: {
          Authorization: `Bearer ${currentToken}`,
        },
      })

      setUser(response.data)
    } catch (error) {
      console.error('Erro ao buscar usuário logado:', error)
      logout()
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) {
      fetchMe(token)
    } else {
      setLoading(false)
    }
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
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
