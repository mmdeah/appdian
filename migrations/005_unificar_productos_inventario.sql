-- ================================================================
-- Migration 005: Unificar inventario → productos
-- El módulo de Inventario ahora trabaja directamente sobre `productos`
-- Ejecutar en Supabase → SQL Editor
-- ================================================================

-- 1. Agregar columnas de inventario a productos
ALTER TABLE productos ADD COLUMN IF NOT EXISTS stock_actual  NUMERIC(12,3) NOT NULL DEFAULT 0;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS stock_minimo  NUMERIC(12,3) NOT NULL DEFAULT 0;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS precio_costo  NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS categoria     TEXT          NOT NULL DEFAULT 'GENERAL';

-- 2. Copiar datos de inventario → productos (mismos UUIDs)
UPDATE productos p
SET
  stock_actual = COALESCE(i.stock_actual, 0),
  stock_minimo = COALESCE(i.stock_minimo, 0),
  precio_costo = COALESCE(i.precio_costo, 0),
  categoria    = COALESCE(NULLIF(i.categoria, ''), 'GENERAL')
FROM inventario i
WHERE i.id = p.id;

-- 3. Redirigir FK de movimientos_inventario → productos
ALTER TABLE movimientos_inventario
  DROP CONSTRAINT IF EXISTS movimientos_inventario_producto_id_fkey;

ALTER TABLE movimientos_inventario
  ADD CONSTRAINT movimientos_inventario_producto_id_fkey
  FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE;

-- Verificar resultado
SELECT codigo, nombre, unidad, categoria, stock_actual, stock_minimo, precio, precio_costo
FROM productos
ORDER BY nombre;
