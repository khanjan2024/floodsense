import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { ROUTES } from '../utils/routes.js'
import RouteLoader from './RouteLoader.jsx'

export default function PublicOnlyRoute() {
  const { user, loading } = useAuth()

  if (loading) return <RouteLoader />

  return user ? <Navigate to={ROUTES.home} replace /> : <Outlet />
}
