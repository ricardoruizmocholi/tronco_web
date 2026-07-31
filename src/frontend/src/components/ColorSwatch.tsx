interface Props {
  color: string
  label: string
  selected?: boolean
  outOfStock?: boolean
  disabled?: boolean
  size?: number
  onClick?: () => void
}

export default function ColorSwatch({
  color, label, selected = false, outOfStock = false, disabled = false, size = 24, onClick,
}: Props) {
  // outOfStock NUNCA deshabilita el swatch — solo lo marca visualmente (tachado +
  // opacidad reducida). El usuario debe poder seguir navegando/deseleccionando.
  // Solo `disabled` (uso genérico, no usado hoy para stock) bloquea el click.
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={selected}
      className={`group relative rounded-full flex-shrink-0 transition-transform ${
        disabled
          ? 'opacity-40 cursor-not-allowed'
          : outOfStock
            ? 'opacity-50 hover:scale-110 cursor-pointer'
            : 'hover:scale-110 cursor-pointer'
      }`}
      style={{
        width:  size,
        height: size,
        backgroundColor: color,
        border: selected ? '2px solid #1A1A1A' : '1px solid rgba(26,26,26,0.15)',
      }}
    >
      {outOfStock && (
        <span
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 bg-ink"
          style={{
            width:     Math.round(size * 1.15),
            height:    1.5,
            transform: 'translate(-50%, -50%) rotate(-45deg)',
          }}
        />
      )}

      {/* Tooltip */}
      <span
        role="tooltip"
        className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap
          rounded bg-ink text-white text-[10px] px-1.5 py-0.5 opacity-0 group-hover:opacity-100
          transition-opacity z-10"
      >
        {label}
      </span>
    </button>
  )
}
