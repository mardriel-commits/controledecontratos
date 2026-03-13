import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApi } from '../lib/api'

export default function Login() {
  const api = useApi()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.login(email, password)
      nav('/')
    } catch (err) {
      setError(err?.message || 'Falha no login')
    } finally {
      setLoading(false)
    }
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
          <input className="input" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@sebrae.local" />

          <div className="small" style={{ margin: '12px 0 6px' }}>Senha</div>
          <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />

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
