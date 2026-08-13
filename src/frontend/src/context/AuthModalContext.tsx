import { createContext, useContext, useState } from 'react'

export type AuthModalTab = 'login' | 'register'

interface AuthModalContextValue {
  isOpen:     boolean
  defaultTab: AuthModalTab
  openModal:  (tab?: AuthModalTab) => void
  closeModal: () => void
}

const AuthModalContext = createContext<AuthModalContextValue | null>(null)

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen]         = useState(false)
  const [defaultTab, setDefaultTab] = useState<AuthModalTab>('login')

  function openModal(tab: AuthModalTab = 'login') {
    setDefaultTab(tab)
    setIsOpen(true)
  }

  function closeModal() {
    setIsOpen(false)
  }

  return (
    <AuthModalContext.Provider value={{ isOpen, defaultTab, openModal, closeModal }}>
      {children}
    </AuthModalContext.Provider>
  )
}

export function useAuthModal(): AuthModalContextValue {
  const ctx = useContext(AuthModalContext)
  if (!ctx) throw new Error('useAuthModal must be used inside <AuthModalProvider>')
  return ctx
}
