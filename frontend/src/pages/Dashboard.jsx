import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useApi } from '../lib/api'

function semDot(semaforo){
  if(semaforo==='VERMELHO') return 'red'
  if(semaforo==='AMARELO') return 'yellow'
  return 'green'
}

export default function Dashboard(){
  const api = useApi()
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
  const [contracts,setContracts]=useState([])
  const [q,setQ]=useState('')
  const [loading,setLoading]=useState(false)
  const [error,setError]=useState('')

  async function load(){
    setLoading(true)
    setError('')
    try{
      const j = await api.getContracts()
      setContracts(Array.isArray(j) ? j : [])
    } catch(e){
      setError(e.message || 'Erro ao carregar')
      setContracts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(()=>{ load() },[])

  const filtered=useMemo(()=>{
    const s=q.trim().toLowerCase()
    if(!s) return contracts
    return contracts.filter(c =>
      (c.numero_contrato||'').toLowerCase().includes(s) ||
      (c.empresa||'').toLowerCase().includes(s) ||
      (c.cnpj||'').toLowerCase().includes(s)
    )
  },[contracts,q])

  const kpis=useMemo(()=>{
    const ativos=contracts.filter(c=>c.status==='ATIVO')
    return {
      ativos: ativos.length,
      ate30: ativos.filter(c=>c.dias_para_vencer<=30).length,
      ate15: ativos.filter(c=>c.dias_para_vencer<=15).length
    }
  },[contracts])

  return (
    <div className="container">
      <div className="topbar">
        <div className="brand">
          <div className="logo" />
          <div>
            <div className="h1">Gestão de Contratos</div>
            <div className="small">Branco • Texto preto • Detalhes em azul • Semáforo: verde OK, amarelo ≤30, vermelho ≤15</div>
          </div>
        </div>

        <div style={{display:'flex', gap:10, flexWrap:'wrap'}}>
          <Link className="btn" to="/contracts/new">Novo Contrato</Link>
          {isAdmin && <Link className="btn" to="/users">Usuários</Link>}
          {isAdmin && <Link className="btn" to="/audit">Auditoria</Link>}
          {isAdmin && <Link className="btn" to="/alerts">Alertas</Link>}

          <Link className="btn" to="/contracts/new">Novo Contrato</Link>
          <button className="btn" onClick={api.logout} style={{background:'#fff', color:'var(--primary)', border:'1px solid var(--primary)'}}>Sair</button>
          <button className="btn" onClick={load} disabled={loading}>{loading?'Atualizando...':'Atualizar'}</button>
        </div>
      </div>

      <div className="grid">
        <div className="card">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <div style={{fontWeight:900}}>Indicadores</div>
            <span className="badge"><span className="dot green"/> OK</span>
            <span className="badge" style={{marginLeft:8}}><span className="dot yellow"/> ≤ 30 dias</span>
            <span className="badge" style={{marginLeft:8}}><span className="dot red"/> ≤ 15 dias</span>
          </div>

          <div className="kpis">
            <div className="kpi"><div className="small">Ativos</div><div className="v">{kpis.ativos}</div></div>
            <div className="kpi"><div className="small">Vencem ≤ 30</div><div className="v">{kpis.ate30}</div></div>
            <div className="kpi"><div className="small">Vencem ≤ 15</div><div className="v">{kpis.ate15}</div></div>
          </div>

          <div style={{marginTop:16}}>
            <div className="small" style={{marginBottom:8}}>Buscar (contrato, empresa ou CNPJ)</div>
            <input className="input" value={q} onChange={e=>setQ(e.target.value)} placeholder="Ex.: CT-001, Empresa X, 123..." />
          </div>

          {error && (
            <div style={{marginTop:12, fontSize:13, fontWeight:800, color:'#b42318'}}>{error}</div>
          )}
        </div>

        <div className="card">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
            <div style={{fontWeight:900}}>Contratos</div>
            <div className="small">{filtered.length} registros</div>
          </div>

          <table className="table">
            <thead>
              <tr>
                <th>Semáforo</th>
                <th>Contrato</th>
                <th>Empresa</th>
                <th>Vencimento</th>
                <th>Dias</th>
                <th>Renovável</th>
                <th>Saldo</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c=> (
                <tr className="row" key={c.id}>
                  <td><span className="badge"><span className={`dot ${semDot(c.semaforo)}`} /> {c.semaforo}</span></td>
                  <td style={{fontWeight:900}}>
                    <Link to={`/contracts/${c.id}`} style={{color:'var(--primary)'}}>{c.numero_contrato}</Link>
                  </td>
                  <td>{c.empresa}</td>
                  <td>{new Date(c.data_fim).toLocaleDateString('pt-BR')}</td>
                  <td style={{fontWeight:900}}>{c.dias_para_vencer}</td>
                  <td>{c.renovavel ? 'SIM' : 'NÃO'}</td>
                  <td>R$ {Number(c.saldo_atual||0).toLocaleString('pt-BR',{minimumFractionDigits:2, maximumFractionDigits:2})}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan="7" className="small" style={{padding:16, opacity:0.8}}>Nenhum registro.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
