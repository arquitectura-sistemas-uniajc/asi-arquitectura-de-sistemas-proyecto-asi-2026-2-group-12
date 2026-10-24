# C4 Nivel 3: Componentes de la API

Contenedor detallado: **API de AulaViva** (réplicas idénticas detrás de Nginx).

## Responsabilidades

| Componente | Responsabilidad | Decisión relacionada |
|---|---|---|
| Middleware de autenticación | Valida JWT (expiración ≤ 1 h) y rol | NFR de seguridad |
| Servicio de matrícula | Lee la matrícula pre-cargada en Redis | ADR-0004 |
| Servicio de exámenes | Escribe la respuesta con `ON CONFLICT DO NOTHING` y confirma solo tras persistir | ADR-0003 |
| Servicio de material | Devuelve URL prefirmada, el archivo no pasa por la API | ADR-0001 |
| Publicador de eventos | Publica en RabbitMQ correo y sincronización de notas, no bloquea al estudiante | ADR-0004, ADR-0005 |
| Controlador operativo | `/health` verifica BD, Redis y RabbitMQ; `/metrics` expone Prometheus | Observabilidad |