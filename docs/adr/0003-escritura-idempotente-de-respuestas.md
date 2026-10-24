# ADR-0003: Escritura idempotente y confirmación tras persistir

- **Estado:** Aceptada
- **Fecha:** 2026-10-23

## Contexto
Una respuesta enviada nunca debe perderse (RPO = 0 para respuestas). El
cliente puede reintentar si la API cae o la red falla, y no debe generar
duplicados.

## Decisión
- Cada respuesta lleva un identificador único generado en el cliente
  (examen + pregunta + intento).
- La API inserta con restricción de unicidad sobre ese identificador
  (`INSERT ... ON CONFLICT DO NOTHING`).
- Solo se responde 200 al estudiante cuando PostgreSQL confirmó la escritura.
- El cliente conserva la respuesta en almacenamiento local hasta recibir la
  confirmación y reintenta con espera creciente.
- Mínimo dos réplicas de API detrás de Nginx con verificación de salud.

## Alternativas descartadas
- **Confirmar primero y escribir después:** si la API cae entre ambos pasos,
  se pierde una respuesta que el estudiante ya vio como enviada.
- **Reintentos sin identificador único:** generan respuestas duplicadas.

## Consecuencias
- (+) Una caída de réplica es transparente para el estudiante.
- (+) Los reintentos son seguros.
- (-) La latencia de la respuesta incluye la escritura en BD.
- (-) El cliente necesita lógica de guardado local y reintento.