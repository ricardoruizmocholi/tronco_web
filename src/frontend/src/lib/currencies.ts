export interface Currency {
  code: string
  symbol: string
  name: string
  // Tasa fija EUR → esta divisa. Sin API externa — actualizar aquí a mano.
  rate: number
  decimals: number
  symbolPosition: 'before' | 'after'
  // Añade el código junto al símbolo cuando el símbolo por sí solo es ambiguo (varias
  // divisas comparten "$").
  showCode: boolean
}

export const CURRENCIES: Currency[] = [
  {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    rate: 1.0,
    decimals: 2,
    symbolPosition: 'after',
    showCode: false,
  },
  {
    code: 'USD',
    symbol: '$',
    name: 'Dólar estadounidense',
    rate: 1.09,
    decimals: 2,
    symbolPosition: 'before',
    showCode: false,
  },
  {
    code: 'GBP',
    symbol: '£',
    name: 'Libra esterlina',
    rate: 0.85,
    decimals: 2,
    symbolPosition: 'before',
    showCode: false,
  },
  {
    code: 'MXN',
    symbol: '$',
    name: 'Peso mexicano',
    rate: 19.5,
    decimals: 2,
    symbolPosition: 'before',
    showCode: true,
  },
  {
    code: 'ARS',
    symbol: '$',
    name: 'Peso argentino',
    rate: 1050.0,
    decimals: 0,
    symbolPosition: 'before',
    showCode: true,
  },
  {
    code: 'COP',
    symbol: '$',
    name: 'Peso colombiano',
    rate: 4500.0,
    decimals: 0,
    symbolPosition: 'before',
    showCode: true,
  },
  {
    code: 'CLP',
    symbol: '$',
    name: 'Peso chileno',
    rate: 1020.0,
    decimals: 0,
    symbolPosition: 'before',
    showCode: true,
  },
]

export const DEFAULT_CURRENCY: Currency = CURRENCIES[0]

// cents en EUR → céntimos equivalentes en la divisa destino (puede tener decimales:
// la tasa no garantiza un número entero de céntimos).
export function convertCents(cents: number, rate: number): number {
  return cents * rate
}

const numberFormatCache = new Map<number, Intl.NumberFormat>()

function getNumberFormat(decimals: number): Intl.NumberFormat {
  let fmt = numberFormatCache.get(decimals)
  if (!fmt) {
    fmt = new Intl.NumberFormat('es-ES', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
    numberFormatCache.set(decimals, fmt)
  }
  return fmt
}

export function formatPrice(cents: number, currency: Currency): string {
  const amount = convertCents(cents, currency.rate) / 100
  const number = getNumberFormat(currency.decimals).format(amount)

  const withSymbol = currency.symbolPosition === 'before'
    ? `${currency.symbol}${number}`
    : `${number} ${currency.symbol}`

  return currency.showCode ? `${withSymbol} ${currency.code}` : withSymbol
}
