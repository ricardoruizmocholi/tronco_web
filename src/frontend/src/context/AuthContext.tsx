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
  user:           AuthUser | null
  loading:        boolean
  login:          (email: string, password: string) => Promise<void>
  register:       (name: string, email: string, password: string, confirmation: string) => Promise<void>
  logout:         () => Promise<void>
  refreshUser:    () => Promise<void>
  setUser:        (user: AuthUser) => void
  forgotPassword: (email: string) => Promise<string>
  resetPassword:  (token: string, email: string, password: string, confirmation: string) => Promise<string>
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

  // Vuelve a pedir el usuario autenticado — usado tras el callback de Google
  // OAuth, donde la sesión se crea en el backend sin pasar por login()/register().
  async function refreshUser(): Promise<void> {
    try {
      const { data } = await api.get<AuthUser>('/api/user')
      setUser(data)
    } catch {
      setUser(null)
    }
  }

  async function forgotPassword(email: string): Promise<string> {
    const { data } = await api.post<{ message: string }>('/api/forgot-password', { email })
    return data.message
  }

  async function resetPassword(
    token: string, email: string, password: string, confirmation: string
  ): Promise<string> {
    const { data } = await api.post<{ message: string }>('/api/reset-password', {
      token,
      email,
      password,
      password_confirmation: confirmation,
    })
    return data.message
  }

  return (
    <AuthContext.Provider value={{
      user, loading, login, register, logout, refreshUser, setUser, forgotPassword, resetPassword,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext must be used inside <AuthProvider>')
  return ctx
}
