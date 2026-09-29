import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { ROUTES } from '../utils/routes.js'
import RouteLoader from './RouteLoader.jsx'
import Navbar from './Navbar.jsx'

export default function ProtectedRoute() {
  const { user, loading } = useAuth()

  if (loading) return <RouteLoader />

  return user ? <><Navbar /><Outlet /></> : <Navigate to={ROUTES.auth} replace />
}
