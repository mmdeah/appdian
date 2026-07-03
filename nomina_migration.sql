-- ============================================================
-- MIGRACIÓN: Módulo de nómina
-- Ejecutar en Supabase → SQL Editor → Run
-- ============================================================

-- Empleados
CREATE TABLE IF NOT EXISTS empleados (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id      uuid        REFERENCES empresas(id) NOT NULL,
  nombre          text        NOT NULL,
  apellido        text        NOT NULL,
  tipo_doc        text        DEFAULT 'CC' CHECK (tipo_doc IN ('CC','CE','PA','TI')),
  num_doc         text        NOT NULL,
  cargo           text        NOT NULL,
  salario_base    numeric(14,2) NOT NULL,
  tipo_contrato   text        DEFAULT 'INDEFINIDO'
                    CHECK (tipo_contrato IN ('INDEFINIDO','FIJO','OBRA_LABOR','PRESTACION')),
  riesgo_arl      integer     DEFAULT 1 CHECK (riesgo_arl BETWEEN 1 AND 5),
  fecha_inicio    date        NOT NULL,
  fecha_fin       date,
  activo          boolean     DEFAULT true,
  created_at      timestamptz DEFAULT now()
);

-- Encabezado de liquidación mensual
CREATE TABLE IF NOT EXISTS nomina_liquidaciones (
  id                   uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id           uuid        REFERENCES empresas(id) NOT NULL,
  periodo              text        NOT NULL,  -- 'YYYY-MM'
  estado               text        DEFAULT 'BORRADOR'
                         CHECK (estado IN ('BORRADOR','PROCESADA','PAGADA')),
  num_empleados        integer     DEFAULT 0,
  total_devengado      numeric(14,2) DEFAULT 0,
  total_deducciones    numeric(14,2) DEFAULT 0,
  total_aportes_empresa numeric(14,2) DEFAULT 0,
  total_neto           numeric(14,2) DEFAULT 0,
  created_at           timestamptz DEFAULT now(),
  UNIQUE(empresa_id, periodo)
);

-- Detalle por empleado
CREATE TABLE IF NOT EXISTS nomina_detalle (
  id                  uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  liquidacion_id      uuid        REFERENCES nomina_liquidaciones(id) ON DELETE CASCADE,
  empleado_id         uuid        REFERENCES empleados(id),
  -- Snapshot del empleado
  nombre_empleado     text,
  num_doc             text,
  cargo               text,
  salario_base        numeric(14,2),
  -- Período
  dias_trabajados     integer     DEFAULT 30,
  -- Devengos
  salario             numeric(14,2) DEFAULT 0,
  auxilio_transporte  numeric(14,2) DEFAULT 0,
  horas_extras        numeric(14,2) DEFAULT 0,
  bonificaciones      numeric(14,2) DEFAULT 0,
  total_devengado     numeric(14,2) DEFAULT 0,
  -- Deducciones empleado
  ded_salud           numeric(14,2) DEFAULT 0,
  ded_pension         numeric(14,2) DEFAULT 0,
  ded_retencion       numeric(14,2) DEFAULT 0,
  ded_otros           numeric(14,2) DEFAULT 0,
  total_deducciones   numeric(14,2) DEFAULT 0,
  -- Neto
  neto_pagar          numeric(14,2) DEFAULT 0,
  -- Aportes empleador
  ap_salud            numeric(14,2) DEFAULT 0,
  ap_pension          numeric(14,2) DEFAULT 0,
  ap_arl              numeric(14,2) DEFAULT 0,
  ap_sena             numeric(14,2) DEFAULT 0,
  ap_icbf             numeric(14,2) DEFAULT 0,
  ap_caja             numeric(14,2) DEFAULT 0,
  total_aportes       numeric(14,2) DEFAULT 0,
  -- Provisiones
  prov_prima          numeric(14,2) DEFAULT 0,
  prov_cesantias      numeric(14,2) DEFAULT 0,
  prov_int_cesantias  numeric(14,2) DEFAULT 0,
  prov_vacaciones     numeric(14,2) DEFAULT 0,
  created_at          timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_empleados_empresa  ON empleados(empresa_id);
CREATE INDEX IF NOT EXISTS idx_nom_liq_empresa    ON nomina_liquidaciones(empresa_id);
CREATE INDEX IF NOT EXISTS idx_nom_det_liq        ON nomina_detalle(liquidacion_id);
