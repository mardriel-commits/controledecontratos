import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApi } from '../lib/api'
import { useAuth } from '../lib/auth'

export default function Users(){
  const api = useApi()
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState({ name:'', email:'', role:'GESTOR', password:'', active:true })
  const [loading, setLoading] = useState(false)

  const isAdmin = user?.role === 'ADMIN'

  async function load(){
    setLoading(true)
    try{
      const j = await api.getUsers()
      setUsers(Array.isArray(j)?j:[])
    } catch(e){
      setMsg(e.message||'Erro')
    } finally { setLoading(false) }
  }
  useEffect(()=>{ load() },[])

  async function create(e){
    e.preventDefault()
    setMsg('')
    try{
      await api.request('/users', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify(form)
      })
      setForm({ name:'', email:'', role:'GESTOR', password:'', active:true })
      await load()
    } catch(e){
      setMsg(e.message||'Erro ao criar')
    }
  }

  async function toggleActive(u){
    try{
      await api.updateUser(u.id, { active: !u.active })
      await load()
    } catch(e){
      setMsg(e.message||'Erro')
    }
  }

  async function resetPassword(u){
    const p = prompt('Nova senha para '+u.email+':')
    if(!p) return
    try{
      await api.updateUser(u.id, { password: p })
      alert('Senha atualizada')
    } catch(e){
      setMsg(e.message||'Erro')
    }
  }

  if(!isAdmin){
    return (
      <div className="container">
        <div className="topbar">
          <div className="brand"><div className="logo" /><div><div className="h1">Usuários</div><div className="small">Acesso restrito</div></div></div>
          <Link className="btn" to="/">Voltar</Link>
        </div>
        <div className="card"><div style={{fontWeight:900}}>Somente ADMIN.</div></div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="topbar">
        <div className="brand"><div className="logo" /><div><div className="h1">Usuários</div><div className="small">Cadastro e permissões</div></div></div>
        <Link className="btn" to="/">Voltar</Link>
      </div>

      <div className="grid" style={{gridTemplateColumns:'420px 1fr'}}>
        <div className="card">
          <div style={{fontWeight:900, marginBottom:10}}>Novo usuário</div>
          <form onSubmit={create}>
            <div className="small">Nome</div>
            <input className="input" value={form.name} onChange={e=>setForm(prev=>({...prev,name:e.target.value}))} />
            <div className="small" style={{marginTop:10}}>E-mail</div>
            <input className="input" value={form.email} onChange={e=>setForm(prev=>({...prev,email:e.target.value}))} />
            <div className="small" style={{marginTop:10}}>Perfil</div>
            <select className="input" value={form.role} onChange={e=>setForm(prev=>({...prev,role:e.target.value}))}>
              <option value="ADMIN">ADMIN</option>
              <option value="GESTOR">GESTOR</option>
              <option value="FISCAL">FISCAL</option>
              <option value="CONSULTA">CONSULTA</option>
            </select>
            <div className="small" style={{marginTop:10}}>Senha (opcional)</div>
            <input className="input" type="password" value={form.password} onChange={e=>setForm(prev=>({...prev,password:e.target.value}))} />
            <button className="btn" style={{marginTop:12, width:'100%'}}>Criar</button>
          </form>
          {msg && <div className="small" style={{fontWeight:900, marginTop:10}}>{msg}</div>}
        </div>

        <div className="card">
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10}}>
            <div style={{fontWeight:900}}>Lista</div>
            <button className="btn" onClick={load} disabled={loading}>{loading?'...':'Atualizar'}</button>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th><th>E-mail</th><th>Perfil</th><th>Ativo</th><th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u=>(
                <tr key={u.id} className="row">
                  <td style={{fontWeight:900}}>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.role}</td>
                  <td>{u.active ? 'SIM':'NÃO'}</td>
                  <td style={{display:'flex', gap:8}}>
                    <button className="btn" onClick={()=>toggleActive(u)}>{u.active?'Desativar':'Ativar'}</button>
                    <button className="btn" onClick={()=>resetPassword(u)}>Senha</button>
                  </td>
                </tr>
              ))}
              {users.length===0 && <tr><td colSpan="5" className="small" style={{padding:16}}>Sem usuários</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
