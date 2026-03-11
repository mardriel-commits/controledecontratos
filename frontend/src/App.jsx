import React, { useEffect, useMemo, useState } from 'react'

const API = (import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api'

function semDot(semaforo){
  if(semaforo==='VERMELHO') return 'red'
  if(semaforo==='AMARELO') return 'yellow'
  return 'green'
}

function getToken(){
  return localStorage.getItem('access_token') || ''
}
function setToken(t){
  if(t) localStorage.setItem('access_token', t)
  else localStorage.removeItem('access_token')
}

export default function App(){
  const [contracts,setContracts]=useState([])
  const [q,setQ]=useState('')
  const [loading,setLoading]=useState(false)

  async function login(){
    const email = prompt('E-mail:')
    if(!email) return
    const password = prompt('Senha:')
    if(!password) return

    const r = await fetch(`${API}/auth/login`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      credentials:'include',
      body: JSON.stringify({ email, password })
    })
    const j = await r.json().catch(()=> ({}))
    if(!r.ok){
      alert(j?.error || 'Falha no login')
      return
    }
    setToken(j.access_token)
    alert('Login OK! Agora clique em Atualizar.')
  }

  async function load(){
    setLoading(true)
    try{
      const token = getToken()
      const r = await fetch(`${API}/contracts`,{
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })

      if(r.status === 401){
        alert('Acesso negado (401). Clique em Entrar.')
        setContracts([])
        return
      }

      const j=await r.json()
      setContracts(Array.isArray(j) ? j : [])
    } finally { setLoading(false) }
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
            <div className="small">Cores Sebrae • Semáforo: verde OK, amarelo ≤30, vermelho ≤15</div>
          </div>
        </div>

        <div style={{display:'flex', gap:10}}>
          <button className="btn" onClick={login}>Entrar</button>
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
              {filtered.map(c=>(
                <tr className="row" key={c.id}>
                  <td><span className="badge"><span className={`dot ${semDot(c.semaforo)}`} /> {c.semaforo}</span></td>
                  <td style={{fontWeight:900}}>{c.numero_contrato}</td>
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
