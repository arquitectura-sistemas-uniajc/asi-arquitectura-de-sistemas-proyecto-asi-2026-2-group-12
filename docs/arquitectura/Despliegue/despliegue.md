# Diagrama de despliegue


## Reglas de red

| Red | Qué contiene | Acceso externo |
|---|---|---|
| `red_publica` | Nginx, aplicación web | Sí, solo puertos 80 y 443 |
| `red_aplicacion` | API, trabajador, Redis, RabbitMQ | No |
| `red_datos` (`internal: true`) | PostgreSQL, almacenamiento de objetos | No |
| `red_observabilidad` | Prometheus, Grafana | Solo Grafana, con login |

La BD solo es alcanzable desde la API y el trabajador. Eso es lo que el enunciado pide demostrar en el requisito de red segmentada.