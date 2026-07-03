-- ============================================================
-- MIGRACIÓN: Sistema de Tickets y Panel Profesional
-- Ejecutar en Supabase → SQL Editor → Run
-- ============================================================

-- 1. Tabla de profesionales (contadores y abogados del equipo)
CREATE TABLE IF NOT EXISTS profesionales (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre        text        NOT NULL,
  email         text        UNIQUE NOT NULL,
  password      text        NOT NULL,
  especialidad  text        DEFAULT 'CONTADOR'
                            CHECK (especialidad IN ('CONTADOR', 'ABOGADO', 'ADMIN')),
  activo        boolean     DEFAULT true,
  created_at    timestamptz DEFAULT now()
);

-- 2. Tabla de tickets
CREATE TABLE IF NOT EXISTS tickets (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id    uuid        REFERENCES empresas(id) ON DELETE CASCADE NOT NULL,
  tipo          text        NOT NULL
                            CHECK (tipo IN ('CONTABILIDAD','LEGAL','TRIBUTARIO','NOMINA','OTRO')),
  asunto        text        NOT NULL,
  descripcion   text        NOT NULL,
  urgencia      text        DEFAULT 'MEDIA'
                            CHECK (urgencia IN ('BAJA','MEDIA','ALTA')),
  estado        text        DEFAULT 'NUEVO'
                            CHECK (estado IN ('NUEVO','EN_PROCESO','EN_REVISION','COMPLETADO')),
  asignado_a    uuid        REFERENCES profesionales(id),
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  completado_at timestamptz
);

-- 3. Mensajes del ticket (hilo de conversación)
CREATE TABLE IF NOT EXISTS ticket_mensajes (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id   uuid        REFERENCES tickets(id) ON DELETE CASCADE NOT NULL,
  autor_nombre text       NOT NULL,
  autor_tipo  text        NOT NULL CHECK (autor_tipo IN ('EMPRESA','PROFESIONAL')),
  contenido   text        NOT NULL,
  es_interno  boolean     DEFAULT false,  -- nota interna, no visible para el cliente
  created_at  timestamptz DEFAULT now()
);

-- ============================================================
-- CREAR PRIMER PROFESIONAL (ajusta nombre, email y contraseña)
-- La contraseña aquí es: appdian2024
-- Para cambiarla genera un hash en: https://bcrypt.online/
-- ============================================================
INSERT INTO profesionales (nombre, email, password, especialidad)
VALUES
  ('Contador Principal', 'contador@appdian.com',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPVImN.TUwi',
   'CONTADOR'),
  ('Abogado Principal', 'abogado@appdian.com',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPVImN.TUwi',
   'ABOGADO')
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- PARA BORRAR TODO (si necesitas empezar de nuevo):
-- DROP TABLE IF EXISTS ticket_mensajes;
-- DROP TABLE IF EXISTS tickets;
-- DROP TABLE IF EXISTS profesionales;
-- ============================================================
