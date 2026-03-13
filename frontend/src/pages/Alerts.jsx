import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApi } from '../lib/api'
import { useAuth } from '../lib/auth'

export default function Alerts(){
  const api = useApi()
  const { user } = useAuth()
  const [rows, setRows] = useState([])
  const [msg, setMsg] = useState('')
  const isAdmin = user?.role === 'ADMIN'

  async function load(){
    setMsg('')
    try{
      const j = await api.getAlerts()
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
          <div className="brand"><div className="logo"/><div><div className="h1">Alertas</div><div className="small">Acesso restrito</div></div></div>
          <Link className="btn" to="/">Voltar</Link>
        </div>
        <div className="card"><div style={{fontWeight:900}}>Somente ADMIN.</div></div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="topbar">
        <div className="brand"><div className="logo"/><div><div className="h1">Alertas</div><div className="small">Log de alertas</div></div></div>
        <div style={{display:'flex', gap:10}}>
          <button className="btn" onClick={load}>Atualizar</button>
          <Link className="btn" to="/">Voltar</Link>
        </div>
      </div>

      <div className="card" style={{marginTop:12}}>
        {msg && <div className="small" style={{fontWeight:900}}>{msg}</div>}
        <table className="table" style={{marginTop:8}}>
          <thead><tr><th>Data</th><th>Contrato</th><th>Tipo</th><th>Status</th><th>Destinatários</th><th>Meta</th></tr></thead>
          <tbody>
            {rows.map(r=>(
              <tr key={r.id} className="row">
                <td>{r.created_at ? new Date(r.created_at).toLocaleString('pt-BR') : '—'}</td>
                <td>{r.contract_id ?? '—'}</td>
                <td style={{fontWeight:900}}>{r.alert_type}</td>
                <td>{r.status}</td>
                <td className="small">{r.recipients ? JSON.stringify(r.recipients) : '—'}</td>
                <td className="small">{r.meta ? JSON.stringify(r.meta) : '—'}</td>
              </tr>
            ))}
            {rows.length===0 && <tr><td colSpan="6" className="small" style={{padding:16}}>Sem registros</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
