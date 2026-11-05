# ASI-2026-Repo AulaViva
# Alexander Baos
# Jhon Zamora
# Manuel Luna


## Arquitectura candidata

AulaViva se despliega en AWS. Un Application Load Balancer (HTTPS) reparte el
tráfico entre varias réplicas de una API REST mínima, que escalan de forma
**programada** para las franjas de examen (4 h de 168 h semanales). Los datos
viven en RDS PostgreSQL, en una subred privada sin acceso desde internet; el
material pesado va en S3 con URL prefirmada. Las integraciones con el sistema
académico y el correo son asíncronas mediante SQS, y las respuestas se escriben
de forma idempotente para que una respuesta enviada nunca se pierda. La
infraestructura se define con Terraform y las métricas y alarmas se observan en
CloudWatch.

Entorno local: `docker-compose.yml` levanta la API y PostgreSQL solo para
pruebas antes de desplegar.

Documentación: [contexto](docs/contexto.md) ·
[requerimientos](docs/requerimientos.md) ·
[NFR y cálculo del pico](docs/requerimientos_no_funcionales.md) ·
[preguntas problema](docs/pregunta_problema.md) · [ADR](docs/adr/) ·
[C4 Nivel 3](docs/arquitectura/c4_nivel3.md) ·
[Despliegue](docs/arquitectura/despliegue.md)