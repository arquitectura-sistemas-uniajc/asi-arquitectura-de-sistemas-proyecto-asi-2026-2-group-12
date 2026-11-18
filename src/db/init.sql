-- Base de datos de AulaViva: Plataforma educativa con evaluaciones en línea.
-- Se ejecuta solo la primera vez que PostgreSQL arranca con el volumen vacio.

-- Evaluaciones
CREATE TABLE IF NOT EXISTS items (
  id        SERIAL PRIMARY KEY,
  nombre    TEXT NOT NULL,          -- Evaluación
  detalle   TEXT NOT NULL,          -- Horario
  categoria TEXT NOT NULL,          -- Asignatura
  cantidad  NUMERIC(14,2) NOT NULL CHECK (cantidad >= 0)  -- Cupos libres
);

-- Inscripciones
CREATE TABLE IF NOT EXISTS registros (
  id      SERIAL PRIMARY KEY,
  item_id INTEGER REFERENCES items(id),
  persona TEXT NOT NULL,            -- Estudiante
  monto   NUMERIC(14,2),
  fecha   TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO items (nombre, detalle, categoria, cantidad) VALUES
  ('Parcial 1 de Cálculo', 'Martes 8:00 · 90 min', 'Matemáticas', 40),
  ('Quiz de Bases de Datos', 'Miércoles 10:00 · 30 min', 'Datos', 35),
  ('Examen de Física II', 'Jueves 14:00 · 120 min', 'Física', 30),
  ('Taller de Inglés B1', 'Viernes 7:00 · 60 min', 'Idiomas', 25),
  ('Parcial de Arquitectura', 'Martes 18:00 · 90 min', 'Arquitectura', 28);
