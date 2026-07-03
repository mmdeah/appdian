-- ============================================================
-- DATOS DE PRUEBA: Productos y Clientes
-- Ejecutar en Supabase → SQL Editor → Run
-- Detecta automáticamente el ID de tu empresa
-- ============================================================
DO $$
DECLARE
  eid uuid := (SELECT id FROM empresas LIMIT 1);
BEGIN

-- ── Productos ─────────────────────────────────────────────────────────────────
INSERT INTO productos (empresa_id, codigo, nombre, descripcion, precio, iva_porcentaje, unidad, activo)
VALUES
  (eid, 'PROD-001', 'Contabilidad Mensual',           'Servicio de contabilidad mensual para pymes',           850000,  0, 'SRV', true),
  (eid, 'PROD-002', 'Declaración Renta Persona Natural','Elaboración y presentación declaración de renta PN',  320000,  0, 'SRV', true),
  (eid, 'PROD-003', 'Declaración Renta Persona Jurídica','Elaboración y presentación declaración de renta PJ', 680000,  0, 'SRV', true),
  (eid, 'PROD-004', 'Nómina Mensual hasta 10 empleados','Liquidación y pago de nómina mensual',                450000,  0, 'SRV', true),
  (eid, 'PROD-005', 'Revisoría Fiscal Mensual',        'Servicio de revisoría fiscal mensual',                1200000,  0, 'SRV', true),
  (eid, 'PROD-006', 'Software Contable Licencia Anual','Licencia anual plataforma contable en la nube',       1500000, 19, 'UND', true),
  (eid, 'PROD-007', 'Capacitación Tributaria 4 horas', 'Taller tributario para equipo directivo',              280000, 19, 'SRV', true),
  (eid, 'PROD-008', 'Auditoría Financiera Básica',     'Revisión y dictamen estados financieros',             2500000,  0, 'SRV', true),
  (eid, 'PROD-009', 'Trámites DIAN y Registro Mercantil','Gestión de trámites ante entidades',                190000,  0, 'SRV', true),
  (eid, 'PROD-010', 'Asesoría Legal Tributaria hora',  'Consulta legal tributaria por hora',                   250000,  0, 'HR',  true),
  (eid, 'PROD-011', 'Certificado Ingresos y Retenciones','Elaboración certificado para empleados',              85000,  0, 'UND', true),
  (eid, 'PROD-012', 'Conciliación Bancaria Mensual',   'Conciliación de extractos bancarios',                  320000,  0, 'SRV', true),
  (eid, 'PROD-013', 'Estados Financieros',             'Elaboración balance general y PyG',                    750000,  0, 'SRV', true),
  (eid, 'PROD-014', 'Consultoría NIIF hora',           'Asesoría en normas internacionales de información financiera', 350000, 19, 'HR', true),
  (eid, 'PROD-015', 'Plan Premium Todo Incluido',      'Paquete completo de servicios contables y legales',   2800000,  0, 'MES', true)
ON CONFLICT (empresa_id, codigo) DO NOTHING;

-- ── Clientes ──────────────────────────────────────────────────────────────────
INSERT INTO clientes (empresa_id, nombre, nit, email, telefono, direccion)
VALUES
  (eid, 'Inversiones La Montaña S.A.S',    '900123456-1', 'contabilidad@lamontana.co',  '3001234567', 'Cra 15 # 85-32, Bogotá'),
  (eid, 'Comercializadora Del Valle Ltda',  '800456789-2', 'admin@delvalleltda.com',     '3112345678', 'Cl 5 # 22-45, Cali'),
  (eid, 'Constructora Horizonte S.A',       '860789012-3', 'gerencia@horizonte.com.co',  '3223456789', 'Av El Dorado # 69-76, Bogotá'),
  (eid, 'Restaurante El Buen Sabor',        '901234567-4', 'buensabor@gmail.com',        '3134567890', 'Cl 93 # 11-27, Bogotá'),
  (eid, 'Clínica San Rafael SAS',           '830345678-5', 'facturacion@sanrafael.med',  '3245678901', 'Cra 5 # 10-00, Medellín'),
  (eid, 'Transporte Rápido Express S.A.S',  '900567890-6', 'contab@rapidoexpress.co',    '3056789012', 'Km 3 Vía Occidente, Cali'),
  (eid, 'Agropecuaria Los Llanos Ltda',     '891234560-7', 'admin@losllanos.agro',       '3167890123', 'Vda El Oasis, Villavicencio'),
  (eid, 'Tech Solutions Colombia S.A.S',    '900890123-8', 'billing@techsol.co',         '3178901234', 'Cra 43A # 1-50, Medellín'),
  (eid, 'María Fernanda López Rodríguez',   '52345678-9',  'mflopez@personal.com',       '3189012345', 'Cl 134 # 9-45, Bogotá'),
  (eid, 'Carlos Andrés Martínez Suárez',    '79012345-0',  'ca.martinez@gmail.com',      '3190123456', 'Cra 70 # 44-55, Medellín')
ON CONFLICT DO NOTHING;

END $$;

-- Verificación
SELECT 'Productos:' as tabla, COUNT(*) as total FROM productos
UNION ALL
SELECT 'Clientes:', COUNT(*) FROM clientes;
