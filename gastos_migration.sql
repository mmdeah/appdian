-- =============================================================
-- AppDian — Migración: Módulo de Gastos
-- Ejecutar en Supabase SQL Editor
-- =============================================================

-- Tabla principal de gastos
CREATE TABLE IF NOT EXISTS gastos (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id     UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,

  -- Clasificación
  categoria      TEXT NOT NULL, -- NOMINA, ARRENDAMIENTO, SERVICIOS_PUBLICOS, etc.
  subcategoria   TEXT,

  -- Proveedor / descripción
  proveedor      TEXT,
  descripcion    TEXT NOT NULL,

  -- Valores
  monto          NUMERIC(14,2) NOT NULL DEFAULT 0,  -- valor antes de IVA
  iva            NUMERIC(14,2) NOT NULL DEFAULT 0,
  total          NUMERIC(14,2) GENERATED ALWAYS AS (monto + iva) STORED,

  -- Comprobante
  tipo_comprobante  TEXT DEFAULT 'FACTURA', -- FACTURA | RECIBO | CUENTA_COBRO | NOMINA | OTRO
  numero_comprobante TEXT,
  fecha          DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Pago
  medio_pago     TEXT DEFAULT 'TRANSFERENCIA', -- EFECTIVO | TRANSFERENCIA | TARJETA | CHEQUE | OTRO
  pagado         BOOLEAN NOT NULL DEFAULT true,

  -- Notas adicionales
  notas          TEXT,

  -- Recurrencia (futuro)
  es_recurrente  BOOLEAN DEFAULT false,

  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_gastos_empresa    ON gastos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_gastos_fecha      ON gastos(fecha);
CREATE INDEX IF NOT EXISTS idx_gastos_categoria  ON gastos(empresa_id, categoria);

-- RLS
ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;
-- Nota: el backend usa service key que bypasea RLS, igual ponemos la policy
CREATE POLICY "empresa_gastos" ON gastos
  USING (empresa_id = (SELECT id FROM empresas WHERE email = auth.email()));

-- Agregar columna estado EMITIDA_LOCAL a facturas (para modo prueba sin DIAN)
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS modo_prueba BOOLEAN DEFAULT false;
-- El estado EMITIDA_LOCAL ya es un valor texto, no necesita ALTER TYPE si estado es TEXT

-- Trigger updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_gastos_updated_at ON gastos;
CREATE TRIGGER trg_gastos_updated_at
  BEFORE UPDATE ON gastos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================
-- Categorías de gastos predefinidas (referencia)
-- NOMINA             → Sueldos, prestaciones, aportes
-- ARRENDAMIENTO      → Local, oficina, bodega
-- SERVICIOS_PUBLICOS → Agua, luz, gas, internet, teléfono
-- MATERIA_PRIMA      → Insumos de producción
-- MERCANCIA          → Inventario para reventa
-- SERVICIOS_PROF     → Contador, abogado, asesor
-- PUBLICIDAD         → Marketing, redes, impresos
-- MANTENIMIENTO      → Reparaciones, equipos
-- VIATICOS           → Transporte, alimentación
-- IMPUESTOS          → ICA, predial, gravamen
-- PAPELERIA          → Útiles de oficina
-- TECNOLOGIA         → Software, hardware, hosting
-- FINANCIERO         → Intereses, comisiones bancarias
-- OTROS              → Gastos varios
-- =============================================================
