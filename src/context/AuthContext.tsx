/* oxlint-disable react/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getSession, login as apiLogin, SESSION_EXPIRED_EVENT } from '../api'
import type { Role, User } from '../types'

interface AuthValue {
  user: User | null
  login: (role: Role) => Promise<void>
  logout: () => void
  loading: boolean
  error: string
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  function clearSession(message = '') {
    localStorage.removeItem('katiba_os_token')
    localStorage.removeItem('katiba_os_role')
    setUser(null)
    setError(message)
  }

  useEffect(() => {
    const token = localStorage.getItem('katiba_os_token')
    if (!token) {
      setLoading(false)
      return
    }
    getSession()
      .then((session) => {
        if (session.token) localStorage.setItem('katiba_os_token', session.token)
        localStorage.setItem('katiba_os_role', session.user.role)
        setUser(session.user)
      })
      .catch((reason: unknown) => clearSession(reason instanceof Error ? reason.message : 'Your session has ended. Please enter again.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const onExpired = (event: Event) => {
      const message = event instanceof CustomEvent && typeof event.detail === 'string'
        ? event.detail
        : 'Your session has ended. Please enter again.'
      clearSession(message)
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired)
  }, [])

  const value = useMemo<AuthValue>(() => ({
    user,
    loading,
    error,
    login: async (role) => {
      setLoading(true)
      setError('')
      try {
        const session = await apiLogin(role)
        localStorage.setItem('katiba_os_token', session.token)
        localStorage.setItem('katiba_os_role', role)
        setUser(session.user)
      } catch (reason) {
        const message = reason instanceof Error ? reason.message : 'Katiba OS could not start the secure session.'
        setError(message)
        throw reason
      } finally { setLoading(false) }
    },
    logout: () => clearSession(),
  }), [error, loading, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
