import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminNotifications } from '../../context/AdminNotificationsContext'
import type { AdminNotificationItem, AdminNotificationType } from '../../types/adminNotification'

const TYPE_ROUTE: Record<AdminNotificationType, { path: string; param: string }> = {
  order:    { path: '/admin/pedidos',     param: 'order' },
  return:   { path: '/admin/devoluciones', param: 'return' },
  preorder: { path: '/admin/preorders',   param: 'preorder' },
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"
      strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  )
}

export default function NotificationBell() {
  const { items, total, refetch } = useAdminNotifications()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  function handleItemClick(item: AdminNotificationItem) {
    const route = TYPE_ROUTE[item.type]
    setOpen(false)
    navigate(`${route.path}?${route.param}=${item.id}`)
  }

  function handleToggle() {
    if (!open) refetch()
    setOpen(o => !o)
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={handleToggle}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`Notificaciones${total > 0 ? ` (${total} pendientes)` : ''}`}
        className="relative p-1.5 text-ink/60 hover:text-ink transition-colors"
      >
        <BellIcon />
        {total > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5
            bg-red-500 text-white text-[10px] font-bold rounded-full
            flex items-center justify-center leading-none">
            {total > 9 ? '9+' : total}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-80 max-h-[70vh] overflow-y-auto
          bg-white border border-ink/10 z-50">
          <div className="px-4 py-3 border-b border-ink/10 label-caps text-ink/50">
            Tareas pendientes {total > 0 && `(${total})`}
          </div>

          {items.length === 0 ? (
            <p className="px-4 py-6 text-sm text-ink/40 text-center">
              No hay nada pendiente por ahora.
            </p>
          ) : (
            <ul>
              {items.map(item => (
                <li key={`${item.type}-${item.id}`}>
                  <button
                    type="button"
                    onClick={() => handleItemClick(item)}
                    className="w-full text-left px-4 py-3 border-b border-ink/5 last:border-0
                      hover:bg-ink/5 transition-colors"
                  >
                    <p className="text-sm font-medium text-ink">{item.title}</p>
                    <p className="text-xs text-ink/50 mt-0.5">{item.subtitle}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
