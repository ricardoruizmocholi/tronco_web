import { useEffect, useRef, useState } from 'react'
import { useCurrency } from '../hooks/useCurrency'

interface Props {
  // Clases del botón disparador — permite adaptarse al color del contexto
  // (header claro/oscuro vs. MobileDrawer, siempre oscuro).
  triggerClassName?: string
  align?: 'left' | 'right'
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"
      className={`transition-transform duration-200 flex-shrink-0 ${open ? 'rotate-180' : ''}`}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" className="flex-shrink-0">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 6 9 17l-5-5" />
    </svg>
  )
}

export default function CurrencySelector({ triggerClassName = '', align = 'right' }: Props) {
  const { selectedCurrency, setCurrency, currencies } = useCurrency()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  // Cierra el dropdown al hacer click fuera
  useEffect(() => {
    if (!open) return

    function handleClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex items-center gap-1 text-sm uppercase tracking-wide transition-colors duration-300 ${triggerClassName}`}
      >
        {selectedCurrency.code}
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Elegir divisa"
          className={`absolute top-full mt-2 ${align === 'right' ? 'right-0' : 'left-0'}
            min-w-[230px] bg-white border border-ink/10 shadow-lg z-50 py-1`}
        >
          {currencies.map(c => {
            const active = c.code === selectedCurrency.code
            return (
              <button
                key={c.code}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => { setCurrency(c.code); setOpen(false) }}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-sm text-left
                  hover:bg-ink/5 transition-colors ${active ? 'font-semibold text-ink' : 'text-ink/70'}`}
              >
                <span>{c.symbol} {c.code} — {c.name}</span>
                {active && <CheckIcon />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
