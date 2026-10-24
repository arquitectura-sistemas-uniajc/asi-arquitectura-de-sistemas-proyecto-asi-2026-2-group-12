# ADR-0002: Escalado programado con margen reactivo

- **Estado:** Aceptada
- **Fecha:** 2026-10-23

## Contexto
El pico es de 4 h semanales de 168 (≈2,4 %), en franjas conocidas. Según los
NFR, se necesitan 3 réplicas en el escenario base y 11 en el alto, frente a
2 fuera del pico.

## Decisión
Se programa el escalado: réplicas arriba 30 min antes de cada franja y abajo
30 min después, definido como código. Se agrega una regla reactiva (CPU o
latencia) solo como respaldo ante un pico no previsto.

## Alternativas descartadas
- **Solo reactivo:** tarda minutos en responder y todos entran en el mismo
  minuto, así que el sistema se degradaría justo al inicio.
- **Capacidad pico permanente:** paga las 168 h por un uso de 4 h. En el
  escenario alto cuesta ≈5 veces más en réplica-hora.

## Consecuencias
- (+) Ahorro estimado de ≈33 % (base) a ≈80 % (alto).
- (+) Capacidad lista antes de que llegue la carga.
- (-) Si cambia el horario del examen, hay que actualizar la programación.
- (-) Hay que validar con k6 que 3 y 11 réplicas realmente alcanzan.