import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'

import { useAuth } from './lib/auth'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import NewContract from './pages/NewContract.jsx'
import ContractDetail from './pages/ContractDetail.jsx'

function RequireAuth({ children }) {
  const { token } = useAuth()
  if (!token) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
      <Route path="/contracts/new" element={<RequireAuth><NewContract /></RequireAuth>} />
      <Route path="/contracts/:id" element={<RequireAuth><ContractDetail /></RequireAuth>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
