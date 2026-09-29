import { useEffect, useState } from 'react'
import { downloadAdminInvoice, getAdminInvoice, getAdminInvoices } from '../../api/adminInvoices'
import type { Invoice, InvoiceFilters } from '../../types/invoice'

const euros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })

function Pagination({ current, last, onPage }: { current: number; last: number; onPage: (p: number) => void }) {
  if (last <= 1) return null
  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button onClick={() => onPage(current - 1)} disabled={current === 1} className="btn-admin-page">
        ← Anterior
      </button>
      <span className="text-sm text-ink/50 px-2">{current} / {last}</span>
      <button onClick={() => onPage(current + 1)} disabled={current === last} className="btn-admin-page">
        Siguiente →
      </button>
    </div>
  )
}

function InvoiceDetailModal({ invoiceId, onClose }: { invoiceId: number; onClose: () => void }) {
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    getAdminInvoice(invoiceId).then(setInvoice).finally(() => setLoading(false))
  }, [invoiceId])

  async function handleDownload() {
    setDownloading(true)
    try {
      const blob = await downloadAdminInvoice(invoiceId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${invoice?.full_number ?? 'factura'}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto relative">
        <button onClick={onClose} aria-label="Cerrar" className="absolute top-4 right-4 btn-admin-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {loading || !invoice ? (
          <div className="p-12 text-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : (
          <div className="p-6">
            <p className="text-xs text-ink/40 uppercase tracking-wide mb-1">Factura</p>
            <h2 className="font-editorial text-2xl text-ink mb-4">{invoice.full_number}</h2>

            <div className="space-y-1 text-sm text-ink/70 mb-6">
              <p>Fecha: {new Date(invoice.issued_at).toLocaleDateString('es-ES')}</p>
              <p>Pedido: #{invoice.order_id}</p>
              {invoice.is_simplified && <p className="text-ink/40">Factura simplificada</p>}
            </div>

            <div className="bg-ink/[0.02] p-4 mb-6">
              <p className="text-xs font-semibold text-ink/50 uppercase tracking-wide mb-2">Cliente</p>
              <p className="text-sm text-ink">{invoice.buyer_name}</p>
              {invoice.buyer_tax_id && <p className="text-sm text-ink/60">NIF/CIF: {invoice.buyer_tax_id}</p>}
              <p className="text-sm text-ink/60">
                {invoice.buyer_address.address_line1}
                {invoice.buyer_address.address_line2 ? `, ${invoice.buyer_address.address_line2}` : ''}
                <br />
                {invoice.buyer_address.postal_code} {invoice.buyer_address.city}
                {invoice.buyer_address.province ? `, ${invoice.buyer_address.province}` : ''}
              </p>
            </div>

            <div className="space-y-1 text-sm mb-6">
              <div className="flex justify-between text-ink/60">
                <span>Base imponible</span>
                <span>{euros.format(invoice.subtotal / 100)}</span>
              </div>
              <div className="flex justify-between text-ink/60">
                <span>IVA ({invoice.tax_rate}%)</span>
                <span>{euros.format(invoice.tax_amount / 100)}</span>
              </div>
              <div className="flex justify-between font-semibold text-ink text-base pt-2 border-t border-ink/10">
                <span>Total</span>
                <span>{euros.format(invoice.total / 100)}</span>
              </div>
            </div>

            <button onClick={handleDownload} disabled={downloading} className="btn-admin-primary w-full">
              {downloading ? 'Descargando…' : 'Descargar PDF'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AdminInvoicesPage() {
  const [invoices, setInvoices]   = useState<Invoice[]>([])
  const [page, setPage]           = useState(1)
  const [lastPage, setLastPage]   = useState(1)
  const [loading, setLoading]     = useState(true)
  const [filters, setFilters]     = useState<InvoiceFilters>({})
  const [detailId, setDetailId]   = useState<number | null>(null)
  const [downloadingId, setDownloadingId] = useState<number | null>(null)

  function load(f: InvoiceFilters, p: number) {
    setLoading(true)
    getAdminInvoices(f, p)
      .then(res => {
        setInvoices(res.data)
        setLastPage(res.last_page)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(filters, page) }, [page])

  function applyFilters() {
    setPage(1)
    load(filters, 1)
  }

  function clearFilters() {
    const empty: InvoiceFilters = {}
    setFilters(empty)
    setPage(1)
    load(empty, 1)
  }

  async function handleDownload(id: number, fullNumber: string) {
    setDownloadingId(id)
    try {
      const blob = await downloadAdminInvoice(id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${fullNumber}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setDownloadingId(null)
    }
  }

  const inputCls = 'border border-ink/15 bg-white rounded-xs px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/40'

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="bg-white rounded-xs border border-ink/10 p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-ink/50 mb-1">Desde</label>
            <input type="date" value={filters.date_from ?? ''}
              onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))}
              className={inputCls} />
          </div>
          <div>
            <label className="block text-xs text-ink/50 mb-1">Hasta</label>
            <input type="date" value={filters.date_to ?? ''}
              onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))}
              className={inputCls} />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-ink/50 mb-1">Cliente o número de factura</label>
            <input type="text" value={filters.search ?? ''}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              placeholder="Nombre, email o A-2026-000123" className={inputCls + ' w-full'} />
          </div>
          <button onClick={clearFilters} className="btn-admin-secondary">Limpiar</button>
          <button onClick={applyFilters} className="btn-admin-primary">Aplicar</button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-ink/50 text-sm">Cargando facturas…</div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-20 text-ink/40 text-sm">No hay facturas que coincidan con el filtro.</div>
      ) : (
        <div className="overflow-x-auto rounded-xs border border-ink/10">
          <table className="w-full text-sm">
            <thead className="bg-ink/5 text-ink/60 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Número</th>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium text-right">Total</th>
                <th className="px-4 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {invoices.map(inv => (
                <tr key={inv.id} className="bg-white hover:bg-ink/[0.02] transition-colors">
                  <td className="px-4 py-3 font-medium text-ink">{inv.full_number}</td>
                  <td className="px-4 py-3 text-ink/60">
                    {new Date(inv.issued_at).toLocaleDateString('es-ES')}
                  </td>
                  <td className="px-4 py-3 text-ink/60">
                    {inv.buyer_name}
                    {inv.is_simplified && <span className="text-ink/30 text-xs ml-1">(simplificada)</span>}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{euros.format(inv.total / 100)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => setDetailId(inv.id)} className="btn-admin-link btn-admin-link-primary">
                        Ver
                      </button>
                      <span className="text-ink/20">|</span>
                      <button
                        onClick={() => handleDownload(inv.id, inv.full_number)}
                        disabled={downloadingId === inv.id}
                        className="btn-admin-link btn-admin-link-neutral"
                      >
                        {downloadingId === inv.id ? 'Descargando…' : 'Descargar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination current={page} last={lastPage} onPage={setPage} />

      {detailId !== null && (
        <InvoiceDetailModal invoiceId={detailId} onClose={() => setDetailId(null)} />
      )}
    </div>
  )
}
