-- Migrar empresas con plan viejo 'esencial' → 'basico'
-- Correr en Supabase SQL Editor

UPDATE empresas
SET plan = 'basico'
WHERE plan = 'esencial'
   OR plan IS NULL
   OR plan NOT IN ('basico', 'dian');
