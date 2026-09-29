import { useState } from 'react'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import { auth, db } from '../firebase.js'
import { useTheme } from '../context/ThemeContext.jsx'

const FRIENDLY_ERRORS = {
  'auth/email-already-in-use': 'An account with this email already exists. Try logging in instead.',
  'auth/configuration-not-found': 'Firebase could not find this project\'s Auth configuration. Verify the API key and app ID in .env.local came from a Web app in the same Firebase project where Email/Password is enabled.',
  'auth/invalid-credential': 'That email and password combination did not match. Check them and try again.',
  'auth/invalid-email': 'Enter a valid email address and try again.',
  'auth/network-request-failed': 'We could not reach the server. Check your connection and try again.',
  'auth/operation-not-allowed': 'Email and password sign-in is disabled. Enable it in Firebase Authentication settings.',
  'auth/unauthorized-domain': 'This site is not authorized for Firebase sign-in. Add its domain in Firebase Authentication settings.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment before trying again.',
  'auth/user-disabled': 'This account has been disabled. Contact the project administrator.',
  'auth/weak-password': 'Choose a stronger password with at least 6 characters.',
  'auth/wrong-password': 'That password is incorrect. Try again or reset your password.',
  'permission-denied': 'Firestore blocked saving your profile. Allow signed-in users to write only their own users/{uid} document in Firestore rules.',
}

export default function AuthPage() {
  const { theme } = useTheme()
  const [mode, setMode] = useState('signup')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const isSignUp = mode === 'signup'

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    if (isSignUp && !name.trim()) {
      setError('Enter your name to create an account.')
      return
    }
    setIsLoading(true)

    try {
      if (isSignUp) {
        const credential = await createUserWithEmailAndPassword(auth, email, password)
        await setDoc(doc(db, 'users', credential.user.uid), {
          name: name.trim(),
          email: credential.user.email,
          savedLocation: null,
          theme,
        })
      } else {
        await signInWithEmailAndPassword(auth, email, password)
      }
    } catch (authError) {
      const message = FRIENDLY_ERRORS[authError.code] ?? (
        isSignUp
          ? 'We could not create your account. Check your Firebase setup and try again.'
          : 'We could not log you in. Check your Firebase setup and try again.'
      )
      const errorCode = import.meta.env.DEV && authError.code ? ` (${authError.code})` : ''
      setError(`${message}${errorCode}`)
    } finally {
      setIsLoading(false)
    }
  }

  function switchMode(nextMode) {
    setMode(nextMode)
    setError('')
  }

  return (
    <main className="auth-page">
      <a className="auth-brand" href="/" aria-label="FloodSense home">
        <span className="brand-mark" aria-hidden="true"><span /></span>
        <span>FloodSense</span>
      </a>

      <section className="auth-card" aria-labelledby="auth-title">
        <div className="auth-card-heading">
          <p className="auth-eyebrow">Your local water outlook</p>
          <h1 id="auth-title">{isSignUp ? 'Stay ahead of the water.' : 'Welcome back.'}</h1>
          <p className="auth-description">
            {isSignUp
              ? 'Create an account to keep your flood updates close.'
              : 'Log in to return to your flood monitoring workspace.'}
          </p>
        </div>

        <div className="auth-tabs" role="group" aria-label="Account access">
          <button
            className={isSignUp ? 'auth-tab is-active' : 'auth-tab'}
            type="button"
            aria-pressed={isSignUp}
            onClick={() => switchMode('signup')}
            disabled={isLoading}
          >
            Sign Up
          </button>
          <button
            className={!isSignUp ? 'auth-tab is-active' : 'auth-tab'}
            type="button"
            aria-pressed={!isSignUp}
            onClick={() => switchMode('login')}
            disabled={isLoading}
          >
            Log In
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {isSignUp && (
            <label className="auth-field">
              <span>Name</span>
              <input
                autoComplete="name"
                name="name"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </label>
          )}
          <label className="auth-field">
            <span>Email</span>
            <input
              autoComplete="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className="auth-field">
            <span>Password</span>
            <input
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              name="password"
              type="password"
              placeholder={isSignUp ? 'At least 6 characters' : 'Your password'}
              minLength={isSignUp ? 6 : undefined}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          {error && <p className="auth-error" role="alert">{error}</p>}

          <button className="auth-submit" type="submit" disabled={isLoading}>
            {isLoading ? (
              <><span className="auth-spinner" aria-hidden="true" />{isSignUp ? 'Creating account...' : 'Logging in...'}</>
            ) : isSignUp ? 'Create account' : 'Log in'}
          </button>
        </form>
        <p className="auth-footnote">Clearer signals. Better prepared.</p>
      </section>

      <p className="auth-copyright">FloodSense <span aria-hidden="true">|</span> Local insight for changing conditions</p>
    </main>
  )
}
