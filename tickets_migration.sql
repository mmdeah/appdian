-- ============================================================
-- MIGRACIÓN: Sistema de Tickets y Panel Profesional
-- Ejecutar en Supabase → SQL Editor → Run
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Tabla de profesionales
CREATE TABLE IF NOT EXISTS profesionales (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre        text        NOT NULL,
  email         text        UNIQUE NOT NULL,
  password      text        NOT NULL,
  especialidad  text        DEFAULT 'ADMIN'
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

-- 3. Mensajes del ticket
CREATE TABLE IF NOT EXISTS ticket_mensajes (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id    uuid        REFERENCES tickets(id) ON DELETE CASCADE NOT NULL,
  autor_nombre text        NOT NULL,
  autor_tipo   text        NOT NULL CHECK (autor_tipo IN ('EMPRESA','PROFESIONAL')),
  contenido    text        NOT NULL,
  es_interno   boolean     DEFAULT false,
  created_at   timestamptz DEFAULT now()
);

-- ============================================================
-- USUARIO ÚNICO DEL PANEL PROFESIONAL
-- Email: profesional@appdian.com  |  Contraseña: appdian2024
-- ============================================================
INSERT INTO profesionales (nombre, email, password, especialidad)
VALUES (
  'Panel AppDian',
  'profesional@appdian.com',
  crypt('appdian2024', gen_salt('bf', 10)),
  'ADMIN'
)
ON CONFLICT (email) DO UPDATE SET
  password    = crypt('appdian2024', gen_salt('bf', 10)),
  especialidad = 'ADMIN';

-- ============================================================
-- PARA BORRAR TODO (si necesitas empezar de nuevo):
-- DROP TABLE IF EXISTS ticket_mensajes;
-- DROP TABLE IF EXISTS tickets;
-- DROP TABLE IF EXISTS profesionales;
-- ============================================================
