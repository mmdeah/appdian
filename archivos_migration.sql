-- ============================================================
-- MIGRACIÓN: Tabla de archivos adjuntos en tickets
-- Ejecutar en Supabase → SQL Editor → Run
-- ============================================================

CREATE TABLE IF NOT EXISTS ticket_archivos (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id       uuid        REFERENCES tickets(id) ON DELETE CASCADE NOT NULL,
  nombre_original text        NOT NULL,
  url             text        NOT NULL,
  tipo_mime       text        NOT NULL,
  tamanio         integer     NOT NULL,  -- bytes
  created_at      timestamptz DEFAULT now()
);

-- ============================================================
-- TAMBIÉN: Crear el bucket en Supabase Storage
-- Ve a Storage → New bucket
-- Nombre: ticket-archivos
-- Public: SI (para que las URLs funcionen)
-- ============================================================
