-- ============================================================
-- DATOS DE PRUEBA — AppDian
-- Ejecutar en: Supabase → SQL Editor → Run
-- Genera: 150 facturas · 10 clientes · 15 productos · 6 meses
-- Para borrar todo: ver sección al final del archivo
-- ============================================================

DO $$
DECLARE
  emp_id uuid;
  fac_id uuid;
  num_pos int := 1000;   -- numeración POS de prueba (empieza en 1000 para no chocar con reales)
  num_fe  int := 1000;   -- numeración FE de prueba

  -- 10 clientes  formato: 'Nombre|NIT'
  clientes text[] := ARRAY[
    'Empresa ABC SAS|900123456',
    'Distribuciones López LTDA|800456789',
    'Soluciones Tech Colombia|901234567',
    'Ferretería El Martillo SAS|700789123',
    'Supermercado La Cosecha|890456123',
    'Clínica Santa María SAS|810234567',
    'Colegio Nuevo Horizonte|860123456',
    'Constructora Edificios SA|900789456',
    'Restaurante El Sabor|830567890',
    'Hotel Boutique Andino|870345678'
  ];

  -- 15 productos  formato: 'Descripción|PrecioBase|IVA%'
  prods text[] := ARRAY[
    'Laptop Dell Inspiron 15|2500000|19',
    'Monitor 24" Samsung FHD|800000|19',
    'Teclado Logitech MK270|150000|19',
    'Mouse Inalámbrico Logitech|80000|19',
    'Impresora HP LaserJet M110|1200000|19',
    'Silla Ergonómica Ejecutiva|950000|19',
    'Escritorio Ejecutivo 160cm|1800000|19',
    'Cámara Web HD 1080p|200000|19',
    'Auriculares Sony WH-1000XM5|350000|19',
    'UPS APC Back-UPS 1500VA|600000|19',
    'Cable HDMI 2m Premium|25000|19',
    'Cargador USB-C 65W|45000|19',
    'Soporte Monitor Ajustable|120000|19',
    'Mochila Laptop 15 pulgadas|180000|19',
    'Antivirus ESET NOD32 1 Año|120000|0'
  ];

  -- variables de trabajo
  item_prods  int[];
  item_cants  int[];
  item_prices numeric[];
  item_ivas   numeric[];

  mes       int;
  i         int;
  k         int;
  dia       int;
  hora      int;
  fecha     timestamptz;
  tipo      text;
  cli_idx   int;
  prod_idx  int;
  items_n   int;
  item_cant   int;
  item_precio numeric;
  item_iva    numeric;
  item_sub    numeric;
  subtotal    numeric;
  iva_monto   numeric;
  total       numeric;

BEGIN
  -- Tomar el primer empresa registrada
  SELECT id INTO emp_id FROM empresas ORDER BY created_at ASC LIMIT 1;

  IF emp_id IS NULL THEN
    RAISE EXCEPTION 'No hay empresas en la base de datos. Regístrate en la app primero.';
  END IF;

  RAISE NOTICE 'Generando datos para empresa: %', emp_id;

  -- 6 meses × 25 facturas = 150 total
  FOR mes IN 0..5 LOOP
    FOR i IN 1..25 LOOP

      -- Fecha aleatoria dentro del mes (días 1-27, horas 8-17)
      dia  := 1 + (random() * 26)::int;
      hora := 8  + (random() *  9)::int;
      fecha := date_trunc('month', now())
               - make_interval(months => mes)
               + make_interval(days => dia - 1, hours => hora);

      -- Cliente y tipo aleatorios (70% POS, 30% FE)
      cli_idx := 1 + (random() * 9)::int;
      tipo    := CASE WHEN random() < 0.7 THEN 'POS' ELSE 'FE' END;
      items_n := 1 + (random() * 3)::int;   -- 1 a 4 productos por factura

      -- Reiniciar acumuladores
      subtotal    := 0;
      iva_monto   := 0;
      item_prods  := ARRAY[]::int[];
      item_cants  := ARRAY[]::int[];
      item_prices := ARRAY[]::numeric[];
      item_ivas   := ARRAY[]::numeric[];

      -- Generar líneas de producto
      FOR k IN 1..items_n LOOP
        prod_idx    := 1 + (random() * 14)::int;
        item_cant   := 1 + (random() * 3)::int;
        item_precio := split_part(prods[prod_idx], '|', 2)::numeric;
        item_iva    := split_part(prods[prod_idx], '|', 3)::numeric;
        item_sub    := item_precio * item_cant;

        item_prods  := item_prods  || prod_idx;
        item_cants  := item_cants  || item_cant;
        item_prices := item_prices || item_precio;
        item_ivas   := item_ivas   || item_iva;

        subtotal  := subtotal  + item_sub;
        iva_monto := iva_monto + item_sub * item_iva / 100;
      END LOOP;

      total := subtotal + iva_monto;

      -- Insertar factura
      INSERT INTO facturas (
        empresa_id, tipo, numero_documento,
        cliente_nombre, cliente_nit,
        subtotal, iva, total,
        estado, medio_pago_id, created_at
      ) VALUES (
        emp_id,
        tipo,
        CASE WHEN tipo = 'POS' THEN num_pos ELSE num_fe END,
        split_part(clientes[cli_idx], '|', 1),
        split_part(clientes[cli_idx], '|', 2),
        subtotal, iva_monto, total,
        'APROBADA', 10,
        fecha
      ) RETURNING id INTO fac_id;

      IF tipo = 'POS' THEN num_pos := num_pos + 1;
      ELSE                 num_fe  := num_fe  + 1; END IF;

      -- Insertar items de la factura
      FOR k IN 1..items_n LOOP
        INSERT INTO items_factura (
          factura_id,
          producto_codigo,
          descripcion,
          cantidad,
          precio_unitario,
          iva_porcentaje,
          subtotal
        ) VALUES (
          fac_id,
          'PRD-' || lpad(item_prods[k]::text, 3, '0'),
          split_part(prods[item_prods[k]], '|', 1),
          item_cants[k],
          item_prices[k],
          item_ivas[k],
          item_prices[k] * item_cants[k]
        );
      END LOOP;

    END LOOP;
  END LOOP;

  RAISE NOTICE '✓ 150 facturas de prueba insertadas (6 meses × 25/mes)';
END $$;


-- ============================================================
-- PARA BORRAR LOS DATOS DE PRUEBA (número_documento >= 1000)
-- Descomenta y ejecuta solo si quieres limpiar:
-- ============================================================
/*
DELETE FROM items_factura
WHERE factura_id IN (
  SELECT id FROM facturas WHERE numero_documento >= 1000
);

DELETE FROM facturas WHERE numero_documento >= 1000;
*/
