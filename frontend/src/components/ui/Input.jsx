import './Input.css'
import PrecioInput from './PrecioInput'

/**
 * Input genérico de la app.
 * Prop extra: price={true} → activa formato COP automático (puntos de miles).
 * El onChange sigue recibiendo e.target.value, pero como número sin puntos ("180000").
 */
export default function Input({ label, error, icon, price, type, min, max, step, ...props }) {
  const InputEl = price ? PrecioInput : 'input'
  const extraProps = price ? {} : { type, min, max, step }

  return (
    <div className="field">
      {label && <label className="field-label">{label}</label>}
      <div className={`field-wrap ${icon ? 'field-wrap--icon' : ''}`}>
        {icon && <span className="field-icon">{icon}</span>}
        <InputEl
          className={`field-input ${error ? 'field-input--error' : ''}`}
          {...extraProps}
          {...props}
        />
      </div>
      {error && <p className="field-error">{error}</p>}
    </div>
  )
}
