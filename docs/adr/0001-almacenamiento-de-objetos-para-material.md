# ADR-0001: Amazon S3 para el material del curso

- **Estado:** Aceptada
- **Fecha:** 2026-11-04

## Contexto
Los cursos incluyen material pesado (PDF, presentaciones, video). En el pico,
miles de estudiantes pueden descargar material mientras otros presentan el
examen. La base de datos debe quedar libre para registrar respuestas.

## Decisión
El material se guarda en Amazon S3, en un bucket privado con bloqueo de acceso
público. En RDS PostgreSQL solo se guarda la referencia: clave del objeto,
nombre, tamaño y curso. La API valida la matrícula y entrega una URL
prefirmada de corta duración (por ejemplo 5 min); el archivo se descarga
directamente desde S3, sin pasar por la API.

## Alternativas descartadas
- **Archivos en PostgreSQL (BYTEA/large objects):** inflan la BD, encarecen las
  copias y la restauración, y compiten por conexiones con el examen.
- **Archivos en el disco de la tarea de ECS:** no se comparten entre tareas y
  se pierden al reemplazarlas.
- **Servir el archivo a través de la API:** consume ancho de banda y CPU de las
  tareas justo en el pico.

## Consecuencias
- (+) La descarga escala sin cargar API ni BD.
- (+) Copias de la BD pequeñas y rápidas.
- (+) Cobro por uso y capa gratuita para poco volumen.
- (-) Un componente más que asegurar: bucket privado, URLs con expiración y
  permisos mínimos para el rol de la tarea.
- (-) Subir y descargar requiere el flujo de URL prefirmada.
- (-) Una URL prefirmada filtrada sirve hasta que expire.