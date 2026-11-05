# ADR-0005: Amazon SQS como cola de mensajes

- **Estado:** Aceptada
- **Fecha:** 2026-11-04

## Contexto
Correo y sincronización de notas deben procesarse en segundo plano sin
bloquear al estudiante. Hace falta una cola con reintentos y una cola de
mensajes fallidos, sin operar un broker propio.

## Decisión
Usar Amazon SQS, cola estándar, con esta configuración:
- Cola de mensajes fallidos (DLQ) con `maxReceiveCount` de 5.
- `visibility timeout` mayor que el tiempo máximo de procesamiento de un
  mensaje; si el trabajador falla, el mensaje reaparece y se reintenta.
- Long polling de 20 s en el trabajador, para reducir llamadas vacías.
- Alarma de CloudWatch sobre mensajes en la DLQ.
- El trabajador es idempotente: SQS estándar entrega al menos una vez y puede
  repetir un mensaje.

## Alternativas descartadas
- **Amazon MQ (RabbitMQ administrado):** funciona, pero el broker se cobra por
  hora y consume créditos aunque no haya mensajes.
- **Redis como cola:** mezcla caché y cola; un vaciado del caché afectaría los
  mensajes pendientes.
- **SQS FIFO:** da orden y entrega exacta, pero con menor rendimiento; el
  orden no es un requisito aquí.
- **Llamadas síncronas a los externos:** bloquean el examen (ADR-0004).

## Consecuencias
- (+) Sin servidores que operar; cobro por uso y capa gratuita mensual amplia.
- (+) Caché y cola fallan de forma independiente.
- (-) Entrega al menos una vez: puede haber duplicados, por eso el trabajador
  debe tolerarlos.
- (-) El orden de los mensajes no está garantizado.
- (-) No hay espera creciente nativa entre reintentos; se controla ajustando
  el `visibility timeout` desde el trabajador.