import { createContext, useContext, useState } from 'react'
import { CURRENCIES, DEFAULT_CURRENCY, formatPrice as formatPriceFor, type Currency } from '../lib/currencies'

const STORAGE_KEY = 'troncodrilo_currency'

interface CurrencyContextValue {
  selectedCurrency: Currency
  setCurrency: (code: string) => void
  formatPrice: (cents: number) => string
  currencies: Currency[]
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null)

function getStoredCurrency(): Currency {
  try {
    const code = localStorage.getItem(STORAGE_KEY)
    return CURRENCIES.find(c => c.code === code) ?? DEFAULT_CURRENCY
  } catch {
    return DEFAULT_CURRENCY
  }
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(getStoredCurrency)

  function setCurrency(code: string) {
    const next = CURRENCIES.find(c => c.code === code) ?? DEFAULT_CURRENCY
    setSelectedCurrency(next)
    try {
      localStorage.setItem(STORAGE_KEY, next.code)
    } catch {
      // localStorage no disponible (modo privado, cuota llena...) — la selección
      // sigue funcionando en memoria para esta sesión, simplemente no persiste.
    }
  }

  function formatPrice(cents: number): string {
    return formatPriceFor(cents, selectedCurrency)
  }

  return (
    <CurrencyContext.Provider value={{ selectedCurrency, setCurrency, formatPrice, currencies: CURRENCIES }}>
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrencyContext(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext)
  if (!ctx) throw new Error('useCurrencyContext must be used inside <CurrencyProvider>')
  return ctx
}
