/**
 * printCotizacion(cotizacion, empresa)
 *
 * Abre una ventana con la plantilla HTML de la cotización y dispara window.print()
 * `cotizacion` debe tener items_cotizacion: [...]
 * `empresa` viene del AuthContext
 */
export function printCotizacion(cotizacion, empresa = {}) {
  const COP = (n) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', maximumFractionDigits: 0,
    }).format(n || 0)

  const FECHA = (s) =>
    new Date(s).toLocaleDateString('es-CO', {
      day: '2-digit', month: 'long', year: 'numeric',
    })

  const vencimiento = () => {
    const d = new Date(cotizacion.created_at)
    d.setDate(d.getDate() + (cotizacion.validez_dias || 30))
    return FECHA(d.toISOString())
  }

  const ESTADO_LABEL = {
    BORRADOR  : 'Borrador',
    ENVIADA   : 'Enviada',
    ACEPTADA  : 'Aceptada',
    RECHAZADA : 'Rechazada',
    VENCIDA   : 'Vencida',
  }

  const ESTADO_CLASE = {
    BORRADOR  : 'badge-pend',
    ENVIADA   : 'badge-local',
    ACEPTADA  : 'badge-ok',
    RECHAZADA : 'badge-err',
    VENCIDA   : 'badge-err',
  }

  const items = cotizacion.items_cotizacion || []

  const filas = items.length > 0
    ? items.map((it, i) => `
      <tr>
        <td class="c">${i + 1}</td>
        <td>${it.descripcion || '—'}</td>
        <td class="r">${Number(it.cantidad ?? 1).toLocaleString('es-CO')}</td>
        <td class="r">${COP(it.precio_unitario)}</td>
        <td class="r">${it.iva_porcentaje ?? 0}%</td>
        <td class="r"><strong>${COP(it.subtotal)}</strong></td>
      </tr>`).join('')
    : `<tr><td colspan="6" class="empty-items">Sin ítems registrados</td></tr>`

  const estadoClase = ESTADO_CLASE[cotizacion.estado] || 'badge-pend'

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Cotización #${cotizacion.numero_cotizacion}</title>
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

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 24px;
      border-bottom: 3px solid #0d9488;
      margin-bottom: 28px;
      gap: 24px;
    }
    .empresa-nombre {
      font-size: 24px;
      font-weight: 800;
      color: #042f2e;
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
      color: #0d9488;
      margin-bottom: 4px;
    }
    .doc-num {
      font-size: 30px;
      font-weight: 900;
      color: #042f2e;
      letter-spacing: -1px;
      line-height: 1;
    }
    .doc-fecha { font-size: 12px; color: #64748b; margin-top: 6px; }

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
    .badge-local { background: #ccfbf1; color: #0d6e6a; }
    .badge-pend  { background: #fef9c3; color: #854d0e; }
    .badge-err   { background: #fee2e2; color: #991b1b; }

    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 28px;
    }
    .info-box {
      background: #f0fdfa;
      border: 1px solid #99f6e4;
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

    .items-label {
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #94a3b8;
      margin-bottom: 10px;
    }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    thead tr { background: #0d9488; }
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
    tbody tr:nth-child(even) td { background: #f0fdfa; }
    tbody tr:last-child td { border-bottom: none; }
    .empty-items {
      text-align: center;
      padding: 24px !important;
      color: #94a3b8;
      font-style: italic;
    }

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
      background: #0d9488;
      border-bottom: none;
      padding: 14px 18px;
      color: #fff;
      font-size: 16px;
      font-weight: 800;
    }

    .notas-block {
      margin-bottom: 24px;
      padding: 14px 18px;
      background: #fef9c3;
      border-left: 4px solid #eab308;
      border-radius: 6px;
      font-size: 13px;
      color: #64748b;
      line-height: 1.6;
    }
    .notas-label {
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #94a3b8;
      margin-bottom: 6px;
    }

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

    @media print {
      body { padding: 0; }
      @page { margin: 15mm; size: A4 portrait; }
    }
  </style>
</head>
<body>

  <!-- HEADER -->
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
      <div class="doc-tipo">Cotización / Propuesta Comercial</div>
      <div class="doc-num">COT-${String(cotizacion.numero_cotizacion).padStart(4, '0')}</div>
      <div class="doc-fecha">Fecha: ${FECHA(cotizacion.created_at)}</div>
      <div class="doc-fecha">Válida hasta: <strong>${vencimiento()}</strong></div>
      <div class="badge ${estadoClase}">${ESTADO_LABEL[cotizacion.estado] || cotizacion.estado}</div>
    </div>
  </div>

  <!-- INFO GRID -->
  <div class="info-grid">
    <div class="info-box">
      <div class="info-label">Cliente / Destinatario</div>
      <div class="info-val">${cotizacion.cliente_nombre || 'Consumidor Final'}</div>
      <div class="info-sub">
        ${cotizacion.cliente_nit ? `NIT / CC: ${cotizacion.cliente_nit}<br>` : ''}
        ${cotizacion.cliente_email ? `${cotizacion.cliente_email}<br>` : ''}
        ${cotizacion.cliente_telefono ? `Tel. ${cotizacion.cliente_telefono}` : ''}
      </div>
    </div>
    <div class="info-box">
      <div class="info-label">Elaborado por</div>
      <div class="info-val">${empresa.nombre || '—'}</div>
      <div class="info-sub">
        NIT: ${empresa.nit || '—'}<br>
        ${empresa.email ? empresa.email : ''}
      </div>
    </div>
  </div>

  <!-- ÍTEMS -->
  <div class="items-label">Detalle de productos y servicios cotizados</div>
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

  <!-- TOTALES -->
  <div class="totals-wrap">
    <div class="totals">
      <div class="total-row">
        <span>Base gravable (sin IVA)</span>
        <span>${COP(cotizacion.subtotal)}</span>
      </div>
      <div class="total-row">
        <span>IVA</span>
        <span>${COP(cotizacion.iva)}</span>
      </div>
      <div class="total-row">
        <span>TOTAL COTIZADO</span>
        <span>${COP(cotizacion.total)}</span>
      </div>
    </div>
  </div>

  <!-- NOTAS -->
  ${cotizacion.notas ? `
  <div class="notas-block">
    <div class="notas-label">Notas / Condiciones</div>
    ${cotizacion.notas}
  </div>` : ''}

  <!-- FOOTER -->
  <div class="footer">
    <strong>Documento generado por AppDian</strong> · ${new Date().toLocaleString('es-CO')}<br>
    Esta cotización no constituye una factura de venta. Válida por ${cotizacion.validez_dias || 30} días desde la fecha de emisión.
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
