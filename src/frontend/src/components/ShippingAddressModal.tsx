import { useState } from 'react'
import type { ShippingAddress } from '../api/orders'

interface Props {
  onConfirm: (address: ShippingAddress) => Promise<void>
  onClose:   () => void
  paying:    boolean
}

const COUNTRIES: { code: string; name: string }[] = [
  { code: 'ES', name: 'España' },
  { code: 'AC', name: 'Isla de la Ascensión' },
  { code: 'AD', name: 'Andorra' },
  { code: 'AE', name: 'Emiratos Árabes Unidos' },
  { code: 'AF', name: 'Afganistán' },
  { code: 'AG', name: 'Antigua y Barbuda' },
  { code: 'AI', name: 'Anguila' },
  { code: 'AL', name: 'Albania' },
  { code: 'AM', name: 'Armenia' },
  { code: 'AO', name: 'Angola' },
  { code: 'AQ', name: 'Antártida' },
  { code: 'AR', name: 'Argentina' },
  { code: 'AT', name: 'Austria' },
  { code: 'AU', name: 'Australia' },
  { code: 'AW', name: 'Aruba' },
  { code: 'AX', name: 'Islas Åland' },
  { code: 'AZ', name: 'Azerbaiyán' },
  { code: 'BA', name: 'Bosnia y Herzegovina' },
  { code: 'BB', name: 'Barbados' },
  { code: 'BD', name: 'Bangladés' },
  { code: 'BE', name: 'Bélgica' },
  { code: 'BF', name: 'Burkina Faso' },
  { code: 'BG', name: 'Bulgaria' },
  { code: 'BH', name: 'Baréin' },
  { code: 'BI', name: 'Burundi' },
  { code: 'BJ', name: 'Benín' },
  { code: 'BL', name: 'San Bartolomé' },
  { code: 'BM', name: 'Bermudas' },
  { code: 'BN', name: 'Brunéi' },
  { code: 'BO', name: 'Bolivia' },
  { code: 'BQ', name: 'Caribe Neerlandés' },
  { code: 'BR', name: 'Brasil' },
  { code: 'BS', name: 'Bahamas' },
  { code: 'BT', name: 'Bután' },
  { code: 'BV', name: 'Isla Bouvet' },
  { code: 'BW', name: 'Botsuana' },
  { code: 'BY', name: 'Bielorrusia' },
  { code: 'BZ', name: 'Belice' },
  { code: 'CA', name: 'Canadá' },
  { code: 'CD', name: 'República Democrática del Congo' },
  { code: 'CF', name: 'República Centroafricana' },
  { code: 'CG', name: 'República del Congo' },
  { code: 'CH', name: 'Suiza' },
  { code: 'CI', name: 'Costa de Marfil' },
  { code: 'CK', name: 'Islas Cook' },
  { code: 'CL', name: 'Chile' },
  { code: 'CM', name: 'Camerún' },
  { code: 'CN', name: 'China' },
  { code: 'CO', name: 'Colombia' },
  { code: 'CR', name: 'Costa Rica' },
  { code: 'CV', name: 'Cabo Verde' },
  { code: 'CW', name: 'Curasao' },
  { code: 'CY', name: 'Chipre' },
  { code: 'CZ', name: 'República Checa' },
  { code: 'DE', name: 'Alemania' },
  { code: 'DJ', name: 'Yibuti' },
  { code: 'DK', name: 'Dinamarca' },
  { code: 'DM', name: 'Dominica' },
  { code: 'DO', name: 'República Dominicana' },
  { code: 'DZ', name: 'Argelia' },
  { code: 'EC', name: 'Ecuador' },
  { code: 'EE', name: 'Estonia' },
  { code: 'EG', name: 'Egipto' },
  { code: 'EH', name: 'Sáhara Occidental' },
  { code: 'ER', name: 'Eritrea' },
  { code: 'ET', name: 'Etiopía' },
  { code: 'FI', name: 'Finlandia' },
  { code: 'FJ', name: 'Fiyi' },
  { code: 'FK', name: 'Islas Malvinas' },
  { code: 'FO', name: 'Islas Feroe' },
  { code: 'FR', name: 'Francia' },
  { code: 'GA', name: 'Gabón' },
  { code: 'GB', name: 'Reino Unido' },
  { code: 'GD', name: 'Granada' },
  { code: 'GE', name: 'Georgia' },
  { code: 'GF', name: 'Guayana Francesa' },
  { code: 'GG', name: 'Guernsey' },
  { code: 'GH', name: 'Ghana' },
  { code: 'GI', name: 'Gibraltar' },
  { code: 'GL', name: 'Groenlandia' },
  { code: 'GM', name: 'Gambia' },
  { code: 'GN', name: 'Guinea' },
  { code: 'GP', name: 'Guadalupe' },
  { code: 'GQ', name: 'Guinea Ecuatorial' },
  { code: 'GR', name: 'Grecia' },
  { code: 'GS', name: 'Georgia del Sur e Islas Sandwich del Sur' },
  { code: 'GT', name: 'Guatemala' },
  { code: 'GU', name: 'Guam' },
  { code: 'GW', name: 'Guinea-Bisáu' },
  { code: 'GY', name: 'Guyana' },
  { code: 'HK', name: 'Hong Kong' },
  { code: 'HN', name: 'Honduras' },
  { code: 'HR', name: 'Croacia' },
  { code: 'HT', name: 'Haití' },
  { code: 'HU', name: 'Hungría' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'IE', name: 'Irlanda' },
  { code: 'IL', name: 'Israel' },
  { code: 'IM', name: 'Isla de Man' },
  { code: 'IN', name: 'India' },
  { code: 'IO', name: 'Territorio Británico del Océano Índico' },
  { code: 'IQ', name: 'Irak' },
  { code: 'IS', name: 'Islandia' },
  { code: 'IT', name: 'Italia' },
  { code: 'JE', name: 'Jersey' },
  { code: 'JM', name: 'Jamaica' },
  { code: 'JO', name: 'Jordania' },
  { code: 'JP', name: 'Japón' },
  { code: 'KE', name: 'Kenia' },
  { code: 'KG', name: 'Kirguistán' },
  { code: 'KH', name: 'Camboya' },
  { code: 'KI', name: 'Kiribati' },
  { code: 'KM', name: 'Comoras' },
  { code: 'KN', name: 'San Cristóbal y Nieves' },
  { code: 'KR', name: 'Corea del Sur' },
  { code: 'KW', name: 'Kuwait' },
  { code: 'KY', name: 'Islas Caimán' },
  { code: 'KZ', name: 'Kazajistán' },
  { code: 'LA', name: 'Laos' },
  { code: 'LB', name: 'Líbano' },
  { code: 'LC', name: 'Santa Lucía' },
  { code: 'LI', name: 'Liechtenstein' },
  { code: 'LK', name: 'Sri Lanka' },
  { code: 'LR', name: 'Liberia' },
  { code: 'LS', name: 'Lesoto' },
  { code: 'LT', name: 'Lituania' },
  { code: 'LU', name: 'Luxemburgo' },
  { code: 'LV', name: 'Letonia' },
  { code: 'LY', name: 'Libia' },
  { code: 'MA', name: 'Marruecos' },
  { code: 'MC', name: 'Mónaco' },
  { code: 'MD', name: 'Moldavia' },
  { code: 'ME', name: 'Montenegro' },
  { code: 'MF', name: 'San Martín (parte francesa)' },
  { code: 'MG', name: 'Madagascar' },
  { code: 'MK', name: 'Macedonia del Norte' },
  { code: 'ML', name: 'Malí' },
  { code: 'MM', name: 'Myanmar (Birmania)' },
  { code: 'MN', name: 'Mongolia' },
  { code: 'MO', name: 'Macao' },
  { code: 'MQ', name: 'Martinica' },
  { code: 'MR', name: 'Mauritania' },
  { code: 'MS', name: 'Montserrat' },
  { code: 'MT', name: 'Malta' },
  { code: 'MU', name: 'Mauricio' },
  { code: 'MV', name: 'Maldivas' },
  { code: 'MW', name: 'Malaui' },
  { code: 'MX', name: 'México' },
  { code: 'MY', name: 'Malasia' },
  { code: 'MZ', name: 'Mozambique' },
  { code: 'NA', name: 'Namibia' },
  { code: 'NC', name: 'Nueva Caledonia' },
  { code: 'NE', name: 'Níger' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'NI', name: 'Nicaragua' },
  { code: 'NL', name: 'Países Bajos' },
  { code: 'NO', name: 'Noruega' },
  { code: 'NP', name: 'Nepal' },
  { code: 'NR', name: 'Nauru' },
  { code: 'NU', name: 'Niue' },
  { code: 'NZ', name: 'Nueva Zelanda' },
  { code: 'OM', name: 'Omán' },
  { code: 'PA', name: 'Panamá' },
  { code: 'PE', name: 'Perú' },
  { code: 'PF', name: 'Polinesia Francesa' },
  { code: 'PG', name: 'Papúa Nueva Guinea' },
  { code: 'PH', name: 'Filipinas' },
  { code: 'PK', name: 'Pakistán' },
  { code: 'PL', name: 'Polonia' },
  { code: 'PM', name: 'San Pedro y Miquelón' },
  { code: 'PN', name: 'Islas Pitcairn' },
  { code: 'PR', name: 'Puerto Rico' },
  { code: 'PS', name: 'Palestina' },
  { code: 'PT', name: 'Portugal' },
  { code: 'PY', name: 'Paraguay' },
  { code: 'QA', name: 'Catar' },
  { code: 'RE', name: 'Reunión' },
  { code: 'RO', name: 'Rumanía' },
  { code: 'RS', name: 'Serbia' },
  { code: 'RU', name: 'Rusia' },
  { code: 'RW', name: 'Ruanda' },
  { code: 'SA', name: 'Arabia Saudí' },
  { code: 'SB', name: 'Islas Salomón' },
  { code: 'SC', name: 'Seychelles' },
  { code: 'SD', name: 'Sudán' },
  { code: 'SE', name: 'Suecia' },
  { code: 'SG', name: 'Singapur' },
  { code: 'SH', name: 'Santa Elena' },
  { code: 'SI', name: 'Eslovenia' },
  { code: 'SJ', name: 'Svalbard y Jan Mayen' },
  { code: 'SK', name: 'Eslovaquia' },
  { code: 'SL', name: 'Sierra Leona' },
  { code: 'SM', name: 'San Marino' },
  { code: 'SN', name: 'Senegal' },
  { code: 'SO', name: 'Somalia' },
  { code: 'SR', name: 'Surinam' },
  { code: 'SS', name: 'Sudán del Sur' },
  { code: 'ST', name: 'Santo Tomé y Príncipe' },
  { code: 'SV', name: 'El Salvador' },
  { code: 'SX', name: 'Sint Maarten' },
  { code: 'SZ', name: 'Suazilandia' },
  { code: 'TA', name: 'Tristán de Acuña' },
  { code: 'TC', name: 'Islas Turcas y Caicos' },
  { code: 'TD', name: 'Chad' },
  { code: 'TF', name: 'Territorios Australes Franceses' },
  { code: 'TG', name: 'Togo' },
  { code: 'TH', name: 'Tailandia' },
  { code: 'TJ', name: 'Tayikistán' },
  { code: 'TK', name: 'Tokelau' },
  { code: 'TL', name: 'Timor-Leste' },
  { code: 'TM', name: 'Turkmenistán' },
  { code: 'TN', name: 'Túnez' },
  { code: 'TO', name: 'Tonga' },
  { code: 'TR', name: 'Turquía' },
  { code: 'TT', name: 'Trinidad y Tobago' },
  { code: 'TV', name: 'Tuvalu' },
  { code: 'TW', name: 'Taiwán' },
  { code: 'TZ', name: 'Tanzania' },
  { code: 'UA', name: 'Ucrania' },
  { code: 'UG', name: 'Uganda' },
  { code: 'US', name: 'Estados Unidos' },
  { code: 'UY', name: 'Uruguay' },
  { code: 'UZ', name: 'Uzbekistán' },
  { code: 'VA', name: 'Ciudad del Vaticano' },
  { code: 'VC', name: 'San Vicente y las Granadinas' },
  { code: 'VE', name: 'Venezuela' },
  { code: 'VG', name: 'Islas Vírgenes Británicas' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'VU', name: 'Vanuatu' },
  { code: 'WF', name: 'Wallis y Futuna' },
  { code: 'WS', name: 'Samoa' },
  { code: 'XK', name: 'Kosovo' },
  { code: 'YE', name: 'Yemen' },
  { code: 'YT', name: 'Mayotte' },
  { code: 'ZA', name: 'Sudáfrica' },
  { code: 'ZM', name: 'Zambia' },
  { code: 'ZW', name: 'Zimbabue' },
]

const EMPTY_FORM: ShippingAddress = {
  name: '', phone: '', address_line1: '', address_line2: '',
  postal_code: '', city: '', state: '', country: 'ES',
}

type Errors = Partial<Record<keyof ShippingAddress, string>>

function validate(form: ShippingAddress): Errors {
  const e: Errors = {}
  if (!form.name.trim())          e.name          = 'Requerido'
  if (!form.phone.trim())         e.phone         = 'Requerido'
  if (!form.address_line1.trim()) e.address_line1 = 'Requerido'
  if (!form.postal_code.trim())   e.postal_code   = 'Requerido'
  if (!form.city.trim())          e.city          = 'Requerido'
  if (!form.state.trim())         e.state         = 'Requerido'
  if (!form.country)              e.country       = 'Requerido'
  return e
}

export default function ShippingAddressModal({ onConfirm, onClose, paying }: Props) {
  const [form, setForm]     = useState<ShippingAddress>(EMPTY_FORM)
  const [errors, setErrors] = useState<Errors>({})

  function set<K extends keyof ShippingAddress>(k: K, v: string) {
    setForm(f => ({ ...f, [k]: v }))
    if (errors[k]) setErrors(e => ({ ...e, [k]: undefined }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate(form)
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    await onConfirm(form)
  }

  function handleBackdrop(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose()
  }

  const inputCls = (field: keyof ShippingAddress) =>
    `w-full rounded-xl border px-3 py-2.5 text-sm text-ink bg-canvas
     focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors ${
      errors[field]
        ? 'border-secondary/60 focus:ring-secondary/30'
        : 'border-ink/15 hover:border-ink/30'
    }`

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center
        justify-center p-4"
      onClick={handleBackdrop}
    >
      <div className="bg-canvas rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh]
        flex flex-col overflow-hidden">

        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink/10 flex-shrink-0">
          <div>
            <h2 className="font-semibold text-ink">Dirección de envío</h2>
            <p className="text-xs text-ink/40 mt-0.5">Todos los campos son obligatorios salvo la línea 2</p>
          </div>
          <button
            onClick={onClose}
            disabled={paying}
            className="p-1.5 text-ink/40 hover:text-ink transition-colors rounded-lg
              hover:bg-ink/5 disabled:opacity-30"
            aria-label="Cerrar"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" className="w-5 h-5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Formulario scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {/* Nombre + Teléfono */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-ink/60 mb-1">Nombre completo</label>
              <input
                type="text"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="María García López"
                autoFocus
                className={inputCls('name')}
              />
              {errors.name && <p className="text-xs text-secondary mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-ink/60 mb-1">Teléfono</label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                placeholder="+34 612 345 678"
                className={inputCls('phone')}
              />
              {errors.phone && <p className="text-xs text-secondary mt-1">{errors.phone}</p>}
            </div>
          </div>

          {/* Dirección línea 1 */}
          <div>
            <label className="block text-xs font-medium text-ink/60 mb-1">Calle y número</label>
            <input
              type="text"
              value={form.address_line1}
              onChange={e => set('address_line1', e.target.value)}
              placeholder="Calle Mayor, 42"
              className={inputCls('address_line1')}
            />
            {errors.address_line1 && <p className="text-xs text-secondary mt-1">{errors.address_line1}</p>}
          </div>

          {/* Dirección línea 2 */}
          <div>
            <label className="block text-xs font-medium text-ink/60 mb-1">
              Piso, puerta, etc.
              <span className="text-ink/30 font-normal ml-1">(opcional)</span>
            </label>
            <input
              type="text"
              value={form.address_line2}
              onChange={e => set('address_line2', e.target.value)}
              placeholder="3.º izquierda"
              className={inputCls('address_line2')}
            />
          </div>

          {/* Código postal + Ciudad */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-ink/60 mb-1">Código postal</label>
              <input
                type="text"
                value={form.postal_code}
                onChange={e => set('postal_code', e.target.value)}
                placeholder="28001"
                className={inputCls('postal_code')}
              />
              {errors.postal_code && <p className="text-xs text-secondary mt-1">{errors.postal_code}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-ink/60 mb-1">Ciudad</label>
              <input
                type="text"
                value={form.city}
                onChange={e => set('city', e.target.value)}
                placeholder="Madrid"
                className={inputCls('city')}
              />
              {errors.city && <p className="text-xs text-secondary mt-1">{errors.city}</p>}
            </div>
          </div>

          {/* Provincia + País */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-ink/60 mb-1">Provincia / Estado</label>
              <input
                type="text"
                value={form.state}
                onChange={e => set('state', e.target.value)}
                placeholder="Madrid"
                className={inputCls('state')}
              />
              {errors.state && <p className="text-xs text-secondary mt-1">{errors.state}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-ink/60 mb-1">País</label>
              <select
                value={form.country}
                onChange={e => set('country', e.target.value)}
                className={inputCls('country')}
              >
                <option value="ES">España</option>
                <option disabled>──────────────</option>
                {COUNTRIES.filter(c => c.code !== 'ES').map(c => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
              {errors.country && <p className="text-xs text-secondary mt-1">{errors.country}</p>}
            </div>
          </div>

        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-ink/10 flex gap-3 justify-end flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={paying}
            className="px-4 py-2.5 text-sm text-ink/60 hover:text-ink transition-colors
              disabled:opacity-30"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="shipping-form"
            disabled={paying}
            onClick={handleSubmit}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm
              font-medium rounded-xl hover:bg-primary/90 transition-colors
              disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {paying ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10"
                    stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Procesando…
              </>
            ) : (
              <>
                Ir a pagar
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
