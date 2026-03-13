import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApi } from '../lib/api'
import { useAuth } from '../lib/auth'

export default function Audit(){
  const api = useApi()
  const { user } = useAuth()
  const [rows, setRows] = useState([])
  const [msg, setMsg] = useState('')
  const [filters, setFilters] = useState({ entity:'', action:'' })

  const isAdmin = user?.role === 'ADMIN'

  async function load(){
    setMsg('')
    try{
      const qs = []
      if(filters.entity) qs.push(`entity=${encodeURIComponent(filters.entity)}`)
      if(filters.action) qs.push(`action=${encodeURIComponent(filters.action)}`)
      const j = await api.getAudit(qs.length ? `?${qs.join('&')}` : '')
      setRows(Array.isArray(j)?j:[])
    } catch(e){
      setMsg(e.message||'Erro')
    }
  }

  useEffect(()=>{ if(isAdmin) load() }, [isAdmin])

  if(!isAdmin){
    return (
      <div className="container">
        <div className="topbar">
          <div className="brand"><div className="logo"/><div><div className="h1">Auditoria</div><div className="small">Acesso restrito</div></div></div>
          <Link className="btn" to="/">Voltar</Link>
        </div>
        <div className="card"><div style={{fontWeight:900}}>Somente ADMIN.</div></div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="topbar">
        <div className="brand"><div className="logo"/><div><div className="h1">Auditoria</div><div className="small">Log de ações</div></div></div>
        <Link className="btn" to="/">Voltar</Link>
      </div>

      <div className="card" style={{marginTop:12}}>
        <div style={{display:'flex', gap:10, alignItems:'end'}}>
          <div style={{flex:1}}>
            <div className="small">Entidade</div>
            <select className="input" value={filters.entity} onChange={e=>setFilters(p=>({...p, entity:e.target.value}))}>
              <option value="">(todas)</option>
              <option value="contract">contract</option>
              <option value="movement">movement</option>
              <option value="user">user</option>
            </select>
          </div>
          <div style={{flex:1}}>
            <div className="small">Ação</div>
            <select className="input" value={filters.action} onChange={e=>setFilters(p=>({...p, action:e.target.value}))}>
              <option value="">(todas)</option>
              <option value="CREATE">CREATE</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>
          <button className="btn" onClick={load}>Filtrar</button>
        </div>

        {msg && <div className="small" style={{fontWeight:900, marginTop:10}}>{msg}</div>}

        <table className="table" style={{marginTop:12}}>
          <thead>
            <tr>
              <th>Data</th><th>Usuário</th><th>Ação</th><th>Entidade</th><th>ID</th><th>Detalhes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r=>(
              <tr key={r.id} className="row">
                <td>{r.created_at ? new Date(r.created_at).toLocaleString('pt-BR') : '—'}</td>
                <td>{r.user_id ?? '—'}</td>
                <td style={{fontWeight:900}}>{r.action}</td>
                <td>{r.entity}</td>
                <td>{r.entity_id ?? '—'}</td>
                <td className="small">{r.changes ? JSON.stringify(r.changes) : '—'}</td>
              </tr>
            ))}
            {rows.length===0 && <tr><td colSpan="6" className="small" style={{padding:16}}>Sem registros</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
