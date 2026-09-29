import { useEffect, useRef, useState } from 'react'
import { doc, setDoc } from 'firebase/firestore'
import { useAuth } from './AuthContext.jsx'
import { ThemeContext } from './ThemeContext.jsx'
import { db } from '../firebase.js'
import { getFirestoreDocWithTimeout } from '../utils/firestore.js'

const THEME_STORAGE_KEY = 'floodsense-theme'
const THEMES = ['light', 'dark']

function getInitialTheme() {
  let storedTheme

  try {
    storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)
  } catch {
    storedTheme = null
  }

  const theme = THEMES.includes(storedTheme) ? storedTheme : 'light'
  document.documentElement.dataset.theme = theme
  return theme
}

export function ThemeProvider({ children }) {
  const { user, loading } = useAuth()
  const [theme, setTheme] = useState(getInitialTheme)
  const [themeSyncError, setThemeSyncError] = useState(false)
  const themeChangeVersion = useRef(0)

  useEffect(() => {
    document.documentElement.dataset.theme = theme

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch {
      return
    }
  }, [theme])

  useEffect(() => {
    if (loading || !user) return undefined

    let isCurrent = true
    const versionAtRequest = themeChangeVersion.current

    async function syncThemeFromFirestore() {
      try {
        const userDocument = await getFirestoreDocWithTimeout(doc(db, 'users', user.uid))
        const savedTheme = userDocument.exists() ? userDocument.data().theme : null

        if (
          isCurrent &&
          versionAtRequest === themeChangeVersion.current &&
          THEMES.includes(savedTheme)
        ) {
          setTheme(savedTheme)
        }
      } catch {
        return
      }
    }

    void syncThemeFromFirestore()

    return () => {
      isCurrent = false
    }
  }, [loading, user])

  async function toggleTheme() {
    const nextTheme = theme === 'light' ? 'dark' : 'light'
    themeChangeVersion.current += 1
    setThemeSyncError(false)
    document.documentElement.dataset.theme = nextTheme
    setTheme(nextTheme)

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme)
    } catch {
      // The in-memory theme still applies when storage is unavailable.
    }

    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid), { theme: nextTheme }, { merge: true })
      } catch {
        setThemeSyncError(true)
      }
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, themeSyncError }}>
      {children}
    </ThemeContext.Provider>
  )
}