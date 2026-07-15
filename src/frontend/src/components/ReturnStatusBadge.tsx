import type { ReturnStatus } from '../types/returnRequest'

const CONFIG: Record<ReturnStatus, { label: string; className: string }> = {
  pending:  { label: 'Pendiente revisión', className: 'text-ink/50' },
  approved: { label: 'Aprobada',           className: 'text-primary' },
  rejected: { label: 'Rechazada',          className: 'text-secondary' },
  received: { label: 'Recibida',           className: 'text-ink' },
  refunded: { label: 'Reembolsada',        className: 'text-primary font-semibold' },
}

interface Props {
  status: ReturnStatus
}

export default function ReturnStatusBadge({ status }: Props) {
  const { label, className } = CONFIG[status] ?? CONFIG.pending
  return (
    <span className={`text-xs uppercase tracking-wide ${className}`}>
      {label}
    </span>
  )
}
