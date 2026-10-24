# ADR-0001: Almacenamiento de objetos para el material del curso

- **Estado:** Aceptada
- **Fecha:** 2026-10-23

## Contexto
Los cursos incluyen material pesado (PDF, presentaciones, video). En el pico,
miles de estudiantes pueden descargar material mientras otros presentan el
examen. La BD debe quedar libre para registrar respuestas.

## Decisión
El material se guarda en almacenamiento de objetos (S3 o MinIO). En PostgreSQL
solo se guarda la referencia: clave del objeto, nombre, tamaño y curso. La
descarga se hace con URL prefirmada, sin pasar por la API.

## Alternativas descartadas
- **Archivos en PostgreSQL (BYTEA/large objects):** inflan la BD, encarecen los
  backups y compiten por conexiones con el examen.
- **Archivos en disco de la API:** no funciona con varias réplicas y se pierde
  al recrear el contenedor.

## Consecuencias
- (+) La descarga escala sin cargar API ni BD.
- (+) Backups de BD pequeños y rápidos.
- (-) Un componente más que operar y asegurar (bucket privado, URLs con expiración).
- (-) Subir y descargar requiere el flujo de URL prefirmada.