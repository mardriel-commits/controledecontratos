import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApi } from '../lib/api'
import { useAuth } from '../lib/auth'

const INITIAL_FORM = {
  razao_social: '',
  cnpj: '',
  numero_contrato: '',
  objeto: '',
  data_inicio: '',
  data_fim: '',
  status: 'ATIVO',
  renovavel: false,
  valor_inicial: '',
  valor_aditivado_acumulado: '',
  gestor_id: '',
  fiscal_id: '',
  observacoes: '',
}

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '')
}

function formatCurrencyInput(value) {
  const digits = onlyDigits(value)
  if (!digits) return ''

  const number = Number(digits) / 100
  return number.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function parseCurrencyForApi(value) {
  if (value == null || value === '') return '0'
  return String(value).replace(/\./g, '').replace(',', '.')
}

function formatCNPJ(value) {
  const digits = onlyDigits(value).slice(0, 14)
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

export default function NewContract() {
  const api = useApi()
  const { user } = useAuth()
  const navigate = useNavigate()

  const isAdmin = user?.role === 'ADMIN'

  const [form, setForm] = useState(INITIAL_FORM)
  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [success, setSuccess] = useState('')

  async function loadUsers() {
    setLoadingUsers(true)
    setMsg('')
    try {
      const data = await api.getUsers()
      setUsers(Array.isArray(data) ? data.filter(u => u.active !== false) : [])
    } catch (e) {
      setUsers([])
      setMsg(e?.message || 'Não foi possível carregar a lista de usuários.')
    } finally {
      setLoadingUsers(false)
    }
  }

  useEffect(() => {
    if (isAdmin) {
      loadUsers()
    }
  }, [isAdmin])

  const gestores = useMemo(() => {
    return users.filter(u => ['ADMIN', 'GESTOR'].includes(String(u.role || '').toUpperCase()))
  }, [users])

  const fiscais = useMemo(() => {
    return users.filter(u => ['ADMIN', 'FISCAL'].includes(String(u.role || '').toUpperCase()))
  }, [users])

  function updateField(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function handleCurrencyChange(field, value) {
    updateField(field, formatCurrencyInput(value))
  }

  function handleSubmit(e) {
    e.preventDefault()
    submit()
  }

  async function submit() {
    setMsg('')
    setSuccess('')

    if (!form.razao_social.trim()) {
      setMsg('Informe a razão social.')
      return
    }
    if (!onlyDigits(form.cnpj)) {
      setMsg('Informe o CNPJ.')
      return
    }
    if (!form.numero_contrato.trim()) {
      setMsg('Informe o número do contrato.')
      return
    }
    if (!form.data_inicio) {
      setMsg('Informe a data de início.')
      return
    }
    if (!form.data_fim) {
      setMsg('Informe a data de fim.')
      return
    }
    if (!form.valor_inicial) {
      setMsg('Informe o valor inicial.')
      return
    }

    const payload = {
      razao_social: form.razao_social.trim(),
      cnpj: onlyDigits(form.cnpj),
      numero_contrato: form.numero_contrato.trim(),
      objeto: form.objeto.trim(),
      data_inicio: form.data_inicio,
      data_fim: form.data_fim,
      status: form.status,
      renovavel: !!form.renovavel,
      valor_inicial: parseCurrencyForApi(form.valor_inicial),
      valor_aditivado_acumulado: parseCurrencyForApi(form.valor_aditivado_acumulado || '0'),
      gestor_id: form.gestor_id ? Number(form.gestor_id) : null,
      fiscal_id: form.fiscal_id ? Number(form.fiscal_id) : null,
      observacoes: form.observacoes.trim(),
    }

    setSaving(true)
    try {
      const created = await api.createContract(payload)
      setSuccess(`Contrato ${created?.numero_contrato || ''} cadastrado com sucesso.`)
      setForm(INITIAL_FORM)

      setTimeout(() => {
        navigate('/')
      }, 1200)
    } catch (e) {
      setMsg(e?.message || 'Não foi possível cadastrar o contrato.')
    } finally {
      setSaving(false)
    }
  }

  if (!isAdmin) {
    return (
      <div className="container">
        <div className="topbar">
          <div className="brand">
            <div className="logo" />
            <div>
              <div className="h1">Novo contrato</div>
              <div className="small">Acesso restrito</div>
            </div>
          </div>
          <Link className="btn btn-secondary" to="/">Voltar</Link>
        </div>

        <div className="notice notice-info">
          Esta área está disponível somente para perfis administrativos.
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
            <div className="h1">Novo contrato</div>
            <div className="small">Cadastro de contrato e vínculo com empresa</div>
          </div>
        </div>

        <div className="actions">
          <Link className="btn btn-secondary" to="/">Voltar</Link>
        </div>
      </div>

      {msg && (
        <div className="notice notice-error" style={{ marginBottom: 16 }}>
          {msg}
        </div>
      )}

      {success && (
        <div className="notice notice-success" style={{ marginBottom: 16 }}>
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card">
        <div className="card-header">
          <div>
            <div className="h2">Dados do contrato</div>
            <div className="small">Preencha as informações principais para cadastro</div>
          </div>
        </div>

        <div className="form-grid">
          <div className="form-full">
            <div className="label">Razão social *</div>
            <input
              className="input"
              value={form.razao_social}
              onChange={e => updateField('razao_social', e.target.value)}
              placeholder="Nome da empresa"
            />
          </div>

          <div>
            <div className="label">CNPJ *</div>
            <input
              className="input"
              value={form.cnpj}
              onChange={e => updateField('cnpj', formatCNPJ(e.target.value))}
              placeholder="00.000.000/0000-00"
              maxLength={18}
            />
          </div>

          <div>
            <div className="label">Número do contrato *</div>
            <input
              className="input"
              value={form.numero_contrato}
              onChange={e => updateField('numero_contrato', e.target.value)}
              placeholder="Ex.: 012/2026"
            />
          </div>

          <div className="form-full">
            <div className="label">Objeto</div>
            <textarea
              className="input"
              rows={4}
              value={form.objeto}
              onChange={e => updateField('objeto', e.target.value)}
              placeholder="Descreva o objeto do contrato"
            />
          </div>

          <div>
            <div className="label">Data de início *</div>
            <input
              className="input"
              type="date"
              value={form.data_inicio}
              onChange={e => updateField('data_inicio', e.target.value)}
            />
          </div>

          <div>
            <div className="label">Data de fim *</div>
            <input
              className="input"
              type="date"
              value={form.data_fim}
              onChange={e => updateField('data_fim', e.target.value)}
            />
          </div>

          <div>
            <div className="label">Status</div>
            <select
              className="input"
              value={form.status}
              onChange={e => updateField('status', e.target.value)}
            >
              <option value="ATIVO">ATIVO</option>
              <option value="SUSPENSO">SUSPENSO</option>
              <option value="ENCERRADO">ENCERRADO</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'end' }}>
            <label className="label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={!!form.renovavel}
                onChange={e => updateField('renovavel', e.target.checked)}
              />
              Contrato renovável
            </label>
          </div>

          <div>
            <div className="label">Valor inicial *</div>
            <input
              className="input"
              value={form.valor_inicial}
              onChange={e => handleCurrencyChange('valor_inicial', e.target.value)}
              placeholder="0,00"
              inputMode="numeric"
            />
          </div>

          <div>
            <div className="label">Valor aditivado acumulado</div>
            <input
              className="input"
              value={form.valor_aditivado_acumulado}
              onChange={e => handleCurrencyChange('valor_aditivado_acumulado', e.target.value)}
              placeholder="0,00"
              inputMode="numeric"
            />
          </div>

          <div>
            <div className="label">Gestor</div>
            <select
              className="input"
              value={form.gestor_id}
              onChange={e => updateField('gestor_id', e.target.value)}
              disabled={loadingUsers}
            >
              <option value="">Selecione</option>
              {gestores.map(u => (
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
              value={form.fiscal_id}
              onChange={e => updateField('fiscal_id', e.target.value)}
              disabled={loadingUsers}
            >
              <option value="">Selecione</option>
              {fiscais.map(u => (
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
              rows={4}
              value={form.observacoes}
              onChange={e => updateField('observacoes', e.target.value)}
              placeholder="Informações adicionais"
            />
          </div>
        </div>

        <div className="actions" style={{ marginTop: 18 }}>
          <button className="btn" type="submit" disabled={saving}>
            {saving ? 'Salvando...' : 'Cadastrar contrato'}
          </button>
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => {
              setForm(INITIAL_FORM)
              setMsg('')
              setSuccess('')
            }}
            disabled={saving}
          >
            Limpar
          </button>
          <Link className="btn btn-secondary" to="/">Cancelar</Link>
        </div>
      </form>
    </div>
  )
}
