import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  approveReturn,
  confirmReturnReceived,
  getAdminReturn,
  getAdminReturns,
  rejectReturn,
  updateReturnTracking,
} from '../../api/returns'
import ReturnStatusBadge from '../../components/ReturnStatusBadge'
import TrackingPanel from '../../components/TrackingPanel'
import type { AdminReturnsFilters, ReturnRequest, ReturnStatus } from '../../types/returnRequest'

const euros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })

const REASON_LABELS: Record<string, string> = {
  defectuoso:    'Defectuoso / dañado',
  no_corresponde:'No corresponde al pedido',
  desistimiento: 'Desistimiento (14 días)',
  otro:          'Otro',
}

const STATUS_OPTIONS: { value: ReturnStatus | ''; label: string }[] = [
  { value: '',         label: 'Todos los estados' },
  { value: 'pending',  label: 'Pendiente' },
  { value: 'approved', label: 'Aprobada' },
  { value: 'rejected', label: 'Rechazada' },
  { value: 'received', label: 'Recibida' },
  { value: 'refunded', label: 'Reembolsada' },
]

const inputCls =
  'w-full border border-ink/15 bg-white px-3 py-2 text-sm text-ink ' +
  'placeholder:text-ink/30 focus:outline-none focus:border-primary transition-colors'

interface ReturnLine {
  key: string
  productName: string
  size: string
  quantity: number
  unitPrice: number
}

// return_request_items describe una devolución parcial; si no hay ninguno
// (solicitud legacy o devolución del pedido completo) se muestran todos
// los artículos del pedido.
function getReturnLines(detail: ReturnRequest): ReturnLine[] {
  if (detail.items && detail.items.length > 0) {
    return detail.items.map(ri => ({
      key: `rri-${ri.id}`,
      productName: ri.order_item?.product?.name ?? `Artículo #${ri.order_item_id}`,
      size: ri.order_item?.variant?.size ?? '—',
      quantity: ri.quantity,
      unitPrice: ri.order_item?.unit_price ?? 0,
    }))
  }
  return (detail.order?.items ?? []).map(oi => ({
    key: `oi-${oi.id}`,
    productName: oi.product?.name ?? `Artículo #${oi.id}`,
    size: oi.variant?.size ?? '—',
    quantity: oi.quantity,
    unitPrice: oi.unit_price,
  }))
}

export default function AdminReturnsPage() {
  const [returns, setReturns]     = useState<ReturnRequest[]>([])
  const [loading, setLoading]     = useState(true)
  const [page, setPage]           = useState(1)
  const [lastPage, setLastPage]   = useState(1)
  const [total, setTotal]         = useState(0)
  const [filters, setFilters]     = useState<AdminReturnsFilters>({})
  const [detail, setDetail]       = useState<ReturnRequest | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // Detail modal action state
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError]     = useState<string | null>(null)
  const [rejectNotes, setRejectNotes]     = useState('')
  const [refundAmount, setRefundAmount]   = useState('')
  const [showRejectInput, setShowRejectInput] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getAdminReturns(filters, page)
      .then(data => {
        if (cancelled) return
        setReturns(data.data)
        setLastPage(data.last_page)
        setTotal(data.total)
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [filters, page])

  function applyFilters(next: AdminReturnsFilters) {
    setFilters(next)
    setPage(1)
  }

  async function openDetail(id: number) {
    setDetailLoading(true)
    setActionError(null)
    setShowRejectInput(false)
    setRejectNotes('')
    setRefundAmount('')
    try {
      const rr = await getAdminReturn(id)
      setDetail(rr)
    } finally {
      setDetailLoading(false)
    }
  }

  async function handleApprove() {
    if (!detail) return
    setActionLoading(true)
    setActionError(null)
    try {
      await approveReturn(detail.id)
      setDetail(prev => prev ? { ...prev, status: 'approved' } : prev)
      refreshList()
    } catch (e: unknown) {
      setActionError(extractMsg(e))
    } finally {
      setActionLoading(false)
    }
  }

  async function handleReject() {
    if (!detail || !rejectNotes.trim()) {
      setActionError('El motivo del rechazo es obligatorio.')
      return
    }
    setActionLoading(true)
    setActionError(null)
    try {
      await rejectReturn(detail.id, rejectNotes)
      setDetail(prev => prev ? { ...prev, status: 'rejected', admin_notes: rejectNotes } : prev)
      setShowRejectInput(false)
      refreshList()
    } catch (e: unknown) {
      setActionError(extractMsg(e))
    } finally {
      setActionLoading(false)
    }
  }

  async function handleReceive() {
    if (!detail) return
    setActionLoading(true)
    setActionError(null)
    const amountCents = refundAmount ? Math.round(parseFloat(refundAmount) * 100) : undefined
    try {
      await confirmReturnReceived(detail.id, amountCents)
      setDetail(prev => prev ? { ...prev, status: 'refunded' } : prev)
      refreshList()
    } catch (e: unknown) {
      setActionError(extractMsg(e))
    } finally {
      setActionLoading(false)
    }
  }

  function closeDetail() {
    setDetail(null)
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) closeDetail()
  }

  function refreshList() {
    getAdminReturns(filters, page).then(data => {
      setReturns(data.data)
      setTotal(data.total)
    }).catch(() => {})
  }

  function extractMsg(e: unknown): string {
    return (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      ?? 'Ha ocurrido un error.'
  }

  const statuses = returns.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-ink mb-2">Devoluciones</h1>
      <p className="text-ink/50 text-sm mb-8">Gestiona las solicitudes de devolución de los clientes.</p>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total',       value: total },
          { label: 'Pendientes',  value: statuses['pending']  ?? 0 },
          { label: 'Aprobadas',   value: statuses['approved'] ?? 0 },
          { label: 'Reembolsadas', value: statuses['refunded'] ?? 0 },
        ].map(s => (
          <div key={s.label} className="bg-white border border-ink/10 p-5">
            <p className="text-2xl font-bold text-ink">{s.value}</p>
            <p className="text-xs text-ink/40 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white border border-ink/10 p-5 mb-6 grid grid-cols-1 sm:grid-cols-4 gap-3">
        <select
          value={filters.status ?? ''}
          onChange={e => applyFilters({ ...filters, status: e.target.value as ReturnStatus | '' })}
          className={inputCls}
        >
          {STATUS_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Email del cliente"
          value={filters.user_email ?? ''}
          onChange={e => applyFilters({ ...filters, user_email: e.target.value })}
          className={inputCls}
        />
        <input
          type="date"
          value={filters.date_from ?? ''}
          onChange={e => applyFilters({ ...filters, date_from: e.target.value })}
          className={inputCls}
        />
        <input
          type="date"
          value={filters.date_to ?? ''}
          onChange={e => applyFilters({ ...filters, date_to: e.target.value })}
          className={inputCls}
        />
      </div>

      {/* Table */}
      <div className="bg-white border border-ink/10 overflow-x-auto">
        {loading ? (
          <p className="text-sm text-ink/40 p-8 text-center">Cargando…</p>
        ) : returns.length === 0 ? (
          <p className="text-sm text-ink/40 p-8 text-center">No hay solicitudes de devolución.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-left">
                {['#', 'Cliente', 'Pedido', 'Motivo', 'Estado', 'Fecha', 'Acción'].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-ink/50 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {returns.map(rr => (
                <tr key={rr.id} className="border-b border-ink/5 hover:bg-ink/[0.02] transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-ink/50">{rr.id}</td>
                  <td className="px-4 py-3 text-xs text-ink">
                    {rr.user?.email ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-xs font-semibold text-primary">
                    #{rr.order_id}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink/70">
                    {REASON_LABELS[rr.reason] ?? rr.reason}
                  </td>
                  <td className="px-4 py-3">
                    <ReturnStatusBadge status={rr.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-ink/40">
                    {rr.requested_at
                      ? new Date(rr.requested_at).toLocaleDateString('es-ES')
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openDetail(rr.id)}
                      className="text-xs text-primary hover:text-primary/70 transition-colors"
                    >
                      Ver detalle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {lastPage > 1 && (
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="text-xs text-ink/50 hover:text-ink disabled:opacity-30 transition-colors"
          >
            ← Anterior
          </button>
          <span className="text-xs text-ink/40">Página {page} de {lastPage}</span>
          <button
            onClick={() => setPage(p => Math.min(lastPage, p + 1))}
            disabled={page >= lastPage}
            className="text-xs text-ink/50 hover:text-ink disabled:opacity-30 transition-colors"
          >
            Siguiente →
          </button>
        </div>
      )}

      {/* Detail modal */}
      {(detail || detailLoading) && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-ink/40 overflow-y-auto"
          onClick={handleBackdropClick}
        >
          <div className="bg-canvas w-full max-w-2xl my-8 relative">
            <button
              onClick={closeDetail}
              aria-label="Cerrar"
              className="absolute top-4 right-4 text-ink/40 hover:text-ink transition-colors z-10"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {detailLoading ? (
              <div className="p-12 text-center">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : detail ? (
              <div>
                {/* Image */}
                {detail.image_url && (
                  <img
                    src={detail.image_url}
                    alt="Imagen del producto devuelto"
                    className="w-full max-h-72 object-cover"
                  />
                )}

                <div className="p-7 space-y-6">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs text-ink/40 mb-1">Devolución #{detail.id} · Pedido #{detail.order_id}</p>
                      <h2 className="text-lg font-bold text-ink">
                        {REASON_LABELS[detail.reason] ?? detail.reason}
                      </h2>
                      <div className="mt-1">
                        <ReturnStatusBadge status={detail.status} />
                      </div>
                    </div>
                    {detail.refund_amount && (
                      <p className="text-sm font-bold text-primary flex-shrink-0">
                        {euros.format(detail.refund_amount / 100)} reembolsados
                      </p>
                    )}
                  </div>

                  {/* Description */}
                  {detail.description && (
                    <div className="border-l-2 border-ink/10 pl-4">
                      <p className="text-sm text-ink/70 leading-relaxed">{detail.description}</p>
                    </div>
                  )}

                  {/* Admin notes (rejection) */}
                  {detail.admin_notes && (
                    <div className="bg-secondary/5 border border-secondary/20 p-4">
                      <p className="text-xs font-semibold text-secondary mb-1">Motivo de rechazo</p>
                      <p className="text-sm text-ink/70">{detail.admin_notes}</p>
                    </div>
                  )}

                  {/* Stripe refund info */}
                  {detail.stripe_refund_id && (
                    <p className="text-xs text-ink/40 font-mono">
                      Stripe Refund: {detail.stripe_refund_id}
                    </p>
                  )}

                  {/* Artículos a devolver */}
                  {(() => {
                    const lines = getReturnLines(detail)
                    if (lines.length === 0) return null
                    const total = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0)
                    return (
                      <div>
                        <p className="text-xs font-semibold text-ink/50 uppercase tracking-wide mb-3">
                          Artículos a devolver
                        </p>
                        <div className="border border-ink/10 divide-y divide-ink/5">
                          {lines.map(line => (
                            <div key={line.key} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                              <div className="min-w-0">
                                <p className="text-ink truncate">{line.productName}</p>
                                <p className="text-xs text-ink/40">
                                  Talla: {line.size} · {euros.format(line.unitPrice / 100)} × {line.quantity}
                                </p>
                              </div>
                              <p className="font-medium text-ink flex-shrink-0">
                                {euros.format((line.unitPrice * line.quantity) / 100)}
                              </p>
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center justify-between px-1 pt-2">
                          <p className="text-xs font-semibold text-ink/50 uppercase tracking-wide">
                            Total a reembolsar
                          </p>
                          <p className="text-sm font-bold text-primary">{euros.format(total / 100)}</p>
                        </div>
                      </div>
                    )
                  })()}

                  {/* Datos del cliente */}
                  <div>
                    <p className="text-xs font-semibold text-ink/50 uppercase tracking-wide mb-3">
                      Datos del cliente
                    </p>
                    <div className="border border-ink/10 p-4 space-y-3 text-sm">
                      <div>
                        <p className="text-ink font-medium">{detail.user?.name ?? '—'}</p>
                        <p className="text-ink/50 text-xs">{detail.user?.email ?? '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-ink/40 mb-1">
                          Dirección de envío original (a la que debe volver el paquete)
                        </p>
                        {detail.order?.shipping_address ? (
                          <div className="text-ink/70 leading-relaxed">
                            {detail.order.shipping_address.name && <p>{detail.order.shipping_address.name}</p>}
                            {(detail.order.shipping_address.address_line1 ?? detail.order.shipping_address.line1) && (
                              <p>{detail.order.shipping_address.address_line1 ?? detail.order.shipping_address.line1}</p>
                            )}
                            {(detail.order.shipping_address.address_line2 ?? detail.order.shipping_address.line2) && (
                              <p>{detail.order.shipping_address.address_line2 ?? detail.order.shipping_address.line2}</p>
                            )}
                            {(detail.order.shipping_address.postal_code || detail.order.shipping_address.city) && (
                              <p>
                                {[detail.order.shipping_address.postal_code, detail.order.shipping_address.city]
                                  .filter(Boolean).join(' ')}
                              </p>
                            )}
                            {detail.order.shipping_address.state && <p>{detail.order.shipping_address.state}</p>}
                            {detail.order.shipping_address.country && <p>{detail.order.shipping_address.country}</p>}
                          </div>
                        ) : (
                          <p className="text-ink/30 text-xs">Sin dirección de envío registrada.</p>
                        )}
                      </div>
                      <Link
                        to={`/admin/pedidos?order=${detail.order_id}`}
                        className="inline-block text-xs text-primary hover:text-primary/70 transition-colors"
                      >
                        Ver pedido #{detail.order_id} →
                      </Link>
                    </div>
                  </div>

                  {/* History */}
                  {detail.history && detail.history.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-ink/50 uppercase tracking-wide mb-3">
                        Historial de estados
                      </p>
                      <div className="space-y-2">
                        {detail.history.map(h => (
                          <div key={h.id} className="flex items-start gap-3 text-xs">
                            <span className="text-ink/30 flex-shrink-0 font-mono">
                              {new Date(h.created_at).toLocaleDateString('es-ES')}
                            </span>
                            <span className="text-ink/50">
                              {h.from_status} → <strong className="text-ink">{h.to_status}</strong>
                              {h.changed_by_user && (
                                <span className="text-ink/30"> · {h.changed_by_user.name}</span>
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Error */}
                  {actionError && (
                    <p className="text-sm text-secondary">{actionError}</p>
                  )}

                  {/* Actions */}
                  {detail.status === 'pending' && (
                    <div className="pt-4 border-t border-ink/10 space-y-4">
                      {showRejectInput ? (
                        <div className="space-y-3">
                          <label className="block text-xs font-semibold text-ink/50 uppercase tracking-wide">
                            Motivo del rechazo <span className="text-secondary">*</span>
                          </label>
                          <textarea
                            value={rejectNotes}
                            onChange={e => setRejectNotes(e.target.value)}
                            placeholder="Explica por qué se rechaza la solicitud…"
                            rows={3}
                            className="w-full border border-ink/15 p-3 text-sm text-ink placeholder:text-ink/30 focus:outline-none focus:border-primary transition-colors resize-none"
                          />
                          <div className="flex gap-3">
                            <button
                              onClick={handleReject}
                              disabled={actionLoading}
                              className="text-sm px-5 py-2.5 text-white transition-colors disabled:opacity-50"
                              style={{ backgroundColor: '#8B4A2A' }}
                            >
                              {actionLoading ? 'Rechazando…' : 'Confirmar rechazo'}
                            </button>
                            <button
                              onClick={() => setShowRejectInput(false)}
                              className="text-sm text-ink/40 hover:text-ink transition-colors"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-3">
                          <button
                            onClick={handleApprove}
                            disabled={actionLoading}
                            className="text-sm bg-primary text-white px-5 py-2.5 hover:bg-primary/90 transition-colors disabled:opacity-50"
                          >
                            {actionLoading ? 'Aprobando…' : 'Aprobar devolución'}
                          </button>
                          <button
                            onClick={() => setShowRejectInput(true)}
                            className="text-sm text-ink/40 hover:text-secondary transition-colors"
                          >
                            Rechazar
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {detail.status === 'approved' && (
                    <div className="pt-4 border-t border-ink/10 space-y-4">
                      <div>
                        <p className="text-xs font-semibold text-ink/50 uppercase tracking-wide mb-2">
                          Confirmar recepción del paquete
                        </p>
                        <p className="text-xs text-ink/50 mb-4 leading-relaxed">
                          Esto ejecutará el reembolso en Stripe y restaurará el stock.
                          {detail.reason === 'desistimiento'
                            ? ' Para desistimiento, el reembolso incluye el coste de envío (obligación legal).'
                            : ' Puedes especificar un importe parcial o dejarlo en blanco para reembolso total.'
                          }
                        </p>
                        {detail.reason !== 'desistimiento' && (
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            placeholder="Importe a reembolsar (€) — vacío = total"
                            value={refundAmount}
                            onChange={e => setRefundAmount(e.target.value)}
                            className="w-full border border-ink/15 px-3 py-2 text-sm text-ink
                              placeholder:text-ink/30 focus:outline-none focus:border-primary transition-colors mb-4"
                          />
                        )}
                        <button
                          onClick={handleReceive}
                          disabled={actionLoading}
                          className="text-sm bg-primary text-white px-5 py-2.5 hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                          {actionLoading ? 'Procesando…' : 'Confirmar recepción y reembolsar'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Seguimiento del paquete de vuelta — el cliente solo puede estar
                      enviándolo (o haberlo enviado) a partir de que se aprueba la devolución */}
                  {['approved', 'received', 'refunded'].includes(detail.status) && (
                    <TrackingPanel
                      title="Seguimiento del paquete de vuelta"
                      variant="flat"
                      data={{
                        number:    detail.return_tracking_number,
                        url:       detail.return_tracking_url,
                        carrier:   detail.return_carrier,
                        updatedAt: detail.return_tracking_updated_at,
                      }}
                      onSave={async payload => {
                        const updated = await updateReturnTracking(detail.id, {
                          return_tracking_number: payload.number,
                          return_tracking_url:    payload.url,
                          return_carrier:          payload.carrier,
                        })
                        setDetail(updated)
                      }}
                    />
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
