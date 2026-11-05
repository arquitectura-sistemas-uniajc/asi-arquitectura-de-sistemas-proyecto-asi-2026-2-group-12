# ADR-0010: Copias automáticas de RDS y restauración verificada

- **Estado:** Aceptada
- **Fecha:** 2026-11-04

## Contexto
El enunciado exige un backup restaurado y verificado. El NFR fija RTO de
15 min y RPO de 5 min para datos generales; para respuestas de examen el RPO
es 0 y lo sostiene la escritura confirmada en la base de datos (ADR-0003), no
el backup.

## Decisión
- Copias automáticas de RDS activadas, con retención de 7 días. Permiten
  restaurar a un punto en el tiempo.
- Un snapshot manual antes de cada demostración y antes de destruir la
  infraestructura con Terraform, para conservar los datos.
- Restauración probada creando una instancia nueva desde el snapshot (RDS
  restaura siempre a una instancia nueva, no sobre la existente).
- Verificación: se comparan los conteos de `cursos`, `matriculas` y
  `respuestas` y la lista de `id_respuesta` con los de la base original.
- Se mide el tiempo total hasta que la instancia restaurada acepta
  conexiones; ese es el RTO real.

## Alternativas descartadas
- **`pg_dump` manual (prototipo local):** no cumple el RPO sin automatizar y
  dependía de un equipo personal.
- **Multi-AZ como respaldo:** da alta disponibilidad, no protege contra un
  borrado lógico o datos corruptos.
- **Copia de snapshots a otra región:** mejora la recuperación ante desastre,
  pero añade costo.

## Consecuencias
- (+) Procedimiento reproducible, administrado y verificado.
- (+) Con restauración a un punto en el tiempo, el RPO queda en el orden de
  minutos. Debe verificarse con el valor de `LatestRestorableTime` de la
  instancia antes de afirmar que se cumplen los 5 min.
- (-) **Riesgo para el RTO:** crear una instancia RDS desde un snapshot suele
  tardar varios minutos o más; puede superar los 15 min del NFR. Se mide y, si
  es mayor, se ajusta el NFR en lugar de ocultar el dato.
- (-) La restauración crea otro endpoint; hay que actualizar la configuración
  de la API o renombrar la instancia.
- (-) Los snapshots manuales se cobran mientras existan; se borran los que ya
  no se necesiten.