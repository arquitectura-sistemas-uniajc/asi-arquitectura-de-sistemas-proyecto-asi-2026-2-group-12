# C4 Nivel 3: Componentes de la API

Contenedor detallado: **API de AulaViva** (tareas idénticas de ECS Fargate
detrás de un Application Load Balancer).

## Responsabilidades

| Componente | Responsabilidad | Decisión relacionada |
|---|---|---|
| Middleware de autenticación | Valida JWT (expiración ≤ 1 h) y rol | ADR-0009 |
| Servicio de matrícula | Lee la matrícula pre-cargada en ElastiCache | ADR-0004 |
| Servicio de exámenes | Escribe con `ON CONFLICT DO NOTHING` y confirma solo tras persistir | ADR-0003 |
| Servicio de material | Devuelve URL prefirmada de S3; el archivo no pasa por la API | ADR-0001 |
| Publicador de eventos | Publica en SQS correo y sincronización de notas | ADR-0004, ADR-0005 |
| Controlador operativo | `/health` (el ALB, sin tocar la BD) y `/ready` (diagnóstico, con BD) | ADR-0007 |