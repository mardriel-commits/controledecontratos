import React, { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useApi } from '../lib/api'
import { useAuth } from '../lib/auth'

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
      setMsg(e.message || 'Erro ao carregar')
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

    const valor = Number(editForm.valor_inicial || 0)
    if (valor <= 0) return 'Informe um valor inicial válido.'

    if (editForm.data_fim < editForm.data_inicio) {
      return 'A data fim não pode ser anterior à data de início.'
    }

    return ''
  }

  async function submitContractUpdate(e) {
    e.preventDefault()
    setMsg('')

    const validationError = validateContractForm()
    if (validationError) {
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
      setMsg('✅ Contrato atualizado com sucesso.')
      await load()
    } catch (e) {
      setMsg(e.message || 'Erro ao atualizar contrato')
    } finally {
      setSavingContract(false)
    }
  }

  async function handleDeleteMovement(m) {
    if (!isAdmin) return
    const reason = prompt('Motivo da exclusão (obrigatório):')
    if (!reason) return

    try {
      await api.deleteMovement(m.id, reason)
      await load()
    } catch (e) {
      setMsg(e.message || 'Erro ao excluir')
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
      await load()
    } catch (e) {
      setMsg(e.message || 'Erro ao lançar')
    }
  }

  if (!contract) {
    return (
      <div className="container">
        <div className="topbar">
          <div className="brand">
            <div className="logo" />
            <div>
              <div className="h1">Contrato</div>
              <div className="small">Carregando...</div>
            </div>
          </div>
          <Link className="btn" to="/">Voltar</Link>
        </div>
        {msg && (
          <div className="card">
            <div style={{ fontWeight: 800 }}>{msg}</div>
          </div>
        )}
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
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn" onClick={load} disabled={loading}>
            {loading ? 'Atualizando...' : 'Atualizar'}
          </button>
          <Link className="btn" to="/">Voltar</Link>
        </div>
      </div>

      {msg && (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="small" style={{ fontWeight: 900 }}>{msg}</div>
        </div>
      )}

      <div className="grid" style={{ gridTemplateColumns: '420px 1fr' }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontWeight: 900 }}>Resumo</div>
            <span className="badge">
              <span className={`dot ${semDot(contract.semaforo)}`} /> {contract.semaforo}
            </span>
          </div>

          <div className="small">Vigência</div>
          <div style={{ fontWeight: 900, marginTop: 4 }}>
            {new Date(contract.data_inicio).toLocaleDateString('pt-BR')} → {new Date(contract.data_fim).toLocaleDateString('pt-BR')}
          </div>

          <div className="small" style={{ marginTop: 8 }}>Dias para vencer</div>
          <div style={{ fontWeight: 900, fontSize: 18 }}>{contract.dias_para_vencer}</div>

          <div className="small" style={{ marginTop: 10 }}>Saldo atual</div>
          <div style={{ fontWeight: 900, fontSize: 18 }}>
            R$ {saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>

          <div style={{ marginTop: 12 }}>
            <div className="small">Renovável</div>
            <div style={{ fontWeight: 900 }}>{contract.renovavel ? 'SIM' : 'NÃO'}</div>

            <div className="small" style={{ marginTop: 6 }}>Pode renovar</div>
            <div style={{ fontWeight: 900 }}>{contract.pode_renovar ? 'SIM' : 'NÃO'}</div>

            <div className="small" style={{ marginTop: 6 }}>Limite renovação</div>
            <div style={{ fontWeight: 900 }}>
              {new Date(contract.limite_renovacao).toLocaleDateString('pt-BR')}
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <div className="small">Gestor</div>
            <div style={{ fontWeight: 900 }}>{contract.gestor?.name || '—'}</div>

            <div className="small" style={{ marginTop: 6 }}>Fiscal</div>
            <div style={{ fontWeight: 900 }}>{contract.fiscal?.name || '—'}</div>
          </div>
        </div>

        <div className="card">
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Movimentações de saldo</div>
          <div className="small" style={{ marginBottom: 10 }}>
            Gestor/Fiscal/Admin podem lançar movimentações. Admin pode excluir (soft delete).
          </div>

          {canCreateMovement ? (
            <form
              onSubmit={submitMovement}
              style={{ display: 'grid', gridTemplateColumns: '140px 140px 160px 1fr', gap: 10, marginBottom: 12 }}
            >
              <select
                className="input"
                value={form.tipo}
                onChange={e => setForm(prev => ({ ...prev, tipo: e.target.value }))}
              >
                <option value="EXECUCAO">EXECUÇÃO</option>
                <option value="ESTORNO">ESTORNO</option>
                <option value="AJUSTE">AJUSTE</option>
              </select>

              <input
                className="input"
                value={form.valor}
                onChange={e => setForm(prev => ({ ...prev, valor: e.target.value }))}
                placeholder="Valor"
              />

              <input
                className="input"
                type="date"
                value={form.data_movimento}
                onChange={e => setForm(prev => ({ ...prev, data_movimento: e.target.value }))}
              />

              <input
                className="input"
                value={form.numero_nf}
                onChange={e => setForm(prev => ({ ...prev, numero_nf: e.target.value }))}
                placeholder="NF (opcional)"
              />

              <input
                className="input"
                style={{ gridColumn: '1 / -1' }}
                value={form.descricao}
                onChange={e => setForm(prev => ({ ...prev, descricao: e.target.value }))}
                placeholder="Descrição (opcional)"
              />

              <button className="btn" style={{ gridColumn: '1 / -1' }}>
                Lançar movimentação
              </button>
            </form>
          ) : (
            <div className="small" style={{ marginBottom: 12, fontWeight: 900 }}>
              Seu perfil é somente leitura. Você não pode lançar movimentações.
            </div>
          )}

          <table className="table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Tipo</th>
                <th>Valor</th>
                <th>NF</th>
                <th>Descrição</th>
                {isAdmin && <th>Ações</th>}
              </tr>
            </thead>
            <tbody>
              {movs.map(m => (
                <tr
                  key={m.id}
                  className="row"
                  style={m.is_deleted ? { opacity: 0.5, textDecoration: 'line-through' } : undefined}
                >
                  <td>{new Date(m.data_movimento).toLocaleDateString('pt-BR')}</td>
                  <td style={{ fontWeight: 900 }}>{m.tipo}</td>
                  <td>
                    R$ {Number(m.valor || 0).toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td>{m.numero_nf || '—'}</td>
                  <td>{m.descricao || '—'}</td>
                  {isAdmin && (
                    <td>
                      {m.is_deleted ? '—' : (
                        <button
                          type="button"
                          className="btn"
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
                  <td colSpan={isAdmin ? 6 : 5} className="small" style={{ padding: 16, opacity: 0.8 }}>
                    Sem movimentações.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isAdmin && (
        <div className="card" style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 900, marginBottom: 12 }}>Editar contrato</div>

          <form onSubmit={submitContractUpdate}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div className="small">Razão social *</div>
                <input
                  className="input"
                  value={editForm.razao_social}
                  onChange={e => onEditChange('razao_social', e.target.value)}
                />
              </div>

              <div>
                <div className="small">CNPJ *</div>
                <input
                  className="input"
                  value={editForm.cnpj}
                  onChange={e => onEditChange('cnpj', e.target.value)}
                />
              </div>

              <div>
                <div className="small">Nº Contrato *</div>
                <input
                  className="input"
                  value={editForm.numero_contrato}
                  onChange={e => onEditChange('numero_contrato', e.target.value)}
                />
              </div>

              <div>
                <div className="small">Status</div>
                <select
                  className="input"
                  value={editForm.status}
                  onChange={e => onEditChange('status', e.target.value)}
                >
                  <option value="ATIVO">ATIVO</option>
                  <option value="SUSPENSO">SUSPENSO</option>
                  <option value="ENCERRADO">ENCERRADO</option>
                </select>
              </div>

              <div>
                <div className="small">Data início *</div>
                <input
                  className="input"
                  type="date"
                  value={editForm.data_inicio}
                  onChange={e => onEditChange('data_inicio', e.target.value)}
                />
              </div>

              <div>
                <div className="small">Data fim *</div>
                <input
                  className="input"
                  type="date"
                  value={editForm.data_fim}
                  onChange={e => onEditChange('data_fim', e.target.value)}
                />
              </div>

              <div>
                <div className="small">Valor inicial *</div>
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={editForm.valor_inicial}
                  onChange={e => onEditChange('valor_inicial', e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'end', gap: 10 }}>
                <label className="small" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={editForm.renovavel}
                    onChange={e => onEditChange('renovavel', e.target.checked)}
                  />
                  Renovável
                </label>
              </div>

              <div>
                <div className="small">Gestor</div>
                <select
                  className="input"
                  value={editForm.gestor_id}
                  onChange={e => onEditChange('gestor_id', e.target.value)}
                >
                  <option value="">—</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="small">Fiscal</div>
                <select
                  className="input"
                  value={editForm.fiscal_id}
                  onChange={e => onEditChange('fiscal_id', e.target.value)}
                >
                  <option value="">—</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <div className="small">Objeto</div>
                <input
                  className="input"
                  value={editForm.objeto}
                  onChange={e => onEditChange('objeto', e.target.value)}
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <div className="small">Observações</div>
                <textarea
                  className="input"
                  rows="3"
                  value={editForm.observacoes}
                  onChange={e => onEditChange('observacoes', e.target.value)}
                />
              </div>
            </div>

            <button className="btn" style={{ marginTop: 14 }} disabled={savingContract}>
              {savingContract ? 'Salvando alterações...' : 'Salvar alterações do contrato'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
