-- =============================================================
-- AppDian -- Gastos genéricos de demo (fechas: junio-julio 2026)
-- Ejecutar en Supabase SQL Editor
-- =============================================================

DO $$
DECLARE
  eid UUID := (SELECT id FROM empresas LIMIT 1);
BEGIN

INSERT INTO gastos (empresa_id, categoria, subcategoria, proveedor, descripcion, monto, iva, total, tipo_comprobante, numero_comprobante, fecha, medio_pago, pagado) VALUES

-- ARRENDAMIENTO
(eid, 'ARRENDAMIENTO', 'Local comercial',  'Inversiones Ospina SAS',  'Arriendo local mes de junio 2026',           2500000,      0, 2500000, 'RECIBO',       'RC-2026-061',      '2026-06-01', 'TRANSFERENCIA',    true),
(eid, 'ARRENDAMIENTO', 'Parqueadero',      'Parqueadero El Centro',   'Parqueadero mensual junio 2026',              180000,      0,  180000, 'RECIBO',       'RC-0441',          '2026-06-01', 'EFECTIVO',         true),

-- SERVICIOS PUBLICOS
(eid, 'SERVICIOS_PUBLICOS', 'Energía eléctrica', 'EPM',            'Energía eléctrica junio 2026',                 320000,      0,  320000, 'FACTURA',      'EPM-9994521',      '2026-06-10', 'TRANSFERENCIA',    true),
(eid, 'SERVICIOS_PUBLICOS', 'Internet',          'Claro Colombia', 'Plan internet fibra 300 Mbps - junio',          89900,  14384,  104284, 'FACTURA',      'CLR-20260610',     '2026-06-10', 'TRANSFERENCIA',    true),
(eid, 'SERVICIOS_PUBLICOS', 'Agua',              'Acueducto Bogotá','Acueducto y alcantarillado junio',             95000,      0,   95000, 'FACTURA',      'ACU-562231',       '2026-06-12', 'TRANSFERENCIA',    true),
(eid, 'SERVICIOS_PUBLICOS', 'Telefonía',         'Movistar',       'Plan empresarial telefonía junio',              75000,  12000,   87000, 'FACTURA',      'MOV-20260601',     '2026-06-05', 'TRANSFERENCIA',    true),

-- NOMINA
(eid, 'NOMINA', 'Salario',           NULL, 'Nómina auxiliar contable - junio 2026',          1423500,      0, 1423500, 'NOMINA', 'NOM-2026-06-01', '2026-06-30', 'TRANSFERENCIA', true),
(eid, 'NOMINA', 'Seguridad social',  NULL, 'Aportes SENA/ICBF/CC junio 2026',                 296000,      0,  296000, 'NOMINA', 'SENA-2026-06',   '2026-06-30', 'TRANSFERENCIA', true),
(eid, 'NOMINA', 'Salario',           NULL, 'Nómina vendedor - junio 2026',                   1160000,      0, 1160000, 'NOMINA', 'NOM-2026-06-02', '2026-06-30', 'TRANSFERENCIA', true),

-- MERCANCIA
(eid, 'MERCANCIA', 'Compra inventario', 'Distribuidora Colanta',    'Compra productos lácteos para reventa',        850000,  80750,  930750, 'FACTURA', 'COL-20260605', '2026-06-05', 'TRANSFERENCIA', true),
(eid, 'MERCANCIA', 'Compra inventario', 'Casa Luker',               'Compra chocolates y confitería',               420000,  39900,  459900, 'FACTURA', 'LUK-112255',   '2026-06-08', 'CHEQUE',        true),
(eid, 'MERCANCIA', 'Compra inventario', 'Distribuidora El Maizal',  'Granos y abarrotes junio',                     670000,      0,  670000, 'FACTURA', 'MAI-20260612', '2026-06-12', 'EFECTIVO',      true),

-- SERVICIOS PROFESIONALES
(eid, 'SERVICIOS_PROF', 'Contador',     'Contabilidad García & Asoc', 'Honorarios contables junio 2026',            350000,  66500,  416500, 'CUENTA_COBRO', 'CC-2026-06',  '2026-06-30', 'TRANSFERENCIA', true),
(eid, 'SERVICIOS_PROF', 'Asesoría legal','Abogados Martínez Ltda',    'Revisión contrato arrendamiento',            200000,  38000,  238000, 'CUENTA_COBRO', 'CC-MAR-002',  '2026-06-20', 'TRANSFERENCIA', true),

-- PUBLICIDAD
(eid, 'PUBLICIDAD', 'Redes sociales', 'Meta Ads',          'Pauta Instagram y Facebook junio',                    300000,  57000,  357000, 'FACTURA', 'META-20260601', '2026-06-01', 'TARJETA', true),
(eid, 'PUBLICIDAD', 'Impresiones',    'Litografía Moderna','Volantes y pendones promocionales',                   145000,  27550,  172550, 'FACTURA', 'LIT-0891',     '2026-06-15', 'EFECTIVO', true),

-- TECNOLOGIA
(eid, 'TECNOLOGIA', 'Software', 'Google Workspace', 'Plan Google Workspace Business junio',                        45000,   8550,   53550, 'FACTURA', 'GWS-20260601',   '2026-06-01', 'TARJETA', true),
(eid, 'TECNOLOGIA', 'Software', 'Adobe',            'Adobe Creative Cloud junio',                                  89000,  16910,  105910, 'FACTURA', 'ADOBE-20260601', '2026-06-01', 'TARJETA', true),

-- MANTENIMIENTO
(eid, 'MANTENIMIENTO', 'Equipos',        'Servi-Frío Colombia',     'Mantenimiento preventivo neveras',            280000,  53200,  333200, 'FACTURA', 'SF-2026-121', '2026-06-18', 'EFECTIVO', true),
(eid, 'MANTENIMIENTO', 'Instalaciones',  'Electricista Juan Moreno','Reparación instalación eléctrica',            120000,      0,  120000, 'RECIBO',  'RC-JM-002',   '2026-06-22', 'EFECTIVO', true),

-- PAPELERIA
(eid, 'PAPELERIA', 'Útiles de oficina', 'Papelería El Estudiante', 'Útiles de oficina y papelería junio',          85000,  16150,  101150, 'FACTURA', 'PE-20260614', '2026-06-14', 'EFECTIVO', true),

-- IMPUESTOS
(eid, 'IMPUESTOS', 'ICA', 'Secretaría de Hacienda Bogotá', 'Impuesto ICA segundo bimestre 2026',                 185000,      0,  185000, 'RECIBO', 'ICA-2026-B2', '2026-06-15', 'TRANSFERENCIA', true),

-- VIATICOS
(eid, 'VIATICOS', 'Transporte', 'Varios', 'Transporte y movilidad equipo comercial junio',                        95000,      0,   95000, 'RECIBO', 'VIA-2026-06', '2026-06-30', 'EFECTIVO', true),

-- FINANCIERO
(eid, 'FINANCIERO', 'Comisiones bancarias', 'Bancolombia', 'Cuota manejo cuenta empresarial junio',               28000,   5320,   33320, 'EXTRACTO', 'BCO-2026-06', '2026-06-30', 'TRANSFERENCIA', true),

-- JULIO (en rango actual)
(eid, 'MERCANCIA',         'Compra inventario', 'Distribuidora Colanta', 'Pedido semanal productos julio',        420000,  39900,  459900, 'FACTURA', 'COL-20260701', '2026-07-01', 'TRANSFERENCIA', true),
(eid, 'SERVICIOS_PUBLICOS','Internet',          'Claro Colombia',        'Plan internet julio',                    89900,  14384,  104284, 'FACTURA', 'CLR-20260701', '2026-07-01', 'TRANSFERENCIA', true),
(eid, 'OTROS',             'Aseo y cafetería',  'Tienda Punto Limpio',   'Productos de aseo y cafetería',          65000,      0,   65000, 'FACTURA', 'PL-0361',      '2026-07-02', 'EFECTIVO',      true);

RAISE NOTICE 'Gastos demo insertados para empresa: %', eid;
END $$;
