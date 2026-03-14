import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './auth'

export default function PrivateRoute({ children }) {
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
