const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType,
  LevelFormat, Header, Footer, PageNumber
} = require('docx');
const fs = require('fs');
const path = require('path');

const BLUE   = '1B4F8A';
const LBLUE  = 'D6E8F7';
const GRAY   = 'F2F4F7';
const BLACK  = '111827';
const MUTED  = '6B7280';
const WHITE  = 'FFFFFF';

const cellBorder = { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' };
const borders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };
const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 320, after: 160 },
    children: [new TextRun({ text, bold: true, size: 32, color: BLUE, font: 'Arial' })],
  });
}
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'D1D5DB' } },
    children: [new TextRun({ text, bold: true, size: 26, color: BLACK, font: 'Arial' })],
  });
}
function h3(text) {
  return new Paragraph({
    spacing: { before: 180, after: 80 },
    children: [new TextRun({ text, bold: true, size: 23, color: BLUE, font: 'Arial' })],
  });
}
function p(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({ text, size: 22, color: opts.color || BLACK, font: 'Arial', bold: opts.bold || false })],
  });
}
function bullet(text, sub = false) {
  return new Paragraph({
    numbering: { reference: 'bullets', level: sub ? 1 : 0 },
    spacing: { after: 60 },
    children: [new TextRun({ text, size: 22, color: BLACK, font: 'Arial' })],
  });
}
function spacer(n = 1) {
  return new Paragraph({ spacing: { after: n * 140 }, children: [] });
}
function badge(text, fill, textColor = WHITE) {
  return new TableCell({
    borders: noBorders,
    shading: { fill, type: ShadingType.CLEAR },
    margins: { top: 60, bottom: 60, left: 140, right: 140 },
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text, bold: true, size: 18, color: textColor, font: 'Arial' })],
    })],
  });
}
function headerRow(cols, widths) {
  return new TableRow({
    tableHeader: true,
    children: cols.map((c, i) => new TableCell({
      borders,
      width: { size: widths[i], type: WidthType.DXA },
      shading: { fill: BLUE, type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({
        children: [new TextRun({ text: c, bold: true, size: 20, color: WHITE, font: 'Arial' })],
      })],
    })),
  });
}
function dataRow(cells, widths, shade = false) {
  return new TableRow({
    children: cells.map((c, i) => new TableCell({
      borders,
      width: { size: widths[i], type: WidthType.DXA },
      shading: { fill: shade ? GRAY : WHITE, type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({
        children: [new TextRun({ text: c, size: 20, color: BLACK, font: 'Arial' })],
      })],
    })),
  });
}
function moduleTable(rows) {
  const w = [2200, 7160];
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: w,
    rows: rows.map((r, i) => new TableRow({
      children: [
        new TableCell({
          borders, width: { size: w[0], type: WidthType.DXA },
          shading: { fill: LBLUE, type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({ children: [new TextRun({ text: r[0], bold: true, size: 20, color: BLUE, font: 'Arial' })] })],
        }),
        new TableCell({
          borders, width: { size: w[1], type: WidthType.DXA },
          shading: { fill: i % 2 === 0 ? WHITE : GRAY, type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({ children: [new TextRun({ text: r[1], size: 20, color: BLACK, font: 'Arial' })] })],
        }),
      ],
    })),
  });
}

const doc = new Document({
  numbering: {
    config: [{
      reference: 'bullets',
      levels: [
        { level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
        { level: 1, format: LevelFormat.BULLET, text: '◦', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 1080, hanging: 360 } } } },
      ],
    }],
  },
  styles: {
    default: { document: { run: { font: 'Arial', size: 22 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 32, bold: true, font: 'Arial', color: BLUE },
        paragraph: { spacing: { before: 320, after: 160 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 26, bold: true, font: 'Arial', color: BLACK },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 } },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      },
    },
    headers: {
      default: new Header({ children: [
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'D1D5DB' } },
          spacing: { after: 120 },
          children: [new TextRun({ text: 'AppDian  —  Resumen Funcional', size: 18, color: MUTED, font: 'Arial' })],
        }),
      ]}),
    },
    footers: {
      default: new Footer({ children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'D1D5DB' } },
          spacing: { before: 80 },
          children: [
            new TextRun({ text: 'Confidencial — ', size: 18, color: MUTED, font: 'Arial' }),
            new TextRun({ children: [PageNumber.CURRENT], size: 18, color: MUTED, font: 'Arial' }),
          ],
        }),
      ]}),
    },
    children: [
      // PORTADA
      spacer(4),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 },
        children: [new TextRun({ text: 'AppDian', bold: true, size: 72, color: BLUE, font: 'Arial' })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [new TextRun({ text: 'Plataforma SaaS de Facturación Electrónica DIAN', size: 30, color: MUTED, font: 'Arial' })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 600 },
        children: [new TextRun({ text: 'Resumen funcional para revisión técnica — Julio 2026', size: 22, color: MUTED, font: 'Arial' })],
      }),
      spacer(2),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [3120, 3120, 3120],
        rows: [new TableRow({ children: [
          badge('Colombia', '1B4F8A'),
          badge('DIAN Certificado', '065F46'),
          badge('SaaS Multi-empresa', '7C3AED'),
        ]})],
      }),
      spacer(6),

      // 1. VISION GENERAL
      h1('1. Visión general'),
      p('AppDian es una plataforma SaaS diseñada para empresas colombianas que necesitan emitir documentos de venta conformes con la DIAN: documentos POS, facturas electrónicas (FE), notas crédito y notas débito. Además de la facturación, integra gestión contable, nómina, análisis financiero y un canal de soporte con profesionales.'),
      spacer(),

      h2('Stack técnico'),
      moduleTable([
        ['Frontend',   'React 18 + Vite, desplegado en Railway como servicio estático'],
        ['Backend',    'Node.js / Express, API REST en Railway (mismo repositorio, Dockerfile multi-stage)'],
        ['Base de datos', 'Supabase (PostgreSQL) con Row Level Security (RLS) por empresa_id'],
        ['Auth',       'JWT personalizado con roles: EMPRESA y PROFESIONAL. Compatible con tokens sin rol (retrocompatibilidad)'],
        ['DIAN',       'Integración con MATIAS (middleware certificado DIAN). Modo prueba: estado EMITIDA_LOCAL'],
        ['IA',         'OpenRouter API (modelos LLM) para análisis financiero y reportes narrativos'],
        ['Almacenamiento', 'Supabase Storage para archivos adjuntos en tickets de soporte'],
      ]),
      spacer(2),

      // 2. MODULOS
      h1('2. Módulos del sistema'),

      h2('2.1  Dashboard'),
      p('Pantalla de inicio con indicadores del día y accesos rápidos al resto de la plataforma.'),
      bullet('KPIs en tiempo real: ventas del día en COP, número de transacciones, documentos POS emitidos, facturas electrónicas aprobadas por la DIAN'),
      bullet('Widget de próximos vencimientos tributarios (próximos 30 días) con semáforo de urgencia: BAJA / MEDIA / ALTA / CRÍTICA / VENCIDA'),
      bullet('Accesos rápidos a: Nueva venta POS, Historial de facturas, Proyecciones y Mis Consultas'),
      bullet('Saludo personalizado con el nombre de la empresa'),
      spacer(),

      h2('2.2  Punto de Venta (POS)'),
      p('Pantalla de emisión de documentos en tiempo real, dividida en catálogo de productos (izquierda) y carrito de compra (derecha).'),
      h3('Tipo de documento — selector prominente'),
      bullet('Documento POS: ticket de caja, no requiere datos de cliente, apto para consumidor final'),
      bullet('Factura Electrónica (FE): requiere NIT y nombre del cliente; se transmite a la DIAN vía MATIAS'),
      h3('Catálogo de productos'),
      bullet('Búsqueda en tiempo real por nombre o código'),
      bullet('Tarjetas de producto con código, nombre, precio COP e IVA aplicable'),
      h3('Carrito'),
      bullet('Ajuste de cantidad por producto (+/−) y eliminación individual'),
      bullet('Cálculo automático: subtotal, IVA desglosado y total'),
      bullet('Selector de cajero con gestión por localStorage: crear, seleccionar y eliminar cajeros (persistente por dispositivo)'),
      bullet('Selector de medio de pago: Efectivo, Transferencia, Tarjeta débito, Tarjeta crédito, Bono/Vale'),
      h3('Panel de cliente (para FE)'),
      bullet('Modo Consumidor Final (sin datos) o Identificar cliente'),
      bullet('Búsqueda de clientes existentes por nombre o NIT con autocompletado (debounce 300ms)'),
      bullet('Campos manuales: tipo de documento, NIT/identificación, nombre/razón social, email y dirección'),
      h3('Emisión'),
      bullet('Botón diferenciado por tipo: "Emitir Documento POS" o "Emitir Factura FE"'),
      bullet('Retroalimentación inmediata: número de documento emitido, estado DIAN, enlace a PDF si disponible'),
      spacer(),

      h2('2.3  Historial de Facturas'),
      p('Listado de todos los documentos emitidos por la empresa con filtros combinables.'),
      bullet('Filtros: tipo (POS / FE / Nota Crédito / Nota Débito), estado, rango de fechas'),
      bullet('Tabla con: número de documento, tipo, cliente, total COP, estado y fecha'),
      bullet('Expansión de fila para ver: CUFE, cajero, subtotal, IVA'),
      bullet('Enlace directo al PDF cuando está disponible'),
      spacer(),

      h2('2.4  Catálogo de Productos'),
      p('CRUD completo del inventario de productos o servicios disponibles para facturar.'),
      bullet('Campos: código, nombre, descripción, precio COP, IVA (%), unidad de medida, estado activo/inactivo'),
      bullet('Búsqueda en tiempo real desde la lista'),
      bullet('Modal de creación y edición con validación de campos obligatorios'),
      bullet('Eliminación con confirmación'),
      spacer(),

      h2('2.5  Directorio de Clientes'),
      p('Base de datos de clientes para facturación electrónica, con información fiscal completa.'),
      bullet('Campos: nombre/razón social, NIT/documento, teléfono, email, dirección'),
      bullet('Datos fiscales: tipo de organización (Natural / Jurídica) y régimen fiscal (Responsable de IVA / No responsable)'),
      bullet('Búsqueda por nombre o NIT'),
      bullet('Modal de creación y edición, eliminación con confirmación'),
      spacer(),

      h2('2.6  Control de Gastos'),
      p('Módulo contable para registrar y analizar todos los egresos de la empresa.'),
      h3('Registro de gastos'),
      bullet('14 categorías colombianas: Nómina, Arrendamiento, Servicios públicos, Mercancía, Materia prima, Servicios profesionales, Publicidad, Mantenimiento, Viáticos, Impuestos, Papelería, Tecnología, Financiero, Otros'),
      bullet('Proveedor/acreedor, descripción, monto sin IVA e IVA por separado (deducible)'),
      bullet('Tipo de comprobante: Factura, Recibo, Cuenta de cobro, Nómina, Contrato, Otro'),
      bullet('Número de comprobante, fecha, medio de pago (Efectivo, Transferencia, Tarjeta, Cheque, Otro)'),
      bullet('Campo de notas adicionales y estado "ya pagado"'),
      h3('Visualización'),
      bullet('KPIs del período: total gastos, IVA pagado (deducible), mayor categoría'),
      bullet('Vista Listado: tabla paginada (50 por página) con filtros por fechas y categoría'),
      bullet('Vista Por Categoría: barras proporcionales con % del total por categoría'),
      spacer(),

      h2('2.7  Estadísticas e Inteligencia Financiera'),
      p('Panel avanzado de análisis de ventas, gastos y flujo de caja con agente de IA consultivo.'),
      h3('Gráficas de ventas'),
      bullet('Resumen: total ingresos, número de facturas, IVA cobrado, base gravable, ticket promedio, documentos POS vs FE'),
      bullet('Tendencia de ingresos: gráfica de línea/barras agrupable por día, semana o mes'),
      bullet('Top 5 clientes y Top 5 productos por ingresos'),
      h3('Análisis de gastos'),
      bullet('Total egresos del período, IVA pagado, comparativa ingresos vs gastos'),
      bullet('Flujo de caja: gráfica combinada ingresos-gastos-utilidad por período'),
      bullet('Distribución de gastos por categoría: pie chart con 14 segmentos'),
      h3('Agente IA'),
      bullet('Chat integrado con sugerencias de preguntas predefinidas'),
      bullet('Responde en markdown con tablas, listas y análisis basados en los datos del período seleccionado'),
      h3('Reportes imprimibles'),
      bullet('Reporte sencillo: informe de gestión con tablas de resumen financiero, gastos por categoría, top clientes, top productos'),
      bullet('Análisis con IA: reporte narrativo generado por IA, listo para imprimir/PDF'),
      bullet('Ambos incluyen encabezado con nombre de empresa, NIT y período'),
      spacer(),

      h2('2.8  Proyecciones Tributarias'),
      p('Herramienta de planeación fiscal que estima las obligaciones tributarias del año en curso basándose en los ingresos reales registrados.'),
      bullet('Régimen Renta Ordinaria: cálculo anual con tarifas progresivas según tabla de personas jurídicas'),
      bullet('Régimen SIMPLE: cálculo bimestral y cuatrimestral con tarifas por actividad económica y rangos en UVT'),
      bullet('Actividades SIMPLE: Comercio (1.8–5.4%), Servicios (4.9–8.3%), Profesional (5.5–14.5%), Comidas (3.4–6.0%)'),
      bullet('Calendarios de vencimiento: IVA bimestral, IVA cuatrimestral (SIMPLE) e impuesto de renta anual'),
      bullet('Widget en el Dashboard con alertas de urgencia para los próximos 30 días'),
      spacer(),

      h2('2.9  Nómina'),
      p('Módulo de gestión de empleados y liquidación mensual con cálculo automático según normativa colombiana 2025.'),
      h3('Registro de empleados'),
      bullet('Datos: nombre, apellido, tipo y número de documento (CC / CE / PA / TI)'),
      bullet('Cargo, salario base, tipo de contrato (Indefinido, Fijo, Obra y labor, Prestación de servicios)'),
      bullet('Nivel de riesgo ARL (I al V, tasa desde 0.522% hasta 6.960%)'),
      h3('Liquidación mensual automática'),
      bullet('Devengos: salario proporcional (días trabajados / 30), auxilio de transporte (salarios hasta 2 SMLV), horas extras, bonificaciones'),
      bullet('Deducciones empleado: salud (4%), pensión (4%), retención en la fuente, otros descuentos'),
      bullet('Aportes empleador: salud (8.5%), pensión (12%), ARL, SENA (2%), ICBF (3%), Caja de compensación (4%)'),
      bullet('Provisiones: prima (1/12), cesantías (1/12), intereses sobre cesantías (1.2%/12), vacaciones (1/24)'),
      bullet('SMLV 2025: $1,423,500 — Auxilio de transporte 2025: $200,000'),
      h3('Colilla de pago'),
      bullet('Documento imprimible por empleado con desglose completo de devengos, deducciones, neto a pagar y aportes patronales'),
      spacer(),

      h2('2.10  Consultas con Expertos (Sistema de Tickets)'),
      p('Canal de soporte entre empresas y profesionales contables, legales o tributarios.'),
      bullet('Crear consulta: tipo (Contabilidad / Legal / Tributario / Nómina / Otro), urgencia (Baja / Media / Alta), asunto y descripción'),
      bullet('Adjuntar archivos: imágenes, PDFs, documentos Word, hojas de cálculo (hasta 10 MB por archivo)'),
      bullet('Ver historial de consultas con estado actual y respuestas del profesional'),
      bullet('Estados: NUEVO → EN PROCESO → EN REVISIÓN → COMPLETADO'),
      spacer(),

      h2('2.11  Panel Profesional (Vista Contadores / Asesores)'),
      p('Interfaz exclusiva para usuarios con rol PROFESIONAL que gestionan tickets de múltiples empresas clientes.'),
      bullet('Vista Kanban con 4 columnas: Nuevos, En proceso, En revisión, Completados'),
      bullet('Filtros por tipo de consulta y urgencia'),
      bullet('Mover ticket entre columnas con un solo clic (actualiza estado en tiempo real)'),
      bullet('Ver detalle completo: consulta, archivos adjuntos, empresa cliente'),
      bullet('Pista de auditoría: cada cambio de estado queda registrado con timestamp y usuario'),
      spacer(2),

      // 3. AUTH
      h1('3. Autenticación y seguridad'),
      bullet('Registro de empresa: nombre, NIT, email, contraseña. Crea usuario en Supabase Auth + registro en tabla empresas'),
      bullet('Login con JWT personalizado. Token incluye: empresa_id, email, nombre, rol'),
      bullet('Roles: EMPRESA (acceso a su propia data) y PROFESIONAL (acceso multi-empresa vía tickets)'),
      bullet('Row Level Security (RLS) en Supabase: cada tabla filtra automáticamente por empresa_id del token'),
      bullet('Service Key en el backend para operaciones administrativas (bypassa RLS de forma controlada)'),
      bullet('Retrocompatibilidad: tokens sin campo rol funcionan como EMPRESA por defecto'),
      spacer(2),

      // 4. DIAN
      h1('4. Integración DIAN'),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2700, 6660],
        rows: [
          headerRow(['Aspecto', 'Detalle'], [2700, 6660]),
          dataRow(['Middleware', 'MATIAS (Middleware de Autorización de Transacciones e Intercambio de Aplicaciones y Servicios)'], [2700, 6660], false),
          dataRow(['Documentos soportados', 'Documento POS, Factura Electrónica (FE), Nota Crédito, Nota Débito'], [2700, 6660], true),
          dataRow(['Estado productivo', 'APROBADA — validada y aceptada por la DIAN'], [2700, 6660], false),
          dataRow(['Estado prueba', 'EMITIDA_LOCAL — generada sin MATIAS configurado (modo demo)'], [2700, 6660], true),
          dataRow(['CUFE', 'Código Único de Factura Electrónica, almacenado y visible en historial'], [2700, 6660], false),
          dataRow(['PDF', 'Generado por MATIAS, enlace directo desde la app'], [2700, 6660], true),
        ],
      }),
      spacer(2),

      // 5. ESTADO
      h1('5. Estado actual del desarrollo'),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [4680, 2340, 2340],
        rows: [
          headerRow(['Módulo', 'Backend', 'Frontend'], [4680, 2340, 2340]),
          dataRow(['Autenticación (registro + login)', 'Completo', 'Completo'], [4680, 2340, 2340], false),
          dataRow(['Dashboard con KPIs y vencimientos', 'Completo', 'Completo'], [4680, 2340, 2340], true),
          dataRow(['POS — Documento y Factura Electrónica', 'Completo', 'Completo'], [4680, 2340, 2340], false),
          dataRow(['Historial de facturas con filtros', 'Completo', 'Completo'], [4680, 2340, 2340], true),
          dataRow(['Catálogo de productos (CRUD)', 'Completo', 'Completo'], [4680, 2340, 2340], false),
          dataRow(['Directorio de clientes (CRUD)', 'Completo', 'Completo'], [4680, 2340, 2340], true),
          dataRow(['Control de gastos (CRUD + análisis)', 'Completo', 'Completo'], [4680, 2340, 2340], false),
          dataRow(['Estadísticas + agente IA + reportes', 'Completo', 'Completo'], [4680, 2340, 2340], true),
          dataRow(['Proyecciones tributarias (SIMPLE/Ordinario)', 'Completo', 'Completo'], [4680, 2340, 2340], false),
          dataRow(['Ómina (empleados + liquidación)', 'Completo', 'Completo'], [4680, 2340, 2340], true),
          dataRow(['Consultas / sistema de tickets', 'Completo', 'Completo'], [4680, 2340, 2340], false),
          dataRow(['Panel profesional (Kanban multi-empresa)', 'Completo', 'Completo'], [4680, 2340, 2340], true),
        ],
      }),
      spacer(2),

      // 6. PENDIENTE
      h1('6. Aspectos pendientes / en revisión'),
      bullet('Configuración productiva de MATIAS: actualmente en modo prueba (EMITIDA_LOCAL). Se requiere configurar NIT, resolución de facturación y certificado digital en MATIAS para emitir con estado APROBADA'),
      bullet('Google OAuth: infraestructura preparada (AuthCallback), pendiente de activación'),
      bullet('Registro y login para usuarios tipo PROFESIONAL: actualmente se crea manualmente en base de datos'),
      bullet('Descarga de reportes como archivo .docx o .pdf desde la interfaz'),
      bullet('Envío de colillas de nómina por email al empleado'),
      spacer(2),

      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 480 },
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'D1D5DB' } },
        children: [
          new TextRun({ text: 'AppDian — Documento confidencial para revisión interna', size: 18, color: MUTED, font: 'Arial' }),
        ],
      }),
    ],
  }],
});

const outPath = path.join(__dirname, 'AppDian_Resumen_Funcional.docx');
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(outPath, buffer);
  console.log('Documento generado: ' + outPath);
});
