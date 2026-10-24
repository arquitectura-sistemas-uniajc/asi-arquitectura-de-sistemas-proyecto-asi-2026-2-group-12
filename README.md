# ASI-2026-Repo AulaViva
# Alexander Baos
# Jhon Zamora
# Manuel Luna


## Arquitectura candidata

AulaViva usa una API REST mínima detrás de Nginx, con réplicas que escalan de
forma **programada** para las franjas de examen (4 h de 168 h semanales).
PostgreSQL guarda los datos, Redis sirve de caché y cola, y el material pesado
va en almacenamiento de objetos. Las integraciones con el sistema académico y
el correo son asíncronas, y las respuestas se escriben de forma idempotente
para que una respuesta enviada nunca se pierda.

Documentación: [contexto](docs/contexto.md) ·
[requerimientos](docs/requerimientos.md) ·
[NFR y cálculo del pico](docs/requerimientos_no_funcionales.md) ·
[preguntas problema](docs/pregunta_problema.md) · [ADR](docs/adr/) ·
[C4 Nivel 3](docs/arquitectura/c4_nivel3.md) ·
[Despliegue](docs/arquitectura/despliegue.md)