-- Migration: add ultimo_pago column + default activo=false for new registrations
-- Run in Supabase SQL Editor

ALTER TABLE empresas
  ADD COLUMN IF NOT EXISTS ultimo_pago DATE;

-- Ensure activo column exists (it should already)
ALTER TABLE empresas
  ALTER COLUMN activo SET DEFAULT false;

-- Comment for documentation
COMMENT ON COLUMN empresas.ultimo_pago IS 'Fecha del último pago recibido. Se actualiza automáticamente al marcar plan_pagado = true.';
COMMENT ON COLUMN empresas.activo IS 'false = cuenta pendiente de activación por el administrador';
