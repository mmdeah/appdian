-- ================================================================
-- Migrar productos → inventario (TODOS como SERVICIO)
-- Esta empresa es firma de servicios profesionales — sin stock físico
-- Es idempotente: ON CONFLICT DO NOTHING evita duplicados
-- ================================================================

INSERT INTO inventario (
  id,
  empresa_id,
  codigo,
  nombre,
  descripcion,
  categoria,
  unidad,
  precio_costo,
  precio_venta,
  stock_actual,
  stock_minimo,
  activo,
  created_at
)
SELECT
  p.id,
  p.empresa_id,
  p.codigo,
  p.nombre,
  p.descripcion,
  'SERVICIO'                                  AS categoria,
  CASE
    WHEN upper(p.unidad) IN ('UND','')  THEN 'SRV'
    ELSE COALESCE(NULLIF(p.unidad,''), 'SRV')
  END                                         AS unidad,
  0                                           AS precio_costo,
  p.precio                                    AS precio_venta,
  0                                           AS stock_actual,
  0                                           AS stock_minimo,
  p.activo,
  NOW()
FROM productos p
ON CONFLICT (id) DO NOTHING;

-- Ver resultado
SELECT categoria, count(*) AS total FROM inventario GROUP BY categoria;
