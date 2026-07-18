/* oxlint-disable react/only-export-components */
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { login as apiLogin } from '../api'
import { demoUsers } from '../data/demo'
import type { Role, User } from '../types'

interface AuthValue {
  user: User | null
  login: (role: Role) => Promise<void>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const storedRole = localStorage.getItem('katiba_os_role') as Role | null
  const [user, setUser] = useState<User | null>(storedRole ? demoUsers[storedRole] : null)
  const [loading, setLoading] = useState(false)

  const value = useMemo<AuthValue>(() => ({
    user,
    loading,
    login: async (role) => {
      setLoading(true)
      try {
        const session = await apiLogin(role)
        localStorage.setItem('katiba_os_token', session.token)
        localStorage.setItem('katiba_os_role', role)
        setUser(session.user)
      } finally { setLoading(false) }
    },
    logout: () => {
      localStorage.removeItem('katiba_os_token')
      localStorage.removeItem('katiba_os_role')
      setUser(null)
    },
  }), [loading, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
