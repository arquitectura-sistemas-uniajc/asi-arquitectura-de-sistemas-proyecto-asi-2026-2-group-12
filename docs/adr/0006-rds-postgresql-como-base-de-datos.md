# ADR-0006: RDS PostgreSQL como base de datos

- **Estado:** Aceptada
- **Fecha:** 2026-11-04

## Contexto
AulaViva guarda cursos, matrículas, exámenes y, sobre todo, respuestas de
estudiantes. Una respuesta enviada nunca debe perderse (RPO = 0 para
respuestas, ver NFR) y los reintentos no deben duplicarla (ADR-0003). Se
necesita integridad transaccional y una restricción de unicidad confiable.

## Decisión
Usar Amazon RDS for PostgreSQL, con:
- Clase `db.t4g.micro`, una sola zona de disponibilidad (por costo; Multi-AZ
  se evalúa en el escenario alto de costos).
- Grupo de subredes con subredes privadas en dos zonas (RDS lo exige aunque la
  instancia sea de una sola zona) y acceso público desactivado.
- Esquema creado desde código (`infra/db/init.sql`) con claves primarias,
  claves foráneas e índices sobre las consultas calientes
  (`respuestas(examen_id, usuario_id)`, `matriculas(usuario_id)`,
  `material(curso_id)`).
- `id_respuesta` como clave primaria de `respuestas`, para soportar
  `INSERT ... ON CONFLICT DO NOTHING`.
- Credenciales en SSM Parameter Store (ADR-0008).
- Como la base no es alcanzable desde internet, el esquema se aplica con una
  tarea puntual de ECS dentro de la VPC.

## Alternativas descartadas
- **PostgreSQL en una instancia EC2 propia:** más control, pero hay que operar
  parches, copias y recuperación.
- **DynamoDB:** el modelo es relacional (curso, matrícula, examen, respuesta) y
  la unicidad transaccional es central; se perderían joins e integridad.
- **Aurora:** mayor costo y complejidad que no se justifican con este volumen.

## Consecuencias
- (+) Integridad transaccional y unicidad garantizada por la propia BD.
- (+) Copias automáticas y restauración a un punto en el tiempo (ADR-0010).
- (+) Esquema reproducible desde código.
- (-) Una sola zona: una falla de esa zona deja la base fuera hasta
  restaurar. Es un riesgo aceptado por costo y debe declararse en la
  sustentación.
- (-) Escala en escritura de forma vertical; si el pico crece mucho habrá que
  evaluar RDS Proxy o réplicas de lectura.
- (-) Se cobra por hora mientras exista; se destruye con Terraform fuera de las
  sesiones de trabajo (conservando un snapshot si hay datos que mantener).