import { useState } from 'react'
import { signOut } from 'firebase/auth'
import { NavLink, useNavigate } from 'react-router-dom'
import { auth } from '../firebase.js'
import { useTheme } from '../context/ThemeContext.jsx'
import { ROUTES } from '../utils/routes.js'
import ThemeToggle from './ThemeToggle.jsx'

export default function Navbar() {
  const navigate = useNavigate()
  const { themeSyncError } = useTheme()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [error, setError] = useState('')

  async function handleLogout() {
    setError('')
    setIsLoggingOut(true)

    try {
      await signOut(auth)
      navigate(ROUTES.auth, { replace: true })
    } catch {
      setError('Could not log out. Please try again.')
      setIsLoggingOut(false)
    }
  }

  return (
    <header className="site-navbar">
      <div className="navbar-inner">
        <NavLink className="navbar-brand" to={ROUTES.home}>
          <span className="brand-mark" aria-hidden="true"><span /></span>
          <span>FloodSense</span>
        </NavLink>

        <nav className="navbar-links" aria-label="Primary navigation">
          <NavLink
            className={({ isActive }) => `navbar-link${isActive ? ' is-active' : ''}`}
            to={ROUTES.home}
            end
          >
            Home
          </NavLink>
          <NavLink
            className={({ isActive }) => `navbar-link${isActive ? ' is-active' : ''}`}
            to={ROUTES.account}
          >
            Account
          </NavLink>
        </nav>

        <div className="navbar-actions">
          <ThemeToggle />
          <button
            className="navbar-logout"
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? 'Logging out...' : 'Logout'}
          </button>
        </div>
      </div>
      {error && <p className="navbar-error" role="alert">{error}</p>}
      {themeSyncError && (
        <p className="navbar-error" role="status">
          Theme changed on this device, but could not be saved to your account.
        </p>
      )}
    </header>
  )
}