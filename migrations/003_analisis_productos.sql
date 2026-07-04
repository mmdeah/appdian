-- ================================================================
-- PASO 1: Analizar productos antes de migrar
-- Corre esto PRIMERO para ver qué productos tienes y cómo quedarían
-- ================================================================

SELECT
  p.nombre,
  p.codigo,
  p.precio       AS precio_venta,
  p.iva_porcentaje,
  p.unidad,
  p.activo,
  CASE
    -- Detectar servicios por unidad
    WHEN upper(p.unidad) IN ('SRV','SERV','HORA','HRS','HR','MIN','CONS','MES','DIA','DÍA','SERV.','SRVS')
      THEN 'SERVICIO'
    -- Detectar servicios por nombre (palabras clave comunes)
    WHEN p.nombre  ILIKE '%servicio%'
      OR p.nombre  ILIKE '%honorario%'
      OR p.nombre  ILIKE '%consultor%'
      OR p.nombre  ILIKE '%asesor%'
      OR p.nombre  ILIKE '%mantenimiento%'
      OR p.nombre  ILIKE '%instalaci%'
      OR p.nombre  ILIKE '%capacitaci%'
      OR p.nombre  ILIKE '%soporte%'
      THEN 'SERVICIO'
    ELSE 'PRODUCTO'
  END AS tipo_detectado,
  CASE
    WHEN upper(p.unidad) IN ('SRV','SERV','HORA','HRS','HR','MIN','CONS','MES','DIA','DÍA','SERV.','SRVS')
      OR p.nombre ILIKE '%servicio%' OR p.nombre ILIKE '%honorario%'
      OR p.nombre ILIKE '%consultor%' OR p.nombre ILIKE '%asesor%'
      OR p.nombre ILIKE '%mantenimiento%' OR p.nombre ILIKE '%instalaci%'
      OR p.nombre ILIKE '%capacitaci%' OR p.nombre ILIKE '%soporte%'
      THEN 'Sin stock (es servicio)'
    ELSE 'Se migrará con stock = 0'
  END AS accion
FROM productos p
ORDER BY tipo_detectado, p.nombre;
