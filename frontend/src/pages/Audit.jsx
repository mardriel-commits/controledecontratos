import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApi } from '../lib/api'
import { useAuth } from '../lib/auth'
import FeedbackMessage from '../components/FeedbackMessage'
import PageLoader from '../components/PageLoader'
import EmptyState from '../components/EmptyState'

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
    return `Movimentação registrada • Contrato #${c.contract_id ?? '—'} • ${c.tipo ?? '—'} • R$ ${money(c.valor)}`
  }

  if (row.entity === 'movement' && row.action === 'DELETE') {
    return `Movimentação excluída • Contrato #${c.contract_id ?? '—'} • Motivo: ${c.reason || '—'}`
  }

  if (row.entity === 'contract' && row.action === 'CREATE') {
    return `Contrato cadastrado • Nº ${c.numero_contrato || '—'}`
  }

  if (row.entity === 'contract' && row.action === 'UPDATE') {
    const before = c.before || {}
    const after = c.after || {}
    const changedFields = Object.keys(after).filter(
      key => JSON.stringify(before[key]) !== JSON.stringify(after[key])
    )
    return changedFields.length
      ? `Contrato atualizado • Campos alterados: ${changedFields.join(', ')}`
      : 'Contrato atualizado'
  }

  if (row.entity === 'user' && row.action === 'CREATE') {
    return `Usuário cadastrado • ${c.email || '—'} • Perfil ${c.role || '—'}`
  }

  if (row.entity === 'user' && row.action === 'UPDATE') {
    return 'Cadastro de usuário atualizado'
  }

  return row.changes ? JSON.stringify(row.changes) : '—'
}

export default function Audit() {
  const api = useApi()
  const { user } = useAuth()

  const [rows, setRows] = useState([])
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState('info')
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
      setMsgType('error')
      setMsg(e.message || 'Não foi possível carregar o histórico de atividades.')
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
              <div className="h1">Histórico de atividades</div>
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
              <div className="h1">Histórico de atividades</div>
              <div className="small">Registro consolidado das ações do sistema</div>
            </div>
          </div>
          <Link className="btn btn-secondary" to="/">Voltar</Link>
        </div>

        <PageLoader
          title="Carregando histórico"
          subtitle="Os registros estão sendo preparados para consulta."
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
            <div className="h1">Histórico de atividades</div>
            <div className="small">Registro consolidado das ações realizadas no sistema</div>
          </div>
        </div>
        <Link className="btn btn-secondary" to="/">Voltar</Link>
      </div>

      <FeedbackMessage type={msgType} style={{ marginBottom: 16 }}>
        {msg}
      </FeedbackMessage>

      <div className="card">
        <div className="h2" style={{ marginBottom: 12 }}>Filtros de consulta</div>

        <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr 160px 160px 120px' }}>
          <div>
            <div className="label">Entidade</div>
            <select className="input" value={filters.entity} onChange={e => setFilter('entity', e.target.value)}>
              <option value="">Todas</option>
              <option value="contract">Contrato</option>
              <option value="movement">Movimentação</option>
              <option value="user">Usuário</option>
            </select>
          </div>

          <div>
            <div className="label">Ação</div>
            <select className="input" value={filters.action} onChange={e => setFilter('action', e.target.value)}>
              <option value="">Todas</option>
              <option value="CREATE">Cadastro</option>
              <option value="UPDATE">Atualização</option>
              <option value="DELETE">Exclusão</option>
            </select>
          </div>

          <div>
            <div className="label">Usuário (ID)</div>
            <input className="input" value={filters.user_id} onChange={e => setFilter('user_id', e.target.value)} />
          </div>

          <div>
            <div className="label">Data inicial</div>
            <input className="input" type="date" value={filters.from} onChange={e => setFilter('from', e.target.value)} />
          </div>

          <div>
            <div className="label">Data final</div>
            <input className="input" type="date" value={filters.to} onChange={e => setFilter('to', e.target.value)} />
          </div>

          <div>
            <div className="label">Limite</div>
            <select className="input" value={filters.limit} onChange={e => setFilter('limit', e.target.value)}>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="200">200</option>
              <option value="500">500</option>
            </select>
          </div>
        </div>

        <div className="actions" style={{ marginTop: 14 }}>
          <button className="btn" onClick={load} disabled={loading}>
            {loading ? 'Consultando...' : 'Aplicar filtros'}
          </button>
          <button className="btn btn-secondary" type="button" onClick={clearFilters}>
            Limpar filtros
          </button>
          <span className="badge">{totalRows} registro(s)</span>
        </div>

        <div className="table-wrap" style={{ marginTop: 16 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Data e hora</th>
                <th>Usuário</th>
                <th>Ação</th>
                <th>Entidade</th>
                <th>Identificador</th>
                <th>Resumo</th>
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
                    <td>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setOpenId(prev => (prev === r.id ? null : r.id))}
                      >
                        {openId === r.id ? 'Ocultar' : 'Visualizar'}
                      </button>
                    </td>
                  </tr>

                  {openId === r.id && (
                    <tr>
                      <td colSpan="7" style={{ padding: 12, background: '#FAFBFE' }}>
                        <div className="section-title">Detalhamento do registro</div>
                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 12 }}>
{JSON.stringify(r.changes || {}, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}

              {rows.length === 0 && (
                <tr>
                  <td colSpan="7">
                    <EmptyState
                      title="Nenhum registro encontrado"
                      description="Não há informações disponíveis para os filtros selecionados."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
