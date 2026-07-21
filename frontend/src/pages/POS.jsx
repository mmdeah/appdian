import { useState, useEffect, useRef, useCallback } from 'react'
import { productsApi, invoicesApi, customersApi } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { printFactura } from '../utils/printFactura'
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

/* ── CajeroSelector ───────────────────────────────────────── */
const CAJEROS_KEY = 'appdian_cajeros'

function loadCajeros() {
  try {
    const stored = JSON.parse(localStorage.getItem(CAJEROS_KEY))
    return Array.isArray(stored) && stored.length > 0 ? stored : ['Cajero 1']
  } catch { return ['Cajero 1'] }
}

function saveCajeros(lista) {
  localStorage.setItem(CAJEROS_KEY, JSON.stringify(lista))
}

function CajeroSelector({ cajero, onChange }) {
  const [cajeros, setCajeros] = useState(loadCajeros)
  const [modal, setModal]     = useState(false)
  const [nuevo, setNuevo]     = useState('')

  function agregar() {
    const nombre = nuevo.trim()
    if (!nombre || cajeros.includes(nombre)) return
    const next = [...cajeros, nombre]
    setCajeros(next); saveCajeros(next)
    onChange(nombre)
    setNuevo('')
  }

  function eliminar(c) {
    if (cajeros.length <= 1) return
    const next = cajeros.filter(x => x !== c)
    setCajeros(next); saveCajeros(next)
    if (cajero === c) onChange(next[0])
  }

  return (
    <>
      <div className="cajero-selector">
        <span className="cajero-selector-label caps muted">Cajero</span>
        <div className="cajero-selector-row">
          <select
            className="cajero-select"
            value={cajero}
            onChange={e => onChange(e.target.value)}
          >
            {cajeros.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button className="cajero-manage-btn" onClick={() => setModal(true)} title="Gestionar cajeros">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
          </button>
        </div>
      </div>

      {modal && (
        <div className="cajero-modal-overlay" onClick={() => setModal(false)}>
          <div className="cajero-modal" onClick={e => e.stopPropagation()}>
            <h4>Gestionar cajeros</h4>
            <div className="cajero-list">
              {cajeros.map(c => (
                <div key={c} className="cajero-list-item">
                  <span>{c}</span>
                  {cajeros.length > 1 && (
                    <button className="cajero-del-btn" onClick={() => eliminar(c)} title="Eliminar">×</button>
                  )}
                </div>
              ))}
            </div>
            <div className="cajero-new-row">
              <input
                className="cajero-new-input"
                placeholder="Nombre del cajero…"
                value={nuevo}
                onChange={e => setNuevo(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && agregar()}
              />
              <button className="cajero-new-save" onClick={agregar}>Agregar</button>
            </div>
            <button className="cajero-modal-close" onClick={() => setModal(false)}>Cerrar</button>
          </div>
        </div>
      )}
    </>
  )
}

/* ── ClienteForm (form solo, sin toggle) ──────────────────── */
function ClienteForm({ cliente, onChange }) {
  const [busqueda, setBusqueda] = useState(
    cliente?.nombre ? `${cliente.nombre}${cliente.nit ? ` — ${cliente.nit}` : ''}` : ''
  )
  const [sugerencias, setSugerencias] = useState([])
  const [buscando, setBuscando] = useState(false)
  const timerRef = useRef(null)

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
    <div className="cliente-form">
      {/* Búsqueda */}
      <div className="cliente-search-wrap">
        <svg className="cliente-search-icon" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
        </svg>
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
  )
}

/* ── ClienteModal ─────────────────────────────────────────── */
function ClienteModal({ cliente, onChange, onClose }) {
  const [modo, setModo] = useState(cliente?.nombre ? 'identificado' : 'final')
  const [localCliente, setLocalCliente] = useState(cliente)

  function handleConfirm() {
    if (modo === 'final') {
      onChange(null)
    } else {
      onChange(localCliente)
    }
    onClose()
  }

  return (
    <div className="pos-modal-overlay" onClick={onClose}>
      <div className="pos-modal" onClick={e => e.stopPropagation()}>
        <div className="pos-modal-header">
          <h3 className="pos-modal-title">Datos del cliente</h3>
          <button className="pos-modal-close-btn" onClick={onClose}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
              <path d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Toggle dentro del modal */}
        <div className="cliente-toggle">
          <button
            className={`toggle-btn ${modo === 'final' ? 'toggle-btn--active' : ''}`}
            onClick={() => setModo('final')}
          >
            Consumidor Final
          </button>
          <button
            className={`toggle-btn ${modo === 'identificado' ? 'toggle-btn--active' : ''}`}
            onClick={() => {
              setModo('identificado')
              if (!localCliente) setLocalCliente({ nombre: '', nit: '', email: '', tipo_doc_id: 3, direccion: '' })
            }}
          >
            Identificar cliente
          </button>
        </div>

        {modo === 'identificado' && (
          <ClienteForm
            cliente={localCliente}
            onChange={setLocalCliente}
          />
        )}

        {modo === 'final' && (
          <p className="pos-modal-final-msg">
            Se emitirá a nombre de <strong>Consumidor Final</strong> con NIT 222222222.
          </p>
        )}

        <div className="pos-modal-footer">
          <button className="pos-modal-cancel" onClick={onClose}>Cancelar</button>
          <button className="pos-modal-ok" onClick={handleConfirm}>Confirmar</button>
        </div>
      </div>
    </div>
  )
}

/* ── Página principal POS ─────────────────────────────────── */
export default function POS() {
  const { empresa } = useAuth()
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
  const [clienteModalOpen, setClienteModalOpen] = useState(false)
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

    // Abrir ventana de impresión ANTES del await para evitar popup blocker
    const printWin = window.open('', '_blank', 'width=900,height=750,scrollbars=yes')

    setEmitting(true)
    setResult(null)
    try {
      let resp
      if (tipoDoc === 'FE') {
        if (!cliente?.nit || !cliente?.nombre) {
          printWin?.close()
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
          cajero_nombre:   cajero,
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

      const facturaId = resp.factura_id || resp.factura?.id || resp.id
      if (facturaId && printWin) {
        try {
          const { data: fullInvoice } = await invoicesApi.get(facturaId)
          printFactura(fullInvoice, empresa || {}, printWin)
        } catch {
          printWin.close()
        }
      } else {
        printWin?.close()
      }

    } catch (err) {
      printWin?.close()
      setResult({ ok: false, error: err.response?.data?.error || 'Error al emitir documento' })
    } finally {
      setEmitting(false)
    }
  }

  // Label del cliente trigger
  const clienteLabel = cliente?.nombre
    ? cliente.nombre + (cliente.nit ? ` · ${cliente.nit}` : '')
    : 'Consumidor Final'
  const clienteIdentificado = !!(cliente?.nombre)
  const clienteRequerido = tipoDoc === 'FE' && !clienteIdentificado

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

        {/* Cabecera: tipo doc (compacto) + título + vaciar */}
        <div className="cart-top">
          <div className="tipodoc-compact">
            <button
              className={`tipodoc-pill ${tipoDoc === 'POS' ? 'tipodoc-pill--active' : ''}`}
              onClick={() => setTipoDoc('POS')}
            >
              🧾 Documento POS
            </button>
            <button
              className={`tipodoc-pill ${tipoDoc === 'FE' ? 'tipodoc-pill--active' : ''}`}
              onClick={() => setTipoDoc('FE')}
            >
              📄 Factura Electrónica
            </button>
          </div>
          <div className="cart-header">
            <h3 className="cart-title">Carrito
              {cart.length > 0 && <span className="cart-count">{cart.length}</span>}
            </h3>
            {cart.length > 0 && (
              <button className="cart-clear-btn" onClick={clearCart}>Vaciar</button>
            )}
          </div>
        </div>

        {/* ── Items — siempre visibles, flex:1 ── */}
        <div className="cart-items">
          {cart.length === 0 ? (
            <div className="cart-empty">
              <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.2" style={{ opacity: 0.25 }}>
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
              </svg>
              <p className="muted t-sm">Agrega productos al carrito</p>
            </div>
          ) : (
            cart.map(item => (
              <CartItem key={item.id} item={item} onQty={changeQty} onRemove={removeItem} />
            ))
          )}
        </div>

        {/* ── Footer: config + totales + emitir ── */}
        <div className="cart-footer">

          {/* Config: cajero + medio pago + cliente */}
          <div className="cart-config">
            <div className="cart-config-row">
              {tipoDoc === 'POS' && (
                <CajeroSelector cajero={cajero} onChange={setCajero} />
              )}
              <div className={`cajero-wrap ${tipoDoc === 'FE' ? 'cajero-wrap--full' : ''}`}>
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
            </div>

            {/* Cliente trigger */}
            <button
              className={`cliente-trigger${clienteRequerido ? ' cliente-trigger--warn' : clienteIdentificado ? ' cliente-trigger--ok' : ''}`}
              onClick={() => setClienteModalOpen(true)}
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
              <span className="cliente-trigger-text">{clienteLabel}</span>
              {clienteRequerido && <span className="cliente-trigger-badge">Requerido</span>}
              <svg className="cliente-trigger-edit" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
            </button>
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

      {/* ── Modal de cliente ── */}
      {clienteModalOpen && (
        <ClienteModal
          cliente={cliente}
          onChange={setCliente}
          onClose={() => setClienteModalOpen(false)}
        />
      )}
    </div>
  )
}
