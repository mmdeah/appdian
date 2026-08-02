-- Migration 008: permitir eliminar empresas con todos sus datos
-- Recrea TODAS las FKs que apuntan a empresas(id) con ON DELETE CASCADE,
-- excepto audit_log que queda en SET NULL (para conservar la auditoría).
-- Correr en Supabase SQL Editor.

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT tc.table_name, tc.constraint_name, kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.table_schema   = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name
     AND tc.table_schema   = ccu.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema    = 'public'
      AND ccu.table_name     = 'empresas'
  LOOP
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', r.table_name, r.constraint_name);
    IF r.table_name = 'audit_log' THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES empresas(id) ON DELETE SET NULL',
        r.table_name, r.constraint_name, r.column_name);
    ELSE
      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES empresas(id) ON DELETE CASCADE',
        r.table_name, r.constraint_name, r.column_name);
    END IF;
  END LOOP;
END $$;

-- Detalle de nómina: al eliminar un empleado (por cascada de la empresa),
-- sus detalles de liquidación deben eliminarse también.
ALTER TABLE nomina_detalle
  DROP CONSTRAINT IF EXISTS nomina_detalle_empleado_id_fkey;
ALTER TABLE nomina_detalle
  ADD CONSTRAINT nomina_detalle_empleado_id_fkey
  FOREIGN KEY (empleado_id) REFERENCES empleados(id) ON DELETE CASCADE;
