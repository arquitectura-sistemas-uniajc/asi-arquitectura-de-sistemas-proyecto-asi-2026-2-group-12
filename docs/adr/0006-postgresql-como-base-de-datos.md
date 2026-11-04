# ADR-0006: PostgreSQL como base de datos con volumen persistente

- **Estado:** Aceptada
- **Fecha:** 2026-11-03

## Contexto
AulaViva guarda cursos, matrículas, exámenes y, sobre todo, respuestas de
estudiantes. Una respuesta enviada nunca debe perderse (RPO = 0 para
respuestas, ver NFR) y los reintentos no deben duplicarla (ADR-0003). Se
necesita integridad transaccional y una restricción de unicidad confiable.

## Decisión
Usar PostgreSQL 16 en contenedor, con:
- Volumen nombrado `pgdata` para que los datos sobrevivan a recrear el
  contenedor.
- Esquema creado desde código (`infra/db/init.sql`), con claves primarias,
  claves foráneas e índices sobre las consultas calientes
  (`respuestas(examen_id, usuario_id)`, `matriculas(usuario_id)`,
  `material(curso_id)`).
- `id_respuesta` como clave primaria de `respuestas`, para soportar
  `INSERT ... ON CONFLICT DO NOTHING`.
- Credenciales tomadas de `.env`, fuera del repositorio.
- Backups con `pg_dump`, restaurados y verificados (se documenta aparte).

## Alternativas descartadas
- **Base NoSQL (documentos o clave-valor):** el modelo es relacional
  (curso, matrícula, examen, respuesta) y la unicidad transaccional es
  central. No se justifica perder joins e integridad.
- **MySQL/MariaDB:** también serviría, pero `ON CONFLICT` y el soporte de
  índices parciales de PostgreSQL encajan mejor con la idempotencia, y el
  equipo ya lo conoce.
- **Base sin volumen:** se pierden los datos al recrear el contenedor.

## Consecuencias
- (+) Integridad transaccional y unicidad garantizada por la propia BD.
- (+) Esquema reproducible desde código.
- (-) Escala en escritura de forma vertical; si el pico crece mucho habrá que
  evaluar un pooler de conexiones (por ejemplo PgBouncer) o réplicas de lectura.
- (-) `init.sql` solo se ejecuta con el volumen vacío: los cambios de esquema
  posteriores requieren migraciones.
- (-) Cambiar la contraseña del `.env` después del primer arranque no surte
  efecto sin recrear el volumen.