import { useEffect, useState } from 'react'
import {
  exportPreorders,
  getAdminPreorders,
  getPreorderStats,
  notifyPreorder,
} from '../../api/preorders'
import type {
  AdminPreordersFilters,
  Preorder,
  PreorderStats,
} from '../../api/preorders'

const STATUS_LABEL: Record<string, string> = {
  pending:   'Pendiente',
  notified:  'Notificado',
  converted: 'Convertido',
}

const STATUS_CLS: Record<string, string> = {
  pending:   'text-ink/50',
  notified:  'text-primary',
  converted: 'text-ink',
}

function StatsCards({ stats }: { stats: PreorderStats }) {
  const cards = [
    { label: 'Total reservas',  value: stats.total },
    { label: 'Pendientes',      value: stats.pending },
    { label: 'Notificados',     value: stats.notified },
    { label: 'Convertidos',     value: stats.converted },
  ]
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
      {cards.map(c => (
        <div key={c.label} className="bg-white p-5 border border-ink/10">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-ink/40 mb-1">{c.label}</p>
          <p className="text-3xl font-bold text-ink tabular-nums">{c.value}</p>
        </div>
      ))}
      {stats.top_product && (
        <div className="col-span-2 sm:col-span-4 bg-white p-5 border border-ink/10 flex items-center gap-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-ink/40">Producto más solicitado</p>
          <p className="text-sm font-medium text-ink">{stats.top_product.name}</p>
          <span className="ml-auto text-xs text-ink/40">{stats.top_product.total} reservas</span>
        </div>
      )}
    </div>
  )
}

function Pagination({
  current, last, onChange,
}: { current: number; last: number; onChange: (p: number) => void }) {
  if (last <= 1) return null
  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button
        onClick={() => onChange(current - 1)}
        disabled={current === 1}
        className="text-sm text-ink/50 hover:text-primary disabled:opacity-30 transition-colors"
      >
        ← Anterior
      </button>
      <span className="text-sm text-ink/50 tabular-nums">{current} / {last}</span>
      <button
        onClick={() => onChange(current + 1)}
        disabled={current === last}
        className="text-sm text-ink/50 hover:text-primary disabled:opacity-30 transition-colors"
      >
        Siguiente →
      </button>
    </div>
  )
}

export default function AdminPreordersPage() {
  const [preorders, setPreorders] = useState<Preorder[]>([])
  const [stats, setStats]         = useState<PreorderStats | null>(null)
  const [loading, setLoading]     = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [page, setPage]           = useState(1)
  const [lastPage, setLastPage]   = useState(1)
  const [filters, setFilters]     = useState<AdminPreordersFilters>({})

  function loadData(f: AdminPreordersFilters, p: number) {
    setLoading(true)
    Promise.all([
      getAdminPreorders({ ...f, page: p }),
      getPreorderStats(),
    ])
      .then(([res, s]) => {
        setPreorders(res.data)
        setLastPage(res.last_page)
        setStats(s)
      })
      .catch(() => setError('Error al cargar los datos.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData(filters, page) }, [])

  function applyFilters() {
    setPage(1)
    loadData(filters, 1)
  }

  function resetFilters() {
    const cleared = {}
    setFilters(cleared)
    setPage(1)
    loadData(cleared, 1)
  }

  async function handleNotify(p: Preorder) {
    try {
      const updated = await notifyPreorder(p.id)
      setPreorders(ps => ps.map(x => (x.id === updated.id ? updated : x)))
    } catch {
      setError('No se pudo marcar como notificado.')
    }
  }

  async function handleExport() {
    setExporting(true)
    try {
      const blob = await exportPreorders(filters)
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `preorders_${Date.now()}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('Error al exportar.')
    } finally {
      setExporting(false)
    }
  }

  function changePage(p: number) {
    setPage(p)
    loadData(filters, p)
  }

  return (
    <div className="min-h-screen bg-canvas">
      <header className="bg-dark text-white py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Lista de espera</h1>
            <p className="text-white/60 text-sm mt-1">Reservas de productos agotados</p>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="px-4 py-2 bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {exporting ? 'Exportando…' : 'Exportar CSV'}
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 text-secondary text-sm border border-secondary/30 bg-secondary/5 px-4 py-3">
            {error}
          </div>
        )}

        {stats && <StatsCards stats={stats} />}

        {/* Filtros */}
        <div className="bg-white border border-ink/10 p-5 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <input
              type="email"
              placeholder="Filtrar por email"
              value={filters.email ?? ''}
              onChange={e => setFilters(f => ({ ...f, email: e.target.value || undefined }))}
              className="border-b border-ink/20 bg-transparent pb-2 text-sm text-ink placeholder:text-ink/30 focus:outline-none focus:border-primary"
            />
            <select
              value={filters.status ?? ''}
              onChange={e => setFilters(f => ({ ...f, status: e.target.value || undefined }))}
              className="border-b border-ink/20 bg-transparent pb-2 text-sm text-ink focus:outline-none focus:border-primary"
            >
              <option value="">Todos los estados</option>
              <option value="pending">Pendiente</option>
              <option value="notified">Notificado</option>
              <option value="converted">Convertido</option>
            </select>
            <input
              type="date"
              value={filters.date_from ?? ''}
              onChange={e => setFilters(f => ({ ...f, date_from: e.target.value || undefined }))}
              className="border-b border-ink/20 bg-transparent pb-2 text-sm text-ink focus:outline-none focus:border-primary"
            />
            <input
              type="date"
              value={filters.date_to ?? ''}
              onChange={e => setFilters(f => ({ ...f, date_to: e.target.value || undefined }))}
              className="border-b border-ink/20 bg-transparent pb-2 text-sm text-ink focus:outline-none focus:border-primary"
            />
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={applyFilters}
              className="text-sm bg-primary text-white px-4 py-2 hover:bg-primary/90 transition-colors"
            >
              Filtrar
            </button>
            <button
              onClick={resetFilters}
              className="text-sm text-ink/50 hover:text-ink transition-colors"
            >
              Limpiar
            </button>
          </div>
        </div>

        {/* Tabla */}
        {loading ? (
          <p className="text-center py-20 text-ink/40 text-sm">Cargando…</p>
        ) : (
          <>
            <div className="overflow-x-auto border border-ink/10">
              <table className="w-full text-sm">
                <thead className="bg-ink/5 text-ink/60 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Nombre</th>
                    <th className="px-4 py-3 font-medium">Producto</th>
                    <th className="px-4 py-3 font-medium">Talla</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 font-medium">Fecha</th>
                    <th className="px-4 py-3 font-medium text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/5">
                  {preorders.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-ink/40">
                        No hay reservas.
                      </td>
                    </tr>
                  )}
                  {preorders.map(p => (
                    <tr key={p.id} className="bg-white hover:bg-ink/[0.02] transition-colors">
                      <td className="px-4 py-3 text-ink">{p.email}</td>
                      <td className="px-4 py-3 text-ink/60">{p.name ?? '—'}</td>
                      <td className="px-4 py-3 font-medium text-ink">{p.product?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-ink/60">{p.variant?.size ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium uppercase tracking-wide ${STATUS_CLS[p.status] ?? 'text-ink/40'}`}>
                          {STATUS_LABEL[p.status] ?? p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-ink/50 tabular-nums text-xs">
                        {new Date(p.created_at).toLocaleDateString('es-ES')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {p.status === 'pending' && (
                          <button
                            onClick={() => handleNotify(p)}
                            className="text-xs px-3 py-1 border border-primary/40 text-primary hover:bg-primary/10 transition-colors"
                          >
                            Marcar notificado
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination current={page} last={lastPage} onChange={changePage} />
          </>
        )}
      </main>
    </div>
  )
}
