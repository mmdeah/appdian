-- =============================================================
-- AppDian -- Migracion: Modulo de Gastos
-- Ejecutar en Supabase SQL Editor
-- =============================================================

-- Tabla principal de gastos
CREATE TABLE IF NOT EXISTS gastos (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id          UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,

  -- Clasificacion
  categoria           TEXT NOT NULL,
  subcategoria        TEXT,

  -- Proveedor / descripcion
  proveedor           TEXT,
  descripcion         TEXT NOT NULL,

  -- Valores (total se calcula en el backend: monto + iva)
  monto               NUMERIC(14,2) NOT NULL DEFAULT 0,
  iva                 NUMERIC(14,2) NOT NULL DEFAULT 0,
  total               NUMERIC(14,2) NOT NULL DEFAULT 0,

  -- Comprobante
  tipo_comprobante    TEXT DEFAULT 'FACTURA',
  numero_comprobante  TEXT,
  fecha               DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Pago
  medio_pago          TEXT DEFAULT 'TRANSFERENCIA',
  pagado              BOOLEAN NOT NULL DEFAULT true,

  -- Notas adicionales
  notas               TEXT,

  -- Recurrencia (futuro)
  es_recurrente       BOOLEAN DEFAULT false,

  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Indices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_gastos_empresa   ON gastos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_gastos_fecha     ON gastos(fecha);
CREATE INDEX IF NOT EXISTS idx_gastos_categoria ON gastos(empresa_id, categoria);

-- RLS (el backend usa service key que bypasea RLS)
ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "empresa_gastos" ON gastos
  USING (empresa_id = (SELECT id FROM empresas WHERE email = auth.email()));

-- Columna modo_prueba en facturas (para facturas sin DIAN)
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS modo_prueba BOOLEAN DEFAULT false;

-- Trigger updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_gastos_updated_at ON gastos;
CREATE TRIGGER trg_gastos_updated_at
  BEFORE UPDATE ON gastos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
