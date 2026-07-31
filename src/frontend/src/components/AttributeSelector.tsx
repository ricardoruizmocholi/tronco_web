import ColorSwatch from './ColorSwatch'
import type { ProductAttribute } from '../types/product'

interface Props {
  attribute: ProductAttribute
  selectedValueId: number | null
  onSelect: (valueId: number | null) => void
  unavailableValueIds?: number[]
}

export default function AttributeSelector({
  attribute, selectedValueId, onSelect, unavailableValueIds = [],
}: Props) {
  // Click en el valor ya seleccionado → deselecciona (vuelve a null) en lugar de
  // quedar atrapado en una combinación sin stock.
  function handleClick(valueId: number) {
    onSelect(selectedValueId === valueId ? null : valueId)
  }

  return (
    <div>
      <p className="text-xs font-medium text-ink/60 mb-2 uppercase tracking-widest">
        {attribute.name}
      </p>

      {attribute.type === 'color' ? (
        <div className="flex flex-wrap gap-3 items-center">
          {attribute.values.map(v => (
            <ColorSwatch
              key={v.id}
              color={v.value}
              label={v.label}
              selected={selectedValueId === v.id}
              outOfStock={unavailableValueIds.includes(v.id)}
              onClick={() => handleClick(v.id)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {attribute.values.map(v => {
            // Sin stock en la combinación actual — se muestra distinto pero
            // sigue siendo navegable, NUNCA se deshabilita el botón.
            const unavailable = unavailableValueIds.includes(v.id)
            const selected    = selectedValueId === v.id
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => handleClick(v.id)}
                className={`px-3.5 py-1.5 rounded-lg border text-sm font-medium transition-colors
                  ${selected
                    ? 'border-primary bg-primary text-white'
                    : unavailable
                      ? 'border-ink/10 text-ink/40 bg-ink/[0.02] line-through hover:border-ink/20'
                      : 'border-ink/20 text-ink hover:border-primary hover:text-primary'
                  }`}
              >
                {v.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
