import React, { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useApi } from '../lib/api'
import { useAuth } from '../lib/auth'

function semDot(semaforo){
  if(semaforo==='VERMELHO') return 'red'
  if(semaforo==='AMARELO') return 'yellow'
  return 'green'
}

export default function ContractDetail(){
  const { id } = useParams()
  const api = useApi()
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
  const [contract, setContract] = useState(null)
  const [movs, setMovs] = useState([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  const [form, setForm] = useState({
    tipo: 'EXECUCAO',
    valor: '',
    data_movimento: '',
    numero_nf: '',
    descricao: ''
  })

  async function load(){
    setLoading(true)
    setMsg('')
    try{
      const c = await api.getContract(id)
      const m = await api.getMovements(id)
      setContract(c)
      setMovs(Array.isArray(m) ? m : [])
    } catch(e){
      setMsg(e.message || 'Erro ao carregar')
    } finally {
      setLoading(false)
    }
  }

  useEffect(()=>{ load() },[id])

  const saldo = useMemo(()=>{
    if(!contract) return 0
    return Number(contract.saldo_atual || 0)
  },[contract])

  
async function handleDeleteMovement(m){
  if(!isAdmin) return
  const reason = prompt('Motivo da exclusão (obrigatório):')
  if(!reason) return
  try{
    await api.deleteMovement(m.id, reason)
    await load()
  } catch(e){
    setMsg(e.message || 'Erro ao excluir')
  }
}

async function submitMovement(e){
    e.preventDefault()
    setMsg('')
    try{
      const payload = {
        tipo: form.tipo,
        valor: Number(form.valor || 0),
        data_movimento: form.data_movimento || undefined,
        numero_nf: form.numero_nf || undefined,
        descricao: form.descricao || undefined,
      }
      await api.createMovement(id, payload)
      setForm({ tipo:'EXECUCAO', valor:'', data_movimento:'', numero_nf:'', descricao:'' })
      await load()
    } catch(e){
      setMsg(e.message || 'Erro ao lançar')
    }
  }

  if(!contract){
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
        {msg && <div className="card"><div style={{fontWeight:800}}>{msg}</div></div>}
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
        <div style={{display:'flex', gap:10}}>
          <button className="btn" onClick={load} disabled={loading}>{loading?'Atualizando...':'Atualizar'}</button>
          <Link className="btn" to="/">Voltar</Link>
        </div>
      </div>

      <div className="grid" style={{gridTemplateColumns:'420px 1fr'}}>
        <div className="card">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
            <div style={{fontWeight:900}}>Resumo</div>
            <span className="badge"><span className={`dot ${semDot(contract.semaforo)}`} /> {contract.semaforo}</span>
          </div>
          <div className="small">Vigência</div>
          <div style={{fontWeight:900, marginTop:4}}>
            {new Date(contract.data_inicio).toLocaleDateString('pt-BR')} → {new Date(contract.data_fim).toLocaleDateString('pt-BR')}
          </div>
          <div className="small" style={{marginTop:8}}>Dias para vencer</div>
          <div style={{fontWeight:900, fontSize:18}}>{contract.dias_para_vencer}</div>

          <div className="small" style={{marginTop:10}}>Saldo atual</div>
          <div style={{fontWeight:900, fontSize:18}}>R$ {saldo.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>

          <div style={{marginTop:12}}>
            <div className="small">Renovável</div>
            <div style={{fontWeight:900}}>{contract.renovavel ? 'SIM' : 'NÃO'}</div>
            <div className="small" style={{marginTop:6}}>Pode renovar</div>
            <div style={{fontWeight:900}}>{contract.pode_renovar ? 'SIM' : 'NÃO'}</div>
            <div className="small" style={{marginTop:6}}>Limite renovação</div>
            <div style={{fontWeight:900}}>{new Date(contract.limite_renovacao).toLocaleDateString('pt-BR')}</div>
          </div>

          <div style={{marginTop:12}}>
            <div className="small">Gestor</div>
            <div style={{fontWeight:900}}>{contract.gestor?.name || '—'}</div>
            <div className="small" style={{marginTop:6}}>Fiscal</div>
            <div style={{fontWeight:900}}>{contract.fiscal?.name || '—'}</div>
          </div>
        </div>

        <div className="card">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
            <div style={{fontWeight:900}}>Movimentações de saldo</div>
            <div className="small">Gestor/Fiscal: use ESTORNO/AJUSTE • Admin: pode excluir (soft delete)</div>
          </div>

          <form onSubmit={submitMovement} style={{display:'grid', gridTemplateColumns:'140px 140px 160px 1fr', gap:10, marginBottom:12}}>
            <select className="input" value={form.tipo} onChange={e=>setForm(prev=>({...prev,tipo:e.target.value}))}>
              <option value="EXECUCAO">EXECUÇÃO</option>
              <option value="ESTORNO">ESTORNO</option>
              <option value="AJUSTE">AJUSTE</option>
            </select>
            <input className="input" value={form.valor} onChange={e=>setForm(prev=>({...prev,valor:e.target.value}))} placeholder="Valor" />
            <input className="input" type="date" value={form.data_movimento} onChange={e=>setForm(prev=>({...prev,data_movimento:e.target.value}))} />
            <input className="input" value={form.numero_nf} onChange={e=>setForm(prev=>({...prev,numero_nf:e.target.value}))} placeholder="NF (opcional)" />
            <input className="input" style={{gridColumn:'1 / -1'}} value={form.descricao} onChange={e=>setForm(prev=>({...prev,descricao:e.target.value}))} placeholder="Descrição (opcional)" />
            <button className="btn" style={{gridColumn:'1 / -1'}}>
              Lançar movimentação
            </button>
          </form>

          {msg && <div className="small" style={{fontWeight:900, marginBottom:10}}>{msg}</div>}

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
                <tr key={m.id} className="row" style={m.is_deleted ? {opacity:0.5, textDecoration:'line-through'} : undefined}>
                  <td>{new Date(m.data_movimento).toLocaleDateString('pt-BR')}</td>
                  <td style={{fontWeight:900}}>{m.tipo}</td>
                  <td>R$ {Number(m.valor||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
                  <td>{m.numero_nf || '—'}</td>
                  <td>{m.descricao || '—'}</td>
                  {isAdmin && (
                    <td>
                      {m.is_deleted ? '—' : (
                        <button className="btn" onClick={()=>handleDeleteMovement(m)}>Excluir</button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {movs.length === 0 && (
                <tr><td colSpan={isAdmin ? 6 : 5} className="small" style={{padding:16, opacity:0.8}}>Sem movimentações.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
