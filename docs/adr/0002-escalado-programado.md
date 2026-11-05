# ADR-0002: Escalado programado con margen reactivo

- **Estado:** Aceptada
- **Fecha:** 2026-11-04

## Contexto
El pico es de 4 h semanales de 168 (≈2,4 %), en franjas conocidas. Según los
NFR, se necesitan 3 tareas de la API en el escenario base y 11 en el alto,
frente a 2 fuera del pico.

## Decisión
Escalado programado del servicio de ECS con Application Auto Scaling:
- Acciones programadas que suben las tareas 30 min antes de cada franja y las
  bajan 30 min después, definidas como código en Terraform.
- Una política reactiva por utilización de CPU (seguimiento de objetivo) solo
  como respaldo ante un pico no previsto.
- Mínimo de 2 tareas, repartidas en dos zonas de disponibilidad.

## Alternativas descartadas
- **Solo reactivo:** tarda minutos en responder y todos los estudiantes entran
  en el mismo minuto, así que el sistema se degradaría justo al inicio.
- **Capacidad pico permanente:** paga las 168 h por un uso de 4 h. En el
  escenario alto cuesta ≈5 veces más en tarea-hora.

## Consecuencias
- (+) Ahorro estimado en tarea-hora de ≈32 % (base) a ≈79 % (alto), según los
  NFR.
- (+) Capacidad lista antes de que llegue la carga.
- (-) Si cambia el horario del examen, hay que actualizar la programación.
- (-) Hay que validar con k6 que 3 y 11 tareas realmente alcanzan.
- (-) El ahorro cubre solo las tareas de la API; ALB, RDS y ElastiCache son
  costos fijos, así que el ahorro sobre la factura total es menor.