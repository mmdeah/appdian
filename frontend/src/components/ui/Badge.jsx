import './Badge.css'

const COLOR_MAP = {
  APROBADA: 'success',
  PENDIENTE: 'warning',
  RECHAZADA: 'danger',
  ERROR: 'danger',
  POS: 'info',
  FE: 'accent',
  NC: 'muted',
  ND: 'muted',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
  info: 'info',
  accent: 'accent',
  muted: 'muted',
}

export default function Badge({ children, variant }) {
  const color = COLOR_MAP[variant] || COLOR_MAP[children] || 'muted'
  return (
    <span className={`badge badge--${color}`}>{children}</span>
  )
}
