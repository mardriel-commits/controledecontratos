import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useApi } from '../lib/api'

function semDot(semaforo) {
  if (semaforo === 'VERMELHO') return 'red'
  if (semaforo === 'AMARELO') return 'yellow'
  return 'green'
}

function getRoleLabel(role) {
  if (role === 'ADMIN') return 'Administrador'
  if (role === 'GESTOR') return 'Gestor'
  if (role === 'FISCAL') return 'Fiscal'
  if (role === 'CONSULTA') return 'Consulta'
  return role || '—'
}

export default function Dashboard() {
  const api = useApi()
  const { user } = useAuth()

  const isAdmin = user?.role === 'ADMIN'
  const isGestor = user?.role === 'GESTOR'
  const isFiscal = user?.role === 'FISCAL'
  const isConsulta = user?.role === 'CONSULTA'

  const [contracts, setContracts] = useState([])
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [riskFilter, setRiskFilter] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const j = await api.getContracts()
      setContracts(Array.isArray(j) ? j : [])
    } catch (e) {
      setError(e.message || 'Não foi possível carregar os contratos.')
      setContracts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()

    return contracts.filter(c => {
      const matchText =
        !s ||
        (c.numero_contrato || '').toLowerCase().includes(s) ||
        (c.empresa || '').toLowerCase().includes(s) ||
        (c.cnpj || '').toLowerCase().includes(s)

      const matchStatus = !statusFilter || c.status === statusFilter
      const matchRisk = !riskFilter || c.semaforo === riskFilter

      return matchText && matchStatus && matchRisk
    })
  }, [contracts, q, statusFilter, riskFilter])

  const kpis = useMemo(() => {
    const ativos = contracts.filter(c => c.status === 'ATIVO')
    return {
      ativos: ativos.length,
      ate30: ativos.filter(c => c.dias_para_vencer <= 30).length,
      ate15: ativos.filter(c => c.dias_para_vencer <= 15).length,
    }
  }, [contracts])

  return (
    <div className="container">
      <div className="topbar">
        <div className="brand">
          <div className="logo" />
          <div>
            <div className="h1">Painel de Contratos</div>
            <div className="small">
              Ambiente administrativo • Perfil: <strong>{getRoleLabel(user?.role)}</strong>
              {user?.name ? ` • ${user.name}` : ''}
            </div>
            <div className="page-subnav">
              <span className="badge badge-soft">Consulta centralizada dos contratos</span>
              <span className="badge">Atualização em tempo real</span>
            </div>
          </div>
        </div>

        <div className="actions">
          {isAdmin && <Link className="btn" to="/contracts/new">Novo contrato</Link>}
          {isAdmin && <Link className="btn btn-secondary" to="/users">Usuários</Link>}
          {isAdmin && <Link className="btn btn-secondary" to="/audit">Histórico</Link>}
          {isAdmin && <Link className="btn btn-secondary" to="/alerts">Alertas</Link>}

          <button className="btn btn-secondary" onClick={load} disabled={loading}>
            {loading ? 'Recarregando...' : 'Recarregar dados'}
          </button>

          <button className="btn btn-secondary" onClick={api.logout}>
            Encerrar sessão
          </button>
        </div>
      </div>

      <div className="grid">
        <div>
          <div className="card card-muted">
            <div className="card-header">
              <div className="h2">Resumo executivo</div>
              <div className="inline-meta">
                <span className="badge"><span className="dot green" /> Regular</span>
                <span className="badge"><span className="dot yellow" /> Atenção</span>
                <span className="badge"><span className="dot red" /> Crítico</span>
              </div>
            </div>

            <div className="kpis">
              <div className="kpi">
                <div className="small">Contratos ativos</div>
                <div className="v">{kpis.ativos}</div>
              </div>
              <div className="kpi">
                <div className="small">Vencimento em até 30 dias</div>
                <div className="v">{kpis.ate30}</div>
              </div>
              <div className="kpi">
                <div className="small">Vencimento em até 15 dias</div>
                <div className="v">{kpis.ate15}</div>
              </div>
            </div>

            <div className="notice notice-info" style={{ marginTop: 14 }}>
              {isAdmin && 'Você possui acesso completo para consulta, cadastro, edição e administração do sistema.'}
              {isGestor && 'Seu perfil permite consulta ampla e lançamento de movimentações nos contratos vinculados.'}
              {isFiscal && 'Seu perfil permite consulta ampla e lançamento de movimentações nos contratos vinculados.'}
              {isConsulta && 'Seu perfil permite consulta dos contratos, sem ações de alteração.'}
            </div>
          </div>

          <div className="card">
            <div className="h2" style={{ marginBottom: 12 }}>Consulta de contratos</div>

            <div className="form-grid">
              <div className="form-full">
                <div className="label">Pesquisar por número, empresa ou CNPJ</div>
                <input
                  className="input"
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  placeholder="Ex.: CT-001, Empresa X, 12.345.678/0001-90"
                />
              </div>

              <div>
                <div className="label">Status</div>
                <select className="input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                  <option value="">Todos</option>
                  <option value="ATIVO">Ativo</option>
                  <option value="SUSPENSO">Suspenso</option>
                  <option value="ENCERRADO">Encerrado</option>
                </select>
              </div>

              <div>
                <div className="label">Situação</div>
                <select className="input" value={riskFilter} onChange={e => setRiskFilter(e.target.value)}>
                  <option value="">Todas</option>
                  <option value="VERDE">Regular</option>
                  <option value="AMARELO">Atenção</option>
                  <option value="VERMELHO">Crítico</option>
                </select>
              </div>
            </div>

            {error && (
              <div className="notice notice-error" style={{ marginTop: 14 }}>
                {error}
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="h2">Relação de contratos</div>
              <div className="small">Consulta consolidada dos contratos cadastrados</div>
            </div>
            <div className="badge">{filtered.length} registro(s)</div>
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Contrato</th>
                  <th>Empresa</th>
                  <th>Vigência</th>
                  <th>Situação</th>
                  <th>Renovação</th>
                  <th>Saldo atual</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr className="row" key={c.id}>
                    <td>
                      <div style={{ fontWeight: 900 }}>
                        <Link to={`/contracts/${c.id}`} style={{ color: 'var(--primary)' }}>
                          {c.numero_contrato}
                        </Link>
                      </div>
                      <div className="small">{c.status}</div>
                    </td>

                    <td>
                      <div style={{ fontWeight: 800 }}>{c.empresa}</div>
                      <div className="small">{c.cnpj}</div>
                    </td>

                    <td>
                      <div style={{ fontWeight: 800 }}>
                        {new Date(c.data_fim).toLocaleDateString('pt-BR')}
                      </div>
                      <div className="small">{c.dias_para_vencer} dia(s) para vencimento</div>
                    </td>

                    <td>
                      <span className="status-chip">
                        <span className={`dot ${semDot(c.semaforo)}`} /> {c.semaforo}
                      </span>
                    </td>

                    <td>
                      <div style={{ fontWeight: 800 }}>{c.renovavel ? 'Renovável' : 'Não renovável'}</div>
                      <div className="small">
                        {c.pode_renovar ? 'Dentro da possibilidade de renovação' : 'Sem renovação disponível'}
                      </div>
                    </td>

                    <td style={{ fontWeight: 900 }}>
                      R$ {Number(c.saldo_atual || 0).toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="6">
                      <div className="empty-state">
                        Nenhum contrato encontrado para os filtros informados.
                      </div>
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
