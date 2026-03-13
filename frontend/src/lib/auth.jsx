import React, { createContext, useContext, useMemo, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(localStorage.getItem('access_token') || '')
  const [user, setUser] = useState(null)

  function setToken(t) {
    const v = t || ''
    setTokenState(v)
    if (v) localStorage.setItem('access_token', v)
    else localStorage.removeItem('access_token')
  }

  function logout() {
    setToken('')
    setUser(null)
  }

  const value = useMemo(() => ({ token, setToken, user, setUser, logout }), [token, user])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
