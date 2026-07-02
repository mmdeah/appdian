import { useState, useEffect, useRef } from 'react'
import { productsApi, invoicesApi } from '../api/client'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import './POS.css'

const COP = (n) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0)

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

export default function POS() {
  const [products, setProducts] = useState([])
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState([])
  const [loading, setLoading] = useState(true)
  const [emitting, setEmitting] = useState(false)
  const [result, setResult] = useState(null)  // { ok, data, error }
  const [cajero, setCajero] = useState('Cajero 1')
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
    const ivaRate = (i.iva_porcentaje || 0) / 100
    return s + i.precio * i.qty * ivaRate
  }, 0)
  const total = subtotal + iva

  async function emitirPOS() {
    if (cart.length === 0) return
    setEmitting(true)
    setResult(null)
    try {
      const items = cart.map(i => ({
        product_id: i.id,
        quantity: i.qty,
        price: i.precio,
      }))
      const { data } = await invoicesApi.emitirPOS({ items, cajero })
      setResult({ ok: true, data })
      setCart([])
    } catch (err) {
      setResult({ ok: false, error: err.response?.data?.error || 'Error al emitir documento' })
    } finally {
      setEmitting(false)
    }
  }

  return (
    <div className="pos-layout">
      {/* Products panel */}
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
            <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.2" style={{ color: 'var(--text-tertiary)' }}>
              <path d="M20 7l-8-4-8 4m16 0v10l-8 4m-8-4V7m16 0L12 11M4 7l8 4" />
            </svg>
            <p className="muted t-sm">Sin productos {search ? 'con ese criterio' : 'registrados'}</p>
          </div>
        ) : (
          <div className="products-grid">
            {filtered.map(p => <ProductCard key={p.id} p={p} onAdd={addToCart} />)}
          </div>
        )}
      </div>

      {/* Cart panel */}
      <div className="pos-cart">
        <div className="cart-header">
          <h3 className="cart-title">Carrito</h3>
          {cart.length > 0 && (
            <button className="cart-clear-btn" onClick={clearCart}>Vaciar</button>
          )}
        </div>

        {/* Cajero */}
        <div className="cajero-wrap">
          <label className="cajero-label caps muted">Cajero</label>
          <input
            className="cajero-input"
            value={cajero}
            onChange={e => setCajero(e.target.value)}
            placeholder="Nombre cajero"
          />
        </div>

        {/* Items */}
        <div className="cart-items">
          {cart.length === 0 ? (
            <div className="cart-empty">
              <svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.2" style={{ color: 'var(--text-tertiary)' }}>
                <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="muted t-sm">Agrega productos al carrito</p>
            </div>
          ) : (
            cart.map(item => (
              <CartItem key={item.id} item={item} onQty={changeQty} onRemove={removeItem} />
            ))
          )}
        </div>

        {/* Totals */}
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

        {/* Result feedback */}
        {result && (
          <div className={`pos-result ${result.ok ? 'pos-result--ok' : 'pos-result--err'}`}>
            {result.ok ? (
              <>
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="result-title">¡Documento emitido!</p>
                  <p className="t-xs" style={{ opacity: 0.8 }}>N° {result.data?.factura?.numero_documento} — {result.data?.factura?.estado}</p>
                  {result.data?.factura?.pdf_url && (
                    <a href={result.data.factura.pdf_url} target="_blank" rel="noreferrer" className="result-link">
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
          onClick={emitirPOS}
        >
          Emitir documento POS
        </Button>
      </div>
    </div>
  )
}
