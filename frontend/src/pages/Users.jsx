import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApi } from '../lib/api'
import { useAuth } from '../lib/auth'
import FeedbackMessage from '../components/FeedbackMessage'
import PageLoader from '../components/PageLoader'
import EmptyState from '../components/EmptyState'

function roleLabel(role) {
  if (role === 'ADMIN') return 'Administrador'
  if (role === 'GESTOR') return 'Gestor'
  if (role === 'FISCAL') return 'Fiscal'
  if (role === 'CONSULTA') return 'Consulta'
  return role || '—'
}

export default function Users() {
  const api = useApi()
  const { user } = useAuth()

  const isAdmin = user?.role === 'ADMIN'

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState('info')
  const [q, setQ] = useState('')

  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'CONSULTA',
    password: '',
    active: true,
  })

  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({
    name: '',
    role: 'CONSULTA',
    password: '',
    active: true,
  })

  async function load() {
    setLoading(true)
    setMsg('')
    try {
      const j = await api.getUsers()
      setRows(Array.isArray(j) ? j : [])
    } catch (e) {
      setMsgType('error')
      setMsg(e.message || 'Não foi possível carregar os usuários.')
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAdmin) load()
  }, [isAdmin])

  function resetNewUser() {
    setNewUser({
      name: '',
      email: '',
      role: 'CONSULTA',
      password: '',
      active: true,
    })
  }

  function validateNewUser() {
    if (!newUser.name.trim()) return 'Informe o nome do usuário.'
    if (!newUser.email.trim()) return 'Informe o e-mail do usuário.'
    if (!newUser.role) return 'Informe o perfil de acesso.'
    return ''
  }

  async function submitNewUser(e) {
    e.preventDefault()
    setMsg('')

    const validationError = validateNewUser()
    if (validationError) {
      setMsgType('error')
      setMsg(validationError)
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: newUser.name.trim(),
        email: newUser.email.trim(),
        role: newUser.role,
        password: newUser.password.trim() || undefined,
        active: !!newUser.active,
      }

      await api.createUser(payload)
      setMsgType('success')
      setMsg('Usuário cadastrado com sucesso.')
      resetNewUser()
      await load()
    } catch (e) {
      setMsgType('error')
      setMsg(e.message || 'Não foi possível cadastrar o usuário.')
    } finally {
      setSaving(false)
    }
  }

  function startEdit(row) {
    setEditingId(row.id)
    setEditForm({
      name: row.name || '',
      role: row.role || 'CONSULTA',
      password: '',
      active: !!row.active,
    })
    setMsg('')
  }

  function cancelEdit() {
    setEditingId(null)
    setEditForm({
      name: '',
      role: 'CONSULTA',
      password: '',
      active: true,
    })
  }

  async function saveEdit(id) {
    setMsg('')
    if (!editForm.name.trim()) {
      setMsgType('error')
      setMsg('Informe o nome do usuário.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: editForm.name.trim(),
        role: editForm.role,
        active: !!editForm.active,
      }

      if (editForm.password.trim()) {
        payload.password = editForm.password.trim()
      }

      await api.updateUser(id, payload)
      setMsgType('success')
      setMsg('Usuário atualizado com sucesso.')
      cancelEdit()
      await load()
    } catch (e) {
      setMsgType('error')
      setMsg(e.message || 'Não foi possível atualizar o usuário.')
    } finally {
      setSaving(false)
    }
  }

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return rows

    return rows.filter(r =>
      (r.name || '').toLowerCase().includes(s) ||
      (r.email || '').toLowerCase().includes(s) ||
      (r.role || '').toLowerCase().includes(s)
    )
  }, [rows, q])

  if (!isAdmin) {
    return (
      <div className="container">
        <div className="topbar">
          <div className="brand">
            <div className="logo" />
            <div>
              <div className="h1">Gestão de usuários</div>
              <div className="small">Acesso restrito</div>
            </div>
          </div>
          <Link className="btn btn-secondary" to="/">Voltar</Link>
        </div>

        <FeedbackMessage type="info">
          Esta área está disponível somente para perfis administrativos.
        </FeedbackMessage>
      </div>
    )
  }

  if (loading && rows.length === 0) {
    return (
      <div className="container">
        <div className="topbar">
          <div className="brand">
            <div className="logo" />
            <div>
              <div className="h1">Gestão de usuários</div>
              <div className="small">Administração de acessos</div>
            </div>
          </div>
          <Link className="btn btn-secondary" to="/">Voltar</Link>
        </div>

        <PageLoader
          title="Carregando usuários"
          subtitle="Os dados estão sendo preparados para consulta."
        />
      </div>
    )
  }

  return (
    <div className="container">
      <div className="topbar">
        <div className="brand">
          <div className="logo" />
          <div>
            <div className="h1">Gestão de usuários</div>
            <div className="small">Administração de perfis de acesso ao sistema</div>
          </div>
        </div>

        <div className="actions">
          <button className="btn btn-secondary" onClick={load} disabled={loading}>
            {loading ? 'Atualizando...' : 'Atualizar dados'}
          </button>
          <Link className="btn btn-secondary" to="/">Voltar</Link>
        </div>
      </div>

      <FeedbackMessage type={msgType} style={{ marginBottom: 16 }}>
        {msg}
      </FeedbackMessage>

      <div className="grid">
        <div className="stack">
          <div className="card">
            <div className="h2" style={{ marginBottom: 12 }}>Novo usuário</div>
            <div className="small" style={{ marginBottom: 14 }}>
              Cadastre novos usuários e defina o perfil de acesso correspondente.
            </div>

            <form onSubmit={submitNewUser}>
              <div className="panel" style={{ marginBottom: 14 }}>
                <div className="section-title">Dados de acesso</div>
                <div className="form-grid">
                  <div className="form-full">
                    <div className="label">Nome</div>
                    <input
                      className="input"
                      value={newUser.name}
                      onChange={e => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>

                  <div className="form-full">
                    <div className="label">E-mail</div>
                    <input
                      className="input"
                      type="email"
                      value={newUser.email}
                      onChange={e => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>

                  <div>
                    <div className="label">Perfil</div>
                    <select
                      className="input"
                      value={newUser.role}
                      onChange={e => setNewUser(prev => ({ ...prev, role: e.target.value }))}
                    >
                      <option value="ADMIN">Administrador</option>
                      <option value="GESTOR">Gestor</option>
                      <option value="FISCAL">Fiscal</option>
                      <option value="CONSULTA">Consulta</option>
                    </select>
                  </div>

                  <div>
                    <div className="label">Senha inicial</div>
                    <input
                      className="input"
                      type="password"
                      value={newUser.password}
                      onChange={e => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Opcional"
                    />
                  </div>

                  <div className="form-full" style={{ display: 'flex', alignItems: 'end' }}>
                    <label className="small" style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 700 }}>
                      <input
                        type="checkbox"
                        checked={newUser.active}
                        onChange={e => setNewUser(prev => ({ ...prev, active: e.target.checked }))}
                      />
                      Usuário ativo
                    </label>
                  </div>
                </div>
              </div>

              <div className="actions">
                <button className="btn" disabled={saving}>
                  {saving ? 'Salvando...' : 'Cadastrar usuário'}
                </button>
              </div>
            </form>
          </div>

          <div className="card card-muted">
            <div className="h2" style={{ marginBottom: 12 }}>Perfis de acesso</div>

            <div className="info-list">
              <div className="info-item">
                <div className="info-value">Administrador</div>
                <div className="small">Acesso completo ao sistema, inclusive usuários, histórico, alertas e contratos.</div>
              </div>
              <div className="info-item">
                <div className="info-value">Gestor</div>
                <div className="small">Consulta ampla e lançamento de movimentações em contratos vinculados.</div>
              </div>
              <div className="info-item">
                <div className="info-value">Fiscal</div>
                <div className="small">Consulta ampla e lançamento de movimentações em contratos vinculados.</div>
              </div>
              <div className="info-item">
                <div className="info-value">Consulta</div>
                <div className="small">Perfil destinado apenas à visualização das informações.</div>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="h2">Usuários cadastrados</div>
              <div className="small">Consulta e atualização dos acessos existentes</div>
            </div>
            <div className="badge">{filtered.length} registro(s)</div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div className="label">Pesquisar por nome, e-mail ou perfil</div>
            <input
              className="input"
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Ex.: Maria, joao@empresa.com, ADMIN"
            />
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Usuário</th>
                  <th>Perfil</th>
                  <th>Situação</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <React.Fragment key={r.id}>
                    <tr className="row">
                      <td>
                        <div style={{ fontWeight: 900 }}>{r.name}</div>
                        <div className="small">{r.email}</div>
                      </td>

                      <td>
                        <span className="badge">{roleLabel(r.role)}</span>
                      </td>

                      <td>
                        <span className={`badge ${r.active ? 'badge-soft' : ''}`}>
                          {r.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>

                      <td>
                        {editingId === r.id ? (
                          <div className="table-actions">
                            <button
                              type="button"
                              className="btn"
                              onClick={() => saveEdit(r.id)}
                              disabled={saving}
                            >
                              Salvar
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={cancelEdit}
                              disabled={saving}
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => startEdit(r)}
                          >
                            Editar
                          </button>
                        )}
                      </td>
                    </tr>

                    {editingId === r.id && (
                      <tr>
                        <td colSpan="4" style={{ background: '#FAFBFE', padding: 14 }}>
                          <div className="panel">
                            <div className="section-title">Atualização do usuário</div>

                            <div className="form-grid">
                              <div>
                                <div className="label">Nome</div>
                                <input
                                  className="input"
                                  value={editForm.name}
                                  onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                                />
                              </div>

                              <div>
                                <div className="label">Perfil</div>
                                <select
                                  className="input"
                                  value={editForm.role}
                                  onChange={e => setEditForm(prev => ({ ...prev, role: e.target.value }))}
                                >
                                  <option value="ADMIN">Administrador</option>
                                  <option value="GESTOR">Gestor</option>
                                  <option value="FISCAL">Fiscal</option>
                                  <option value="CONSULTA">Consulta</option>
                                </select>
                              </div>

                              <div>
                                <div className="label">Nova senha</div>
                                <input
                                  className="input"
                                  type="password"
                                  value={editForm.password}
                                  onChange={e => setEditForm(prev => ({ ...prev, password: e.target.value }))}
                                  placeholder="Preencha apenas se desejar alterar"
                                />
                              </div>

                              <div style={{ display: 'flex', alignItems: 'end' }}>
                                <label className="small" style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 700 }}>
                                  <input
                                    type="checkbox"
                                    checked={editForm.active}
                                    onChange={e => setEditForm(prev => ({ ...prev, active: e.target.checked }))}
                                  />
                                  Usuário ativo
                                </label>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="4">
                      <EmptyState
                        title="Nenhum usuário encontrado"
                        description="Não há registros compatíveis com a pesquisa informada."
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
