import { useEffect, useState } from 'react'
import { exportSubscribers, getSubscribers } from '../../api/newsletter'
import type { NewsletterSubscriber } from '../../types/newsletter'

export default function AdminNewsletterPage() {
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([])
  const [total, setTotal]             = useState(0)
  const [page, setPage]               = useState(1)
  const [lastPage, setLastPage]       = useState(1)
  const [loading, setLoading]         = useState(true)
  const [exporting, setExporting]     = useState(false)
  const [error, setError]             = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    getSubscribers(page)
      .then(res => {
        setSubscribers(res.data)
        setTotal(res.total)
        setLastPage(res.last_page)
      })
      .catch(() => setError('Error al cargar los subscribers.'))
      .finally(() => setLoading(false))
  }, [page])

  async function handleExport() {
    setExporting(true)
    try {
      const blob = await exportSubscribers()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `newsletter_${Date.now()}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('No se pudo exportar.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-ink">Newsletter</h1>
          <p className="text-ink/50 text-sm mt-1">{total} subscriptores totales</p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting || total === 0}
          className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold
            hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {exporting ? 'Exportando…' : 'Exportar CSV'}
        </button>
      </div>

      {error && (
        <p className="text-sm text-secondary bg-secondary/10 rounded-lg px-3 py-2 mb-4">{error}</p>
      )}

      {loading ? (
        <div className="text-center py-20 text-ink/40 text-sm">Cargando subscriptores…</div>
      ) : subscribers.length === 0 ? (
        <div className="text-center py-16 text-ink/40 text-sm">No hay subscriptores todavía.</div>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-ink/10 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink/10 text-left">
                  <th className="px-5 py-3 text-xs font-semibold text-ink/40 uppercase tracking-wider">Email</th>
                  <th className="px-5 py-3 text-xs font-semibold text-ink/40 uppercase tracking-wider hidden sm:table-cell">Nombre</th>
                  <th className="px-5 py-3 text-xs font-semibold text-ink/40 uppercase tracking-wider text-right">Fecha de alta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/5">
                {subscribers.map(s => (
                  <tr key={s.id}>
                    <td className="px-5 py-4 text-ink font-medium">{s.email}</td>
                    <td className="px-5 py-4 hidden sm:table-cell text-ink/60">{s.name ?? '—'}</td>
                    <td className="px-5 py-4 text-ink/50 text-xs text-right tabular-nums">
                      {new Date(s.created_at).toLocaleDateString('es-ES', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {lastPage > 1 && (
            <div className="flex items-center justify-center gap-4 mt-6">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="text-sm font-medium text-ink/60 hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ← Anterior
              </button>
              <span className="text-xs text-ink/40 tabular-nums">Página {page} de {lastPage}</span>
              <button
                onClick={() => setPage(p => Math.min(lastPage, p + 1))}
                disabled={page === lastPage}
                className="text-sm font-medium text-ink/60 hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Siguiente →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
