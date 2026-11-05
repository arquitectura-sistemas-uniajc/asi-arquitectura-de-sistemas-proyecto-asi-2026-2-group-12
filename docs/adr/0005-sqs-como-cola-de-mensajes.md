# ADR-0005: RabbitMQ como cola de mensajes

- **Estado:** Aceptada
- **Fecha:** 2026-10-23

## Contexto
Correo y sincronización de notas deben procesarse en segundo plano sin bloquear
al estudiante. Hace falta una cola con confirmación de entrega, reintentos y
cola de mensajes fallidos. Redis ya se usa como caché de matrícula.

## Decisión
Usar RabbitMQ como cola de mensajes, con colas durables, confirmación manual
(ack) del consumidor y una dead-letter queue. Redis queda solo como caché.

## Alternativas descartadas
- **Redis como cola (listas o streams):** menos piezas, pero mezcla caché y
  cola en un mismo componente: una caída o un vaciado del caché podría afectar
  los mensajes pendientes. Las garantías de entrega y la dead-letter queue
  requieren más trabajo propio.
- **Llamadas síncronas a los sistemas externos:** bloquean el examen (ADR-0004).

## Consecuencias
- (+) Mensajes durables con ack y reintentos nativos.
- (+) Caché y cola fallan de forma independiente.
- (-) Un contenedor más que operar y monitorear (tamaño de cola, fallidos).
- (-) Más consumo de memoria en el host.