-- AppDian — Schema de base de datos
-- Ejecutar en Supabase > SQL Editor

-- =============================================
-- TABLA: empresas
-- Una fila por empresa cliente de AppDian
-- =============================================
CREATE TABLE IF NOT EXISTS empresas (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre          TEXT NOT NULL,
  nit             TEXT NOT NULL UNIQUE,
  email           TEXT NOT NULL UNIQUE,
  password        TEXT NOT NULL,
  direccion       TEXT,
  telefono        TEXT,
  -- Configuración MATIAS API (se llena cuando el cliente se habilita)
  matias_email    TEXT,
  matias_password TEXT,
  -- Configuración DIAN
  resolucion_numero  TEXT,
  resolucion_prefijo TEXT,
  resolucion_desde   BIGINT,
  resolucion_hasta   BIGINT,
  resolucion_fecha_desde DATE,
  resolucion_fecha_hasta DATE,
  -- Plan AppDian
  plan            TEXT DEFAULT 'esencial' CHECK (plan IN ('esencial', 'inicio', 'avanzado')),
  activo          BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TABLA: productos
-- Catálogo de productos/servicios por empresa
-- =============================================
CREATE TABLE IF NOT EXISTS productos (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id      UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  codigo          TEXT NOT NULL,
  nombre          TEXT NOT NULL,
  descripcion     TEXT,
  precio          NUMERIC(12,2) NOT NULL,
  iva_porcentaje  NUMERIC(5,2) DEFAULT 19,
  unidad          TEXT DEFAULT 'UND',
  activo          BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(empresa_id, codigo)
);

-- =============================================
-- TABLA: clientes
-- Terceros/clientes por empresa
-- =============================================
CREATE TABLE IF NOT EXISTS clientes (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id           UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nombre               TEXT NOT NULL,
  nit                  TEXT NOT NULL,
  email                TEXT,
  telefono             TEXT,
  direccion            TEXT,
  ciudad_id            INTEGER DEFAULT 836,
  tipo_doc_id          INTEGER DEFAULT 3,
  tipo_organizacion_id INTEGER DEFAULT 2,
  regimen_fiscal_id    INTEGER DEFAULT 2,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(empresa_id, nit)
);

-- =============================================
-- TABLA: facturas
-- Registro de todos los documentos emitidos
-- =============================================
CREATE TABLE IF NOT EXISTS facturas (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id       UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  tipo             TEXT NOT NULL CHECK (tipo IN ('POS', 'FE', 'NC', 'ND')),
  numero_documento BIGINT NOT NULL,
  -- Datos del cliente en el momento de la venta
  cliente_nombre   TEXT,
  cliente_nit      TEXT,
  cliente_email    TEXT,
  -- Totales
  subtotal         NUMERIC(12,2) NOT NULL,
  iva              NUMERIC(12,2) DEFAULT 0,
  total            NUMERIC(12,2) NOT NULL,
  medio_pago_id    INTEGER DEFAULT 10,
  -- POS específico
  cajero           TEXT,
  terminal         TEXT,
  -- Estado DIAN
  estado           TEXT DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'APROBADA', 'RECHAZADA', 'ERROR')),
  cufe             TEXT,
  matias_id        INTEGER,
  pdf_url          TEXT,
  xml_url          TEXT,
  respuesta_dian   JSONB,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(empresa_id, tipo, numero_documento)
);

-- =============================================
-- TABLA: items_factura
-- Líneas de detalle de cada factura
-- =============================================
CREATE TABLE IF NOT EXISTS items_factura (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  factura_id       UUID NOT NULL REFERENCES facturas(id) ON DELETE CASCADE,
  producto_codigo  TEXT NOT NULL,
  descripcion      TEXT NOT NULL,
  cantidad         NUMERIC(12,3) NOT NULL,
  precio_unitario  NUMERIC(12,2) NOT NULL,
  iva_porcentaje   NUMERIC(5,2) DEFAULT 0,
  subtotal         NUMERIC(12,2) NOT NULL
);

-- =============================================
-- ÍNDICES para mejorar performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_facturas_empresa_fecha ON facturas(empresa_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_facturas_estado ON facturas(empresa_id, estado);
CREATE INDEX IF NOT EXISTS idx_productos_empresa ON productos(empresa_id, activo);
CREATE INDEX IF NOT EXISTS idx_clientes_empresa ON clientes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_items_factura ON items_factura(factura_id);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- Cada empresa solo ve sus propios datos
-- (Opcional si manejas auth desde el backend)
-- =============================================
ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE facturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE items_factura ENABLE ROW LEVEL SECURITY;
