# ADR-0009: JWT para autenticación sin estado

- **Estado:** Aceptada
- **Fecha:** 2026-11-04

## Contexto
La primera versión de la API identificaba al usuario con el encabezado
`X-Usuario-Id`, que cualquiera podía falsificar. Hay varias tareas de ECS
detrás de un Application Load Balancer, así que cualquiera de ellas debe poder
validar una sesión sin consultar un estado compartido.

## Decisión
- Tokens JWT firmados con HS256 usando `JWT_SECRET`, almacenado como parámetro
  `SecureString` en SSM Parameter Store e inyectado a la tarea como variable de
  entorno (ADR-0008). No está en el repositorio ni en la imagen.
- Expiración de 1 hora (NFR de seguridad).
- `POST /login` entrega el token. El `usuario_id` sale únicamente del token
  validado (`sub`), nunca de un encabezado libre.
- `/health`, `/ready` y `/login` no exigen token; el resto sí.

## Alternativas descartadas
- **Sesiones en servidor (cookie + almacén de sesiones):** exigen estado
  compartido entre tareas (por ejemplo en ElastiCache) y un punto más de falla
  en pleno examen.
- **Encabezado `X-Usuario-Id`:** permite suplantación.
- **Amazon Cognito u otro proveedor de identidad:** es lo correcto en
  producción, pero la gestión de usuarios está fuera del alcance del proyecto.

## Consecuencias
- (+) Cualquier tarea valida el token sin consultar nada: escala y tolera la
  caída de una tarea.
- (+) Suplantación por encabezado cerrada, verificable con pruebas de petición
  sin token, con token inválido y con el encabezado antiguo.
- (-) **Limitación aceptada:** `/login` no valida contraseña; entrega token a
  cualquier `usuario_id`. En producción lo reemplazaría el sistema académico
  institucional o un proveedor de identidad.
- (-) Un token robado sirve hasta que expire; no hay revocación.
- (-) Si `JWT_SECRET` se filtra, se pueden fabricar tokens; su rotación
  invalida todas las sesiones.
- (-) HS256 usa un secreto compartido por todas las tareas; con RS256 solo
  quien firma tendría la clave privada.