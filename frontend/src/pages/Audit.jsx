import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApi } from '../lib/api'
import { useAuth } from '../lib/auth'

function formatDateTime(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('pt-BR')
  } catch {
    return value
  }
}

function money(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function buildSummary(row) {
  const c = row?.changes || {}

  if (row.entity === 'movement' && row.action === 'CREATE') {
    return `Movimentação criada • Contrato #${c.contract_id ?? '—'} • ${c.tipo ?? '—'} • R$ ${money(c.valor)}`
  }

  if (row.entity === 'movement' && row.action === 'DELETE') {
    return `Movimentação excluída • Contrato #${c.contract_id ?? '—'} • Motivo: ${c.reason || '—'}`
  }

  if (row.entity === 'contract' && row.action === 'CREATE') {
    return `Contrato criado • Nº ${c.numero_contrato || '—'} • CNPJ ${c.cnpj || '—'}`
  }

  if (row.entity === 'contract' && row.action === 'UPDATE') {
    const before = c.before || {}
    const after = c.after || {}

    const changedFields = Object.keys(after).filter(
      key => JSON.stringify(before[key]) !== JSON.stringify(after[key])
    )

    if (changedFields.length > 0) {
      return `Contrato atualizado • Campos alterados: ${changedFields.join(', ')}`
    }

    return 'Contrato atualizado'
  }

  if (row.entity === 'user' && row.action === 'CREATE') {
    return `Usuário criado • ${c.email || '—'} • Perfil ${c.role || '—'}`
  }

  if (row.entity === 'user' && row.action === 'UPDATE') {
    const before = c.before || {}
    const after = c.after || {}

    const changedFields = Object.keys(after).filter(
      key => JSON.stringify(before[key]) !== JSON.stringify(after[key])
    )

    if (changedFields.length > 0) {
      return `Usuário atualizado • Campos alterados: ${changedFields.join(', ')}`
    }

    return 'Usuário atualizado'
  }

  return row.changes ? JSON.stringify(row.changes) : '—'
}

export default function Audit() {
  const api = useApi()
  const { user } = useAuth()

  const [rows, setRows] = useState([])
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [openId, setOpenId] = useState(null)

  const [filters, setFilters] = useState({
    entity: '',
    action: '',
    user_id: '',
    from: '',
    to: '',
    limit: '200',
  })

  const isAdmin = user?.role === 'ADMIN'

  function setFilter(key, value) {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  async function load() {
    setMsg('')
    setLoading(true)

    try {
      const qs = new URLSearchParams()

      if (filters.entity) qs.set('entity', filters.entity)
      if (filters.action) qs.set('action', filters.action)
      if (filters.user_id) qs.set('user_id', filters.user_id)
      if (filters.from) qs.set('from', `${filters.from}T00:00:00`)
      if (filters.to) qs.set('to', `${filters.to}T23:59:59`)
      if (filters.limit) qs.set('limit', filters.limit)

      const j = await api.getAudit(qs.toString() ? `?${qs.toString()}` : '')
      setRows(Array.isArray(j) ? j : [])
    } catch (e) {
      setMsg(e.message || 'Erro ao carregar auditoria')
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  function clearFilters() {
    setFilters({
      entity: '',
      action: '',
      user_id: '',
      from: '',
      to: '',
      limit: '200',
    })
  }

  useEffect(() => {
    if (isAdmin) load()
  }, [isAdmin])

  const totalRows = useMemo(() => rows.length, [rows])

  if (!isAdmin) {
    return (
      <div className="container">
        <div className="topbar">
          <div className="brand">
            <div className="logo" />
            <div>
              <div className="h1">Auditoria</div>
              <div className="small">Acesso restrito</div>
            </div>
          </div>
          <Link className="btn" to="/">Voltar</Link>
        </div>

        <div className="card">
          <div style={{ fontWeight: 900 }}>Somente ADMIN.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="topbar">
        <div className="brand">
          <div className="logo" />
          <div>
            <div className="h1">Auditoria</div>
            <div className="small">Log de ações do sistema</div>
          </div>
        </div>
        <Link className="btn" to="/">Voltar</Link>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr 160px 160px 120px auto auto',
            gap: 10,
            alignItems: 'end',
          }}
        >
          <div>
            <div className="small">Entidade</div>
            <select
              className="input"
              value={filters.entity}
              onChange={e => setFilter('entity', e.target.value)}
            >
              <option value="">(todas)</option>
              <option value="contract">contract</option>
              <option value="movement">movement</option>
              <option value="user">user</option>
            </select>
          </div>

          <div>
            <div className="small">Ação</div>
            <select
              className="input"
              value={filters.action}
              onChange={e => setFilter('action', e.target.value)}
            >
              <option value="">(todas)</option>
              <option value="CREATE">CREATE</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>

          <div>
            <div className="small">Usuário (ID)</div>
            <input
              className="input"
              value={filters.user_id}
              onChange={e => setFilter('user_id', e.target.value)}
              placeholder="Ex.: 1"
            />
          </div>

          <div>
            <div className="small">De</div>
            <input
              className="input"
              type="date"
              value={filters.from}
              onChange={e => setFilter('from', e.target.value)}
            />
          </div>

          <div>
            <div className="small">Até</div>
            <input
              className="input"
              type="date"
              value={filters.to}
              onChange={e => setFilter('to', e.target.value)}
            />
          </div>

          <div>
            <div className="small">Limite</div>
            <select
              className="input"
              value={filters.limit}
              onChange={e => setFilter('limit', e.target.value)}
            >
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="200">200</option>
              <option value="500">500</option>
            </select>
          </div>

          <button className="btn" onClick={load} disabled={loading}>
            {loading ? 'Filtrando...' : 'Filtrar'}
          </button>

          <button className="btn" type="button" onClick={clearFilters}>
            Limpar
          </button>
        </div>

        <div className="small" style={{ marginTop: 12 }}>
          Registros encontrados: <strong>{totalRows}</strong>
        </div>

        {msg && (
          <div className="small" style={{ fontWeight: 900, marginTop: 10 }}>
            {msg}
          </div>
        )}

        <table className="table" style={{ marginTop: 12 }}>
          <thead>
            <tr>
              <th>Data</th>
              <th>Usuário</th>
              <th>Ação</th>
              <th>Entidade</th>
              <th>ID</th>
              <th>Resumo</th>
              <th>IP</th>
              <th>Detalhes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <React.Fragment key={r.id}>
                <tr className="row">
                  <td>{formatDateTime(r.created_at)}</td>
                  <td>{r.user_id ?? '—'}</td>
                  <td style={{ fontWeight: 900 }}>{r.action}</td>
                  <td>{r.entity}</td>
                  <td>{r.entity_id ?? '—'}</td>
                  <td className="small">{buildSummary(r)}</td>
                  <td className="small">{r.ip || '—'}</td>
                  <td>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => setOpenId(prev => (prev === r.id ? null : r.id))}
                    >
                      {openId === r.id ? 'Ocultar' : 'Ver'}
                    </button>
                  </td>
                </tr>

                {openId === r.id && (
                  <tr>
                    <td colSpan="8" style={{ padding: 12, background: '#fafafa' }}>
                      <div className="small" style={{ fontWeight: 900, marginBottom: 8 }}>
                        Detalhes completos
                      </div>
                      <pre
                        style={{
                          margin: 0,
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          fontSize: 12,
                          lineHeight: 1.5,
                        }}
                      >
                        {JSON.stringify(r.changes || {}, null, 2)}
                      </pre>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}

            {rows.length === 0 && (
              <tr>
                <td colSpan="8" className="small" style={{ padding: 16 }}>
                  Sem registros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
