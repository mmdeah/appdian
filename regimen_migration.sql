-- ============================================================
-- MIGRACIÓN: Régimen tributario por empresa
-- Ejecutar en Supabase → SQL Editor → Run
-- ============================================================

ALTER TABLE empresas
  ADD COLUMN IF NOT EXISTS regimen text DEFAULT 'ORDINARIO'
    CHECK (regimen IN ('ORDINARIO', 'SIMPLE'));

ALTER TABLE empresas
  ADD COLUMN IF NOT EXISTS actividad_simple text
    CHECK (actividad_simple IN ('COMERCIO', 'SERVICIOS', 'PROFESIONAL', 'COMIDAS'));
