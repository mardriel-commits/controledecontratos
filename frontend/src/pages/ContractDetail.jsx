import React, { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useApi } from '../lib/api'
import { useAuth } from '../lib/auth'
import ConfirmModal from '../components/ConfirmModal'
import FeedbackMessage from '../components/FeedbackMessage'
import PageLoader from '../components/PageLoader'
import EmptyState from '../components/EmptyState'

function semDot(semaforo) {
  if (semaforo === 'VERMELHO') return 'red'
  if (semaforo === 'AMARELO') return 'yellow'
  return 'green'
}

export default function ContractDetail() {
  const { id } = useParams()
  const api = useApi()
  const { user } = useAuth()

  const isAdmin = user?.role === 'ADMIN'
  const canCreateMovement = ['ADMIN', 'GESTOR', 'FISCAL'].includes(user?.role)

  const [contract, setContract] = useState(null)
  const [movs, setMovs] = useState([])
  const [users, setUsers] = useState([])

  const [loading, setLoading] = useState(false)
  const [savingContract, setSavingContract] = useState(false)
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState('info')

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteReason, setDeleteReason] = useState('')
  const [deleting, setDeleting] = useState(false)

  const [form, setForm] = useState({
    tipo: 'EXECUCAO',
    valor: '',
    data_movimento: '',
    numero_nf: '',
    descricao: '',
  })

  const [editForm, setEditForm] = useState({
    razao_social: '',
    cnpj: '',
    numero_contrato: '',
    objeto: '',
    data_inicio: '',
    data_fim: '',
    status: 'ATIVO',
    renovavel: false,
    valor_inicial: '',
    gestor_id: '',
    fiscal_id: '',
    observacoes: '',
  })

  async function load() {
    setLoading(true)
    setMsg('')
    try {
      const [c, m] = await Promise.all([
        api.getContract(id),
        api.getMovements(id),
      ])

      setContract(c)
      setMovs(Array.isArray(m) ? m : [])

      setEditForm({
        razao_social: c.empresa || '',
        cnpj: c.cnpj || '',
        numero_contrato: c.numero_contrato || '',
        objeto: c.objeto || '',
        data_inicio: c.data_inicio || '',
        data_fim: c.data_fim || '',
        status: c.status || 'ATIVO',
        renovavel: !!c.renovavel,
        valor_inicial: c.valor_inicial ?? '',
        gestor_id: c.gestor?.id ? String(c.gestor.id) : '',
        fiscal_id: c.fiscal?.id ? String(c.fiscal.id) : '',
        observacoes: c.observacoes || '',
      })
    } catch (e) {
      setMsgType('error')
      setMsg(e.message || 'Não foi possível carregar as informações do contrato.')
    } finally {
      setLoading(false)
    }
  }

  async function loadUsers() {
    if (!isAdmin) return
    try {
      const j = await api.getUsers()
      setUsers(Array.isArray(j) ? j : [])
    } catch {
      setUsers([])
    }
  }

  useEffect(() => {
    load()
  }, [id])

  useEffect(() => {
    loadUsers()
  }, [isAdmin])

  const saldo = useMemo(() => {
    if (!contract) return 0
    return Number(contract.saldo_atual || 0)
  }, [contract])

  function onEditChange(key, value) {
    setEditForm(prev => ({ ...prev, [key]: value }))
  }

  function validateContractForm() {
    if (!editForm.razao_social.trim()) return 'Informe a razão social.'
    if (!editForm.cnpj.trim()) return 'Informe o CNPJ.'
    if (!editForm.numero_contrato.trim()) return 'Informe o número do contrato.'
    if (!editForm.data_inicio) return 'Informe a data de início.'
    if (!editForm.data_fim) return 'Informe a data de fim.'
    if (Number(editForm.valor_inicial || 0) <= 0) return 'Informe um valor inicial válido.'
    if (editForm.data_fim < editForm.data_inicio) return 'A data final não pode ser anterior à data inicial.'
    return ''
  }

  async function submitContractUpdate(e) {
    e.preventDefault()
    setMsg('')

    const validationError = validateContractForm()
    if (validationError) {
      setMsgType('error')
      setMsg(validationError)
      return
    }

    setSavingContract(true)
    try {
      const payload = {
        razao_social: editForm.razao_social.trim(),
        cnpj: editForm.cnpj.trim(),
        numero_contrato: editForm.numero_contrato.trim(),
        objeto: editForm.objeto.trim(),
        data_inicio: editForm.data_inicio,
        data_fim: editForm.data_fim,
        status: editForm.status,
        renovavel: !!editForm.renovavel,
        valor_inicial: Number(editForm.valor_inicial || 0),
        gestor_id: editForm.gestor_id ? Number(editForm.gestor_id) : null,
        fiscal_id: editForm.fiscal_id ? Number(editForm.fiscal_id) : null,
        observacoes: editForm.observacoes.trim(),
      }

      await api.updateContract(id, payload)
      setMsgType('success')
      setMsg('Contrato atualizado com sucesso.')
      await load()
    } catch (e) {
      setMsgType('error')
      setMsg(e.message || 'Não foi possível atualizar o contrato.')
    } finally {
      setSavingContract(false)
    }
  }

  function handleDeleteMovement(m) {
    if (!isAdmin) return
    setDeleteTarget(m)
    setDeleteReason('')
  }

  async function confirmDeleteMovement() {
    if (!deleteTarget) return

    if (!deleteReason.trim()) {
      setMsgType('error')
      setMsg('Informe o motivo da exclusão.')
      return
    }

    setDeleting(true)
    try {
      await api.deleteMovement(deleteTarget.id, deleteReason.trim())
      setMsgType('success')
      setMsg('Movimentação excluída com sucesso.')
      setDeleteTarget(null)
      setDeleteReason('')
      await load()
    } catch (e) {
      setMsgType('error')
      setMsg(e.message || 'Não foi possível excluir a movimentação.')
    } finally {
      setDeleting(false)
    }
  }

  async function submitMovement(e) {
    e.preventDefault()
    setMsg('')

    try {
      const payload = {
        tipo: form.tipo,
        valor: Number(form.valor || 0),
        data_movimento: form.data_movimento || undefined,
        numero_nf: form.numero_nf || undefined,
        descricao: form.descricao || undefined,
      }

      await api.createMovement(id, payload)
      setForm({
        tipo: 'EXECUCAO',
        valor: '',
        data_movimento: '',
        numero_nf: '',
        descricao: '',
      })
      setMsgType('success')
      setMsg('Movimentação registrada com sucesso.')
      await load()
    } catch (e) {
      setMsgType('error')
      setMsg(e.message || 'Não foi possível registrar a movimentação.')
    }
  }

  if (!contract && loading) {
    return (
      <div className="container">
        <div className="topbar">
          <div className="brand">
            <div className="logo" />
            <div>
              <div className="h1">Detalhes do contrato</div>
              <div className="small">Consulta das informações contratuais</div>
            </div>
          </div>
          <Link className="btn btn-secondary" to="/">Voltar</Link>
        </div>

        <PageLoader
          title="Carregando informações do contrato"
          subtitle="Os dados estão sendo preparados para visualização."
        />
      </div>
    )
  }

  if (!contract) {
    return (
      <div className="container">
        <div className="topbar">
          <div className="brand">
            <div className="logo" />
            <div>
              <div className="h1">Detalhes do contrato</div>
              <div className="small">Informações indisponíveis</div>
            </div>
          </div>
          <Link className="btn btn-secondary" to="/">Voltar</Link>
        </div>

        <FeedbackMessage type={msgType}>
          {msg || 'Não foi possível localizar o contrato solicitado.'}
        </FeedbackMessage>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="topbar">
        <div className="brand">
          <div className="logo" />
          <div>
            <div className="h1">{contract.numero_contrato}</div>
            <div className="small">{contract.empresa} • {contract.cnpj}</div>
            <div className="page-subnav">
              <span className="badge">{contract.status}</span>
              <span className="badge">
                <span className={`dot ${semDot(contract.semaforo)}`} /> {contract.semaforo}
              </span>
            </div>
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
        <div>
          <div className="card card-muted">
            <div className="card-header">
              <div className="h2">Resumo do contrato</div>
              <span className="status-chip">
                <span className={`dot ${semDot(contract.semaforo)}`} /> {contract.semaforo}
              </span>
            </div>

            <div className="info-list">
              <div className="info-item">
                <div className="info-label">Vigência</div>
                <div className="info-value">
                  {new Date(contract.data_inicio).toLocaleDateString('pt-BR')} até {new Date(contract.data_fim).toLocaleDateString('pt-BR')}
                </div>
              </div>

              <div className="info-item">
                <div className="info-label">Dias para vencimento</div>
                <div className="info-value">{contract.dias_para_vencer}</div>
              </div>

              <div className="info-item">
                <div className="info-label">Saldo atual</div>
                <div className="info-value">
                  R$ {saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>

              <div className="info-item">
                <div className="info-label">Renovação</div>
                <div className="info-value">
                  {contract.renovavel ? 'Contrato renovável' : 'Contrato não renovável'}
                </div>
                <div className="small" style={{ marginTop: 4 }}>
                  {contract.pode_renovar ? 'Há possibilidade de renovação dentro do prazo.' : 'Sem possibilidade atual de renovação.'}
                </div>
              </div>

              <div className="info-item">
                <div className="info-label">Limite para renovação</div>
                <div className="info-value">
                  {new Date(contract.limite_renovacao).toLocaleDateString('pt-BR')}
                </div>
              </div>

              <div className="info-item">
                <div className="info-label">Gestor responsável</div>
                <div className="info-value">{contract.gestor?.name || 'Não informado'}</div>
              </div>

              <div className="info-item">
                <div className="info-label">Fiscal responsável</div>
                <div className="info-value">{contract.fiscal?.name || 'Não informado'}</div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="card">
            <div className="card-header">
              <div>
                <div className="h2">Lançamentos financeiros</div>
                <div className="small">Histórico de movimentações vinculadas ao contrato</div>
              </div>
            </div>

            {canCreateMovement ? (
              <form onSubmit={submitMovement}>
                <div className="form-grid">
                  <div>
                    <div className="label">Tipo de lançamento</div>
                    <select
                      className="input"
                      value={form.tipo}
                      onChange={e => setForm(prev => ({ ...prev, tipo: e.target.value }))}
                    >
                      <option value="EXECUCAO">Execução</option>
                      <option value="ESTORNO">Estorno</option>
                      <option value="AJUSTE">Ajuste</option>
                    </select>
                  </div>

                  <div>
                    <div className="label">Valor</div>
                    <input
                      className="input"
                      value={form.valor}
                      onChange={e => setForm(prev => ({ ...prev, valor: e.target.value }))}
                      placeholder="Informe o valor"
                    />
                  </div>

                  <div>
                    <div className="label">Data do lançamento</div>
                    <input
                      className="input"
                      type="date"
                      value={form.data_movimento}
                      onChange={e => setForm(prev => ({ ...prev, data_movimento: e.target.value }))}
                    />
                  </div>

                  <div>
                    <div className="label">Número da nota fiscal</div>
                    <input
                      className="input"
                      value={form.numero_nf}
                      onChange={e => setForm(prev => ({ ...prev, numero_nf: e.target.value }))}
                      placeholder="Opcional"
                    />
                  </div>

                  <div className="form-full">
                    <div className="label">Descrição</div>
                    <input
                      className="input"
                      value={form.descricao}
                      onChange={e => setForm(prev => ({ ...prev, descricao: e.target.value }))}
                      placeholder="Informação complementar"
                    />
                  </div>
                </div>

                <div className="actions" style={{ marginTop: 14 }}>
                  <button className="btn">Registrar movimentação</button>
                </div>
              </form>
            ) : (
              <div className="notice notice-info" style={{ marginBottom: 14 }}>
                Seu perfil possui permissão apenas para consulta. Não é possível registrar movimentações.
              </div>
            )}

            <div className="table-wrap" style={{ marginTop: 16 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Tipo</th>
                    <th>Valor</th>
                    <th>Nota fiscal</th>
                    <th>Descrição</th>
                    {isAdmin && <th>Ação</th>}
                  </tr>
                </thead>
                <tbody>
                  {movs.map(m => (
                    <tr
                      key={m.id}
                      className="row"
                      style={m.is_deleted ? { opacity: 0.55, textDecoration: 'line-through' } : undefined}
                    >
                      <td>{new Date(m.data_movimento).toLocaleDateString('pt-BR')}</td>
                      <td style={{ fontWeight: 800 }}>{m.tipo}</td>
                      <td>
                        R$ {Number(m.valor || 0).toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td>{m.numero_nf || 'Não informada'}</td>
                      <td>
                        {m.descricao || 'Sem descrição'}
                        {m.is_deleted && (
                          <div className="small" style={{ marginTop: 4 }}>
                            Excluída logicamente • Motivo: {m.delete_reason || 'Não informado'}
                          </div>
                        )}
                      </td>
                      {isAdmin && (
                        <td>
                          {m.is_deleted ? (
                            <span className="small">Indisponível</span>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-danger"
                              onClick={() => handleDeleteMovement(m)}
                            >
                              Excluir
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}

                  {movs.length === 0 && (
                    <tr>
                      <td colSpan={isAdmin ? 6 : 5}>
                        <EmptyState
                          title="Nenhuma movimentação registrada"
                          description="Este contrato ainda não possui lançamentos financeiros vinculados."
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {isAdmin && (
            <div className="card">
              <div className="h2" style={{ marginBottom: 12 }}>Atualização cadastral</div>
              <div className="small" style={{ marginBottom: 14 }}>
                Utilize este formulário para atualizar informações administrativas do contrato.
              </div>

              <form onSubmit={submitContractUpdate}>
                <div className="panel" style={{ marginBottom: 14 }}>
                  <div className="section-title">Dados da empresa</div>
                  <div className="form-grid">
                    <div>
                      <div className="label">Razão social</div>
                      <input
                        className="input"
                        value={editForm.razao_social}
                        onChange={e => onEditChange('razao_social', e.target.value)}
                      />
                    </div>

                    <div>
                      <div className="label">CNPJ</div>
                      <input
                        className="input"
                        value={editForm.cnpj}
                        onChange={e => onEditChange('cnpj', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="panel" style={{ marginBottom: 14 }}>
                  <div className="section-title">Dados do contrato</div>
                  <div className="form-grid">
                    <div>
                      <div className="label">Número do contrato</div>
                      <input
                        className="input"
                        value={editForm.numero_contrato}
                        onChange={e => onEditChange('numero_contrato', e.target.value)}
                      />
                    </div>

                    <div>
                      <div className="label">Status</div>
                      <select
                        className="input"
                        value={editForm.status}
                        onChange={e => onEditChange('status', e.target.value)}
                      >
                        <option value="ATIVO">Ativo</option>
                        <option value="SUSPENSO">Suspenso</option>
                        <option value="ENCERRADO">Encerrado</option>
                      </select>
                    </div>

                    <div>
                      <div className="label">Data inicial</div>
                      <input
                        className="input"
                        type="date"
                        value={editForm.data_inicio}
                        onChange={e => onEditChange('data_inicio', e.target.value)}
                      />
                    </div>

                    <div>
                      <div className="label">Data final</div>
                      <input
                        className="input"
                        type="date"
                        value={editForm.data_fim}
                        onChange={e => onEditChange('data_fim', e.target.value)}
                      />
                    </div>

                    <div>
                      <div className="label">Valor inicial</div>
                      <input
                        className="input"
                        type="number"
                        min="0"
                        step="0.01"
                        value={editForm.valor_inicial}
                        onChange={e => onEditChange('valor_inicial', e.target.value)}
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'end' }}>
                      <label className="small" style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 700 }}>
                        <input
                          type="checkbox"
                          checked={editForm.renovavel}
                          onChange={e => onEditChange('renovavel', e.target.checked)}
                        />
                        Permitir renovação
                      </label>
                    </div>

                    <div className="form-full">
                      <div className="label">Objeto contratual</div>
                      <input
                        className="input"
                        value={editForm.objeto}
                        onChange={e => onEditChange('objeto', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="panel" style={{ marginBottom: 14 }}>
                  <div className="section-title">Responsáveis e observações</div>
                  <div className="form-grid">
                    <div>
                      <div className="label">Gestor</div>
                      <select
                        className="input"
                        value={editForm.gestor_id}
                        onChange={e => onEditChange('gestor_id', e.target.value)}
                      >
                        <option value="">Não informado</option>
                        {users.map(u => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.role})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <div className="label">Fiscal</div>
                      <select
                        className="input"
                        value={editForm.fiscal_id}
                        onChange={e => onEditChange('fiscal_id', e.target.value)}
                      >
                        <option value="">Não informado</option>
                        {users.map(u => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.role})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-full">
                      <div className="label">Observações</div>
                      <textarea
                        className="input"
                        rows="3"
                        value={editForm.observacoes}
                        onChange={e => onEditChange('observacoes', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="actions">
                  <button className="btn" disabled={savingContract}>
                    {savingContract ? 'Salvando alterações...' : 'Salvar alterações'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        open={!!deleteTarget}
        title="Excluir movimentação"
        description="A exclusão será registrada no histórico do sistema. Informe o motivo para continuar."
        confirmText="Confirmar exclusão"
        cancelText="Cancelar"
        danger
        loading={deleting}
        onClose={() => {
          if (deleting) return
          setDeleteTarget(null)
          setDeleteReason('')
        }}
        onConfirm={confirmDeleteMovement}
      >
        <div>
          <div className="label">Motivo da exclusão</div>
          <textarea
            className="input"
            rows="4"
            value={deleteReason}
            onChange={e => setDeleteReason(e.target.value)}
            placeholder="Descreva o motivo da exclusão"
          />
        </div>
      </ConfirmModal>
    </div>
  )
}
