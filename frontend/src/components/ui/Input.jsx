import './Input.css'

export default function Input({ label, error, icon, ...props }) {
  return (
    <div className="field">
      {label && <label className="field-label">{label}</label>}
      <div className={`field-wrap ${icon ? 'field-wrap--icon' : ''}`}>
        {icon && <span className="field-icon">{icon}</span>}
        <input className={`field-input ${error ? 'field-input--error' : ''}`} {...props} />
      </div>
      {error && <p className="field-error">{error}</p>}
    </div>
  )
}
