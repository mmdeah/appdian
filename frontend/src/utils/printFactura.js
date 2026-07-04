/**
 * printFactura(factura, empresa)
 *
 * Abre una ventana con la plantilla HTML de la factura y dispara window.print()
 * El usuario puede guardar como PDF o imprimir desde ahí.
 *
 * `factura` debe tener los campos del backend + items_factura: [...]
 * `empresa` viene del AuthContext (empresa.nombre, empresa.nit, …)
 */
export function printFactura(factura, empresa = {}) {
  const COP = (n) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', maximumFractionDigits: 0,
    }).format(n || 0)

  const FECHA = (s) =>
    new Date(s).toLocaleDateString('es-CO', {
      day: '2-digit', month: 'long', year: 'numeric',
    })

  const TIPO_LABEL = {
    POS: 'Documento Equivalente POS',
    FE:  'Factura Electrónica de Venta',
    NC:  'Nota Crédito',
    ND:  'Nota Débito',
  }[factura.tipo] || factura.tipo

  const items = factura.items_factura || factura.items || []

  const filas = items.length > 0
    ? items.map((it, i) => `
      <tr>
        <td class="c">${i + 1}</td>
        <td>${it.descripcion || it.nombre || '—'}</td>
        <td class="r">${Number(it.cantidad ?? 1).toLocaleString('es-CO')}</td>
        <td class="r">${COP(it.precio_unitario ?? it.precio_venta ?? it.precio)}</td>
        <td class="r">${it.iva_porcentaje ?? 0}%</td>
        <td class="r"><strong>${COP(it.subtotal)}</strong></td>
      </tr>`).join('')
    : `<tr><td colspan="6" class="empty-items">Sin detalle de ítems registrado</td></tr>`

  const estadoClase = {
    APROBADA:      'badge-ok',
    EMITIDA_LOCAL: 'badge-local',
    PENDIENTE:     'badge-pend',
    RECHAZADA:     'badge-err',
    ERROR:         'badge-err',
  }[factura.estado] || 'badge-pend'

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${TIPO_LABEL} #${factura.numero_documento}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Segoe UI', Arial, Helvetica, sans-serif;
      font-size: 13px;
      color: #1e293b;
      background: #fff;
      padding: 40px 48px;
      max-width: 820px;
      margin: 0 auto;
    }

    /* ── Header ─────────────────────────────────────── */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 24px;
      border-bottom: 3px solid #6366f1;
      margin-bottom: 28px;
      gap: 24px;
    }
    .empresa-nombre {
      font-size: 24px;
      font-weight: 800;
      color: #1e1b4b;
      letter-spacing: -0.5px;
      line-height: 1.1;
    }
    .empresa-info {
      margin-top: 8px;
      font-size: 12px;
      color: #64748b;
      line-height: 1.9;
    }
    .doc-block { text-align: right; flex-shrink: 0; }
    .doc-tipo {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #6366f1;
      margin-bottom: 4px;
    }
    .doc-num {
      font-size: 30px;
      font-weight: 900;
      color: #1e1b4b;
      letter-spacing: -1px;
      line-height: 1;
    }
    .doc-fecha { font-size: 12px; color: #64748b; margin-top: 6px; }

    /* ── Estado badge ───────────────────────────────── */
    .badge {
      display: inline-block;
      margin-top: 10px;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.07em;
    }
    .badge-ok    { background: #dcfce7; color: #15803d; }
    .badge-local { background: #e0e7ff; color: #4338ca; }
    .badge-pend  { background: #fef9c3; color: #854d0e; }
    .badge-err   { background: #fee2e2; color: #991b1b; }

    /* ── Info grid ──────────────────────────────────── */
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 28px;
    }
    .info-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 14px 18px;
    }
    .info-label {
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #94a3b8;
      margin-bottom: 6px;
    }
    .info-val {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
      line-height: 1.3;
    }
    .info-sub {
      font-size: 12px;
      color: #64748b;
      margin-top: 3px;
      line-height: 1.6;
    }

    /* ── Tabla ítems ────────────────────────────────── */
    .items-label {
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #94a3b8;
      margin-bottom: 10px;
    }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    thead tr { background: #1e1b4b; }
    thead th {
      color: #fff;
      font-size: 10.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      padding: 11px 14px;
      text-align: left;
    }
    thead th.r, thead th.c { text-align: right; }
    tbody td {
      padding: 10px 14px;
      border-bottom: 1px solid #e2e8f0;
      color: #334155;
      font-size: 13px;
      vertical-align: top;
    }
    tbody td.r { text-align: right; }
    tbody td.c { text-align: center; color: #94a3b8; }
    tbody tr:nth-child(even) td { background: #f8fafc; }
    tbody tr:last-child td { border-bottom: none; }
    .empty-items {
      text-align: center;
      padding: 24px !important;
      color: #94a3b8;
      font-style: italic;
    }

    /* ── Totales ────────────────────────────────────── */
    .totals-wrap {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 28px;
    }
    .totals {
      width: 300px;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      overflow: hidden;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 18px;
      border-bottom: 1px solid #f1f5f9;
      font-size: 13px;
      color: #475569;
    }
    .total-row:last-child {
      background: #1e1b4b;
      border-bottom: none;
      padding: 14px 18px;
      color: #fff;
      font-size: 16px;
      font-weight: 800;
    }

    /* ── CUFE ───────────────────────────────────────── */
    .cufe-block {
      margin-top: 20px;
      padding: 12px 16px;
      background: #f1f5f9;
      border-radius: 8px;
      font-size: 10px;
      color: #64748b;
      word-break: break-all;
      line-height: 1.7;
    }
    .cufe-label {
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #94a3b8;
      margin-bottom: 5px;
    }

    /* ── Footer ─────────────────────────────────────── */
    .footer {
      margin-top: 28px;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      font-size: 10.5px;
      color: #94a3b8;
      line-height: 1.8;
    }
    .footer strong { color: #64748b; }

    /* ── Print ──────────────────────────────────────── */
    @media print {
      body { padding: 0; }
      @page { margin: 15mm; size: A4 portrait; }
    }
  </style>
</head>
<body>

  <!-- ── HEADER ── -->
  <div class="header">
    <div>
      <div class="empresa-nombre">${empresa.nombre || 'Mi Empresa'}</div>
      <div class="empresa-info">
        NIT: <strong>${empresa.nit || '—'}</strong><br>
        ${empresa.email ? `${empresa.email}<br>` : ''}
        ${empresa.telefono ? `Tel. ${empresa.telefono}<br>` : ''}
        ${empresa.direccion ? `${empresa.direccion}${empresa.ciudad ? ', ' + empresa.ciudad : ''}` : ''}
      </div>
    </div>
    <div class="doc-block">
      <div class="doc-tipo">${TIPO_LABEL}</div>
      <div class="doc-num">#${factura.numero_documento}</div>
      <div class="doc-fecha">${FECHA(factura.created_at)}</div>
      <div class="badge ${estadoClase}">${(factura.estado || '').replace('_', ' ')}</div>
    </div>
  </div>

  <!-- ── INFO GRID ── -->
  <div class="info-grid">
    <div class="info-box">
      <div class="info-label">Cliente / Comprador</div>
      <div class="info-val">${factura.cliente_nombre || 'Consumidor Final'}</div>
      <div class="info-sub">
        ${factura.cliente_nit ? `NIT / CC: ${factura.cliente_nit}<br>` : ''}
        ${factura.cliente_email ? factura.cliente_email : ''}
      </div>
    </div>
    <div class="info-box">
      <div class="info-label">Vendedor / Cajero</div>
      <div class="info-val">${empresa.nombre || '—'}</div>
      <div class="info-sub">
        NIT: ${empresa.nit || '—'}<br>
        ${factura.cajero ? `Cajero: ${factura.cajero}` : ''}
      </div>
    </div>
  </div>

  <!-- ── ÍTEMS ── -->
  <div class="items-label">Detalle de productos y servicios</div>
  <table>
    <thead>
      <tr>
        <th class="c" style="width:36px">#</th>
        <th>Descripción</th>
        <th class="r" style="width:64px">Cant.</th>
        <th class="r" style="width:120px">Precio unit.</th>
        <th class="r" style="width:60px">IVA</th>
        <th class="r" style="width:120px">Subtotal</th>
      </tr>
    </thead>
    <tbody>
      ${filas}
    </tbody>
  </table>

  <!-- ── TOTALES ── -->
  <div class="totals-wrap">
    <div class="totals">
      <div class="total-row">
        <span>Base gravable (sin IVA)</span>
        <span>${COP(factura.subtotal)}</span>
      </div>
      <div class="total-row">
        <span>IVA</span>
        <span>${COP(factura.iva)}</span>
      </div>
      <div class="total-row">
        <span>TOTAL</span>
        <span>${COP(factura.total)}</span>
      </div>
    </div>
  </div>

  <!-- ── CUFE (solo FE) ── -->
  ${factura.cufe ? `
  <div class="cufe-block">
    <div class="cufe-label">CUFE — Código Único de Factura Electrónica</div>
    ${factura.cufe}
  </div>` : ''}

  <!-- ── FOOTER ── -->
  <div class="footer">
    <strong>Documento generado por AppDian</strong> · ${new Date().toLocaleString('es-CO')}<br>
    ${factura.tipo === 'FE'
      ? 'Factura Electrónica válida · Representación gráfica del documento electrónico enviado a la DIAN'
      : 'Documento Equivalente POS · No requiere validación previa de la DIAN'}
  </div>

  <script>
    window.addEventListener('load', function () { window.print() })
  </script>
</body>
</html>`

  const win = window.open('', '_blank', 'width=900,height=750,scrollbars=yes')
  if (!win) {
    alert('El navegador bloqueó la ventana emergente. Permite pop-ups para este sitio e intenta de nuevo.')
    return
  }
  win.document.write(html)
  win.document.close()
}
