/**
 * PrecioInput — input de texto con formato COP automático (puntos de miles).
 * Interfaz idéntica a <input>: onChange recibe un evento sintético { target: { value } }
 * donde value es el número como string (ej: "180000").
 * Úsalo en lugar de <input type="number"> para valores en pesos colombianos.
 */
export default function PrecioInput({ value, onChange, style, className, ...rest }) {
  function handleChange(e) {
    const raw = e.target.value.replace(/\./g, '').replace(/\D/g, '')
    const num = raw ? parseInt(raw, 10) : 0
    if (onChange) onChange({ target: { value: String(num) } })
  }

  const display = value !== '' && value !== undefined && value !== null
    ? parseInt(value).toLocaleString('es-CO')
    : ''

  return (
    <input
      type="text"
      inputMode="numeric"
      value={display}
      onChange={handleChange}
      style={style}
      className={className}
      {...rest}
    />
  )
}
