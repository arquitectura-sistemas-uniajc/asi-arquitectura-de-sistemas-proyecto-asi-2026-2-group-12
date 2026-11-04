# ADR-0009: JWT para autenticación sin estado

- **Estado:** Aceptada
- **Fecha:** 2026-11-03

## Contexto
La primera versión de la API identificaba al usuario con el encabezado
`X-Usuario-Id`, que cualquiera podía falsificar. Hay varias réplicas detrás de
Nginx, así que cualquiera de ellas debe poder validar una sesión sin consultar
un estado compartido.

## Decisión
- Tokens JWT firmados con HS256 usando `JWT_SECRET`, que viene de `.env` y no
  está en el repositorio.
- Expiración de 1 hora (NFR de seguridad).
- `POST /login` entrega el token. El `usuario_id` sale únicamente del token
  validado (`sub`), nunca de un encabezado libre.
- `/health`, `/metrics` y `/login` no exigen token; el resto sí.

## Alternativas descartadas
- **Sesiones en servidor (cookie + almacén de sesiones):** exigen estado
  compartido entre réplicas (por ejemplo en Redis) y un punto más de falla en
  pleno examen.
- **Encabezado `X-Usuario-Id`:** permite suplantación.
- **Proveedor de identidad externo (OAuth/OIDC):** es lo correcto en
  producción, pero la gestión de usuarios está fuera del alcance del proyecto.

## Consecuencias
- (+) Cualquier réplica valida el token sin consultar nada: escala y tolera
  la caída de una réplica.
- (+) Suplantación por encabezado cerrada (evidencias 13 a 15).
- (-) **Limitación aceptada:** `/login` no valida contraseña; entrega token a
  cualquier `usuario_id`. En producción lo reemplazaría el sistema académico
  institucional o un proveedor de identidad.
- (-) Un token robado sirve hasta que expire; no hay revocación.
- (-) Si `JWT_SECRET` se filtra, se pueden fabricar tokens; su rotación
  invalida todas las sesiones.
- (-) HS256 usa un secreto compartido por todas las réplicas; con RS256 solo
  quien firma tendría la clave privada.