import { useState, useEffect, useRef, useCallback } from 'react'
import { productsApi, invoicesApi, customersApi } from '../api/client'
import Button from '../components/ui/Button'
import './POS.css'

const COP = (n) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0)

const MEDIOS_PAGO = [
  { id: 10, label: 'Efectivo' },
  { id: 42, label: 'Transferencia' },
  { id: 49, label: 'Tarjeta débito' },
  { id: 48, label: 'Tarjeta crédito' },
  { id: 71, label: 'Bono/Vale' },
]

const TIPOS_DOC = [
  { id: 3, label: 'CC — Cédula ciudadanía' },
  { id: 2, label: 'NIT' },
  { id: 4, label: 'CE — Cédula extranjería' },
  { id: 5, label: 'PA — Pasaporte' },
]

/* ── ProductCard ──────────────────────────────────────────── */
function ProductCard({ p, onAdd }) {
  return (
    <button className="product-card" onClick={() => onAdd(p)}>
      <div className="product-code caps muted">{p.codigo}</div>
      <div className="product-name">{p.nombre}</div>
      <div className="product-price">{COP(p.precio)}</div>
      {p.iva_porcentaje > 0 && (
        <div className="product-iva t-xs muted">IVA {p.iva_porcentaje}%</div>
      )}
    </button>
  )
}

/* ── CartItem ─────────────────────────────────────────────── */
function CartItem({ item, onQty, onRemove }) {
  return (
    <div className="cart-item">
      <div className="cart-item-info">
        <p className="cart-item-name">{item.nombre}</p>
        <p className="cart-item-price muted t-xs">{COP(item.precio)} c/u</p>
      </div>
      <div className="cart-item-controls">
        <button className="qty-btn" onClick={() => onQty(item.id, -1)}>−</button>
        <span className="qty-value">{item.qty}</span>
        <button className="qty-btn" onClick={() => onQty(item.id, 1)}>+</button>
      </div>
      <div className="cart-item-subtotal">{COP(item.precio * item.qty)}</div>
      <button className="cart-remove" onClick={() => onRemove(item.id)} title="Eliminar">
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

/* ── ClientePanel ─────────────────────────────────────────── */
function ClientePanel({ cliente, onChange }) {
  const [modo, setModo] = useState('final')       // 'final' | 'identificado'
  const [busqueda, setBusqueda] = useState('')
  const [sugerencias, setSugerencias] = useState([])
  const [buscando, setBuscando] = useState(false)
  const timerRef = useRef(null)

  function setModoFinal() {
    setModo('final')
    setBusqueda('')
    setSugerencias([])
    onChange(null)
  }

  function setModoIdentificado() {
    setModo('identificado')
    onChange({ nombre: '', nit: '', email: '', tipo_doc_id: 3, direccion: '' })
  }

  const buscar = useCallback(async (q) => {
    if (!q || q.length < 2) { setSugerencias([]); return }
    setBuscando(true)
    try {
      const { data } = await customersApi.list(q)
      setSugerencias(data.clientes?.slice(0, 5) || [])
    } catch { setSugerencias([]) }
    finally { setBuscando(false) }
  }, [])

  function onBusquedaChange(e) {
    const q = e.target.value
    setBusqueda(q)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => buscar(q), 300)
  }

  function seleccionarCliente(c) {
    setBusqueda(`${c.nombre} — ${c.nit}`)
    setSugerencias([])
    onChange({
      nombre: c.nombre,
      nit:    c.nit,
      email:  c.email || '',
      tipo_doc_id: c.tipo_doc_id || 3,
      direccion:   c.direccion || '',
    })
  }

  function updateField(key, val) {
    onChange({ ...(cliente || {}), [key]: val })
  }

  return (
    <div className="cliente-panel">
      {/* Toggle */}
      <div className="cliente-toggle">
        <button
          className={`toggle-btn ${modo === 'final' ? 'toggle-btn--active' : ''}`}
          onClick={setModoFinal}
        >
          Consumidor Final
        </button>
        <button
          className={`toggle-btn ${modo === 'identificado' ? 'toggle-btn--active' : ''}`}
          onClick={setModoIdentificado}
        >
          Identificar cliente
        </button>
      </div>

      {modo === 'identificado' && (
        <div className="cliente-form">
          {/* Búsqueda */}
          <div className="cliente-search-wrap">
            <input
              className="cliente-search-input"
              placeholder="Buscar cliente por nombre o NIT…"
              value={busqueda}
              onChange={onBusquedaChange}
            />
            {buscando && <span className="cliente-search-spin" />}
            {sugerencias.length > 0 && (
              <div className="cliente-dropdown">
                {sugerencias.map(c => (
                  <button key={c.id} className="cliente-dropdown-item" onClick={() => seleccionarCliente(c)}>
                    <span className="cdi-nombre">{c.nombre}</span>
                    <span className="cdi-nit muted">{c.nit}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Campos manuales */}
          <div className="cliente-fields">
            <div className="cf-row">
              <label>Tipo doc.
                <select value={cliente?.tipo_doc_id || 3} onChange={e => updateField('tipo_doc_id', parseInt(e.target.value))}>
                  {TIPOS_DOC.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </label>
              <label>NIT / Identificación *
                <input
                  placeholder="123456789"
                  value={cliente?.nit || ''}
                  onChange={e => updateField('nit', e.target.value)}
                />
              </label>
            </div>
            <label>Nombre / Razón social *
              <input
                placeholder="Empresa S.A.S."
                value={cliente?.nombre || ''}
                onChange={e => updateField('nombre', e.target.value)}
              />
            </label>
            <label>Email (para envío PDF)
              <input
                type="email"
                placeholder="correo@empresa.com"
                value={cliente?.email || ''}
                onChange={e => updateField('email', e.target.value)}
              />
            </label>
            <label>Dirección
              <input
                placeholder="Calle 123 # 45-67"
                value={cliente?.direccion || ''}
                onChange={e => updateField('direccion', e.target.value)}
              />
            </label>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Página principal POS ─────────────────────────────────── */
export default function POS() {
  const [products, setProducts] = useState([])
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState([])
  const [loading, setLoading] = useState(true)
  const [emitting, setEmitting] = useState(false)
  const [result, setResult] = useState(null)
  const [cajero, setCajero] = useState('Cajero 1')
  const [medioPago, setMedioPago] = useState(10)
  const [cliente, setCliente] = useState(null)   // null = Consumidor Final
  const [tipoDoc, setTipoDoc] = useState('POS')  // 'POS' | 'FE'
  const searchRef = useRef()

  useEffect(() => {
    productsApi.list()
      .then(({ data }) => setProducts(data.productos || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = search
    ? products.filter(p =>
        p.nombre.toLowerCase().includes(search.toLowerCase()) ||
        p.codigo.toLowerCase().includes(search.toLowerCase())
      )
    : products.filter(p => p.activo)

  function addToCart(p) {
    setCart((prev) => {
      const exists = prev.find(i => i.id === p.id)
      if (exists) return prev.map(i => i.id === p.id ? { ...i, qty: i.qty + 1 } : i)
      return [...prev, { ...p, qty: 1 }]
    })
  }

  function changeQty(id, delta) {
    setCart((prev) =>
      prev
        .map(i => i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i)
        .filter(i => i.qty > 0)
    )
  }

  function removeItem(id) {
    setCart((prev) => prev.filter(i => i.id !== id))
  }

  function clearCart() {
    setCart([])
    setResult(null)
  }

  const subtotal = cart.reduce((s, i) => s + i.precio * i.qty, 0)
  const iva = cart.reduce((s, i) => {
    return s + i.precio * i.qty * ((i.iva_porcentaje || 0) / 100)
  }, 0)
  const total = subtotal + iva

  const items = cart.map(i => ({
    product_id:    i.id,
    codigo:        i.codigo,
    descripcion:   i.nombre,
    cantidad:      i.qty,
    precio:        i.precio,
    iva_porcentaje: i.iva_porcentaje || 0,
  }))

  async function emitir() {
    if (cart.length === 0) return
    setEmitting(true)
    setResult(null)
    try {
      let resp
      if (tipoDoc === 'FE') {
        if (!cliente?.nit || !cliente?.nombre) {
          setResult({ ok: false, error: 'Para Factura FE debes identificar al cliente (NIT y nombre requeridos).' })
          setEmitting(false)
          return
        }
        const { data } = await invoicesApi.emitirFE({
          items,
          cliente,
          medio_pago_id: medioPago,
        })
        resp = data
      } else {
        const { data } = await invoicesApi.emitirPOS({
          items,
          cajero_nombre: cajero,
          terminal_numero: 'CJ001',
          medio_pago_id:   medioPago,
          cliente: cliente ? {
            nombre:      cliente.nombre,
            nit:         cliente.nit,
            email:       cliente.email,
            tipo_doc_id: cliente.tipo_doc_id,
          } : null,
        })
        resp = data
      }
      setResult({ ok: true, data: resp })
      setCart([])
    } catch (err) {
      setResult({ ok: false, error: err.response?.data?.error || 'Error al emitir documento' })
    } finally {
      setEmitting(false)
    }
  }

  return (
    <div className="pos-layout">
      {/* ── Panel de productos ── */}
      <div className="pos-products">
        <div className="pos-search-bar">
          <div className="search-wrap">
            <svg className="search-icon" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              ref={searchRef}
              className="search-input"
              placeholder="Buscar producto o código..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
            {search && (
              <button className="search-clear" onClick={() => setSearch('')}>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="products-empty"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="products-empty">
            <p className="muted t-sm">Sin productos {search ? 'con ese criterio' : 'registrados'}</p>
          </div>
        ) : (
          <div className="products-grid">
            {filtered.map(p => <ProductCard key={p.id} p={p} onAdd={addToCart} />)}
          </div>
        )}
      </div>

      {/* ── Panel de carrito ── */}
      <div className="pos-cart">
        <div className="cart-header">
          <h3 className="cart-title">Carrito</h3>
          {cart.length > 0 && (
            <button className="cart-clear-btn" onClick={clearCart}>Vaciar</button>
          )}
        </div>

        {/* Tipo de documento */}
        <div className="tipodoc-toggle">
          <button
            className={`tipodoc-btn ${tipoDoc === 'POS' ? 'tipodoc-btn--active' : ''}`}
            onClick={() => setTipoDoc('POS')}
          >
            Documento POS
          </button>
          <button
            className={`tipodoc-btn ${tipoDoc === 'FE' ? 'tipodoc-btn--active' : ''}`}
            onClick={() => setTipoDoc('FE')}
          >
            Factura Electrónica
          </button>
        </div>

        {/* Cajero (solo POS) */}
        {tipoDoc === 'POS' && (
          <div className="cajero-wrap">
            <label className="cajero-label caps muted">Cajero</label>
            <input
              className="cajero-input"
              value={cajero}
              onChange={e => setCajero(e.target.value)}
              placeholder="Nombre cajero"
            />
          </div>
        )}

        {/* Medio de pago */}
        <div className="cajero-wrap">
          <label className="cajero-label caps muted">Medio de pago</label>
          <select
            className="cajero-input"
            value={medioPago}
            onChange={e => setMedioPago(parseInt(e.target.value))}
          >
            {MEDIOS_PAGO.map(m => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </div>

        {/* Panel de cliente */}
        <ClientePanel cliente={cliente} onChange={setCliente} />

        {/* Items */}
        <div className="cart-items">
          {cart.length === 0 ? (
            <div className="cart-empty">
              <p className="muted t-sm">Agrega productos al carrito</p>
            </div>
          ) : (
            cart.map(item => (
              <CartItem key={item.id} item={item} onQty={changeQty} onRemove={removeItem} />
            ))
          )}
        </div>

        {/* Totales */}
        <div className="cart-totals">
          <div className="total-row">
            <span className="muted t-sm">Subtotal</span>
            <span className="t-sm">{COP(subtotal)}</span>
          </div>
          <div className="total-row">
            <span className="muted t-sm">IVA</span>
            <span className="t-sm">{COP(iva)}</span>
          </div>
          <div className="divider" />
          <div className="total-row total-row--main">
            <span>Total</span>
            <span className="total-value">{COP(total)}</span>
          </div>
        </div>

        {/* Resultado */}
        {result && (
          <div className={`pos-result ${result.ok ? 'pos-result--ok' : 'pos-result--err'}`}>
            {result.ok ? (
              <>
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="result-title">¡Documento emitido!</p>
                  <p className="t-xs" style={{ opacity: 0.8 }}>
                    N° {result.data?.factura?.numero_documento ?? result.data?.numero_documento}
                    {' — '}
                    {result.data?.factura?.estado ?? result.data?.estado ?? 'OK'}
                  </p>
                  {result.data?.mensaje && (
                    <p className="t-xs result-warning">{result.data.mensaje}</p>
                  )}
                  {result.data?.pdf_url && (
                    <a href={result.data.pdf_url} target="_blank" rel="noreferrer" className="result-link">
                      Ver PDF
                    </a>
                  )}
                </div>
              </>
            ) : (
              <>
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <div>
                  <p className="result-title">Error</p>
                  <p className="t-xs" style={{ opacity: 0.8 }}>{result.error}</p>
                </div>
              </>
            )}
          </div>
        )}

        <Button
          variant="success"
          size="lg"
          fullWidth
          loading={emitting}
          disabled={cart.length === 0}
          onClick={emitir}
        >
          {tipoDoc === 'FE' ? '📄 Emitir Factura FE' : '🧾 Emitir Documento POS'}
        </Button>
      </div>
    </div>
  )
}
