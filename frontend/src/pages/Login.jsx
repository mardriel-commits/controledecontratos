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
      setError(err?.message || 'Não foi possível iniciar a sessão.')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="container" style={{ maxWidth: 520, paddingTop: 60 }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="h2">Aguarde</div>
          <div className="small" style={{ marginTop: 8 }}>
            Verificando as informações de acesso.
          </div>
        </div>
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />
  }

  return (
    <div className="container" style={{ maxWidth: 560, paddingTop: 48 }}>
      <div className="card" style={{ padding: 24 }}>
        <div className="brand" style={{ marginBottom: 18 }}>
          <div className="logo" />
          <div>
            <div className="h1">Gestão de Contratos</div>
            <div className="small">Acesso ao ambiente administrativo</div>
          </div>
        </div>

        <div className="notice notice-info" style={{ marginBottom: 16 }}>
          Utilize suas credenciais para acessar o sistema.
        </div>

        <form onSubmit={submit}>
          <div className="panel">
            <div className="section-title">Identificação</div>

            <div className="form-grid">
              <div className="form-full">
                <div className="label">E-mail</div>
                <input
                  className="input"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="usuario@instituicao.com"
                />
              </div>

              <div className="form-full">
                <div className="label">Senha</div>
                <input
                  className="input"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Informe sua senha"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="notice notice-error" style={{ marginTop: 14 }}>
              {error}
            </div>
          )}

          <div className="actions" style={{ marginTop: 16 }}>
            <button className="btn" disabled={loading}>
              {loading ? 'Entrando...' : 'Acessar sistema'}
            </button>
          </div>
        </form>

        <div className="small" style={{ marginTop: 16 }}>
          Ambiente conectado à API: {api.API_BASE}
        </div>
      </div>
    </div>
  )
}
