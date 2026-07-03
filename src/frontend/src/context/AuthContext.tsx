import { createContext, useContext, useEffect, useState } from 'react'
import api from '../lib/axios'

export interface AuthUser {
  id:         number
  name:       string
  email:      string
  role:       'user' | 'admin'
  is_blocked: boolean
}

interface AuthContextValue {
  user:     AuthUser | null
  loading:  boolean
  login:    (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string, confirmation: string) => Promise<void>
  logout:   () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/sanctum/csrf-cookie')
      .then(() => api.get<AuthUser>('/api/user'))
      .then(res => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  async function login(email: string, password: string): Promise<void> {
    const { data } = await api.post<AuthUser>('/api/login', { email, password })
    setUser(data)
  }

  async function register(
    name: string, email: string, password: string, confirmation: string
  ): Promise<void> {
    const { data } = await api.post<AuthUser>('/api/register', {
      name,
      email,
      password,
      password_confirmation: confirmation,
    })
    setUser(data)
  }

  async function logout(): Promise<void> {
    try {
      await api.post('/api/logout')
    } finally {
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext must be used inside <AuthProvider>')
  return ctx
}
