# ADR-0003: Escritura idempotente y confirmación tras persistir

- **Estado:** Aceptada
- **Fecha:** 2026-11-04

## Contexto
Una respuesta enviada nunca debe perderse (RPO = 0 para respuestas). El
cliente puede reintentar si la API cae o la red falla, y no debe generar
duplicados.

## Decisión
- Cada respuesta lleva un identificador único generado en el cliente
  (examen + pregunta + intento).
- La API inserta con restricción de unicidad sobre ese identificador
  (`INSERT ... ON CONFLICT DO NOTHING`).
- Solo se responde `201` al estudiante cuando RDS PostgreSQL confirmó la
  escritura. Si el identificador ya existía, la respuesta lleva
  `duplicada: true` y no se crea otro registro.
- El cliente conserva la respuesta en almacenamiento local hasta recibir la
  confirmación y reintenta con espera creciente.
- Mínimo dos tareas de API en dos zonas de disponibilidad, detrás de un
  Application Load Balancer con verificación de salud (ADR-0007).

## Alternativas descartadas
- **Confirmar primero y escribir después:** si la API cae entre ambos pasos,
  se pierde una respuesta que el estudiante ya vio como enviada.
- **Reintentos sin identificador único:** generan respuestas duplicadas.
- **Cola entre la API y la base de datos:** reduce la latencia, pero la
  respuesta confirmada podría perderse antes de persistirse.

## Consecuencias
- (+) La caída de una tarea es transparente para el estudiante.
- (+) Los reintentos son seguros, incluso si caen en otra tarea.
- (-) La latencia de la respuesta incluye la escritura en la BD.
- (-) El cliente necesita lógica de guardado local y reintento, aún no
  implementada.
- (-) Si la caída ocurre durante la petición, el cliente debe reintentar para
  conocer el resultado; la idempotencia lo hace seguro.