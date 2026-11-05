# ADR-0008: Redes segmentadas y secretos fuera del repositorio

- **Estado:** Aceptada
- **Fecha:** 2026-11-03

## Contexto
El enunciado exige que la base de datos no sea alcanzable desde fuera, que los
secretos no estén en el repositorio y que los contenedores no corran como
root. Los datos de notas y respuestas son sensibles.

## Decisión
Segmentar en tres redes de Docker Compose:

| Red | Servicios | Acceso externo |
|---|---|---|
| `red_publica` | Nginx | Sí, puertos 8080 y 8443 |
| `red_aplicacion` | Nginx, API, Redis, RabbitMQ | No |
| `red_datos` (`internal: true`) | API, PostgreSQL | No |

- PostgreSQL pertenece solo a `red_datos` y no publica puertos: solo la API
  (y el trabajador de notificación cuando exista) la alcanza.
- Nginx no está en `red_datos`, por lo que no puede llegar a la BD.
- Los secretos (contraseñas, `JWT_SECRET`) viven en `.env`, ignorado por Git.
  El repositorio solo incluye `.env.example` con valores falsos.
- La API corre con un usuario sin privilegios (`appuser`).
- Los certificados TLS (`infra/nginx/certs/`) también están en `.gitignore`.

## Evidencia
- `docker compose ps`: solo Nginx muestra puertos publicados.
- `Test-NetConnection localhost -Port 5432` devuelve `TcpTestSucceeded: False`.

## Alternativas descartadas
- **Una sola red para todo:** cualquier contenedor comprometido alcanzaría la
  BD.
- **Publicar el 5432 para administrar la BD:** facilita el trabajo, pero
  contradice el requisito; la administración se hace con `docker compose exec`.
- **Secretos en variables dentro del `docker-compose.yml`:** quedan versionados
  en Git.

## Consecuencias
- (+) Un contenedor expuesto (Nginx) no tiene ruta de red hacia la BD.
- (+) Los secretos no quedan en el historial de Git.
- (-) Depurar es menos directo: para consultar la BD hay que entrar al
  contenedor.
- (-) `.env` con contraseñas en texto plano sigue siendo débil para
  producción; allí se usaría un gestor de secretos (Docker secrets, AWS
  Secrets Manager o similar).
- (-) Cada integrante debe crear su propio `.env` y generar sus certificados.