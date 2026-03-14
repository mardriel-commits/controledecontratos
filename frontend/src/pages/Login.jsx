import React, { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useApi } from '../lib/api'
import { useAuth } from '../lib/auth'

export default function Login() {
  const api = useApi()
  const { loading: authLoading, isAuthenticated } = useAuth()
  const nav = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const redirectTo = location.state?.from?.pathname || '/'

  async function submit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await api.login(email, password)
      nav(redirectTo, { replace: true })
    } catch (err) {
      setError(err?.message || 'Falha no login')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="container" style={{ maxWidth: 520 }}>
        <div className="card" style={{ marginTop: 12, textAlign: 'center' }}>
          Carregando...
        </div>
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />
  }

  return (
    <div className="container" style={{ maxWidth: 520 }}>
      <div className="topbar">
        <div className="brand">
          <div className="logo" />
          <div>
            <div className="h1">Gestão de Contratos</div>
            <div className="small">Acesso restrito • Login local</div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 900, marginBottom: 12 }}>Entrar</div>

        <form onSubmit={submit}>
          <div className="small" style={{ marginBottom: 6 }}>E-mail</div>
          <input
            className="input"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="admin@sebrae.local"
          />

          <div className="small" style={{ margin: '12px 0 6px' }}>Senha</div>
          <input
            className="input"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
          />

          {error && (
            <div style={{ marginTop: 10, fontSize: 13, fontWeight: 800, color: '#b42318' }}>
              {error}
            </div>
          )}

          <button className="btn" style={{ marginTop: 14, width: '100%' }} disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="small" style={{ marginTop: 10 }}>
          API: {api.API_BASE}
        </div>
      </div>
    </div>
  )
}
