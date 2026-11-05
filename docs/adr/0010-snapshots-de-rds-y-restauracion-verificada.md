# ADR-0010: Backup con pg_dump y restauración verificada

- **Estado:** Aceptada
- **Fecha:** 2026-11-03

## Contexto
El enunciado exige un backup restaurado y verificado. El NFR fija RTO de
15 min y RPO de 5 min para datos generales; para respuestas de examen el RPO
es 0 y lo sostiene la escritura confirmada en PostgreSQL (ADR-0003), no el
backup.

## Decisión
- Respaldo lógico con `pg_dump -Fc` ejecutado dentro del contenedor y copiado
  al host con `docker compose cp`.
- Restauración probada en una base aparte (`aulaviva_restore`) con
  `pg_restore`, comparando conteos y registros con el origen.
- RTO medido con `Measure-Command` (ver evidencia 12).
- Los archivos están en `backups/`, ignorado por Git.

## Alternativas descartadas
- **Backup del volumen completo:** depende de detener la base o de snapshots.
- **Archivado continuo (WAL) o PITR:** cumpliría RPO de 5 min, pero añade
  complejidad que no se justifica en este hito.

## Consecuencias
- (+) Procedimiento reproducible y verificado.
- (-) **Limitación:** el backup es manual, así que el RPO real es el intervalo
  entre respaldos y no cumple los 5 min. Mejora para el Hito 3: respaldo
  programado o WAL.
- (-) El RTO medido corresponde a una base pequeña; con datos de un pico real
  será mayor.
- (-) Los respaldos están en el mismo equipo; en producción irían a
  almacenamiento externo cifrado.