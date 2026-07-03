-- ============================================================
-- MIGRACIÓN: Contraseña cifrada + Log de auditoría
-- Ejecutar en Supabase → SQL Editor → Run
-- ============================================================

-- Columna para contraseña cifrada (AES-256, reversible para soporte)
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS password_cifrada text;

-- Tabla de auditoría
CREATE TABLE IF NOT EXISTS audit_log (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo            text        NOT NULL,  -- 'VER_PASSWORD', 'ACCESO_DATOS', etc.
  descripcion     text        NOT NULL,
  profesional_id  uuid        REFERENCES profesionales(id),
  empresa_id      uuid        REFERENCES empresas(id),
  created_at      timestamptz DEFAULT now()
);

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_audit_empresa    ON audit_log(empresa_id);
CREATE INDEX IF NOT EXISTS idx_audit_profesional ON audit_log(profesional_id);
CREATE INDEX IF NOT EXISTS idx_audit_tipo        ON audit_log(tipo);
