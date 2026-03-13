import React, { useEffect, useState } from 'react'
import { useApi } from '../lib/api'

export default function NewContract(){
  const api = useApi()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  const [form, setForm] = useState({
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
    observacoes: ''
  })

  async function loadUsers(){
    try{
      const j = await api.getUsers()
      setUsers(Array.isArray(j) ? j : [])
    } catch {
      setUsers([])
    }
  }

  useEffect(()=>{ loadUsers() }, [])

  function onChange(k, v){
    setForm(prev => ({...prev, [k]: v}))
  }

  async function submit(e){
    e.preventDefault()
    setMsg('')
    setLoading(true)
    try{
      const payload = {
        ...form,
        valor_inicial: Number(form.valor_inicial || 0),
        gestor_id: form.gestor_id ? Number(form.gestor_id) : null,
        fiscal_id: form.fiscal_id ? Number(form.fiscal_id) : null,
      }

      const j = await api.createContract(payload)
      setMsg(`✅ Contrato criado: ${j.numero_contrato}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <div className="topbar">
        <div className="brand">
          <div className="logo" />
          <div>
            <div className="h1">Novo Contrato</div>
            <div className="small">Cadastro manual (ADMIN)</div>
          </div>
        </div>
        <a className="btn" href="/">Voltar</a>
      </div>

      <div className="card" style={{marginTop:16}}>
        <form onSubmit={submit}>
          <div className="small" style={{fontWeight:900, marginBottom:10}}>Empresa</div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
            <div>
              <div className="small">Razão social *</div>
              <input className="input" value={form.razao_social} onChange={e=>onChange('razao_social', e.target.value)} />
            </div>
            <div>
              <div className="small">CNPJ *</div>
              <input className="input" value={form.cnpj} onChange={e=>onChange('cnpj', e.target.value)} placeholder="00.000.000/0000-00" />
            </div>
          </div>

          <div className="small" style={{fontWeight:900, margin:'14px 0 10px'}}>Contrato</div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
            <div>
              <div className="small">Nº Contrato *</div>
              <input className="input" value={form.numero_contrato} onChange={e=>onChange('numero_contrato', e.target.value)} />
            </div>
            <div>
              <div className="small">Status</div>
              <select className="input" value={form.status} onChange={e=>onChange('status', e.target.value)}>
                <option value="ATIVO">ATIVO</option>
                <option value="SUSPENSO">SUSPENSO</option>
                <option value="ENCERRADO">ENCERRADO</option>
              </select>
            </div>

            <div>
              <div className="small">Data início *</div>
              <input className="input" type="date" value={form.data_inicio} onChange={e=>onChange('data_inicio', e.target.value)} />
            </div>
            <div>
              <div className="small">Data fim *</div>
              <input className="input" type="date" value={form.data_fim} onChange={e=>onChange('data_fim', e.target.value)} />
            </div>

            <div>
              <div className="small">Valor inicial *</div>
              <input className="input" value={form.valor_inicial} onChange={e=>onChange('valor_inicial', e.target.value)} placeholder="Ex.: 10000" />
            </div>
            <div style={{display:'flex', alignItems:'end', gap:10}}>
              <label className="small" style={{display:'flex', gap:8, alignItems:'center'}}>
                <input type="checkbox" checked={form.renovavel} onChange={e=>onChange('renovavel', e.target.checked)} />
                Renovável
              </label>
            </div>

            <div>
              <div className="small">Gestor</div>
              <select className="input" value={form.gestor_id} onChange={e=>onChange('gestor_id', e.target.value)}>
                <option value="">—</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
              </select>
            </div>
            <div>
              <div className="small">Fiscal</div>
              <select className="input" value={form.fiscal_id} onChange={e=>onChange('fiscal_id', e.target.value)}>
                <option value="">—</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
              </select>
            </div>

            <div style={{gridColumn:'1 / -1'}}>
              <div className="small">Objeto</div>
              <input className="input" value={form.objeto} onChange={e=>onChange('objeto', e.target.value)} />
            </div>

            <div style={{gridColumn:'1 / -1'}}>
              <div className="small">Observações</div>
              <textarea className="input" rows="3" value={form.observacoes} onChange={e=>onChange('observacoes', e.target.value)} />
            </div>
          </div>

          {msg && <div className="small" style={{marginTop:10, fontWeight:900}}>{msg}</div>}

          <button className="btn" style={{marginTop:14}} disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar contrato'}
          </button>
        </form>
      </div>
    </div>
  )
}
