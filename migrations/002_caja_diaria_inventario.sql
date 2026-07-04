-- ================================================================
-- AppDian Migration 002: Caja Diaria + Inventario + Cuentas por cobrar
-- Ejecutar en Supabase → SQL Editor
-- ================================================================

-- 1. Columna "pagada" en facturas (para cuentas por cobrar)
ALTER TABLE facturas
  ADD COLUMN IF NOT EXISTS pagada BOOLEAN DEFAULT FALSE;

-- 2. Tabla Cierres de Caja Diaria
CREATE TABLE IF NOT EXISTS cierres_caja (
  id                 UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id         UUID          NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  fecha              DATE          NOT NULL,
  total_ventas       NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_subtotal     NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_iva          NUMERIC(14,2) NOT NULL DEFAULT 0,
  efectivo_esperado  NUMERIC(14,2) NOT NULL DEFAULT 0,
  efectivo_contado   NUMERIC(14,2) NOT NULL DEFAULT 0,
  diferencia         NUMERIC(14,2) NOT NULL DEFAULT 0,
  num_transacciones  INT           NOT NULL DEFAULT 0,
  notas              TEXT,
  cerrado_por        TEXT,
  created_at         TIMESTAMPTZ   DEFAULT NOW(),
  UNIQUE (empresa_id, fecha)
);

CREATE INDEX IF NOT EXISTS idx_cierres_caja_empresa_fecha
  ON cierres_caja (empresa_id, fecha DESC);

ALTER TABLE cierres_caja ENABLE ROW LEVEL SECURITY;

CREATE POLICY "empresa_solo_sus_cierres" ON cierres_caja
  USING (empresa_id = (current_setting('app.empresa_id', true))::uuid);

-- 3. Tabla Inventario (productos)
CREATE TABLE IF NOT EXISTS inventario (
  id            UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id    UUID          NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  codigo        TEXT,
  nombre        TEXT          NOT NULL,
  descripcion   TEXT,
  categoria     TEXT          NOT NULL DEFAULT 'GENERAL',
  unidad        TEXT          NOT NULL DEFAULT 'UND',
  precio_costo  NUMERIC(12,2) NOT NULL DEFAULT 0,
  precio_venta  NUMERIC(12,2) NOT NULL DEFAULT 0,
  stock_actual  NUMERIC(12,3) NOT NULL DEFAULT 0,
  stock_minimo  NUMERIC(12,3) NOT NULL DEFAULT 0,
  activo        BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ   DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventario_empresa
  ON inventario (empresa_id, activo);

ALTER TABLE inventario ENABLE ROW LEVEL SECURITY;

CREATE POLICY "empresa_solo_su_inventario" ON inventario
  USING (empresa_id = (current_setting('app.empresa_id', true))::uuid);

-- 4. Tabla Movimientos de Inventario
CREATE TABLE IF NOT EXISTS movimientos_inventario (
  id              UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id      UUID          NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  producto_id     UUID          NOT NULL REFERENCES inventario(id) ON DELETE CASCADE,
  tipo            TEXT          NOT NULL CHECK (tipo IN ('ENTRADA', 'SALIDA', 'AJUSTE')),
  cantidad        NUMERIC(12,3) NOT NULL,
  precio_unitario NUMERIC(12,2),
  motivo          TEXT,
  referencia      TEXT,
  created_at      TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_movimientos_inventario_producto
  ON movimientos_inventario (producto_id, created_at DESC);

ALTER TABLE movimientos_inventario ENABLE ROW LEVEL SECURITY;

CREATE POLICY "empresa_solo_sus_movimientos_inv" ON movimientos_inventario
  USING (empresa_id = (current_setting('app.empresa_id', true))::uuid);
