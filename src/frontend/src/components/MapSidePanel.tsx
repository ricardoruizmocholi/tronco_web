import type { Fanfic } from '../types/fanfic'

export type PanelState =
  | { mode: 'closed' }
  | { mode: 'detail'; fanfic: Fanfic }
  | { mode: 'cluster'; fanfics: Fanfic[] }
  | { mode: 'success'; fanfic: Fanfic }

interface Props {
  state: PanelState
  onClose: () => void
  onSelectFanfic: (fanfic: Fanfic) => void
  onUploadClick: () => void
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" className="w-5 h-5">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  )
}

function PanelHeader({ label, onClose }: { label: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-canvas/10 flex-shrink-0">
      <p className="label-caps text-canvas/70">{label}</p>
      <button
        onClick={onClose}
        aria-label="Cerrar panel"
        className="p-1.5 -mr-1.5 text-canvas/50 hover:text-canvas transition-colors"
      >
        <CloseIcon />
      </button>
    </div>
  )
}

function UploadCta({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-primary text-white font-medium text-sm uppercase tracking-wide
        py-3.5 hover:bg-primary/90 transition-colors"
    >
      Subir mi fanfic
    </button>
  )
}

function DetailView({
  fanfic, onClose, onUploadClick,
}: { fanfic: Fanfic; onClose: () => void; onUploadClick: () => void }) {
  return (
    <>
      <PanelHeader label={`Fanfic en ${fanfic.city_name}`} onClose={onClose} />

      <div className="flex-1 overflow-y-auto">
        <img
          src={fanfic.image_url}
          alt={`Fanfic de ${fanfic.author?.name ?? 'un fan'} en ${fanfic.city_name}`}
          className="w-full aspect-video object-cover"
        />

        <div className="p-6 space-y-4">
          <p className="font-editorial text-lg text-canvas">
            {fanfic.author?.name ?? 'Anónimo'}
          </p>
          <p className="label-caps text-primary">{fanfic.city_name}</p>
          <p className="text-sm text-canvas/60">
            Aprobado el {formatDate(fanfic.reviewed_at ?? fanfic.created_at)}
          </p>

          {fanfic.caption && (
            <p className="text-sm text-canvas/70 leading-relaxed italic border-l-2 border-primary/40 pl-3">
              {fanfic.caption}
            </p>
          )}

          <div className="h-px bg-canvas/20" />

          <UploadCta onClick={onUploadClick} />
        </div>
      </div>
    </>
  )
}

function ClusterListView({
  fanfics, onClose, onSelect,
}: { fanfics: Fanfic[]; onClose: () => void; onSelect: (f: Fanfic) => void }) {
  return (
    <>
      <PanelHeader
        label={`${fanfics.length} fanfic${fanfics.length === 1 ? '' : 's'} en esta zona`}
        onClose={onClose}
      />
      <div className="flex-1 overflow-y-auto divide-y divide-canvas/10">
        {fanfics.map(f => (
          <button
            key={f.id}
            onClick={() => onSelect(f)}
            className="w-full flex items-center gap-3 px-6 py-3 text-left hover:bg-canvas/5 transition-colors"
          >
            <img
              src={f.image_url}
              alt=""
              className="w-[60px] h-[60px] object-cover flex-shrink-0"
            />
            <div className="min-w-0">
              <p className="font-editorial text-sm text-canvas truncate">
                {f.author?.name ?? 'Anónimo'}
              </p>
              <p className="label-caps text-primary text-[10px] mt-0.5">{f.city_name}</p>
              <p className="text-xs text-canvas/50 mt-0.5">
                {formatDate(f.reviewed_at ?? f.created_at)}
              </p>
            </div>
          </button>
        ))}
      </div>
    </>
  )
}

function SuccessView({ fanfic, onClose }: { fanfic: Fanfic; onClose: () => void }) {
  return (
    <>
      <PanelHeader label="Fanfic enviado" onClose={onClose} />
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <img src={fanfic.image_url} alt="" className="w-full aspect-video object-cover" />
        <p className="font-editorial text-lg text-canvas">¡Gracias por sumarte!</p>
        <p className="text-sm text-canvas/70 leading-relaxed">
          Tu fanfic en <span className="text-primary">{fanfic.city_name}</span> queda pendiente de
          revisión. Aparecerá en el mapa en cuanto se apruebe.
        </p>
      </div>
    </>
  )
}

export default function MapSidePanel({ state, onClose, onSelectFanfic, onUploadClick }: Props) {
  const isOpen = state.mode !== 'closed'

  return (
    <div
      className={`fixed top-0 right-0 z-40 h-screen w-full sm:w-[380px]
        bg-dark flex flex-col
        transform transition-transform duration-300 ease-out
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      role="dialog"
      aria-modal="true"
      aria-hidden={!isOpen}
      aria-label="Detalle del mapa Troncodrilo"
    >
      {state.mode === 'detail' && (
        <DetailView fanfic={state.fanfic} onClose={onClose} onUploadClick={onUploadClick} />
      )}
      {state.mode === 'cluster' && (
        <ClusterListView fanfics={state.fanfics} onClose={onClose} onSelect={onSelectFanfic} />
      )}
      {state.mode === 'success' && (
        <SuccessView fanfic={state.fanfic} onClose={onClose} />
      )}
    </div>
  )
}
