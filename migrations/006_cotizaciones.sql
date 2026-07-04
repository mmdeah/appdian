-- ══════════════════════════════════════════════════════════════
-- Módulo de Cotizaciones
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS cotizaciones (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id        UUID          NOT NULL,
  numero_cotizacion INTEGER       NOT NULL,
  cliente_nombre    TEXT          NOT NULL DEFAULT 'Consumidor Final',
  cliente_nit       TEXT,
  cliente_email     TEXT,
  cliente_telefono  TEXT,
  validez_dias      INTEGER       NOT NULL DEFAULT 30,
  notas             TEXT,
  subtotal          NUMERIC(12,2) NOT NULL DEFAULT 0,
  iva               NUMERIC(12,2) NOT NULL DEFAULT 0,
  total             NUMERIC(12,2) NOT NULL DEFAULT 0,
  estado            TEXT          NOT NULL DEFAULT 'BORRADOR'
                    CHECK (estado IN ('BORRADOR','ENVIADA','ACEPTADA','RECHAZADA','VENCIDA')),
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (empresa_id, numero_cotizacion)
);

CREATE TABLE IF NOT EXISTS items_cotizacion (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  cotizacion_id   UUID          NOT NULL REFERENCES cotizaciones(id) ON DELETE CASCADE,
  descripcion     TEXT          NOT NULL,
  cantidad        NUMERIC(10,3) NOT NULL DEFAULT 1,
  precio_unitario NUMERIC(12,2) NOT NULL DEFAULT 0,
  iva_porcentaje  NUMERIC(5,2)  NOT NULL DEFAULT 0,
  subtotal        NUMERIC(12,2) NOT NULL DEFAULT 0  -- cantidad × precio_unitario (sin IVA)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_cotizaciones_empresa   ON cotizaciones (empresa_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_items_cotizacion_cot   ON items_cotizacion (cotizacion_id);
