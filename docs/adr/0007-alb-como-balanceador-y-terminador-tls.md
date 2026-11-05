# ADR-0007: Nginx como balanceador y terminador TLS

- **Estado:** Aceptada
- **Fecha:** 2026-11-03

## Contexto
La API corre en varias réplicas (2 fuera del pico, 3 a 11 en el pico, según
los NFR). Se necesita un único punto de entrada que reparta la carga, deje de
enviar tráfico a una réplica caída y cifre el tráfico externo (TLS 1.2+).

## Decisión
Usar Nginx como proxy inverso y balanceador:
- `upstream` con `api1` y `api2`, reparto por turnos (round robin).
- Verificación de salud **pasiva**: `max_fails=2` y `fail_timeout=10s` sacan
  de rotación la réplica que falla.
- `proxy_next_upstream` reintenta la petición en otra réplica ante error,
  timeout o 502/503, de modo que el usuario no ve la caída de una réplica.
- TLS terminado en Nginx con certificado autofirmado (desarrollo y demo),
  protocolos TLSv1.2 y TLSv1.3.
- Redirección de HTTP a HTTPS.
- Publicado en los puertos 8080 y 8443 del host, porque en los equipos del
  grupo otro servicio (Apache) ocupa el 80 y el 443.
- Única pieza con puertos publicados al host.

## Alternativas descartadas
- **Sin balanceador (cliente llama a cada réplica):** traslada al cliente la
  detección de fallas.
- **Traefik o HAProxy:** también válidos; HAProxy ofrece verificación activa
  en la versión gratuita. Se prefirió Nginx por simplicidad y porque sirve
  además el frontend estático.
- **Balanceador administrado de la nube:** más robusto, pero añade costo y
  dependencia del proveedor para el entorno de práctica.

## Consecuencias
- (+) Una réplica puede caer sin que el usuario lo note (demostrado con
  `docker compose stop api1`).
- (+) Punto único para TLS y para endurecer cabeceras.
- (-) La verificación pasiva solo detecta una falla cuando llega una petición
  real; una verificación activa requeriría HAProxy o Nginx Plus.
- (-) El certificado autofirmado produce advertencia en el navegador; en
  producción se usaría un certificado de una autoridad reconocida.
- (-) Nginx es un punto único de falla; en producción se desplegarían dos
  instancias detrás de un balanceador de la nube.
- (-) Al escalar, hay que agregar las nuevas réplicas al `upstream`, o usar
  resolución dinámica.