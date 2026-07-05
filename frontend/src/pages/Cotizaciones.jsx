import { useState, useEffect } from 'react'
import { productsApi } from '../api/client'
import { useAuth } from '../context/AuthContext'
import Button from '../components/ui/Button'

const COP = (n) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0)

const itemVacio = () => ({ id: Math.random(), desc: '', cantidad: 1, precio: 0, iva: 0 })

function calcSub(it) { return Math.round(it.cantidad * it.precio * 100) / 100 }
function calcIva(it) { return Math.round(calcSub(it) * it.iva / 100 * 100) / 100 }

// ── Abre ventana de impresión ─────────────────────────────────────────────────
function imprimir({ empresa, consumidorFinal, cliente, items, nota, validez }) {
  const COP2 = (n) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0)

  const subtotal = items.reduce((s, it) => s + calcSub(it), 0)
  const iva      = items.reduce((s, it) => s + calcIva(it), 0)
  const total    = Math.round((subtotal + iva) * 100) / 100
  const numero   = String(Math.floor(Math.random() * 9000) + 1000)
  const hoy      = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })

  const vence = (() => {
    const d = new Date(); d.setDate(d.getDate() + (validez || 30))
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })
  })()

  const filas = items.filter(it => it.desc.trim()).map((it, i) => `
    <tr>
      <td class="c">${i + 1}</td>
      <td>${it.desc}</td>
      <td class="r">${Number(it.cantidad).toLocaleString('es-CO')}</td>
      <td class="r">${COP2(it.precio)}</td>
      <td class="r">${it.iva}%</td>
      <td class="r"><strong>${COP2(calcSub(it))}</strong></td>
    </tr>`).join('')

  const nombreCliente = consumidorFinal ? 'Consumidor Final' : (cliente.nombre || 'Consumidor Final')
  const nitCliente    = consumidorFinal ? '' : cliente.nit
  const emailCliente  = consumidorFinal ? '' : cliente.email

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Cotización COT-${numero}</title>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Segoe UI',Arial,sans-serif;font-size:13px;color:#1e293b;background:#fff;padding:40px 48px;max-width:820px;margin:0 auto}
    .header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:22px;border-bottom:3px solid #0d9488;margin-bottom:26px;gap:24px}
    .emp-nombre{font-size:22px;font-weight:800;color:#042f2e;letter-spacing:-.5px}
    .emp-info{margin-top:7px;font-size:12px;color:#64748b;line-height:1.9}
    .doc-block{text-align:right;flex-shrink:0}
    .doc-tipo{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#0d9488;margin-bottom:4px}
    .doc-num{font-size:28px;font-weight:900;color:#042f2e;letter-spacing:-1px;line-height:1}
    .doc-fecha{font-size:11px;color:#64748b;margin-top:5px;line-height:1.8}
    .badge{display:inline-block;margin-top:8px;padding:3px 10px;border-radius:20px;font-size:10px;font-weight:700;text-transform:uppercase;background:#ccfbf1;color:#0d6e6a}
    .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:26px}
    .info-box{background:#f0fdfa;border:1px solid #99f6e4;border-radius:10px;padding:13px 16px}
    .info-label{font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#94a3b8;margin-bottom:5px}
    .info-val{font-size:14px;font-weight:700;color:#0f172a;line-height:1.3}
    .info-sub{font-size:12px;color:#64748b;margin-top:2px;line-height:1.6}
    .sec-label{font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#94a3b8;margin-bottom:8px}
    table{width:100%;border-collapse:collapse;margin-bottom:22px}
    thead tr{background:#0d9488}
    thead th{color:#fff;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;padding:10px 12px;text-align:left}
    thead th.r,thead th.c{text-align:right}
    tbody td{padding:9px 12px;border-bottom:1px solid #e2e8f0;color:#334155;font-size:13px;vertical-align:top}
    tbody td.r{text-align:right}
    tbody td.c{text-align:center;color:#94a3b8}
    tbody tr:nth-child(even) td{background:#f0fdfa}
    tbody tr:last-child td{border-bottom:none}
    .totals-wrap{display:flex;justify-content:flex-end;margin-bottom:24px}
    .totals{width:280px;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden}
    .tot-row{display:flex;justify-content:space-between;padding:9px 16px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#475569}
    .tot-row:last-child{background:#0d9488;border-bottom:none;padding:13px 16px;color:#fff;font-size:15px;font-weight:800}
    .nota-block{margin-bottom:22px;padding:12px 16px;background:#fef9c3;border-left:4px solid #eab308;border-radius:6px;font-size:13px;color:#64748b;line-height:1.6}
    .nota-label{font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#94a3b8;margin-bottom:5px}
    .footer{margin-top:24px;padding-top:14px;border-top:1px solid #e2e8f0;text-align:center;font-size:10.5px;color:#94a3b8;line-height:1.8}
    .footer strong{color:#64748b}
    @media print{body{padding:0}@page{margin:15mm;size:A4 portrait}}
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="emp-nombre">${empresa?.nombre || 'Mi Empresa'}</div>
      <div class="emp-info">
        NIT: <strong>${empresa?.nit || '—'}</strong><br>
        ${empresa?.email ? empresa.email + '<br>' : ''}
        ${empresa?.telefono ? 'Tel. ' + empresa.telefono : ''}
      </div>
    </div>
    <div class="doc-block">
      <div class="doc-tipo">Cotización / Propuesta Comercial</div>
      <div class="doc-num">COT-${numero}</div>
      <div class="doc-fecha">
        Fecha: ${hoy}<br>
        Válida hasta: <strong>${vence}</strong>
      </div>
      <div class="badge">BORRADOR</div>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-box">
      <div class="info-label">Cliente / Destinatario</div>
      <div class="info-val">${nombreCliente}</div>
      <div class="info-sub">
        ${nitCliente ? 'NIT: ' + nitCliente + '<br>' : ''}
        ${emailCliente || ''}
      </div>
    </div>
    <div class="info-box">
      <div class="info-label">Elaborado por</div>
      <div class="info-val">${empresa?.nombre || '—'}</div>
      <div class="info-sub">NIT: ${empresa?.nit || '—'}<br>${empresa?.email || ''}</div>
    </div>
  </div>

  <div class="sec-label">Detalle de productos y servicios</div>
  <table>
    <thead>
      <tr>
        <th class="c" style="width:36px">#</th>
        <th>Descripción</th>
        <th class="r" style="width:64px">Cant.</th>
        <th class="r" style="width:115px">Precio unit.</th>
        <th class="r" style="width:55px">IVA</th>
        <th class="r" style="width:115px">Subtotal</th>
      </tr>
    </thead>
    <tbody>${filas || '<tr><td colspan="6" style="text-align:center;color:#94a3b8;padding:16px">Sin ítems</td></tr>'}</tbody>
  </table>

  <div class="totals-wrap">
    <div class="totals">
      <div class="tot-row"><span>Base gravable</span><span>${COP2(subtotal)}</span></div>
      <div class="tot-row"><span>IVA</span><span>${COP2(iva)}</span></div>
      <div class="tot-row"><span>TOTAL</span><span>${COP2(total)}</span></div>
    </div>
  </div>

  ${nota ? `<div class="nota-block"><div class="nota-label">Notas / Condiciones</div>${nota}</div>` : ''}

  <div class="footer">
    <strong>Documento generado por AppDian</strong> · ${new Date().toLocaleString('es-CO')}<br>
    Esta cotización no constituye una factura de venta · Válida por ${validez || 30} días
  </div>

  <script>window.addEventListener('load', () => window.print())</script>
</body>
</html>`

  const win = window.open('', '_blank', 'width=900,height=750,scrollbars=yes')
  if (!win) { alert('Permite las ventanas emergentes para este sitio e intenta de nuevo.'); return }
  win.document.write(html)
  win.document.close()
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function Cotizaciones() {
  const { empresa } = useAuth()
  const [consumidorFinal, setCF]  = useState(true)
  const [cliente, setCliente]     = useState({ nombre: '', nit: '', email: '' })
  const [items, setItems]         = useState([itemVacio()])
  const [nota, setNota]           = useState('')
  const [validez, setValidez]     = useState(30)
  const [productos, setProductos] = useState([])

  useEffect(() => {
    productsApi.list()
      .then(({ data }) => setProductos(data.products || []))
      .catch(() => {})
  }, [])

  // Cuando el usuario escoge un producto del datalist, auto-llena precio e IVA
  function onDescChange(idx, val) {
    const prod = productos.find(p => p.nombre === val)
    setItems(prev => prev.map((it, i) => {
      if (i !== idx) return it
      const precio = prod ? parseFloat(prod.precio_venta || prod.precio || 0) : it.precio
      const iva    = prod ? parseFloat(prod.iva_porcentaje || 0) : it.iva
      return { ...it, desc: val, precio, iva }
    }))
  }

  function onNum(idx, field, val) {
    setItems(prev => prev.map((it, i) =>
      i !== idx ? it : { ...it, [field]: parseFloat(val) || 0 }
    ))
  }

  const subtotal = items.reduce((s, it) => s + calcSub(it), 0)
  const ivaTotal = items.reduce((s, it) => s + calcIva(it), 0)
  const total    = Math.round((subtotal + ivaTotal) * 100) / 100

  const inputStyle = {
    width: '100%', padding: '7px 10px',
    border: '1.5px solid var(--border)', borderRadius: 7,
    background: 'var(--bg)', color: 'var(--text-primary)',
    fontSize: 13, outline: 'none', boxSizing: 'border-box',
  }
  const labelStyle = {
    display: 'block', fontSize: 11, fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '.06em',
    color: 'var(--text-muted)', marginBottom: 4,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>

      {/* ── Cabecera ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--text-primary)' }}>
            Cotizaciones
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: 2 }}>
            Genera una propuesta comercial en PDF
          </p>
        </div>
        <Button variant="primary" onClick={() => imprimir({ empresa, consumidorFinal, cliente, items, nota, validez })}>
          🖨️ Generar cotización
        </Button>
      </div>

      {/* ── 1. Cliente ── */}
      <div className="card" style={{ padding: 'var(--s-5)', display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-muted)' }}>
          1 · Cliente
        </p>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setCF(true)}
            style={{
              padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer',
              border: '1.5px solid', transition: 'all .15s',
              borderColor: consumidorFinal ? 'var(--primary)' : 'var(--border)',
              background: consumidorFinal ? 'var(--primary)' : 'var(--bg)',
              color: consumidorFinal ? '#fff' : 'var(--text-secondary)',
            }}
          >
            Consumidor final
          </button>
          <button
            onClick={() => setCF(false)}
            style={{
              padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer',
              border: '1.5px solid', transition: 'all .15s',
              borderColor: !consumidorFinal ? 'var(--primary)' : 'var(--border)',
              background: !consumidorFinal ? 'var(--primary)' : 'var(--bg)',
              color: !consumidorFinal ? '#fff' : 'var(--text-secondary)',
            }}
          >
            Cliente específico
          </button>
        </div>

        {!consumidorFinal && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Nombre / Razón social</label>
              <input style={inputStyle} placeholder="Empresa o persona"
                value={cliente.nombre} onChange={e => setCliente(p => ({ ...p, nombre: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>NIT / CC</label>
              <input style={inputStyle} placeholder="900123456-1"
                value={cliente.nit} onChange={e => setCliente(p => ({ ...p, nit: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input style={inputStyle} type="email" placeholder="cliente@empresa.com"
                value={cliente.email} onChange={e => setCliente(p => ({ ...p, email: e.target.value }))} />
            </div>
          </div>
        )}
      </div>

      {/* ── 2. Ítems ── */}
      <div className="card" style={{ padding: 'var(--s-5)', display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-muted)' }}>
          2 · Productos / Servicios
        </p>

        {/* datalist con el catálogo */}
        <datalist id="cot-productos">
          {productos.map(p => <option key={p.id} value={p.nombre} />)}
        </datalist>

        {/* Tabla con estilos inline para garantizar renderizado */}
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Descripción', 'Cant.', 'Precio unit.', 'IVA', 'Subtotal', ''].map((h, i) => (
                <th key={i} style={{
                  padding: '8px 10px', fontSize: 10.5, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '.07em',
                  color: 'var(--text-muted)', textAlign: i > 0 ? 'right' : 'left',
                  borderBottom: '1.5px solid var(--border)',
                  width: i === 0 ? 'auto' : i === 5 ? 32 : i === 2 ? 130 : i === 1 ? 80 : i === 3 ? 75 : 120,
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => (
              <tr key={it.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '6px 8px' }}>
                  <input
                    list="cot-productos"
                    style={inputStyle}
                    placeholder="Escribe o elige del catálogo…"
                    value={it.desc}
                    onChange={e => onDescChange(idx, e.target.value)}
                  />
                </td>
                <td style={{ padding: '6px 8px' }}>
                  <input style={{ ...inputStyle, textAlign: 'right' }}
                    type="number" min="1" step="1"
                    value={it.cantidad}
                    onChange={e => onNum(idx, 'cantidad', e.target.value)} />
                </td>
                <td style={{ padding: '6px 8px' }}>
                  <input style={{ ...inputStyle, textAlign: 'right' }}
                    type="number" min="0" step="1000"
                    value={it.precio}
                    onChange={e => onNum(idx, 'precio', e.target.value)} />
                </td>
                <td style={{ padding: '6px 8px' }}>
                  <select style={{ ...inputStyle, textAlign: 'right' }}
                    value={it.iva}
                    onChange={e => onNum(idx, 'iva', e.target.value)}>
                    <option value={0}>0 %</option>
                    <option value={5}>5 %</option>
                    <option value={19}>19 %</option>
                  </select>
                </td>
                <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' }}>
                  {COP(calcSub(it))}
                </td>
                <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                  <button
                    onClick={() => setItems(p => p.filter((_, i) => i !== idx))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: 13 }}
                  >✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <button
          onClick={() => setItems(p => [...p, itemVacio()])}
          style={{
            background: 'none', border: '1.5px dashed var(--border)', borderRadius: 8,
            color: 'var(--text-muted)', fontSize: 13, padding: '7px 12px',
            cursor: 'pointer', textAlign: 'left', transition: 'all .15s',
          }}
        >
          + Agregar ítem
        </button>

        {/* Totales */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: 240, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[['Subtotal', subtotal], ['IVA', ivaTotal]].map(([label, val]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-secondary)' }}>
                <span>{label}</span><span>{COP(val)}</span>
              </div>
            ))}
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              fontSize: 15, fontWeight: 700, color: 'var(--text-primary)',
              paddingTop: 8, borderTop: '1.5px solid var(--border)', marginTop: 2,
            }}>
              <span>TOTAL</span>
              <span style={{ color: 'var(--primary)' }}>{COP(total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. Nota + validez ── */}
      <div className="card" style={{ padding: 'var(--s-5)', display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-muted)' }}>
          3 · Nota y validez
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 16, alignItems: 'flex-start' }}>
          <div>
            <label style={labelStyle}>Válida (días)</label>
            <input style={{ ...inputStyle, textAlign: 'right' }} type="number" min="1" max="365"
              value={validez} onChange={e => setValidez(parseInt(e.target.value) || 30)} />
          </div>
          <div>
            <label style={labelStyle}>Nota / condiciones</label>
            <textarea
              rows={3}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
              placeholder="Ej: Precios sujetos a cambio sin previo aviso. Incluye instalación y garantía de 1 año."
              value={nota}
              onChange={e => setNota(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ── Botón final ── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="primary"
          onClick={() => imprimir({ empresa, consumidorFinal, cliente, items, nota, validez })}>
          🖨️ Generar cotización PDF
        </Button>
      </div>

    </div>
  )
}
