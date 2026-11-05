# ADR-0004: Caché y cola para sistemas externos

- **Estado:** Aceptada
- **Fecha:** 2026-11-04

## Contexto
La plataforma depende del sistema académico (validar matrícula) y del
servicio de correo. Ninguno debe bloquear un examen en curso.

## Decisión
- La matrícula se pre-carga en ElastiCache (Redis) **antes** de la franja de
  examen, con TTL [definir, por ejemplo 6 h]. La consulta en línea al sistema
  académico ocurre solo en la pre-carga; durante el examen se lee únicamente
  del caché.
- Las notificaciones de correo y el envío de notas se publican en una cola
  Amazon SQS (ADR-0005). El trabajador de notificación, que corre como tarea
  de ECS, las consume y reintenta; los mensajes que agotan los reintentos
  pasan a una cola de mensajes fallidos.

## Alternativas descartadas
- **Llamadas síncronas a los sistemas externos:** si se demoran, el examen se
  bloquea.
- **Reintentar dentro de la petición del estudiante:** aumenta la latencia y
  ocupa conexiones de la API.
- **Consultar el sistema académico en cada petición:** su disponibilidad
  pasaría a ser la del examen.

## Consecuencias
- (+) Una caída del correo o del sistema académico no afecta el examen.
- (-) Consistencia eventual: las notas pueden llegar con retraso.
- (-) ElastiCache se cobra por hora aunque no se use; se destruye con
  Terraform fuera de las sesiones de trabajo (ADR-0008, NFR de costo).
- (-) Si el caché se vacía durante un examen, la API debe tener una respuesta
  definida (consultar RDS como respaldo, ya que la matrícula también está en
  la base de datos).