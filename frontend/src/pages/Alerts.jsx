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

function getAlertTypeLabel(type) {
  if (!type) return 'Não informado'

  const map = {
    VENCIMENTO_30_DIAS: 'Vencimento em até 30 dias',
    VENCIMENTO_15_DIAS: 'Vencimento em até 15 dias',
    VENCIMENTO_IMINENTE: 'Vencimento iminente',
    CONTRATO_VENCIDO: 'Contrato vencido',
    RENOVACAO_LIMITE: 'Limite de renovação',
    ALERTA_MANUAL: 'Alerta manual',
  }

  return map[type] || type
}

function getStatusLabel(status) {
  if (!status) return 'Não informado'

  const map = {
    SUCCESS: 'Enviado',
    SENT: 'Enviado',
    OK: 'Concluído',
    ERROR: 'Erro',
    FAILED: 'Falha',
    PENDING: 'Pendente',
  }

  return map[status] || status
}

function buildAlertSummary(row) {
  const meta = row?.meta || {}
  const contractId = row?.contract_id ?? meta?.contract_id ?? '—'
  const recipients = Array.isArray(row?.recipients)
    ? row.recipients.join(', ')
    : row?.recipients || 'Não informado'

  return {
    title: getAlertTypeLabel(row.alert_type),
    subtitle: `Contrato #${contractId}`,
    recipients,
  }
}

export default function Alerts() {
  const api = useApi()
  const { user } = useAuth()

  const isAdmin = user?.role === 'ADMIN'

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState('info')
  const [openId, setOpenId] = useState(null)

  const [filters, setFilters] = useState({
    type: '',
    status: '',
    q: '',
  })

  async function load() {
    setLoading(true)
    setMsg('')
    try {
      const j = await api.getAlerts()
      setRows(Array.isArray(j) ? j : [])
    } catch (e) {
      setMsgType('error')
      setMsg(e.message || 'Não foi possível carregar os alertas.')
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAdmin) load()
  }, [isAdmin])

  function setFilter(key, value) {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  function clearFilters() {
    setFilters({
      type: '',
      status: '',
      q: '',
    })
  }

  const filtered = useMemo(() => {
    const search = filters.q.trim().toLowerCase()

    return rows.filter(r => {
      const matchType = !filters.type || r.alert_type === filters.type
      const matchStatus = !filters.status || String(r.status || '').toUpperCase() === filters.status

      const searchable = [
        r.alert_type,
        r.status,
        r.contract_id,
        Array.isArray(r.recipients) ? r.recipients.join(' ') : r.recipients,
        r.error,
        JSON.stringify(r.meta || {}),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      const matchText = !search || searchable.includes(search)

      return matchType && matchStatus && matchText
    })
  }, [rows, filters])

  const stats = useMemo(() => {
    const total = rows.length
    const sent = rows.filter(r => ['SUCCESS', 'SENT', 'OK'].includes(String(r.status || '').toUpperCase())).length
    const failed = rows.filter(r => ['ERROR', 'FAILED'].includes(String(r.status || '').toUpperCase())).length
    const pending = rows.filter(r => ['PENDING'].includes(String(r.status || '').toUpperCase())).length

    return { total, sent, failed, pending }
  }, [rows])

  const availableTypes = useMemo(() => {
    return Array.from(new Set(rows.map(r => r.alert_type).filter(Boolean)))
  }, [rows])

  if (!isAdmin) {
    return (
      <div className="container">
        <div className="topbar">
          <div className="brand">
            <div className="logo" />
            <div>
              <div className="h1">Avisos e notificações</div>
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
              <div className="h1">Avisos e notificações</div>
              <div className="small">Acompanhamento dos alertas do sistema</div>
            </div>
          </div>
          <Link className="btn btn-secondary" to="/">Voltar</Link>
        </div>

        <PageLoader
          title="Carregando alertas"
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
            <div className="h1">Avisos e notificações</div>
            <div className="small">Acompanhamento dos alertas gerados pelo sistema</div>
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
          <div className="card card-muted">
            <div className="card-header">
              <div className="h2">Resumo dos alertas</div>
            </div>

            <div className="kpis">
              <div className="kpi">
                <div className="small">Total de registros</div>
                <div className="v">{stats.total}</div>
              </div>
              <div className="kpi">
                <div className="small">Enviados / concluídos</div>
                <div className="v">{stats.sent}</div>
              </div>
              <div className="kpi">
                <div className="small">Falhas</div>
                <div className="v">{stats.failed}</div>
              </div>
            </div>

            <div className="notice notice-info" style={{ marginTop: 14 }}>
              Este painel apresenta os alertas e notificações emitidos pelo sistema para acompanhamento administrativo.
            </div>

            {stats.pending > 0 && (
              <div className="notice notice-info" style={{ marginTop: 12 }}>
                Há registros pendentes que merecem acompanhamento.
              </div>
            )}

            {stats.failed > 0 && (
              <div className="notice notice-error" style={{ marginTop: 12 }}>
                Existem alertas com falha ou erro no processamento.
              </div>
            )}
          </div>

          <div className="card">
            <div className="h2" style={{ marginBottom: 12 }}>Filtros de consulta</div>
            <div className="small" style={{ marginBottom: 14 }}>
              Utilize os filtros abaixo para localizar alertas por tipo, situação ou conteúdo relacionado.
            </div>

            <div className="panel">
              <div className="form-grid">
                <div className="form-full">
                  <div className="label">Pesquisar</div>
                  <input
                    className="input"
                    value={filters.q}
                    onChange={e => setFilter('q', e.target.value)}
                    placeholder="Pesquisar por contrato, tipo, destinatário ou erro"
                  />
                </div>

                <div>
                  <div className="label">Tipo de alerta</div>
                  <select
                    className="input"
                    value={filters.type}
                    onChange={e => setFilter('type', e.target.value)}
                  >
                    <option value="">Todos</option>
                    {availableTypes.map(type => (
                      <option key={type} value={type}>
                        {getAlertTypeLabel(type)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="label">Situação</div>
                  <select
                    className="input"
                    value={filters.status}
                    onChange={e => setFilter('status', e.target.value)}
                  >
                    <option value="">Todas</option>
                    <option value="SUCCESS">Enviado / concluído</option>
                    <option value="SENT">Enviado / concluído</option>
                    <option value="OK">Enviado / concluído</option>
                    <option value="PENDING">Pendente</option>
                    <option value="ERROR">Erro / falha</option>
                    <option value="FAILED">Erro / falha</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="actions" style={{ marginTop: 14 }}>
              <button className="btn" onClick={load} disabled={loading}>
                {loading ? 'Consultando...' : 'Aplicar filtros'}
              </button>
              <button className="btn btn-secondary" type="button" onClick={clearFilters}>
                Limpar filtros
              </button>
              <span className="badge">{filtered.length} registro(s)</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="h2">Histórico de alertas</div>
              <div className="small">Consulta consolidada das notificações registradas</div>
            </div>
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Data e hora</th>
                  <th>Descrição</th>
                  <th>Situação</th>
                  <th>Destinatários</th>
                  <th>Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const summary = buildAlertSummary(r)

                  return (
                    <React.Fragment key={r.id}>
                      <tr className="row">
                        <td>{formatDateTime(r.created_at)}</td>

                        <td>
                          <div style={{ fontWeight: 900 }}>{summary.title}</div>
                          <div className="small">{summary.subtitle}</div>
                        </td>

                        <td>
                          <span className={`badge ${['SUCCESS', 'SENT', 'OK'].includes(String(r.status || '').toUpperCase()) ? 'badge-soft' : ''}`}>
                            {getStatusLabel(r.status)}
                          </span>
                          {r.error && (
                            <div className="small" style={{ marginTop: 6, color: 'var(--danger)' }}>
                              {r.error}
                            </div>
                          )}
                        </td>

                        <td>
                          <div className="small">{summary.recipients}</div>
                        </td>

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
                          <td colSpan="5" style={{ padding: 14, background: '#FAFBFE' }}>
                            <div className="panel">
                              <div className="section-title">Detalhamento do alerta</div>

                              <div className="info-list">
                                <div className="info-item">
                                  <div className="info-label">Tipo</div>
                                  <div className="info-value">{getAlertTypeLabel(r.alert_type)}</div>
                                </div>

                                <div className="info-item">
                                  <div className="info-label">Situação</div>
                                  <div className="info-value">{getStatusLabel(r.status)}</div>
                                </div>

                                <div className="info-item">
                                  <div className="info-label">Contrato relacionado</div>
                                  <div className="info-value">{r.contract_id ?? 'Não informado'}</div>
                                </div>

                                <div className="info-item">
                                  <div className="info-label">Destinatários</div>
                                  <div className="info-value">
                                    {Array.isArray(r.recipients)
                                      ? r.recipients.join(', ')
                                      : r.recipients || 'Não informado'}
                                  </div>
                                </div>

                                {r.error && (
                                  <div className="info-item">
                                    <div className="info-label">Mensagem de erro</div>
                                    <div className="info-value" style={{ color: 'var(--danger)' }}>
                                      {r.error}
                                    </div>
                                  </div>
                                )}

                                <div className="info-item">
                                  <div className="info-label">Metadados</div>
                                  <pre
                                    style={{
                                      margin: 0,
                                      whiteSpace: 'pre-wrap',
                                      wordBreak: 'break-word',
                                      fontSize: 12,
                                      lineHeight: 1.5,
                                    }}
                                  >
{JSON.stringify(r.meta || {}, null, 2)}
                                  </pre>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="5">
                      <EmptyState
                        title="Nenhum alerta encontrado"
                        description="Não há registros compatíveis com os critérios informados."
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
