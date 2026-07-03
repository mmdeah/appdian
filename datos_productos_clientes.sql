-- ============================================================
-- DATOS DE PRUEBA: Productos y Clientes
-- Reemplaza 'TU_EMPRESA_ID' con el UUID de tu empresa en Supabase
-- (puedes verlo en la tabla `empresas`)
-- Ejecutar en Supabase → SQL Editor → Run
-- ============================================================

-- ⚠️ IMPORTANTE: Cambia este valor por el ID real de tu empresa
DO $$
DECLARE
  eid uuid := (SELECT id FROM empresas LIMIT 1);
BEGIN

-- ── Productos ─────────────────────────────────────────────────────────────────
INSERT INTO productos (empresa_id, codigo, descripcion, precio_unitario, iva_porcentaje, unidad_medida, activo)
VALUES
  (eid, 'PROD-001', 'Servicio de Contabilidad Mensual',    850000,  0, 'SRV', true),
  (eid, 'PROD-002', 'Declaración de Renta Persona Natural', 320000,  0, 'SRV', true),
  (eid, 'PROD-003', 'Declaración de Renta Persona Jurídica',680000,  0, 'SRV', true),
  (eid, 'PROD-004', 'Nómina Mensual (hasta 10 empleados)',  450000,  0, 'SRV', true),
  (eid, 'PROD-005', 'Revisoría Fiscal Mensual',            1200000,  0, 'SRV', true),
  (eid, 'PROD-006', 'Software Contable - Licencia Anual',  1500000, 19, 'UND', true),
  (eid, 'PROD-007', 'Capacitación Tributaria (4 horas)',    280000, 19, 'SRV', true),
  (eid, 'PROD-008', 'Auditoría Financiera Básica',         2500000,  0, 'SRV', true),
  (eid, 'PROD-009', 'Registro Mercantil y Trámites DIAN',  190000,  0, 'SRV', true),
  (eid, 'PROD-010', 'Asesoría Legal Tributaria (hora)',     250000,  0, 'HR',  true),
  (eid, 'PROD-011', 'Certificado de Ingresos y Retenciones',85000,   0, 'UND', true),
  (eid, 'PROD-012', 'Conciliación Bancaria Mensual',        320000,  0, 'SRV', true),
  (eid, 'PROD-013', 'Elaboración Estados Financieros',      750000,  0, 'SRV', true),
  (eid, 'PROD-014', 'Consultoría NIIF (hora)',              350000, 19, 'HR',  true),
  (eid, 'PROD-015', 'Plan Premium - Todo Incluido',        2800000,  0, 'MES', true)
ON CONFLICT (empresa_id, codigo) DO NOTHING;

-- ── Clientes ──────────────────────────────────────────────────────────────────
INSERT INTO clientes (empresa_id, nombre, nit, email, telefono, direccion, tipo_persona, activo)
VALUES
  (eid, 'Inversiones La Montaña S.A.S',   '900123456-1', 'contabilidad@lamontana.co',  '3001234567', 'Cra 15 # 85-32, Bogotá',     'JURIDICA',  true),
  (eid, 'Comercializadora Del Valle Ltda', '800456789-2', 'admin@delvalleltda.com',     '3112345678', 'Cl 5 # 22-45, Cali',          'JURIDICA',  true),
  (eid, 'Constructora Horizonte S.A',      '860789012-3', 'gerencia@horizonte.com.co',  '3223456789', 'Av El Dorado # 69-76, Bogotá','JURIDICA',  true),
  (eid, 'Restaurante El Buen Sabor',       '901234567-4', 'buensabor@gmail.com',        '3134567890', 'Cl 93 # 11-27, Bogotá',       'JURIDICA',  true),
  (eid, 'Clínica San Rafael SAS',          '830345678-5', 'facturacion@sanrafael.med',  '3245678901', 'Cra 5 # 10-00, Medellín',     'JURIDICA',  true),
  (eid, 'Transporte Rápido Express S.A.S', '900567890-6', 'contab@rapidoexpress.co',    '3056789012', 'Km 3 Vía Occidente, Cali',    'JURIDICA',  true),
  (eid, 'Agropecuaria Los Llanos Ltda',    '891234560-7', 'admin@losllanos.agro',       '3167890123', 'Vda El Oasis, Villavicencio', 'JURIDICA',  true),
  (eid, 'Tech Solutions Colombia S.A.S',   '900890123-8', 'billing@techsol.co',         '3178901234', 'Cra 43A # 1-50, Medellín',    'JURIDICA',  true),
  (eid, 'María Fernanda López Rodríguez',  '52345678-9',  'mflopez@personal.com',       '3189012345', 'Cl 134 # 9-45, Bogotá',       'NATURAL',   true),
  (eid, 'Carlos Andrés Martínez Suárez',   '79012345-0',  'ca.martinez@gmail.com',      '3190123456', 'Cra 70 # 44-55, Medellín',    'NATURAL',   true)
ON CONFLICT DO NOTHING;

END $$;

-- ============================================================
-- VERIFICACIÓN
-- ============================================================
SELECT 'Productos insertados:' as info, COUNT(*) as total FROM productos;
SELECT 'Clientes insertados:' as info, COUNT(*) as total FROM clientes;
