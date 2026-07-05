import { useState, useEffect, Fragment } from 'react'
import { cotizacionesApi, productsApi } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { printCotizacion } from '../utils/printCotizacion'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import './Cotizaciones.css'

const COP = (n) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0)

const DATE = (s) =>
  new Date(s).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })

const ESTADO_NEXT = {
  BORRADOR  : ['ENVIADA', 'VENCIDA'],
  ENVIADA   : ['ACEPTADA', 'RECHAZADA', 'VENCIDA'],
  ACEPTADA  : [], RECHAZADA: [], VENCIDA: [],
}

const newItem = () => ({
  _id: Math.random().toString(36).slice(2),
  descripcion: '', cantidad: 1, precio_unitario: 0, iva_porcentaje: 0, subtotal: 0,
})

// ── Modal de creación ─────────────────────────────────────────────────────────
function CreateModal({ catalogo, onSaved, onClose }) {
  const [consumidorFinal, setCF]     = useState(true)
  const [nombre,  setNombre]         = useState('')
  const [nit,     setNit]            = useState('')
  const [email,   setEmail]          = useState('')
  const [telefono,setTelefono]       = useState('')
  const [validez, setValidez]        = useState(30)
  const [notas,   setNotas]          = useState('')
  const [items,   setItems]          = useState([newItem()])
  const [saving,  setSaving]         = useState(false)
  const [err,     setErr]            = useState('')

  // Subtotals
  const subtotal = items.reduce((s, it) => s + it.subtotal, 0)
  const iva      = items.reduce((s, it) =>
    s + Math.round(it.subtotal * (it.iva_porcentaje / 100) * 100) / 100, 0)
  const total = Math.round((subtotal + iva) * 100) / 100

  // Update one field in an item
  function setField(idx, field, val) {
    setItems(prev => {
      const next = prev.map((it, i) => {
        if (i !== idx) return it
        const updated = { ...it, [field]: val }
        updated.subtotal = Math.round(updated.cantidad * updated.precio_unitario * 100) / 100
        return updated
      })
      return next
    })
  }

  // When description changes, try to match catalog
  function onDesc(idx, val) {
    const match = catalogo.find(p => p.nombre?.toLowerCase() === val.toLowerCase())
    setItems(prev => prev.map((it, i) => {
      if (i !== idx) return it
      const precio = match ? parseFloat(match.precio_venta || match.precio || 0) : it.precio_unitario
      const ivaP   = match ? parseFloat(match.iva_porcentaje || 0)               : it.iva_porcentaje
      const sub    = Math.round(it.cantidad * precio * 100) / 100
      return { ...it, descripcion: val, precio_unitario: precio, iva_porcentaje: ivaP, subtotal: sub }
    }))
  }

  function onNum(idx, field, raw) {
    const val = parseFloat(raw) || 0
    setItems(prev => prev.map((it, i) => {
      if (i !== idx) return it
      const updated = { ...it, [field]: val }
      updated.subtotal = Math.round(updated.cantidad * updated.precio_unitario * 100) / 100
      return updated
    }))
  }

  async function save() {
    setErr('')
    const valid = items.filter(it => it.descripcion.trim())
    if (!valid.length) return setErr('Agrega al menos un ítem.')
    setSaving(true)
    try {
      const { data } = await cotizacionesApi.crear({
        cliente_nombre   : consumidorFinal ? 'Consumidor Final' : (nombre.trim() || 'Consumidor Final'),
        cliente_nit      : consumidorFinal ? null : (nit.trim()      || null),
        cliente_email    : consumidorFinal ? null : (email.trim()    || null),
        cliente_telefono : consumidorFinal ? null : (telefono.trim() || null),
        validez_dias     : parseInt(validez) || 30,
        notas            : notas.trim() || null,
        items            : valid.map(it => ({
          descripcion: it.descripcion, cantidad: it.cantidad,
          precio_unitario: it.precio_unitario, iva_porcentaje: it.iva_porcentaje,
        })),
      })
      onSaved(data)
    } catch (e) {
      setErr(e?.response?.data?.error || 'Error al guardar.')
    } finally { setSaving(false) }
  }

  return (
    <div className="cot-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="cot-modal">

        {/* ── Header ── */}
        <div className="cot-mhd">
          <h2>Nueva cotización</h2>
          <button className="cot-x" onClick={onClose}>✕</button>
        </div>

        {/* ── Body scrollable ── */}
        <div className="cot-mbody">

          {/* Cliente */}
          <div className="cot-sec">
            <span className="cot-lbl">Cliente</span>
            <div className="cot-toggle">
              <button className={consumidorFinal ? 'on':''} onClick={() => setCF(true)}>Consumidor final</button>
              <button className={!consumidorFinal ? 'on':''} onClick={() => setCF(false)}>Cliente específico</button>
            </div>
            {!consumidorFinal && (
              <div className="cot-g2">
                <div className="cot-f"><label>Nombre / Razón social</label>
                  <input className="cot-inp" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Empresa o persona" /></div>
                <div className="cot-f"><label>NIT / CC</label>
                  <input className="cot-inp" value={nit} onChange={e => setNit(e.target.value)} placeholder="900123456-1" /></div>
                <div className="cot-f"><label>Email</label>
                  <input className="cot-inp" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="cliente@empresa.com" /></div>
                <div className="cot-f"><label>Teléfono</label>
                  <input className="cot-inp" type="tel" value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="300 000 0000" /></div>
              </div>
            )}
          </div>

          {/* Ítems */}
          <div className="cot-sec">
            <span className="cot-lbl">Ítems</span>

            {/* datalist para el catálogo */}
            <datalist id="cot-cat">
              {catalogo.map(p => <option key={p.id} value={p.nombre} />)}
            </datalist>

            {/* Tabla de ítems */}
            <table className="cot-tbl">
              <thead>
                <tr>
                  <th className="cot-th cot-th--desc">Descripción</th>
                  <th className="cot-th cot-th--num">Cant.</th>
                  <th className="cot-th cot-th--num">Precio unit.</th>
                  <th className="cot-th cot-th--iva">IVA</th>
                  <th className="cot-th cot-th--sub">Subtotal</th>
                  <th style={{width:32}}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={it._id} className="cot-tr">
                    <td className="cot-td">
                      <input
                        list="cot-cat"
                        className="cot-inp"
                        placeholder="Producto o servicio…"
                        value={it.descripcion}
                        onChange={e => onDesc(idx, e.target.value)}
                      />
                    </td>
                    <td className="cot-td">
                      <input className="cot-inp cot-inp--r" type="number" min="0.001" step="1"
                        value={it.cantidad} onChange={e => onNum(idx, 'cantidad', e.target.value)} />
                    </td>
                    <td className="cot-td">
                      <input className="cot-inp cot-inp--r" type="number" min="0" step="1000"
                        value={it.precio_unitario} onChange={e => onNum(idx, 'precio_unitario', e.target.value)} />
                    </td>
                    <td className="cot-td">
                      <select className="cot-inp cot-inp--r" value={it.iva_porcentaje}
                        onChange={e => onNum(idx, 'iva_porcentaje', e.target.value)}>
                        <option value={0}>0 %</option>
                        <option value={5}>5 %</option>
                        <option value={19}>19 %</option>
                      </select>
                    </td>
                    <td className="cot-td cot-td--sub">{COP(it.subtotal)}</td>
                    <td className="cot-td cot-td--rm">
                      <button className="cot-rm" onClick={() => setItems(p => p.filter((_, i) => i !== idx))}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <button className="cot-add" onClick={() => setItems(p => [...p, newItem()])}>
              + Agregar ítem
            </button>
          </div>

          {/* Totales */}
          <div className="cot-totals">
            <div className="cot-tl"><span>Subtotal</span><span>{COP(subtotal)}</span></div>
            <div className="cot-tl"><span>IVA</span><span>{COP(iva)}</span></div>
            <div className="cot-tl cot-tl--g"><span>TOTAL</span><span>{COP(total)}</span></div>
          </div>

          {/* Extras */}
          <div className="cot-sec cot-extras">
            <div className="cot-f" style={{width:110}}>
              <label>Válida (días)</label>
              <input className="cot-inp" type="number" min="1" max="365"
                value={validez} onChange={e => setValidez(e.target.value)} style={{textAlign:'right'}} />
            </div>
            <div className="cot-f" style={{flex:1}}>
              <label>Notas / condiciones</label>
              <input className="cot-inp" placeholder="Ej: Precios sujetos a cambio."
                value={notas} onChange={e => setNotas(e.target.value)} />
            </div>
          </div>

          {err && <p className="cot-err">{err}</p>}
        </div>

        {/* Footer */}
        <div className="cot-mft">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" disabled={saving} onClick={save}>
            {saving ? 'Guardando…' : '✓ Guardar cotización'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Detail expandido ──────────────────────────────────────────────────────────
function CotDetail({ id }) {
  const [cot, setCot] = useState(null)
  useEffect(() => {
    cotizacionesApi.obtener(id).then(({ data }) => setCot(data)).catch(() => {})
  }, [id])

  if (!cot) return <div style={{display:'flex',justifyContent:'center',padding:16}}><div className="spinner"/></div>
  const items = cot.items_cotizacion || []
  return (
    <div className="cot-detail">
      {(cot.cliente_email || cot.cliente_telefono || cot.notas) && (
        <div className="cot-dmeta">
          {cot.cliente_email    && <span><b>Email:</b> {cot.cliente_email}</span>}
          {cot.cliente_telefono && <span><b>Tel:</b> {cot.cliente_telefono}</span>}
          {cot.notas            && <span><b>Notas:</b> {cot.notas}</span>}
          <span><b>Validez:</b> {cot.validez_dias} días</span>
        </div>
      )}
      <table className="cot-dtbl">
        <thead><tr>
          <th>#</th><th>Descripción</th>
          <th className="td-right">Cant.</th><th className="td-right">Precio</th>
          <th className="td-right">IVA</th><th className="td-right">Subtotal</th>
        </tr></thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={it.id}>
              <td className="muted t-xs">{i+1}</td>
              <td>{it.descripcion}</td>
              <td className="td-right t-sm">{Number(it.cantidad).toLocaleString('es-CO')}</td>
              <td className="td-right t-sm">{COP(it.precio_unitario)}</td>
              <td className="td-right t-sm">{it.iva_porcentaje}%</td>
              <td className="td-right td-price">{COP(it.subtotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="cot-dtots">
        <span>Base: <b>{COP(cot.subtotal)}</b></span>
        <span>IVA: <b>{COP(cot.iva)}</b></span>
        <span>TOTAL: <b style={{color:'var(--primary)'}}>{COP(cot.total)}</b></span>
      </div>
    </div>
  )
}

// ── Página ────────────────────────────────────────────────────────────────────
export default function Cotizaciones() {
  const { empresa }   = useAuth()
  const [cots,        setCots]        = useState([])
  const [loading,     setLoading]     = useState(true)
  const [creating,    setCreating]    = useState(false)
  const [printing,    setPrinting]    = useState(null)
  const [changingEst, setChangingEst] = useState(null)
  const [catalogo,    setCatalogo]    = useState([])
  const [expanded,    setExpanded]    = useState(null)

  useEffect(() => {
    productsApi.list().then(({ data }) => setCatalogo(data.products || [])).catch(() => {})
    cotizacionesApi.listar({})
      .then(({ data }) => setCots(data.cotizaciones || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSaved = (cot) => { setCreating(false); setCots(p => [cot, ...p]) }

  async function handlePrint(id) {
    setPrinting(id)
    try { const { data } = await cotizacionesApi.obtener(id); printCotizacion(data, empresa || {}) }
    catch { alert('No se pudo cargar.') }
    finally { setPrinting(null) }
  }

  async function handleEstado(id, estado) {
    setChangingEst(id)
    try {
      const { data } = await cotizacionesApi.cambiarEstado(id, estado)
      setCots(p => p.map(c => c.id === id ? { ...c, ...data } : c))
    } catch { alert('Error al cambiar estado.') }
    finally { setChangingEst(null) }
  }

  async function handleDel(id) {
    if (!confirm('¿Eliminar esta cotización?')) return
    try { await cotizacionesApi.eliminar(id); setCots(p => p.filter(c => c.id !== id)) }
    catch { alert('Error al eliminar.') }
  }

  return (
    <div className="cot-page">
      {creating && <CreateModal catalogo={catalogo} onSaved={handleSaved} onClose={() => setCreating(false)} />}

      <div className="cot-header">
        <div>
          <h1 className="cot-title">Cotizaciones</h1>
          <p className="cot-sub">{cots.length > 0 ? `${cots.length} cotización${cots.length !== 1 ? 'es' : ''}` : 'Crea tu primera cotización'}</p>
        </div>
        <Button variant="primary" onClick={() => setCreating(true)}>+ Nueva cotización</Button>
      </div>

      <div className="card table-card">
        {loading ? (
          <div className="table-loading"><div className="spinner"/></div>
        ) : cots.length === 0 ? (
          <div className="empty-state">
            <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.2">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 12h6M9 16h4"/>
            </svg>
            <p>Aún no hay cotizaciones</p>
            <Button variant="primary" size="sm" onClick={() => setCreating(true)}>+ Nueva cotización</Button>
          </div>
        ) : (
          <table className="data-table">
            <thead><tr>
              <th>N°</th><th>Cliente</th>
              <th className="td-right">Total</th>
              <th>Estado</th><th>Fecha</th><th>Acciones</th>
            </tr></thead>
            <tbody>
              {cots.map(cot => (
                <Fragment key={cot.id}>
                  <tr className={expanded === cot.id ? 'row-expanded' : ''}>
                    <td><span className="inv-num">COT-{String(cot.numero_cotizacion).padStart(4,'0')}</span></td>
                    <td>
                      <p className="td-main">{cot.cliente_nombre || 'Consumidor Final'}</p>
                      {cot.cliente_nit && <p className="td-sub muted t-xs">NIT {cot.cliente_nit}</p>}
                    </td>
                    <td className="td-price td-right">{COP(cot.total)}</td>
                    <td><Badge variant={cot.estado}>{cot.estado}</Badge></td>
                    <td className="muted t-xs">{DATE(cot.created_at)}</td>
                    <td>
                      <div className="action-btns">
                        <Button variant="ghost" size="sm" onClick={() => setExpanded(p => p === cot.id ? null : cot.id)}>
                          {expanded === cot.id ? 'Cerrar' : 'Ver'}
                        </Button>
                        <Button variant="secondary" size="sm" disabled={printing === cot.id} onClick={() => handlePrint(cot.id)}>
                          {printing === cot.id ? '…' : '🖨️ PDF'}
                        </Button>
                        {ESTADO_NEXT[cot.estado]?.length > 0 && (
                          <select className="cot-state-sel" value="" disabled={changingEst === cot.id}
                            onChange={e => e.target.value && handleEstado(cot.id, e.target.value)}>
                            <option value="">Estado ▾</option>
                            {ESTADO_NEXT[cot.estado].map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        )}
                        <button className="cot-del" onClick={() => handleDel(cot.id)}>🗑</button>
                      </div>
                    </td>
                  </tr>
                  {expanded === cot.id && (
                    <tr className="detail-row">
                      <td colSpan={6}><CotDetail id={cot.id}/></td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
