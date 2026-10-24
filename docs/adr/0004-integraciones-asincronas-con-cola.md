# ADR-0004: Cola y caché para sistemas externos

- **Estado:** Aceptada
- **Fecha:** 2026-10-23

## Contexto
La plataforma depende del sistema académico (validar matrícula) y del
servicio de correo. Ninguno debe bloquear un examen en curso.

## Decisión
- La matrícula se pre-carga en Redis antes de la franja de examen, con TTL
  [definir, por ejemplo 6 h]. Durante el examen no se consulta el sistema
  académico en línea.
- Notificaciones de correo y envío de notas pasan por una cola procesada por un
  worker, con reintentos con espera creciente y una cola de mensajes fallidos.

## Alternativas descartadas
- **Llamadas síncronas a los sistemas externos:** si se demoran, el examen se
  bloquea.
- **Reintentar dentro de la petición del estudiante:** aumenta la latencia y
  ocupa conexiones.

## Consecuencias
- (+) Una caída del correo o del sistema académico no afecta el examen.
- (-) Eventual consistencia: las notas pueden llegar con retraso.
- (-) Hay que operar y monitorear la cola (tamaño, mensajes fallidos).