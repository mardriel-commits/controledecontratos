import React from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'

import { useAuth } from './lib/auth'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import NewContract from './pages/NewContract.jsx'
import ContractDetail from './pages/ContractDetail.jsx'
import Users from './pages/Users.jsx'
import Audit from './pages/Audit.jsx'
import Alerts from './pages/Alerts.jsx'

function RequireAuth({ children }) {
  const { loading, isAuthenticated } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        Carregando...
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
      <Route path="/contracts/new" element={<RequireAuth><NewContract /></RequireAuth>} />
      <Route path="/contracts/:id" element={<RequireAuth><ContractDetail /></RequireAuth>} />
      <Route path="/users" element={<RequireAuth><Users /></RequireAuth>} />
      <Route path="/audit" element={<RequireAuth><Audit /></RequireAuth>} />
      <Route path="/alerts" element={<RequireAuth><Alerts /></RequireAuth>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
